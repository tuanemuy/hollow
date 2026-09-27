import type { PdfArtifactRepository } from "@repo/core/application/pdf/ports";
import {
  PDF_ARTIFACT_LIFETIME_MS,
  type PdfArtifact,
  type PdfFile,
} from "@repo/core/domain/pdf/entity";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { pdfArtifacts } from "../pdfSchema";
import { currentAnyPdfDemand } from "./pdfDemandRepository";
import { artifactRow, pdfUnavailable, reservePdfBytes } from "./pdfHelpers";

export class LibsqlPdfArtifactRepository implements PdfArtifactRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(pdfArtifacts)
      .where(eq(pdfArtifacts.id, id));
    return row ? artifactRow(row) : null;
  }
  async cached(noteId: string, identity: string, profile: string, now: Date) {
    const [row] = await this.db
      .select()
      .from(pdfArtifacts)
      .where(
        and(
          eq(pdfArtifacts.liveNoteId, noteId),
          eq(pdfArtifacts.sourceIdentity, identity),
          eq(pdfArtifacts.profile, profile),
          eq(pdfArtifacts.state, "ready"),
          gt(pdfArtifacts.expiresAt, now),
        ),
      )
      .orderBy(desc(pdfArtifacts.publishedAt), desc(pdfArtifacts.id))
      .limit(1);
    return row ? artifactRow(row) : null;
  }
  async begin(artifact: PdfArtifact, diskLimit: number) {
    if (artifact.state !== "writing") throw pdfUnavailable();
    const live = await this.db.all(
      sql`select 1 from pdf_computations c where c.id=${artifact.computeId} and c.live_note_id=${artifact.liveNoteId} and c.source_identity=${artifact.sourceIdentity} and c.profile=${artifact.profile} and c.state='running' and c.workspace_removed=0`,
    );
    if (!live.length) throw pdfUnavailable();
    await reservePdfBytes(this.db, artifact.reservedBytes, diskLimit);
    await this.db.insert(pdfArtifacts).values(artifact);
  }
  async publish(
    id: string,
    generation: number,
    computeToken: string,
    file: PdfFile,
    now: Date,
  ) {
    if (
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 1 ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      !file.filename.endsWith(".pdf")
    )
      throw pdfUnavailable();
    return (
      (
        await this.db
          .update(pdfArtifacts)
          .set({
            state: "ready",
            file,
            publishedAt: now,
            expiresAt: new Date(now.getTime() + PDF_ARTIFACT_LIFETIME_MS),
            reservedBytes: file.bytes,
          })
          .where(
            and(
              eq(pdfArtifacts.id, id),
              eq(pdfArtifacts.state, "writing"),
              eq(pdfArtifacts.generation, generation),
              sql`${pdfArtifacts.reservedBytes}>=${file.bytes}`,
              sql`exists(select 1 from pdf_computations c where c.id=${pdfArtifacts.computeId} and c.state='running' and c.lease_token=${computeToken} and c.lease_until>${now.getTime()} and c.deadline_at>${now.getTime()} and c.source_identity=${pdfArtifacts.sourceIdentity})`,
              currentAnyPdfDemand(sql`${pdfArtifacts.computeId}`, now),
            ),
          )
          .returning({ id: pdfArtifacts.id })
      ).length === 1
    );
  }
  async retire(id: string, now: Date) {
    await this.db
      .update(pdfArtifacts)
      .set({ state: "cleanup", nextCleanupAt: now })
      .where(
        and(
          eq(pdfArtifacts.id, id),
          sql`${pdfArtifacts.state} in('writing','ready')`,
        ),
      );
  }
  async claimCleanup(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(pdfArtifacts)
      .where(
        and(
          sql`${pdfArtifacts.state}!='removed'`,
          sql`not exists(select 1 from zip_pdf_holds h where h.artifact_id=${pdfArtifacts.id} and h.state!='released')`,
          sql`(${pdfArtifacts.state}='cleanup' or (${pdfArtifacts.state}='writing' and exists(select 1 from pdf_computations c where c.id=${pdfArtifacts.computeId} and c.state='closed')) or ${pdfArtifacts.expiresAt}<=${now.getTime()} or exists(select 1 from notes n where n.id=${pdfArtifacts.liveNoteId} and (n.lifecycle='purging' or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='deleted'))))`,
          sql`${pdfArtifacts.nextCleanupAt}<=${now.getTime()} and (${pdfArtifacts.cleanupUntil} is null or ${pdfArtifacts.cleanupUntil}<=${now.getTime()})`,
          sql`not exists(select 1 from pdf_deliveries d where d.artifact_id=${pdfArtifacts.id} and d.state!='closed')`,
          sql`not exists(select 1 from pdf_anonymous_deliveries d where d.artifact_id=${pdfArtifacts.id} and d.state!='closed')`,
          sql`not exists(select 1 from object_writes w where w.kind='pdf-artifact' and w.owner_id=${pdfArtifacts.id} and w.active=1)`,
        ),
      )
      .orderBy(asc(pdfArtifacts.nextCleanupAt), asc(pdfArtifacts.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(pdfArtifacts)
      .set({
        state: "cleanup",
        generation: sql`${pdfArtifacts.generation}+1`,
        cleanupToken: token,
        cleanupUntil: until,
      })
      .where(eq(pdfArtifacts.id, row.id))
      .returning();
    return claimed ? artifactRow(claimed) : null;
  }
  async cleaned(id: string, token: string, deleteToken: string) {
    return (
      (
        await this.db
          .update(pdfArtifacts)
          .set({
            state: "removed",
            key: null,
            file: null,
            reservedBytes: 0,
            cleanupToken: null,
            cleanupUntil: null,
          })
          .where(
            and(
              eq(pdfArtifacts.id, id),
              eq(pdfArtifacts.state, "cleanup"),
              sql`not exists(select 1 from zip_pdf_holds h where h.artifact_id=${pdfArtifacts.id} and h.state!='released')`,
              eq(pdfArtifacts.cleanupToken, token),
              sql`exists(select 1 from object_deletes d where d.storage_key=${pdfArtifacts.key} and d.token=${deleteToken} and d.done=1)`,
              sql`not exists(select 1 from pdf_deliveries d where d.artifact_id=${pdfArtifacts.id} and d.state!='closed')`,
              sql`not exists(select 1 from pdf_anonymous_deliveries d where d.artifact_id=${pdfArtifacts.id} and d.state!='closed')`,
              sql`not exists(select 1 from object_writes w where w.kind='pdf-artifact' and w.owner_id=${pdfArtifacts.id} and w.active=1)`,
            ),
          )
          .returning({ id: pdfArtifacts.id })
      ).length === 1
    );
  }
  async deferCleanup(id: string, token: string, now: Date) {
    await this.db
      .update(pdfArtifacts)
      .set({
        nextCleanupAt: new Date(now.getTime() + 5000),
        cleanupToken: null,
        cleanupUntil: null,
      })
      .where(
        and(eq(pdfArtifacts.id, id), eq(pdfArtifacts.cleanupToken, token)),
      );
  }
}
