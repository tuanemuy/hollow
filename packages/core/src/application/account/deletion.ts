import { accountEmail } from "@repo/core/domain/account/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { HollowContainer } from "../di/hollowTypes";
import { cancelDriveBackups } from "../integration/drive/backup/cancellation";
import { requireAccount } from "./session";

export type AccountDeletionAccepted = Readonly<{ status: "accepted" }>;

export async function deleteAccount(
  c: HollowContainer,
  token: string | null,
  input: Readonly<{ email: string }>,
): Promise<AccountDeletionAccepted> {
  await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, token);
    if (accountEmail(input.email) !== actor.email)
      throw new BusinessRuleError(
        "ACCOUNT_DELETION_EMAIL",
        "現在のメールアドレスを正確に入力してください。",
      );
    const now = c.clock.now();
    let zipCursor: string | null = null;
    while (true) {
      const active = await u.zipRequests.activePage(actor.id, zipCursor);
      if (active.length === 0) break;
      for (const request of active)
        await u.zipRequests.cancel(request.id, actor.id, now);
      zipCursor = active.at(-1)?.id ?? null;
    }
    await cancelDriveBackups(
      c,
      u,
      { kind: "account", accountId: actor.id },
      now,
    );
    const connection = await u.openRouterConnections.find(actor.id);
    if (connection) {
      await u.llmConversions.cancelAccount(actor.id, connection.epoch, now);
      await u.llmPdfPreviews.cancelAccount(actor.id, connection.epoch, now);
    }
    await u.accountDeletions.accept({
      id: c.idGenerator.next(),
      accountId: actor.id,
      expectedAuthVersion: actor.authVersion,
      now,
    });
    u.afterCommit(() => {
      c.purging?.wake();
      return undefined;
    });
  });
  return { status: "accepted" };
}
