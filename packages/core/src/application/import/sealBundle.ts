import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
export async function sealIfComplete(
  context: HollowUnitOfWorkContext,
  batchId: string,
) {
  if (
    (await context.imports.listReservations(batchId)).every(
      (r) => r.state !== "awaiting" && r.state !== "uploading",
    )
  )
    await context.references.sealBundle(batchId);
}
export async function sealUpload(
  container: HollowContainer,
  token: string | null,
  id: string,
) {
  await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const batch = await c.imports.findBatch(id);
    if (batch?.accountId !== account.id)
      throw new NotFoundError("IMPORT_NOT_FOUND", "取り込みが見つかりません。");
    for (const row of await c.imports.listReservations(id))
      if (row.state === "awaiting" || row.state === "uploading")
        await c.imports.updateReservation(
          row.id,
          row.state,
          "failed",
          "アップロードは完了しませんでした。取り込み直してください。",
        );
    await c.references.sealBundle(id);
  });
  container.referencing?.wake();
  return { ok: true };
}
