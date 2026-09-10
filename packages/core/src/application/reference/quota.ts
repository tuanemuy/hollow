import type { NoteOwner } from "@repo/core/domain/note/entity";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
export async function storageUsage(
  context: HollowUnitOfWorkContext,
  scope: NoteOwner,
  now: Date,
) {
  return context.capacity.usedBytes(scope, now);
}
