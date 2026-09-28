import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeImage } from "./imageCodec.mjs";

const fixtures = new Map<string, Buffer>();
const children = new Map<ChildProcess, Promise<void>>();
let originalBytes = 0;
let normalizedBytes = 0;
const maximumDerivedBytes = 24 * 1024 * 1024;
const failureCodes = new Set([
  "LLM_IMAGE_CORRUPT",
  "LLM_IMAGE_UNSUPPORTED",
  "LLM_IMAGE_MULTIFRAME",
  "LLM_RESOURCE_LIMIT",
]);

function fixture(name: string): Buffer {
  const value = fixtures.get(name);
  if (!value) throw new Error("FIXTURE_MISSING");
  return value;
}
function remember(name: string, bytes: Buffer): void {
  originalBytes += bytes.length;
  if (
    fixtures.has(name) ||
    fixtures.size >= 24 ||
    originalBytes > 2 * 1024 * 1024
  ) {
    throw new Error("FIXTURE_LIMIT");
  }
  fixtures.set(name, bytes);
}
function derived(size: number): void {
  normalizedBytes += size;
  if (normalizedBytes > maximumDerivedBytes) throw new Error("DERIVED_LIMIT");
}
function crc(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}
function pngChunk(tag: string, data: Buffer): Buffer {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  result.write(tag, 4, "ascii");
  data.copy(result, 8);
  result.writeUInt32BE(
    crc(result.subarray(4, result.length - 4)),
    result.length - 4,
  );
  return result;
}
function dimensions(width: number, height: number): Buffer {
  const png = Buffer.from(fixture("png"));
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  png.writeUInt32BE(crc(png.subarray(12, 29)), 29);
  return png;
}
function animatedPng(png: Buffer): Buffer {
  const data: Buffer[] = [];
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") {
      data.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const control = (sequence: number) => {
    const bytes = Buffer.alloc(26);
    bytes.writeUInt32BE(sequence);
    bytes.writeUInt32BE(3, 4);
    bytes.writeUInt32BE(2, 8);
    bytes.writeUInt16BE(1, 20);
    bytes.writeUInt16BE(10, 22);
    return pngChunk("fcTL", bytes);
  };
  return Buffer.concat([
    png.subarray(0, 33),
    pngChunk("acTL", Buffer.from([0, 0, 0, 2, 0, 0, 0, 0])),
    control(0),
    pngChunk("IDAT", Buffer.concat(data)),
    control(1),
    pngChunk("fdAT", Buffer.concat([Buffer.from([0, 0, 0, 2]), ...data])),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
function animatedGif(gif: Buffer): Buffer {
  let offset = 13 + (gif[10] & 128 ? 3 * 2 ** ((gif[10] & 7) + 1) : 0);
  const blocks = (): void => {
    while (offset < gif.length) {
      const size = gif[offset++];
      if (size === 0) return;
      offset += size;
    }
    throw new Error("FIXTURE_GIF");
  };
  while (offset < gif.length) {
    const start = offset;
    const tag = gif[offset++];
    if (tag === 0x21) {
      offset++;
      blocks();
    } else if (tag === 0x2c) {
      const packed = gif[offset + 8];
      offset += 9 + (packed & 128 ? 3 * 2 ** ((packed & 7) + 1) : 0) + 1;
      blocks();
      return Buffer.concat([
        gif.subarray(0, gif.length - 1),
        gif.subarray(start, offset),
        Buffer.from([0x3b]),
      ]);
    } else throw new Error("FIXTURE_GIF");
  }
  throw new Error("FIXTURE_GIF");
}
async function resultCode(input: Uint8Array): Promise<string> {
  try {
    const value = await normalizeImage(input);
    derived(value.png.byteLength);
    return "SUCCESS";
  } catch (error) {
    return error instanceof Error && failureCodes.has(error.message)
      ? error.message
      : "UNSAFE_ERROR";
  }
}
async function valid(name: string) {
  const value = await normalizeImage(fixture(name));
  derived(value.png.byteLength);
  const metadata = await sharp(value.png).metadata();
  expect(value.metadata.version === 1 && value.metadata.ok).toBe(true);
  expect(value.metadata.bytes === value.png.byteLength).toBe(true);
  expect(
    value.metadata.sha256 ===
      createHash("sha256").update(value.png).digest("hex"),
  ).toBe(true);
  expect(
    metadata.format === "png" && metadata.channels === 3 && !metadata.hasAlpha,
  ).toBe(true);
  expect(
    !metadata.exif &&
      !metadata.icc &&
      !metadata.xmp &&
      !metadata.iptc &&
      !metadata.orientation,
  ).toBe(true);
  expect(
    metadata.width === value.metadata.width &&
      metadata.height === value.metadata.height,
  ).toBe(true);
  return value;
}

beforeAll(async () => {
  const image = () =>
    sharp({
      create: { width: 3, height: 2, channels: 3, background: "#e04020" },
    });
  remember("png", await image().png().toBuffer());
  remember("jpeg", await image().jpeg().toBuffer());
  remember("webp", await image().webp().toBuffer());
  remember("gif", await image().gif().toBuffer());
  remember(
    "orientation",
    await image().withMetadata({ orientation: 6 }).jpeg().toBuffer(),
  );
  remember("cmyk", await image().toColourspace("cmyk").jpeg().toBuffer());
  remember(
    "alpha",
    await sharp({
      create: {
        width: 2,
        height: 1,
        channels: 4,
        background: { r: 12, g: 40, b: 80, alpha: 0 },
      },
    })
      .png()
      .toBuffer(),
  );
  remember(
    "4096",
    await sharp({
      create: { width: 4096, height: 1, channels: 3, background: "#336699" },
    })
      .png()
      .toBuffer(),
  );
  remember("4097", dimensions(4097, 1));
  remember("over-pixels", dimensions(4000, 4001));
  remember("apng", animatedPng(fixture("png")));
  remember("animated-gif", animatedGif(fixture("gif")));
  const animation = Buffer.concat([
    Buffer.alloc(18, 32),
    Buffer.alloc(18, 192),
  ]);
  remember(
    "animated-webp",
    await sharp(animation, {
      raw: { width: 3, height: 4, channels: 3, pageHeight: 2 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer(),
  );
  expect(
    (await sharp(fixture("animated-webp"), { animated: true }).metadata())
      .pages,
  ).toBe(2);
  expect(
    (await sharp(fixture("animated-gif"), { animated: true }).metadata()).pages,
  ).toBe(2);
  remember(
    "mpf",
    Buffer.concat([
      fixture("jpeg").subarray(0, 2),
      Buffer.from([255, 226, 0, 6, 77, 80, 70, 0]),
      fixture("jpeg").subarray(2),
    ]),
  );
  const damaged = Buffer.from(fixture("png"));
  damaged[29] ^= 1;
  remember("crc", damaged);
  remember("truncated", fixture("png").subarray(0, fixture("png").length - 1));
  for (const codec of ["png", "jpeg", "webp", "gif"]) {
    remember(
      `trailing-${codec}`,
      Buffer.concat([fixture(codec), Buffer.from([0])]),
    );
  }
  remember("unknown", Buffer.from("synthetic-not-an-image"));
  let random = 17;
  const raw = Buffer.alloc(256 * 256 * 3);
  for (let index = 0; index < raw.length; index++) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    raw[index] = random >>> 24;
  }
  remember(
    "pipe",
    await sharp(raw, { raw: { width: 256, height: 256, channels: 3 } })
      .png()
      .toBuffer(),
  );
  remember("empty", Buffer.alloc(0));
  remember(
    "critical",
    Buffer.concat([
      fixture("png").subarray(0, 33),
      pngChunk("ABCD", Buffer.alloc(0)),
      fixture("png").subarray(33),
    ]),
  );
}, 15000);

afterAll(async () => {
  for (const child of children.keys()) {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGTERM");
  }
  await Promise.all(children.values());
  expect(children.size).toBe(0);
  expect(fixtures.size).toBe(24);
  expect(originalBytes <= 2 * 1024 * 1024).toBe(true);
  expect(normalizedBytes <= maximumDerivedBytes).toBe(true);
  fixtures.clear();
});

describe("single raster image codec", () => {
  it.each([
    "png",
    "jpeg",
    "webp",
    "gif",
  ])("fully normalizes static %s", async (codec) => {
    const result = await valid(codec);
    expect(result.metadata.codec === codec).toBe(true);
    expect(result.metadata.width === 3 && result.metadata.height === 2).toBe(
      true,
    );
  });
  it("applies EXIF orientation without resizing or retaining metadata", async () => {
    const result = await valid("orientation");
    expect(result.metadata.orientation).toBe(6);
    expect(
      result.metadata.sourceWidth === 3 && result.metadata.sourceHeight === 2,
    ).toBe(true);
    expect(result.metadata.width === 2 && result.metadata.height === 3).toBe(
      true,
    );
  });
  it("converts a CMYK JPEG into three sRGB channels", async () => {
    expect((await sharp(fixture("cmyk")).metadata()).space === "cmyk").toBe(
      true,
    );
    await valid("cmyk");
  });
  it("flattens transparent pixels onto white", async () => {
    const result = await valid("alpha");
    const pixels = await sharp(result.png).raw().toBuffer();
    expect(pixels.every((value) => value === 255)).toBe(true);
  });
  it("accepts exactly 4096 pixels without rescaling", async () => {
    const result = await valid("4096");
    expect(result.metadata.width === 4096 && result.metadata.height === 1).toBe(
      true,
    );
  });
  it.each([
    "4097",
    "over-pixels",
  ])("rejects %s by container dimensions before pixel allocation", async (name) => {
    expect(await resultCode(fixture(name))).toBe("LLM_RESOURCE_LIMIT");
  });
  it.each([
    "apng",
    "animated-gif",
    "animated-webp",
    "mpf",
  ])("does not accept only the first frame of %s", async (name) => {
    expect(await resultCode(fixture(name))).toBe("LLM_IMAGE_MULTIFRAME");
  });
  it.each([
    "crc",
    "truncated",
    "trailing-png",
    "trailing-jpeg",
    "trailing-webp",
    "trailing-gif",
    "empty",
  ])("rejects malformed whole-container %s", async (name) => {
    expect(await resultCode(fixture(name))).toBe("LLM_IMAGE_CORRUPT");
  });
  it.each([
    "unknown",
    "critical",
  ])("rejects unsupported %s without raw diagnostics", async (name) => {
    expect(await resultCode(fixture(name))).toBe("LLM_IMAGE_UNSUPPORTED");
  });
});

type ChildResult = Readonly<{
  bytes: Buffer;
  metadata: unknown;
  code: number | null;
  signal: NodeJS.Signals | null;
  pipesClosed: number;
  stderrBytes: number;
  heldReadable: boolean;
}>;
async function childResult(
  input: Uint8Array,
  pause: boolean,
): Promise<ChildResult> {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("./imageChild.mjs", import.meta.url))],
    {
      stdio: ["pipe", "pipe", "pipe", "pipe"],
      env: { LANG: "C", TZ: "UTC" },
    },
  );
  const metadata = child.stdio[3];
  if (
    !child.stdin ||
    !child.stdout ||
    !child.stderr ||
    !(metadata instanceof Readable)
  ) {
    throw new Error("FIXTURE_CHILD_PIPES");
  }
  const inputPipe = child.stdin;
  const outputPipe = child.stdout;
  const stderrPipe = child.stderr;
  const output: Buffer[] = [];
  const meta: Buffer[] = [];
  let outputBytes = 0;
  let metadataBytes = 0;
  let stderrBytes = 0;
  let pipesClosed = 0;
  let failed = false;
  let timedOut = false;
  let heldReadable = false;
  let code: number | null = null;
  let signal: NodeJS.Signals | null = null;
  const pipeClosures = [inputPipe, outputPipe, stderrPipe, metadata].map(
    (stream) =>
      new Promise<void>((resolve) => {
        stream.once("close", () => {
          pipesClosed++;
          resolve();
        });
        stream.on("error", () => {
          failed = true;
        });
      }),
  );
  const closed = new Promise<void>((resolve) => {
    child.once("close", (exitCode, exitSignal) => {
      code = exitCode;
      signal = exitSignal;
      resolve();
    });
  });
  const complete = Promise.all([closed, ...pipeClosures]).then(() => {
    children.delete(child);
  });
  children.set(child, complete);
  child.once("error", () => {
    failed = true;
  });
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, 10000);
  const stop = () => {
    failed = true;
    child.kill("SIGTERM");
  };
  outputPipe.on("data", (chunk: Buffer) => {
    outputBytes += chunk.length;
    if (outputBytes > 8 * 1024 * 1024) stop();
    else output.push(chunk);
  });
  metadata.on("data", (chunk: Buffer) => {
    metadataBytes += chunk.length;
    if (metadataBytes > 16384) stop();
    else meta.push(chunk);
  });
  stderrPipe.on("data", (chunk: Buffer) => {
    stderrBytes += chunk.length;
    if (stderrBytes > 4096) stop();
  });
  let resume: ReturnType<typeof setTimeout> | undefined;
  if (pause) {
    outputPipe.pause();
    outputPipe.once("readable", () => {
      heldReadable = outputBytes === 0 && outputPipe.readableLength > 0;
      resume = setTimeout(() => outputPipe.resume(), 50);
    });
  }
  inputPipe.end(input);
  try {
    await complete;
    if (failed || timedOut) throw new Error("FIXTURE_CHILD_INCOMPLETE");
    derived(outputBytes);
    let decoded: unknown;
    try {
      decoded = JSON.parse(Buffer.concat(meta, metadataBytes).toString("utf8"));
    } catch {
      throw new Error("FIXTURE_PROTOCOL");
    }
    return {
      bytes: Buffer.concat(output, outputBytes),
      metadata: decoded,
      code,
      signal,
      pipesClosed,
      stderrBytes,
      heldReadable,
    };
  } finally {
    clearTimeout(timer);
    if (resume !== undefined) clearTimeout(resume);
    outputPipe.resume();
  }
}

describe("native image child binary protocol", () => {
  it("awaits actual child and all four pipe closes after bounded backpressure", async () => {
    const result = await childResult(fixture("pipe"), true);
    expect(result.code).toBe(0);
    expect(result.signal === null).toBe(true);
    expect(result.pipesClosed).toBe(4);
    expect(result.stderrBytes).toBe(0);
    expect(result.heldReadable).toBe(true);
    expect(result.bytes.length > 65536).toBe(true);
    const value = result.metadata;
    expect(
      typeof value === "object" &&
        value !== null &&
        "ok" in value &&
        value.ok === true,
    ).toBe(true);
    expect(
      typeof value === "object" &&
        value !== null &&
        "bytes" in value &&
        value.bytes === result.bytes.length,
    ).toBe(true);
    expect(
      typeof value === "object" &&
        value !== null &&
        "sha256" in value &&
        value.sha256 ===
          createHash("sha256").update(result.bytes).digest("hex"),
    ).toBe(true);
    expect((await sharp(result.bytes).metadata()).format === "png").toBe(true);
    expect(children.size).toBe(0);
  }, 15000);
  it("returns one safe finite failure with no binary or stderr and actually exits", async () => {
    const result = await childResult(fixture("unknown"), false);
    expect(result.code).toBe(1);
    expect(result.signal === null).toBe(true);
    expect(result.pipesClosed).toBe(4);
    expect(result.bytes.length).toBe(0);
    expect(result.stderrBytes).toBe(0);
    const value = result.metadata;
    expect(
      typeof value === "object" &&
        value !== null &&
        "ok" in value &&
        value.ok === false &&
        "code" in value &&
        value.code === "LLM_IMAGE_UNSUPPORTED",
    ).toBe(true);
    expect(children.size).toBe(0);
  }, 15000);
});
