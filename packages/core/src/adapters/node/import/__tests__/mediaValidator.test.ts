import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { IsolatedMediaValidator } from "../mediaValidator";

const extensions = [
  "png",
  "jpg",
  "gif",
  "webp",
  "wav",
  "flac",
  "mp3",
  "ogg",
  "m4a",
] as const;
const image = new Set<string>(["png", "jpg", "gif", "webp"]);
const source = (extension: string) =>
  readFile(new URL(`./fixtures/media-valid.${extension}`, import.meta.url));
const body = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
const validate = (
  bytes: Uint8Array,
  extension: string,
  validator = new IsolatedMediaValidator(),
) =>
  validator.validate({
    body: body(bytes),
    bytes: bytes.length,
    format: image.has(extension) ? "image" : "audio",
  });

describe("isolated media structure and payload validation", () => {
  it.each(
    extensions,
  )("accepts real FFmpeg %s with payload", async (extension) => {
    await expect(
      validate(await source(extension), extension),
    ).resolves.toBeUndefined();
  });
  it.each(extensions)("rejects truncated %s", async (extension) => {
    const bytes = await source(extension);
    await expect(
      validate(bytes.subarray(0, Math.floor(bytes.length * 0.8)), extension),
    ).rejects.toMatchObject({ code: "IMPORT_CORRUPT" });
  });
  it.each(extensions)("rejects header-only %s", async (extension) => {
    const bytes = await source(extension);
    await expect(
      validate(bytes.subarray(0, Math.min(40, bytes.length)), extension),
    ).rejects.toMatchObject({ code: "IMPORT_CORRUPT" });
  });
  it("accepts libpng's third-party interlaced PNG fixture", async () => {
    await expect(
      validate(
        await readFile(
          new URL("./fixtures/libpng-pngtest.png", import.meta.url),
        ),
        "png",
      ),
    ).resolves.toBeUndefined();
  });
  it.each([
    "gif",
    "webp",
  ])("decodes all frames of animated %s", async (extension) => {
    await expect(
      validate(
        await readFile(
          new URL(`./fixtures/media-animated.${extension}`, import.meta.url),
        ),
        extension,
      ),
    ).resolves.toBeUndefined();
  });
  it("accepts Opus in Ogg and VBR MP3 with legal trailing padding", async () => {
    await expect(
      validate(await source("opus.ogg"), "ogg"),
    ).resolves.toBeUndefined();
    await expect(
      validate(Buffer.concat([await source("mp3"), Buffer.alloc(1024)]), "mp3"),
    ).resolves.toBeUndefined();
  });
  it.each([
    "flac",
    "ogg",
  ])("rejects %s payload corruption despite a valid header", async (extension) => {
    const bytes = await source(extension);
    bytes[bytes.length - 10] = (bytes[bytes.length - 10] ?? 0) ^ 128;
    await expect(validate(bytes, extension)).rejects.toMatchObject({
      code: "IMPORT_CORRUPT",
    });
  });
  it("distinguishes unsupported compact M4A tables from corrupt sample bounds", async () => {
    const bytes = await source("m4a");
    const offset = bytes.indexOf("stsz") - 4;
    expect(offset).toBeGreaterThan(0);
    const count = bytes.readUInt32BE(offset + 16);
    const oldSize = bytes.readUInt32BE(offset);
    const compactSize = 20 + count * 2;
    const compact = Buffer.alloc(oldSize);
    compact.writeUInt32BE(compactSize);
    compact.write("stz2", 4);
    compact[15] = 16;
    compact.writeUInt32BE(count, 16);
    for (let index = 0; index < count; index++)
      compact.writeUInt16BE(
        bytes.readUInt32BE(offset + 20 + index * 4),
        20 + index * 2,
      );
    compact.writeUInt32BE(oldSize - compactSize, compactSize);
    compact.write("free", compactSize + 4);
    compact.copy(bytes, offset);
    await expect(validate(bytes, "m4a")).rejects.toMatchObject({
      code: "IMPORT_MEDIA_UNSUPPORTED",
    });
    bytes.writeUInt16BE(65535, offset + 20);
    await expect(validate(bytes, "m4a")).rejects.toMatchObject({
      code: "IMPORT_CORRUPT",
    });
  });
  it("accepts a WAV with a legal odd-sized padded ancillary chunk", async () => {
    const sourceBytes = await source("wav");
    const chunk = Buffer.alloc(12);
    chunk.write("JUNK");
    chunk.writeUInt32LE(3, 4);
    chunk.write("pad", 8);
    const bytes = Buffer.concat([
      sourceBytes.subarray(0, 12),
      chunk,
      sourceBytes.subarray(12),
    ]);
    bytes.writeUInt32LE(bytes.length - 8, 4);
    await expect(validate(bytes, "wav")).resolves.toBeUndefined();
  });
  it.each([
    "gif",
    "flac",
  ])("rejects the independent review's broken %s", async (extension) => {
    const bytes = Buffer.from(
      extension === "gif"
        ? "GIF89a12345678901234567890\n"
        : "fLaC12345678901234567890123456789012345678901234567890\n",
    );
    await expect(validate(bytes, extension)).rejects.toMatchObject({
      code: "IMPORT_CORRUPT",
    });
  });
  it("rejects stream length mismatch and releases admission after timeout", async () => {
    const bytes = await source("wav");
    await expect(
      new IsolatedMediaValidator().validate({
        body: body(bytes),
        bytes: bytes.length + 1,
        format: "audio",
      }),
    ).rejects.toMatchObject({ code: "IMPORT_CORRUPT" });
    await expect(
      validate(bytes, "wav", new IsolatedMediaValidator(1)),
    ).rejects.toMatchObject({ code: "IMPORT_TIMEOUT" });
    await expect(validate(bytes, "wav")).resolves.toBeUndefined();
  });
  it("scans a valid 200MiB WAV beyond the document limit using a stream", async () => {
    const size = 200 * 1024 * 1024 - 44;
    const header = Buffer.alloc(44);
    header.write("RIFF");
    header.writeUInt32LE(size + 36, 4);
    header.write("WAVEfmt ", 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(44100, 24);
    header.writeUInt32LE(88200, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(size, 40);
    let remaining = size;
    let first = true;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        if (first) {
          first = false;
          c.enqueue(header);
        } else if (remaining) {
          const bytes = Math.min(65536, remaining);
          remaining -= bytes;
          c.enqueue(new Uint8Array(bytes));
        } else c.close();
      },
    });
    await expect(
      new IsolatedMediaValidator().validate({
        body: stream,
        bytes: size + 44,
        format: "audio",
      }),
    ).resolves.toBeUndefined();
  }, 15000);
  it("rejects over-limit media before reading and cancels the stream", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    await expect(
      new IsolatedMediaValidator().validate({
        body: stream,
        bytes: 200 * 1024 * 1024 + 1,
        format: "audio",
      }),
    ).rejects.toMatchObject({ code: "IMPORT_RESOURCE_LIMIT" });
    expect(cancelled).toBe(true);
  });
});
