import { validateIconInput } from "@repo/core/domain/workspace/icon";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { IsolatedWorkspaceIconProcessor } from "../workspaceIconProcessor";

const stream = (data: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(data);
      c.close();
    },
  });
describe("workspace icon safe representation", () => {
  for (const format of ["png", "jpeg", "webp"] as const)
    it(`normal ${format}, metadata removal and bounded output`, async () => {
      const source = await sharp({
        create: { width: 1200, height: 800, channels: 3, background: "red" },
      })
        .withMetadata({ orientation: 6 })
        .toFormat(format)
        .toBuffer();
      const out = await new IsolatedWorkspaceIconProcessor().process({
        body: stream(source),
        bytes: source.length,
        mime: `image/${format}`,
      });
      const meta = await sharp(out.data).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBeLessThanOrEqual(512);
      expect(meta.height).toBeLessThanOrEqual(512);
      expect(meta.exif).toBeUndefined();
      expect(meta.icc).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
      expect(out.data.length).toBeLessThanOrEqual(512 * 1024);
      if (format === "jpeg") expect(meta.height).toBe(512);
    });
  it("decodes all animation frames and emits the first static frame", async () => {
    const pixels = Buffer.concat([
      Buffer.alloc(32 * 32 * 3, 0),
      Buffer.alloc(32 * 32 * 3, 255),
    ]);
    const source = await sharp(pixels, {
      raw: { width: 32, height: 64, channels: 3, pageHeight: 32 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    const meta = await sharp(source, { animated: true }).metadata();
    expect(meta.pages).toBe(2);
    const out = await new IsolatedWorkspaceIconProcessor().process({
      body: stream(source),
      bytes: source.length,
      mime: "image/webp",
    });
    expect((await sharp(out.data).metadata()).pages ?? 1).toBe(1);
    expect((await sharp(out.data).stats()).channels[0]?.mean).toBeLessThan(5);
  });
  it("rejects spoofed MIME, corrupt bytes, truncation, and unsupported SVG", async () => {
    const png = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    for (const [data, mime] of [
      [png, "image/jpeg"],
      [png.subarray(0, png.length - 12), "image/png"],
      [Buffer.from("<svg/>"), "image/png"],
      [Buffer.from("invalid"), "image/webp"],
    ] as const)
      await expect(
        new IsolatedWorkspaceIconProcessor().process({
          body: stream(data),
          bytes: data.length,
          mime,
        }),
      ).rejects.toMatchObject({ name: "BusinessRuleError" });
  });
  it("input declared/actual mismatch and exact size boundary", async () => {
    expect(() => validateIconInput(5 * 1024 ** 2, "image/png")).not.toThrow();
    expect(() => validateIconInput(5 * 1024 ** 2 + 1, "image/png")).toThrow();
    for (const bytes of [1, 3])
      await expect(
        new IsolatedWorkspaceIconProcessor().process({
          body: stream(new Uint8Array(2)),
          bytes,
          mime: "image/png",
        }),
      ).rejects.toBeDefined();
  });
  it("over 40M pixels cannot bypass limits", async () => {
    const image = await sharp({
      create: { width: 8001, height: 5000, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    await expect(
      new IsolatedWorkspaceIconProcessor().process({
        body: stream(image),
        bytes: image.length,
        mime: "image/png",
      }),
    ).rejects.toBeDefined();
  });
  it("deadline cancels a stalled stream, leaves no filesystem input and releases admission", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    await expect(
      new IsolatedWorkspaceIconProcessor(20).process({
        body,
        bytes: 1,
        mime: "image/png",
      }),
    ).rejects.toMatchObject({ code: "ICON_TIMEOUT" });
    expect(cancelled).toBe(true);
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    expect(
      (
        await new IsolatedWorkspaceIconProcessor().process({
          body: stream(png),
          bytes: png.length,
          mime: "image/png",
        })
      ).width,
    ).toBe(1);
  });
  it("rejects more than 1000 animation frames rather than inspecting only the displayed first frame", async () => {
    const frames = 1001;
    const pixels = Buffer.alloc(8 * 8 * 3 * frames);
    for (let n = 0; n < frames; n++)
      pixels.fill(n % 2 ? 255 : 0, n * 192, (n + 1) * 192);
    const source = await sharp(pixels, {
      raw: { width: 8, height: 8 * frames, channels: 3, pageHeight: 8 },
    })
      .webp({ delay: Array.from({ length: frames }, () => 10), loop: 0 })
      .toBuffer();
    expect((await sharp(source, { animated: true }).metadata()).pages).toBe(
      frames,
    );
    await expect(
      new IsolatedWorkspaceIconProcessor().process({
        body: stream(source),
        bytes: source.length,
        mime: "image/webp",
      }),
    ).rejects.toMatchObject({ code: "IMPORT_RESOURCE_LIMIT" });
  });
  it("an aborted active worker exits and a later request still succeeds", async () => {
    const source = await sharp({
      create: { width: 2000, height: 2000, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    await expect(
      new IsolatedWorkspaceIconProcessor(5).process({
        body: stream(source),
        bytes: source.length,
        mime: "image/png",
      }),
    ).rejects.toMatchObject({ code: "ICON_TIMEOUT" });
    expect(
      (
        await new IsolatedWorkspaceIconProcessor().process({
          body: stream(source),
          bytes: source.length,
          mime: "image/png",
        })
      ).width,
    ).toBe(512);
  });
});
