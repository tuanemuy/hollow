import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  PdfAnonymousAuthority,
  PdfAnonymousDelivery,
  PdfAnonymousRequest,
} from "@repo/core/domain/pdf/anonymous";
import { sql } from "drizzle-orm";
import {
  type pdfAnonymousDeliveries,
  pdfAnonymousRequests,
} from "../pdfAnonymousSchema";

const corrupt = () =>
  new SystemError(
    SystemErrorCode.DataIntegrityError,
    "PDFの共有要求を確認できませんでした。",
  );

export function currentPdfAnonymousAuthority(now: Date) {
  const r = pdfAnonymousRequests;
  return sql`exists(select 1 from notes n join note_sharing s on s.note_id=n.id where n.id=${r.liveNoteId} and n.lifecycle='active' and (n.owner_workspace_id is null or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active')) and ((${r.authorityKind}='public' and s.visibility='public' and exists(select 1 from note_public_identities p where p.note_id=n.id and p.public_id=${r.publicId} and p.url_generation=${r.urlGeneration} and p.access_epoch=${r.accessEpoch})) or (${r.authorityKind}='link' and s.visibility!='private' and s.token_hash=${r.tokenHash} and s.link_generation=${r.linkGeneration} and s.grant_epoch=${r.grantEpoch} and ((${r.grantExpiresAt} is null and s.password_hash is null) or (${r.grantExpiresAt}>${now.getTime()} and s.password_hash is not null and exists(select 1 from share_grants g where g.note_id=n.id and g.browser_hash=${r.browserHash} and g.link_generation=${r.linkGeneration} and g.grant_epoch=${r.grantEpoch} and g.expires_at>${now.getTime()}))))))`;
}

export function currentPdfAnonymousDemand(now: Date) {
  return sql`${pdfAnonymousRequests.ticketExpiresAt}>${now.getTime()} and ${currentPdfAnonymousAuthority(now)}`;
}

export function anonymousRequestRow(
  row: typeof pdfAnonymousRequests.$inferSelect,
): PdfAnonymousRequest {
  let authority: PdfAnonymousAuthority;
  if (
    row.authorityKind === "public" &&
    row.publicId !== null &&
    row.urlGeneration !== null &&
    row.accessEpoch !== null
  ) {
    authority = {
      kind: "public",
      publicId: row.publicId,
      urlGeneration: row.urlGeneration,
      accessEpoch: row.accessEpoch,
    };
  } else if (
    row.authorityKind === "link" &&
    row.tokenHash !== null &&
    row.linkGeneration !== null &&
    row.grantEpoch !== null
  ) {
    const proof =
      row.grantVerifiedAt !== null && row.grantExpiresAt !== null
        ? {
            kind: "grant" as const,
            verifiedAt: row.grantVerifiedAt,
            expiresAt: row.grantExpiresAt,
          }
        : row.grantVerifiedAt === null && row.grantExpiresAt === null
          ? { kind: "none" as const }
          : null;
    if (!proof) throw corrupt();
    authority = {
      kind: "link",
      tokenHash: row.tokenHash,
      linkGeneration: row.linkGeneration,
      grantEpoch: row.grantEpoch,
      proof,
    };
  } else throw corrupt();
  const common = {
    id: row.id,
    browserHash: row.browserHash,
    commandId: row.commandId,
    inputDigest: row.inputDigest,
    targetNoteId: row.targetNoteId,
    liveNoteId: row.liveNoteId,
    sourceIdentity: row.sourceIdentity,
    profile: row.profile,
    computeId: row.computeId,
    authority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ticketExpiresAt: row.ticketExpiresAt,
    ticketGeneration: row.ticketGeneration,
    ticketKid: row.ticketKid,
    autoDeliveryId: row.autoDeliveryId,
    version: row.version,
  };
  if (
    (row.state === "queued" || row.state === "running") &&
    row.liveNoteId &&
    row.computeId &&
    row.artifactId === null &&
    row.failure === null
  )
    return {
      ...common,
      state: row.state,
      liveNoteId: row.liveNoteId,
      computeId: row.computeId,
      artifactId: null,
      failure: null,
    };
  if (
    row.state === "succeeded" &&
    row.artifactId !== null &&
    row.failure === null
  )
    return {
      ...common,
      state: row.state,
      artifactId: row.artifactId,
      failure: null,
    };
  if (row.state === "failed" && row.artifactId === null && row.failure !== null)
    return {
      ...common,
      state: row.state,
      artifactId: null,
      failure: row.failure,
    };
  if (
    (row.state === "invalidated" || row.state === "expired") &&
    row.failure === null
  )
    return {
      ...common,
      state: row.state,
      artifactId: row.artifactId,
      failure: null,
    };
  throw corrupt();
}

export function anonymousRequestValues(
  request: PdfAnonymousRequest,
): typeof pdfAnonymousRequests.$inferInsert {
  const { authority, ...common } = request;
  return {
    ...common,
    authorityKind: authority.kind,
    publicId: authority.kind === "public" ? authority.publicId : null,
    urlGeneration: authority.kind === "public" ? authority.urlGeneration : null,
    accessEpoch: authority.kind === "public" ? authority.accessEpoch : null,
    tokenHash: authority.kind === "link" ? authority.tokenHash : null,
    linkGeneration: authority.kind === "link" ? authority.linkGeneration : null,
    grantEpoch: authority.kind === "link" ? authority.grantEpoch : null,
    grantVerifiedAt:
      authority.kind === "link" && authority.proof.kind === "grant"
        ? authority.proof.verifiedAt
        : null,
    grantExpiresAt:
      authority.kind === "link" && authority.proof.kind === "grant"
        ? authority.proof.expiresAt
        : null,
  };
}

export function anonymousDeliveryRow(
  row: typeof pdfAnonymousDeliveries.$inferSelect,
): PdfAnonymousDelivery {
  if (
    (row.state === "ready" || row.state === "closed") &&
    row.claimToken === null &&
    row.runtimeId === null
  )
    return { ...row, state: row.state, claimToken: null, runtimeId: null };
  if (
    (row.state === "sending" || row.state === "closing") &&
    row.claimToken !== null &&
    row.runtimeId !== null
  )
    return {
      ...row,
      state: row.state,
      claimToken: row.claimToken,
      runtimeId: row.runtimeId,
    };
  throw corrupt();
}
