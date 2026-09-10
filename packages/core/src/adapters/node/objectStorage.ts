import { createHash, randomUUID } from "node:crypto";
import { constants, createWriteStream } from "node:fs";
import { link, mkdir, open, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { ObjectStorage } from "@repo/core/application/ports/objectStorage";
import { BusinessRuleError } from "@repo/core/domain/error";
import { isSerializableError } from "@repo/core/lib/error";

export class FileObjectStorage implements ObjectStorage {
  constructor(private readonly directory: string) {}
  private file(key: string) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key))
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "Invalid object key",
      );
    return path.join(this.directory, key);
  }
  async put(
    key: string,
    body: ReadableStream<Uint8Array>,
    expectedBytes: number,
  ) {
    return this.write(key, body, expectedBytes, true);
  }
  async putBounded(
    key: string,
    body: ReadableStream<Uint8Array>,
    maxBytes: number,
    signal?: AbortSignal,
  ) {
    return this.write(key, body, maxBytes, false, signal);
  }
  private async write(
    key: string,
    body: ReadableStream<Uint8Array>,
    expectedBytes: number,
    exact: boolean,
    signal?: AbortSignal,
  ) {
    const target = this.file(key);
    const staging = target + ".part-" + randomUUID();
    let bytes = 0;
    const hash = createHash("sha256");
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    try {
      await pipeline(
        Readable.fromWeb(
          body as import("node:stream/web").ReadableStream<Uint8Array>,
        ),
        new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            bytes += chunk.length;
            if (bytes > expectedBytes) {
              callback(
                new BusinessRuleError(
                  "IMPORT_SIZE",
                  "指定サイズを超えたためアップロードを停止しました。",
                ),
              );
              return;
            }
            hash.update(chunk);
            callback(null, chunk);
          },
        }),
        createWriteStream(staging, { flags: "wx", mode: 0o600 }),
        {
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(5 * 60_000)])
            : AbortSignal.timeout(5 * 60_000),
        },
      );
      if (exact && bytes !== expectedBytes)
        throw new BusinessRuleError(
          "IMPORT_INCOMPLETE",
          "アップロードが途中で切れました。取り込み直してください。",
        );
      await link(staging, target);
      return { bytes, sha256: hash.digest("hex") };
    } catch (error) {
      if (isSerializableError(error)) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "原本を保存できませんでした。",
        error,
      );
    } finally {
      await unlink(staging).catch(() => {});
    }
  }
  async read(key: string, maxBytes = 200 * 1024 * 1024) {
    const file = await open(
      this.file(key),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const stat = await file.stat();
      const buffer = Buffer.alloc(Math.min(maxBytes, stat.size));
      let offset = 0;
      while (offset < buffer.length) {
        const r = await file.read(
          buffer,
          offset,
          buffer.length - offset,
          offset,
        );
        if (!r.bytesRead) break;
        offset += r.bytesRead;
      }
      return buffer.subarray(0, offset);
    } finally {
      await file.close();
    }
  }
  async stat(key: string) {
    const file = await open(
      this.file(key),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const info = await file.stat();
      if (!info.isFile()) throw new Error("Not a regular object");
      return { bytes: info.size };
    } finally {
      await file.close();
    }
  }
  async stream(key: string, range?: Readonly<{ start: number; end: number }>) {
    const file = await open(
      this.file(key),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    return Readable.toWeb(
      file.createReadStream(
        range ? { start: range.start, end: range.end } : undefined,
      ),
    ) as ReadableStream<Uint8Array>;
  }
  async remove(key: string) {
    const target = this.file(key);
    try {
      await unlink(target);
    } catch (error) {
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        )
      )
        throw error;
    }
    for (const name of await readdir(this.directory).catch(() => []))
      if (name.startsWith(key + ".part-"))
        await unlink(path.join(this.directory, name));
  }
}
