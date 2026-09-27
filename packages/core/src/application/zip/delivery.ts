import { BusinessRuleError } from "@repo/core/domain/error";
import type { ZipArtifact } from "@repo/core/domain/zip/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { isNotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { inspectExportSources } from "../export/snapshot";
import { ObjectOwnershipUnprovenError } from "../ports/objectOwnership";
import type { OwnedObjectRead } from "../ports/objectStorage";
import { zipServices } from "./services";
import { readZipSnapshot, zipNotFound } from "./snapshot";

export async function currentZipArtifact(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  accountId: string,
  artifactId: string,
) {
  const artifact = await u.zipArtifacts.find(artifactId);
  if (
    !artifact ||
    artifact.state !== "ready" ||
    artifact.expiresAt <= c.clock.now()
  )
    return zipNotFound();
  const entries = await u.zipArtifacts.entries(artifactId);
  if (!entries.length) return zipNotFound();
  const snapshots = [];
  for (const entry of entries) {
    if (!entry.liveNoteId) return zipNotFound();
    const snapshot = await readZipSnapshot(c, u, accountId, entry.liveNoteId);
    if (snapshot.identity !== entry.sourceIdentity)
      throw new BusinessRuleError(
        "ZIP_CONTENT_CHANGED",
        "ZIPに含まれるノートが変わりました。新しく書き出してください。",
      );
    snapshots.push({ snapshot, externalIdentity: entry.externalIdentity });
  }
  return { artifact, snapshots };
}
export async function checkedCurrentZipArtifact(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  accountId: string,
  artifactId: string,
) {
  try {
    return await currentZipArtifact(c, u, accountId, artifactId);
  } catch (error) {
    if (
      !(
        (isNotFoundError(error) && error.code === "ZIP_NOT_FOUND") ||
        (error instanceof BusinessRuleError &&
          (error.code === "ZIP_CONTENT_CHANGED" ||
            error.code === "EXPORT_EMPTY"))
      )
    )
      throw error;
    await u.zipArtifacts.retire(artifactId, c.clock.now());
    return null;
  }
}
async function externalCheck(
  c: HollowContainer,
  snapshots: Awaited<ReturnType<typeof currentZipArtifact>>["snapshots"],
  signal: AbortSignal,
) {
  for (const entry of snapshots) {
    const inspected = await inspectExportSources(
      c,
      entry.snapshot,
      signal,
      "require-determinate",
    );
    if (
      c.tokens.hash(JSON.stringify(inspected.external)) !==
      entry.externalIdentity
    )
      return false;
  }
  return true;
}
export async function prepareZipDelivery(
  c: HollowContainer,
  session: string | null,
  requestId: string,
  generation: number,
) {
  const service = zipServices(c);
  const initial = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const request = await u.zipRequests.find(requestId);
    const run = await u.zipRequests.findRun({ requestId, generation });
    if (
      !request ||
      request.accountId !== actor.id ||
      !run?.artifactId ||
      run.historyExpiresAt <= c.clock.now()
    )
      return zipNotFound();
    const current = await checkedCurrentZipArtifact(
      c,
      u,
      actor.id,
      run.artifactId,
    );
    return current ? { accountId: actor.id, ...current } : null;
  });
  if (!initial) return zipNotFound();
  const sameSources = await service.execution.within(
    new Date(c.clock.now().getTime() + service.capacity.childMs),
    new AbortController().signal,
    (signal) => externalCheck(c, initial.snapshots, signal),
  );
  const prepared = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    if (actor.id !== initial.accountId) return zipNotFound();
    const current = await checkedCurrentZipArtifact(
      c,
      u,
      actor.id,
      initial.artifact.id,
    );
    if (!current) return null;
    if (!sameSources) {
      await u.zipArtifacts.retire(initial.artifact.id, c.clock.now());
      return null;
    }
    const { artifact } = current;
    const now = c.clock.now();
    const id = c.idGenerator.next();
    const expiresAt = new Date(
      Math.min(
        now.getTime() + service.capacity.deliveryMs,
        artifact.expiresAt.getTime(),
      ),
    );
    await u.zipDeliveries.prepare(
      {
        id,
        artifactId: artifact.id,
        artifactGeneration: artifact.generation,
        accountId: actor.id,
        createdAt: now,
        expiresAt,
        state: "ready",
        claim: null,
      },
      now,
    );
    return {
      id,
      path: `/api/zip/deliveries/${id}/file`,
      expiresAt: expiresAt.toISOString(),
      filename: artifact.file.filename,
    };
  });
  return prepared ?? zipNotFound();
}

export async function getZipFile(
  c: HollowContainer,
  session: string | null,
  id: string,
  requestSignal: AbortSignal,
) {
  const service = zipServices(c);
  const token = c.tokens.generate();
  const admitted = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const delivery = await u.zipDeliveries.find(id);
    if (
      !delivery ||
      delivery.accountId !== actor.id ||
      delivery.state !== "ready" ||
      delivery.expiresAt <= c.clock.now()
    )
      return zipNotFound();
    const current = await checkedCurrentZipArtifact(
      c,
      u,
      actor.id,
      delivery.artifactId,
    );
    return current ? { actorId: actor.id, delivery, ...current } : null;
  });
  if (!admitted) return zipNotFound();
  const sameSources = await service.execution.within(
    admitted.delivery.expiresAt,
    requestSignal,
    (signal) => externalCheck(c, admitted.snapshots, signal),
  );
  const claimed = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const delivery = await u.zipDeliveries.find(id);
    if (
      actor.id !== admitted.actorId ||
      !delivery ||
      delivery.accountId !== actor.id ||
      delivery.state !== "ready" ||
      delivery.expiresAt <= c.clock.now()
    )
      return zipNotFound();
    if (
      !(await checkedCurrentZipArtifact(c, u, actor.id, admitted.artifact.id))
    )
      return false;
    if (!sameSources) {
      await u.zipArtifacts.retire(admitted.artifact.id, c.clock.now());
      return false;
    }
    if (
      !(await u.zipDeliveries.claim(
        id,
        actor.id,
        token,
        service.transfers.runtimeId,
        c.clock.now(),
      ))
    )
      return zipNotFound();
    return true;
  });
  if (!claimed) return zipNotFound();
  let held = false;
  try {
    const signal = AbortSignal.any([
      requestSignal,
      service.transfers.hold(id, admitted.delivery.expiresAt),
    ]);
    held = true;
    return await streamZip(
      c,
      id,
      token,
      admitted.artifact,
      signal,
      async () => {
        const current = await c.unitOfWorkProvider.run(async (u) => {
          const actor = await requireAccount(c, u.accounts, session);
          const delivery = await u.zipDeliveries.find(id);
          if (
            actor.id !== admitted.actorId ||
            !delivery ||
            delivery.state !== "sending" ||
            delivery.claim?.token !== token ||
            delivery.expiresAt <= c.clock.now()
          )
            return zipNotFound();
          return checkedCurrentZipArtifact(
            c,
            u,
            actor.id,
            admitted.artifact.id,
          );
        });
        if (!current) return zipNotFound();
      },
    );
  } catch (error) {
    if (!held)
      await c.unitOfWorkProvider.run((u) => u.zipDeliveries.close(id, token));
    throw error;
  }
}

async function streamZip(
  c: HollowContainer,
  id: string,
  token: string,
  artifact: Exclude<ZipArtifact, { state: "removed" }>,
  signal: AbortSignal,
  recheck: () => Promise<void>,
) {
  const service = zipServices(c);
  let resolveReady!: (value: {
    body: ReadableStream<Uint8Array>;
    file: typeof artifact.file;
  }) => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<{
    body: ReadableStream<Uint8Array>;
    file: typeof artifact.file;
  }>((yes, no) => {
    resolveReady = yes;
    rejectReady = no;
  });
  let complete!: () => void;
  const completed = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let owned: OwnedObjectRead | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closing: Promise<void> | null = null;
  let owner: Promise<void>;
  const close = () => {
    closing ??= (async () => {
      const native = Promise.resolve().then(() => owned?.close());
      complete();
      await native?.catch(() => {});
      await owner;
    })();
    return closing;
  };
  const abort = () => {
    void close().then(
      () =>
        controller?.error(
          new BusinessRuleError(
            "ZIP_DOWNLOAD_CANCELLED",
            "ZIP取得を中止しました。",
          ),
        ),
      () => c.logger.error("ZIP delivery close unproven", { deliveryId: id }),
    );
  };
  owner = service
    .withOwner({ kind: "zip-delivery", id }, async () => {
      try {
        signal.throwIfAborted();
        owned = await service.openOwnedRead(artifact.key, signal);
        reader = owned.body.getReader();
        let first = await reader.read();
        if (
          first.done ||
          first.value.length < 4 ||
          first.value[0] !== 0x50 ||
          first.value[1] !== 0x4b ||
          first.value[2] !== 3 ||
          first.value[3] !== 4
        )
          throw new BusinessRuleError(
            "ZIP_FILE_INVALID",
            "ZIPを読み取れませんでした。",
          );
        await recheck();
        signal.throwIfAborted();
        let bytes = 0;
        const body = new ReadableStream<Uint8Array>(
          {
            start(value) {
              controller = value;
            },
            async pull(value) {
              try {
                signal.throwIfAborted();
                const next = first.done ? await reader?.read() : first;
                first = { done: true, value: undefined };
                if (!next || next.done) {
                  if (bytes !== artifact.file.bytes)
                    throw new BusinessRuleError(
                      "ZIP_FILE_INVALID",
                      "ZIPの保存サイズが一致しません。",
                    );
                  await close();
                  value.close();
                } else {
                  bytes += next.value.byteLength;
                  if (bytes > artifact.file.bytes)
                    throw new BusinessRuleError(
                      "ZIP_FILE_INVALID",
                      "ZIPの保存サイズが一致しません。",
                    );
                  value.enqueue(next.value);
                }
              } catch (error) {
                try {
                  await close();
                } finally {
                  value.error(error);
                }
              }
            },
            async cancel() {
              await close();
            },
          },
          { highWaterMark: 0 },
        );
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
        resolveReady({ body, file: artifact.file });
        await completed;
      } catch (error) {
        rejectReady(error);
        throw error;
      } finally {
        signal.removeEventListener("abort", abort);
        await reader?.cancel().catch(() => {});
        if (owned) {
          const resource = owned;
          const outcomes = await Promise.allSettled([
            Promise.resolve().then(() => resource.close()),
            resource.closed,
          ]);
          if (outcomes.some((outcome) => outcome.status === "rejected"))
            // biome-ignore lint/correctness/noUnsafeFinally: Unproven native closure must override a delivery failure so withOwner retains ownership.
            throw new ObjectOwnershipUnprovenError({
              kind: "zip-delivery",
              id,
            });
        }
      }
    })
    .then(
      async () => {
        service.transfers.release(id);
        await c.unitOfWorkProvider.run((u) => u.zipDeliveries.close(id, token));
      },
      async (error: unknown) => {
        rejectReady(error);
        if (error instanceof ObjectOwnershipUnprovenError) {
          service.transfers.retain(id, error);
          throw error;
        }
        service.transfers.release(id);
        await c.unitOfWorkProvider.run((u) => u.zipDeliveries.close(id, token));
      },
    );
  void owner.catch(() =>
    c.logger.error("ZIP delivery ownership retained", { deliveryId: id }),
  );
  return ready;
}
