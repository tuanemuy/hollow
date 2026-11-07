import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadZip,
  sendZip,
  type ZipJob,
  ZipRequestError,
  zipActive,
  zipCommandSchema,
  zipJobSchema,
  zipNeedsNewRequest,
} from "./client";

const id = "10000000-0000-4000-8000-000000000001";
const job: ZipJob = {
  id,
  actorId: id,
  commandId: id,
  generation: 1,
  version: 1,
  format: "html",
  state: "queued",
  failure: null,
  acceptedAt: "2026-09-27T00:00:00.000Z",
  historyExpiresAt: "2026-12-26T00:00:00.000Z",
  finishedAt: null,
  publishedAt: null,
  expiresAt: null,
  available: false,
  total: 1,
  succeeded: 0,
  failed: 0,
  excluded: 0,
  cancelled: 0,
};
const command = {
  kind: "new" as const,
  input: {
    commandId: id,
    noteIds: [id],
    format: "html" as const,
    confirmation: "a".repeat(64),
  },
};
afterEach(() => vi.unstubAllGlobals());
describe("ZIP transport and explicit acknowledgement", () => {
  it.each([
    "ZIP_NOT_FOUND",
    "ZIP_CONTENT_CHANGED",
    "ZIP_SOURCE_CHANGED",
  ])("offers a new request for the typed %s response", (code) => {
    expect(zipNeedsNewRequest(new ZipRequestError("safe", code))).toBe(true);
    expect(zipNeedsNewRequest({ message: "safe", code })).toBe(false);
  });
  it("does not convert transient or unclassified failures into source invalidation", () => {
    expect(zipNeedsNewRequest(new Error("ZIP_NOT_FOUND"))).toBe(false);
    expect(
      zipNeedsNewRequest(new ZipRequestError("safe", "DATABASE_ERROR")),
    ).toBe(false);
    expect(
      zipNeedsNewRequest(new ZipRequestError("safe", "ZIP_DELIVERY_BUSY")),
    ).toBe(false);
    expect(zipNeedsNewRequest(new ZipRequestError("safe"))).toBe(false);
  });
  it("retains the safe code from a rejected native delivery preparation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              kind: "not_found",
              code: "ZIP_NOT_FOUND",
              message: "safe",
            },
          }),
          { status: 404 },
        ),
      ),
    );
    await expect(downloadZip(job)).rejects.toEqual(
      new ZipRequestError("safe", "ZIP_NOT_FOUND"),
    );
  });
  it("accepts HTML and Markdown and rejects PDF", () => {
    expect(zipCommandSchema.parse(command)).toEqual(command);
    expect(
      zipCommandSchema.safeParse({
        ...command,
        input: { ...command.input, format: "markdown" },
      }).success,
    ).toBe(true);
    expect(
      zipCommandSchema.safeParse({
        ...command,
        input: { ...command.input, format: "pdf" },
      }).success,
    ).toBe(false);
    expect(
      zipCommandSchema.safeParse({ ...command, extra: true }).success,
    ).toBe(false);
    expect(
      zipCommandSchema.safeParse({
        ...command,
        input: {
          ...command.input,
          noteIds: Array.from({ length: 501 }, () => id),
        },
      }).success,
    ).toBe(false);
  });
  it.each([
    "queued",
    "running",
    "assembling",
    "stopping",
  ] as const)("keeps %s active", (state) =>
    expect(zipActive({ state })).toBe(true));
  it.each([
    "succeeded",
    "partial",
    "failed",
    "cancelled",
  ] as const)("keeps %s terminal", (state) =>
    expect(zipActive({ state })).toBe(false));
  it("does not accept a response with missing history clocks", () => {
    const { finishedAt: _, ...missing } = job;
    expect(zipJobSchema.safeParse(missing).success).toBe(false);
  });
  it("adopts a valid receipt", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(job)));
    vi.stubGlobal("fetch", fetch);
    expect(await sendZip(command)).toEqual({ kind: "accepted", job });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    "business",
    "forbidden",
    "conflict",
    "validation",
  ])("distinguishes a definite %s rejection", async (kind) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { kind, message: "safe" } }), {
          status: 409,
        }),
      ),
    );
    expect(await sendZip(command)).toEqual({
      kind: "rejected",
      message: "safe",
    });
  });
  it.each([
    "network",
    "malformed",
    "system",
  ])("keeps %s ACK unknown and never retries automatically", async (fault) => {
    const fetch = vi.fn();
    if (fault === "network") fetch.mockRejectedValue(Error("offline"));
    else
      fetch.mockResolvedValue(
        new Response(
          fault === "malformed"
            ? "invalid"
            : JSON.stringify({ error: { kind: "system", message: "hidden" } }),
          { status: fault === "system" ? 500 : 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    expect(await sendZip(command)).toEqual({ kind: "unknown" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("returns only the native same-origin delivery route for the returned id", async () => {
    const reply = {
      id,
      path: `/api/zip/deliveries/${id}/file`,
      filename: "hollow-export.zip",
      expiresAt: job.historyExpiresAt,
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(reply)))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...reply, path: "https://outside.test/file" }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    expect(await downloadZip(job)).toBe(reply.path);
    await expect(downloadZip(job)).rejects.toThrow("取得先");
  });
});
