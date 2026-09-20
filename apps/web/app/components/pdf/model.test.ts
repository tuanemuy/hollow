import type { PdfJobView } from "@repo/core/application/pdf/usecases";
import { describe, expect, it } from "vitest";
import {
  acceptsPdfJob,
  adoptPdfJob,
  canPreparePdf,
  clearPdfPending,
  initialPdfModel,
  mayAutoDownloadPdf,
  ownsPdfOperation,
  type PdfIdentity,
  type PdfOperation,
  pdfDeliveryUrl,
  pdfFailureMessage,
  pdfIsActive,
  pdfLookupUnavailable,
  pdfStateLabel,
} from "./model";

const identity: PdfIdentity = {
  actorId: "actor-a",
  actorEpoch: 2,
  noteId: "note-a",
};
const job: PdfJobView = {
  id: "job-a",
  commandId: "command-a",
  actorId: "actor-a",
  noteId: "note-a",
  title: "保存した本文",
  state: "queued",
  failure: null,
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T00:00:00.000Z",
  historyExpiresAt: "2026-12-19T00:00:00.000Z",
  expiresAt: null,
  available: false,
  version: 1,
};

describe("PDF request acknowledgement", () => {
  it("separates an ownership failure from completed physical recovery", () => {
    expect(pdfFailureMessage("PDF_OWNERSHIP_UNKNOWN")).toContain(
      "現在は再試行できません",
    );
    expect(pdfFailureMessage("PDF_OWNERSHIP_UNKNOWN")).toContain(
      "回収完了は確認されていません",
    );
  });
  it("restores a pending command as unconfirmed, not a new POST", () => {
    expect(initialPdfModel(null)).toEqual({ kind: "idle", message: null });
    expect(initialPdfModel(job.commandId)).toEqual({
      kind: "unconfirmed",
      commandId: job.commandId,
      message: null,
    });
  });

  it("keeps the identifier after unknown acknowledgement or missing lookup", () => {
    const pending = initialPdfModel(job.commandId);
    const result = pdfLookupUnavailable(pending);
    expect(result).toMatchObject({
      kind: "unconfirmed",
      commandId: job.commandId,
    });
    expect(pdfLookupUnavailable(result)).toEqual(result);
  });

  it("preserves accepted state but pauses polling when current lookup is unavailable", () => {
    const tracked = adoptPdfJob(initialPdfModel(job.commandId), job, identity);
    expect(pdfLookupUnavailable(tracked)).toMatchObject({
      kind: "tracked",
      job,
      polling: false,
    });
  });

  it("adopts only the current command, actor, note, job and non-regressing version", () => {
    const initial = initialPdfModel(job.commandId);
    const tracked = adoptPdfJob(initial, { ...job, version: 3 }, identity);
    expect(acceptsPdfJob(initial, job, identity)).toBe(true);
    for (const patch of [
      { commandId: "other" },
      { actorId: "other" },
      { noteId: "other" },
      { id: "other" },
      { version: 2 },
    ]) {
      expect(
        adoptPdfJob(tracked, { ...job, version: 3, ...patch }, identity),
      ).toBe(tracked);
    }
    expect(adoptPdfJob(initialPdfModel(null), job, identity).kind).toBe("idle");
  });

  it("does not revive terminal requests with a late active result", () => {
    const done = adoptPdfJob(
      initialPdfModel(job.commandId),
      { ...job, state: "cancelled", version: 2 },
      identity,
    );
    expect(adoptPdfJob(done, { ...job, version: 3 }, identity)).toBe(done);
  });

  it("clears only the same actor/note/command at a confirmed terminal state", () => {
    for (const state of ["queued", "running"] as const) {
      expect(clearPdfPending(job.commandId, { ...job, state }, identity)).toBe(
        false,
      );
    }
    for (const state of ["succeeded", "failed", "cancelled"] as const) {
      const done = { ...job, state };
      expect(clearPdfPending(job.commandId, done, identity)).toBe(true);
      expect(clearPdfPending("new-command", done, identity)).toBe(false);
      expect(clearPdfPending(null, done, identity)).toBe(false);
      expect(
        clearPdfPending(job.commandId, done, { ...identity, actorId: "other" }),
      ).toBe(false);
      expect(
        clearPdfPending(job.commandId, done, { ...identity, noteId: "other" }),
      ).toBe(false);
    }
  });
});

describe("PDF operation ownership", () => {
  it("rejects every old success, catch, finally and download context", () => {
    const operation: PdfOperation = { ...identity, mount: {}, token: {} };
    const actor = { id: identity.actorId, epoch: identity.actorEpoch };
    expect(ownsPdfOperation(true, operation, operation, actor)).toBe(true);
    expect(ownsPdfOperation(false, operation, operation, actor)).toBe(false);
    expect(ownsPdfOperation(true, operation, null, actor)).toBe(false);
    expect(ownsPdfOperation(true, operation, operation, null)).toBe(false);
    for (const patch of [
      { token: {} },
      { mount: {} },
      { noteId: "other" },
      { actorId: "other" },
      { actorEpoch: 3 },
    ]) {
      expect(
        ownsPdfOperation(true, operation, { ...operation, ...patch }, actor),
      ).toBe(false);
    }
    expect(
      ownsPdfOperation(true, operation, operation, { ...actor, epoch: 4 }),
    ).toBe(false);
    expect(
      ownsPdfOperation(true, operation, operation, { ...actor, id: "other" }),
    ).toBe(false);
  });
});

describe("PDF native delivery", () => {
  const id = "aabbccdd-1111-4222-8333-aabbccddeeff";
  const url = `/api/pdf-deliveries/${id}`;

  it("accepts only the exact relative delivery route matching its identifier", () => {
    expect(pdfDeliveryUrl({ id, url })).toBe(url);
    for (const invalid of [
      `${url}?download=1`,
      `${url}#fragment`,
      `${url}/`,
      `https://example.test${url}`,
      `//example.test${url}`,
      "/api/pdf-deliveries/other",
      "/api/notes/note-a",
      "javascript:alert(1)",
      `${url}\n`,
      "/api/pdf-deliveries/%2e%2e",
    ]) {
      expect(pdfDeliveryUrl({ id, url: invalid })).toBeNull();
    }
    expect(pdfDeliveryUrl({ id: "../other", url })).toBeNull();
  });

  it("requires succeeded and currently available before preparing a ticket", () => {
    for (const state of ["queued", "running", "failed", "cancelled"] as const) {
      expect(canPreparePdf({ ...job, state, available: true })).toBe(false);
    }
    expect(
      canPreparePdf({ ...job, state: "succeeded", available: false }),
    ).toBe(false);
    expect(canPreparePdf({ ...job, state: "succeeded", available: true })).toBe(
      true,
    );
  });

  it("allows automatic delivery only for this mount's newly accepted command", () => {
    const done = { ...job, state: "succeeded", available: true } as const;
    expect(mayAutoDownloadPdf(job.commandId, done)).toBe(true);
    expect(mayAutoDownloadPdf(null, done)).toBe(false);
    expect(mayAutoDownloadPdf("previous-command", done)).toBe(false);
    expect(mayAutoDownloadPdf(job.commandId, job)).toBe(false);
  });

  it("labels availability without claiming successful device storage", () => {
    expect(pdfIsActive(job)).toBe(true);
    expect(pdfIsActive({ ...job, state: "running" })).toBe(true);
    expect(pdfStateLabel({ ...job, state: "succeeded", available: true })).toBe(
      "PDFを取得できます。",
    );
  });
});
