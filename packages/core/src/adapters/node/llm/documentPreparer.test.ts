import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { LlmPrepareInput } from "@repo/core/application/llm/ports";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeLlmDocumentPreparer } from "./documentPreparer";

const nativeTerminate = Worker.prototype.terminate;
const identityUrl = new URL("./documentIdentity.mjs", import.meta.url).href;
const workerSource = `
import { workerData as data, parentPort } from "node:worker_threads";
import { documentManifestHash, documentSegmentHash } from ${JSON.stringify(identityUrl)};
const mode = new TextDecoder().decode(data.bytes);
if (mode !== "hang") {
  const segment={identity:{kind:"prepared-segment",sha256:"",ordinal:0},html:"<p>Synthetic</p>",firstBlock:0,blockCount:1};
  const coverage={kind:"office-text",format:"docx",textComplete:true,units:[{ordinal:0,kind:"body",firstBlock:0,blockCount:1}],uninterpretedMedia:0};
  const notices=[];
  const manifest=documentManifestHash(data.source,coverage,notices,[segment]);
  segment.identity.sha256=documentSegmentHash(manifest,0,0,1,segment.html);
  const value={kind:"text-blocks",preparationVersion:2,identity:{kind:"prepared-document",preparationVersion:2,sha256:manifest},coverage,segments:[segment],blocks:1,notices,media:[]};
  if(mode==="bad-hash")value.identity.sha256="a".repeat(64);
  if(mode==="bad-coverage")coverage.units[0].blockCount=2;
  if(mode==="bad-notice")notices.push({code:"OFFICE_MEDIA_UNINTERPRETED",unit:4,count:1});
  if(mode==="failure")parentPort.postMessage({ok:false,code:"LLM_DOCUMENT_UNSUPPORTED"});
  else if(mode==="unsafe-code")parentPort.postMessage({ok:false,code:"PROVIDER_NATIVE_ERROR"});
  else {
    parentPort.postMessage({ok:true,value});
    if(mode==="twice")parentPort.postMessage({ok:true,value});
  }
  if(mode==="delayed-exit") {
    process.stdout.write("x".repeat(128*1024));
    process.stderr.write("x".repeat(128*1024));
    setTimeout(()=>parentPort.close(),100);
  } else parentPort.close();
} else setInterval(()=>{},1000);
`;
const input = (
  mode: string,
): Extract<LlmPrepareInput, { preparationVersion: 2 }> => {
  const bytes = Buffer.from(mode);
  return {
    bytes,
    source: {
      kind: "original",
      originalId: "synthetic",
      format: "docx",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
    preparationVersion: 2,
    promptVersion: 1,
  };
};

describe("document preparation protocol and owned native termination", () => {
  let root: string;
  let preparer: NodeLlmDocumentPreparer;
  const unclosed: Worker[] = [];
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "llm-document-parent-"));
    const worker = path.join(root, "worker.mjs");
    await writeFile(worker, workerSource, { mode: 0o600, flag: "wx" });
    preparer = new NodeLlmDocumentPreparer(worker);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    for (const worker of unclosed.splice(0)) await nativeTerminate.call(worker);
    await rm(root, { recursive: true, force: true });
  });
  it("accepts only after actual Worker exit and both output stream ends", async () => {
    let returned = false;
    const pending = preparer
      .prepare(input("delayed-exit"), new AbortController().signal)
      .finally(() => {
        returned = true;
      });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(returned).toBe(false);
    const value = await pending;
    expect(value.preparationVersion).toBe(2);
    expect(value.blocks).toBe(1);
  });
  it.each([
    "bad-hash",
    "bad-coverage",
    "bad-notice",
    "unsafe-code",
    "twice",
  ])("rejects %s with native close proof", async (mode) => {
    await expect(
      preparer.prepare(input(mode), new AbortController().signal),
    ).rejects.toMatchObject({
      code: "LLM_SOURCE_INVALID",
      closed: true,
      delivery: "not-sent",
    });
  });
  it("projects only a finite document failure after close", async () => {
    await expect(
      preparer.prepare(input("failure"), new AbortController().signal),
    ).rejects.toMatchObject({ code: "LLM_DOCUMENT_UNSUPPORTED", closed: true });
  });
  it("checks original byte identity before allocating a Worker", async () => {
    const value = input("valid");
    await expect(
      preparer.prepare(
        { ...value, source: { ...value.source, sha256: "a".repeat(64) } },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_INVALID", closed: true });
  });
  it("aborts a running Worker and waits for exit", async () => {
    const controller = new AbortController();
    const pending = preparer.prepare(input("hang"), controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({
      code: "LLM_UNAVAILABLE",
      closed: true,
    });
  });
  it("keeps unproved termination distinct from closed cancellation", async () => {
    vi.spyOn(Worker.prototype, "terminate").mockImplementation(function (
      this: Worker,
    ) {
      unclosed.push(this);
      return Promise.reject(Error("synthetic termination unavailable"));
    });
    const controller = new AbortController();
    const pending = preparer.prepare(input("hang"), controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      closed: false,
    });
    expect(unclosed.length).toBe(1);
  });
  it("requests termination at 30 seconds without calling timeout a close proof", async () => {
    vi.useFakeTimers();
    const pending = preparer.prepare(
      input("hang"),
      new AbortController().signal,
    );
    const result = expect(pending).rejects.toMatchObject({
      code: "LLM_TIMEOUT",
      closed: true,
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await result;
  });
});
