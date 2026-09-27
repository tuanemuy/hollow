import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { buildExportContentSnapshot } from "../export/snapshot";
import { canScope } from "../workspace/access";

export const zipNotFound = (): never => {
  throw new NotFoundError("ZIP_NOT_FOUND", "このZIPは利用できません。");
};

export async function readZipSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  accountId: string,
  noteId: string,
) {
  const actor = await u.accounts.findById(accountId);
  const note =
    actor?.status === "verified" ? await u.notes.findById(noteId) : null;
  if (
    !note ||
    note.lifecycle.kind !== "active" ||
    !(await canScope(u, note.owner, accountId, "read"))
  )
    return zipNotFound();
  return buildExportContentSnapshot(c, u, note);
}
