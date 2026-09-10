import { IMPORT_LIMITS } from "@repo/core/domain/import/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import { importContext } from "./context";

export async function listImports(
  container: HollowContainer,
  token: string | null,
) {
  return container.unitOfWorkProvider.run(
    async ({ accounts, imports, jobs, assets, references }) => {
      const account = await requireAccount(container, accounts, token);
      const now = container.clock.now();
      const batches = await imports.listBatches(
        account.id,
        new Date(now.getTime() - 90 * 86400_000),
      );
      const items = [];
      for (const batch of batches) {
        const all = await jobs.listBatch(batch.id);
        const replaced = new Set(all.map((j) => j.retryOf));
        const children = [];
        for (const job of all.filter((j) => !replaced.has(j.id))) {
          const original = await imports.findOriginal(job.originalId);
          children.push({
            id: job.id,
            noteId: job.noteId,
            name: original?.name ?? "原本",
            state: job.state,
            noteState: original?.state ?? "failed",
            failure: job.failure,
            attempt: job.attempt,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            coverage: original?.coverage ?? "no_text",
          });
        }
        const uploads = (await imports.listReservations(batch.id))
          .filter((r) => r.state !== "accepted")
          .map((r) => ({
            id: r.id,
            name: r.name,
            bytes: r.bytes,
            state: r.state,
            failure: r.failure,
          }));
        items.push({
          id: batch.id,
          createdAt: batch.createdAt.toISOString(),
          cancelled: batch.cancelledAt !== null,
          active:
            children.some(
              (j) => j.state === "queued" || j.state === "running",
            ) ||
            uploads.some(
              (u) => u.state === "awaiting" || u.state === "uploading",
            ),
          jobs: children,
          uploads,
        });
      }
      return {
        batches: items,
        usedBytes:
          (await imports.reservedAndUsedBytes(account.id, now)) +
          (await assets.reservedAndUsedBytes(account.id, now)) +
          (await references.usedBytes(account.id)),
        quotaBytes: IMPORT_LIMITS.quotaBytes,
      };
    },
  );
}

export async function originalDownload(
  container: HollowContainer,
  token: string | null,
  id: string,
) {
  const original = await container.unitOfWorkProvider.run(
    async ({ accounts, imports }) => {
      const account = await requireAccount(container, accounts, token);
      const original = await imports.findOriginal(id);
      if (!original || original.accountId !== account.id)
        throw new NotFoundError("ORIGINAL_NOT_FOUND", "原本が見つかりません。");
      return original;
    },
  );
  return {
    name: original.name,
    bytes: original.bytes,
    stream: await importContext(container).storage.stream(original.storageKey),
  };
}
