import { BusinessRuleError } from "@repo/core/domain/error";
import type { PdfComputation } from "@repo/core/domain/pdf/entity";
import { isSerializableError } from "@repo/core/lib/error";
import type { HollowContainer } from "../di/hollowTypes";
import { SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { readZipPdfSnapshot } from "../zip/pdfSnapshot";
import { readPdfAnonymousSnapshot } from "./anonymousSnapshot";
import type { PdfRenderInput } from "./ports";
import { pdfContext, preparePdfSources, readPdfSnapshot } from "./snapshot";

function stream(source: AsyncIterable<Uint8Array>, signal: AbortSignal) {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          signal.throwIfAborted();
          const next = await iterator.next();
          if (next.done) controller.close();
          else controller.enqueue(next.value);
        } catch (error) {
          await iterator.return?.();
          controller.error(error);
        }
      },
      async cancel() {
        await iterator.return?.();
      },
    },
    { highWaterMark: 1 },
  );
}
async function current(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  compute: PdfComputation,
) {
  const demand = await u.pdfDemands.find(compute.id, c.clock.now());
  if (!demand)
    throw new BusinessRuleError("PDF_CANCELLED", "PDF生成は取り消されました。");
  const snapshot =
    demand.kind === "zip-child"
      ? await readZipPdfSnapshot(c, u, demand.demand)
      : demand.kind === "anonymous"
        ? await readPdfAnonymousSnapshot(c, u, demand.request)
        : await readPdfSnapshot(
            c,
            u,
            demand.request.accountId,
            compute.targetNoteId,
          );
  if (snapshot.identity !== compute.sourceIdentity)
    throw new BusinessRuleError(
      "PDF_CONTENT_CHANGED",
      "保存済みの内容が変わりました。現在のノートからやり直してください。",
    );
  return snapshot;
}
async function generate(
  c: HollowContainer,
  compute: PdfComputation,
  signal: AbortSignal,
) {
  const pdf = pdfContext(c);
  const storage = c.importing?.storage;
  if (compute.state !== "running") return;
  const token = compute.leaseToken;
  let artifactId: string | null = null;
  let ownershipKnown = true;
  try {
    if (!storage?.withOwner)
      throw new BusinessRuleError(
        "PDF_NOT_CONFIGURED",
        "PDFの保存機構が構成されていません。",
      );
    const snapshot = await c.unitOfWorkProvider.run((u) =>
      current(c, u, compute),
    );
    const prepared = await preparePdfSources(c, snapshot, signal);
    const plan = await pdf.writer.plan(
      {
        noteId: snapshot.note.id,
        title: snapshot.note.title,
        html: snapshot.note.html,
        style: snapshot.note.display.style,
        defaultCss: pdf.defaultCss,
        appUrl: c.appUrl,
        media: prepared.media,
      },
      signal,
    );
    const used = new Set(plan.mediaIds);
    const input: PdfRenderInput = {
      computeId: compute.id,
      generation: compute.generation,
      workspaceId: compute.workspaceId,
      deadlineAt: compute.deadlineAt,
      plan,
      sources: prepared.sources.filter((source) => used.has(source.id)),
    };
    const reservation =
      compute.reservedBytes + pdf.workspace.reservation(input);
    const id = c.idGenerator.next();
    const key = `${id}_pdf`;
    await c.unitOfWorkProvider.run(async (u) => {
      await current(c, u, compute);
      signal.throwIfAborted();
      if (
        !(await u.pdfComputations.reserve(
          compute.id,
          token,
          reservation,
          pdf.capacity.diskBytes,
        ))
      )
        throw new BusinessRuleError(
          "PDF_CANCELLED",
          "PDF生成は終了しています。",
        );
      await u.pdfArtifacts.begin(
        {
          id,
          targetNoteId: compute.targetNoteId,
          liveNoteId: compute.targetNoteId,
          computeId: compute.id,
          sourceIdentity: compute.sourceIdentity,
          profile: compute.profile,
          state: "writing",
          key,
          file: null,
          publishedAt: null,
          expiresAt: null,
          reservedBytes: pdf.capacity.finalCopyBytes,
          generation: 1,
          createdAt: c.clock.now(),
          nextCleanupAt: c.clock.now(),
          cleanupToken: null,
          cleanupUntil: null,
        },
        pdf.capacity.diskBytes,
      );
    });
    artifactId = id;
    await pdf.workspace.writePack(input, pdf.sources, signal);
    const rendered = await pdf.supervisor.render(input, signal);
    signal.throwIfAborted();
    await storage.withOwner({ kind: "pdf-artifact", id }, async () => {
      const copied = await storage.putBounded(
        key,
        stream(pdf.workspace.readOutput(rendered, signal), signal),
        pdf.capacity.finalCopyBytes,
        signal,
      );
      if (copied.bytes !== rendered.bytes || copied.sha256 !== rendered.sha256)
        throw new BusinessRuleError(
          "PDF_COPY_CHANGED",
          "PDFの保存内容を確認できませんでした。",
        );
      await c.unitOfWorkProvider.run(async (u) => {
        await current(c, u, compute);
        signal.throwIfAborted();
        if (
          !(await u.pdfArtifacts.publish(
            id,
            1,
            token,
            { filename: plan.filename, ...copied },
            c.clock.now(),
          ))
        )
          throw new BusinessRuleError(
            "PDF_CANCELLED",
            "PDF生成は終了しています。",
          );
        if (!(await u.pdfDemands.succeed(compute.id, id, c.clock.now())))
          throw new BusinessRuleError(
            "PDF_CANCELLED",
            "PDF生成は取り消されました。",
          );
      });
    });
  } catch (error) {
    const serialized = isSerializableError(error) ? error.toSerialized() : null;
    ownershipKnown = serialized?.code !== SystemErrorCode.PdfOwnershipUnknown;
    const code = !ownershipKnown
      ? SystemErrorCode.PdfOwnershipUnknown
      : signal.aborted
        ? c.clock.now() >= compute.deadlineAt
          ? "PDF_DEADLINE"
          : "PDF_CANCELLED"
        : (serialized?.code ?? "PDF_GENERATION_FAILED");
    await c.unitOfWorkProvider.run(async (u) => {
      if (artifactId) await u.pdfArtifacts.retire(artifactId, c.clock.now());
      await u.pdfDemands.fail(compute.id, code, c.clock.now());
      await u.pdfComputations.stop(compute.id, c.clock.now());
    });
    c.logger.error("PDF generation did not publish", {
      computeId: compute.id,
      code,
      ownershipKnown,
    });
  } finally {
    if (ownershipKnown)
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.closed(compute.id, token, c.clock.now()),
      );
    pdf.wake();
  }
}

export async function sweepPdf(c: HollowContainer) {
  if (!c.pdf) return;
  const pdf = pdfContext(c);
  const storage = c.importing?.storage;
  const now = c.clock.now();
  await c.unitOfWorkProvider.run(async (u) => {
    await u.pdfAnonymousRequests.sweep(now);
    await u.pdfAnonymousDeliveries.expireReady(now);
    await u.pdfDeliveries.expireReady(now);
  });
  for (const ref of pdf.transfers.ids()) {
    try {
      const valid = await c.unitOfWorkProvider.run(async (u) => {
        const id = ref.id;
        if (ref.kind === "anonymous") {
          const delivery = await u.pdfAnonymousDeliveries.find(id);
          if (
            !delivery ||
            delivery.state !== "sending" ||
            delivery.expiresAt <= now
          )
            return false;
          const request = await u.pdfAnonymousRequests.find(delivery.requestId);
          const artifact = await u.pdfArtifacts.find(delivery.artifactId);
          if (
            !request ||
            request.state !== "succeeded" ||
            request.ticketExpiresAt <= now ||
            !artifact ||
            artifact.state !== "ready" ||
            artifact.expiresAt <= now ||
            !artifact.liveNoteId
          )
            return false;
          const snapshot = await readPdfAnonymousSnapshot(c, u, request);
          return snapshot.identity === artifact.sourceIdentity;
        }
        const delivery = await u.pdfDeliveries.find(id);
        if (
          !delivery ||
          delivery.state !== "sending" ||
          delivery.expiresAt <= now
        )
          return false;
        const artifact = await u.pdfArtifacts.find(delivery.artifactId);
        if (
          !artifact ||
          artifact.state !== "ready" ||
          artifact.expiresAt <= now ||
          !artifact.liveNoteId
        )
          return false;
        const snapshot = await readPdfSnapshot(
          c,
          u,
          delivery.accountId,
          artifact.liveNoteId,
        );
        return snapshot.identity === artifact.sourceIdentity;
      });
      if (!valid) pdf.transfers.cancel(ref);
    } catch {
      pdf.transfers.cancel(ref);
    }
  }
  const unfinished = await c.unitOfWorkProvider.run((u) =>
    u.pdfComputations.unfinished(),
  );
  for (const compute of unfinished) {
    if (pdf.execution.active(compute.id)) {
      const valid =
        compute.state === "running" &&
        (await c.unitOfWorkProvider.run((u) =>
          u.pdfComputations.renew(
            compute.id,
            compute.leaseToken,
            now,
            new Date(now.getTime() + pdf.capacity.leaseMs),
          ),
        ));
      if (!valid) pdf.execution.cancel(compute.id);
    } else if (compute.state === "queued") {
      await c.unitOfWorkProvider.run(async (u) => {
        if (
          compute.deadlineAt <= now ||
          !(await u.pdfDemands.find(compute.id, now))
        ) {
          await u.pdfDemands.fail(
            compute.id,
            compute.deadlineAt <= now ? "PDF_DEADLINE" : "PDF_CANCELLED",
            now,
          );
          await u.pdfComputations.stop(compute.id, now);
        }
      });
    }
  }
  await c.unitOfWorkProvider.run(async (u) => {
    await u.pdfAnonymousRequests.prune(now);
    await u.pdfRequests.prune(now);
  });
  const lease = c.tokens.generate();
  const compute = await c.unitOfWorkProvider.run(async (u) => {
    const claimed = await u.pdfComputations.claim(
      now,
      lease,
      new Date(now.getTime() + pdf.capacity.leaseMs),
    );
    if (claimed) await u.pdfDemands.running(claimed.id, now);
    return claimed;
  });
  if (
    compute &&
    !pdf.execution.start(compute.id, compute.deadlineAt, (signal) =>
      generate(c, compute, signal),
    )
  ) {
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfDemands.fail(compute.id, "PDF_BUSY", now);
      await u.pdfComputations.closed(compute.id, lease, now);
    });
  }
  const workspaceToken = c.tokens.generate();
  const workspace = await c.unitOfWorkProvider.run((u) =>
    u.pdfComputations.claimCleanup(
      now,
      workspaceToken,
      new Date(now.getTime() + pdf.capacity.leaseMs),
    ),
  );
  if (workspace) {
    try {
      if (pdf.execution.active(workspace.id))
        throw new BusinessRuleError("PDF_CLOSING", "PDFの終了を待っています。");
      if (await pdf.workspace.remove(workspace.workspaceId))
        await c.unitOfWorkProvider.run((u) =>
          u.pdfComputations.cleaned(workspace.id, workspaceToken),
        );
      else
        await c.unitOfWorkProvider.run((u) =>
          u.pdfComputations.deferCleanup(
            workspace.id,
            workspaceToken,
            workspace.reservedBytes,
            now,
          ),
        );
    } catch {
      const actual = await pdf.workspace
        .bytes(workspace.workspaceId)
        .catch(() => workspace.reservedBytes);
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.deferCleanup(
          workspace.id,
          workspaceToken,
          actual,
          now,
        ),
      );
    }
  }
  if (storage?.removeClaimed) {
    const token = c.tokens.generate();
    const artifact = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.claimCleanup(
        now,
        token,
        new Date(now.getTime() + pdf.capacity.leaseMs),
      ),
    );
    if (artifact?.key) {
      try {
        const removed = await storage.removeClaimed(artifact.key);
        await c.unitOfWorkProvider.run(async (u) => {
          if (
            !(await u.pdfArtifacts.cleaned(artifact.id, token, removed.token))
          )
            await u.pdfArtifacts.deferCleanup(artifact.id, token, now);
        });
      } catch {
        await c.unitOfWorkProvider.run((u) =>
          u.pdfArtifacts.deferCleanup(artifact.id, token, now),
        );
      }
    }
  }
}
