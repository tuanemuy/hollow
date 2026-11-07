import { BusinessRuleError } from "@repo/core/domain/error";
import {
  ZIP_HISTORY_MS,
  type ZipAttempt,
  type ZipRequest,
  type ZipRun,
} from "@repo/core/domain/zip/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { ZipAvailableFormat, ZipHistoryKey } from "./ports";
import { zipFormat, zipPreviewInTransaction, zipSelection } from "./preview";
import { zipServices } from "./services";
import { zipNotFound } from "./snapshot";

export type ZipRequestInput = Readonly<{
  commandId: string;
  noteIds: readonly string[];
  format: ZipAvailableFormat;
  confirmation: string;
}>;
export type ZipJobView = Readonly<{
  id: string;
  generation: number;
  version: number;
  commandId: string;
  actorId: string;
  format: ZipAvailableFormat;
  state: ZipRun["state"];
  failure: string | null;
  acceptedAt: string;
  historyExpiresAt: string;
  finishedAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  available: boolean;
  total: number;
  succeeded: number;
  failed: number;
  excluded: number;
  cancelled: number;
}>;
export async function zipJobView(
  u: HollowUnitOfWorkContext,
  request: ZipRequest,
  run: ZipRun,
  now: Date,
): Promise<ZipJobView> {
  const artifact = run.artifactId
    ? await u.zipArtifacts.find(run.artifactId)
    : null;
  const attempts = run.results ?? (await u.zipRequests.attempts(run));
  const refs = run.results ? [] : await u.zipSpools.refs(run);
  const totals = { succeeded: 0, failed: 0, excluded: 0, cancelled: 0 };
  for (const attempt of attempts) {
    const excluded = run.exclusions.find(
      (entry) => entry.ordinal === attempt.ordinal,
    );
    if (excluded)
      totals[excluded.reason === "ZIP_CANCELLED" ? "cancelled" : "excluded"]++;
    else if (
      attempt.state === "succeeded" ||
      attempt.state === "failed" ||
      attempt.state === "cancelled" ||
      attempt.state === "excluded"
    )
      totals[attempt.state]++;
  }
  for (const { ref } of refs)
    if (!attempts.some((attempt) => attempt.ordinal === ref.ordinal))
      totals.succeeded++;
  return {
    id: request.id,
    generation: run.generation,
    version: request.version + run.version,
    commandId: run.commandId,
    actorId: request.accountId,
    format: request.options.format,
    state: run.state,
    failure: run.failure,
    acceptedAt: run.acceptedAt.toISOString(),
    historyExpiresAt: run.historyExpiresAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    publishedAt: run.publishedAt?.toISOString() ?? null,
    expiresAt:
      artifact?.expiresAt.toISOString() ??
      (run.publishedAt
        ? new Date(run.publishedAt.getTime() + 7 * 86400000).toISOString()
        : null),
    available: artifact?.state === "ready" && artifact.expiresAt > now,
    total: (await u.zipRequests.targets(request.id)).length,
    ...totals,
  };
}
export async function requestZip(
  c: HollowContainer,
  session: string | null,
  input: ZipRequestInput,
) {
  const service = zipServices(c);
  const ids = zipSelection(input.noteIds);
  const format = zipFormat(input.format);
  const response = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const now = c.clock.now();
    const digest = c.tokens.hash(
      JSON.stringify(["zip-new-v1", ids, format, "saved", input.confirmation]),
    );
    const previous = await u.zipRequests.findCommand(actor.id, input.commandId);
    if (previous) {
      if (previous.inputDigest !== digest)
        throw new ConflictError(
          "ZIP_COMMAND_CONFLICT",
          "同じ操作IDの内容が一致しません。",
        );
      if (previous.historyExpiresAt <= now) return zipNotFound();
      const parent = await u.zipRequests.find(previous.requestId);
      if (!parent) return zipNotFound();
      return zipJobView(u, parent, previous, now);
    }
    const preview = await zipPreviewInTransaction(c, u, actor.id, input);
    if (preview.confirmation !== input.confirmation)
      throw new ConflictError(
        "ZIP_PREVIEW_CHANGED",
        "対象の内容や閲覧権限が変わりました。もう一度確認してください。",
      );
    if (!preview.items.length)
      throw new BusinessRuleError(
        "ZIP_NO_TARGETS",
        "書き出せる本文のあるノートがありません。",
      );
    const id = c.idGenerator.next();
    const historyExpiresAt = new Date(now.getTime() + ZIP_HISTORY_MS);
    const request: ZipRequest = {
      id,
      accountId: actor.id,
      commandId: input.commandId,
      inputDigest: digest,
      options: { format, style: "saved" },
      createdAt: now,
      historyExpiresAt,
      updatedAt: now,
      generation: 1,
      cancelGeneration: 0,
      retryOf: null,
      version: 1,
      state: "active",
    };
    const run: ZipRun = {
      requestId: id,
      generation: 1,
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
    const attempts: ZipAttempt[] = preview.items.map((item) => ({
      requestId: id,
      generation: 1,
      id: c.idGenerator.next(),
      ordinal: item.ordinal,
      attemptNumber: 1,
      title: item.title,
      expectedIdentity: item.identity,
      createdAt: now,
      historyExpiresAt,
      version: 1,
      state: "queued",
      result: null,
      failure: null,
    }));
    await u.zipRequests.accept(
      {
        request,
        run,
        targets: preview.items.map((item) => ({
          requestId: id,
          ordinal: item.ordinal,
          targetNoteId: item.noteId,
          liveNoteId: item.noteId,
          latestAttemptNumber: 1,
        })),
        attempts,
        reused: [],
      },
      now,
    );
    return zipJobView(u, request, run, now);
  });
  service.wake();
  return response;
}
export async function getZip(
  c: HollowContainer,
  session: string | null,
  id: string,
  generation?: number,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const now = c.clock.now();
    const request = await u.zipRequests.find(id);
    if (!request || request.accountId !== actor.id) return zipNotFound();
    const run = await u.zipRequests.findRun({
      requestId: id,
      generation: generation ?? request.generation,
    });
    if (!run || run.historyExpiresAt <= now) return zipNotFound();
    return zipJobView(u, request, run, now);
  });
}
export async function lookupZip(
  c: HollowContainer,
  session: string | null,
  commandId: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const now = c.clock.now();
    const run = await u.zipRequests.findCommand(actor.id, commandId);
    if (!run || run.historyExpiresAt <= now) return null;
    const request = await u.zipRequests.find(run.requestId);
    return request ? zipJobView(u, request, run, now) : null;
  });
}
export async function listZip(
  c: HollowContainer,
  session: string | null,
  before: ZipHistoryKey | null,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const now = c.clock.now();
    const rows = await u.zipRequests.list(actor.id, before, now);
    const items: ZipJobView[] = [];
    for (const row of rows)
      items.push(await zipJobView(u, row.request, row.run, now));
    const last = rows.at(-1);
    const availableFormats: readonly ZipAvailableFormat[] = c.zip
      ? ["html", "markdown"]
      : [];
    return {
      configured: c.zip !== undefined,
      availableFormats,
      items,
      next:
        rows.length === 50 && last
          ? {
              requestId: last.request.id,
              generation: last.run.generation,
              acceptedAt: last.run.acceptedAt.toISOString(),
            }
          : null,
    };
  });
}
export async function zipActivity(
  c: HollowContainer,
  session: string | null,
  after: string | null,
  watch: readonly string[],
) {
  if (watch.length > 50)
    throw new BusinessRuleError(
      "ZIP_ACTIVITY_INPUT",
      "処理の照会条件を確認してください。",
    );
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const now = c.clock.now();
    const active = await u.zipRequests.activePage(actor.id, after);
    const watched = await u.zipRequests.watched(
      actor.id,
      [...new Set(watch)],
      now,
    );
    const items: ZipJobView[] = [];
    for (const row of watched)
      items.push(await zipJobView(u, row.request, row.run, now));
    return {
      actorId: actor.id,
      summary: await u.zipRequests.summary(actor.id, now),
      active,
      next: active.length === 50 ? (active.at(-1)?.id ?? null) : null,
      watched: items,
    };
  });
}
export type ZipDetails = Awaited<ReturnType<typeof getZipDetails>>;
export async function cancelZip(
  c: HollowContainer,
  session: string | null,
  id: string,
) {
  const service = zipServices(c);
  const response = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const now = c.clock.now();
    const request = await u.zipRequests.find(id);
    if (!request || request.accountId !== actor.id) return zipNotFound();
    await u.zipRequests.cancel(id, actor.id, now);
    return { requestId: id, generation: request.generation };
  });
  service.execution.cancel(`${id}:${response.generation}`);
  service.wake();
  return getZip(c, session, id, response.generation);
}

export async function getZipDetails(
  c: HollowContainer,
  session: string | null,
  id: string,
  generation: number,
  offset = 0,
) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= 500)
    throw new BusinessRuleError(
      "ZIP_HISTORY_PAGE",
      "結果一覧を開き直してください。",
    );
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const now = c.clock.now();
    const request = await u.zipRequests.find(id);
    const run = await u.zipRequests.findRun({ requestId: id, generation });
    if (
      !request ||
      request.accountId !== actor.id ||
      !run ||
      run.historyExpiresAt <= now
    )
      return zipNotFound();
    const own = await u.zipRequests.attempts(run);
    const historical = run.results
      ? await u.zipRequests.attemptsByIds(
          run.results.map((result) => result.attemptId),
        )
      : own;
    const titles = new Map(
      historical
        .filter((attempt) => attempt.historyExpiresAt > now)
        .map((attempt) => [attempt.id, attempt.title]),
    );
    const rows = run.results
      ? run.results.map((result) => ({
          ordinal: result.ordinal,
          attemptId: result.attemptId,
          attemptNumber: result.attemptNumber,
          origin: result.origin,
          state: result.state,
          failure: result.failure,
          title: titles.get(result.attemptId) ?? null,
        }))
      : own.map((attempt) => ({
          ordinal: attempt.ordinal,
          attemptId: attempt.id,
          attemptNumber: attempt.attemptNumber,
          origin: "attempt" as const,
          state: attempt.state,
          failure: attempt.failure,
          title: titles.get(attempt.id) ?? null,
        }));
    const latest = await u.zipRequests.latestAttempts(id);
    const retryOrdinals =
      request.state === "terminal" &&
      request.generation === run.generation &&
      (run.state === "failed" || run.state === "partial")
        ? latest
            .filter(
              (attempt) =>
                attempt.state === "failed" && attempt.historyExpiresAt > now,
            )
            .map((attempt) => attempt.ordinal)
        : [];
    const canRetryAssembly =
      request.state === "terminal" &&
      request.generation === run.generation &&
      run.state === "failed" &&
      run.publishedAt === null &&
      latest.every((attempt) => attempt.state !== "failed") &&
      (await u.zipSpools.refs(run)).length > 0;
    return {
      job: await zipJobView(u, request, run, now),
      items: rows.slice(offset, offset + 50),
      nextOffset: offset + 50 < rows.length ? offset + 50 : null,
      retryOrdinals,
      canRetryAssembly,
    };
  });
}
