import type {
  PdfHistoryCursor,
  PdfRequestRepository,
} from "@repo/core/application/pdf/ports";
import type { PdfRequest } from "@repo/core/domain/pdf/entity";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { pdfRequests } from "../pdfSchema";
import { currentPdfDemand, requestRow } from "./pdfHelpers";

export class LibsqlPdfRequestRepository implements PdfRequestRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(pdfRequests)
      .where(eq(pdfRequests.id, id));
    return row ? requestRow(row) : null;
  }
  async findCommand(accountId: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(pdfRequests)
      .where(
        and(
          eq(pdfRequests.accountId, accountId),
          eq(pdfRequests.commandId, commandId),
        ),
      );
    return row ? requestRow(row) : null;
  }
  async insert(request: PdfRequest) {
    await this.db.insert(pdfRequests).values(request);
  }
  async list(accountId: string, before: PdfHistoryCursor | null, now: Date) {
    return (
      await this.db
        .select()
        .from(pdfRequests)
        .where(
          and(
            eq(pdfRequests.accountId, accountId),
            gt(pdfRequests.historyExpiresAt, now),
            before
              ? sql`(${pdfRequests.createdAt},${pdfRequests.id})<(${before.createdAt.getTime()},${before.id})`
              : undefined,
          ),
        )
        .orderBy(desc(pdfRequests.createdAt), desc(pdfRequests.id))
        .limit(50)
    ).map(requestRow);
  }
  async demand(computeId: string, now: Date) {
    return (
      await this.db
        .select()
        .from(pdfRequests)
        .where(
          and(
            eq(pdfRequests.computeId, computeId),
            sql`${pdfRequests.state} in('queued','running')`,
            gt(pdfRequests.historyExpiresAt, now),
            currentPdfDemand,
          ),
        )
        .orderBy(asc(pdfRequests.id))
        .limit(50)
    ).map(requestRow);
  }
  async summary(accountId: string, now: Date) {
    const where = and(
      eq(pdfRequests.accountId, accountId),
      gt(pdfRequests.historyExpiresAt, now),
      sql`${pdfRequests.state} in('queued','running')`,
    );
    const [count] = await this.db
      .select({ value: sql<number>`count(*)` })
      .from(pdfRequests)
      .where(where);
    const [representative] = await this.db
      .select({ id: pdfRequests.id, title: pdfRequests.title })
      .from(pdfRequests)
      .where(where)
      .orderBy(asc(pdfRequests.createdAt), asc(pdfRequests.id))
      .limit(1);
    return {
      activeCount: Number(count?.value ?? 0),
      representative: representative ?? null,
    };
  }
  async activePage(accountId: string, after: string | null, now: Date) {
    return this.db
      .select({ id: pdfRequests.id, version: pdfRequests.version })
      .from(pdfRequests)
      .where(
        and(
          eq(pdfRequests.accountId, accountId),
          gt(pdfRequests.historyExpiresAt, now),
          sql`${pdfRequests.state} in('queued','running')`,
          after ? gt(pdfRequests.id, after) : undefined,
        ),
      )
      .orderBy(asc(pdfRequests.id))
      .limit(50);
  }
  async watched(accountId: string, ids: readonly string[], now: Date) {
    if (ids.length === 0) return [];
    if (ids.length > 50)
      throw Error("PDF watch page exceeds transport boundary");
    return (
      await this.db
        .select()
        .from(pdfRequests)
        .where(
          and(
            eq(pdfRequests.accountId, accountId),
            inArray(pdfRequests.id, [...ids]),
            gt(pdfRequests.historyExpiresAt, now),
          ),
        )
        .orderBy(asc(pdfRequests.id))
    ).map(requestRow);
  }
  async running(computeId: string, now: Date) {
    await this.db
      .update(pdfRequests)
      .set({
        state: "running",
        updatedAt: now,
        version: sql`${pdfRequests.version}+1`,
      })
      .where(
        and(
          eq(pdfRequests.computeId, computeId),
          eq(pdfRequests.state, "queued"),
          currentPdfDemand,
        ),
      );
  }
  async succeed(computeId: string, artifactId: string, now: Date) {
    const result = await this.db.run(
      sql`update pdf_requests set state='succeeded',artifact_id=${artifactId},updated_at=${now.getTime()},version=version+1 where compute_id=${computeId} and state in('queued','running') and ${currentPdfDemand} and exists(select 1 from pdf_artifacts a where a.id=${artifactId} and a.state='ready' and a.compute_id=${computeId} and a.source_identity=pdf_requests.source_identity and a.expires_at>${now.getTime()})`,
    );
    if (Number(result.rowsAffected) > 0)
      await this.db
        .update(pdfRequests)
        .set({
          state: "cancelled",
          updatedAt: now,
          version: sql`${pdfRequests.version}+1`,
        })
        .where(
          and(
            eq(pdfRequests.computeId, computeId),
            sql`${pdfRequests.state} in('queued','running')`,
          ),
        );
    return Number(result.rowsAffected);
  }
  async fail(computeId: string, failure: string, now: Date) {
    await this.db
      .update(pdfRequests)
      .set({
        state: "failed",
        failure,
        updatedAt: now,
        version: sql`${pdfRequests.version}+1`,
      })
      .where(
        and(
          eq(pdfRequests.computeId, computeId),
          sql`${pdfRequests.state} in('queued','running')`,
        ),
      );
  }
  async cancel(id: string, accountId: string, now: Date) {
    return (
      (
        await this.db
          .update(pdfRequests)
          .set({
            state: "cancelled",
            updatedAt: now,
            version: sql`${pdfRequests.version}+1`,
          })
          .where(
            and(
              eq(pdfRequests.id, id),
              eq(pdfRequests.accountId, accountId),
              sql`${pdfRequests.state} in('queued','running')`,
            ),
          )
          .returning({ id: pdfRequests.id })
      ).length === 1
    );
  }
  async cancelNote(noteId: string, now: Date) {
    await this.db
      .update(pdfRequests)
      .set({
        state: "cancelled",
        updatedAt: now,
        version: sql`${pdfRequests.version}+1`,
      })
      .where(
        and(
          eq(pdfRequests.liveNoteId, noteId),
          sql`${pdfRequests.state} in('queued','running')`,
        ),
      );
  }
  async cancelWorkspaceMember(
    workspaceId: string,
    accountId: string,
    now: Date,
  ) {
    await this.db
      .update(pdfRequests)
      .set({
        state: "cancelled",
        updatedAt: now,
        version: sql`${pdfRequests.version}+1`,
      })
      .where(
        and(
          eq(pdfRequests.accountId, accountId),
          sql`${pdfRequests.state} in('queued','running')`,
          sql`exists(select 1 from notes n where n.id=${pdfRequests.liveNoteId} and n.owner_workspace_id=${workspaceId})`,
        ),
      );
  }
  async prune(now: Date) {
    await this.db.run(
      sql`delete from pdf_deliveries where id in(select id from pdf_deliveries where state='closed' and expires_at<=${now.getTime()} order by expires_at,id limit 100)`,
    );
    await this.db.run(
      sql`update pdf_requests set title='' where id in(select id from pdf_requests where history_expires_at<=${now.getTime()} and title!='' order by history_expires_at,id limit 100)`,
    );
    await this.db.run(
      sql`delete from pdf_requests where id in(select r.id from pdf_requests r where r.history_expires_at<=${now.getTime()} and r.state in('succeeded','failed','cancelled') and not exists(select 1 from pdf_deliveries d where d.request_id=r.id) order by r.history_expires_at,r.id limit 100)`,
    );
    await this.db.run(
      sql`delete from pdf_artifacts where id in(select a.id from pdf_artifacts a where a.state='removed' and not exists(select 1 from pdf_requests r where r.artifact_id=a.id) and not exists(select 1 from pdf_deliveries d where d.artifact_id=a.id) order by a.created_at,a.id limit 100)`,
    );
    await this.db.run(
      sql`delete from pdf_computations where id in(select c.id from pdf_computations c where c.state='closed' and c.workspace_removed=1 and not exists(select 1 from pdf_requests r where r.compute_id=c.id) and not exists(select 1 from pdf_artifacts a where a.compute_id=c.id) order by c.created_at,c.id limit 100)`,
    );
  }
}
