import type { ExportDocumentInput } from "@repo/core/application/export/document";
import { describe, expect, it, vi } from "vitest";
import { IsolatedExportDocumentWriter } from "./writer";

const input: ExportDocumentInput = {
  noteId: "n",
  title: "fixture",
  html: "<p>x</p>",
  style: "original",
  defaultCss: "",
  appUrl: "https://hollow.example",
  format: "html",
  media: [],
  external: { images: [], media: [], backgrounds: [], fonts: [] },
};
const writer = () =>
  new IsolatedExportDocumentWriter(
    new URL("./fixtures/protocol.mjs", import.meta.url),
  );

describe("isolated export writer", () => {
  it("validates the response and waits for worker termination", async () => {
    const terminate = vi.spyOn(
      (await import("node:worker_threads")).Worker.prototype,
      "terminate",
    );
    try {
      expect(
        (await writer().plan(input, new AbortController().signal)).maxBytes,
      ).toBe(7);
      expect(terminate).toHaveBeenCalledOnce();
      expect(await terminate.mock.results[0]?.value).toBeTypeOf("number");
    } finally {
      terminate.mockRestore();
    }
  });
  it("rejects already aborted and in-flight requests", async () => {
    const early = new AbortController();
    early.abort();
    await expect(writer().plan(input, early.signal)).rejects.toMatchObject({
      code: "EXPORT_DOCUMENT_CANCELLED",
    });
    const controller = new AbortController();
    const pending = writer().plan(
      { ...input, title: "hang" },
      controller.signal,
    );
    controller.abort();
    await expect(pending).rejects.toMatchObject({
      code: "EXPORT_DOCUMENT_CANCELLED",
    });
  });
  it("rejects malformed messages and hides unknown worker errors", async () => {
    await expect(
      writer().plan(
        { ...input, title: "invalid" },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "EXPORT_DOCUMENT_INVALID" });
    await expect(
      writer().plan(
        { ...input, title: "failure" },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "EXPORT_DOCUMENT_INVALID" });
  });
  it("enforces the 30-second deadline", async () => {
    vi.useFakeTimers();
    try {
      const pending = writer().plan(
        { ...input, title: "hang" },
        new AbortController().signal,
      );
      const rejected = expect(pending).rejects.toMatchObject({
        code: "EXPORT_DOCUMENT_TIMEOUT",
      });
      await vi.advanceTimersByTimeAsync(30_000);
      await rejected;
    } finally {
      vi.useRealTimers();
    }
  });
});
