import { BusinessRuleError } from "@repo/core/domain/error";
import type { Original } from "@repo/core/domain/import/entity";
import {
  isLlmDocumentFormat,
  isLlmLegacyFormat,
  LLM_LIMITS,
  type LlmConversion,
  type LlmSourceContract,
  llmInstruction,
} from "@repo/core/domain/llm/entity";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import type { Note } from "@repo/core/domain/note/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { commitNote, ensureRevisionHead } from "../note/commitNote";
import { requireNote } from "../workspace/access";

export async function admitLlm(
  container: HollowContainer,
  u: HollowUnitOfWorkContext,
  input: Readonly<{
    jobId: string;
    accountId: string;
    commandId: string;
    requestDigest: string;
    note: Note;
    original: Original;
    operation: "import" | "regenerate";
    modelId: string;
    instruction: string;
    epoch: number;
    retryOf: string | null;
  }>,
) {
  const service = container.llm;
  if (!service?.configured)
    throw new BusinessRuleError(
      "LLM_UNCONFIGURED",
      "本文生成は現在利用できません。",
    );
  const format = input.original.format;
  const source = {
    kind: "original" as const,
    originalId: input.original.id,
    sha256: input.original.sha256,
    bytes: input.original.bytes,
  };
  let contract: LlmSourceContract;
  if (isLlmLegacyFormat(format))
    contract = {
      source: { ...source, format },
      preparationVersion: 1,
      promptVersion: 1,
    };
  else if (isLlmDocumentFormat(format))
    contract = {
      source: { ...source, format },
      preparationVersion: 2,
      promptVersion: 1,
    };
  else
    throw new BusinessRuleError(
      "LLM_FORMAT_UNAVAILABLE",
      "この形式は未提供です。",
    );
  if (
    (await u.llmConversions.queued(input.accountId)) >= LLM_LIMITS.accountQueued
  )
    throw new BusinessRuleError(
      "LLM_QUEUE_LIMIT",
      "待機中の変換が多いため、完了後にお試しください。",
    );
  const now = container.clock.now();
  const head = await ensureRevisionHead(u, input.note);
  const value: LlmConversion = {
    jobId: input.jobId,
    accountId: input.accountId,
    noteId: input.note.id,
    commandId: input.commandId,
    requestDigest: input.requestDigest,
    operation: input.operation,
    retryOf: input.retryOf,
    ...contract,
    sourceState: input.original.state,
    sourceCoverage: input.original.coverage,
    noteVersion: input.note.version,
    originalRevisionNo: head.currentNo,
    credentialEpoch: input.epoch,
    modelId: input.modelId,
    instruction: llmInstruction(input.instruction),
    admissionSequence: await u.llmConversions.admit(input.accountId),
    createdAt: now,
    deadlineAt: new Date(now.getTime() + LLM_LIMITS.jobMs),
    updatedAt: now,
    phase: "queued",
    outcome: { kind: "pending" },
    owner: { state: "idle", token: null, runtimeId: null },
    cancelGeneration: 0,
    responseBudget: 0,
    version: 1,
  };
  await u.llmConversions.insert(value);
  if (
    !(await u.llmQuota.reserve(
      value.jobId,
      value.accountId,
      now,
      service.monthlyLimit,
    ))
  ) {
    const failed: LlmConversion = {
      ...value,
      phase: "terminal",
      outcome: { kind: "failed", code: "LLM_MONTHLY_LIMIT" },
      version: 2,
    };
    if (!(await u.llmConversions.replace(failed, value.version)))
      throw new ConflictError(
        "LLM_REQUEST_CHANGED",
        "変換受付が更新されました。",
      );
    await u.imports.saveOriginal({
      ...input.original,
      activeJobId: value.jobId,
      state: value.operation === "regenerate" ? value.sourceState : "failed",
    });
    if (value.operation === "import")
      await commitNote(container, u, {
        previous: input.note,
        note: {
          ...input.note,
          display: completeDisplay(
            input.note.display,
            "conversion",
            value.jobId,
            false,
          ),
        },
        actor: { kind: "system", jobId: value.jobId },
        cause: "import",
      });
    return failed;
  }
  await u.imports.saveOriginal({
    ...input.original,
    activeJobId: value.jobId,
    state: "processing",
  });
  return value;
}

export type RegenerateLlmInput = Readonly<{
  noteId: string;
  noteVersion: number;
  commandId: string;
  expectedEpoch: number;
  modelId: string;
  instruction: string;
  confirmed: true;
  retryOf?: string | undefined;
}>;
export async function requestLlmRegeneration(
  container: HollowContainer,
  token: string | null,
  input: RegenerateLlmInput,
) {
  const digest = container.tokens.hash(JSON.stringify(input));
  const result = await container.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(container, u.accounts, token);
    const prior = await u.llmConversions.command(account.id, input.commandId);
    if (prior) {
      if (prior.requestDigest !== digest)
        throw new ConflictError(
          "LLM_COMMAND_REUSED",
          "受付識別子は別の内容に使えません。",
        );
      await requireNote(
        u,
        await u.notes.findById(prior.noteId),
        account.id,
        "edit",
      );
      return { jobId: prior.jobId, noteId: prior.noteId };
    }
    if (!container.llm?.configured || !container.openRouter)
      throw new BusinessRuleError(
        "LLM_UNCONFIGURED",
        "本文生成は現在利用できません。",
      );
    const note = await requireNote(
      u,
      await u.notes.findById(input.noteId),
      account.id,
      "edit",
    );
    if (note.version !== input.noteVersion)
      throw new ConflictError(
        "NOTE_CONFLICT",
        "本文が更新されました。最新の本文を確認してください。",
      );
    const original = await u.imports.findByNote(note.id);
    if (!original)
      throw new NotFoundError(
        "ORIGINAL_NOT_FOUND",
        "再生成できる原本がありません。",
      );
    const connection = await u.openRouterConnections.find(account.id);
    if (
      connection?.state !== "linked" ||
      connection.epoch !== input.expectedEpoch ||
      (connection.keyExpiresAt &&
        connection.keyExpiresAt <= container.clock.now())
    )
      throw new ConflictError(
        "OPENROUTER_CONNECTION_CHANGED",
        "現在の連携を確認してから、改めて変換を開始してください。",
      );
    if (input.retryOf) {
      const old = await u.llmConversions.find(input.retryOf);
      if (
        !old ||
        old.accountId !== account.id ||
        old.noteId !== note.id ||
        old.outcome.kind === "pending" ||
        old.outcome.kind === "succeeded" ||
        old.owner.state === "active" ||
        old.owner.state === "unknown"
      )
        throw new BusinessRuleError(
          "JOB_NOT_RETRYABLE",
          "この変換は再試行できません。",
        );
      const existing = await u.jobs.findRetry(old.jobId);
      if (existing) {
        const retry = await u.llmConversions.find(existing.id);
        if (
          !retry ||
          retry.accountId !== account.id ||
          retry.modelId !== input.modelId ||
          retry.instruction !== input.instruction ||
          retry.credentialEpoch !== input.expectedEpoch
        )
          throw new ConflictError(
            "LLM_RETRY_CHANGED",
            "この再試行は別の設定で受け付け済みです。",
          );
        return { jobId: existing.id, noteId: existing.noteId };
      }
    }
    if (
      original.state === "processing" ||
      (await u.llmConversions.activeForNote(note.id))
    )
      throw new BusinessRuleError(
        "NOTE_PROCESSING",
        "変換中は再生成できません。",
      );
    const now = container.clock.now();
    const batchId = container.idGenerator.next();
    const jobId = container.idGenerator.next();
    await u.imports.insertBatch({
      id: batchId,
      accountId: account.id,
      workspaceId:
        note.owner.kind === "workspace" ? note.owner.workspaceId : null,
      createdAt: now,
      useAi: true,
      cancelledAt: null,
    });
    await u.jobs.insert({
      id: jobId,
      batchId,
      originalId: original.id,
      accountId: account.id,
      noteId: note.id,
      noteVersion: note.version,
      useAi: true,
      createdAt: now,
      updatedAt: now,
      attempt: 0,
      retryOf: input.retryOf ?? null,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    });
    await admitLlm(container, u, {
      jobId,
      accountId: account.id,
      commandId: input.commandId,
      requestDigest: digest,
      note,
      original,
      operation: "regenerate",
      modelId: input.modelId,
      instruction: input.instruction,
      epoch: input.expectedEpoch,
      retryOf: input.retryOf ?? null,
    });
    return { jobId, noteId: note.id };
  });
  container.llm?.wake();
  return result;
}

export async function retryLlmJob(
  container: HollowContainer,
  token: string | null,
  jobId: string,
) {
  const request = await container.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(container, u.accounts, token);
    const old = await u.llmConversions.find(jobId);
    if (!old) return null;
    if (old.accountId !== account.id)
      throw new NotFoundError("JOB_NOT_FOUND", "処理が見つかりません。");
    const note = await requireNote(
      u,
      await u.notes.findById(old.noteId),
      account.id,
      "edit",
    );
    const existing = await u.jobs.findRetry(jobId);
    if (existing)
      return { existing: { jobId: existing.id, noteId: existing.noteId } };
    const connection = await u.openRouterConnections.find(account.id);
    if (
      connection?.state !== "linked" ||
      connection.epoch !== old.credentialEpoch
    )
      throw new ConflictError(
        "LLM_RETRY_NEW_CONNECTION",
        "連携が変わりました。元のモデルと追加指示を確認し、新しい変換として明示的に開始してください。",
      );
    if (note.version !== old.noteVersion)
      throw new ConflictError(
        "LLM_RETRY_BODY_CHANGED",
        "元の変換後に本文が変わりました。再生成画面で置き換えを確認してください。",
      );
    return {
      input: {
        noteId: note.id,
        noteVersion: note.version,
        commandId: container.idGenerator.next(),
        expectedEpoch: old.credentialEpoch,
        modelId: old.modelId,
        instruction: old.instruction,
        confirmed: true as const,
        retryOf: old.jobId,
      },
    };
  });
  if (!request) return null;
  return "existing" in request
    ? request.existing
    : requestLlmRegeneration(container, token, request.input);
}
