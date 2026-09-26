import { BusinessRuleError } from "@repo/core/domain/error";
import {
  PDF_HISTORY_LIFETIME_MS,
  type PdfRequest,
} from "@repo/core/domain/pdf/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { PdfHistoryCursor } from "./ports";
import { pdfContext, pdfNotFound, readPdfSnapshot } from "./snapshot";

export type PdfJobView = Readonly<{
  id: string;
  commandId: string;
  actorId: string;
  noteId: string;
  title: string;
  state: PdfRequest["state"];
  failure: string | null;
  createdAt: string;
  updatedAt: string;
  historyExpiresAt: string;
  expiresAt: string | null;
  available: boolean;
  version: number;
}>;
async function view(
  u: HollowUnitOfWorkContext,
  r: PdfRequest,
  now: Date,
): Promise<PdfJobView> {
  const artifact =
    r.state === "succeeded" ? await u.pdfArtifacts.find(r.artifactId) : null;
  return {
    id: r.id,
    commandId: r.commandId,
    actorId: r.accountId,
    noteId: r.targetNoteId,
    title: r.title,
    state: r.state,
    failure: r.failure,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    historyExpiresAt: r.historyExpiresAt.toISOString(),
    expiresAt: artifact?.expiresAt?.toISOString() ?? null,
    available: artifact?.state === "ready" && artifact.expiresAt > now,
    version: r.version,
  };
}

export type PdfRequestInput = Readonly<{
  noteId: string;
  commandId: string;
  retryOf?: string;
}>;
export async function requestPdf(
  c: HollowContainer,
  token: string | null,
  input: PdfRequestInput,
) {
  const pdf = pdfContext(c);
  const result = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, token);
    const now = c.clock.now();
    const digest = c.tokens.hash(
      JSON.stringify({
        format: "pdf",
        noteId: input.noteId,
        retryOf: input.retryOf ?? null,
      }),
    );
    const prior = await u.pdfRequests.findCommand(actor.id, input.commandId);
    if (prior) {
      if (prior.inputDigest !== digest)
        throw new ConflictError(
          "PDF_COMMAND_CHANGED",
          "同じ要求識別子で異なるPDF操作はできません。",
        );
      if (prior.historyExpiresAt <= now) return pdfNotFound();
      return view(u, prior, now);
    }
    if (input.retryOf) {
      const failed = await u.pdfRequests.find(input.retryOf);
      if (
        !failed ||
        failed.accountId !== actor.id ||
        failed.targetNoteId !== input.noteId ||
        failed.state !== "failed" ||
        failed.historyExpiresAt <= now
      )
        throw new BusinessRuleError(
          "PDF_RETRY_UNAVAILABLE",
          "この処理は再試行できません。ノートから新しいPDFを作成してください。",
        );
    }
    const snapshot = await readPdfSnapshot(c, u, actor.id, input.noteId);
    const cache = await u.pdfArtifacts.cached(
      input.noteId,
      snapshot.identity,
      pdf.supervisor.profile,
      now,
    );
    let compute = cache ? null : await u.pdfComputations.active(input.noteId);
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
    if (!cache && !compute) {
      const id = c.idGenerator.next();
      compute = {
        id,
        targetNoteId: input.noteId,
        liveNoteId: input.noteId,
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
      accountId: actor.id,
      commandId: input.commandId,
      inputDigest: digest,
      targetNoteId: input.noteId,
      liveNoteId: input.noteId,
      title: snapshot.note.title,
      sourceIdentity: snapshot.identity,
      style: snapshot.note.display.style,
      computeId: cache?.computeId ?? compute?.id ?? null,
      retryOf: input.retryOf ?? null,
      createdAt: now,
      historyExpiresAt: new Date(now.getTime() + PDF_HISTORY_LIFETIME_MS),
      updatedAt: now,
      version: 1,
    };
    const request: PdfRequest = cache
      ? { ...common, state: "succeeded", artifactId: cache.id, failure: null }
      : {
          ...common,
          state: compute?.state === "running" ? "running" : "queued",
          artifactId: null,
          failure: null,
        };
    await u.pdfRequests.insert(request);
    return view(u, request, now);
  });
  pdf.wake();
  return result;
}

export async function lookupPdf(
  c: HollowContainer,
  token: string | null,
  commandId: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, token);
    const r = await u.pdfRequests.findCommand(actor.id, commandId);
    return r && r.historyExpiresAt > c.clock.now()
      ? view(u, r, c.clock.now())
      : null;
  });
}

export async function listPdf(
  c: HollowContainer,
  token: string | null,
  before: PdfHistoryCursor | null = null,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, token);
    const now = c.clock.now();
    const rows = await u.pdfRequests.list(actor.id, before, now);
    const last = rows.at(-1);
    return {
      actorId: actor.id,
      items: await Promise.all(rows.map((r) => view(u, r, now))),
      nextCursor:
        rows.length === 50 && last
          ? { at: last.createdAt.toISOString(), id: last.id }
          : null,
      configured: Boolean(c.pdf),
    };
  });
}

export async function pdfActivity(
  c: HollowContainer,
  token: string | null,
  after: string | null,
  watched: readonly string[],
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, token);
    const now = c.clock.now();
    const summary = await u.pdfRequests.summary(actor.id, now);
    const active = await u.pdfRequests.activePage(actor.id, after, now);
    const rows = await u.pdfRequests.watched(actor.id, watched, now);
    return {
      actorId: actor.id,
      ...summary,
      active,
      nextActive: active.length === 50 ? (active.at(-1)?.id ?? null) : null,
      watched: rows.map((r) => ({
        id: r.id,
        commandId: r.commandId,
        noteId: r.targetNoteId,
        version: r.version,
        state: r.state,
        title: r.title,
      })),
    };
  });
}

export async function cancelPdf(
  c: HollowContainer,
  token: string | null,
  id: string,
) {
  const result = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, token);
    const r = await u.pdfRequests.find(id);
    if (!r || r.accountId !== actor.id || r.historyExpiresAt <= c.clock.now())
      return pdfNotFound();
    await u.pdfRequests.cancel(id, actor.id, c.clock.now());
    if (r.computeId && !(await u.pdfDemands.find(r.computeId, c.clock.now())))
      await u.pdfComputations.stop(r.computeId, c.clock.now());
    const updated = await u.pdfRequests.find(id);
    return updated ? view(u, updated, c.clock.now()) : pdfNotFound();
  });
  c.pdf?.wake();
  return result;
}

export async function preparePdfDelivery(
  c: HollowContainer,
  token: string | null,
  requestId: string,
) {
  pdfContext(c);
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, token);
    const now = c.clock.now();
    const r = await u.pdfRequests.find(requestId);
    if (
      !r ||
      r.accountId !== actor.id ||
      r.state !== "succeeded" ||
      r.historyExpiresAt <= now
    )
      return pdfNotFound();
    const artifact = await u.pdfArtifacts.find(r.artifactId);
    if (!artifact || artifact.state !== "ready" || artifact.expiresAt <= now)
      throw new BusinessRuleError(
        "PDF_EXPIRED",
        "PDFの保存期限が切れました。ノートから新しいPDFを作成してください。",
      );
    const snapshot = await readPdfSnapshot(c, u, actor.id, r.targetNoteId);
    if (snapshot.identity !== artifact.sourceIdentity)
      throw new ConflictError(
        "PDF_CONTENT_CHANGED",
        "ノートの内容が変わりました。現在の内容から新しいPDFを作成してください。",
      );
    const id = c.idGenerator.next();
    const expiresAt = new Date(
      Math.min(
        now.getTime() + PDF_DELIVERY_LIFETIME_MS,
        artifact.expiresAt.getTime(),
      ),
    );
    await u.pdfDeliveries.begin(
      {
        id,
        requestId: r.id,
        artifactId: artifact.id,
        accountId: actor.id,
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
    return {
      id,
      url: `/api/pdf-deliveries/${id}`,
      filename: artifact.file.filename,
      expiresAt: expiresAt.toISOString(),
    };
  });
}

export const PDF_DELIVERY_LIFETIME_MS = 120_000;
