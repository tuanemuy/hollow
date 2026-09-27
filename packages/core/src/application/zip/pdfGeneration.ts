import { BusinessRuleError } from "@repo/core/domain/error";
import {
  ZIP_MAX_PAYLOAD_BYTES,
  type ZipAttempt,
  type ZipSpool,
} from "@repo/core/domain/zip/entity";
import { pdfComputeIdentity } from "@repo/core/domain/zip/pdf";
import type { HollowContainer } from "../di/hollowTypes";
import { inspectExportSources } from "../export/snapshot";
import { buildPdfSnapshot, pdfContext } from "../pdf/snapshot";
import {
  ObjectOwnershipUnprovenError,
  ObjectWriteCloseUnprovenError,
} from "../ports/objectOwnership";
import { ZipExecutionUnprovenError } from "./executionError";
import {
  childSnapshot,
  counted,
  zipAborted,
  zipFailure,
  zipStageDeadline,
} from "./generation";
import type { ZipPdfCopyClaim } from "./pdfPorts";
import { readZipPdfSnapshot } from "./pdfSnapshot";
import type { ZipWorkClaim } from "./ports";
import { zipServices } from "./services";

async function releasePdfDemand(c: HollowContainer, attemptId: string) {
  const service = zipServices(c);
  const closing = new AbortController().signal;
  while (true) {
    const progress = await c.unitOfWorkProvider.run((u) =>
      u.zipPdf.find(attemptId),
    );
    if (!progress) return;
    if (progress.hold) {
      await c.unitOfWorkProvider.run(async (u) => {
        await u.zipPdf.beginClose(
          attemptId,
          progress.hold?.claim?.token ?? null,
          c.clock.now(),
        );
        if (
          !(await u.zipPdf.releaseClosed(
            attemptId,
            progress.hold?.claim?.token ?? null,
            c.clock.now(),
          ))
        )
          throw new ZipExecutionUnprovenError();
      });
      return;
    }
    const compute = await c.unitOfWorkProvider.run((u) =>
      u.pdfComputations.find(progress.demand.binding.computeId),
    );
    if (!compute) throw new ZipExecutionUnprovenError();
    if (compute.state === "closed" && c.pdf?.execution.active(compute.id)) {
      await service.execution.waitForPoll(closing);
      continue;
    }
    const released = await c.unitOfWorkProvider.run(async (u) => {
      const attempts = await u.zipRequests.attemptsByIds([attemptId]);
      const attempt = attempts[0];
      return (
        !attempt ||
        (await u.zipPdf.detachWaiting(
          attemptId,
          attempt.version,
          c.clock.now(),
        ))
      );
    });
    if (released) return;
    c.pdf?.execution.cancel(compute.id);
    c.pdf?.wake();
    if (!c.pdf?.execution.active(compute.id)) {
      const after = await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.find(compute.id),
      );
      if (after?.state !== "closed") throw new ZipExecutionUnprovenError();
    }
    await service.execution.waitForPoll(closing);
  }
}

export async function generateZipPdfChild(
  c: HollowContainer,
  claim: ZipWorkClaim,
  attempt: ZipAttempt,
  parent: AbortSignal,
) {
  const service = zipServices(c);
  const pdf = pdfContext(c);
  const deadline = zipStageDeadline(c, claim, service.capacity.childMs);
  let spoolId: string | null = null;
  try {
    const result = await service.execution.within(
      deadline,
      parent,
      async (signal) => {
        const source = await c.unitOfWorkProvider.run((u) =>
          childSnapshot(c, u, claim, attempt, signal),
        );
        const inspected = await inspectExportSources(
          c,
          source,
          signal,
          "require-determinate",
        );
        const externalIdentity = c.tokens.hash(
          JSON.stringify(inspected.external),
        );
        while (true) {
          signal.throwIfAborted();
          if (c.clock.now() >= deadline)
            throw new BusinessRuleError(
              "ZIP_CHILD_DEADLINE",
              "PDF生成の時間制限に達しました。",
            );
          try {
            await c.unitOfWorkProvider.run(async (u) => {
              const snapshot = await childSnapshot(
                c,
                u,
                claim,
                attempt,
                signal,
              );
              const built = await buildPdfSnapshot(c, u, snapshot.note);
              const now = c.clock.now();
              const cache = await u.pdfArtifacts.cached(
                source.note.id,
                built.identity,
                pdf.supervisor.profile,
                now,
              );
              let compute = cache
                ? null
                : await u.pdfComputations.active(source.note.id);
              if (
                compute &&
                (compute.state === "stopping" ||
                  compute.sourceIdentity !== built.identity ||
                  compute.profile !== pdf.supervisor.profile)
              )
                throw new BusinessRuleError(
                  "PDF_STOPPING",
                  "前のPDF処理の終了を待ってやり直してください。",
                );
              if (!cache && !compute) {
                const id = c.idGenerator.next();
                compute = {
                  id,
                  targetNoteId: source.note.id,
                  liveNoteId: source.note.id,
                  sourceIdentity: built.identity,
                  profile: pdf.supervisor.profile,
                  state: "queued",
                  generation: 1,
                  leaseToken: null,
                  leaseUntil: null,
                  deadlineAt: new Date(now.getTime() + pdf.capacity.totalMs),
                  workspaceId: id,
                  reservedBytes:
                    pdf.capacity.outputBytes + pdf.capacity.nativeTempBytes,
                  workspaceRemoved: false,
                  nextCleanupAt: now,
                  cleanupToken: null,
                  cleanupUntil: null,
                  createdAt: now,
                };
                await u.pdfComputations.begin(compute, pdf.capacity.diskBytes);
              }
              const computeId = cache?.computeId ?? compute?.id;
              if (
                !computeId ||
                !(await u.zipPdf.attach(
                  {
                    attemptId: attempt.id,
                    attemptVersion: attempt.version,
                    leaseToken: claim.lease.token,
                    binding: {
                      computeId,
                      identity: pdfComputeIdentity(built.identity),
                      profile: pdf.supervisor.profile,
                      externalIdentity,
                      deadlineAt: deadline,
                      phase: "waiting-pdf",
                    },
                  },
                  now,
                ))
              )
                throw zipAborted();
              if (
                cache &&
                !(await u.zipPdf.acquireCached(
                  attempt.id,
                  attempt.version + 1,
                  cache.id,
                  now,
                ))
              )
                throw zipAborted();
            });
            break;
          } catch (error) {
            signal.throwIfAborted();
            if (
              !(error instanceof BusinessRuleError) ||
              (error.code !== "PDF_BUSY" && error.code !== "PDF_STOPPING")
            )
              throw error;
            await service.execution.waitForPoll(signal);
          }
        }
        pdf.wake();
        let copy: ZipPdfCopyClaim;
        while (true) {
          signal.throwIfAborted();
          const ready = await c.unitOfWorkProvider.run(async (u) => {
            await childSnapshot(c, u, claim, attempt, signal);
            const progress = await u.zipPdf.find(attempt.id);
            if (!progress) throw zipAborted();
            await readZipPdfSnapshot(c, u, progress.demand);
            if (progress.hold?.state === "held")
              return u.zipPdf.claimCopy(
                attempt.id,
                progress.hold.version,
                {
                  token: c.tokens.generate(),
                  runtimeId: service.execution.runtimeId,
                },
                c.clock.now(),
              );
            const compute = await u.pdfComputations.find(
              progress.demand.binding.computeId,
            );
            if (
              !compute ||
              compute.state === "closed" ||
              compute.state === "stopping"
            )
              throw new BusinessRuleError(
                "PDF_GENERATION_FAILED",
                "PDF生成を完了できませんでした。現在のノートからやり直してください。",
              );
            return null;
          });
          if (ready) {
            copy = ready;
            break;
          }
          await service.execution.waitForPoll(signal);
        }
        const previousBytes = await c.unitOfWorkProvider.run(async (u) =>
          (await u.zipSpools.refs(claim.run)).reduce(
            (n, ref) =>
              n + (ref.spool.state === "ready" ? ref.spool.result.bytes : 0),
            0,
          ),
        );
        const reserveBytes = Math.min(
          copy.artifact.file.bytes + 1,
          ZIP_MAX_PAYLOAD_BYTES - previousBytes + 1,
        );
        if (!Number.isSafeInteger(reserveBytes) || reserveBytes < 1)
          throw new BusinessRuleError(
            "ZIP_CAPACITY",
            "ZIP作業容量を確保できませんでした。",
          );
        const now = c.clock.now();
        const id = c.idGenerator.next();
        const key = `${id}_zip_spool`;
        const spool: ZipSpool = {
          id,
          attemptId: attempt.id,
          format: "pdf",
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
          { kind: "zip-source", id: attempt.id },
          async () => {
            const owned = await service.openOwnedRead(
              copy.artifact.key,
              signal,
            );
            void owned.closed.catch(() => {});
            try {
              return await service.withOwner(
                { kind: "zip-spool", id },
                async () => {
                  try {
                    return await service.putOwnedBounded(
                      key,
                      counted(owned.body, previousBytes),
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
                  }
                },
              );
            } finally {
              const closed = await Promise.allSettled([
                owned.close(),
                owned.closed,
              ]);
              if (closed.some((item) => item.status === "rejected"))
                // biome-ignore lint/correctness/noUnsafeFinally: Native close failure must preserve the source owner even after a successful copy.
                throw new ObjectOwnershipUnprovenError({
                  kind: "zip-source",
                  id: attempt.id,
                });
            }
          },
        );
        if (
          file.bytes !== copy.artifact.file.bytes ||
          file.sha256 !== copy.artifact.file.sha256
        )
          throw new BusinessRuleError(
            "ZIP_SOURCE_CHANGED",
            "PDFの保存内容を確認できませんでした。",
          );
        const refreshed = await inspectExportSources(
          c,
          source,
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
          copy,
          file: {
            ...file,
            filename: copy.artifact.file.filename,
            profile: copy.artifact.profile,
            sourceIdentity: source.identity,
            externalIdentity,
          },
        };
      },
    );
    await c.unitOfWorkProvider.run(async (u) => {
      await childSnapshot(c, u, claim, attempt, parent);
      await readZipPdfSnapshot(c, u, result.copy.demand);
      if (c.clock.now() >= deadline) throw zipAborted();
      await u.zipPdf.beginClose(
        attempt.id,
        result.copy.hold.claim.token,
        c.clock.now(),
      );
      if (
        !(await u.zipPdf.releaseClosed(
          attempt.id,
          result.copy.hold.claim.token,
          c.clock.now(),
        )) ||
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
      error instanceof ZipExecutionUnprovenError
    )
      throw error;
    await releasePdfDemand(c, attempt.id);
    if (parent.aborted || zipFailure(error) === "ZIP_TOO_LARGE") throw error;
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
        failure === "ZIP_NOTE_UNAVAILABLE" ||
        failure === "ZIP_CONTENT_CHANGED" ||
        failure === "PDF_CONTENT_CHANGED";
      const { pdf: _pdf, ...base } = attempt;
      const outcome = cancelled
        ? { ...base, state: "cancelled" as const, result: null, failure: null }
        : {
            ...base,
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
