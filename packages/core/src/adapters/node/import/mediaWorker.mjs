import dns from "node:dns";
import { open } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import tls from "node:tls";
import { parentPort, workerData } from "node:worker_threads";

const bad = () => {
  throw new Error("IMPORT_CORRUPT");
};
const limit = () => {
  throw new Error("IMPORT_RESOURCE_LIMIT");
};
const unsupported = () => {
  throw new Error("IMPORT_MEDIA_UNSUPPORTED");
};
net.connect = net.createConnection = net.Socket.prototype.connect = bad;
tls.connect = http.request = http.get = https.request = https.get = bad;
dns.lookup = dns.resolve = dns.promises.lookup = dns.promises.resolve = bad;
globalThis.fetch = bad;
syncBuiltinESMExports();

class Reader {
  constructor(file, size) {
    this.file = file;
    this.size = size;
    this.start = -1;
    this.cache = Buffer.alloc(0);
  }
  async read(offset, length) {
    if (
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(length) ||
      offset < 0 ||
      length < 0 ||
      offset + length > this.size
    )
      bad();
    if (length > 1024 * 1024) limit();
    if (
      offset >= this.start &&
      offset + length <= this.start + this.cache.length
    )
      return this.cache.subarray(
        offset - this.start,
        offset - this.start + length,
      );
    this.start = offset;
    this.cache = Buffer.alloc(
      Math.min(this.size - offset, Math.max(65536, length)),
    );
    const { bytesRead } = await this.file.read(
      this.cache,
      0,
      this.cache.length,
      offset,
    );
    if (bytesRead !== this.cache.length) bad();
    return this.cache.subarray(0, length);
  }
}

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let crc = n << 24;
  for (let bit = 0; bit < 8; bit++)
    crc = (crc << 1) ^ (crc & 0x80000000 ? 0x04c11db7 : 0);
  return crc >>> 0;
});
const crc16Table = Uint16Array.from({ length: 256 }, (_, n) => {
  let crc = n << 8;
  for (let bit = 0; bit < 8; bit++)
    crc = (crc << 1) ^ (crc & 0x8000 ? 0x8005 : 0);
  return crc & 65535;
});

async function riff(reader, kind) {
  const header = await reader.read(0, 12);
  const end = header.readUInt32LE(4) + 8;
  if (header.toString("ascii", 8) !== kind || end !== reader.size) bad();
  let offset = 12;
  let payload = 0;
  let block = 0;
  let fmt = false;
  while (offset < end) {
    const chunk = await reader.read(offset, 8);
    const name = chunk.toString("ascii", 0, 4);
    const bytes = chunk.readUInt32LE(4);
    if (offset + 8 + bytes + (bytes & 1) > end) bad();
    if (kind === "WAVE" && name === "fmt ") {
      if (bytes < 16) bad();
      const value = await reader.read(offset + 8, 16);
      if (
        !value.readUInt16LE(2) ||
        !value.readUInt32LE(4) ||
        !value.readUInt16LE(12)
      )
        bad();
      block = value.readUInt16LE(12);
      fmt = true;
    }
    if (
      name === "data" ||
      name === "VP8 " ||
      name === "VP8L" ||
      name === "ANMF"
    )
      payload += bytes;
    offset += 8 + bytes + (bytes & 1);
  }
  if (
    !payload ||
    (kind === "WAVE" && (!fmt || payload < block || payload % block))
  )
    bad();
}

async function flac(reader) {
  let offset = 4;
  let first = true;
  let last = false;
  let totalSamples = 0n;
  while (!last) {
    const header = await reader.read(offset, 4);
    const type = header[0] & 127;
    const bytes = header.readUIntBE(1, 3);
    last = Boolean(header[0] & 128);
    if (type === 127 || (first && (type !== 0 || bytes !== 34))) bad();
    if (offset + 4 + bytes > reader.size) bad();
    if (first) {
      const info = await reader.read(offset + 4, 34);
      if (
        info.readUInt16BE(0) < 16 ||
        info.readUInt16BE(2) < info.readUInt16BE(0) ||
        info.readUInt32BE(10) >>> 12 === 0
      )
        bad();
      totalSamples = info.readBigUInt64BE(10) & 0xfffffffffn;
    }
    offset += bytes + 4;
    first = false;
  }
  async function frameHeader(at) {
    const h = await reader.read(at, Math.min(16, reader.size - at));
    if (
      h.length < 6 ||
      h[0] !== 255 ||
      (h[1] & 254) !== 248 ||
      !(h[2] >> 4) ||
      (h[2] & 15) === 15 ||
      h[3] & 1 ||
      h[3] >> 4 > 10 ||
      [3, 7].includes((h[3] >> 1) & 7)
    )
      bad();
    let count = 1;
    if (h[4] >= 128) {
      count = 0;
      for (let mask = 128; h[4] & mask; mask >>= 1) count++;
      if (count < 2 || count > 7) bad();
      for (let i = 1; i < count; i++) if ((h[4 + i] & 192) !== 128) bad();
    }
    let length = 4 + count;
    const code = h[2] >> 4;
    const samples =
      code === 1
        ? 192
        : code < 6
          ? 576 << (code - 2)
          : code === 6
            ? h[length++] + 1
            : code === 7
              ? h.readUInt16BE(length) + 1
              : 256 << (code - 8);
    if (code === 7) length += 2;
    const rate = h[2] & 15;
    length += rate === 12 ? 1 : rate === 13 || rate === 14 ? 2 : 0;
    if (length >= h.length) bad();
    let crc = 0;
    for (const byte of h.subarray(0, length + 1)) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = ((crc << 1) ^ (crc & 128 ? 7 : 0)) & 255;
    }
    if (crc) bad();
    return { samples, length: length + 1 };
  }
  let current = await frameHeader(offset);
  let start = offset;
  let samples = 0n;
  let crc = 0;
  while (offset < reader.size) {
    const part = await reader.read(
      offset,
      Math.min(65536, reader.size - offset),
    );
    for (const byte of part) {
      crc = ((crc << 8) ^ crc16Table[((crc >> 8) ^ byte) & 255]) & 65535;
      offset++;
      if (crc === 0 && offset - start > current.length + 2) {
        if (offset === reader.size) samples += BigInt(current.samples);
        else {
          const next = await reader.read(
            offset,
            Math.min(2, reader.size - offset),
          );
          if (next[0] === 255 && (next[1] & 254) === 248) {
            samples += BigInt(current.samples);
            current = await frameHeader(offset);
            start = offset;
          }
        }
      }
    }
  }
  if (
    crc !== 0 ||
    samples === 0n ||
    (totalSamples !== 0n && samples !== totalSamples)
  )
    bad();
}

async function ogg(reader) {
  let offset = 0;
  const streams = new Map();
  while (offset < reader.size) {
    const header = await reader.read(offset, 27);
    if (
      header.toString("ascii", 0, 4) !== "OggS" ||
      header[4] !== 0 ||
      header[5] & 248
    )
      bad();
    const segments = await reader.read(offset + 27, header[26]);
    const bytes = 27 + segments.length + segments.reduce((a, b) => a + b, 0);
    const page = Buffer.from(await reader.read(offset, bytes));
    const expected = page.readUInt32LE(22);
    page.fill(0, 22, 26);
    let crc = 0;
    for (const byte of page)
      crc = ((crc << 8) ^ crcTable[((crc >>> 24) ^ byte) & 255]) >>> 0;
    if (crc !== expected) bad();
    const serial = header.readUInt32LE(14);
    const seq = header.readUInt32LE(18);
    const previous = streams.get(serial);
    if (!previous && (!(header[5] & 2) || seq !== 0 || header[5] & 1)) bad();
    if (
      previous &&
      (previous.ended ||
        seq !== previous.seq + 1 ||
        Boolean(header[5] & 1) !== previous.continued)
    )
      bad();
    const packets =
      (previous?.packets ?? 0) + segments.filter((n) => n < 255).length;
    const ended = Boolean(header[5] & 4);
    if (
      ended &&
      (!segments.length ||
        segments.at(-1) === 255 ||
        header.readBigUInt64LE(6) === 0n)
    )
      bad();
    streams.set(serial, {
      seq,
      ended,
      packets,
      continued: segments.at(-1) === 255,
    });
    offset += bytes;
    if (streams.size > 32) limit();
  }
  if (
    !streams.size ||
    [...streams.values()].some((s) => !s.ended || s.packets < 3)
  )
    bad();
}

async function mp3(reader) {
  let offset = 0;
  let end = reader.size;
  let frames = 0;
  if (end >= 128 && (await reader.read(end - 128, 3)).toString() === "TAG")
    end -= 128;
  if (end >= 32) {
    const ape = await reader.read(end - 32, 32);
    if (ape.toString("ascii", 0, 8) === "APETAGEX") {
      const size = ape.readUInt32LE(12);
      if (size < 32 || size > end) bad();
      end -= size;
      if (
        end >= 32 &&
        (await reader.read(end - 32, 8)).toString() === "APETAGEX"
      )
        end -= 32;
    }
  }
  while (
    offset + 10 <= end &&
    (await reader.read(offset, 3)).toString() === "ID3"
  ) {
    const tag = await reader.read(offset, 10);
    if (tag[3] < 2 || tag[3] > 4 || [...tag.subarray(6)].some((n) => n > 127))
      bad();
    const size = (tag[6] << 21) + (tag[7] << 14) + (tag[8] << 7) + tag[9];
    offset += 10 + size + (tag[3] === 4 && tag[5] & 16 ? 10 : 0);
    if (offset > end) bad();
  }
  while (offset < end) {
    const head = await reader.read(offset, Math.min(4, end - offset));
    if (head.every((n) => n === 0)) {
      while (offset < end) {
        const padding = await reader.read(
          offset,
          Math.min(65536, end - offset),
        );
        if (padding.some((n) => n !== 0)) bad();
        offset += padding.length;
      }
      break;
    }
    if (head.length !== 4 || head[0] !== 255 || (head[1] & 224) !== 224) bad();
    const version = (head[1] >> 3) & 3;
    const layer = (head[1] >> 1) & 3;
    const rateIndex = (head[2] >> 2) & 3;
    const bitIndex = head[2] >> 4;
    if (bitIndex === 0) unsupported();
    if (version === 1 || layer === 0 || rateIndex === 3 || bitIndex === 15)
      bad();
    const bitrates =
      version === 3
        ? layer === 3
          ? [
              0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416,
              448,
            ]
          : layer === 2
            ? [
                0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
                384,
              ]
            : [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
        : layer === 3
          ? [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256]
          : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const rate =
      [44100, 48000, 32000][rateIndex] /
      (version === 3 ? 1 : version === 2 ? 2 : 4);
    const padding = (head[2] >> 1) & 1;
    const size =
      layer === 3
        ? (Math.floor((12 * bitrates[bitIndex] * 1000) / rate) + padding) * 4
        : Math.floor(
            ((layer === 1 && version !== 3 ? 72 : 144) *
              bitrates[bitIndex] *
              1000) /
              rate,
          ) + padding;
    if (size < 8 || offset + size > end) bad();
    offset += size;
    frames++;
    if (frames > 2_000_000) limit();
  }
  if (!frames) bad();
}

async function mp4(reader) {
  const mdats = [];
  const tables = [];
  let boxes = 0;
  let ftyp = false;
  let moov = false;
  let fragmented = false;
  async function walk(start, end, depth, table) {
    if (depth > 16) limit();
    let offset = start;
    while (offset < end) {
      if (++boxes > 100000) limit();
      const header = await reader.read(offset, 8);
      let size = header.readUInt32BE(0);
      let head = 8;
      const type = header.toString("ascii", 4, 8);
      if (size === 1) {
        const extended = (await reader.read(offset + 8, 8)).readBigUInt64BE();
        if (extended > BigInt(reader.size)) bad();
        size = Number(extended);
        head = 16;
      }
      if (size === 0) size = end - offset;
      if (size < head || offset + size > end) bad();
      const body = offset + head;
      const until = offset + size;
      if (type === "ftyp") ftyp = size >= head + 8;
      if (type === "moov") moov = true;
      if (type === "moof") fragmented = true;
      if (type === "mdat") mdats.push([body, until]);
      if (["moov", "trak", "mdia", "minf", "stbl"].includes(type)) {
        const child = type === "stbl" ? {} : table;
        if (type === "stbl") tables.push(child);
        await walk(body, until, depth + 1, child);
      } else if (
        table &&
        ["stsz", "stz2", "stco", "co64", "stsc", "stsd", "stts"].includes(type)
      ) {
        if (table[type]) bad();
        table[type] = [body, until];
      }
      offset = until;
    }
  }
  await walk(0, reader.size, 0, null);
  if (fragmented) unsupported();
  if (!ftyp || !moov || !mdats.some(([a, b]) => b > a) || !tables.length) bad();
  let totalSamples = 0;
  for (const t of tables) {
    if (
      !t.stsd ||
      !t.stsc ||
      !t.stts ||
      !(t.stco || t.co64) ||
      !(t.stsz || t.stz2)
    )
      bad();
    const sizeBox = t.stsz ?? t.stz2;
    const sizes = await reader.read(sizeBox[0], 12);
    const uniform = t.stsz ? sizes.readUInt32BE(4) : 0;
    const fieldBits = t.stsz ? 32 : sizes[7];
    if (![4, 8, 16, 32].includes(fieldBits) || (!t.stsz && fieldBits === 32))
      bad();
    const samples = sizes.readUInt32BE(8);
    if (samples > 2_000_000) limit();
    if (!samples) continue;
    totalSamples += samples;
    if (
      !uniform &&
      sizeBox[0] + 12 + Math.ceil((samples * fieldBits) / 8) !== sizeBox[1]
    )
      bad();
    async function sampleSize(index) {
      if (uniform) return uniform;
      const value = await reader.read(
        sizeBox[0] + 12 + Math.floor((index * fieldBits) / 8),
        Math.max(1, fieldBits / 8),
      );
      return fieldBits === 4
        ? index % 2 === 0
          ? value[0] >> 4
          : value[0] & 15
        : value.readUIntBE(0, fieldBits / 8);
    }
    const chunkBox = t.stco ?? t.co64;
    const stride = t.stco ? 4 : 8;
    const chunks = (await reader.read(chunkBox[0], 8)).readUInt32BE(4);
    if (chunks > 2_000_000 || chunkBox[0] + 8 + chunks * stride !== chunkBox[1])
      bad();
    const mappings = (await reader.read(t.stsc[0], 8)).readUInt32BE(4);
    if (
      !mappings ||
      mappings > chunks ||
      t.stsc[0] + 8 + mappings * 12 !== t.stsc[1]
    )
      bad();
    const runs = [];
    for (let i = 0; i < mappings; i++) {
      const r = await reader.read(t.stsc[0] + 8 + i * 12, 12);
      const first = r.readUInt32BE(0);
      const count = r.readUInt32BE(4);
      if (
        !count ||
        !r.readUInt32BE(8) ||
        first > chunks ||
        (i === 0 ? first !== 1 : first <= runs.at(-1).first)
      )
        bad();
      runs.push({ first, count });
    }
    let sample = 0;
    let run = 0;
    for (let i = 0; i < chunks; i++) {
      if (runs[run + 1]?.first === i + 1) run++;
      const pointer = await reader.read(chunkBox[0] + 8 + i * stride, stride);
      const position =
        stride === 4
          ? pointer.readUInt32BE()
          : Number(pointer.readBigUInt64BE());
      let bytes = 0;
      for (let j = 0; j < runs[run].count; j++) {
        if (sample >= samples) bad();
        const size = await sampleSize(sample);
        if (!size) bad();
        bytes += size;
        sample++;
      }
      if (!mdats.some(([a, b]) => position >= a && position + bytes <= b))
        bad();
    }
    if (sample !== samples) bad();
  }
  if (!totalSamples) bad();
  // music-metadata requires stsz and throws for otherwise valid stz2 tables.
  if (tables.some((table) => table.stz2 && !table.stsz)) unsupported();
}

function memoryFile(data) {
  if (!Buffer.isBuffer(data)) bad();
  return {
    async stat() {
      return { size: data.length };
    },
    async read(target, offset, length, position) {
      if (
        ![offset, length, position].every(Number.isSafeInteger) ||
        offset < 0 ||
        length < 0 ||
        position < 0 ||
        offset + length > target.length ||
        position + length > data.length
      )
        bad();
      data.copy(target, offset, position, position + length);
      return { bytesRead: length };
    },
    async close() {},
  };
}
export async function validateMediaFile({ file, bytes, format }) {
  const handle =
    typeof file === "string" ? await open(file, "r") : memoryFile(file);
  try {
    if ((await handle.stat()).size !== bytes) bad();
    const reader = new Reader(handle, bytes);
    const head = await reader.read(0, Math.min(16, bytes));
    if (format === "image") {
      const { default: sharp } = await import("sharp");
      sharp.cache(false);
      sharp.concurrency(1);
      if (head.toString("ascii", 0, 4) === "RIFF") await riff(reader, "WEBP");
      else if (/^GIF8[79]a/.test(head.toString("ascii", 0, 6))) {
        if ((await reader.read(bytes - 1, 1))[0] !== 59) bad();
      } else if (head[0] === 255 && head[1] === 216) {
        if (
          !(
            await reader.read(Math.max(0, bytes - 1024), Math.min(bytes, 1024))
          ).includes(Buffer.from([255, 217]))
        )
          bad();
      } else if (head.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
        const tail = await reader.read(bytes - 12, 12);
        if (tail.toString("hex") !== "0000000049454e44ae426082") bad();
      } else bad();
      const image = sharp(file, {
        animated: true,
        failOn: "warning",
        limitInputPixels: 40_000_000,
        sequentialRead: true,
      });
      const info = await image.metadata();
      if (
        !info.width ||
        !info.height ||
        info.width * info.height > 40_000_000 ||
        (info.pages ?? 1) > 1000
      )
        limit();
      let decoded = 0;
      await pipeline(
        image.raw(),
        new Writable({
          write(chunk, _encoding, callback) {
            decoded += chunk.length;
            callback(
              decoded > 160_000_000 ? new Error("IMPORT_RESOURCE_LIMIT") : null,
            );
          },
        }),
      );
      if (!decoded) bad();
    } else {
      if (head.toString("ascii", 0, 4) === "RIFF") await riff(reader, "WAVE");
      else if (head.toString("ascii", 0, 4) === "fLaC") await flac(reader);
      else if (head.toString("ascii", 0, 4) === "OggS") await ogg(reader);
      else if (head.toString("ascii", 4, 8) === "ftyp") await mp4(reader);
      else await mp3(reader);
      const { parseFile } = await import("music-metadata");
      const metadata = await parseFile(file, {
        duration: true,
        skipCovers: true,
      });
      if (
        !metadata.format.codec ||
        !metadata.format.sampleRate ||
        !metadata.format.numberOfChannels ||
        !(metadata.format.duration > 0)
      )
        bad();
    }
  } finally {
    await handle.close();
  }
}
if (workerData.operation !== "inline")
  try {
    await validateMediaFile(workerData);
    parentPort.postMessage("ok");
  } catch (error) {
    parentPort.postMessage(
      ["IMPORT_RESOURCE_LIMIT", "IMPORT_MEDIA_UNSUPPORTED"].includes(
        error.message,
      )
        ? error.message
        : "IMPORT_CORRUPT",
    );
  }
