import { BusinessRuleError } from "@repo/core/domain/error";
import { isSerializableError } from "@repo/core/lib/error";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { SystemErrorCode } from "../errors";
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
  let held = false;
  try {
    const transferSignal = pdf.transfers.hold(id, admitted.delivery.expiresAt);
    held = true;
    const signal = AbortSignal.any([transferSignal, requestSignal]);
    let resolveReady!: (result: {
      body: ReadableStream<Uint8Array>;
      file: typeof admitted.artifact.file;
    }) => void;
    let rejectReady!: (error: unknown) => void;
    const ready = new Promise<{
      body: ReadableStream<Uint8Array>;
      file: typeof admitted.artifact.file;
    }>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    let complete!: () => void;
    const completed = new Promise<void>((resolve) => {
      complete = resolve;
    });
    let iterator: AsyncIterator<Uint8Array> | null = null;
    let closing: Promise<void> | null = null;
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
    let owner: Promise<void>;
    const close = () => {
      closing ??= (async () => {
        await iterator?.return?.();
        complete();
        await owner;
      })();
      return closing;
    };
    const abort = () => {
      void close().then(
        () =>
          controller?.error(
            new BusinessRuleError(
              "PDF_DOWNLOAD_CANCELLED",
              "PDF取得を中止しました。",
            ),
          ),
        () =>
          c.logger.error("PDF reader close is unproven", { deliveryId: id }),
      );
    };
    owner = storage
      .withOwner({ kind: "pdf-delivery", id }, async () => {
        try {
          signal.throwIfAborted();
          const prefix = await storage.read(admitted.artifact.key, 5);
          if (new TextDecoder().decode(prefix) !== "%PDF-")
            throw new BusinessRuleError(
              "PDF_FILE_INVALID",
              "PDFを読み取れませんでした。",
            );
          iterator = pdf.sources
            .read(
              {
                kind: "stored",
                id,
                mime: "application/pdf",
                key: admitted.artifact.key,
                bytes: admitted.artifact.file.bytes,
                sha256: admitted.artifact.file.sha256,
              },
              signal,
            )
            [Symbol.asyncIterator]();
          let first = await iterator.next();
          if (first.done)
            throw new BusinessRuleError(
              "PDF_FILE_INVALID",
              "PDFを読み取れませんでした。",
            );
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
          signal.throwIfAborted();
          const body = new ReadableStream<Uint8Array>(
            {
              start(value) {
                controller = value;
              },
              async pull(value) {
                try {
                  signal.throwIfAborted();
                  const next = first.done ? await iterator?.next() : first;
                  first = { done: true, value: undefined };
                  if (!next || next.done) {
                    await close();
                    value.close();
                  } else value.enqueue(next.value);
                } catch (error) {
                  try {
                    await close();
                  } finally {
                    value.error(error);
                  }
                }
              },
              async cancel() {
                await close();
              },
            },
            { highWaterMark: 0 },
          );
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
          resolveReady({ body, file: admitted.artifact.file });
          await completed;
        } catch (error) {
          rejectReady(error);
          if (
            isSerializableError(error) &&
            error.toSerialized().code === SystemErrorCode.PdfOwnershipUnknown
          )
            await new Promise<void>(() => {});
          await iterator?.return?.();
          throw error;
        } finally {
          signal.removeEventListener("abort", abort);
        }
      })
      .then(
        async () => {
          if (
            await c.unitOfWorkProvider.run((u) =>
              u.pdfDeliveries.close(id, token),
            )
          )
            pdf.transfers.release(id);
        },
        async (error) => {
          rejectReady(error);
          if (
            await c.unitOfWorkProvider.run((u) =>
              u.pdfDeliveries.close(id, token),
            )
          )
            pdf.transfers.release(id);
        },
      );
    void owner.catch(() =>
      c.logger.error("PDF delivery close deferred", { deliveryId: id }),
    );
    return await ready;
  } catch (error) {
    if (!held)
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.close(id, token));
    throw error;
  }
}
