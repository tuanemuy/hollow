import type { ExportSourceReader } from "../export/source";
import { ObjectWriteCloseUnprovenError } from "../ports/objectOwnership";
import type { ObjectStorage, OwnedObjectRead } from "../ports/objectStorage";
import type { ZipSourceReader } from "./services";
import type { ZipOwnedSink, ZipOwnedSource } from "./writer";

export function zipStorageSink(
  write: ObjectStorage["putBounded"],
  key: string,
  upperBound: number,
  signal: AbortSignal,
) {
  const stop = new AbortController();
  const stream = new TransformStream<Uint8Array, Uint8Array>(
    undefined,
    new ByteLengthQueuingStrategy({ highWaterMark: 65536 }),
    new ByteLengthQueuingStrategy({ highWaterMark: 65536 }),
  );
  const writer = stream.writable.getWriter();
  const result = write(
    key,
    stream.readable,
    upperBound,
    AbortSignal.any([signal, stop.signal]),
  );
  void result.catch(() => {});
  let closePromise: Promise<void> | null = null;
  const sink: ZipOwnedSink = {
    write: (chunk) => writer.write(chunk),
    async finish() {
      await writer.close();
      await result;
    },
    close() {
      closePromise ??= (async () => {
        stop.abort();
        await writer.abort().catch(() => {});
        await result.then(
          () => {},
          (error) => {
            if (error instanceof ObjectWriteCloseUnprovenError) throw error;
          },
        );
      })();
      return closePromise;
    },
  };
  return { sink, result };
}

export function zipOwnedSource(owned: OwnedObjectRead): ZipOwnedSource {
  const reader = owned.body.getReader();
  let closePromise: Promise<void> | null = null;
  return {
    chunks: {
      async *[Symbol.asyncIterator]() {
        try {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            yield next.value;
          }
        } finally {
          reader.releaseLock();
        }
      },
    },
    close() {
      closePromise ??= (async () => {
        await reader.cancel().catch(() => {});
        await owned.close();
        await owned.closed;
      })();
      return closePromise;
    },
  };
}

export function trackZipSources(sources: ZipSourceReader) {
  const active = new Set<OwnedObjectRead>();
  const failed = new Set<OwnedObjectRead>();
  const reader: ExportSourceReader = {
    async open(source, signal) {
      const owned = await sources.openOwned(source, signal);
      active.add(owned);
      void owned.closed.then(
        () => active.delete(owned),
        () => {
          active.delete(owned);
          failed.add(owned);
        },
      );
      return owned.body;
    },
  };
  return {
    reader,
    async close(): Promise<boolean> {
      const opened = [...new Set([...active, ...failed])];
      const outcomes = await Promise.allSettled(
        opened.map(async (owned) => {
          await owned.close();
          await owned.closed;
        }),
      );
      return (
        failed.size === 0 &&
        outcomes.every((result) => result.status === "fulfilled")
      );
    },
  };
}
