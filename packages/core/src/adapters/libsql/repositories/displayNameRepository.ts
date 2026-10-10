import { NotFoundError } from "@repo/core/application/errors";
import type { DisplayNameRepository } from "@repo/core/domain/account/ports/displayNameRepository";
import { eq } from "drizzle-orm";
import { accounts } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { accountDisplayNames } from "../sharingSchema";

export class LibsqlDisplayNameRepository implements DisplayNameRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(accountId: string) {
    const [row] = await this.db
      .select({
        id: accounts.id,
        displayName: accountDisplayNames.displayName,
        version: accountDisplayNames.version,
      })
      .from(accounts)
      .leftJoin(
        accountDisplayNames,
        eq(accounts.id, accountDisplayNames.accountId),
      )
      .where(eq(accounts.id, accountId));
    if (!row)
      throw new NotFoundError(
        "ACCOUNT_NOT_FOUND",
        "アカウントが見つかりません。",
      );
    return {
      accountId: row.id,
      displayName: row.displayName,
      version: row.version ?? 0,
    };
  }
  async save(accountId: string, expectedVersion: number, name: string | null) {
    if ((await this.find(accountId)).version !== expectedVersion) return false;
    const rows = await this.db
      .insert(accountDisplayNames)
      .values({ accountId, displayName: name, version: 1 })
      .onConflictDoUpdate({
        target: accountDisplayNames.accountId,
        set: { displayName: name, version: expectedVersion + 1 },
        setWhere: eq(accountDisplayNames.version, expectedVersion),
      })
      .returning({ version: accountDisplayNames.version });
    return rows.length === 1;
  }
  async author(accountId: string | null) {
    if (!accountId) return { kind: "unknown" as const };
    const [row] = await this.db
      .select({
        id: accounts.id,
        state: accounts.state,
        displayName: accountDisplayNames.displayName,
      })
      .from(accounts)
      .leftJoin(
        accountDisplayNames,
        eq(accounts.id, accountDisplayNames.accountId),
      )
      .where(eq(accounts.id, accountId));
    if (!row) return { kind: "deleted" as const };
    if (row.state === "deleted") return { kind: "deleted" as const };
    return row.displayName
      ? { kind: "named" as const, displayName: row.displayName }
      : { kind: "unset" as const };
  }
}
