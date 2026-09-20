import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { type FileHandle, open } from "node:fs/promises";
import path from "node:path";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  PdfBinarySourceReader,
  PdfSource,
} from "@repo/core/application/pdf/ports";
import { BusinessRuleError } from "@repo/core/domain/error";

const unavailable = () =>
  new BusinessRuleError(
    "PDF_MEDIA_UNAVAILABLE",
    "生成中に媒体が変わったか利用できなくなりました。現在のノートからやり直してください。",
  );

async function closeSource(file: FileHandle | undefined) {
  try {
    await file?.close();
  } catch {
    throw new SystemError(
      SystemErrorCode.PdfOwnershipUnknown,
      "PDF媒体の読み取り終了を確認できません。",
    );
  }
}

export class FilePdfSourceReader implements PdfBinarySourceReader {
  constructor(private readonly directory: string) {}
  async *read(
    source: PdfSource,
    signal: AbortSignal,
  ): AsyncIterable<Uint8Array> {
    let file: FileHandle | undefined;
    try {
      signal.throwIfAborted();
      if (!Number.isSafeInteger(source.bytes) || source.bytes < 1)
        throw unavailable();
      if (source.kind === "stored") {
        if (
          !/^[a-zA-Z0-9_-]{1,80}$/.test(source.key) ||
          !/^[a-f0-9]{64}$/.test(source.sha256)
        )
          throw unavailable();
        file = await open(
          path.join(this.directory, source.key),
          constants.O_RDONLY | constants.O_NOFOLLOW,
        );
        const stat = await file.stat();
        if (!stat.isFile() || stat.size !== source.bytes) throw unavailable();
      } else if (
        source.data.byteLength !== source.bytes ||
        source.bytes > 32768
      )
        throw unavailable();
      const hash = createHash("sha256");
      let offset = 0;
      while (offset < source.bytes) {
        signal.throwIfAborted();
        const chunk = Buffer.alloc(Math.min(65536, source.bytes - offset));
        if (file) {
          let read = 0;
          while (read < chunk.length) {
            signal.throwIfAborted();
            const result = await file.read(
              chunk,
              read,
              chunk.length - read,
              offset + read,
            );
            if (!result.bytesRead) throw unavailable();
            read += result.bytesRead;
          }
        } else if (source.kind === "inline")
          chunk.set(source.data.subarray(offset, offset + chunk.length));
        offset += chunk.length;
        hash.update(chunk);
        yield chunk;
      }
      signal.throwIfAborted();
      if (file && (await file.stat()).size !== source.bytes)
        throw unavailable();
      if (source.kind === "stored" && hash.digest("hex") !== source.sha256)
        throw unavailable();
    } catch {
      throw unavailable();
    } finally {
      await closeSource(file);
    }
  }
}
