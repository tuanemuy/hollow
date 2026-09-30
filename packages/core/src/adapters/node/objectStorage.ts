import { createHash, randomUUID } from "node:crypto";
import { constants, createWriteStream } from "node:fs";
import { link, mkdir, open, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { ObjectWriteCloseUnprovenError } from "@repo/core/application/ports/objectOwnership";
import {
  ObjectReadCloseUnprovenError,
  type ObjectStorage,
  type OwnedObjectRandomRead,
  type OwnedObjectRead,
} from "@repo/core/application/ports/objectStorage";
import { BusinessRuleError } from "@repo/core/domain/error";
import { isSerializableError } from "@repo/core/lib/error";

export class FileObjectStorage implements ObjectStorage {
  constructor(
    private readonly directory: string,
    private readonly beforePublish?: () => Promise<void>,
  ) {}
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
  async putOwnedBounded(
    key: string,
    body: ReadableStream<Uint8Array>,
    maxBytes: number,
    signal?: AbortSignal,
  ) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0)
      throw new BusinessRuleError(
        "OBJECT_SIZE",
        "保存容量の設定を確認してください。",
      );
    const target = this.file(key);
    const staging = `${target}.part-${randomUUID()}`;
    const aborted = () => {
      if (signal?.aborted)
        throw new BusinessRuleError(
          "OBJECT_ABORTED",
          "保存は取り消されました。",
        );
    };
    aborted();
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    aborted();
    const file = await open(
      staging,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let cancellation: Promise<void> | null = null;
    let closePromise: Promise<void> | null = null;
    let closed = false;
    const close = () => {
      closePromise ??= Promise.resolve()
        .then(() => file.close())
        .then(
          () => {
            closed = true;
          },
          () => {
            throw new ObjectWriteCloseUnprovenError();
          },
        );
      return closePromise;
    };
    const cancel = () => {
      cancellation ??= reader?.cancel().catch(() => {}) ?? Promise.resolve();
    };
    let bytes = 0;
    const hash = createHash("sha256");
    try {
      reader = body.getReader();
      signal?.addEventListener("abort", cancel, { once: true });
      aborted();
      try {
        for (;;) {
          const next = await reader.read();
          aborted();
          if (next.done) break;
          if (bytes + next.value.byteLength > maxBytes)
            throw new BusinessRuleError(
              "IMPORT_SIZE",
              "指定サイズを超えたため保存を停止しました。",
            );
          let offset = 0;
          while (offset < next.value.byteLength) {
            aborted();
            const length = Math.min(65536, next.value.byteLength - offset);
            const written = await file.write(next.value, offset, length, bytes);
            if (written.bytesWritten < 1)
              throw new Error("Incomplete file write");
            bytes += written.bytesWritten;
            offset += written.bytesWritten;
          }
          hash.update(next.value);
        }
      } finally {
        cancel();
        await cancellation;
        await close();
      }
      aborted();
      await this.beforePublish?.();
      aborted();
      await link(staging, target);
      return { bytes, sha256: hash.digest("hex") };
    } catch (error) {
      if (
        error instanceof ObjectWriteCloseUnprovenError ||
        isSerializableError(error)
      )
        throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "ファイルを保存できませんでした。",
        error,
      );
    } finally {
      signal?.removeEventListener("abort", cancel);
      cancel();
      await cancellation;
      try {
        await close();
      } finally {
        try {
          if (closed) await unlink(staging);
        } finally {
          reader?.releaseLock();
        }
      }
    }
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
      await this.beforePublish?.();
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
  async openOwnedRead(
    key: string,
    signal?: AbortSignal,
  ): Promise<OwnedObjectRead> {
    if (signal?.aborted)
      throw new BusinessRuleError("OBJECT_ABORTED", "取得は取り消されました。");
    const file = await open(
      this.file(key),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    let resolveClosed!: () => void;
    let rejectClosed!: (error: unknown) => void;
    const closed = new Promise<void>((resolve, reject) => {
      resolveClosed = resolve;
      rejectClosed = reject;
    });
    void closed.catch(() => {});
    let closing: Promise<void> | null = null;
    let read: Promise<unknown> | null = null;
    let offset = 0;
    let inspected = false;
    const close = () => {
      closing ??= (async () => {
        signal?.removeEventListener("abort", abort);
        await read?.catch(() => {});
        try {
          await file.close();
          resolveClosed();
        } catch (error) {
          rejectClosed(error);
          throw error;
        }
      })();
      return closing;
    };
    const abort = () => {
      void close().catch(() => {});
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const body = new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          try {
            if (closing || signal?.aborted)
              throw new BusinessRuleError(
                "OBJECT_ABORTED",
                "取得は取り消されました。",
              );
            if (!inspected) {
              const info = await file.stat();
              if (!info.isFile() || !Number.isSafeInteger(info.size))
                throw new Error("Invalid object");
              inspected = true;
            }
            const buffer = Buffer.alloc(64 * 1024);
            const pending = file.read(buffer, 0, buffer.length, offset);
            read = pending;
            const { bytesRead } = await pending;
            read = null;
            if (closing || signal?.aborted)
              throw new BusinessRuleError(
                "OBJECT_ABORTED",
                "取得は取り消されました。",
              );
            if (!bytesRead) {
              await close();
              controller.close();
              return;
            }
            offset += bytesRead;
            controller.enqueue(buffer.subarray(0, bytesRead));
          } catch (error) {
            read = null;
            try {
              await close();
            } catch (closeError) {
              controller.error(closeError);
              return;
            }
            controller.error(error);
          }
        },
        cancel: close,
      },
      { highWaterMark: 1 },
    );
    return { body, closed, close };
  }
  async openOwnedRandomRead(
    key: string,
    signal?: AbortSignal,
  ): Promise<OwnedObjectRandomRead> {
    const aborted = () => {
      if (signal?.aborted)
        throw new BusinessRuleError(
          "OBJECT_ABORTED",
          "取得は取り消されました。",
        );
    };
    const invalid = () =>
      new BusinessRuleError(
        "OBJECT_READ_INVALID",
        "原本の読み取り条件を確認できません。",
      );
    const unavailable = () =>
      new BusinessRuleError(
        "OBJECT_READ_UNAVAILABLE",
        "原本を読み取れません。",
      );
    aborted();
    const file = await open(
      this.file(key),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    ).catch(() => {
      throw unavailable();
    });
    let resolveClosed!: () => void;
    let rejectClosed!: (error: unknown) => void;
    const closed = new Promise<void>((resolve, reject) => {
      resolveClosed = resolve;
      rejectClosed = reject;
    });
    void closed.catch(() => {});
    let closing: Promise<void> | null = null;
    let pending: Promise<Uint8Array> | null = null;
    const close = () => {
      closing ??= Promise.resolve().then(async () => {
        signal?.removeEventListener("abort", abort);
        await pending?.catch(() => {});
        try {
          await file.close();
          resolveClosed();
        } catch {
          const error = new ObjectReadCloseUnprovenError();
          rejectClosed(error);
          throw error;
        }
      });
      return closing;
    };
    const abort = () => {
      void close().catch(() => {});
    };
    let bytes: number;
    try {
      const info = await file.stat();
      if (!info.isFile() || !Number.isSafeInteger(info.size) || info.size < 0)
        throw invalid();
      bytes = info.size;
      aborted();
    } catch (error) {
      await close();
      if (isSerializableError(error)) throw error;
      throw unavailable();
    }
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    return {
      bytes,
      closed,
      close,
      readAt(offset, length) {
        if (closing || signal?.aborted)
          return Promise.reject(
            new BusinessRuleError("OBJECT_ABORTED", "取得は取り消されました。"),
          );
        if (
          pending ||
          !Number.isSafeInteger(offset) ||
          !Number.isSafeInteger(length) ||
          offset < 0 ||
          length < 1 ||
          length > 64 * 1024 ||
          offset > bytes - length
        )
          return Promise.reject(invalid());
        pending = (async () => {
          try {
            if ((await file.stat()).size !== bytes) throw invalid();
            if (closing) throw invalid();
            aborted();
            const buffer = Buffer.alloc(length);
            const { bytesRead } = await file.read(buffer, 0, length, offset);
            if (bytesRead !== length || (await file.stat()).size !== bytes)
              throw invalid();
            if (closing) throw invalid();
            aborted();
            return buffer;
          } catch (error) {
            if (isSerializableError(error)) throw error;
            throw unavailable();
          } finally {
            pending = null;
          }
        })();
        return pending;
      },
    };
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
    const names = await readdir(this.directory).catch((error: unknown) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        return [];
      throw error;
    });
    for (const name of names)
      if (name.startsWith(key + ".part-"))
        await unlink(path.join(this.directory, name));
  }
}
