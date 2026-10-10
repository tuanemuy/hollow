import {
  SHARE_RATE_WINDOW_MS,
  type ShareGrant,
  type ShareSettings,
} from "@repo/core/domain/sharing/entity";
import type {
  PasswordReservation,
  SharingRepository,
} from "@repo/core/domain/sharing/ports/sharingRepository";
import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { noteSharing, shareGrants, sharePasswordRates } from "../sharingSchema";

export class LibsqlSharingRepository implements SharingRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(noteId: string) {
    const [row] = await this.db
      .select()
      .from(noteSharing)
      .where(eq(noteSharing.noteId, noteId));
    return row ?? null;
  }
  async findByTokenHash(hash: string) {
    const [row] = await this.db
      .select()
      .from(noteSharing)
      .where(eq(noteSharing.tokenHash, hash));
    return row ?? null;
  }
  async scope(noteId: string) {
    const rows = await this.db.all<{
      ownershipGeneration: number;
      workspaceId: string | null;
      membershipRevision: number;
      name: string;
      memberCount: number;
    }>(sql`
      select n.ownership_generation as ownershipGeneration,n.owner_workspace_id as workspaceId,
      coalesce(w.membership_revision,0) as membershipRevision,coalesce(w.name,'個人のスペース') as name,
      case when n.owner_workspace_id is null then 1 else (select count(*) from workspace_members m where m.workspace_id=w.id) end as memberCount
      from notes n left join workspaces w on w.id=n.owner_workspace_id and w.state='active'
      where n.id=${noteId} and ((n.owner_workspace_id is not null and w.id is not null) or
      (n.owner_account_id is not null and exists(select 1 from accounts a where a.id=n.owner_account_id and a.state='active')))`);
    return rows[0] ?? null;
  }
  async save(settings: ShareSettings, expectedVersion: number) {
    const rows = await this.db
      .update(noteSharing)
      .set(settings)
      .where(
        and(
          eq(noteSharing.noteId, settings.noteId),
          eq(noteSharing.version, expectedVersion),
        ),
      )
      .returning({ id: noteSharing.noteId });
    return rows.length === 1;
  }
  async findGrant(noteId: string, browserHash: string) {
    const [row] = await this.db
      .select()
      .from(shareGrants)
      .where(
        and(
          eq(shareGrants.noteId, noteId),
          eq(shareGrants.browserHash, browserHash),
        ),
      );
    return row ?? null;
  }
  async saveGrant(grant: ShareGrant) {
    await this.db
      .insert(shareGrants)
      .values(grant)
      .onConflictDoUpdate({
        target: [shareGrants.noteId, shareGrants.browserHash],
        set: grant,
      });
  }
  async reservePassword(noteId: string, browserHash: string, now: Date) {
    const where = (kind: "link" | "browser", subject: string) =>
      and(
        eq(sharePasswordRates.noteId, noteId),
        eq(sharePasswordRates.kind, kind),
        eq(sharePasswordRates.subjectHash, subject),
      );
    const [browser] = await this.db
      .select()
      .from(sharePasswordRates)
      .where(where("browser", browserHash));
    if (browser && browser.blockedUntil > now)
      return { kind: "blocked" as const, retryAt: browser.blockedUntil };
    const [link] = await this.db
      .select()
      .from(sharePasswordRates)
      .where(where("link", ""));
    const linkActive =
      link && now.getTime() < link.windowStart.getTime() + SHARE_RATE_WINDOW_MS;
    if (linkActive && link.attempts >= 60)
      return {
        kind: "blocked" as const,
        retryAt: new Date(link.windowStart.getTime() + SHARE_RATE_WINDOW_MS),
      };
    await this.db
      .insert(sharePasswordRates)
      .values({
        noteId,
        kind: "link",
        subjectHash: "",
        windowStart: now,
        attempts: 1,
        blockedUntil: now,
        updatedAt: now,
        revision: 0,
      })
      .onConflictDoUpdate({
        target: [
          sharePasswordRates.noteId,
          sharePasswordRates.kind,
          sharePasswordRates.subjectHash,
        ],
        set: {
          windowStart: linkActive ? link.windowStart : now,
          attempts: linkActive ? link.attempts + 1 : 1,
          updatedAt: now,
        },
      });
    const browserActive =
      browser &&
      now.getTime() < browser.windowStart.getTime() + SHARE_RATE_WINDOW_MS;
    const revision = browserActive
      ? browser.revision
      : (browser?.revision ?? -1) + 1;
    if (!browserActive)
      await this.db
        .insert(sharePasswordRates)
        .values({
          noteId,
          kind: "browser",
          subjectHash: browserHash,
          windowStart: now,
          attempts: 0,
          blockedUntil: now,
          updatedAt: now,
          revision,
        })
        .onConflictDoUpdate({
          target: [
            sharePasswordRates.noteId,
            sharePasswordRates.kind,
            sharePasswordRates.subjectHash,
          ],
          set: {
            windowStart: now,
            attempts: 0,
            blockedUntil: now,
            updatedAt: now,
            revision,
          },
        });
    return {
      kind: "allowed" as const,
      reservation: { noteId, browserHash, browserRevision: revision },
    };
  }
  async finishPassword(
    reservation: PasswordReservation,
    valid: boolean,
    now: Date,
  ) {
    const where = and(
      eq(sharePasswordRates.noteId, reservation.noteId),
      eq(sharePasswordRates.kind, "browser"),
      eq(sharePasswordRates.subjectHash, reservation.browserHash),
      eq(sharePasswordRates.revision, reservation.browserRevision),
    );
    const [row] = await this.db.select().from(sharePasswordRates).where(where);
    if (!row) return;
    if (valid) {
      await this.db
        .update(sharePasswordRates)
        .set({
          attempts: 0,
          windowStart: now,
          blockedUntil: now,
          updatedAt: now,
          revision: row.revision + 1,
        })
        .where(where);
      return;
    }
    const attempts = row.attempts + 1;
    const delay =
      attempts >= 8
        ? SHARE_RATE_WINDOW_MS
        : attempts >= 3
          ? 2 ** (attempts - 3) * 1000
          : 0;
    // Concurrent completions cannot extend an already established block.
    const blockedUntil =
      row.attempts >= 8 ? row.blockedUntil : new Date(now.getTime() + delay);
    await this.db
      .update(sharePasswordRates)
      .set({ attempts, blockedUntil, updatedAt: now })
      .where(where);
  }
  async prune(now: Date) {
    await this.db.run(
      sql`delete from share_grants where rowid in (select rowid from share_grants where expires_at<=${now.getTime()} order by expires_at limit 100)`,
    );
    await this.db.run(
      sql`delete from share_password_rates where rowid in (select rowid from share_password_rates where updated_at<=${now.getTime() - SHARE_RATE_WINDOW_MS} and blocked_until<=${now.getTime()} order by updated_at limit 100)`,
    );
  }
  async rotationCandidates(after: string | undefined, limit: number) {
    return this.db
      .select()
      .from(noteSharing)
      .where(
        and(
          isNotNull(noteSharing.tokenEnvelope),
          gt(noteSharing.noteId, after ?? ""),
        ),
      )
      .orderBy(asc(noteSharing.noteId))
      .limit(Math.min(50, limit));
  }
  async replaceEnvelope(
    noteId: string,
    generation: number,
    previous: string,
    next: string,
  ) {
    const rows = await this.db
      .update(noteSharing)
      .set({ tokenEnvelope: next })
      .where(
        and(
          eq(noteSharing.noteId, noteId),
          eq(noteSharing.linkGeneration, generation),
          eq(noteSharing.tokenEnvelope, previous),
        ),
      )
      .returning({ id: noteSharing.noteId });
    return rows.length === 1;
  }
}
