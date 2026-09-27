import { createNote } from "@repo/core/domain/note/entity";
import { describe, expect, it, vi } from "vitest";
import type { HollowContainer } from "../di/hollowTypes";
import { SystemError, SystemErrorCode } from "../errors";
import type { SafeReferenceFetcher } from "../ports/referenceProcessor";
import { type ExportContentSnapshot, inspectExportSources } from "./snapshot";

const url = "https://media.example.test/image.png";
const snapshot: ExportContentSnapshot = {
  note: createNote(
    {
      id: "10000000-0000-4000-8000-000000000001",
      accountId: "10000000-0000-4000-8000-000000000002",
      title: "検査対象",
      html: `<p>本文</p><img src="${url}">`,
      text: "本文",
    },
    new Date("2026-09-27T00:00:00Z"),
  ),
  media: [],
  sources: [],
  identity: "fixed-content-identity",
};
type Inspection = Awaited<ReturnType<SafeReferenceFetcher["inspect"]>>;
function fixture(result: Inspection) {
  const inspectMany = vi.fn(async () => [result]);
  const context: Pick<
    HollowContainer,
    "appUrl" | "referencing" | "inlineMedia"
  > = {
    appUrl: "http://localhost:3000",
    referencing: {
      processor: {
        hasDecoration: () => false,
        prepare: (html) => ({
          html,
          candidates: [{ url, kind: "image", location: "img" }],
          notices: [],
        }),
        styles: () => [],
        rewrite: (html) => ({ html, candidates: [], notices: [] }),
        decodeCss: () => {
          throw Error("Unexpected CSS");
        },
        decodeDataUri: () => {
          throw Error("Unexpected data URI");
        },
        encodeDataUri: () => {
          throw Error("Unexpected data URI");
        },
      },
      fetcher: {
        inspect: async () => result,
        inspectMany,
        fetch: async () => {
          throw Error("Unexpected network fetch");
        },
      },
      wake() {},
    },
  };
  return { context, inspectMany };
}

const indeterminate = [
  "REFERENCE_DNS",
  "REFERENCE_TIMEOUT",
  "REFERENCE_CANCELLED",
  "REFERENCE_RESOURCE_LIMIT",
  "UNRECOGNIZED_REASON",
  null,
];

describe("export inspection policy", () => {
  it.each(
    indeterminate,
  )("preserves the legacy best-effort projection for %s", async (reason) => {
    const { context } = fixture({ url, allowed: false, reason });
    const result = await inspectExportSources(
      context,
      snapshot,
      new AbortController().signal,
    );
    expect(result).toEqual({
      media: [],
      sources: [],
      external: { images: [], media: [], backgrounds: [], fonts: [] },
    });
    expect(result).toEqual(
      await inspectExportSources(
        context,
        snapshot,
        new AbortController().signal,
        "best-effort",
      ),
    );
  });

  it.each(
    indeterminate,
  )("keeps %s indeterminate rather than constructing a changed identity", async (reason) => {
    const { context } = fixture({ url, allowed: false, reason });
    const promise = inspectExportSources(
      context,
      snapshot,
      new AbortController().signal,
      "require-determinate",
    );
    await expect(promise).rejects.toBeInstanceOf(SystemError);
    await expect(promise).rejects.toMatchObject({
      code: SystemErrorCode.ExternalApiError,
      retryable: true,
    });
  });

  it.each([
    "REFERENCE_URL",
    "REFERENCE_PRIVATE",
  ])("preserves the same determinate denied projection for %s", async (reason) => {
    const { context } = fixture({ url, allowed: false, reason });
    const legacy = await inspectExportSources(
      context,
      snapshot,
      new AbortController().signal,
    );
    const strict = await inspectExportSources(
      context,
      snapshot,
      new AbortController().signal,
      "require-determinate",
    );
    expect(JSON.stringify(strict)).toBe(JSON.stringify(legacy));
    expect(strict.external.images).toEqual([]);
  });

  it("preserves allowed result order and identity projection", async () => {
    const { context } = fixture({ url, allowed: true, reason: null });
    const legacy = await inspectExportSources(
      context,
      snapshot,
      new AbortController().signal,
    );
    const strict = await inspectExportSources(
      context,
      snapshot,
      new AbortController().signal,
      "require-determinate",
    );
    expect(JSON.stringify(strict)).toBe(JSON.stringify(legacy));
    expect(strict.external.images).toEqual([url]);
    expect(snapshot.identity).toBe("fixed-content-identity");
  });

  it("preserves the parent's abort before inspection without opening work", async () => {
    const { context, inspectMany } = fixture({
      url,
      allowed: false,
      reason: "REFERENCE_TIMEOUT",
    });
    const abort = new AbortController();
    const reason = new Error("parent cancelled");
    abort.abort(reason);
    await expect(
      inspectExportSources(
        context,
        snapshot,
        abort.signal,
        "require-determinate",
      ),
    ).rejects.toBe(reason);
    expect(inspectMany).not.toHaveBeenCalled();
  });

  it("prioritizes the parent's abort over the returned timeout classification", async () => {
    const { context, inspectMany } = fixture({
      url,
      allowed: false,
      reason: "REFERENCE_TIMEOUT",
    });
    const abort = new AbortController();
    const reason = new Error("parent cancelled during inspection");
    inspectMany.mockImplementation(async () => {
      abort.abort(reason);
      return [{ url, allowed: false, reason: "REFERENCE_TIMEOUT" }];
    });
    await expect(
      inspectExportSources(
        context,
        snapshot,
        abort.signal,
        "require-determinate",
      ),
    ).rejects.toBe(reason);
  });

  it("does not add network work when reference inspection is not configured", async () => {
    const context = { appUrl: "http://localhost:3000" };
    const legacy = await inspectExportSources(
      context,
      snapshot,
      new AbortController().signal,
    );
    const strict = await inspectExportSources(
      context,
      snapshot,
      new AbortController().signal,
      "require-determinate",
    );
    expect(strict).toEqual(legacy);
  });

  it("prioritizes the parent's abort when the inspection port rejects", async () => {
    const { context, inspectMany } = fixture({
      url,
      allowed: true,
      reason: null,
    });
    const abort = new AbortController();
    const reason = new Error("parent cancelled during rejected inspection");
    inspectMany.mockImplementation(async () => {
      abort.abort(reason);
      throw new Error("inspection rejected");
    });
    await expect(
      inspectExportSources(
        context,
        snapshot,
        abort.signal,
        "require-determinate",
      ),
    ).rejects.toBe(reason);
  });

  it("preserves an operational rejection when the parent is not aborted", async () => {
    const { context, inspectMany } = fixture({
      url,
      allowed: true,
      reason: null,
    });
    const reason = new SystemError(
      SystemErrorCode.ExternalApiError,
      "Unavailable",
    );
    inspectMany.mockRejectedValue(reason);
    await expect(
      inspectExportSources(
        context,
        snapshot,
        new AbortController().signal,
        "require-determinate",
      ),
    ).rejects.toBe(reason);
  });
});
