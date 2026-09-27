import { createHash } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import type { ExportSource } from "@repo/core/application/export/source";
import type { OwnedObjectRead } from "@repo/core/application/ports/objectStorage";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NodeZipSourceReader } from "./sources";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const signal = () => new AbortController().signal;
const releases: (() => void)[] = [];
const opened: OwnedObjectRead[] = [];
function gate() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  releases.push(release);
  return { promise, release };
}
function source(bytes: Buffer): Extract<ExportSource, { kind: "object" }> {
  return {
    kind: "object",
    id: "media",
    key: "object-key",
    mime: "image/png",
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}
function fixture(
  chunks: readonly Uint8Array[],
  options: {
    readError?: Error;
    closeError?: Error;
    closedError?: Error;
    closeGate?: Promise<void>;
  } = {},
) {
  let resolveClosed = () => {};
  let rejectClosed: (error: unknown) => void = () => {};
  const closed = new Promise<void>((resolve, reject) => {
    resolveClosed = resolve;
    rejectClosed = reject;
  });
  void closed.catch(() => {});
  let closePromise: Promise<void> | undefined;
  const closing = gate();
  const finishClose = () => {
    closePromise ??= (async () => {
      closing.release();
      await options.closeGate;
      if (options.closedError) rejectClosed(options.closedError);
      else if (options.closeError) rejectClosed(options.closeError);
      else resolveClosed();
      if (options.closeError) throw options.closeError;
    })();
    return closePromise;
  };
  let offset = 0;
  const raw: OwnedObjectRead = {
    body: new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          const chunk = chunks[offset++];
          if (chunk) controller.enqueue(chunk);
          else if (options.readError) controller.error(options.readError);
          else controller.close();
        },
        cancel: finishClose,
      },
      { highWaterMark: 1 },
    ),
    closed,
    close: vi.fn(finishClose),
  };
  const storage = { openOwnedRead: vi.fn(async () => raw) };
  const inline = {
    openOwned: vi.fn(async (): Promise<OwnedObjectRead> => {
      throw new Error("Unexpected inline source");
    }),
  };
  const adapter = new NodeZipSourceReader(storage, inline);
  return { raw, storage, inline, adapter, closing };
}
async function own(
  adapter: NodeZipSourceReader,
  value: ExportSource,
  inputSignal = signal(),
) {
  const result = await adapter.openOwned(value, inputSignal);
  opened.push(result);
  return result;
}
async function collect(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return { text: Buffer.concat(chunks).toString("utf8"), chunks };
}
afterEach(async () => {
  for (const release of releases.splice(0)) release();
  await Promise.allSettled(opened.splice(0).map((value) => value.close()));
});

describe("NodeZipSourceReader", () => {
  it.each(
    [[1, 1, 1, 1, 1], [2, 1, 2], [3, 2], [4, 1], [5]].map((sizes) => ({
      sizes,
    })),
  )("keeps base64 triples across chunk split $sizes", async ({ sizes }) => {
    const bytes = Buffer.from([0, 1, 127, 128, 255]);
    let offset = 0;
    const chunks = sizes.map((size) => {
      const chunk = bytes.subarray(offset, offset + size);
      offset += size;
      return chunk;
    });
    const test = fixture(chunks);
    const inputSignal = signal();
    const value = await own(test.adapter, source(bytes), inputSignal);
    expect((await collect(value.body)).text).toBe(
      `data:image/png;base64,${bytes.toString("base64")}`,
    );
    await value.closed;
    expect(test.storage.openOwnedRead).toHaveBeenCalledExactlyOnceWith(
      "object-key",
      inputSignal,
    );
    expect(test.raw.close).toHaveBeenCalledTimes(1);
    expect(test.inline.openOwned).not.toHaveBeenCalled();
    expect(value.close()).toBe(value.close());
  });

  it.each([
    1, 2, 3, 65_535, 65_536, 65_537, 150_003,
  ])("streams exact bytes/hash and bounded base64 segments for %s bytes", async (size) => {
    const bytes = Buffer.alloc(size, 143);
    const test = fixture([bytes]);
    const value = await own(test.adapter, source(bytes));
    const result = await collect(value.body);
    expect(result.text).toBe(
      `data:image/png;base64,${bytes.toString("base64")}`,
    );
    expect(
      Math.max(...result.chunks.map((chunk) => chunk.byteLength)),
    ).toBeLessThanOrEqual(87_384);
    await value.closed;
  });

  it("handles empty upstream chunks without adding padding midstream", async () => {
    const bytes = Buffer.from("abcde");
    const test = fixture([
      Buffer.alloc(0),
      bytes.subarray(0, 1),
      Buffer.alloc(0),
      bytes.subarray(1),
    ]);
    expect(
      (await collect((await own(test.adapter, source(bytes))).body)).text,
    ).toBe(`data:image/png;base64,${bytes.toString("base64")}`);
  });

  it.each([
    "short",
    "overread",
    "hash",
  ] as const)("rejects %s as source unavailable but proves native closure", async (fault) => {
    const bytes = Buffer.from("abcde");
    const test = fixture([bytes]);
    const expected = {
      ...source(bytes),
      bytes: fault === "short" ? 6 : fault === "overread" ? 4 : 5,
      sha256: fault === "hash" ? "0".repeat(64) : sha256(bytes),
    };
    const value = await own(test.adapter, expected);
    await expect(collect(value.body)).rejects.toMatchObject({
      code: "EXPORT_MEDIA_UNAVAILABLE",
    });
    await expect(value.closed).resolves.toBeUndefined();
    await expect(value.close()).resolves.toBeUndefined();
    expect(test.raw.close).toHaveBeenCalledTimes(1);
  });

  it("does not confuse errored-body cancel rejection with native close failure", async () => {
    const test = fixture([Buffer.from("abc")], {
      readError: new Error("private provider failure"),
    });
    const value = await own(test.adapter, source(Buffer.from("abc")));
    await expect(collect(value.body)).rejects.toMatchObject({
      code: "EXPORT_MEDIA_UNAVAILABLE",
    });
    await expect(value.closed).resolves.toBeUndefined();
    await expect(value.close()).resolves.toBeUndefined();
    expect(test.raw.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    "close",
    "closed",
  ] as const)("preserves raw %s rejection in the owned completion channel", async (fault) => {
    const failure = new Error("native closure unproven");
    const bytes = Buffer.from("abc");
    const test = fixture(
      [bytes],
      fault === "close" ? { closeError: failure } : { closedError: failure },
    );
    const value = await own(test.adapter, source(bytes));
    const rejected = expect(value.closed).rejects.toBe(failure);
    await expect(collect(value.body)).rejects.toMatchObject({
      code: "EXPORT_MEDIA_UNAVAILABLE",
    });
    await rejected;
    expect(value.close()).toBe(value.close());
    await expect(value.close()).rejects.toBe(failure);
    expect(test.raw.close).toHaveBeenCalledTimes(1);
  });

  it("does not finish EOF or closed before both native close signals settle", async () => {
    const held = gate();
    const bytes = Buffer.from("abcde");
    const test = fixture([bytes], { closeGate: held.promise });
    const value = await own(test.adapter, source(bytes));
    let finished = false;
    let closed = false;
    const reading = collect(value.body).then((result) => {
      finished = true;
      return result;
    });
    const closing = value.closed.then(() => {
      closed = true;
    });
    await test.closing.promise;
    expect(finished).toBe(false);
    expect(closed).toBe(false);
    held.release();
    expect((await reading).text).toBe(
      `data:image/png;base64,${bytes.toString("base64")}`,
    );
    await closing;
    expect(test.raw.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    "close",
    "closed",
  ] as const)("still waits when only raw %s completion is held", async (heldChannel) => {
    const held = gate();
    const otherCompleted = gate();
    const bytes = Buffer.from("abc");
    const test = fixture([bytes]);
    const nativeClose = test.raw.close.bind(test.raw);
    if (heldChannel === "closed")
      Object.assign(test.raw, { closed: held.promise });
    test.raw.close = vi.fn(async () => {
      await nativeClose();
      otherCompleted.release();
      if (heldChannel === "close") await held.promise;
    });
    const value = await own(test.adapter, source(bytes));
    let finished = false;
    let closed = false;
    const reading = collect(value.body).then(() => {
      finished = true;
    });
    const closing = value.closed.then(() => {
      closed = true;
    });
    await otherCompleted.promise;
    await setImmediate();
    expect(finished).toBe(false);
    expect(closed).toBe(false);
    held.release();
    await Promise.all([reading, closing]);
  });

  it.each([
    "close",
    "cancel",
    "abort",
  ] as const)("shares %s cleanup and waits for native close", async (operation) => {
    const held = gate();
    const controller = new AbortController();
    const test = fixture([Buffer.from("abcde")], { closeGate: held.promise });
    const value = await own(
      test.adapter,
      source(Buffer.from("abcde")),
      controller.signal,
    );
    let operationResult: Promise<unknown>;
    if (operation === "cancel") operationResult = value.body.cancel();
    else if (operation === "abort") {
      controller.abort();
      operationResult = value.closed;
    } else operationResult = value.close();
    const closing = value.close();
    expect(closing).toBe(value.close());
    let closed = false;
    const observed = closing.then(() => {
      closed = true;
    });
    await test.closing.promise;
    await setImmediate();
    expect(closed).toBe(false);
    held.release();
    await Promise.all([observed, operationResult, value.closed]);
    expect(test.raw.close).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending body read while initiating native close without deadlock", async () => {
    const controller = new AbortController();
    const pendingRead = gate();
    const finishRead = gate();
    const closed = gate();
    const raw: OwnedObjectRead = {
      body: new ReadableStream<Uint8Array>({
        async pull() {
          pendingRead.release();
          await finishRead.promise;
        },
        cancel() {
          finishRead.release();
        },
      }),
      closed: closed.promise,
      close: vi.fn(async () => {
        finishRead.release();
        closed.release();
      }),
    };
    const adapter = new NodeZipSourceReader(
      { openOwnedRead: async () => raw },
      {
        openOwned: async () => {
          throw new Error("unused");
        },
      },
    );
    const value = await own(
      adapter,
      source(Buffer.from("a")),
      controller.signal,
    );
    const reading = collect(value.body);
    const rejected = expect(reading).rejects.toMatchObject({
      code: "EXPORT_MEDIA_UNAVAILABLE",
    });
    await pendingRead.promise;
    controller.abort();
    await rejected;
    await value.closed;
    expect(raw.close).toHaveBeenCalledTimes(1);
  });

  it("does not open object storage on pre-abort", async () => {
    const test = fixture([Buffer.from("a")]);
    const controller = new AbortController();
    controller.abort();
    await expect(
      test.adapter.openOwned(source(Buffer.from("a")), controller.signal),
    ).rejects.toMatchObject({ code: "EXPORT_MEDIA_UNAVAILABLE" });
    expect(test.storage.openOwnedRead).not.toHaveBeenCalled();
    await test.raw.close();
  });

  it("returns closure evidence if abort occurs during storage acquisition", async () => {
    const controller = new AbortController();
    const bytes = Buffer.from("a");
    const test = fixture([bytes]);
    test.storage.openOwnedRead.mockImplementation(async () => {
      controller.abort();
      return test.raw;
    });
    const value = await own(test.adapter, source(bytes), controller.signal);
    await expect(collect(value.body)).rejects.toMatchObject({
      code: "EXPORT_MEDIA_UNAVAILABLE",
    });
    await expect(value.closed).resolves.toBeUndefined();
    expect(test.raw.close).toHaveBeenCalledTimes(1);
  });

  it("delegates inline sources and their owned completion without object IO", async () => {
    const bytes = Buffer.from("inline");
    const test = fixture([]);
    const inlineValue: ExportSource = {
      kind: "inline",
      id: "inline",
      mime: "image/png",
      bytes: bytes.length,
      data: bytes,
    };
    test.inline.openOwned.mockResolvedValue(test.raw);
    const inputSignal = signal();
    const value = await own(test.adapter, inlineValue, inputSignal);
    expect(value).toBe(test.raw);
    expect(test.inline.openOwned).toHaveBeenCalledExactlyOnceWith(
      inlineValue,
      inputSignal,
    );
    expect(test.storage.openOwnedRead).not.toHaveBeenCalled();
    await value.close();
  });

  it("open returns the same data URI behavior through the owned path", async () => {
    const bytes = Buffer.from("abc");
    const test = fixture([bytes]);
    expect(
      (await collect(await test.adapter.open(source(bytes), signal()))).text,
    ).toBe(`data:image/png;base64,${bytes.toString("base64")}`);
    await test.raw.closed;
  });

  it("reports missing owned storage explicitly", async () => {
    const adapter = new NodeZipSourceReader(
      {},
      {
        openOwned: async () => {
          throw new Error("unused");
        },
      },
    );
    await expect(
      adapter.openOwned(source(Buffer.from("a")), signal()),
    ).rejects.toMatchObject({ code: "ZIP_NOT_CONFIGURED" });
  });
});
