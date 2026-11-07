import { BusinessRuleError } from "@repo/core/domain/error";
import {
  ZIP_MAX_PAYLOAD_BYTES,
  type ZipAttempt,
  type ZipSpool,
} from "@repo/core/domain/zip/entity";
import { isSerializableError } from "@repo/core/lib/error";
import type { HollowContainer } from "../di/hollowTypes";
import { isNotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { inspectExportSources } from "../export/snapshot";
import { exportStream } from "../export/stream";
import {
  ObjectOwnershipUnprovenError,
  ObjectWriteCloseUnprovenError,
} from "../ports/objectOwnership";
import { ZipExecutionUnprovenError } from "./executionError";
import type { ZipWorkClaim } from "./ports";
import { zipServices } from "./services";
import { readZipSnapshot, zipNotFound } from "./snapshot";
import { trackZipSources } from "./storage";

export const zipAborted = () =>
  new BusinessRuleError("ZIP_CANCELLED", "ZIPの生成を中止しました。");
export function zipFailure(error: unknown): string {
  if (isNotFoundError(error)) return "ZIP_NOTE_UNAVAILABLE";
  return isSerializableError(error)
    ? (error.toSerialized().code ?? "ZIP_GENERATION_FAILED")
    : "ZIP_GENERATION_FAILED";
}
export function zipStageDeadline(
  c: HollowContainer,
  claim: ZipWorkClaim,
  duration: number,
) {
  return new Date(
    Math.min(
      claim.run.deadlineAt.getTime(),
      c.clock.now().getTime() + duration,
    ),
  );
}
export async function currentZipRun(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  claim: ZipWorkClaim,
  signal: AbortSignal,
) {
  const now = c.clock.now();
  const request = await u.zipRequests.find(claim.request.id);
  const run = await u.zipRequests.findRun(claim.run);
  if (
    signal.aborted ||
    !request ||
    !run ||
    request.generation !== claim.run.generation ||
    request.cancelGeneration >= run.generation ||
    (run.state !== "running" && run.state !== "assembling") ||
    run.lease.token !== claim.lease.token ||
    run.lease.until <= now ||
    run.deadlineAt <= now
  )
    throw zipAborted();
  return run;
}
export async function childSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  claim: ZipWorkClaim,
  attempt: ZipAttempt,
  signal: AbortSignal,
) {
  const run = await currentZipRun(c, u, claim, signal);
  const target = (await u.zipRequests.targets(claim.request.id)).find(
    (row) => row.ordinal === attempt.ordinal,
  );
  if (
    !target?.liveNoteId ||
    run.exclusions.some((entry) => entry.ordinal === attempt.ordinal)
  )
    return zipNotFound();
  const snapshot = await readZipSnapshot(
    c,
    u,
    claim.request.accountId,
    target.liveNoteId,
  );
  if (snapshot.identity !== attempt.expectedIdentity)
    throw new BusinessRuleError(
      "ZIP_CONTENT_CHANGED",
      "保存済みの内容が変わりました。",
    );
  return snapshot;
}
export function counted(
  body: ReadableStream<Uint8Array>,
  previousBytes: number,
) {
  const reader = body.getReader();
  let bytes = previousBytes;
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const next = await reader.read();
          if (next.done) {
            reader.releaseLock();
            controller.close();
            return;
          }
          bytes += next.value.byteLength;
          if (bytes > ZIP_MAX_PAYLOAD_BYTES)
            throw new BusinessRuleError(
              "ZIP_TOO_LARGE",
              "ZIPに含める内容が1GBを超えています。対象を分割してください。",
            );
          controller.enqueue(next.value);
        } catch (error) {
          await reader.cancel().catch(() => {});
          controller.error(error);
        }
      },
      async cancel() {
        await reader.cancel().catch(() => {});
      },
    },
    { highWaterMark: 1 },
  );
}

export async function generateZipChild(
  c: HollowContainer,
  claim: ZipWorkClaim,
  attempt: ZipAttempt,
  parent: AbortSignal,
): Promise<void> {
  const service = zipServices(c);
  const format = claim.request.options.format;
  let spoolId: string | null = null;
  const deadline = zipStageDeadline(c, claim, service.capacity.childMs);
  try {
    const result = await service.execution.within(
      deadline,
      parent,
      async (signal) => {
        const snapshot = await c.unitOfWorkProvider.run((u) =>
          childSnapshot(c, u, claim, attempt, signal),
        );
        const prepared = await inspectExportSources(
          c,
          snapshot,
          signal,
          "require-determinate",
        );
        const externalIdentity = c.tokens.hash(
          JSON.stringify(prepared.external),
        );
        const plan = await service.execution.within(
          new Date(
            Math.min(deadline.getTime(), c.clock.now().getTime() + 30_000),
          ),
          signal,
          (planning) =>
            service.documentWriter.plan(
              {
                noteId: snapshot.note.id,
                title: snapshot.note.title,
                html: snapshot.note.html,
                style: snapshot.note.display.style,
                defaultCss: service.defaultCss,
                appUrl: c.appUrl,
                format,
                media: prepared.media,
                external: prepared.external,
              },
              planning,
            ),
        );
        const previousBytes = await c.unitOfWorkProvider.run(async (u) =>
          (await u.zipSpools.refs(claim.run)).reduce(
            (sum, entry) =>
              sum +
              (entry.spool.state === "ready" ? entry.spool.result.bytes : 0),
            0,
          ),
        );
        const reserveBytes = Math.min(
          plan.maxBytes,
          ZIP_MAX_PAYLOAD_BYTES - previousBytes + 1,
        );
        if (!Number.isSafeInteger(reserveBytes) || reserveBytes < 1)
          throw new BusinessRuleError(
            "ZIP_CAPACITY",
            "ZIPの生成容量を確保できませんでした。",
          );
        const now = c.clock.now();
        const id = c.idGenerator.next();
        const key = `${id}_zip_spool`;
        const spool: ZipSpool = {
          id,
          attemptId: attempt.id,
          format,
          generation: 1,
          reservedBytes: reserveBytes,
          createdAt: now,
          cleanup: { nextAt: now, claim: null },
          state: "writing",
          key,
          result: null,
        };
        await service.disk.reserve(
          {
            newBytes: reserveBytes,
            unmaterializedBytes: () =>
              c.unitOfWorkProvider.run(
                async (u) => (await u.zipWork.reserved()).unmaterializedBytes,
              ),
          },
          () =>
            c.unitOfWorkProvider.run(async (u) => {
              await childSnapshot(c, u, claim, attempt, signal);
              if (
                !(await u.zipSpools.reserve(
                  spool,
                  claim.lease.token,
                  service.capacity.diskBytes,
                  c.clock.now(),
                ))
              )
                throw zipAborted();
            }),
        );
        spoolId = id;
        const file = await service.withOwner(
          { kind: "zip-spool", id },
          async () => {
            const tracked = trackZipSources(service.sources);
            try {
              return await service.putOwnedBounded(
                key,
                counted(
                  exportStream(plan, prepared.sources, tracked.reader, signal),
                  previousBytes,
                ),
                reserveBytes,
                signal,
              );
            } catch (error) {
              if (error instanceof ObjectWriteCloseUnprovenError)
                throw new ObjectOwnershipUnprovenError({
                  kind: "zip-spool",
                  id,
                });
              throw error;
            } finally {
              if (!(await tracked.close()))
                // biome-ignore lint/correctness/noUnsafeFinally: Unproven native closure must override a body failure so withOwner retains ownership.
                throw new ObjectOwnershipUnprovenError({
                  kind: "zip-spool",
                  id,
                });
            }
          },
        );
        const refreshed = await inspectExportSources(
          c,
          snapshot,
          signal,
          "require-determinate",
        );
        if (
          c.tokens.hash(JSON.stringify(refreshed.external)) !== externalIdentity
        )
          throw new BusinessRuleError(
            "ZIP_SOURCE_CHANGED",
            "書き出し中に素材が変わりました。",
          );
        return {
          id,
          file: {
            ...file,
            filename: plan.filename,
            profile: plan.profile,
            sourceIdentity: snapshot.identity,
            externalIdentity,
          },
        };
      },
    );
    await c.unitOfWorkProvider.run(async (u) => {
      await childSnapshot(c, u, claim, attempt, parent);
      if (
        c.clock.now() >= deadline ||
        !(await u.zipSpools.publish(
          result.id,
          claim.lease.token,
          result.file,
          c.clock.now(),
        ))
      )
        throw zipAborted();
    });
  } catch (error) {
    if (
      error instanceof ObjectOwnershipUnprovenError ||
      error instanceof ZipExecutionUnprovenError ||
      parent.aborted ||
      zipFailure(error) === "ZIP_TOO_LARGE"
    )
      throw error;
    const failure =
      c.clock.now() >= deadline ? "ZIP_CHILD_DEADLINE" : zipFailure(error);
    await c.unitOfWorkProvider.run(async (u) => {
      if (spoolId) await u.zipSpools.retire(spoolId, c.clock.now());
      const run = await u.zipRequests.findRun(claim.run);
      const cancelled = run?.exclusions.some(
        (entry) =>
          entry.ordinal === attempt.ordinal && entry.reason === "ZIP_CANCELLED",
      );
      const excluded =
        failure === "ZIP_NOTE_UNAVAILABLE" || failure === "ZIP_CONTENT_CHANGED";
      const outcome = cancelled
        ? {
            ...attempt,
            state: "cancelled" as const,
            result: null,
            failure: null,
          }
        : {
            ...attempt,
            state: excluded ? ("excluded" as const) : ("failed" as const),
            result: null,
            failure,
          };
      if (
        !(await u.zipWork.finishAttempt(
          attempt.id,
          claim.lease.token,
          outcome,
          c.clock.now(),
        ))
      )
        throw zipAborted();
    });
  }
}
