import { BusinessRuleError } from "@repo/core/domain/error";
import {
  ZIP_ARTIFACT_MS,
  ZIP_MAX_PAYLOAD_BYTES,
  type ZipArtifactEntry,
  type ZipAssembly,
  type ZipExclusionReason,
  type ZipSpool,
  type ZipTarget,
} from "@repo/core/domain/zip/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { isNotFoundError } from "../errors";
import { inspectExportSources } from "../export/snapshot";
import { ObjectOwnershipUnprovenError } from "../ports/objectOwnership";
import type { OwnedObjectRead } from "../ports/objectStorage";
import { currentZipRun, zipAborted, zipStageDeadline } from "./generation";
import { zipManifest } from "./manifest";
import type { ZipWorkClaim } from "./ports";
import { zipServices } from "./services";
import { readZipSnapshot } from "./snapshot";
import { zipOwnedSource, zipStorageSink } from "./storage";
import type { ZipWriterEntry } from "./writer";

type Candidate = Readonly<{
  ordinal: number;
  spool: Extract<ZipSpool, { state: "ready" }>;
  target: ZipTarget;
}>;

async function candidates(
  c: HollowContainer,
  claim: ZipWorkClaim,
  signal: AbortSignal,
): Promise<readonly Candidate[]> {
  const initial = await c.unitOfWorkProvider.run(async (u) => {
    const run = await currentZipRun(c, u, claim, signal);
    for (const excluded of run.exclusions)
      await u.zipWork.exclude(
        run,
        claim.lease.token,
        [excluded.ordinal],
        excluded.reason,
        c.clock.now(),
      );
    return {
      run,
      refs: await u.zipSpools.refs(run),
      targets: await u.zipRequests.targets(run.requestId),
    };
  });
  const valid: Candidate[] = [];
  for (const { ref, spool } of initial.refs) {
    if (initial.run.exclusions.some((entry) => entry.ordinal === ref.ordinal))
      continue;
    const target = initial.targets.find(
      (entry) => entry.ordinal === ref.ordinal,
    );
    let reason: ZipExclusionReason | null = null;
    if (spool.state !== "ready")
      throw new BusinessRuleError(
        "ZIP_SPOOL_UNAVAILABLE",
        "保存した子ファイルを確認できません。",
      );
    try {
      if (!target?.liveNoteId) reason = "ZIP_NOTE_UNAVAILABLE";
      else {
        const snapshot = await c.unitOfWorkProvider.run(async (u) => {
          await currentZipRun(c, u, claim, signal);
          return readZipSnapshot(
            c,
            u,
            claim.request.accountId,
            target.liveNoteId ?? target.targetNoteId,
          );
        });
        if (snapshot.identity !== spool.result.sourceIdentity)
          reason = "ZIP_CONTENT_CHANGED";
        else if (
          c.tokens.hash(
            JSON.stringify(
              (
                await inspectExportSources(
                  c,
                  snapshot,
                  signal,
                  "require-determinate",
                )
              ).external,
            ),
          ) !== spool.result.externalIdentity
        )
          reason = "ZIP_SOURCE_CHANGED";
      }
    } catch (error) {
      if (
        isNotFoundError(error) ||
        (error instanceof BusinessRuleError && error.code === "EXPORT_EMPTY")
      )
        reason = "ZIP_NOTE_UNAVAILABLE";
      else throw error;
    }
    if (reason) {
      await c.unitOfWorkProvider.run(async (u) => {
        if (
          !(await u.zipWork.exclude(
            claim.run,
            claim.lease.token,
            [ref.ordinal],
            reason,
            c.clock.now(),
          ))
        )
          throw zipAborted();
      });
    } else if (target) valid.push({ ordinal: ref.ordinal, spool, target });
  }
  return valid;
}

export async function assembleZip(
  c: HollowContainer,
  claim: ZipWorkClaim,
  parent: AbortSignal,
): Promise<void> {
  const service = zipServices(c);
  for (let generation = 1; generation <= 501; generation++) {
    const selected = await candidates(c, claim, parent);
    if (!selected.length) {
      const cancelled = await c.unitOfWorkProvider.run(async (u) => {
        const run = await currentZipRun(c, u, claim, parent);
        const attempts = await u.zipRequests.latestAttempts(run.requestId);
        const targets = await u.zipRequests.targets(run.requestId);
        if (
          !targets.length ||
          !targets.every(
            (target) =>
              attempts.some(
                (attempt) =>
                  attempt.ordinal === target.ordinal &&
                  attempt.state === "cancelled",
              ) ||
              run.exclusions.some(
                (entry) =>
                  entry.ordinal === target.ordinal &&
                  entry.reason === "ZIP_CANCELLED",
              ),
          )
        )
          return false;
        await u.zipRequests.cancel(
          run.requestId,
          claim.request.accountId,
          c.clock.now(),
        );
        return true;
      });
      if (cancelled) throw zipAborted();
      throw new BusinessRuleError(
        "ZIP_NO_OUTPUT",
        "書き出せる子ファイルがありませんでした。",
      );
    }
    const failures = await c.unitOfWorkProvider.run(async (u) => {
      const run = await currentZipRun(c, u, claim, parent);
      const attempts = await u.zipRequests.latestAttempts(run.requestId);
      const excluded = new Map(
        run.exclusions.map((entry) => [entry.ordinal, entry.reason]),
      );
      const failures = new Map(
        attempts
          .filter((attempt) => attempt.state !== "succeeded")
          .map((attempt) => [
            attempt.ordinal,
            attempt.failure ?? "ZIP_CANCELLED",
          ]),
      );
      for (const [ordinal, reason] of excluded) failures.set(ordinal, reason);
      return [...failures]
        .sort(([a], [b]) => a - b)
        .map(([ordinal, reason]) => ({ ordinal, reason }));
    });
    const manifest = zipManifest(failures);
    const payload = selected.reduce(
      (sum, entry) => sum + entry.spool.result.bytes,
      manifest.bytes.byteLength,
    );
    if (payload > ZIP_MAX_PAYLOAD_BYTES)
      throw new BusinessRuleError(
        "ZIP_TOO_LARGE",
        "ZIPに含める内容とレポートが1GBを超えています。対象を分割してください。",
      );
    const names = new Map(
      service.names
        .allocate(
          selected.map((entry) => ({
            ordinal: entry.ordinal,
            filename: entry.spool.result.filename,
          })),
        )
        .map((entry) => [entry.ordinal, entry.filename]),
    );
    const metadata = selected.map((entry) => ({
      name: names.get(entry.ordinal) ?? "",
      bytes: entry.spool.result.bytes,
    }));
    metadata.push({ name: manifest.name, bytes: manifest.bytes.byteLength });
    const upperBound = service.writer.upperBound(metadata);
    const now = c.clock.now();
    const id = c.idGenerator.next();
    const key = `${id}_zip`;
    const assembly: ZipAssembly = {
      id,
      requestId: claim.request.id,
      generation: claim.run.generation,
      assemblyGeneration: generation,
      ordinals: selected.map((entry) => entry.ordinal),
      sealDigest: c.tokens.hash(
        JSON.stringify(
          selected.map((entry) => [
            entry.ordinal,
            entry.spool.id,
            entry.spool.result,
          ]),
        ),
      ),
      reservedBytes: upperBound,
      createdAt: now,
      cleanup: { nextAt: now, claim: null },
      state: "writing",
      key,
      file: null,
      outcome: null,
    };
    await service.disk.reserve(
      {
        newBytes: upperBound,
        unmaterializedBytes: () =>
          c.unitOfWorkProvider.run(
            async (u) => (await u.zipWork.reserved()).unmaterializedBytes,
          ),
      },
      () =>
        c.unitOfWorkProvider.run(async (u) => {
          await currentZipRun(c, u, claim, parent);
          if (
            !(await u.zipWork.beginAssembly(
              assembly,
              claim.lease.token,
              service.capacity.diskBytes,
              c.clock.now(),
            ))
          )
            throw zipAborted();
        }),
    );
    const deadline = zipStageDeadline(c, claim, service.capacity.assemblyMs);
    let ownershipKnown = true;
    try {
      const result = await service.execution.within(
        deadline,
        parent,
        (signal) =>
          service.withOwner({ kind: "zip-assembly", id }, async () => {
            const opened: OwnedObjectRead[] = [];
            const output = zipStorageSink(
              service.putOwnedBounded,
              key,
              upperBound,
              signal,
            );
            const entries: ZipWriterEntry[] = selected.map((entry) => ({
              name: names.get(entry.ordinal) ?? "",
              bytes: entry.spool.result.bytes,
              sha256: entry.spool.result.sha256,
              async open(sourceSignal) {
                const owned = await service.openOwnedRead(
                  entry.spool.key,
                  sourceSignal,
                );
                opened.push(owned);
                return zipOwnedSource(owned);
              },
            }));
            entries.push({
              name: manifest.name,
              bytes: manifest.bytes.byteLength,
              sha256: c.tokens.hash(new TextDecoder().decode(manifest.bytes)),
              async open() {
                return {
                  chunks: {
                    async *[Symbol.asyncIterator]() {
                      yield manifest.bytes;
                    },
                  },
                  close: () => Promise.resolve(),
                };
              },
            });
            try {
              const written = await service.writer.write({
                entries,
                sink: output.sink,
                signal,
              });
              const stored = await output.result;
              if (
                written.bytes !== stored.bytes ||
                written.sha256 !== stored.sha256
              )
                throw new BusinessRuleError(
                  "ZIP_COPY_CHANGED",
                  "ZIP保存結果が一致しません。",
                );
              return { ...written, filename: "hollow-export.zip" };
            } finally {
              const outcomes = await Promise.allSettled([
                output.sink.close(),
                ...opened.map(async (owned) => {
                  await owned.close();
                  await owned.closed;
                }),
              ]);
              if (outcomes.some((outcome) => outcome.status === "rejected"))
                // biome-ignore lint/correctness/noUnsafeFinally: Unproven native closure must override a writer failure so withOwner retains ownership.
                throw new ObjectOwnershipUnprovenError({
                  kind: "zip-assembly",
                  id,
                });
            }
          }),
      );
      await c.unitOfWorkProvider.run(async (u) => {
        if (
          !(await u.zipWork.closeAssembly(
            id,
            claim.lease.token,
            "success",
            result,
            c.clock.now(),
          ))
        )
          throw zipAborted();
      });
      const current = await candidates(c, claim, parent);
      const same =
        current.length === selected.length &&
        current.every(
          (entry, index) => entry.spool.id === selected[index]?.spool.id,
        );
      const published =
        same &&
        (await c.unitOfWorkProvider.run(async (u) => {
          const run = await currentZipRun(c, u, claim, parent);
          if (c.clock.now() >= deadline)
            throw new BusinessRuleError(
              "ZIP_STAGE_DEADLINE",
              "ZIPの組立時間制限に達しました。",
            );
          for (const entry of selected) {
            let reason: ZipExclusionReason | null = null;
            try {
              const snapshot = await readZipSnapshot(
                c,
                u,
                claim.request.accountId,
                entry.target.targetNoteId,
              );
              if (snapshot.identity !== entry.spool.result.sourceIdentity)
                reason = "ZIP_CONTENT_CHANGED";
            } catch (error) {
              if (
                isNotFoundError(error) ||
                (error instanceof BusinessRuleError &&
                  error.code === "EXPORT_EMPTY")
              )
                reason = "ZIP_NOTE_UNAVAILABLE";
              else throw error;
            }
            if (reason) {
              await u.zipWork.exclude(
                run,
                claim.lease.token,
                [entry.ordinal],
                reason,
                c.clock.now(),
              );
              return false;
            }
          }
          const publishedAt = c.clock.now();
          const artifactId = c.idGenerator.next();
          const entries: ZipArtifactEntry[] = selected.map((entry) => ({
            ...entry.spool.result,
            filename: names.get(entry.ordinal) ?? "",
            artifactId,
            ordinal: entry.ordinal,
            targetNoteId: entry.target.targetNoteId,
            liveNoteId: entry.target.liveNoteId,
          }));
          if (
            !(await u.zipArtifacts.publish(
              {
                artifact: {
                  id: artifactId,
                  assemblyId: id,
                  generation: 1,
                  publishedAt,
                  expiresAt: new Date(publishedAt.getTime() + ZIP_ARTIFACT_MS),
                  reservedBytes: result.bytes,
                  cleanup: { nextAt: publishedAt, claim: null },
                  state: "ready",
                  key,
                  file: result,
                },
                entries,
                run,
                token: claim.lease.token,
                partial: failures.length > 0 || run.exclusions.length > 0,
              },
              publishedAt,
            ))
          )
            throw zipAborted();
          return true;
        }));
      if (published) return;
    } catch (error) {
      ownershipKnown = !(error instanceof ObjectOwnershipUnprovenError);
      if (!ownershipKnown || parent.aborted || c.clock.now() >= deadline)
        throw error;
      await c.unitOfWorkProvider.run((u) =>
        u.zipWork.closeAssembly(
          id,
          claim.lease.token,
          "failure",
          null,
          c.clock.now(),
        ),
      );
      const remaining = await candidates(c, claim, parent);
      if (
        remaining.length >= selected.length ||
        remaining.some(
          (entry) =>
            !selected.some(
              (old) =>
                old.ordinal === entry.ordinal &&
                old.spool.id === entry.spool.id,
            ),
        )
      )
        throw error;
    } finally {
      if (ownershipKnown)
        await c.unitOfWorkProvider.run((u) =>
          u.zipWork.closeAssembly(
            id,
            claim.lease.token,
            parent.aborted ? "cancelled" : "failure",
            null,
            c.clock.now(),
          ),
        );
    }
    await cleanupExcludedAssembly(c, id);
  }
  throw new BusinessRuleError(
    "ZIP_NO_OUTPUT",
    "書き出せる子ファイルがありませんでした。",
  );
}

async function cleanupExcludedAssembly(c: HollowContainer, id: string) {
  const service = zipServices(c);
  for (let index = 0; index < 20; index++) {
    const target = await c.unitOfWorkProvider.run((u) =>
      u.zipWork.assembly(id),
    );
    if (!target?.key) return;
    const now = c.clock.now();
    const token = c.idGenerator.next();
    const assembly = await c.unitOfWorkProvider.run((u) =>
      u.zipWork.claimAssemblyCleanup(
        now,
        token,
        new Date(now.getTime() + service.capacity.leaseMs),
      ),
    );
    if (!assembly) break;
    try {
      if (!assembly.key) throw zipAborted();
      const key = assembly.key;
      const removed = await service.execution.within(
        new Date(c.clock.now().getTime() + service.capacity.cleanupMs),
        new AbortController().signal,
        () => service.removeClaimed(key),
      );
      await c.unitOfWorkProvider.run((u) =>
        u.zipWork.assemblyCleaned(assembly.id, token, removed.token),
      );
    } catch (error) {
      await c.unitOfWorkProvider.run((u) =>
        u.zipWork.deferAssemblyCleanup(assembly.id, token, c.clock.now()),
      );
      throw error;
    }
  }
  const target = await c.unitOfWorkProvider.run((u) => u.zipWork.assembly(id));
  if (target?.key)
    throw new BusinessRuleError(
      "ZIP_CLEANUP_PENDING",
      "前のZIP組立の回収を待っています。",
    );
}
