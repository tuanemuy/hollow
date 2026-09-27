import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { ExportDocumentInput } from "@repo/core/application/export/document";
import { ZipExecutionUnprovenError } from "@repo/core/application/zip/executionError";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { IsolatedZipDocumentWriter } from "./documentWriter";

const input: ExportDocumentInput = {
  noteId: "note",
  title: "fixture",
  html: "<p>x</p>",
  style: "original",
  defaultCss: "",
  appUrl: "https://hollow.example",
  format: "html",
  media: [],
  external: { images: [], media: [], backgrounds: [], fonts: [] },
};
const nativeTerminate = Worker.prototype.terminate;
const fixture = `
import { parentPort, workerData as input } from 'node:worker_threads';
const value = {
  profile: 'hollow-export-document-v2',
  filename: input.title + (input.format === 'html' ? '.html' : '.md'),
  mime: input.format === 'html' ? 'text/html; charset=utf-8' : 'text/markdown; charset=utf-8',
  maxBytes: 7, notices: [], segments: [{kind:'text',value:'fixture'}]
};
parentPort.on('message', command => { if (command === 'late') parentPort.postMessage({ok:true,value}); });
setInterval(() => {}, 1000);
if (input.title === 'crash') throw new Error('not-for-output');
else if (input.title === 'exit') process.exit(0);
else if (input.title === 'failure') parentPort.postMessage({ok:false,code:'untrusted-secret'});
else if (input.title === 'known') parentPort.postMessage({ok:false,code:'EXPORT_MEDIA_UNAVAILABLE'});
else if (input.title === 'invalid') parentPort.postMessage({ok:true,value:{...value,maxBytes:8}});
else if (input.title !== 'hang') parentPort.postMessage({ok:true,value});
`;

describe("ZIP isolated document planning owns worker exit", () => {
  let root: string;
  let writer: IsolatedZipDocumentWriter;
  let workers: Map<Worker, { exited: boolean; exit: Promise<void> }>;
  let terminate: MockInstance<Worker["terminate"]>;
  let release: (() => void) | undefined;

  function track(worker: Worker) {
    if (!workers.has(worker)) {
      const state = { exited: false, exit: Promise.resolve() };
      state.exit = new Promise<void>((resolve) =>
        worker.once("exit", () => {
          state.exited = true;
          resolve();
        }),
      );
      workers.set(worker, state);
    }
  }
  function gateTermination() {
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    terminate.mockImplementation(function (this: Worker) {
      track(this);
      return gate.then(() => nativeTerminate.call(this));
    });
  }
  beforeEach(async () => {
    workers = new Map();
    release = undefined;
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-document-test-"));
    const workerPath = path.join(root, "plan.mjs");
    await writeFile(workerPath, fixture);
    writer = new IsolatedZipDocumentWriter(workerPath);
    terminate = vi
      .spyOn(Worker.prototype, "terminate")
      .mockImplementation(function (this: Worker) {
        track(this);
        return nativeTerminate.call(this);
      });
  });
  afterEach(async () => {
    vi.useRealTimers();
    release?.();
    for (const [worker, state] of workers) {
      if (!state.exited) await nativeTerminate.call(worker);
      await state.exit;
      expect(state.exited).toBe(true);
    }
    terminate.mockRestore();
    await rm(root, { recursive: true, force: true });
  });

  it.each([
    "html",
    "markdown",
  ] as const)("returns a validated %s plan only after real exit", async (format) => {
    const result = await writer.plan(
      { ...input, format },
      new AbortController().signal,
    );
    expect(result.maxBytes).toBe(7);
    expect(result.filename).toBe(
      format === "html" ? "fixture.html" : "fixture.md",
    );
    expect(terminate).toHaveBeenCalledOnce();
    expect([...workers.values()].every((state) => state.exited)).toBe(true);
  });

  it("keeps success pending while native termination is gated", async () => {
    gateTermination();
    let settled = false;
    const pending = writer
      .plan(input, new AbortController().signal)
      .finally(() => {
        settled = true;
      });
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    expect([...workers.values()].every((state) => !state.exited)).toBe(true);
    release?.();
    await expect(pending).resolves.toHaveProperty("maxBytes", 7);
    expect([...workers.values()].every((state) => state.exited)).toBe(true);
  });

  it("keeps ordinary failure pending until exit and hides unknown failure text", async () => {
    gateTermination();
    let settled = false;
    const pending = writer.plan(
      { ...input, title: "failure" },
      new AbortController().signal,
    );
    const observed = pending.catch((error: unknown) => {
      settled = true;
      return error;
    });
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    release?.();
    expect(await observed).toMatchObject({ code: "EXPORT_DOCUMENT_INVALID" });
    expect(String(await observed)).not.toContain("untrusted-secret");
  });

  it.each([
    ["known", "EXPORT_MEDIA_UNAVAILABLE"],
    ["invalid", "EXPORT_DOCUMENT_INVALID"],
    ["crash", "EXPORT_DOCUMENT_INVALID"],
    ["exit", "EXPORT_DOCUMENT_INVALID"],
  ])("handles %s after observed exit", async (title, code) => {
    await expect(
      writer.plan({ ...input, title }, new AbortController().signal),
    ).rejects.toMatchObject({ code });
  });

  it("does not allocate a worker for preabort or invalid bounded input", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(writer.plan(input, controller.signal)).rejects.toMatchObject({
      code: "EXPORT_DOCUMENT_CANCELLED",
    });
    await expect(
      writer.plan(
        { ...input, html: "あ".repeat((800 * 1024) / 3 + 1) },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "EXPORT_DOCUMENT_LIMIT" });
    expect(terminate).not.toHaveBeenCalled();
  });

  it("cancellation during exit waiting supersedes success without releasing early", async () => {
    gateTermination();
    const controller = new AbortController();
    let settled = false;
    const pending = writer.plan(input, controller.signal);
    const observed = pending.catch((error: unknown) => {
      settled = true;
      return error;
    });
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledOnce());
    controller.abort();
    expect(settled).toBe(false);
    release?.();
    expect(await observed).toMatchObject({ code: "EXPORT_DOCUMENT_CANCELLED" });
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("enforces the existing 30 second deadline and discards a later success message", async () => {
    gateTermination();
    vi.useFakeTimers();
    const pending = writer.plan(
      { ...input, title: "hang" },
      new AbortController().signal,
    );
    const observed = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(terminate).toHaveBeenCalledOnce();
    vi.useRealTimers();
    const worker = [...workers.keys()][0];
    if (!worker) throw new Error("Missing owned worker");
    const late = new Promise<void>((resolve) =>
      worker.once("message", () => resolve()),
    );
    worker.postMessage("late");
    await late;
    release?.();
    expect(await observed).toMatchObject({ code: "EXPORT_DOCUMENT_TIMEOUT" });
  });

  it.each([
    "reject",
    "resolve",
    "throw",
  ] as const)("keeps %s without exit distinct as execution unproven", async (mode) => {
    terminate.mockImplementation(function (this: Worker) {
      track(this);
      if (mode === "throw") throw new Error("synthetic terminate failure");
      return mode === "reject"
        ? Promise.reject(new Error("synthetic terminate failure"))
        : Promise.resolve(0);
    });
    await expect(
      writer.plan(input, new AbortController().signal),
    ).rejects.toBeInstanceOf(ZipExecutionUnprovenError);
    expect([...workers.values()].every((state) => !state.exited)).toBe(true);
  });

  it("does not misclassify terminate rejection after real exit as unknown", async () => {
    terminate.mockImplementation(function (this: Worker) {
      track(this);
      return nativeTerminate.call(this).then(() => {
        throw new Error("synthetic API rejection after exit");
      });
    });
    await expect(
      writer.plan(input, new AbortController().signal),
    ).resolves.toHaveProperty("maxBytes", 7);
    expect([...workers.values()].every((state) => state.exited)).toBe(true);
  });
});
