import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  isLlmOperationError,
  type LlmPrepareInput,
} from "@repo/core/application/llm/ports";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import sharp from "sharp";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type ImageChildFactory, NodeLlmImagePreparer } from "./imagePreparer";

type Input = Extract<LlmPrepareInput, { preparationVersion: 3 }>;
let png: Buffer;
const children: Array<{
  child: ChildProcess;
  closed: Promise<void>;
  pipes: Set<unknown>;
}> = [];
const operations = new Set<Promise<unknown>>();
const controllers: AbortController[] = [];
beforeAll(async () => {
  png = await sharp({
    create: { width: 3, height: 2, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  expect(png.byteLength < 64 * 1024).toBe(true);
});
function input(): Input {
  return {
    bytes: png,
    source: {
      kind: "original",
      originalId: "self-image",
      format: "image",
      bytes: png.length,
      sha256: createHash("sha256").update(png).digest("hex"),
    },
    preparationVersion: 3,
    promptVersion: 2,
  };
}
function controller() {
  const c = new AbortController();
  controllers.push(c);
  return c;
}
function owned(script?: string): ImageChildFactory {
  return (file, args, options) => {
    expect(file === process.execPath && options.shell === undefined).toBe(true);
    expect(
      Object.keys(options.env ?? {})
        .sort()
        .join(",") === "LANG,LC_ALL,UV_THREADPOOL_SIZE",
    ).toBe(true);
    const child = spawn(
      file,
      script === undefined ? [...args] : ["-e", script],
      options,
    );
    const pipes = new Set<unknown>();
    for (const pipe of child.stdio) pipe?.once("close", () => pipes.add(pipe));
    const closed = new Promise<void>((resolve) =>
      child.once("close", () => resolve()),
    );
    children.push({ child, closed, pipes });
    return child;
  };
}
function prepare(c = controller(), script?: string, value = input()) {
  const p = new NodeLlmImagePreparer(
    fileURLToPath(new URL("./imageChild.mjs", import.meta.url)),
    owned(script),
  ).prepare(value, c.signal);
  operations.add(p);
  void p.then(
    () => operations.delete(p),
    () => operations.delete(p),
  );
  return p;
}
async function outcome(p: Promise<unknown>) {
  try {
    await p;
    return { code: "accepted", closed: true };
  } catch (error) {
    return isLlmOperationError(error)
      ? { code: error.code, closed: error.closed }
      : { code: "unexpected", closed: false };
  }
}
afterEach(async () => {
  vi.useRealTimers();
  for (const c of controllers) c.abort();
  await Promise.allSettled(operations);
  await Promise.all(children.map((c) => c.closed));
  expect(children.every((c) => c.pipes.size === 4)).toBe(true);
  for (const { child } of children) {
    if (child.pid === undefined) continue;
    let gone = false;
    try {
      process.kill(child.pid, 0);
    } catch (error) {
      gone =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ESRCH";
    }
    expect(gone).toBe(true);
  }
  children.length = 0;
  controllers.length = 0;
  vi.restoreAllMocks();
});

describe("image parent protocol and actual process ownership", () => {
  it("checks binary metadata and binds original identity only in the parent", async () => {
    const a = await prepare();
    const b = await prepare(controller(), undefined, {
      ...input(),
      source: { ...input().source, originalId: "other-self-image" },
    });
    expect(
      a.kind === "single-raster" &&
        a.coverage.fullPixels &&
        !a.coverage.resized &&
        !a.coverage.cropped,
    ).toBe(true);
    expect(
      a.raster.width === 3 &&
        a.raster.height === 2 &&
        a.inputIdentity.ordinal === 0,
    ).toBe(true);
    expect(
      a.identity.sha256 !== b.identity.sha256 &&
        a.inputIdentity.sha256 !== b.inputIdentity.sha256,
    ).toBe(true);
    expect(
      Buffer.from(a.raster.bytes).equals(Buffer.from(b.raster.bytes)),
    ).toBe(true);
    expect(
      children.every((c) => c.pipes.size === 4 && c.child.exitCode === 0),
    ).toBe(true);
  });
  it("rejects original identity drift without starting a child", async () => {
    expect(
      await outcome(
        prepare(controller(), undefined, {
          ...input(),
          source: { ...input().source, sha256: "a".repeat(64) },
        }),
      ),
    ).toEqual({ code: "LLM_SOURCE_INVALID", closed: true });
    expect(children.length).toBe(0);
  });
  it("does not spawn for an already aborted operation", async () => {
    const c = controller();
    c.abort();
    expect(await outcome(prepare(c))).toEqual({
      code: "LLM_UNAVAILABLE",
      closed: true,
    });
    expect(children.length).toBe(0);
  });
  it.each([
    [
      "invalid-json",
      "require('node:fs').writeSync(3,'{');",
      "LLM_SOURCE_INVALID",
    ],
    [
      "metadata-limit",
      "require('node:fs').writeSync(3,Buffer.alloc(16385,32));",
      "LLM_RESOURCE_LIMIT",
    ],
    [
      "stderr-limit",
      "process.stderr.write(Buffer.alloc(4097));",
      "LLM_RESOURCE_LIMIT",
    ],
    [
      "finite-error",
      "require('node:fs').writeSync(3,JSON.stringify({version:1,ok:false,code:'LLM_IMAGE_MULTIFRAME'}));process.exitCode=1;",
      "LLM_IMAGE_MULTIFRAME",
    ],
  ])("rejects %s after the real child and all pipes close", async (_name, action, code) => {
    const script = `process.stdin.resume();process.stdin.on('end',()=>{${action}});`;
    expect(await outcome(prepare(controller(), script))).toEqual({
      code,
      closed: true,
    });
    expect(children.every((c) => c.pipes.size === 4)).toBe(true);
  });
  it("refuses the first excess PNG byte and closes the owned child without retaining it", async () => {
    const script = `process.stdin.resume();process.stdin.on('end',async()=>{const {once}=require('node:events');for(let n=0;n<129;n++){const b=Buffer.alloc(n===128?1:65536);if(!process.stdout.write(b))await once(process.stdout,'drain');}});`;
    expect(await outcome(prepare(controller(), script))).toEqual({
      code: "LLM_RESOURCE_LIMIT",
      closed: true,
    });
  });
  it("aborts an actual running child once and waits for its real close", async () => {
    const c = controller();
    const p = prepare(
      c,
      "process.stdin.resume();process.stdout.write(Buffer.from([0]));setTimeout(()=>process.exit(0),3000);",
    );
    await Promise.resolve();
    const child = children.at(-1)?.child;
    if (!child?.stdout) throw Error("SELF_CHILD");
    await new Promise<void>((resolve) =>
      child.stdout?.once("data", () => resolve()),
    );
    const kill = vi.spyOn(child, "kill");
    c.abort();
    expect(await outcome(p)).toEqual({ code: "LLM_UNAVAILABLE", closed: true });
    expect(
      kill.mock.calls.length === 1 && kill.mock.calls[0]?.[0] === "SIGTERM",
    ).toBe(true);
  });
  it("enforces the preparation deadline without declaring closure before actual exit", async () => {
    vi.useFakeTimers();
    const p = prepare(
      controller(),
      "process.stdin.resume();process.stdout.write(Buffer.from([0]));setTimeout(()=>process.exit(0),3000);",
    );
    await Promise.resolve();
    const child = children.at(-1)?.child;
    if (!child?.stdout) throw Error("SELF_CHILD");
    await new Promise<void>((resolve) =>
      child.stdout?.once("data", () => resolve()),
    );
    const kill = vi.spyOn(child, "kill");
    await vi.advanceTimersByTimeAsync(LLM_LIMITS.prepareMs);
    vi.useRealTimers();
    expect(await outcome(p)).toEqual({ code: "LLM_TIMEOUT", closed: true });
    expect(kill.mock.calls.length).toBe(1);
  });
  it.each([
    "hash",
    "bytes",
    "dimensions",
  ])("rejects %s metadata that does not match the actual received PNG", async (mode) => {
    const script = `const fs=require('node:fs'),crypto=require('node:crypto');const parts=[];process.stdin.on('data',b=>parts.push(b));process.stdin.on('end',()=>{const b=Buffer.concat(parts);process.stdout.write(b);fs.writeSync(3,JSON.stringify({version:1,ok:true,codec:'png',sourceWidth:3,sourceHeight:2,orientation:1,width:${mode === "dimensions" ? 4 : 3},height:2,bytes:b.length${mode === "bytes" ? "+1" : ""},sha256:${mode === "hash" ? "'a'.repeat(64)" : "crypto.createHash('sha256').update(b).digest('hex')"}}));});`;
    expect(await outcome(prepare(controller(), script))).toEqual({
      code: "LLM_SOURCE_INVALID",
      closed: true,
    });
  });
  it("reports unknown at the stop deadline but tracks a self-exiting child until real close", async () => {
    const c = controller();
    const p = prepare(
      c,
      "process.on('SIGTERM',()=>{});process.stdin.resume();process.stdout.write(Buffer.from([0]));setTimeout(()=>process.exit(0),2000);",
    );
    await Promise.resolve();
    const state = children.at(-1);
    if (!state?.child.stdout) throw Error("SELF_CHILD");
    await new Promise<void>((resolve) =>
      state.child.stdout?.once("data", () => resolve()),
    );
    vi.useFakeTimers();
    c.abort();
    await vi.advanceTimersByTimeAsync(LLM_LIMITS.stopMs);
    expect(await outcome(p)).toEqual({
      code: "LLM_OWNERSHIP_UNKNOWN",
      closed: false,
    });
    expect(state.child.exitCode === null).toBe(true);
    vi.useRealTimers();
    await state.closed;
    expect(state.child.exitCode === 0 && state.pipes.size === 4).toBe(true);
  });
});
