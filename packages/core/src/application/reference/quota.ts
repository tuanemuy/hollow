import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
export async function storageUsage(
  context: HollowUnitOfWorkContext,
  accountId: string,
  now: Date,
) {
  return (
    (await context.imports.reservedAndUsedBytes(accountId, now)) +
    (await context.assets.reservedAndUsedBytes(accountId, now)) +
    (await context.references.usedBytes(accountId))
  );
}
