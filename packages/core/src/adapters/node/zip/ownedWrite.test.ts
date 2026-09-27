import {
  type FileHandle,
  mkdtemp,
  open,
  readdir,
  readFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
import { ObjectWriteCloseUnprovenError } from "@repo/core/application/ports/objectOwnership";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileObjectStorage } from "../objectStorage";

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return { ...real, open: vi.fn(real.open) };
});
describe("owned ZIP native write close", () => {
  let root: string;
  let storage: FileObjectStorage;
  const releases: (() => void)[] = [];
  const handles: FileHandle[] = [];
  const tasks: Promise<unknown>[] = [];
  const bytes = new TextEncoder().encode("日本語ZIP bytes");
  const body = () =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  const gate = () => {
    let release!: () => void;
    const promise = new Promise<void>((yes) => {
      release = yes;
    });
    releases.push(release);
    return { promise, release };
  };
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-owned-write-"));
    storage = new FileObjectStorage(root);
  });
  afterEach(async () => {
    for (const release of releases.splice(0)) release();
    await Promise.allSettled(tasks.splice(0));
    vi.restoreAllMocks();
    for (const handle of handles.splice(0))
      if (handle.fd !== -1) await handle.close();
    await rm(root, { recursive: true, force: true });
  });
  async function observe(adjust: (handle: FileHandle) => void) {
    const real =
      await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await real.open(...args);
      handles.push(handle);
      adjust(handle);
      return handle;
    });
  }
  it("publishes bytes only after the native FD close resolves", async () => {
    const closing = gate();
    const allow = gate();
    let file: FileHandle | undefined;
    await observe((handle) => {
      file = handle;
      const close = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        closing.release();
        await allow.promise;
        await close();
      });
    });
    let finished = false;
    const task = storage
      .putOwnedBounded("fixture", body(), bytes.length)
      .then((value) => {
        finished = true;
        return value;
      });
    tasks.push(task);
    await closing.promise;
    await setImmediate();
    expect(finished).toBe(false);
    expect(file?.fd).toBeGreaterThanOrEqual(0);
    const files = await readdir(root);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^fixture\.part-/);
    allow.release();
    const result = await task;
    expect(result.bytes).toBe(bytes.length);
    expect(file?.fd).toBe(-1);
    expect(new Uint8Array(await readFile(path.join(root, "fixture")))).toEqual(
      bytes,
    );
    expect(await readdir(root)).toEqual(["fixture"]);
  });
  it("retains staging and reports unknown when native close rejects", async () => {
    let file: FileHandle | undefined;
    await observe((handle) => {
      file = handle;
      vi.spyOn(handle, "close").mockRejectedValue(
        new Error("synthetic close failure"),
      );
    });
    await expect(
      storage.putOwnedBounded("fixture", body(), bytes.length),
    ).rejects.toBeInstanceOf(ObjectWriteCloseUnprovenError);
    expect(file?.fd).toBeGreaterThanOrEqual(0);
    const files = await readdir(root);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^fixture\.part-/);
    vi.restoreAllMocks();
    if (file) await file.close();
    await storage.remove("fixture");
    expect(await readdir(root)).toEqual([]);
  });
  it("classifies a write failure with proven native close as ordinary failure", async () => {
    let file: FileHandle | undefined;
    await observe((handle) => {
      file = handle;
      vi.spyOn(handle, "write").mockRejectedValue(
        new Error("synthetic write failure"),
      );
    });
    let failure: unknown;
    try {
      await storage.putOwnedBounded("fixture", body(), bytes.length);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeDefined();
    expect(failure).not.toBeInstanceOf(ObjectWriteCloseUnprovenError);
    expect(file?.fd).toBe(-1);
    expect(await readdir(root)).toEqual([]);
  });
  it("does not publish a cancelled write while close is pending", async () => {
    const closing = gate();
    const allow = gate();
    const abort = new AbortController();
    let file: FileHandle | undefined;
    await observe((handle) => {
      file = handle;
      const close = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        closing.release();
        await allow.promise;
        await close();
      });
    });
    const task = storage.putOwnedBounded(
      "fixture",
      body(),
      bytes.length,
      abort.signal,
    );
    tasks.push(task);
    void task.catch(() => {});
    await closing.promise;
    abort.abort();
    await setImmediate();
    expect(file?.fd).toBeGreaterThanOrEqual(0);
    allow.release();
    await expect(task).rejects.toMatchObject({ code: "OBJECT_ABORTED" });
    expect(file?.fd).toBe(-1);
    expect(await readdir(root)).toEqual([]);
  });
  it("rejects over-bound bytes and body failure only after native close", async () => {
    await observe(() => {});
    await expect(
      storage.putOwnedBounded("large", body(), bytes.length - 1),
    ).rejects.toMatchObject({ code: "IMPORT_SIZE" });
    await expect(
      storage.putOwnedBounded(
        "failed",
        new ReadableStream({
          start(controller) {
            controller.error(Error("body failed"));
          },
        }),
        bytes.length,
      ),
    ).rejects.toBeDefined();
    expect(handles.every((handle) => handle.fd === -1)).toBe(true);
    expect(await readdir(root)).toEqual([]);
  });
});
