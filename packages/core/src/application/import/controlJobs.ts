import { EventId } from "@repo/core/domain/common/event";
import { BusinessRuleError } from "@repo/core/domain/error";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import { cancelQueuedLlm } from "../llm/control";
import { retryLlmJob } from "../llm/request";
import { commitNote } from "../note/commitNote";
import { canScope, requireNote } from "../workspace/access";
import { importContext } from "./context";
import { machineRestartIssue, machineRestartState } from "./machineRetry";

export async function cancelImport(
  container: HollowContainer,
  token: string | null,
  batchId: string,
) {
  const cancelling = await container.unitOfWorkProvider.run(async (context) => {
    const active: string[] = [];
    const { accounts, imports, jobs, references, notes } = context;
    const account = await requireAccount(container, accounts, token);
    const batch = await imports.findBatch(batchId);
    if (!batch || batch.accountId !== account.id)
      throw new NotFoundError("IMPORT_NOT_FOUND", "取り込みが見つかりません。");
    const now = container.clock.now();
    await imports.cancelBatch(batchId, now);
    await references.sealBundle(batchId);
    for (const row of await imports.listReservations(batchId))
      if (row.state === "awaiting" || row.state === "uploading")
        await imports.updateReservation(row.id, row.state, "cancelled");
    for (const job of await jobs.cancelQueued(batchId, now)) {
      const llmCancelled = await cancelQueuedLlm(context, job.id, now);
      const llm = await context.llmConversions.find(job.id);
      if (!llmCancelled && llm && llm.phase !== "terminal") {
        if (
          !llm.cancelGeneration &&
          !(await context.llmConversions.replace(
            {
              ...llm,
              cancelGeneration: llm.cancelGeneration + 1,
              updatedAt: now,
              version: llm.version + 1,
            },
            llm.version,
          ))
        )
          throw new ConflictError("LLM_JOB_CHANGED", "処理が更新されました。");
        active.push(llm.jobId);
        continue;
      }
      const note = await notes.findById(job.noteId);
      if (
        note &&
        note.lifecycle.kind === "active" &&
        (await canScope(context, note.owner, account.id, "edit"))
      )
        await commitNote(container, context, {
          previous: note,
          note: {
            ...note,
            display: completeDisplay(note.display, "conversion", job.id, false),
          },
          actor: { kind: "system", jobId: job.id },
          cause: "import",
        });
      const original = await imports.findOriginal(job.originalId);
      if (!llmCancelled && original && original.activeJobId === job.id)
        await imports.saveOriginal({ ...original, state: "cancelled" });
    }
    return active;
  });
  for (const jobId of cancelling) container.llm?.execution.cancel(jobId);
  container.llm?.wake();
  return { ok: true };
}

export async function retryImport(
  container: HollowContainer,
  token: string | null,
  jobId: string,
) {
  const llm = await retryLlmJob(container, token, jobId);
  if (llm) return llm;
  return restartImport(container, token, { kind: "retry", jobId });
}

export async function reimportNote(
  container: HollowContainer,
  token: string | null,
  noteId: string,
) {
  const llmJob = await container.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(container, u.accounts, token);
    await requireNote(u, await u.notes.findById(noteId), account.id, "edit");
    const original = await u.imports.findByNote(noteId);
    const value = original?.activeJobId
      ? await u.llmConversions.find(original.activeJobId)
      : null;
    return value?.jobId ?? null;
  });
  if (llmJob) {
    const retry = await retryLlmJob(container, token, llmJob);
    if (!retry)
      throw new NotFoundError("JOB_NOT_FOUND", "処理が見つかりません。");
    return retry;
  }
  return restartImport(container, token, { kind: "reimport", noteId });
}

async function restartImport(
  container: HollowContainer,
  token: string | null,
  input:
    | { kind: "retry"; jobId: string }
    | { kind: "reimport"; noteId: string },
) {
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const { accounts, imports, jobs, notes, revisions, collectEvents } = c;
    const account = await requireAccount(container, accounts, token);
    const source =
      input.kind === "reimport" ? await imports.findByNote(input.noteId) : null;
    const old = await jobs.find(
      input.kind === "retry" ? input.jobId : (source?.activeJobId ?? ""),
    );
    if (!old || (input.kind === "retry" && old.accountId !== account.id))
      throw new NotFoundError("JOB_NOT_FOUND", "ジョブが見つかりません。");
    const note = await requireNote(
      c,
      await notes.findById(old.noteId),
      account.id,
      "edit",
    );
    if (
      input.kind === "reimport" &&
      old.retryOf &&
      (old.state === "queued" || old.state === "running")
    ) {
      const previous = await jobs.find(old.retryOf);
      if (
        previous?.state === "cancelled" &&
        previous.noteId === note.id &&
        previous.accountId === account.id
      )
        return { jobId: old.id, noteId: note.id };
    }
    if (!machineRestartState(old, input.kind))
      throw new BusinessRuleError(
        "JOB_NOT_RETRYABLE",
        "このジョブは再試行できません。要AI連携の場合は連携後に作り直してください。",
      );
    const original = await imports.findOriginal(old.originalId);
    const existing = await jobs.findRetry(old.id);
    if (
      existing &&
      existing.accountId === account.id &&
      original?.activeJobId === existing.id
    )
      return { jobId: existing.id, noteId: existing.noteId };
    const head = await revisions.head(note.id);
    const revision = head
      ? await revisions.find(note.id, head.currentNo)
      : null;
    const issue = machineRestartIssue({
      kind: input.kind,
      accountId: account.id,
      canEdit: true,
      importingConfigured: !!container.importing,
      job: old,
      original,
      note,
      revision,
    });
    if (issue === "inactive-original" || !original)
      throw new NotFoundError("IMPORT_NOT_FOUND", "対象が見つかりません。");
    if (issue === "edited")
      throw new BusinessRuleError(
        "IMPORT_EDITED",
        "取り込み後に本文が編集されています。再試行では上書きできません。原本を新しいノートとして取り込んでください。",
      );
    if (issue === "unconfigured") importContext(container);
    const now = container.clock.now();
    const id = container.idGenerator.next();
    let batchId = old.batchId;
    if (old.accountId !== account.id) {
      const batch = await imports.findBatch(old.batchId);
      if (!batch)
        throw new NotFoundError(
          "IMPORT_NOT_FOUND",
          "取り込みが見つかりません。",
        );
      batchId = container.idGenerator.next();
      await imports.insertBatch({
        ...batch,
        id: batchId,
        accountId: account.id,
        workspaceId:
          note.owner.kind === "workspace" ? note.owner.workspaceId : null,
        createdAt: now,
        cancelledAt: null,
      });
    }
    await jobs.insert({
      ...old,
      id,
      batchId,
      accountId: account.id,
      noteVersion: note.version,
      createdAt: now,
      updatedAt: now,
      attempt: 0,
      retryOf: old.id,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    });
    await imports.saveOriginal({
      ...original,
      activeJobId: id,
      state: "processing",
    });
    collectEvents([
      {
        id: EventId.create(container.idGenerator.next()),
        type: "ImportQueued",
        aggregateId: note.id,
        occurredAt: now,
        payload: { jobId: id },
      },
    ]);
    return { jobId: id, noteId: note.id };
  });
  container.importing?.wake();
  return result;
}
