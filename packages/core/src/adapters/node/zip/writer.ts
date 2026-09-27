import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import type {
  ZipOwnedSource,
  ZipWriter,
  ZipWriterEntry,
} from "@repo/core/application/zip/writer";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  ZIP_MAX_PAYLOAD_BYTES,
  ZIP_MAX_TARGETS,
} from "@repo/core/domain/zip/entity";
import { ZipArchive } from "archiver";

const HIGH_WATER_MARK = 64 * 1024;
const messages = {
  ZIP_CAPACITY: "ZIPの生成容量を確保できませんでした。",
  ZIP_TOO_LARGE: "ZIPに含める内容が1GBを超えています。対象を分割してください。",
  ZIP_SOURCE_CHANGED: "ZIPに含める内容が変更されました。",
  ZIP_ABORTED: "ZIPの生成を中止しました。",
  ZIP_WRITE_FAILED: "ZIPを生成できませんでした。",
  ZIP_CLOSE_UNPROVEN: "ZIPの処理終了を確認できませんでした。",
} as const;
const error = (code: keyof typeof messages) =>
  new BusinessRuleError(code, messages[code]);

function upperBound(
  entries: readonly Pick<ZipWriterEntry, "name" | "bytes">[],
): number {
  if (entries.length > ZIP_MAX_TARGETS + 1) throw error("ZIP_CAPACITY");
  let payload = 0;
  let overhead = 22;
  const names = new Set<string>();
  for (const entry of entries) {
    const nameBytes = Buffer.byteLength(entry.name);
    if (
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      entry.bytes > ZIP_MAX_PAYLOAD_BYTES - payload ||
      !entry.name ||
      nameBytes > 65535 ||
      /[\p{Cc}\p{Cf}\p{Cs}/\\]/u.test(entry.name) ||
      entry.name === "." ||
      entry.name === ".." ||
      names.has(entry.name)
    ) {
      throw error("ZIP_CAPACITY");
    }
    names.add(entry.name);
    payload += entry.bytes;
    // Pinned stream STORE: local 30 + descriptor 16 + central 46, no extras/comments.
    overhead += 92 + 2 * nameBytes;
  }
  return payload + overhead;
}

function closed(stream: Readable): Promise<void> {
  return stream.closed
    ? Promise.resolve()
    : new Promise((resolve) => stream.once("close", resolve));
}

export const NodeZipWriter: ZipWriter = {
  upperBound,
  async write({ entries, sink, signal }) {
    let failure: BusinessRuleError<string> | undefined;
    let closeUnproven = false;
    let rejectFailure: (reason: BusinessRuleError<string>) => void = () => {};
    const failed = new Promise<never>((_, reject) => {
      rejectFailure = reject;
    });
    void failed.catch(() => {});
    const fail = (reason: unknown): void => {
      if (failure) return;
      failure =
        reason instanceof BusinessRuleError && reason.code in messages
          ? reason
          : error("ZIP_WRITE_FAILED");
      rejectFailure(failure);
    };
    const abort = (): void => fail(error("ZIP_ABORTED"));
    signal.addEventListener("abort", abort);
    const archive = new ZipArchive({
      store: true,
      forceZip64: false,
      highWaterMark: HIGH_WATER_MARK,
      statConcurrency: 1,
    });
    const archiveClosed = closed(archive);
    archive.on("error", fail);
    archive.on("warning", fail);
    let source: ZipOwnedSource | undefined;
    let sourceClose: Promise<void> | undefined;
    let bridge: Readable | undefined;
    let bridgeClosed: Promise<void> | undefined;
    let payload = 0;
    let bytes = 0;
    let maxOutput = 0;
    const outputHash = createHash("sha256");
    const closeSource = (): Promise<void> => {
      const owned = source;
      if (!owned) return Promise.resolve();
      sourceClose ??= Promise.resolve()
        .then(() => owned.close())
        .catch(() => {
          closeUnproven = true;
          fail(error("ZIP_CLOSE_UNPROVEN"));
        });
      return sourceClose;
    };
    let sinkClose: Promise<void> | undefined;
    const closeSink = (): Promise<void> => {
      sinkClose ??= Promise.resolve()
        .then(() => sink.close())
        .catch(() => {
          closeUnproven = true;
          fail(error("ZIP_CLOSE_UNPROVEN"));
        });
      return sinkClose;
    };
    const consume = (async () => {
      try {
        for await (const chunk of archive) {
          if (failure) throw failure;
          if (!Buffer.isBuffer(chunk) || chunk.byteLength > maxOutput - bytes) {
            throw error("ZIP_WRITE_FAILED");
          }
          await sink.write(chunk);
          outputHash.update(chunk);
          bytes += chunk.byteLength;
        }
        if (!failure) await sink.finish();
      } catch (reason) {
        fail(reason);
      }
    })();
    try {
      maxOutput = upperBound(entries);
      if (entries.some((entry) => !/^[0-9a-f]{64}$/u.test(entry.sha256))) {
        throw error("ZIP_SOURCE_CHANGED");
      }
      if (signal.aborted) abort();
      for (const entry of entries) {
        if (failure) throw failure;
        source = await entry.open(signal);
        if (failure || signal.aborted) throw failure ?? error("ZIP_ABORTED");
        const owned = source;
        const chunks = async function* (): AsyncGenerator<Uint8Array> {
          const hash = createHash("sha256");
          let count = 0;
          for await (const chunk of owned.chunks) {
            if (failure) throw failure;
            if (!(chunk instanceof Uint8Array))
              throw error("ZIP_SOURCE_CHANGED");
            if (chunk.byteLength > ZIP_MAX_PAYLOAD_BYTES - payload) {
              throw error("ZIP_TOO_LARGE");
            }
            payload += chunk.byteLength;
            count += chunk.byteLength;
            if (count > entry.bytes) throw error("ZIP_SOURCE_CHANGED");
            hash.update(chunk);
            yield chunk;
          }
          if (count !== entry.bytes || hash.digest("hex") !== entry.sha256) {
            throw error("ZIP_SOURCE_CHANGED");
          }
        };
        bridge = Readable.from(chunks(), {
          objectMode: false,
          highWaterMark: HIGH_WATER_MARK,
        });
        bridge.on("error", fail);
        bridgeClosed = closed(bridge);
        const appended = new Promise<void>((resolve) =>
          archive.once("entry", () => resolve()),
        );
        archive.append(bridge, {
          name: entry.name,
          store: true,
          date: new Date("2020-01-01T00:00:00Z"),
          mode: 0o600,
        });
        await Promise.race([appended, failed]);
        await bridgeClosed;
        await closeSource();
        if (failure) throw failure;
        source = undefined;
        sourceClose = undefined;
        bridge = undefined;
        bridgeClosed = undefined;
      }
      if (failure) throw failure;
      await Promise.race([archive.finalize(), failed]);
      await Promise.race([consume, failed]);
    } catch (reason) {
      fail(reason);
    } finally {
      if (bridge && !bridge.destroyed) bridge.destroy(failure);
      archive.abort();
      archive.destroy();
      const stopSource = closeSource();
      const stopSink = failure ? closeSink() : undefined;
      await archiveClosed;
      if (bridgeClosed) await bridgeClosed;
      await stopSource;
      await consume;
      await (stopSink ?? closeSink());
      signal.removeEventListener("abort", abort);
    }
    if (closeUnproven) throw error("ZIP_CLOSE_UNPROVEN");
    if (failure) throw failure;
    if (signal.aborted) throw error("ZIP_ABORTED");
    return { bytes, sha256: outputHash.digest("hex") };
  },
};
