import { createHash } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import type {
  ZipOwnedSink,
  ZipOwnedSource,
  ZipWriterEntry,
} from "@repo/core/application/zip/writer";
import { ZIP_MANIFEST_NAME } from "@repo/core/domain/zip/entity";
import { describe, expect, it, vi } from "vitest";
import yauzl from "yauzl";
import { NodeZipWriter } from "./writer";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const gate = () => {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};
const signal = () => new AbortController().signal;

function sink() {
  const chunks: Buffer[] = [];
  const output: ZipOwnedSink = {
    write: vi.fn(async (chunk: Uint8Array) => {
      chunks.push(Buffer.from(chunk));
    }),
    finish: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  return { output, bytes: () => Buffer.concat(chunks) };
}

function entry(name = "東京.html", body = Buffer.from("<p>本文</p>")) {
  const source: ZipOwnedSource = {
    chunks: (async function* () {
      yield body;
    })(),
    close: vi.fn(async () => {}),
  };
  const value: ZipWriterEntry = {
    name,
    bytes: body.length,
    sha256: sha256(body),
    open: vi.fn(async () => source),
  };
  return { value, source };
}

async function contents(bytes: Buffer) {
  return new Promise<
    readonly { name: string; bytes: Buffer; method: number }[]
  >((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
      if (error) return reject(error);
      const found: { name: string; bytes: Buffer; method: number }[] = [];
      zip.on("error", reject);
      zip.on("end", () => resolve(found));
      zip.on("entry", (item: yauzl.Entry) => {
        zip.openReadStream(item, (cause, stream) => {
          if (cause) return reject(cause);
          const chunks: Buffer[] = [];
          stream.on("error", reject);
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", () => {
            found.push({
              name: item.fileName,
              bytes: Buffer.concat(chunks),
              method: item.compressionMethod,
            });
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

describe("NodeZipWriter STORE", () => {
  it("round trips Unicode entries and manifest in order with exact output bytes/hash/bound", async () => {
    const entries = [
      entry(),
      entry("empty.md", Buffer.alloc(0)),
      entry(ZIP_MANIFEST_NAME, Buffer.from("失敗: 1件\n")),
    ];
    const target = sink();
    const result = await NodeZipWriter.write({
      entries: entries.map(({ value }) => value),
      sink: target.output,
      signal: signal(),
    });
    expect(result).toEqual({
      bytes: target.bytes().length,
      sha256: sha256(target.bytes()),
    });
    expect(result.bytes).toBe(
      NodeZipWriter.upperBound(entries.map(({ value }) => value)),
    );
    expect(await contents(target.bytes())).toEqual([
      { name: "東京.html", bytes: Buffer.from("<p>本文</p>"), method: 0 },
      { name: "empty.md", bytes: Buffer.alloc(0), method: 0 },
      { name: ZIP_MANIFEST_NAME, bytes: Buffer.from("失敗: 1件\n"), method: 0 },
    ]);
    for (const item of entries)
      expect(item.source.close).toHaveBeenCalledTimes(1);
    expect(target.output.finish).toHaveBeenCalledTimes(1);
    expect(target.output.close).toHaveBeenCalledTimes(1);
  });

  it("accounts for 1GB equality and manifest overhead without allocating payload", () => {
    const entries = [
      { name: "a.md", bytes: 999_999_999 },
      { name: ZIP_MANIFEST_NAME, bytes: 1 },
    ];
    expect(NodeZipWriter.upperBound(entries)).toBe(
      1_000_000_000 + 22 + 184 + 2 * (4 + Buffer.byteLength(ZIP_MANIFEST_NAME)),
    );
    expect(NodeZipWriter.upperBound([{ name: "a", bytes: 999_999_999 }])).toBe(
      999_999_999 + 116,
    );
    expect(() =>
      NodeZipWriter.upperBound([...entries, { name: "b", bytes: 1 }]),
    ).toThrow(expect.objectContaining({ code: "ZIP_CAPACITY" }));
  });

  it("supports exactly 501 metadata entries and rejects 502", () => {
    const entries = Array.from({ length: 501 }, (_, index) => ({
      name: `${index}.md`,
      bytes: 0,
    }));
    expect(NodeZipWriter.upperBound(entries)).toBeGreaterThan(22);
    expect(() =>
      NodeZipWriter.upperBound([...entries, { name: "last.md", bytes: 0 }]),
    ).toThrow(expect.objectContaining({ code: "ZIP_CAPACITY" }));
  });

  it.each([
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER,
  ])("rejects invalid metadata bytes %s as capacity, not business oversize", (bytes) => {
    expect(() => NodeZipWriter.upperBound([{ name: "a", bytes }])).toThrow(
      expect.objectContaining({ code: "ZIP_CAPACITY" }),
    );
  });

  it.each([
    "",
    "../a",
    "a\\b",
    "a\u0000b",
    ".",
    "..",
    "あ".repeat(21846),
  ])("rejects unsupported flat name metadata %#", (name) => {
    expect(() => NodeZipWriter.upperBound([{ name, bytes: 0 }])).toThrow(
      expect.objectContaining({ code: "ZIP_CAPACITY" }),
    );
  });

  it("closes the supplied sink even when metadata is invalid and never opens a source", async () => {
    const item = entry();
    const target = sink();
    await expect(
      NodeZipWriter.write({
        entries: [{ ...item.value, bytes: 1_000_000_001 }],
        sink: target.output,
        signal: signal(),
      }),
    ).rejects.toMatchObject({ code: "ZIP_CAPACITY" });
    expect(item.value.open).not.toHaveBeenCalled();
    expect(target.output.close).toHaveBeenCalledTimes(1);
  });

  it("does not open the next source until the previous real close resolves", async () => {
    const held = gate();
    const closing = gate();
    const first = entry("a.md");
    const second = entry("b.md");
    first.source.close = vi.fn(() => {
      closing.release();
      return held.promise;
    });
    const target = sink();
    const writing = NodeZipWriter.write({
      entries: [first.value, second.value],
      sink: target.output,
      signal: signal(),
    });
    await closing.promise;
    expect(second.value.open).not.toHaveBeenCalled();
    held.release();
    await writing;
    expect(second.value.open).toHaveBeenCalledTimes(1);
    expect(first.source.close).toHaveBeenCalledTimes(1);
  });

  it("retains backpressure while a sink write is held", async () => {
    const blocked = gate();
    const started = gate();
    const body = Buffer.alloc(64 * 1024, 7);
    const total = 64;
    let pulled = 0;
    const source: ZipOwnedSource = {
      chunks: (async function* () {
        for (let index = 0; index < total; index++) {
          pulled++;
          yield body;
        }
      })(),
      close: vi.fn(async () => {}),
    };
    const hash = createHash("sha256");
    for (let index = 0; index < total; index++) hash.update(body);
    const target = sink();
    target.output.write = vi.fn(async () => {
      started.release();
      await blocked.promise;
    });
    const writing = NodeZipWriter.write({
      entries: [
        {
          name: "a.md",
          bytes: total * body.length,
          sha256: hash.digest("hex"),
          open: async () => source,
        },
      ],
      sink: target.output,
      signal: signal(),
    });
    await started.promise;
    for (let index = 0; index < 5; index++) await setImmediate();
    const heldAt = pulled;
    for (let index = 0; index < 5; index++) await setImmediate();
    expect(pulled).toBe(heldAt);
    expect(pulled).toBeLessThan(total);
    blocked.release();
    await writing;
    expect(pulled).toBe(total);
  });

  it.each([
    "short",
    "overread",
    "hash",
  ] as const)("rejects %s and closes both owners without opening siblings", async (fault) => {
    const first = entry("a.md", Buffer.from("abc"));
    const next = entry("b.md");
    const target = sink();
    const value = {
      ...first.value,
      bytes: fault === "short" ? 4 : fault === "overread" ? 2 : 3,
      sha256: fault === "hash" ? "0".repeat(64) : first.value.sha256,
    };
    await expect(
      NodeZipWriter.write({
        entries: [value, next.value],
        sink: target.output,
        signal: signal(),
      }),
    ).rejects.toMatchObject({ code: "ZIP_SOURCE_CHANGED" });
    expect(first.source.close).toHaveBeenCalledTimes(1);
    expect(next.value.open).not.toHaveBeenCalled();
    expect(target.output.close).toHaveBeenCalledTimes(1);
    expect(target.output.finish).not.toHaveBeenCalled();
  });

  it("rejects pre-aborted work without opening sources", async () => {
    const controller = new AbortController();
    controller.abort();
    const item = entry();
    const target = sink();
    await expect(
      NodeZipWriter.write({
        entries: [item.value],
        sink: target.output,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: "ZIP_ABORTED" });
    expect(item.value.open).not.toHaveBeenCalled();
    expect(target.output.close).toHaveBeenCalledTimes(1);
  });

  it("closes a late-opened source after cancellation without reading it", async () => {
    const controller = new AbortController();
    const opening = gate();
    const held = gate();
    const item = entry();
    const next = entry("b.md");
    const target = sink();
    item.value.open = vi.fn(async () => {
      opening.release();
      await held.promise;
      return item.source;
    });
    const writing = NodeZipWriter.write({
      entries: [item.value, next.value],
      sink: target.output,
      signal: controller.signal,
    });
    const rejected = expect(writing).rejects.toMatchObject({
      code: "ZIP_ABORTED",
    });
    await opening.promise;
    controller.abort();
    held.release();
    await rejected;
    expect(item.source.close).toHaveBeenCalledTimes(1);
    expect(next.value.open).not.toHaveBeenCalled();
  });

  it("interrupts pending source and sink IO on abort and waits for actual sink close", async () => {
    const controller = new AbortController();
    const reading = gate();
    const readEnd = gate();
    const writeEnd = gate();
    const sinkClosing = gate();
    const sinkClosed = gate();
    const source: ZipOwnedSource = {
      chunks: (async function* () {
        reading.release();
        await readEnd.promise;
        yield Buffer.alloc(0);
      })(),
      close: vi.fn(async () => readEnd.release()),
    };
    const target = sink();
    target.output.write = vi.fn(async () => writeEnd.promise);
    target.output.close = vi.fn(async () => {
      writeEnd.release();
      sinkClosing.release();
      await sinkClosed.promise;
    });
    const writing = NodeZipWriter.write({
      entries: [
        {
          name: "a.md",
          bytes: 0,
          sha256: sha256(Buffer.alloc(0)),
          open: async () => source,
        },
      ],
      sink: target.output,
      signal: controller.signal,
    });
    let settled = false;
    const observed = writing.catch((cause: unknown) => {
      settled = true;
      throw cause;
    });
    const rejected = expect(observed).rejects.toMatchObject({
      code: "ZIP_ABORTED",
    });
    await reading.promise;
    controller.abort();
    await sinkClosing.promise;
    await setImmediate();
    expect(settled).toBe(false);
    sinkClosed.release();
    await rejected;
    expect(source.close).toHaveBeenCalledTimes(1);
    expect(target.output.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    "source",
    "write",
    "finish",
    "open",
  ] as const)("translates %s I/O failure and closes every acquired owner", async (fault) => {
    const item = entry();
    const target = sink();
    const cause = () => {
      throw new Error("provider-specific-private-detail");
    };
    if (fault === "open") item.value.open = vi.fn(async () => cause());
    if (fault === "source")
      Object.assign(item.source, {
        chunks: (async function* () {
          yield Buffer.from("<");
          cause();
        })(),
      });
    if (fault === "write") target.output.write = vi.fn(async () => cause());
    if (fault === "finish") target.output.finish = vi.fn(async () => cause());
    await expect(
      NodeZipWriter.write({
        entries: [item.value],
        sink: target.output,
        signal: signal(),
      }),
    ).rejects.toMatchObject({
      code: "ZIP_WRITE_FAILED",
      message: "ZIPを生成できませんでした。",
    });
    expect(target.output.close).toHaveBeenCalledTimes(1);
    if (fault !== "open") expect(item.source.close).toHaveBeenCalledTimes(1);
  });

  it("does not return success when finalize/finish have resolved but sink close is pending", async () => {
    const closing = gate();
    const held = gate();
    const target = sink();
    target.output.close = vi.fn(async () => {
      closing.release();
      await held.promise;
    });
    let settled = false;
    const writing = NodeZipWriter.write({
      entries: [entry().value],
      sink: target.output,
      signal: signal(),
    }).then((result) => {
      settled = true;
      return result;
    });
    await closing.promise;
    expect(target.output.finish).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    held.release();
    await writing;
  });

  it.each([
    "finish",
    "close",
  ] as const)("cancels after output completion while sink %s is pending", async (stage) => {
    const controller = new AbortController();
    const pending = gate();
    const finished = gate();
    const closed = gate();
    const closing = gate();
    const target = sink();
    const item = entry();
    target.output.finish = vi.fn(async () => {
      if (stage === "finish") {
        pending.release();
        await finished.promise;
      }
    });
    target.output.close = vi.fn(async () => {
      closing.release();
      finished.release();
      if (stage === "close") pending.release();
      await closed.promise;
    });
    const writing = NodeZipWriter.write({
      entries: [item.value],
      sink: target.output,
      signal: controller.signal,
    });
    let settled = false;
    const observed = writing.catch((cause: unknown) => {
      settled = true;
      throw cause;
    });
    const rejected = expect(observed).rejects.toMatchObject({
      code: "ZIP_ABORTED",
    });
    await pending.promise;
    controller.abort();
    await closing.promise;
    await setImmediate();
    expect(settled).toBe(false);
    expect(item.source.close).toHaveBeenCalledTimes(1);
    closed.release();
    await rejected;
    expect(target.output.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    "source",
    "sink",
    "both",
  ] as const)("prioritizes %s close rejection over source failure", async (fault) => {
    const item = entry();
    const target = sink();
    if (fault !== "sink")
      item.source.close = vi.fn(async () => {
        throw new Error("close unknown");
      });
    if (fault !== "source")
      target.output.close = vi.fn(async () => {
        throw new Error("close unknown");
      });
    await expect(
      NodeZipWriter.write({
        entries: [{ ...item.value, sha256: "0".repeat(64) }],
        sink: target.output,
        signal: signal(),
      }),
    ).rejects.toMatchObject({ code: "ZIP_CLOSE_UNPROVEN" });
    expect(item.source.close).toHaveBeenCalledTimes(1);
    expect(target.output.close).toHaveBeenCalledTimes(1);
  });

  it("does not acquire the next source when a completed source cannot prove close", async () => {
    const first = entry("a.md");
    const next = entry("b.md");
    first.source.close = vi.fn(async () => {
      throw new Error("close unknown");
    });
    const target = sink();
    await expect(
      NodeZipWriter.write({
        entries: [first.value, next.value],
        sink: target.output,
        signal: signal(),
      }),
    ).rejects.toMatchObject({ code: "ZIP_CLOSE_UNPROVEN" });
    expect(next.value.open).not.toHaveBeenCalled();
    expect(first.source.close).toHaveBeenCalledTimes(1);
  });

  it("checks actual accumulated bytes at a scaled test-only boundary before overread classification", async () => {
    vi.resetModules();
    vi.doMock("@repo/core/domain/zip/entity", async (importOriginal) => ({
      ...(await importOriginal<
        typeof import("@repo/core/domain/zip/entity")
      >()),
      ZIP_MAX_PAYLOAD_BYTES: 4,
    }));
    try {
      const { NodeZipWriter: scaled } = await import("./writer");
      for (const size of [3, 4]) {
        await expect(
          scaled.write({
            entries: [entry("a", Buffer.alloc(size)).value],
            sink: sink().output,
            signal: signal(),
          }),
        ).resolves.toHaveProperty("sha256");
      }
      const first = entry("a", Buffer.alloc(3));
      const second = entry("b", Buffer.alloc(2));
      await expect(
        scaled.write({
          entries: [first.value, { ...second.value, bytes: 1 }],
          sink: sink().output,
          signal: signal(),
        }),
      ).rejects.toMatchObject({ code: "ZIP_TOO_LARGE" });
      expect(first.source.close).toHaveBeenCalledTimes(1);
      expect(second.source.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock("@repo/core/domain/zip/entity");
      vi.resetModules();
    }
  });
});
