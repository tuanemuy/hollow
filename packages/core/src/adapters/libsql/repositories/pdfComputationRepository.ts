import type { PdfComputationRepository } from "@repo/core/application/pdf/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { PdfComputation } from "@repo/core/domain/pdf/entity";
import { and, asc, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { pdfComputations } from "../pdfSchema";
import { currentAnyPdfDemand } from "./pdfDemandRepository";
import { computeRow, pdfUnavailable, reservePdfBytes } from "./pdfHelpers";

export class LibsqlPdfComputationRepository
  implements PdfComputationRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async unfinished() {
    return (
      await this.db
        .select()
        .from(pdfComputations)
        .where(sql`${pdfComputations.state}!='closed'`)
        .orderBy(asc(pdfComputations.createdAt), asc(pdfComputations.id))
        .limit(20)
    ).map(computeRow);
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(pdfComputations)
      .where(eq(pdfComputations.id, id));
    return row ? computeRow(row) : null;
  }
  async active(noteId: string) {
    const [row] = await this.db
      .select()
      .from(pdfComputations)
      .where(
        and(
          eq(pdfComputations.liveNoteId, noteId),
          sql`${pdfComputations.state}!='closed'`,
        ),
      );
    return row ? computeRow(row) : null;
  }
  async begin(compute: PdfComputation, diskLimit: number) {
    if (compute.state !== "queued" || compute.workspaceRemoved)
      throw pdfUnavailable();
    const [row] = await this.db.all<{ count: number }>(
      sql`select count(*) count from pdf_computations where state!='closed' or workspace_removed=0`,
    );
    if (Number(row?.count ?? 0) > 0)
      throw new BusinessRuleError(
        "PDF_BUSY",
        "ほかのPDFを生成または回収しています。完了後にやり直してください。",
      );
    await reservePdfBytes(this.db, compute.reservedBytes, diskLimit);
    await this.db.insert(pdfComputations).values(compute);
  }
  async claim(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(pdfComputations)
      .where(
        and(
          eq(pdfComputations.state, "queued"),
          sql`${pdfComputations.deadlineAt}>${now.getTime()}`,
          currentAnyPdfDemand(sql`${pdfComputations.id}`, now),
        ),
      )
      .orderBy(asc(pdfComputations.createdAt), asc(pdfComputations.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(pdfComputations)
      .set({
        state: "running",
        leaseToken: token,
        leaseUntil: until,
        generation: sql`${pdfComputations.generation}+1`,
      })
      .where(
        and(
          eq(pdfComputations.id, row.id),
          eq(pdfComputations.state, "queued"),
        ),
      )
      .returning();
    return claimed ? computeRow(claimed) : null;
  }
  async reserve(id: string, token: string, bytes: number, diskLimit: number) {
    const row = await this.find(id);
    if (
      !row ||
      row.state !== "running" ||
      row.leaseToken !== token ||
      !Number.isSafeInteger(bytes) ||
      bytes < row.reservedBytes
    )
      return false;
    await reservePdfBytes(this.db, bytes - row.reservedBytes, diskLimit);
    await this.db
      .update(pdfComputations)
      .set({ reservedBytes: bytes })
      .where(eq(pdfComputations.id, id));
    return true;
  }
  async renew(id: string, token: string, now: Date, until: Date) {
    return (
      (
        await this.db
          .update(pdfComputations)
          .set({ leaseUntil: until })
          .where(
            and(
              eq(pdfComputations.id, id),
              eq(pdfComputations.state, "running"),
              eq(pdfComputations.leaseToken, token),
              sql`${pdfComputations.leaseUntil}>${now.getTime()} and ${pdfComputations.deadlineAt}>${now.getTime()}`,
              currentAnyPdfDemand(sql`${pdfComputations.id}`, now),
            ),
          )
          .returning({ id: pdfComputations.id })
      ).length === 1
    );
  }
  async stop(id: string, now: Date) {
    await this.db
      .update(pdfComputations)
      .set({ state: "stopping", nextCleanupAt: now })
      .where(
        and(eq(pdfComputations.id, id), eq(pdfComputations.state, "running")),
      );
    await this.db
      .update(pdfComputations)
      .set({ state: "closed", nextCleanupAt: now })
      .where(
        and(eq(pdfComputations.id, id), eq(pdfComputations.state, "queued")),
      );
  }
  async closed(id: string, token: string, now: Date) {
    return (
      (
        await this.db
          .update(pdfComputations)
          .set({
            state: "closed",
            leaseToken: null,
            leaseUntil: null,
            nextCleanupAt: now,
          })
          .where(
            and(
              eq(pdfComputations.id, id),
              eq(pdfComputations.leaseToken, token),
              sql`${pdfComputations.state} in('running','stopping')`,
            ),
          )
          .returning({ id: pdfComputations.id })
      ).length === 1
    );
  }
  async recover(now: Date) {
    await this.db.run(
      sql`update pdf_anonymous_requests set state='failed',failure='PDF_INTERRUPTED',updated_at=${now.getTime()},version=version+1 where state in('queued','running') and compute_id in(select id from pdf_computations where state!='closed')`,
    );
    await this.db.run(
      sql`update pdf_requests set state='failed',failure='PDF_INTERRUPTED',updated_at=${now.getTime()},version=version+1 where state in('queued','running') and compute_id in(select id from pdf_computations where state!='closed')`,
    );
    await this.db
      .update(pdfComputations)
      .set({
        state: "closed",
        leaseToken: null,
        leaseUntil: null,
        nextCleanupAt: now,
        cleanupToken: null,
        cleanupUntil: null,
      })
      .where(sql`${pdfComputations.state}!='closed'`);
  }
  async claimCleanup(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(pdfComputations)
      .where(
        and(
          eq(pdfComputations.state, "closed"),
          eq(pdfComputations.workspaceRemoved, false),
          sql`${pdfComputations.nextCleanupAt}<=${now.getTime()} and (${pdfComputations.cleanupUntil} is null or ${pdfComputations.cleanupUntil}<=${now.getTime()})`,
          sql`not exists(select 1 from object_writes w join pdf_artifacts a on a.id=w.owner_id where w.kind='pdf-artifact' and a.compute_id=${pdfComputations.id} and w.active=1)`,
        ),
      )
      .orderBy(asc(pdfComputations.nextCleanupAt), asc(pdfComputations.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(pdfComputations)
      .set({ cleanupToken: token, cleanupUntil: until })
      .where(eq(pdfComputations.id, row.id))
      .returning();
    return claimed ? computeRow(claimed) : null;
  }
  async cleaned(id: string, token: string) {
    return (
      (
        await this.db
          .update(pdfComputations)
          .set({
            workspaceRemoved: true,
            reservedBytes: 0,
            cleanupToken: null,
            cleanupUntil: null,
          })
          .where(
            and(
              eq(pdfComputations.id, id),
              eq(pdfComputations.state, "closed"),
              eq(pdfComputations.cleanupToken, token),
            ),
          )
          .returning({ id: pdfComputations.id })
      ).length === 1
    );
  }
  async deferCleanup(
    id: string,
    token: string,
    actualBytes: number,
    now: Date,
  ) {
    if (!Number.isSafeInteger(actualBytes) || actualBytes < 0)
      throw pdfUnavailable();
    await this.db
      .update(pdfComputations)
      .set({
        reservedBytes: sql`max(${pdfComputations.reservedBytes},${actualBytes})`,
        nextCleanupAt: new Date(now.getTime() + 5000),
        cleanupToken: null,
        cleanupUntil: null,
      })
      .where(
        and(
          eq(pdfComputations.id, id),
          eq(pdfComputations.cleanupToken, token),
        ),
      );
  }
}
