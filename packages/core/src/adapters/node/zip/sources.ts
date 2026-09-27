import { createHash } from "node:crypto";
import type { ExportSource } from "@repo/core/application/export/source";
import type {
  ObjectStorage,
  OwnedObjectRead,
} from "@repo/core/application/ports/objectStorage";
import type { ZipSourceReader } from "@repo/core/application/zip/services";
import { BusinessRuleError } from "@repo/core/domain/error";

const unavailable = () =>
  new BusinessRuleError(
    "EXPORT_MEDIA_UNAVAILABLE",
    "書き出し中にメディアが変わったか利用できなくなりました。最新の内容からやり直してください。",
  );

export class NodeZipSourceReader implements ZipSourceReader {
  constructor(
    private readonly storage: Pick<ObjectStorage, "openOwnedRead">,
    private readonly inline: Pick<ZipSourceReader, "openOwned">,
  ) {}

  async open(source: ExportSource, signal: AbortSignal) {
    return (await this.openOwned(source, signal)).body;
  }

  async openOwned(
    source: ExportSource,
    signal: AbortSignal,
  ): Promise<OwnedObjectRead> {
    if (source.kind === "inline") return this.inline.openOwned(source, signal);
    if (!this.storage.openOwnedRead)
      throw new BusinessRuleError(
        "ZIP_NOT_CONFIGURED",
        "この配備ではZIP書き出しを利用できません。",
      );
    if (
      signal.aborted ||
      !Number.isSafeInteger(source.bytes) ||
      source.bytes < 1 ||
      !/^[0-9a-f]{64}$/u.test(source.sha256)
    )
      throw unavailable();
    const raw = await this.storage.openOwnedRead(source.key, signal);
    void raw.closed.catch(() => {});
    const reader = raw.body.getReader();
    let closePromise: Promise<void> | undefined;
    let resolveClosed: () => void = () => {};
    let rejectClosed: (error: unknown) => void = () => {};
    const closed = new Promise<void>((resolve, reject) => {
      resolveClosed = resolve;
      rejectClosed = reject;
    });
    void closed.catch(() => {});
    const close = (): Promise<void> => {
      closePromise ??= Promise.resolve().then(async () => {
        signal.removeEventListener("abort", abort);
        const nativeClose = Promise.resolve().then(() => raw.close());
        // An errored body can reject cancellation even after its native owner closed.
        const cancel = reader.cancel().catch(() => {});
        const [closeResult, closedResult] = await Promise.allSettled([
          nativeClose,
          raw.closed,
          cancel,
        ]);
        reader.releaseLock();
        if (closeResult.status === "rejected") throw closeResult.reason;
        if (closedResult.status === "rejected") throw closedResult.reason;
      });
      void closePromise.then(resolveClosed, rejectClosed);
      return closePromise;
    };
    const abort = () => {
      void close().catch(() => {});
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    const hash = createHash("sha256");
    let prefix = true;
    let count = 0;
    let buffer: Uint8Array | undefined;
    let offset = 0;
    let remainder = Buffer.alloc(0);
    const body = new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          try {
            if (signal.aborted || closePromise) throw unavailable();
            if (prefix) {
              prefix = false;
              controller.enqueue(Buffer.from(`data:${source.mime};base64,`));
              return;
            }
            for (;;) {
              if (signal.aborted || closePromise) throw unavailable();
              if (!buffer || offset === buffer.byteLength) {
                const next = await reader.read();
                if (signal.aborted || closePromise) throw unavailable();
                if (next.done) {
                  if (
                    count !== source.bytes ||
                    hash.digest("hex") !== source.sha256
                  )
                    throw unavailable();
                  await close();
                  if (signal.aborted) throw unavailable();
                  if (remainder.byteLength)
                    controller.enqueue(
                      Buffer.from(remainder.toString("base64")),
                    );
                  controller.close();
                  return;
                }
                buffer = next.value;
                offset = 0;
                if (buffer.byteLength > source.bytes - count)
                  throw unavailable();
              }
              const chunk = buffer.subarray(offset, offset + 64 * 1024);
              offset += chunk.byteLength;
              count += chunk.byteLength;
              hash.update(chunk);
              const joined = Buffer.concat([remainder, chunk]);
              const complete = joined.byteLength - (joined.byteLength % 3);
              remainder = Buffer.from(joined.subarray(complete));
              if (complete) {
                controller.enqueue(
                  Buffer.from(joined.subarray(0, complete).toString("base64")),
                );
                return;
              }
            }
          } catch {
            await close().catch(() => {});
            controller.error(unavailable());
          }
        },
        cancel: close,
      },
      { highWaterMark: 1 },
    );
    return { body, closed, close };
  }
}
