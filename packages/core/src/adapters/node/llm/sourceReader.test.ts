import { createHash } from "node:crypto";
import {
  type FileHandle,
  mkdtemp,
  open,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileObjectStorage } from "../objectStorage";
import { NodeLlmSourceReader } from "./sourceReader";

vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof import("node:fs/promises")>();
  return { ...fs, open: vi.fn(fs.open) };
});
const roots: string[] = [];
const handles: FileHandle[] = [];
const releases: (() => void)[] = [];
const operations: Promise<unknown>[] = [];
afterEach(async () => {
  for (const release of releases.splice(0)) release();
  vi.restoreAllMocks();
  await Promise.allSettled(operations.splice(0));
  for (const handle of handles.splice(0))
    if (handle.fd !== -1) await handle.close();
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "hollow-llm-read-"));
  roots.push(root);
  const bytes = Buffer.from("日本語の原本\n");
  await writeFile(path.join(root, "source"), bytes);
  const storage = new FileObjectStorage(root);
  return {
    storage,
    reader: new NodeLlmSourceReader(storage),
    bytes,
    identity: {
      kind: "original" as const,
      originalId: "fixture",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.byteLength,
      format: "text" as const,
    },
  };
}
describe("LLM owned original read", () => {
  it("returns exact bytes only after native FileHandle close", async () => {
    const f = await fixture();
    const result = await f.reader.read(
      "source",
      f.identity,
      new AbortController().signal,
    );
    const opened = vi.mocked(open).mock.results.at(-1);
    if (opened?.type !== "return") throw Error("missing owned handle");
    const handle = await opened.value;
    handles.push(handle);
    expect(handle.fd).toBe(-1);
    expect(Buffer.from(result).equals(f.bytes)).toBe(true);
  });
  it.each([
    "short",
    "long",
    "hash",
  ])("rejects %s originals without leaving the native descriptor open", async (mode) => {
    const f = await fixture();
    const identity = {
      ...f.identity,
      bytes:
        f.identity.bytes + (mode === "short" ? 1 : mode === "long" ? -1 : 0),
      sha256: mode === "hash" ? "0".repeat(64) : f.identity.sha256,
    };
    await expect(
      f.reader.read("source", identity, new AbortController().signal),
    ).rejects.toHaveProperty("code", "LLM_SOURCE_CHANGED");
    const opened = vi.mocked(open).mock.results.at(-1);
    if (opened?.type !== "return") throw Error("missing owned handle");
    const handle = await opened.value;
    handles.push(handle);
    expect(handle.fd).toBe(-1);
  });
  it("keeps pending until actual native close and rejects cancellation after close", async () => {
    const f = await fixture();
    const controller = new AbortController();
    const nativeOpen = vi.mocked(open).getMockImplementation();
    if (!nativeOpen) throw Error("fixture open missing");
    let reached = false;
    let settled = false;
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    releases.push(release);
    vi.mocked(open).mockImplementationOnce(async (...args) => {
      const handle = await nativeOpen(...args);
      handles.push(handle);
      const close = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        reached = true;
        await gate;
        await close();
      });
      return handle;
    });
    const work = f.reader.read("source", f.identity, controller.signal);
    operations.push(work);
    void work.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await vi.waitFor(() => expect(reached).toBe(true));
    controller.abort();
    await setImmediate();
    expect(settled).toBe(false);
    release();
    await expect(work).rejects.toHaveProperty("closed", true);
    expect(handles.at(-1)?.fd).toBe(-1);
  });
  it("reports unknown instead of claiming close on a rejecting native close", async () => {
    const f = await fixture();
    const nativeOpen = vi.mocked(open).getMockImplementation();
    if (!nativeOpen) throw Error("fixture open missing");
    vi.mocked(open).mockImplementationOnce(async (...args) => {
      const handle = await nativeOpen(...args);
      handles.push(handle);
      vi.spyOn(handle, "close").mockRejectedValue(
        new Error("synthetic close failure"),
      );
      return handle;
    });
    await expect(
      f.reader.read("source", f.identity, new AbortController().signal),
    ).rejects.toMatchObject({ code: "LLM_OWNERSHIP_UNKNOWN", closed: false });
    expect(handles.at(-1)?.fd).not.toBe(-1);
  });
});
