import { BusinessRuleError } from "@repo/core/domain/error";
import {
  ZIP_HISTORY_MS,
  type ZipAttempt,
  type ZipRequest,
  type ZipRun,
  type ZipSpool,
  type ZipSpoolRef,
  type ZipTarget,
} from "@repo/core/domain/zip/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import {
  type ExportContentSnapshot,
  inspectExportSources,
} from "../export/snapshot";
import { zipServices } from "./services";
import { readZipSnapshot, zipNotFound } from "./snapshot";
import { zipJobView } from "./usecases";

export type ZipRetryInput = Readonly<{
  id: string;
  generation: number;
  ordinals: readonly number[];
  mode: "failed" | "assembly";
}>;
export type ZipRetryCommand = ZipRetryInput &
  Readonly<{ commandId: string; confirmation: string }>;
const newRequest = () =>
  new BusinessRuleError(
    "ZIP_NEW_REQUEST_REQUIRED",
    "保存した成功ファイルをそのまま利用できません。ノート一覧から新しく書き出してください。",
  );
function selection(input: ZipRetryInput) {
  if (
    input.ordinals.length > 500 ||
    new Set(input.ordinals).size !== input.ordinals.length ||
    input.ordinals.some(
      (ordinal) => !Number.isInteger(ordinal) || ordinal < 0 || ordinal >= 500,
    ) ||
    (input.mode === "failed" && !input.ordinals.length) ||
    (input.mode === "assembly" && input.ordinals.length)
  )
    throw new BusinessRuleError(
      "ZIP_RETRY_SELECTION",
      "最新の失敗結果を選び直してください。",
    );
  return [...input.ordinals].sort((a, b) => a - b);
}
async function retrySnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  actorId: string,
  input: ZipRetryInput,
) {
  const ordinals = selection(input);
  const now = c.clock.now();
  const request = await u.zipRequests.find(input.id);
  const run = await u.zipRequests.findRun({
    requestId: input.id,
    generation: input.generation,
  });
  if (
    !request ||
    request.accountId !== actorId ||
    request.generation !== input.generation ||
    request.state !== "terminal" ||
    !run ||
    run.historyExpiresAt <= now ||
    (run.state !== "failed" && run.state !== "partial")
  )
    return zipNotFound();
  if (run.publishedAt !== null) {
    const artifact = run.artifactId
      ? await u.zipArtifacts.find(run.artifactId)
      : null;
    if (!artifact || artifact.state !== "ready" || artifact.expiresAt <= now)
      throw newRequest();
  }
  const latest = await u.zipRequests.latestAttempts(request.id);
  if (
    input.mode === "assembly" &&
    (run.state !== "failed" ||
      !run.failure ||
      run.publishedAt ||
      latest.some((attempt) => attempt.state === "failed"))
  )
    throw newRequest();
  const targets = await u.zipRequests.targets(request.id);
  const failed: Readonly<{
    attempt: ZipAttempt;
    identity: string;
    title: string;
  }>[] = [];
  for (const ordinal of ordinals) {
    const attempt = latest.find((row) => row.ordinal === ordinal);
    const target = targets.find((row) => row.ordinal === ordinal);
    if (
      !attempt ||
      attempt.state !== "failed" ||
      attempt.historyExpiresAt <= now ||
      !target?.liveNoteId
    )
      return zipNotFound();
    const snapshot = await readZipSnapshot(c, u, actorId, target.liveNoteId);
    failed.push({
      attempt,
      identity: snapshot.identity,
      title: snapshot.note.title,
    });
  }
  const refs = await u.zipSpools.refs(run);
  const reused: {
    ref: ZipSpoolRef;
    spool: Extract<ZipSpool, { state: "ready" }>;
    target: ZipTarget;
    snapshot: ExportContentSnapshot;
  }[] = [];
  for (const entry of refs) {
    const target = targets.find((row) => row.ordinal === entry.ref.ordinal);
    if (
      !target?.liveNoteId ||
      entry.spool.state !== "ready" ||
      entry.ref.purpose !== "retry" ||
      entry.ref.retryUntil <= now
    )
      throw newRequest();
    const snapshot = await readZipSnapshot(c, u, actorId, target.liveNoteId);
    if (snapshot.identity !== entry.spool.result.sourceIdentity)
      throw newRequest();
    reused.push({ ref: entry.ref, spool: entry.spool, target, snapshot });
  }
  const reusable = (run.results ?? []).filter(
    (result) =>
      result.state === "succeeded" &&
      !run.exclusions.some((entry) => entry.ordinal === result.ordinal),
  );
  if (
    reusable.some(
      (result) => !reused.some((entry) => entry.ref.ordinal === result.ordinal),
    ) ||
    (input.mode === "assembly" && !reused.length)
  )
    throw newRequest();
  const confirmation = c.tokens.hash(
    JSON.stringify([
      "zip-retry-v1",
      actorId,
      input.id,
      input.generation,
      request.version,
      run.version,
      input.mode,
      ordinals,
      failed.map((item) => [
        item.attempt.id,
        item.attempt.attemptNumber,
        item.identity,
      ]),
      reused.map((item) => [
        item.ref.ordinal,
        item.spool.id,
        item.spool.result,
      ]),
    ]),
  );
  return { request, run, targets, failed, reused, confirmation };
}
async function inspectReused(
  c: HollowContainer,
  value: Awaited<ReturnType<typeof retrySnapshot>>,
  signal: AbortSignal,
) {
  for (const entry of value.reused) {
    const current = await inspectExportSources(
      c,
      entry.snapshot,
      signal,
      "require-determinate",
    );
    if (
      c.tokens.hash(JSON.stringify(current.external)) !==
      entry.spool.result.externalIdentity
    )
      throw newRequest();
  }
}
export async function previewZipRetry(
  c: HollowContainer,
  session: string | null,
  input: ZipRetryInput & Readonly<{ offset?: number }>,
) {
  const service = zipServices(c);
  const offset = input.offset ?? 0;
  if (!Number.isInteger(offset) || offset < 0 || offset >= 500)
    throw new BusinessRuleError(
      "ZIP_PREVIEW_PAGE",
      "確認一覧を開き直してください。",
    );
  const initial = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    return {
      actorId: actor.id,
      value: await retrySnapshot(c, u, actor.id, input),
    };
  });
  await service.execution.within(
    new Date(c.clock.now().getTime() + service.capacity.childMs),
    new AbortController().signal,
    (signal) => inspectReused(c, initial.value, signal),
  );
  return {
    actorId: initial.actorId,
    id: input.id,
    generation: input.generation,
    mode: input.mode,
    confirmation: initial.value.confirmation,
    total: initial.value.failed.length,
    reused: initial.value.reused.length,
    items: initial.value.failed.slice(offset, offset + 50).map((item) => ({
      ordinal: item.attempt.ordinal,
      attemptNumber: item.attempt.attemptNumber,
      title: item.title,
    })),
    nextOffset: offset + 50 < initial.value.failed.length ? offset + 50 : null,
  };
}
export async function retryZip(
  c: HollowContainer,
  session: string | null,
  input: ZipRetryCommand,
) {
  const service = zipServices(c);
  const ordinals = selection(input);
  const digest = c.tokens.hash(
    JSON.stringify([
      "zip-retry-command-v1",
      input.id,
      input.generation,
      input.mode,
      ordinals,
      input.confirmation,
    ]),
  );
  const replayInTransaction = async (
    u: HollowUnitOfWorkContext,
    actorId: string,
  ) => {
    const previous = await u.zipRequests.findCommand(actorId, input.commandId);
    if (!previous) return null;
    if (previous.inputDigest !== digest)
      throw new ConflictError(
        "ZIP_COMMAND_CONFLICT",
        "同じ操作IDの内容が一致しません。",
      );
    if (previous.historyExpiresAt <= c.clock.now()) return zipNotFound();
    const parent = await u.zipRequests.find(previous.requestId);
    return parent
      ? zipJobView(u, parent, previous, c.clock.now())
      : zipNotFound();
  };
  const initial = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const previous = await replayInTransaction(u, actor.id);
    return previous
      ? { kind: "replay" as const, job: previous }
      : {
          kind: "preview" as const,
          value: await retrySnapshot(c, u, actor.id, input),
        };
  });
  if (initial.kind === "replay") return initial.job;
  if (initial.value.confirmation !== input.confirmation)
    throw new ConflictError(
      "ZIP_PREVIEW_CHANGED",
      "再試行対象の内容が変わりました。もう一度確認してください。",
    );
  await service.execution.within(
    new Date(c.clock.now().getTime() + service.capacity.childMs),
    new AbortController().signal,
    (signal) => inspectReused(c, initial.value, signal),
  );
  const response = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const previous = await replayInTransaction(u, actor.id);
    if (previous) return previous;
    const value = await retrySnapshot(c, u, actor.id, input);
    if (value.confirmation !== input.confirmation)
      throw new ConflictError(
        "ZIP_PREVIEW_CHANGED",
        "再試行対象の内容が変わりました。もう一度確認してください。",
      );
    const now = c.clock.now();
    const historyExpiresAt = new Date(now.getTime() + ZIP_HISTORY_MS);
    const requestId =
      input.mode === "assembly" ? c.idGenerator.next() : value.request.id;
    const generation = input.mode === "assembly" ? 1 : value.run.generation + 1;
    const run: ZipRun = {
      requestId,
      generation,
      accountId: actor.id,
      commandId: input.commandId,
      inputDigest: digest,
      acceptedAt: now,
      historyExpiresAt,
      deadlineAt: new Date(now.getTime() + service.capacity.totalMs),
      publishedAt: null,
      finishedAt: null,
      artifactId: null,
      version: 1,
      exclusions: [],
      results: null,
      state: "queued",
      lease: null,
      failure: null,
    };
    const reused: ZipSpoolRef[] = value.reused.map((item) => ({
      requestId,
      generation,
      ordinal: item.ref.ordinal,
      spoolId: item.spool.id,
      purpose: "active",
      retryUntil: null,
    }));
    if (input.mode === "assembly") {
      const request: ZipRequest = {
        ...value.request,
        id: requestId,
        commandId: input.commandId,
        inputDigest: digest,
        createdAt: now,
        historyExpiresAt,
        updatedAt: now,
        generation,
        cancelGeneration: 0,
        retryOf: value.request.id,
        version: 1,
        state: "active",
      };
      await u.zipRequests.acceptAssemblyRetry(
        {
          request,
          run,
          attempts: [],
          reused,
          targets: value.reused.map((item) => ({ ...item.target, requestId })),
        },
        value.run,
        now,
      );
      return zipJobView(u, request, run, now);
    }
    const attempts: ZipAttempt[] = value.failed.map((item) => {
      return {
        ...item.attempt,
        id: c.idGenerator.next(),
        generation,
        attemptNumber: item.attempt.attemptNumber + 1,
        title: item.title,
        expectedIdentity: item.identity,
        createdAt: now,
        historyExpiresAt,
        version: 1,
        state: "queued",
        result: null,
        failure: null,
      };
    });
    await u.zipRequests.acceptRetry(
      {
        requestId,
        accountId: actor.id,
        expectedVersion: value.request.version,
        expectedGeneration: value.request.generation,
        run,
        attempts,
        reused,
      },
      now,
    );
    const updated = await u.zipRequests.find(requestId);
    if (!updated) return zipNotFound();
    return zipJobView(u, updated, run, now);
  });
  service.wake();
  return response;
}
