import { BusinessRuleError } from "@repo/core/domain/error";
import type { HollowContainer } from "../di/hollowTypes";
import type { PdfAnonymousAccess } from "./anonymousSnapshot";
import { readPdfAnonymousSnapshot } from "./anonymousSnapshot";
import { verifyAnonymousPdfRequest } from "./anonymousUsecases";
import { streamPdfDelivery } from "./deliveryStream";
import { pdfContext, pdfNotFound } from "./snapshot";

export async function getAnonymousPdfFile(
  c: HollowContainer,
  access: PdfAnonymousAccess,
  ticket: string,
  id: string,
  requestSignal: AbortSignal,
) {
  const pdf = pdfContext(c);
  if (!c.importing?.storage.withOwner)
    throw new BusinessRuleError(
      "PDF_NOT_CONFIGURED",
      "PDFの保存機構が構成されていません。",
    );
  const token = c.tokens.generate();
  const admitted = await c.unitOfWorkProvider.run(async (u) => {
    const request = await verifyAnonymousPdfRequest(c, u, access, ticket);
    const now = c.clock.now();
    const delivery = await u.pdfAnonymousDeliveries.find(id);
    if (
      request.state !== "succeeded" ||
      request.ticketExpiresAt <= now ||
      !delivery ||
      delivery.requestId !== request.id ||
      delivery.state !== "ready" ||
      delivery.expiresAt <= now
    )
      return pdfNotFound();
    const artifact = await u.pdfArtifacts.find(delivery.artifactId);
    if (
      !artifact ||
      artifact.state !== "ready" ||
      artifact.expiresAt <= now ||
      !artifact.liveNoteId ||
      artifact.id !== request.artifactId
    )
      return pdfNotFound();
    const snapshot = await readPdfAnonymousSnapshot(c, u, request);
    if (
      snapshot.identity !== artifact.sourceIdentity ||
      snapshot.identity !== request.sourceIdentity
    )
      throw new BusinessRuleError(
        "PDF_CONTENT_CHANGED",
        "現在のノートからPDFを作成してください。",
      );
    const claimed = await u.pdfAnonymousDeliveries.claim(
      id,
      request.browserHash,
      token,
      pdf.transfers.runtimeId,
      now,
    );
    if (!claimed) return pdfNotFound();
    return { delivery: claimed, artifact, requestId: request.id };
  });
  return streamPdfDelivery(
    c,
    { kind: "anonymous", id },
    admitted.artifact,
    admitted.delivery.expiresAt,
    requestSignal,
    async () => {
      await c.unitOfWorkProvider.run(async (u) => {
        const request = await verifyAnonymousPdfRequest(c, u, access, ticket);
        const now = c.clock.now();
        const delivery = await u.pdfAnonymousDeliveries.find(id);
        const artifact = await u.pdfArtifacts.find(admitted.artifact.id);
        if (
          request.id !== admitted.requestId ||
          request.state !== "succeeded" ||
          request.ticketExpiresAt <= now ||
          !delivery ||
          delivery.state !== "sending" ||
          delivery.claimToken !== token ||
          delivery.expiresAt <= now ||
          !artifact ||
          artifact.state !== "ready" ||
          artifact.expiresAt <= now ||
          artifact.generation !== admitted.artifact.generation ||
          !artifact.liveNoteId
        )
          return pdfNotFound();
        const snapshot = await readPdfAnonymousSnapshot(c, u, request);
        if (snapshot.identity !== artifact.sourceIdentity)
          throw new BusinessRuleError(
            "PDF_CONTENT_CHANGED",
            "現在のノートからPDFを作成してください。",
          );
      });
    },
    () =>
      c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousDeliveries.close(id, token),
      ),
  );
}
