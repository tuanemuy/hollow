import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileExportSourceReader } from "../exportSourceReader";

describe("finite export source streaming", () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "hollow-export-source-"));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const source = (data: Uint8Array) => ({
    kind: "object" as const,
    id: "asset",
    key: "asset",
    mime: "image/png",
    bytes: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
  it("streams multiple base64 chunks without padding in the middle", async () => {
    const data = Buffer.alloc(300001, 127);
    await writeFile(path.join(directory, "asset"), data);
    const output = await new Response(
      await new FileExportSourceReader(directory).open(
        source(data),
        new AbortController().signal,
      ),
    ).text();
    expect(output).toBe(`data:image/png;base64,${data.toString("base64")}`);
  });
  it("rejects matching byte length with changed source sha", async () => {
    const data = Buffer.from("original");
    await writeFile(path.join(directory, "asset"), Buffer.from("modified"));
    await expect(
      new Response(
        await new FileExportSourceReader(directory).open(
          source(data),
          new AbortController().signal,
        ),
      ).text(),
    ).rejects.toMatchObject({ code: "EXPORT_MEDIA_UNAVAILABLE" });
  });
  it("rejects source size mismatch and missing source", async () => {
    const data = Buffer.from("original");
    const reader = new FileExportSourceReader(directory);
    await expect(
      reader.open(source(data), new AbortController().signal),
    ).rejects.toMatchObject({ code: "EXPORT_MEDIA_UNAVAILABLE" });
    await writeFile(path.join(directory, "asset"), "short");
    await expect(
      reader.open(source(data), new AbortController().signal),
    ).rejects.toMatchObject({ code: "EXPORT_MEDIA_UNAVAILABLE" });
  });
  it("cancel and abort close the source before completing", async () => {
    const data = Buffer.alloc(70000, 1);
    await writeFile(path.join(directory, "asset"), data);
    const controller = new AbortController();
    const reader = (
      await new FileExportSourceReader(directory).open(
        source(data),
        controller.signal,
      )
    ).getReader();
    await reader.read();
    controller.abort();
    await reader.cancel();
    await expect(
      new FileExportSourceReader(directory).open(
        source(data),
        controller.signal,
      ),
    ).rejects.toMatchObject({ code: "EXPORT_MEDIA_UNAVAILABLE" });
  });
  it("keeps legitimate small inline source portable and rejects overlimit inputs", async () => {
    const data = Buffer.from("small");
    const reader = new FileExportSourceReader(directory);
    const input = {
      kind: "inline" as const,
      id: "inline",
      mime: "image/png",
      bytes: data.length,
      data,
    };
    expect(
      await new Response(
        await reader.open(input, new AbortController().signal),
      ).text(),
    ).toBe(`data:image/png;base64,${data.toString("base64")}`);
    await expect(
      reader.open(
        { ...input, bytes: 32769, data: Buffer.alloc(32769) },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "EXPORT_MEDIA_UNAVAILABLE" });
  });
});
