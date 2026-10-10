import type {
  AuthContinuation,
  Invitation,
  InvitationReceipt,
} from "@repo/core/domain/workspace/invitation";
import type { InvitationRepository } from "@repo/core/domain/workspace/ports/invitationRepository";
import { and, asc, count, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  authContinuations,
  invitationHistory,
  invitationRates,
  invitationReceipts,
  invitations,
} from "../invitationSchema";
export class LibsqlInvitationRepository implements InvitationRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    return (
      (
        await this.db.select().from(invitations).where(eq(invitations.id, id))
      )[0] ?? null
    );
  }
  async byToken(hash: string) {
    return (
      (
        await this.db
          .select()
          .from(invitations)
          .where(eq(invitations.tokenHash, hash))
      )[0] ?? null
    );
  }
  async byEmail(workspaceId: string, email: string) {
    return (
      (
        await this.db
          .select()
          .from(invitations)
          .where(
            and(
              eq(invitations.workspaceId, workspaceId),
              eq(invitations.email, email),
            ),
          )
          .limit(1)
      )[0] ?? null
    );
  }
  async list(workspaceId: string, after: string | undefined, limit: number) {
    return this.db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          after ? gt(invitations.id, after) : undefined,
        ),
      )
      .orderBy(asc(invitations.id))
      .limit(limit);
  }
  async save(row: Invitation) {
    await this.db
      .insert(invitations)
      .values(row)
      .onConflictDoUpdate({ target: invitations.id, set: row });
  }
  async archive(row: Invitation, now: Date) {
    await this.db
      .insert(invitationHistory)
      .values({
        id: row.id,
        generation: row.generation,
        workspaceId: row.workspaceId,
        state: row.state === "pending" ? "superseded" : row.state,
        issuedAt: row.issuedAt,
        terminalAt: row.terminalAt ?? now,
      })
      .onConflictDoNothing();
  }
  async receipt(actorId: string, requestId: string) {
    return (
      (
        await this.db
          .select()
          .from(invitationReceipts)
          .where(
            and(
              eq(invitationReceipts.actorId, actorId),
              eq(invitationReceipts.requestId, requestId),
            ),
          )
      )[0] ?? null
    );
  }
  async saveReceipt(row: InvitationReceipt) {
    await this.db
      .insert(invitationReceipts)
      .values(row)
      .onConflictDoUpdate({
        target: [invitationReceipts.actorId, invitationReceipts.requestId],
        set: row,
      });
  }
  async rate(workspaceId: string, actorId: string, now: Date) {
    const workspace =
      (
        await this.db
          .select({ n: count() })
          .from(invitationRates)
          .where(
            and(
              eq(invitationRates.workspaceId, workspaceId),
              gt(
                invitationRates.createdAt,
                new Date(now.getTime() - 86400_000),
              ),
            ),
          )
      )[0]?.n ?? 0;
    const actor =
      (
        await this.db
          .select({ n: count() })
          .from(invitationRates)
          .where(
            and(
              eq(invitationRates.actorId, actorId),
              gt(invitationRates.createdAt, new Date(now.getTime() - 3600_000)),
            ),
          )
      )[0]?.n ?? 0;
    return { workspace, actor };
  }
  async countSend(id: string, workspaceId: string, actorId: string, now: Date) {
    await this.db
      .insert(invitationRates)
      .values({ id, workspaceId, actorId, createdAt: now });
  }
  async continuation(id: string) {
    return (
      (
        await this.db
          .select()
          .from(authContinuations)
          .where(eq(authContinuations.id, id))
      )[0] ?? null
    );
  }
  async saveContinuation(row: AuthContinuation) {
    await this.db.insert(authContinuations).values(row);
  }
  async invalidateIssuer(workspaceId: string, actorId: string, now: Date) {
    await this.db.run(
      sql`INSERT OR IGNORE INTO invitation_history(id,generation,workspace_id,state,issued_at,terminal_at) SELECT id,generation,workspace_id,'issuer_lost',issued_at,${now.getTime()} FROM workspace_invitations WHERE workspace_id=${workspaceId} AND issuer_id=${actorId} AND state='pending'`,
    );
    await this.db
      .update(invitations)
      .set({
        state: "issuer_lost",
        terminalAt: now,
        tokenHash: null,
        envelope: null,
        deliverySnapshot: null,
        deliveryState: "stopped",
        leaseToken: null,
        leaseUntil: null,
        deliveryFailure: null,
      })
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          eq(invitations.issuerId, actorId),
          eq(invitations.state, "pending"),
        ),
      );
  }
  async claim(now: Date, token: string, until: Date) {
    const eligible = and(
      eq(invitations.state, "pending"),
      sql`exists(select 1 from accounts issuer join workspace_members m on m.account_id=issuer.id join workspaces w on w.id=m.workspace_id where issuer.id=${invitations.issuerId} and issuer.state='active' and m.workspace_id=${invitations.workspaceId} and m.role='owner' and w.state='active')`,
      gt(invitations.expiresAt, now),
      lte(invitations.nextAttemptAt, now),
      or(
        inArray(invitations.deliveryState, ["pending", "configuration"]),
        and(
          eq(invitations.deliveryState, "running"),
          lte(invitations.leaseUntil, now),
        ),
      ),
    );
    const candidate = this.db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eligible)
      .orderBy(asc(invitations.nextAttemptAt), asc(invitations.id))
      .limit(1);
    return (
      (
        await this.db
          .update(invitations)
          .set({
            deliveryState: "running",
            leaseToken: token,
            leaseUntil: until,
          })
          .where(and(inArray(invitations.id, candidate), eligible))
          .returning()
      )[0] ?? null
    );
  }
  async expireAndPrune(now: Date, limit: number) {
    const expired = this.db
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(eq(invitations.state, "pending"), lte(invitations.expiresAt, now)),
      )
      .orderBy(asc(invitations.expiresAt))
      .limit(limit);
    await this.db
      .update(invitations)
      .set({
        state: "expired",
        terminalAt: now,
        tokenHash: null,
        envelope: null,
        deliverySnapshot: null,
        deliveryState: "stopped",
        leaseToken: null,
        leaseUntil: null,
        deliveryFailure: null,
      })
      .where(inArray(invitations.id, expired));
    await this.db.run(
      sql`DELETE FROM auth_continuations WHERE id IN (SELECT id FROM auth_continuations WHERE expires_at<=${now.getTime()} LIMIT ${limit})`,
    );
    await this.db.run(
      sql`DELETE FROM invitation_receipts WHERE rowid IN (SELECT rowid FROM invitation_receipts WHERE expires_at<=${now.getTime()} LIMIT ${limit})`,
    );
    await this.db.run(
      sql`DELETE FROM invitation_rates WHERE id IN (SELECT id FROM invitation_rates WHERE created_at<=${now.getTime() - 86400_000} LIMIT ${limit})`,
    );
    await this.db.run(
      sql`DELETE FROM invitation_history WHERE rowid IN (SELECT rowid FROM invitation_history WHERE terminal_at<=${now.getTime() - 90 * 86400_000} LIMIT ${limit})`,
    );
    await this.db.run(
      sql`DELETE FROM workspace_invitations WHERE id IN (SELECT id FROM workspace_invitations WHERE terminal_at<=${now.getTime() - 90 * 86400_000} AND state!='pending' LIMIT ${limit})`,
    );
  }
}
