import type { ZipPdfDemand } from "@repo/core/application/pdf/demandPorts";
import { type ZipPdfHold, zipContentIdentity } from "@repo/core/domain/zip/pdf";
import { type SQL, sql } from "drizzle-orm";
import type { zipPdfHolds } from "../zipPdfSchema";
import type { zipAttempts } from "../zipSchema";
import { attemptRow, currentZipRead, zipCorrupt } from "./zipHelpers";

export function currentZipPdfAttempt(id: SQL | string, now: Date) {
  return sql`exists(select 1 from zip_attempts zp join zip_runs zr on zr.request_id=zp.request_id and zr.generation=zp.generation join zip_requests zq on zq.id=zp.request_id join zip_targets zt on zt.request_id=zp.request_id and zt.ordinal=zp.ordinal where zp.id=${id} and zp.state='running' and zp.pdf_compute_id is not null and zp.pdf_deadline_at>${now.getTime()} and zt.latest_attempt_number=zp.attempt_number and zr.state='running' and zr.lease_until>${now.getTime()} and zr.deadline_at>${now.getTime()} and zq.state='active' and zq.generation=zp.generation and zq.cancel_generation<zp.generation and not exists(select 1 from json_each(zr.exclusions) ze where json_extract(ze.value,'$.ordinal')=zp.ordinal) and ${currentZipRead(sql`zt.live_note_id`, sql`zr.account_id`)})`;
}
export function currentZipPdfDemand(
  computeId: SQL | string,
  now: Date,
  exceptAttempt?: string,
) {
  return sql`exists(select 1 from zip_attempts where pdf_compute_id=${computeId} and pdf_phase='waiting-pdf' and ${exceptAttempt ? sql`id!=${exceptAttempt}` : sql`1=1`} and ${currentZipPdfAttempt(sql`zip_attempts.id`, now)})`;
}
export function zipPdfDemandRow(
  row: typeof zipAttempts.$inferSelect,
  accountId: string,
  noteId: string,
): ZipPdfDemand {
  const attempt = attemptRow(row);
  if (attempt.state !== "running" || !attempt.pdf) throw zipCorrupt();
  return {
    requestId: attempt.requestId,
    generation: attempt.generation,
    attemptId: attempt.id,
    ordinal: attempt.ordinal,
    accountId,
    noteId,
    zipIdentity: zipContentIdentity(attempt.expectedIdentity),
    binding: attempt.pdf,
  };
}
export function zipPdfHoldRow(
  row: typeof zipPdfHolds.$inferSelect,
): ZipPdfHold {
  const { claimToken, runtimeId, state, ...base } = row;
  if (
    (state === "held" || state === "released") &&
    claimToken === null &&
    runtimeId === null
  )
    return { ...base, state, claim: null };
  if (state === "reading" && claimToken && runtimeId)
    return { ...base, state, claim: { token: claimToken, runtimeId } };
  if (state === "closing") {
    if (claimToken && runtimeId)
      return { ...base, state, claim: { token: claimToken, runtimeId } };
    if (claimToken === null && runtimeId === null)
      return { ...base, state, claim: null };
  }
  throw zipCorrupt();
}
