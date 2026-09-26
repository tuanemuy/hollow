import { BusinessRuleError } from "@repo/core/domain/error";
import {
  PDF_ANONYMOUS_TICKET_LIFETIME_MS,
  type PdfAnonymousRequest,
} from "@repo/core/domain/pdf/anonymous";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { PdfAnonymousTicketClaims } from "./anonymousPorts";
import {
  currentPdfAnonymousNote,
  initialPdfAnonymousSnapshot,
  type PdfAnonymousAccess,
  readPdfAnonymousSnapshot,
} from "./anonymousSnapshot";
import { pdfContext, pdfNotFound } from "./snapshot";

function claims(
  c: HollowContainer,
  request: PdfAnonymousRequest,
): PdfAnonymousTicketClaims {
  return {
    v: 1,
    purpose: "hollow-anonymous-pdf-v1",
    kid: request.ticketKid,
    requestId: request.id,
    ticketGeneration: request.ticketGeneration,
    issuedAt: request.createdAt.getTime(),
    expiresAt: request.ticketExpiresAt.getTime(),
    browserHash: request.browserHash,
    authorityDigest: c.tokens.hash(JSON.stringify(request.authority)),
  };
}
function routeMatches(
  c: HollowContainer,
  access: PdfAnonymousAccess,
  request: PdfAnonymousRequest,
) {
  const authority = request.authority;
  return access.kind === "public"
    ? authority.kind === "public" &&
        access.publicId === authority.publicId &&
        access.urlGeneration === authority.urlGeneration
    : authority.kind === "link" &&
        c.tokens.hash(access.token) === authority.tokenHash;
}

export async function requestAnonymousPdf(
  c: HollowContainer,
  access: PdfAnonymousAccess,
  commandId: string,
) {
  const pdf = pdfContext(c);
  const signer = c.pdfAnonymousTicketSigner;
  const kid = signer.activeKeyId();
  if (!kid)
    throw new BusinessRuleError(
      "PDF_NOT_CONFIGURED",
      "匿名PDFの署名設定を利用できません。HTMLまたはMarkdownで取得できます。",
    );
  const request = await c.unitOfWorkProvider.run(async (u) => {
    const now = c.clock.now();
    const browserHash = c.tokens.hash(access.browser);
    const inputDigest = c.tokens.hash(
      JSON.stringify(
        access.kind === "public"
          ? {
              format: "pdf",
              kind: "public",
              publicId: access.publicId,
              urlGeneration: access.urlGeneration,
            }
          : {
              format: "pdf",
              kind: "link",
              tokenHash: c.tokens.hash(access.token),
            },
      ),
    );
    const prior = await u.pdfAnonymousRequests.findCommand(
      browserHash,
      commandId,
    );
    if (prior) {
      if (prior.inputDigest !== inputDigest)
        throw new ConflictError(
          "PDF_COMMAND_CHANGED",
          "同じ要求識別子で異なるPDF操作はできません。",
        );
      if (!routeMatches(c, access, prior) || prior.state === "invalidated")
        return pdfNotFound();
      await currentPdfAnonymousNote(
        c,
        u,
        prior.targetNoteId,
        browserHash,
        prior.authority,
      );
      return prior;
    }
    const { snapshot, authority } = await initialPdfAnonymousSnapshot(
      c,
      u,
      access,
    );
    let compute = await u.pdfComputations.active(snapshot.note.id);
    if (
      compute &&
      (compute.state === "stopping" ||
        compute.sourceIdentity !== snapshot.identity ||
        compute.profile !== pdf.supervisor.profile)
    )
      throw new BusinessRuleError(
        "PDF_STOPPING",
        "前のPDF生成が終了するのを待っています。終了後に現在の内容でやり直してください。",
      );
    const cache = await u.pdfArtifacts.cached(
      snapshot.note.id,
      snapshot.identity,
      pdf.supervisor.profile,
      now,
    );
    if (await u.exports.reserveDownload(snapshot.note.id, browserHash, now))
      throw new BusinessRuleError(
        "EXPORT_RATE_LIMIT",
        "書き出し回数の上限に達しました。1分後にやり直してください。",
      );
    if (!cache && !compute) {
      const id = c.idGenerator.next();
      compute = {
        id,
        targetNoteId: snapshot.note.id,
        liveNoteId: snapshot.note.id,
        sourceIdentity: snapshot.identity,
        profile: pdf.supervisor.profile,
        state: "queued",
        generation: 1,
        leaseToken: null,
        leaseUntil: null,
        deadlineAt: new Date(now.getTime() + pdf.capacity.totalMs),
        workspaceId: id,
        reservedBytes: pdf.capacity.outputBytes + pdf.capacity.nativeTempBytes,
        workspaceRemoved: false,
        nextCleanupAt: now,
        cleanupToken: null,
        cleanupUntil: null,
        createdAt: now,
      };
      await u.pdfComputations.begin(compute, pdf.capacity.diskBytes);
    }
    const common = {
      id: c.idGenerator.next(),
      browserHash,
      commandId,
      inputDigest,
      targetNoteId: snapshot.note.id,
      liveNoteId: snapshot.note.id,
      sourceIdentity: snapshot.identity,
      profile: pdf.supervisor.profile,
      authority,
      createdAt: now,
      updatedAt: now,
      ticketExpiresAt: new Date(
        now.getTime() + PDF_ANONYMOUS_TICKET_LIFETIME_MS,
      ),
      ticketGeneration: 1,
      ticketKid: kid,
      autoDeliveryId: null,
      version: 1,
    };
    const accepted: PdfAnonymousRequest = cache
      ? {
          ...common,
          state: "succeeded",
          computeId: cache.computeId,
          artifactId: cache.id,
          failure: null,
        }
      : {
          ...common,
          state: compute?.state === "running" ? "running" : "queued",
          computeId: compute?.id ?? pdfNotFound(),
          artifactId: null,
          failure: null,
        };
    await u.pdfAnonymousRequests.insert(accepted);
    return accepted;
  });
  const ticket = signer.sign(claims(c, request));
  pdf.wake();
  return { ticket };
}

export async function verifyAnonymousPdfRequest(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  access: PdfAnonymousAccess,
  ticket: string,
) {
  const supplied = c.pdfAnonymousTicketSigner.verify(ticket);
  const browserHash = c.tokens.hash(access.browser);
  if (!supplied || supplied.browserHash !== browserHash) return pdfNotFound();
  const request = await u.pdfAnonymousRequests.find(supplied.requestId);
  if (
    !request ||
    request.browserHash !== browserHash ||
    JSON.stringify(claims(c, request)) !== JSON.stringify(supplied) ||
    !routeMatches(c, access, request) ||
    request.state === "invalidated"
  )
    return pdfNotFound();
  await currentPdfAnonymousNote(
    c,
    u,
    request.targetNoteId,
    browserHash,
    request.authority,
  );
  return request;
}

export type PdfAnonymousStatus =
  | Readonly<{ kind: "expired" }>
  | Readonly<{ kind: "pending"; expiresAt: string }>
  | Readonly<{ kind: "failed"; failure: string }>
  | Readonly<{ kind: "ready"; automatic: boolean; expiresAt: string }>;

export async function anonymousPdfStatus(
  c: HollowContainer,
  access: PdfAnonymousAccess,
  ticket: string,
): Promise<PdfAnonymousStatus> {
  return c.unitOfWorkProvider.run(async (u) => {
    const request = await verifyAnonymousPdfRequest(c, u, access, ticket);
    const now = c.clock.now();
    if (request.ticketExpiresAt <= now || request.state === "expired")
      return { kind: "expired" };
    if (request.state === "failed")
      return { kind: "failed", failure: request.failure };
    const snapshot = await readPdfAnonymousSnapshot(c, u, request);
    if (snapshot.identity !== request.sourceIdentity)
      return { kind: "failed", failure: "PDF_CONTENT_CHANGED" };
    if (request.state !== "succeeded")
      return {
        kind: "pending",
        expiresAt: request.ticketExpiresAt.toISOString(),
      };
    const artifact = await u.pdfArtifacts.find(request.artifactId);
    if (!artifact || artifact.state !== "ready" || artifact.expiresAt <= now)
      return { kind: "expired" };
    return {
      kind: "ready",
      automatic: request.autoDeliveryId === null,
      expiresAt: request.ticketExpiresAt.toISOString(),
    };
  });
}

export async function prepareAnonymousPdfDelivery(
  c: HollowContainer,
  access: PdfAnonymousAccess,
  ticket: string,
  automatic: boolean,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const request = await verifyAnonymousPdfRequest(c, u, access, ticket);
    const now = c.clock.now();
    if (request.state !== "succeeded" || request.ticketExpiresAt <= now)
      return pdfNotFound();
    if (automatic && request.autoDeliveryId !== null) return null;
    const artifact = await u.pdfArtifacts.find(request.artifactId);
    if (!artifact || artifact.state !== "ready" || artifact.expiresAt <= now)
      return pdfNotFound();
    const snapshot = await readPdfAnonymousSnapshot(c, u, request);
    if (
      snapshot.identity !== request.sourceIdentity ||
      snapshot.identity !== artifact.sourceIdentity
    )
      throw new BusinessRuleError(
        "PDF_CONTENT_CHANGED",
        "現在のノートからPDFを作成してください。",
      );
    const id = c.idGenerator.next();
    const expiresAt = new Date(
      Math.min(
        now.getTime() + 120000,
        request.ticketExpiresAt.getTime(),
        artifact.expiresAt.getTime(),
        request.authority.kind === "link" &&
          request.authority.proof.kind === "grant"
          ? request.authority.proof.expiresAt.getTime()
          : Number.MAX_SAFE_INTEGER,
      ),
    );
    await u.pdfAnonymousDeliveries.begin(
      {
        id,
        requestId: request.id,
        artifactId: artifact.id,
        state: "ready",
        generation: 1,
        claimToken: null,
        runtimeId: null,
        createdAt: now,
        expiresAt,
        nextCleanupAt: now,
      },
      now,
    );
    if (
      request.autoDeliveryId === null &&
      !(await u.pdfAnonymousRequests.consumeAuto(
        request.id,
        id,
        request.version,
      ))
    )
      throw new ConflictError(
        "PDF_AUTO_CHANGED",
        "取得状態が変わりました。もう一度確認してください。",
      );
    return { id, expiresAt: expiresAt.toISOString() };
  });
}
