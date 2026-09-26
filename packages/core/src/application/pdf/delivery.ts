import { BusinessRuleError } from "@repo/core/domain/error";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { streamPdfDelivery } from "./deliveryStream";
import { pdfContext, pdfNotFound, readPdfSnapshot } from "./snapshot";

export async function getPdfFile(
  c: HollowContainer,
  session: string | null,
  id: string,
  requestSignal: AbortSignal,
) {
  const pdf = pdfContext(c);
  const storage = c.importing?.storage;
  if (!storage?.withOwner)
    throw new BusinessRuleError(
      "PDF_NOT_CONFIGURED",
      "PDFの保存機構が構成されていません。",
    );
  const token = c.tokens.generate();
  const admitted = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const now = c.clock.now();
    const delivery = await u.pdfDeliveries.find(id);
    if (
      !delivery ||
      delivery.accountId !== actor.id ||
      delivery.state !== "ready" ||
      delivery.expiresAt <= now
    )
      return pdfNotFound();
    const artifact = await u.pdfArtifacts.find(delivery.artifactId);
    if (
      !artifact ||
      artifact.state !== "ready" ||
      artifact.expiresAt <= now ||
      !artifact.liveNoteId
    )
      return pdfNotFound();
    const snapshot = await readPdfSnapshot(c, u, actor.id, artifact.liveNoteId);
    if (snapshot.identity !== artifact.sourceIdentity)
      throw new BusinessRuleError(
        "PDF_CONTENT_CHANGED",
        "現在のノートからPDFを作成してください。",
      );
    const claimed = await u.pdfDeliveries.claim(
      id,
      actor.id,
      token,
      pdf.transfers.runtimeId,
      now,
    );
    if (!claimed) return pdfNotFound();
    return { delivery: claimed, artifact, actorId: actor.id };
  });
  return streamPdfDelivery(
    c,
    { kind: "account", id },
    admitted.artifact,
    admitted.delivery.expiresAt,
    requestSignal,
    async () => {
      await c.unitOfWorkProvider.run(async (u) => {
        const actor = await requireAccount(c, u.accounts, session);
        const now = c.clock.now();
        const delivery = await u.pdfDeliveries.find(id);
        const artifact = await u.pdfArtifacts.find(admitted.artifact.id);
        if (
          actor.id !== admitted.actorId ||
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
        const snapshot = await readPdfSnapshot(
          c,
          u,
          actor.id,
          artifact.liveNoteId,
        );
        if (snapshot.identity !== artifact.sourceIdentity)
          throw new BusinessRuleError(
            "PDF_CONTENT_CHANGED",
            "現在のノートからPDFを作成してください。",
          );
      });
    },
    () => c.unitOfWorkProvider.run((u) => u.pdfDeliveries.close(id, token)),
  );
}
