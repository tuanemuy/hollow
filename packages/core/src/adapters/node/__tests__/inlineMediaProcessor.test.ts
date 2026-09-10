import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { withParserAdmission } from "../import/documentExtractor";
import { IsolatedInlineMediaProcessor } from "../inlineMediaProcessor";

const stream = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
const inspect = (bytes: Uint8Array, timeout = 30_000) =>
  new IsolatedInlineMediaProcessor(timeout).inspect({
    body: stream(bytes),
    bytes: bytes.length,
  });
const fixture = (name: string) =>
  readFile(new URL(`../import/__tests__/fixtures/${name}`, import.meta.url));
const svg = (body: string) =>
  new TextEncoder().encode(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">${body}</svg>`,
  );

describe("isolated inline media", () => {
  it("cancels queued reference inspection without consuming admission and aborts an active stream", async () => {
    let releaseA = () => {};
    let releaseB = () => {};
    const a = withParserAdmission(
      () =>
        new Promise<void>((resolve) => {
          releaseA = resolve;
        }),
    );
    const b = withParserAdmission(
      () =>
        new Promise<void>((resolve) => {
          releaseB = resolve;
        }),
    );
    const controller = new AbortController();
    const queued = new IsolatedInlineMediaProcessor().inspect({
      body: stream(await fixture("media-valid.png")),
      bytes: 1,
      signal: controller.signal,
    });
    const rejected = expect(queued).rejects.toMatchObject({
      code: "IMPORT_TIMEOUT",
    });
    controller.abort();
    await rejected;
    releaseA();
    releaseB();
    await Promise.all([a, b]);
    const active = new AbortController();
    const pending = new IsolatedInlineMediaProcessor().inspect({
      body: new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new Uint8Array([1]));
        },
      }),
      bytes: 2,
      signal: active.signal,
    });
    const stopped = expect(pending).rejects.toMatchObject({
      code: "MEDIA_TIMEOUT",
    });
    active.abort();
    await stopped;
    await expect(
      inspect(await fixture("media-valid.png")),
    ).resolves.toMatchObject({ mime: "image/png" });
  });
  for (const [file, mime] of [
    ["media-valid.png", "image/png"],
    ["media-valid.jpg", "image/jpeg"],
    ["media-animated.gif", "image/gif"],
    ["media-animated.webp", "image/webp"],
    ["libpng-pngtest.png", "image/png"],
    ["tabler-photo.svg", "image/svg+xml"],
    ["mdn-flower.mp4", "video/mp4"],
    ["mdn-flower.webm", "video/webm"],
  ] as const) {
    it(`inspects real ${file} including payload`, async () => {
      const result = await inspect(await fixture(file));
      expect(result.mime).toBe(mime);
      expect(result.kind).toBe(mime.startsWith("image/") ? "image" : "video");
    });
    it(`rejects cut ${file}`, async () => {
      const bytes = await fixture(file);
      await expect(
        inspect(bytes.subarray(0, Math.floor(bytes.length * 0.8))),
      ).rejects.toMatchObject({ code: "MEDIA_CORRUPT" });
    });
  }
  it("retains viewBox, gradients, clipPath and Japanese text, stripping execution and all outside references", async () => {
    const result = await inspect(
      svg(
        '<defs><linearGradient id="color"><stop offset="0" stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient><clipPath id="cut"><circle cx="40" cy="40" r="30"/></clipPath></defs><rect width="120" height="80" fill="url(#color)" clip-path="url(#cut)"/><text x="2" y="20">日本語</text><script>parent.BAD=1</script><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">unsafe</div></foreignObject><style>rect{fill:url(https://example.test/trap)}</style><image href="https://example.test/image"/><use href="https://example.test/a.svg#x"/><circle onload="alert(1)" style="background:url(/trap)" fill="url(&#x68;ttps://example.test/a)"/>',
      ),
    );
    const output = new TextDecoder().decode(result.sanitizedSvg);
    expect(output).toContain('viewBox="0 0 120 80"');
    expect(output).toContain("linearGradient");
    expect(output).toContain("clipPath");
    expect(output).toContain("日本語");
    expect(output).not.toMatch(
      /script|foreignObject|onload|style=|https:|unsafe|<image/,
    );
    expect(result.removed.length).toBeGreaterThan(0);
  });
  it("rejects entity definitions, wrong roots, malformed XML and excessive depth", async () => {
    await expect(
      inspect(
        new TextEncoder().encode(
          '<!DOCTYPE svg [<!ENTITY boom SYSTEM "file:///etc/passwd">]><svg>&boom;</svg>',
        ),
      ),
    ).rejects.toMatchObject({ code: "MEDIA_UNSAFE_SVG" });
    await expect(inspect(svg("<g>"))).rejects.toMatchObject({
      code: "MEDIA_CORRUPT",
    });
    await expect(
      inspect(svg("<g>".repeat(70) + "</g>".repeat(70))),
    ).rejects.toMatchObject({ code: "MEDIA_RESOURCE_LIMIT" });
    await expect(
      inspect(
        new TextEncoder().encode(
          '<svg:svg xmlns:svg="http://www.w3.org/2000/svg"/>',
        ),
      ),
    ).rejects.toMatchObject({ code: "MEDIA_UNSUPPORTED" });
  });
  it("rejects header-only GIF, MIME disguise, empty video payload and size violations", async () => {
    await expect(inspect(Buffer.from("GIF89a"))).rejects.toMatchObject({
      code: "MEDIA_CORRUPT",
    });
    await expect(
      inspect(new TextEncoder().encode("not a jpeg")),
    ).rejects.toMatchObject({ code: "MEDIA_UNSUPPORTED" });
    const empty = Buffer.alloc(20);
    empty.writeUInt32BE(20);
    empty.write("ftypisom", 4);
    await expect(inspect(empty)).rejects.toBeDefined();
    await expect(
      new IsolatedInlineMediaProcessor().inspect({
        bytes: 201 * 1024 * 1024,
        body: stream(new Uint8Array()),
      }),
    ).rejects.toMatchObject({ code: "MEDIA_SIZE" });
    const large = Buffer.alloc(21 * 1024 * 1024);
    Buffer.from("89504e470d0a1a0a", "hex").copy(large);
    await expect(inspect(large)).rejects.toMatchObject({ code: "MEDIA_SIZE" });
  });
  it("terminates deadline work, releases admission, and rejects truncated input streams", async () => {
    const bytes = await fixture("mdn-flower.mp4");
    await expect(inspect(bytes, 1)).rejects.toMatchObject({
      code: "MEDIA_TIMEOUT",
    });
    await expect(
      inspect(await fixture("media-valid.png")),
    ).resolves.toMatchObject({ mime: "image/png" });
    await expect(
      new IsolatedInlineMediaProcessor().inspect({
        bytes: bytes.length + 1,
        body: stream(bytes),
      }),
    ).rejects.toMatchObject({ code: "MEDIA_CORRUPT" });
  });
});
