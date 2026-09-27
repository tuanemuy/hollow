import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { type FileHandle, open } from "node:fs/promises";
import path from "node:path";
import type {
  ExportSource,
  ExportSourceReader,
} from "@repo/core/application/export/source";
import type { OwnedObjectRead } from "@repo/core/application/ports/objectStorage";
import { BusinessRuleError } from "@repo/core/domain/error";

const unavailable = () =>
  new BusinessRuleError(
    "EXPORT_MEDIA_UNAVAILABLE",
    "書き出し中にメディアが変わったか利用できなくなりました。最新の内容からやり直してください。",
  );

export class FileExportSourceReader implements ExportSourceReader {
  constructor(private readonly directory: string) {}
  async open(source: ExportSource, signal: AbortSignal) {
    return (await this.createOwned(source, signal, true)).body;
  }
  async openOwned(
    source: ExportSource,
    signal: AbortSignal,
  ): Promise<OwnedObjectRead> {
    return this.createOwned(source, signal, false);
  }
  private async createOwned(
    source: ExportSource,
    signal: AbortSignal,
    eagerValidation: boolean,
  ): Promise<OwnedObjectRead> {
    let file: FileHandle | undefined;
    try {
      if (
        signal.aborted ||
        !Number.isSafeInteger(source.bytes) ||
        source.bytes < 1
      )
        throw unavailable();
      if (source.kind === "object") {
        if (!/^[a-zA-Z0-9_-]{1,80}$/.test(source.key)) throw unavailable();
        file = await open(
          path.join(this.directory, source.key),
          constants.O_RDONLY | constants.O_NOFOLLOW,
        );
        if (eagerValidation) {
          const info = await file.stat();
          if (!info.isFile() || info.size !== source.bytes) throw unavailable();
        }
      } else if (
        source.data.byteLength !== source.bytes ||
        source.bytes > 32768
      )
        throw unavailable();
    } catch {
      await file?.close();
      throw unavailable();
    }
    const handle = file;
    let offset = 0;
    let closed = false;
    let closePromise: Promise<void> | null = null;
    let resolveClosed!: () => void;
    let rejectClosed!: (error: unknown) => void;
    const nativeClosed = new Promise<void>((resolve, reject) => {
      resolveClosed = resolve;
      rejectClosed = reject;
    });
    void nativeClosed.catch(() => {});
    let prefix = true;
    let pending: Promise<void> | null = null;
    const hash = createHash("sha256");
    const encoder = new TextEncoder();
    function close(): Promise<void> {
      closed = true;
      closePromise ??= (handle?.close() ?? Promise.resolve()).then(
        resolveClosed,
        (error: unknown) => {
          rejectClosed(error);
          throw error;
        },
      );
      return closePromise;
    }
    const abort = () => {
      void pending?.finally(close).catch(() => {});
      if (!pending) void close().catch(() => {});
    };
    signal.addEventListener("abort", abort, { once: true });
    const body = new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          pending = (async () => {
            try {
              if (signal.aborted || closed) throw unavailable();
              if (prefix) {
                if (handle) {
                  const info = await handle.stat();
                  if (!info.isFile() || info.size !== source.bytes)
                    throw unavailable();
                }
                prefix = false;
                controller.enqueue(
                  encoder.encode(`data:${source.mime};base64,`),
                );
                return;
              }
              const wanted = Math.min(65535, source.bytes - offset);
              if (wanted > 0) {
                const chunk = Buffer.alloc(wanted);
                if (handle) {
                  let read = 0;
                  while (read < wanted) {
                    if (signal.aborted) throw unavailable();
                    const next = await handle.read(
                      chunk,
                      read,
                      wanted - read,
                      offset + read,
                    );
                    if (!next.bytesRead) throw unavailable();
                    read += next.bytesRead;
                  }
                } else if (source.kind === "inline")
                  chunk.set(source.data.subarray(offset, offset + wanted));
                offset += wanted;
                hash.update(chunk);
                controller.enqueue(encoder.encode(chunk.toString("base64")));
                return;
              }
              if (handle && (await handle.stat()).size !== source.bytes)
                throw unavailable();
              if (
                source.kind === "object" &&
                hash.digest("hex") !== source.sha256
              )
                throw unavailable();
              signal.removeEventListener("abort", abort);
              await close();
              controller.close();
            } catch {
              signal.removeEventListener("abort", abort);
              await close();
              controller.error(unavailable());
            }
          })();
          await pending;
          pending = null;
        },
        async cancel() {
          signal.removeEventListener("abort", abort);
          await pending;
          await close();
        },
      },
      { highWaterMark: 1 },
    );
    let resourceClose: Promise<void> | null = null;
    return {
      body,
      closed: nativeClosed,
      close: () => {
        resourceClose ??= (async () => {
          await pending?.catch(() => {});
          await close();
        })();
        return resourceClose;
      },
    };
  }
}
