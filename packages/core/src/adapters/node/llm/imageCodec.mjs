import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(
  createRequire(import.meta.url).resolve("@repo/core/package.json"),
);
const { default: sharp } = await import(
  pathToFileURL(require.resolve("sharp")).href
);

const MAX_INPUT = 50 * 1024 * 1024;
const MAX_PNG = 8 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;
const codes = new Set([
  "LLM_IMAGE_CORRUPT",
  "LLM_IMAGE_UNSUPPORTED",
  "LLM_IMAGE_MULTIFRAME",
  "LLM_RESOURCE_LIMIT",
]);
const fail = (code = "LLM_IMAGE_CORRUPT") => {
  throw new Error(code);
};
function dimensions(width, height) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  )
    fail();
  if (width > 4096 || height > 4096 || width * height > MAX_PIXELS)
    fail("LLM_RESOURCE_LIMIT");
}
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++)
    value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes)
    value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function pngContainer(bytes) {
  let offset = 8;
  let first = true;
  let data = false;
  let dataEnded = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) fail();
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) fail();
    const tag = bytes.toString("ascii", offset + 4, offset + 8);
    if (
      !/^[A-Za-z]{4}$/.test(tag) ||
      crc(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)
    )
      fail();
    if (["acTL", "fcTL", "fdAT"].includes(tag)) fail("LLM_IMAGE_MULTIFRAME");
    if (first) {
      if (tag !== "IHDR" || length !== 13) fail();
      dimensions(
        bytes.readUInt32BE(offset + 8),
        bytes.readUInt32BE(offset + 12),
      );
      first = false;
    } else if (tag === "IHDR") fail();
    if (tag === "IDAT") {
      if (dataEnded) fail();
      data = true;
    } else if (data) dataEnded = true;
    if (tag === "IEND") {
      if (length !== 0 || !data || end !== bytes.length) fail();
      return;
    }
    if (
      tag[0] === tag[0].toUpperCase() &&
      !["IHDR", "PLTE", "IDAT"].includes(tag)
    )
      fail("LLM_IMAGE_UNSUPPORTED");
    offset = end;
  }
  fail();
}
function jpegContainer(bytes) {
  let offset = 2;
  let scanning = false;
  let seenScan = false;
  let seenFrame = false;
  while (offset < bytes.length) {
    if (scanning) {
      while (offset < bytes.length && bytes[offset] !== 255) offset++;
    }
    if (offset >= bytes.length || bytes[offset++] !== 255) fail();
    while (offset < bytes.length && bytes[offset] === 255) offset++;
    if (offset >= bytes.length) fail();
    const marker = bytes[offset++];
    if (scanning && (marker === 0 || (marker >= 0xd0 && marker <= 0xd7)))
      continue;
    scanning = false;
    if (marker === 0xd9) {
      if (!seenScan || !seenFrame || offset !== bytes.length) fail();
      return;
    }
    if (
      marker === 0xd8 ||
      marker === 0 ||
      marker === 1 ||
      (marker >= 0xd0 && marker <= 0xd7)
    )
      fail();
    if (offset + 2 > bytes.length) fail();
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) fail();
    if (
      marker === 0xe2 &&
      bytes.toString("ascii", offset + 2, offset + 6) === "MPF\0"
    )
      fail("LLM_IMAGE_MULTIFRAME");
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      if (![0xc0, 0xc1, 0xc2].includes(marker)) fail("LLM_IMAGE_UNSUPPORTED");
      if (length < 8 || seenFrame) fail();
      dimensions(
        bytes.readUInt16BE(offset + 5),
        bytes.readUInt16BE(offset + 3),
      );
      seenFrame = true;
    }
    if (marker === 0xda) {
      if (!seenFrame) fail();
      seenScan = true;
      scanning = true;
    }
    offset += length;
  }
  fail();
}
function webpContainer(bytes) {
  if (bytes.length < 12 || bytes.readUInt32LE(4) + 8 !== bytes.length) fail();
  let offset = 12;
  let images = 0;
  const seen = new Set();
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail();
    const tag = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + size + (size & 1);
    if (end > bytes.length || (size & 1 && bytes[end - 1] !== 0)) fail();
    if (["ANIM", "ANMF"].includes(tag)) fail("LLM_IMAGE_MULTIFRAME");
    if (!["VP8X", "VP8 ", "VP8L", "ALPH", "ICCP", "EXIF", "XMP "].includes(tag))
      fail("LLM_IMAGE_UNSUPPORTED");
    if (seen.has(tag)) fail();
    seen.add(tag);
    if (tag === "VP8X") {
      if (offset !== 12 || size !== 10) fail();
      if (bytes[offset + 8] & 2) fail("LLM_IMAGE_MULTIFRAME");
      dimensions(
        bytes.readUIntLE(offset + 12, 3) + 1,
        bytes.readUIntLE(offset + 15, 3) + 1,
      );
    }
    if (tag === "VP8 ") {
      if (
        size < 10 ||
        bytes[offset + 8] & 1 ||
        bytes.toString("hex", offset + 11, offset + 14) !== "9d012a"
      )
        fail();
      dimensions(
        bytes.readUInt16LE(offset + 14) & 0x3fff,
        bytes.readUInt16LE(offset + 16) & 0x3fff,
      );
      images++;
    }
    if (tag === "VP8L") {
      if (size < 5 || bytes[offset + 8] !== 0x2f) fail();
      const packed = bytes.readUInt32LE(offset + 9);
      dimensions((packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1);
      images++;
    }
    offset = end;
  }
  if (images !== 1 || offset !== bytes.length) fail();
}
function gifContainer(bytes) {
  if (bytes.length < 14) fail();
  const width = bytes.readUInt16LE(6);
  const height = bytes.readUInt16LE(8);
  dimensions(width, height);
  let offset = 13 + (bytes[10] & 128 ? 3 * 2 ** ((bytes[10] & 7) + 1) : 0);
  let frames = 0;
  const subblocks = () => {
    while (offset < bytes.length) {
      const length = bytes[offset++];
      if (length === 0) return;
      if (offset + length > bytes.length) fail();
      offset += length;
    }
    fail();
  };
  while (offset < bytes.length) {
    const tag = bytes[offset++];
    if (tag === 0x3b) {
      if (frames !== 1 || offset !== bytes.length) fail();
      return;
    }
    if (tag === 0x21) {
      if (offset >= bytes.length) fail();
      const kind = bytes[offset++];
      if (kind === 1) fail("LLM_IMAGE_UNSUPPORTED");
      if (![0xf9, 0xfe, 0xff].includes(kind)) fail("LLM_IMAGE_UNSUPPORTED");
      if (kind === 0xf9 && bytes[offset] !== 4) fail();
      if (kind === 0xff && bytes[offset] !== 11) fail();
      subblocks();
    } else if (tag === 0x2c) {
      if (++frames > 1) fail("LLM_IMAGE_MULTIFRAME");
      if (offset + 9 > bytes.length) fail();
      const left = bytes.readUInt16LE(offset);
      const top = bytes.readUInt16LE(offset + 2);
      const w = bytes.readUInt16LE(offset + 4);
      const h = bytes.readUInt16LE(offset + 6);
      if (!w || !h || left + w > width || top + h > height) fail();
      const packed = bytes[offset + 8];
      offset += 9 + (packed & 128 ? 3 * 2 ** ((packed & 7) + 1) : 0);
      if (offset >= bytes.length || bytes[offset] < 2 || bytes[offset] > 8)
        fail();
      offset++;
      subblocks();
    } else fail();
  }
  fail();
}
function container(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    pngContainer(bytes);
    return "png";
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    jpegContainer(bytes);
    return "jpeg";
  }
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    webpContainer(bytes);
    return "webp";
  }
  if (/^GIF8[79]a$/.test(bytes.toString("ascii", 0, 6))) {
    gifContainer(bytes);
    return "gif";
  }
  fail("LLM_IMAGE_UNSUPPORTED");
}
async function bounded(stream, maximum, retain) {
  let size = 0;
  const chunks = [];
  try {
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > maximum) fail("LLM_RESOURCE_LIMIT");
      if (retain) chunks.push(chunk);
    }
    return { size, bytes: retain ? Buffer.concat(chunks, size) : null };
  } finally {
    stream.destroy();
  }
}

export async function normalizeImage(input) {
  try {
    if (!(input instanceof Uint8Array) || !input.byteLength) fail();
    if (input.byteLength > MAX_INPUT) fail("LLM_RESOURCE_LIMIT");
    const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    const codec = container(bytes);
    const options = {
      animated: true,
      failOn: "warning",
      limitInputPixels: MAX_PIXELS,
    };
    const metadata = await sharp(bytes, options).metadata();
    if (metadata.format !== codec) fail();
    if ((metadata.pages ?? 1) !== 1) fail("LLM_IMAGE_MULTIFRAME");
    const orientation = metadata.orientation ?? 1;
    if (!Number.isInteger(orientation) || orientation < 1 || orientation > 8)
      fail();
    const sourceWidth = metadata.width;
    const sourceHeight = metadata.height;
    dimensions(sourceWidth, sourceHeight);
    const width = orientation >= 5 ? sourceHeight : sourceWidth;
    const height = orientation >= 5 ? sourceWidth : sourceHeight;
    const encoded = await bounded(
      sharp(bytes, options)
        .autoOrient()
        .toColourspace("srgb")
        .flatten({ background: "#ffffff" })
        .removeAlpha()
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }),
      MAX_PNG,
      true,
    );
    const png = encoded.bytes;
    if (!png?.length) fail();
    pngContainer(png);
    const fresh = await sharp(png, options).metadata();
    if (
      fresh.format !== "png" ||
      fresh.width !== width ||
      fresh.height !== height ||
      fresh.channels !== 3 ||
      fresh.depth !== "uchar" ||
      fresh.hasAlpha ||
      fresh.orientation ||
      fresh.exif ||
      fresh.icc ||
      fresh.xmp ||
      fresh.iptc ||
      (fresh.pages ?? 1) !== 1
    )
      fail();
    const decoded = await bounded(
      sharp(png, options).raw({ depth: "uchar" }),
      width * height * 3,
      false,
    );
    if (decoded.size !== width * height * 3) fail();
    return {
      png,
      metadata: {
        version: 1,
        ok: true,
        codec,
        sourceWidth,
        sourceHeight,
        orientation,
        width,
        height,
        bytes: png.length,
        sha256: createHash("sha256").update(png).digest("hex"),
      },
    };
  } catch (error) {
    throw new Error(
      codes.has(error?.message) ? error.message : "LLM_IMAGE_CORRUPT",
    );
  }
}
