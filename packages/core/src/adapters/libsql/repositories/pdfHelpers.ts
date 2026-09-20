import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  PdfArtifact,
  PdfComputation,
  PdfDelivery,
  PdfRequest,
} from "@repo/core/domain/pdf/entity";
import { sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  type pdfArtifacts,
  type pdfComputations,
  type pdfDeliveries,
  pdfRequests,
} from "../pdfSchema";

export const pdfUnavailable = () =>
  new BusinessRuleError(
    "PDF_UNAVAILABLE",
    "PDFを続けられません。現在のノートからやり直してください。",
  );
const corrupt = () =>
  new SystemError(
    SystemErrorCode.DataIntegrityError,
    "PDFの所有記録が一致しません。",
  );

export const currentPdfDemand = sql`exists(select 1 from notes n join accounts a on a.id=${pdfRequests.accountId} where n.id=${pdfRequests.liveNoteId} and a.verified_at is not null and n.lifecycle='active' and (n.owner_workspace_id is null or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active')) and (n.owner_account_id=a.id or exists(select 1 from workspace_members m where m.workspace_id=n.owner_workspace_id and m.account_id=a.id) or exists(select 1 from note_sharing s join note_public_identities p on p.note_id=s.note_id where s.note_id=n.id and s.visibility='public')))`;

export function requestRow(row: typeof pdfRequests.$inferSelect): PdfRequest {
  if (
    (row.state === "queued" || row.state === "running") &&
    row.artifactId === null &&
    row.failure === null
  )
    return { ...row, state: row.state, artifactId: null, failure: null };
  if (
    row.state === "succeeded" &&
    row.artifactId !== null &&
    row.failure === null
  )
    return {
      ...row,
      state: row.state,
      artifactId: row.artifactId,
      failure: null,
    };
  if (row.state === "failed" && row.artifactId === null && row.failure !== null)
    return { ...row, state: row.state, artifactId: null, failure: row.failure };
  if (
    row.state === "cancelled" &&
    row.artifactId === null &&
    row.failure === null
  )
    return { ...row, state: row.state, artifactId: null, failure: null };
  throw corrupt();
}

export function computeRow(
  row: typeof pdfComputations.$inferSelect,
): PdfComputation {
  if (
    row.state === "queued" &&
    row.liveNoteId &&
    !row.workspaceRemoved &&
    row.leaseToken === null &&
    row.leaseUntil === null
  )
    return {
      ...row,
      state: row.state,
      liveNoteId: row.liveNoteId,
      workspaceRemoved: false,
      leaseToken: null,
      leaseUntil: null,
    };
  if (
    (row.state === "running" || row.state === "stopping") &&
    row.liveNoteId &&
    !row.workspaceRemoved &&
    row.leaseToken &&
    row.leaseUntil
  )
    return {
      ...row,
      state: row.state,
      liveNoteId: row.liveNoteId,
      workspaceRemoved: false,
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
    };
  if (
    row.state === "closed" &&
    row.leaseToken === null &&
    row.leaseUntil === null
  )
    return { ...row, state: row.state, leaseToken: null, leaseUntil: null };
  throw corrupt();
}

export function artifactRow(
  row: typeof pdfArtifacts.$inferSelect,
): PdfArtifact {
  if (
    row.state === "writing" &&
    row.liveNoteId &&
    row.key &&
    row.file === null &&
    row.publishedAt === null &&
    row.expiresAt === null
  )
    return {
      ...row,
      state: row.state,
      liveNoteId: row.liveNoteId,
      key: row.key,
      file: null,
      publishedAt: null,
      expiresAt: null,
    };
  if (
    row.state === "ready" &&
    row.liveNoteId &&
    row.key &&
    row.file &&
    row.publishedAt &&
    row.expiresAt
  )
    return {
      ...row,
      state: row.state,
      liveNoteId: row.liveNoteId,
      key: row.key,
      file: row.file,
      publishedAt: row.publishedAt,
      expiresAt: row.expiresAt,
    };
  if (row.state === "cleanup" && row.liveNoteId && row.key)
    return {
      ...row,
      state: row.state,
      liveNoteId: row.liveNoteId,
      key: row.key,
    };
  if (
    row.state === "removed" &&
    row.key === null &&
    row.file === null &&
    row.reservedBytes === 0
  )
    return { ...row, state: row.state, key: null, file: null };
  throw corrupt();
}

export function deliveryRow(
  row: typeof pdfDeliveries.$inferSelect,
): PdfDelivery {
  if (
    (row.state === "ready" || row.state === "closed") &&
    row.claimToken === null &&
    row.runtimeId === null
  )
    return { ...row, state: row.state, claimToken: null, runtimeId: null };
  if (
    (row.state === "sending" || row.state === "closing") &&
    row.claimToken &&
    row.runtimeId
  )
    return {
      ...row,
      state: row.state,
      claimToken: row.claimToken,
      runtimeId: row.runtimeId,
    };
  throw corrupt();
}

export async function reservePdfBytes(
  db: HollowTransaction,
  bytes: number,
  diskLimit: number,
) {
  if (
    !Number.isSafeInteger(bytes) ||
    bytes < 0 ||
    !Number.isSafeInteger(diskLimit) ||
    diskLimit < 1
  )
    throw pdfUnavailable();
  if (bytes > diskLimit)
    throw new BusinessRuleError(
      "PDF_DISK_CONFIGURATION",
      "必要なPDF作業領域がサービスの設定を超えます。管理者による領域設定の調整が必要です。",
    );
  const [row] = await db.all<{ bytes: number }>(
    sql`select coalesce((select sum(reserved_bytes) from pdf_computations),0)+coalesce((select sum(reserved_bytes) from pdf_artifacts),0) bytes`,
  );
  if (Number(row?.bytes ?? 0) + bytes > diskLimit)
    throw new BusinessRuleError(
      "PDF_DISK_BUSY",
      "PDF作業領域を使用中です。保存期限または回収完了後にやり直してください。",
    );
}
