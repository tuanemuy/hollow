import type { CredentialUseBinding } from "@repo/core/domain/account/deletion";
import type { getDatabase } from "../client";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";

export async function seedCredentialRetention(
  db: ReturnType<typeof getDatabase>,
  binding: CredentialUseBinding,
  state: "acknowledged" | "unacknowledged" | "unknown" = "acknowledged",
) {
  const target = {
    id: `retention-${binding.provider}-${binding.source.id}`,
    binding,
    owner: {
      runtimeId: "recorded-retention-runtime",
      token: `retention-owner-${binding.source.id}`,
      generation: 1,
    },
  };
  await new LibsqlHollowUnitOfWorkProvider(db).run(async (u) => {
    await u.accountDeletions.beginCredentialUse(target);
    if (state === "unknown") {
      if (!(await u.accountDeletions.markCredentialUnknown(target, 1)))
        throw Error("RETENTION_UNKNOWN");
      return;
    }
    const evidenceId = `recorded-close-${binding.source.id}`;
    if (
      !(await u.accountDeletions.saveCredentialClosure(target, evidenceId, 1))
    )
      throw Error("RETENTION_CLOSE");
    if (
      state === "acknowledged" &&
      !(await u.accountDeletions.acknowledgeCredentialUse(
        target,
        evidenceId,
        2,
      ))
    )
      throw Error("RETENTION_ACK");
  });
}
