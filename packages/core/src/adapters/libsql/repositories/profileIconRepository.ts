import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { ProfileIconRepository } from "@repo/core/domain/account/ports/profileIconRepository";
import type { ProfileIcon } from "@repo/core/domain/account/profile";
import type { IconOutput } from "@repo/core/domain/workspace/icon";
import { and, eq, lte, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { profileIcons, publicProfiles } from "../publicationSchema";

function icon(row: typeof profileIcons.$inferSelect): ProfileIcon {
  const output =
    row.sha256 && row.width && row.height
      ? {
          bytes: row.bytes,
          sha256: row.sha256,
          width: row.width,
          height: row.height,
        }
      : null;
  if (row.state === "ready" || row.state === "writing") {
    if (!output)
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "アイコンの保存記録を確認できません。",
      );
    return { ...row, state: row.state, output };
  }
  return { ...row, state: row.state, output };
}

export class LibsqlProfileIconRepository implements ProfileIconRepository {
  constructor(private readonly db: HollowTransaction) {}
  async create(row: ProfileIcon) {
    await this.db.insert(profileIcons).values({
      ...row,
      sha256: row.output?.sha256 ?? null,
      width: row.output?.width ?? null,
      height: row.output?.height ?? null,
    });
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(profileIcons)
      .where(eq(profileIcons.id, id));
    return row ? icon(row) : null;
  }
  async processing(id: string, expiresAt: Date) {
    return (
      (
        await this.db
          .update(profileIcons)
          .set({ state: "processing", expiresAt })
          .where(
            and(eq(profileIcons.id, id), eq(profileIcons.state, "awaiting")),
          )
          .returning()
      ).length === 1
    );
  }
  async writing(id: string, output: IconOutput) {
    return (
      (
        await this.db
          .update(profileIcons)
          .set({ state: "writing", ...output })
          .where(
            and(eq(profileIcons.id, id), eq(profileIcons.state, "processing")),
          )
          .returning()
      ).length === 1
    );
  }
  async adopt(
    id: string,
    accountId: string,
    expectedVersion: number,
    now: Date,
  ) {
    const [profile] = await this.db
      .select()
      .from(publicProfiles)
      .where(
        and(
          eq(publicProfiles.accountId, accountId),
          eq(publicProfiles.version, expectedVersion),
        ),
      );
    const current = await this.find(id);
    if (
      !profile ||
      current?.state !== "writing" ||
      current.accountId !== accountId ||
      current.profileVersion !== expectedVersion ||
      current.expiresAt <= now
    )
      return false;
    const session = await this.db.all(
      sql`select 1 from sessions s join accounts a on a.id=s.account_id where s.token_hash=${current.sessionHash} and s.account_id=${accountId} and s.expires_at>${now.getTime()} and a.verified_at is not null`,
    );
    if (session.length !== 1) return false;
    await this.db
      .update(profileIcons)
      .set({ state: "ready" })
      .where(eq(profileIcons.id, id));
    await this.db
      .update(publicProfiles)
      .set({ iconId: id, version: expectedVersion + 1 })
      .where(eq(publicProfiles.accountId, accountId));
    if (profile.iconId) await this.fence(profile.iconId, now);
    return true;
  }
  async fence(id: string, now: Date) {
    await this.db
      .update(profileIcons)
      .set({ state: "cleanup", nextAttemptAt: now })
      .where(
        and(
          eq(profileIcons.id, id),
          sql`not exists(select 1 from account_public_profiles where icon_id=${id})`,
        ),
      );
  }
  async expire(now: Date) {
    await this.db.run(
      sql`update account_profile_icons set state='cleanup',next_attempt_at=${now.getTime()} where id in(select i.id from account_profile_icons i where i.state in ('awaiting','processing','writing') and i.expires_at<=${now.getTime()} and not exists(select 1 from object_writes w where w.kind='profile-icon-upload' and w.owner_id=i.id and w.active=1) order by i.expires_at,i.id limit 20)`,
    );
  }
  async cleanupCandidates(now: Date, limit: number) {
    return (
      await this.db
        .select()
        .from(profileIcons)
        .where(
          and(
            eq(profileIcons.state, "cleanup"),
            lte(profileIcons.nextAttemptAt, now),
            sql`not exists(select 1 from object_writes w where w.kind='profile-icon-upload' and w.owner_id=${profileIcons.id} and w.active=1)`,
          ),
        )
        .orderBy(profileIcons.nextAttemptAt, profileIcons.id)
        .limit(limit)
    ).map(icon);
  }
  async retryCleanup(id: string, next: Date) {
    await this.db
      .update(profileIcons)
      .set({ nextAttemptAt: next, failure: "PROFILE_ICON_CLEANUP_RETRY" })
      .where(and(eq(profileIcons.id, id), eq(profileIcons.state, "cleanup")));
  }
  async finishCleanup(id: string, token: string) {
    return (
      (
        await this.db
          .delete(profileIcons)
          .where(
            and(
              eq(profileIcons.id, id),
              eq(profileIcons.state, "cleanup"),
              sql`exists(select 1 from object_deletes d where d.storage_key=${profileIcons.storageKey} and d.token=${token} and d.done=1)`,
              sql`not exists(select 1 from object_writes w where w.kind='profile-icon-upload' and w.owner_id=${profileIcons.id} and w.active=1)`,
              sql`not exists(select 1 from account_public_profiles where icon_id=${id})`,
            ),
          )
          .returning()
      ).length === 1
    );
  }
}
