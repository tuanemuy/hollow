import { IMPORT_LIMITS } from "@repo/core/domain/import/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import { requirePersonalNote } from "../note/getNote";
import { importContext } from "./context";

export async function listImports(
  container: HollowContainer,
  token: string | null,
) {
  return container.unitOfWorkProvider.run(
    async ({ accounts, imports, jobs, assets, references, notes }) => {
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
          const target = await notes.findById(job.noteId);
          children.push({
            id: job.id,
            targetAvailable:
              target?.lifecycle.kind === "active" &&
              target.owner.kind === "personal" &&
              target.owner.accountId === account.id,
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

export async function requireOriginal(
  container: HollowContainer,
  token: string | null,
  id: string,
) {
  return container.unitOfWorkProvider.run(
    async ({ accounts, imports, notes }) => {
      const account = await requireAccount(container, accounts, token);
      const original = await imports.findOriginal(id);
      if (!original || original.accountId !== account.id)
        throw new NotFoundError("ORIGINAL_NOT_FOUND", "原本が見つかりません。");
      requirePersonalNote(await notes.findById(original.noteId), account.id);
      return original;
    },
  );
}
export async function originalDownload(
  container: HollowContainer,
  token: string | null,
  id: string,
) {
  const original = await requireOriginal(container, token, id);
  return {
    name: original.name,
    bytes: original.bytes,
    stream: await importContext(container).storage.stream(original.storageKey),
  };
}
