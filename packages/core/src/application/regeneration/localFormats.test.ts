import { constants } from "node:fs";
import {
  NodeLlmRuntimeOwnership,
  type NodeLlmRuntimeOwnershipEnvironment,
} from "@repo/core/adapters/node/llm/runtimeOwnership";
import { NodeRegenerationMemory } from "@repo/core/adapters/node/regeneration/memory";
import type {
  LlmImageRaster,
  LlmNativeInputOwner,
  LlmSourcePreparer,
} from "@repo/core/application/llm/ports";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import type { PdfPreview } from "@repo/core/domain/llm/pdfPreview";
import {
  PDF_PAGE_POLICY,
  PDF_PAGE_RENDERER,
  pdfPageManifest,
} from "@repo/core/domain/llm/pdfPreview";
import { sourceInputReceipt } from "@repo/core/domain/regeneration/source";
import { describe, expect, it } from "vitest";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const bytes = Uint8Array.of(1, 2, 3);
const source = {
  kind: "original",
  originalId: id(3),
  sha256: "a".repeat(64),
  bytes: bytes.length,
  format: "pdf",
} as const;
const raster: LlmImageRaster = {
  mimeType: "image/png",
  bytes: Uint8Array.of(1),
  width: 1,
  height: 1,
};
const manifest = pdfPageManifest({
  kind: "pdf-pages",
  preparationVersion: 4,
  source,
  policy: PDF_PAGE_POLICY,
  renderer: PDF_PAGE_RENDERER,
  total: 1,
  pages: [
    { ordinal: 0, width: 1, height: 1, bytes: 1, sha256: "b".repeat(64) },
  ],
  sha256: "c".repeat(64),
});
const native: LlmNativeInputOwner = {
  reserve: async () => ({ birthId: id(4) }),
  reserveMany: async () => {
    throw new Error("UNEXPECTED_AUDIO_NATIVE_PAIR");
  },
  register: async () => {},
  closed: async () => {},
};
const preparer: LlmSourcePreparer = {
  async prepare(input) {
    if (input.preparationVersion === 4)
      return {
        kind: "pdf-pages",
        preparationVersion: 4,
        manifest: input.manifest,
      };
    if (input.preparationVersion === 3)
      return {
        kind: "single-raster",
        preparationVersion: 3,
        identity: {
          kind: "prepared-image",
          preparationVersion: 3,
          sha256: "d".repeat(64),
        },
        inputIdentity: {
          kind: "prepared-raster",
          ordinal: 0,
          sha256: "d".repeat(64),
        },
        raster,
        coverage: {
          kind: "single-frame",
          codec: "png",
          sourceWidth: 1,
          sourceHeight: 1,
          orientation: 1,
          frames: 1,
          fullPixels: true,
          resized: false,
          cropped: false,
        },
        normalization: "srgb-white-v1",
      };
    const segments = [
      {
        identity: {
          kind: "prepared-segment" as const,
          ordinal: 0,
          sha256: "e".repeat(64),
        },
        html: "<p>prepared</p>",
        firstBlock: 0,
        blockCount: 1,
      },
    ];
    if (input.preparationVersion === 1)
      return {
        kind: "text-blocks",
        preparationVersion: 1,
        segments,
        blocks: 1,
        notices: [],
        media: [],
      };
    return {
      kind: "text-blocks",
      preparationVersion: 2,
      segments,
      blocks: 1,
      notices: [],
      media: [],
      identity: {
        kind: "prepared-document",
        preparationVersion: 2,
        sha256: "f".repeat(64),
      },
      coverage:
        input.source.format === "pdf"
          ? {
              kind: "pdf-text",
              pages: [
                {
                  ordinal: 0,
                  class: "text-covered",
                  firstBlock: 0,
                  blockCount: 1,
                },
              ],
            }
          : {
              kind: "office-text",
              format: input.source.format,
              textComplete: true,
              units: [
                { ordinal: 0, kind: "body", firstBlock: 0, blockCount: 1 },
              ],
              uninterpretedMedia: 0,
            },
    };
  },
};
function lease(memory: NodeRegenerationMemory, generation = 1) {
  const admission = memory.reserveBegin({ kind: "llm-conversion", id: id(1) });
  const receipt = sourceInputReceipt({
    consumer: admission.consumer,
    runtimeId: id(2),
    token: id(4),
    generation,
    state: "active",
  });
  if (!receipt || receipt.state !== "active") throw Error("RECEIPT");
  memory.bindBegin(admission, receipt);
  const value = memory.commitBegin(admission);
  memory.startRead(value);
  memory.adopt(value, bytes);
  memory.endRead(value);
  return value;
}
function finish(
  memory: NodeRegenerationMemory,
  value: ReturnType<typeof lease>,
) {
  const proof = memory.finish(value, id(5));
  expect(memory.verify(proof, proof.receipt)).toBe(true);
  memory.consume(proof);
  expect(memory.verify(proof, proof.receipt)).toBe(false);
}

describe("S4-P typed local input and exact opaque lifetime", () => {
  it.each([
    "docx",
    "xlsx",
    "pptx",
    "pdf",
  ] as const)("V2 %s closes original input independently of segments", async (format) => {
    const memory = new NodeRegenerationMemory(preparer);
    const value = lease(memory);
    const result = await memory.prepareWork(
      value,
      {
        kind: "prepare-v2",
        contract: {
          preparationVersion: 2,
          promptVersion: 1,
          source: { ...source, format },
        },
      },
      new AbortController().signal,
    );
    expect(result.prepared.coverage.kind).toBe(
      format === "pdf" ? "pdf-text" : "office-text",
    );
    finish(memory, value);
    expect(result.prepared.segments[0]?.html).toBe("<p>prepared</p>");
  });
  it("V3 retains raster while original receipt can close", async () => {
    const memory = new NodeRegenerationMemory(preparer);
    const value = lease(memory);
    const result = await memory.prepareWork(
      value,
      {
        kind: "prepare-v3",
        contract: {
          preparationVersion: 3,
          promptVersion: 2,
          source: { ...source, format: "image" },
        },
        native,
      },
      new AbortController().signal,
    );
    finish(memory, value);
    expect(result.prepared.raster).toBe(raster);
  });
  it("classify and redraw use distinct fresh generations and reject old leases", async () => {
    const memory = new NodeRegenerationMemory(
      preparer,
      {
        classify: async () => ({
          kind: "pages",
          preparationVersion: 4,
          promptVersion: 3,
          modelKind: "chat-image",
          manifest,
          reason: "VISUAL_CONTENT",
        }),
      },
      { prepare: async () => manifest, redraw: async () => raster },
    );
    const first = lease(memory);
    expect(
      (
        await memory.prepareWork(
          first,
          { kind: "classify-pdf", source, native },
          new AbortController().signal,
        )
      ).choice.kind,
    ).toBe("pages");
    finish(memory, first);
    const second = lease(memory, 2);
    const page = manifest.pages[0];
    if (!page) throw Error("PAGE");
    await expect(
      memory.prepareWork(
        first,
        { kind: "redraw-pdf", source, manifest, page, native },
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(
      (
        await memory.prepareWork(
          second,
          { kind: "redraw-pdf", source, manifest, page, native },
          new AbortController().signal,
        )
      ).raster,
    ).toBe(raster);
    finish(memory, second);
  });
  it("unfinished native work retains its slot and cannot issue finish proof", async () => {
    const memory = new NodeRegenerationMemory({
      prepare: async () => {
        throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
      },
    });
    const value = lease(memory);
    await expect(
      memory.prepareWork(
        value,
        {
          kind: "prepare-v3",
          contract: {
            preparationVersion: 3,
            promptVersion: 2,
            source: { ...source, format: "image" },
          },
          native,
        },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ closed: false });
    expect(() => memory.finish(value, id(5))).toThrow();
    const other = memory.reserveBegin({ kind: "pdf-preview", id: id(8) });
    expect(
      memory.tryReserveBegin({ kind: "pdf-preview", id: id(9) }).kind,
    ).toBe("busy");
    memory.holdBegin(other);
  });
  it("consumed proof cannot close a replacement generation", async () => {
    const memory = new NodeRegenerationMemory(preparer);
    const first = lease(memory);
    await memory.prepareWork(
      first,
      {
        kind: "prepare-v1",
        contract: {
          preparationVersion: 1,
          promptVersion: 1,
          source: { ...source, format: "text" },
        },
      },
      new AbortController().signal,
    );
    const proof = memory.finish(first, id(5));
    memory.consume(proof);
    const second = lease(memory, 2);
    expect(memory.verify(proof, second.receipt)).toBe(false);
  });
});

function journal() {
  type Node = { directory: boolean; text: string; mode: number };
  const nodes = new Map<string, Node>();
  const directory = "/self/new-journal";
  const absent = new Set<number>();
  let next = 10;
  let selfPid = 100;
  const io: NodeLlmRuntimeOwnershipEnvironment = {
    get pid() {
      return selfPid;
    },
    randomUUID: () => id(next++),
    knownPidAbsent: (pid) => absent.has(pid),
    mkdir: async (name) => {
      nodes.set(name, { directory: true, text: "", mode: 0o700 });
    },
    async open(name, flags, mode) {
      let node = nodes.get(name);
      if (flags === "wx") {
        if (node) throw Object.assign(Error("EXISTS"), { code: "EEXIST" });
        node = { directory: false, text: "", mode: mode ?? 0 };
        nodes.set(name, node);
      } else if (!node)
        throw Object.assign(Error("ABSENT"), { code: "ENOENT" });
      if (
        !node ||
        (typeof flags === "number" && !(flags & constants.O_NOFOLLOW))
      )
        throw Error("NOFOLLOW");
      const current = node;
      return {
        stat: async () => ({
          isFile: () => !current.directory,
          isDirectory: () => current.directory,
          size: Buffer.byteLength(current.text),
          mode: current.mode,
        }),
        readFile: async () => current.text,
        writeFile: async (text) => {
          current.text = text;
        },
        sync: async () => {},
        close: async () => {},
      };
    },
    rename: async (from, to) => {
      const node = nodes.get(from);
      if (!node) throw Error("RENAME");
      nodes.set(to, node);
      nodes.delete(from);
    },
    unlink: async (name) => {
      nodes.delete(name);
    },
  };
  return {
    io,
    directory,
    absent,
    seed: (value: unknown) => {
      nodes.set(`${directory}/owner.json`, {
        directory: false,
        text: JSON.stringify(value),
        mode: 0o600,
      });
    },
    nextOwner: () => {
      absent.add(selfPid);
      selfPid++;
    },
    saved: () => {
      const text = nodes.get(`${directory}/owner.json`)?.text;
      if (!text) throw Error("SAVED");
      return JSON.parse(text) as unknown;
    },
  };
}
function preview(runtimeId: string): Extract<PdfPreview, { state: "running" }> {
  const now = new Date("2026-10-06T00:00:00Z");
  return {
    source,
    accountId: id(1),
    noteId: id(3),
    noteVersion: 0,
    ownershipGeneration: 1,
    credentialEpoch: 1,
    id: id(6),
    commandId: id(7),
    requestDigest: "e".repeat(64),
    access: { origin: "local-original", bindingId: null },
    sourceMemoryBytes: 52_428_800,
    inputReceipt: {
      consumer: { kind: "pdf-preview", id: id(6) },
      runtimeId,
      token: id(4),
      generation: 1,
      state: "active",
    },
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 60_000),
    cancelGeneration: 0,
    version: 1,
    state: "running",
    owner: { state: "active", runtimeId, token: id(4) },
  };
}
describe("S4-P record3 birth and capability", () => {
  it("reserved birth is durable and parent absence never substitutes for missing child identity", async () => {
    const j = journal();
    const owner = await NodeLlmRuntimeOwnership.acquire(j.directory, j.io);
    const value = preview(owner.runtimeId);
    if (!value.inputReceipt || value.inputReceipt.state !== "active")
      throw Error("RECEIPT");
    await owner.nativeOwner(value, { receipt: value.inputReceipt }).reserve();
    expect(j.saved()).toMatchObject({
      version: 3,
      births: [{ state: "reserved" }],
    });
    j.nextOwner();
    await expect(
      NodeLlmRuntimeOwnership.acquire(j.directory, j.io),
    ).rejects.toMatchObject({ code: "LLM_OWNERSHIP_UNKNOWN", closed: false });
  });
  it("known child alive or unknown absence blocks acquire; all actual absences permit exact preview proof", async () => {
    const j = journal();
    const owner = await NodeLlmRuntimeOwnership.acquire(j.directory, j.io);
    const value = preview(owner.runtimeId);
    if (!value.inputReceipt || value.inputReceipt.state !== "active")
      throw Error("RECEIPT");
    const native = owner.nativeOwner(value, { receipt: value.inputReceipt });
    const birth = await native.reserve();
    await native.register(birth, 200);
    expect(j.saved()).toMatchObject({
      births: [{ state: "active", pid: 200 }],
    });
    j.nextOwner();
    await expect(
      NodeLlmRuntimeOwnership.acquire(j.directory, j.io),
    ).rejects.toMatchObject({ closed: false });
    j.absent.add(200);
    const successor = await NodeLlmRuntimeOwnership.acquire(j.directory, j.io);
    const proof = successor.inputPredecessor(value);
    if (!proof) throw Error("PROOF");
    expect(successor.verifyPredecessorInput(proof, value)).toBe(true);
    expect(
      successor.verifyPredecessorInput(proof, {
        ...value,
        inputReceipt: { ...value.inputReceipt, generation: 2 },
      }),
    ).toBe(false);
    await expect(successor.acknowledge(owner.runtimeId)).rejects.toMatchObject({
      closed: false,
    });
    const ended: PdfPreview = {
      ...value,
      state: "failed",
      code: "LLM_UNAVAILABLE",
      owner: { ...value.owner, state: "closed" },
      sourceMemoryBytes: 0,
      inputReceipt: proof.receipt,
    };
    expect(successor.verifyPredecessorInput(proof, ended)).toBe(true);
    successor.consumePredecessorInput(proof);
    await successor.acknowledge(owner.runtimeId);
  });
  it("closed journal requires individual known child absence and preserves exact birth token", async () => {
    const j = journal();
    const owner = await NodeLlmRuntimeOwnership.acquire(j.directory, j.io);
    const value = preview(owner.runtimeId);
    if (!value.inputReceipt || value.inputReceipt.state !== "active")
      throw Error("RECEIPT");
    const native = owner.nativeOwner(value, { receipt: value.inputReceipt });
    const birth = await native.reserve();
    await native.register(birth, 200);
    j.absent.add(200);
    await native.closed(birth);
    expect(j.saved()).toMatchObject({
      births: [{ state: "closed", pid: 200 }],
    });
  });
  it("record2 leased-text capability never proves a local preview input", async () => {
    const j = journal();
    const runtimeId = id(60);
    j.absent.add(200);
    j.seed({
      version: 2,
      pid: 200,
      runtimeId,
      inputMode: "leased-text-v1",
      predecessors: [],
    });
    const owner = await NodeLlmRuntimeOwnership.acquire(j.directory, j.io);
    expect(owner.inputPredecessor(preview(runtimeId))).toBeNull();
  });
});
