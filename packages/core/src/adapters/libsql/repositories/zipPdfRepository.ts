import type { ZipPdfDemand } from "@repo/core/application/pdf/demandPorts";
import type {
  ZipPdfAttach,
  ZipPdfCopyClaim,
  ZipPdfProgress,
  ZipPdfRepository,
} from "@repo/core/application/zip/pdfPorts";
import { and, asc, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { pdfArtifacts, pdfComputations } from "../pdfSchema";
import { zipPdfHolds } from "../zipPdfSchema";
import { zipAttempts, zipRequests, zipTargets } from "../zipSchema";
import { LibsqlPdfComputationRepository } from "./pdfComputationRepository";
import { currentAnyPdfDemand } from "./pdfDemandRepository";
import { artifactRow } from "./pdfHelpers";
import { currentZipRead, ownerAbsent, zipCorrupt } from "./zipHelpers";
import {
  currentZipPdfAttempt,
  zipPdfDemandRow,
  zipPdfHoldRow,
} from "./zipPdfHelpers";

const clearedBinding = {
  pdfComputeId: null,
  pdfSourceIdentity: null,
  pdfProfile: null,
  pdfExternalIdentity: null,
  pdfDeadlineAt: null,
  pdfPhase: null,
};

export class LibsqlZipPdfRepository implements ZipPdfRepository {
  constructor(private readonly db: HollowTransaction) {}

  async attach(input: ZipPdfAttach, now: Date): Promise<boolean> {
    const { binding: p } = input;
    const rows = await this.db
      .update(zipAttempts)
      .set({
        pdfComputeId: p.computeId,
        pdfSourceIdentity: p.identity.value,
        pdfProfile: p.profile,
        pdfExternalIdentity: p.externalIdentity,
        pdfDeadlineAt: p.deadlineAt,
        pdfPhase: "waiting-pdf",
        version: sql`${zipAttempts.version}+1`,
      })
      .where(
        and(
          eq(zipAttempts.id, input.attemptId),
          eq(zipAttempts.version, input.attemptVersion),
          eq(zipAttempts.state, "running"),
          sql`${zipAttempts.pdfComputeId} is null and ${p.deadlineAt.getTime()}>${now.getTime()} and exists(select 1 from zip_runs r join zip_requests q on q.id=r.request_id join zip_targets t on t.request_id=r.request_id and t.ordinal=${zipAttempts.ordinal} where r.request_id=${zipAttempts.requestId} and r.generation=${zipAttempts.generation} and r.lease_token=${input.leaseToken} and r.lease_until>${now.getTime()} and r.deadline_at>${now.getTime()} and r.state='running' and q.state='active' and q.generation=r.generation and q.cancel_generation<r.generation and not exists(select 1 from json_each(r.exclusions) e where json_extract(e.value,'$.ordinal')=${zipAttempts.ordinal}) and ${currentZipRead(sql`t.live_note_id`, sql`r.account_id`)})`,
        ),
      )
      .returning({ id: zipAttempts.id });
    return rows.length === 1;
  }

  async find(attemptId: string): Promise<ZipPdfProgress | null> {
    const [row] = await this.db
      .select({
        attempt: zipAttempts,
        accountId: zipRequests.accountId,
        noteId: zipTargets.targetNoteId,
      })
      .from(zipAttempts)
      .innerJoin(zipRequests, eq(zipRequests.id, zipAttempts.requestId))
      .innerJoin(
        zipTargets,
        and(
          eq(zipTargets.requestId, zipAttempts.requestId),
          eq(zipTargets.ordinal, zipAttempts.ordinal),
        ),
      )
      .where(
        and(
          eq(zipAttempts.id, attemptId),
          sql`${zipAttempts.pdfComputeId} is not null`,
        ),
      );
    if (!row) return null;
    const [hold] = await this.db
      .select()
      .from(zipPdfHolds)
      .where(eq(zipPdfHolds.attemptId, attemptId));
    return {
      demand: zipPdfDemandRow(row.attempt, row.accountId, row.noteId),
      hold: hold ? zipPdfHoldRow(hold) : null,
    };
  }

  async findDemand(computeId: string, now: Date): Promise<ZipPdfDemand | null> {
    const [row] = await this.db
      .select({ id: zipAttempts.id })
      .from(zipAttempts)
      .where(
        and(
          eq(zipAttempts.pdfComputeId, computeId),
          eq(zipAttempts.pdfPhase, "waiting-pdf"),
          currentZipPdfAttempt(sql`${zipAttempts.id}`, now),
        ),
      )
      .orderBy(asc(zipAttempts.id))
      .limit(1);
    return row ? ((await this.find(row.id))?.demand ?? null) : null;
  }

  async acquireCached(
    attemptId: string,
    version: number,
    artifactId: string,
    now: Date,
  ) {
    const rows = await this.db.all<{ generation: number }>(
      sql`select a.generation from pdf_artifacts a join zip_attempts p on p.pdf_compute_id=a.compute_id where p.id=${attemptId} and p.version=${version} and p.pdf_phase='waiting-pdf' and a.id=${artifactId} and a.state='ready' and a.expires_at>${now.getTime()} and a.cleanup_token is null and a.source_identity=p.pdf_source_identity and a.profile=p.pdf_profile and ${currentZipPdfAttempt(sql`p.id`, now)} and not exists(select 1 from object_deletes d where d.storage_key=a.storage_key) and not exists(select 1 from zip_pdf_holds h where h.attempt_id=p.id)`,
    );
    if (!rows[0]) return false;
    await this.db.insert(zipPdfHolds).values({
      attemptId,
      artifactId,
      artifactGeneration: rows[0].generation,
      acquiredAt: now,
      state: "held",
      claimToken: null,
      runtimeId: null,
      version: 1,
    });
    const updated = await this.db
      .update(zipAttempts)
      .set({ pdfPhase: "copy-ready", version: sql`${zipAttempts.version}+1` })
      .where(
        and(
          eq(zipAttempts.id, attemptId),
          eq(zipAttempts.version, version),
          eq(zipAttempts.pdfPhase, "waiting-pdf"),
        ),
      )
      .returning({ id: zipAttempts.id });
    if (updated.length !== 1) throw zipCorrupt();
    return true;
  }

  async publish(computeId: string, artifactId: string, now: Date) {
    const rows = await this.db
      .select({ id: zipAttempts.id, version: zipAttempts.version })
      .from(zipAttempts)
      .where(
        and(
          eq(zipAttempts.pdfComputeId, computeId),
          eq(zipAttempts.pdfPhase, "waiting-pdf"),
          currentZipPdfAttempt(sql`${zipAttempts.id}`, now),
        ),
      )
      .orderBy(asc(zipAttempts.id))
      .limit(500);
    for (const row of rows)
      if (!(await this.acquireCached(row.id, row.version, artifactId, now)))
        throw zipCorrupt();
    return rows.length;
  }

  async claimCopy(
    attemptId: string,
    version: number,
    claim: { token: string; runtimeId: string },
    now: Date,
  ): Promise<ZipPdfCopyClaim | null> {
    const [hold] = await this.db
      .update(zipPdfHolds)
      .set({
        state: "reading",
        claimToken: claim.token,
        runtimeId: claim.runtimeId,
        version: sql`${zipPdfHolds.version}+1`,
      })
      .where(
        and(
          eq(zipPdfHolds.attemptId, attemptId),
          eq(zipPdfHolds.version, version),
          eq(zipPdfHolds.state, "held"),
          currentZipPdfAttempt(attemptId, now),
          sql`exists(select 1 from pdf_artifacts a where a.id=${zipPdfHolds.artifactId} and a.state in('ready','cleanup') and a.file is not null and a.storage_key is not null and a.generation=${zipPdfHolds.artifactGeneration} and not exists(select 1 from object_deletes d where d.storage_key=a.storage_key) and not exists(select 1 from object_writes w where w.kind='pdf-artifact' and w.owner_id=a.id and w.active=1))`,
        ),
      )
      .returning();
    if (!hold) return null;
    await this.db
      .update(zipAttempts)
      .set({ pdfPhase: "copying", version: sql`${zipAttempts.version}+1` })
      .where(eq(zipAttempts.id, attemptId));
    const progress = await this.find(attemptId);
    const [row] = await this.db
      .select()
      .from(pdfArtifacts)
      .where(eq(pdfArtifacts.id, hold.artifactId));
    const artifact = row ? artifactRow(row) : null;
    if (
      !progress ||
      progress.hold?.state !== "reading" ||
      !artifact ||
      (artifact.state !== "ready" && artifact.state !== "cleanup") ||
      !artifact.file ||
      !artifact.key ||
      !artifact.expiresAt ||
      !artifact.publishedAt
    )
      throw zipCorrupt();
    return {
      demand: progress.demand,
      hold: progress.hold,
      artifact: {
        ...artifact,
        key: artifact.key,
        file: artifact.file,
        expiresAt: artifact.expiresAt,
        publishedAt: artifact.publishedAt,
      },
    };
  }

  async beginClose(attemptId: string, token: string | null, _now: Date) {
    await this.db
      .update(zipPdfHolds)
      .set({ state: "closing", version: sql`${zipPdfHolds.version}+1` })
      .where(
        and(
          eq(zipPdfHolds.attemptId, attemptId),
          sql`${zipPdfHolds.state} in('held','reading') and ${zipPdfHolds.claimToken} is ${token}`,
        ),
      );
  }

  async releaseClosed(attemptId: string, token: string | null, _now: Date) {
    const [hold] = await this.db
      .select()
      .from(zipPdfHolds)
      .where(eq(zipPdfHolds.attemptId, attemptId));
    if (!hold || hold.state !== "closing" || hold.claimToken !== token)
      return false;
    if (
      (
        await this.db.all(
          sql`select 1 from object_writes w where w.active=1 and ((w.kind='zip-source' and w.owner_id=${attemptId}) or (w.kind='zip-spool' and exists(select 1 from zip_spools s where s.id=w.owner_id and s.attempt_id=${attemptId})))`,
        )
      ).length
    )
      return false;
    await this.db
      .update(zipPdfHolds)
      .set({
        state: "released",
        claimToken: null,
        runtimeId: null,
        version: sql`${zipPdfHolds.version}+1`,
      })
      .where(eq(zipPdfHolds.attemptId, attemptId));
    await this.db
      .update(zipAttempts)
      .set({ ...clearedBinding, version: sql`${zipAttempts.version}+1` })
      .where(eq(zipAttempts.id, attemptId));
    return true;
  }

  async detachWaiting(attemptId: string, version: number, now: Date) {
    const [row] = await this.db
      .select()
      .from(zipAttempts)
      .where(
        and(
          eq(zipAttempts.id, attemptId),
          eq(zipAttempts.version, version),
          eq(zipAttempts.pdfPhase, "waiting-pdf"),
        ),
      );
    if (!row?.pdfComputeId) return false;
    if (
      (
        await this.db.all(
          sql`select 1 where ${currentAnyPdfDemand(row.pdfComputeId, now, attemptId)}`,
        )
      ).length === 0
    )
      await new LibsqlPdfComputationRepository(this.db).stop(
        row.pdfComputeId,
        now,
      );
    const [compute] = await this.db
      .select()
      .from(pdfComputations)
      .where(eq(pdfComputations.id, row.pdfComputeId));
    if (
      !compute ||
      compute.state === "stopping" ||
      !(
        await this.db.all(
          sql`select 1 where ${ownerAbsent("zip-source", attemptId)}`,
        )
      ).length
    )
      return false;
    await this.db
      .update(zipAttempts)
      .set({ ...clearedBinding, version: sql`${zipAttempts.version}+1` })
      .where(
        and(eq(zipAttempts.id, attemptId), eq(zipAttempts.version, version)),
      );
    return true;
  }

  async recover(now: Date) {
    const rows = await this.db
      .select()
      .from(zipAttempts)
      .where(sql`${zipAttempts.pdfComputeId} is not null`)
      .orderBy(asc(zipAttempts.id))
      .limit(500);
    for (const row of rows) {
      const progress = await this.find(row.id);
      if (!progress) continue;
      if (progress.hold && progress.hold.state !== "released") {
        await this.beginClose(row.id, progress.hold.claim?.token ?? null, now);
        if (
          !(await this.releaseClosed(
            row.id,
            progress.hold.claim?.token ?? null,
            now,
          ))
        )
          throw zipCorrupt();
      } else if (!(await this.detachWaiting(row.id, row.version, now)))
        throw zipCorrupt();
    }
  }

  async prune(_now: Date) {
    await this.db.run(
      sql`delete from zip_pdf_holds where attempt_id in(select h.attempt_id from zip_pdf_holds h join zip_attempts p on p.id=h.attempt_id where h.state='released' and p.pdf_compute_id is null order by h.attempt_id limit 100)`,
    );
  }
}
