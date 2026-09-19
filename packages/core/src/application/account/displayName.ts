import { displayName } from "@repo/core/domain/sharing/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import { requireAccount } from "./session";

export async function getDisplayName(
  c: HollowContainer,
  session: string | null,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    return u.displayNames.find(actor.id);
  });
}
export async function setDisplayName(
  c: HollowContainer,
  session: string | null,
  input: Readonly<{ value: string; expectedVersion: number }>,
) {
  const name = displayName(input.value);
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    if (!(await u.displayNames.save(actor.id, input.expectedVersion, name)))
      throw new ConflictError(
        "DISPLAY_NAME_CONFLICT",
        "表示名が変更されました。現在の設定を確認してください。",
      );
    return u.displayNames.find(actor.id);
  });
}
