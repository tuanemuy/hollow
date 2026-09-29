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
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import { LlmObjectOwnershipUnprovenError } from "@repo/core/application/llm/ownershipError";
import { ObjectOwnershipUnprovenError } from "@repo/core/application/ports/objectOwnership";
import type { OwnedObjectRead } from "@repo/core/application/ports/objectStorage";
import type { WriteOwner } from "@repo/core/domain/purge/entity";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoordinatedObjectStorage } from "../coordinatedObjectStorage";
import { FileObjectStorage } from "../objectStorage";
import { NodeZipExecution, NodeZipTransfers } from "./lifetimes";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, open: vi.fn(original.open) };
});

const clock = { now: () => new Date("2035-01-01T00:00:00.000Z") };
const deadline = () => new Date(clock.now().getTime() + 60_000);
const roots: string[] = [];
const reads: OwnedObjectRead[] = [];
const handles: FileHandle[] = [];
const executions: NodeZipExecution[] = [];
const transfers: NodeZipTransfers[] = [];
const releases: (() => void)[] = [];
const gate = () => {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  releases.push(release);
  return { promise, release };
};
const newExecution = () => {
  const value = new NodeZipExecution(clock);
  executions.push(value);
  return value;
};
const newTransfers = () => {
  const value = new NodeZipTransfers(clock);
  transfers.push(value);
  return value;
};
async function root() {
  const value = await mkdtemp(path.join(tmpdir(), "hollow-zip-owned-test-"));
  roots.push(value);
  return value;
}
async function stored(bytes: Buffer) {
  const directory = await root();
  await writeFile(path.join(directory, "test-object"), bytes, { mode: 0o600 });
  return new FileObjectStorage(directory);
}
async function owned(storage: FileObjectStorage, signal?: AbortSignal) {
  const value = await storage.openOwnedRead("test-object", signal);
  reads.push(value);
  const result = vi.mocked(open).mock.results.at(-1);
  if (!result || result.type !== "return")
    throw new Error("Missing self-owned open");
  const handle = await result.value;
  handles.push(handle);
  return { value, handle };
}

function ownerUow() {
  const beginWrite = vi.fn(
    async (_id: string, _runtime: string, _owner: WriteOwner, _now: Date) => {},
  );
  const endWrite = vi.fn(async (_id: string) => {});
  const registerKey = vi.fn(
    async (_id: string, _key: string, _now: Date) => {},
  );
  const unused = (): never => {
    throw new Error("Unexpected repository access");
  };
  const context: HollowUnitOfWorkContext = {
    get driveConnections() {
      return unused();
    },
    get driveAttempts() {
      return unused();
    },
    get driveControls() {
      return unused();
    },
    get llmPdfPreviews() {
      return unused();
    },
    get llmConversions() {
      return unused();
    },
    get llmDispatches() {
      return unused();
    },
    get llmQuota() {
      return unused();
    },
    get openRouterConnections() {
      return unused();
    },
    get openRouterAttempts() {
      return unused();
    },
    get openRouterModels() {
      return unused();
    },
    get openRouterWaiting() {
      return unused();
    },
    get authentication() {
      return unused();
    },
    get authBrowsers() {
      return unused();
    },
    get googleAttempts() {
      return unused();
    },
    get authChallenges() {
      return unused();
    },
    get zipPdf() {
      return unused();
    },
    get zipRequests() {
      return unused();
    },
    get zipWork() {
      return unused();
    },
    get zipSpools() {
      return unused();
    },
    get zipArtifacts() {
      return unused();
    },
    get zipDeliveries() {
      return unused();
    },
    get pdfRequests() {
      return unused();
    },
    get pdfComputations() {
      return unused();
    },
    get pdfArtifacts() {
      return unused();
    },
    get pdfDeliveries() {
      return unused();
    },
    get pdfAnonymousRequests() {
      return unused();
    },
    get pdfAnonymousDeliveries() {
      return unused();
    },
    get pdfDemands() {
      return unused();
    },
    get publicNotes() {
      return unused();
    },
    get publicProfiles() {
      return unused();
    },
    get profileIcons() {
      return unused();
    },
    get workspacePublications() {
      return unused();
    },
    get publicDiscoveryRates() {
      return unused();
    },
    get exports() {
      return unused();
    },
    get sharing() {
      return unused();
    },
    get displayNames() {
      return unused();
    },
    get batches() {
      return unused();
    },
    get moves() {
      return unused();
    },
    get tags() {
      return unused();
    },
    get browseIndex() {
      return unused();
    },
    get invitations() {
      return unused();
    },
    get workspaceIcons() {
      return unused();
    },
    get workspaceDeletions() {
      return unused();
    },
    get workspaces() {
      return unused();
    },
    get capacity() {
      return unused();
    },
    get accounts() {
      return unused();
    },
    get assets() {
      return unused();
    },
    get notes() {
      return unused();
    },
    get revisions() {
      return unused();
    },
    get imports() {
      return unused();
    },
    get jobs() {
      return unused();
    },
    get references() {
      return unused();
    },
    get purges() {
      return unused();
    },
    get emptyTrash() {
      return unused();
    },
    collectEvents: unused,
    objectOperations: {
      beginWrite,
      endWrite,
      registerKey,
      recoverWrites: vi.fn(async () => {}),
      canPublish: async () => true,
      claimDelete: async () => unused(),
      finishDelete: async () => unused(),
      releaseDelete: async () => unused(),
    },
  };
  const uow: HollowUnitOfWorkProvider = {
    run: async (operation) => operation(context),
  };
  return { uow, beginWrite, endWrite, registerKey };
}

describe("LLM exact retained owner alongside existing ZIP ownership", () => {
  it("retains only the exact typed conversion owner", async () => {
    const fixture = ownerUow();
    const storage = new CoordinatedObjectStorage(
      await root(),
      fixture.uow,
      clock,
    );
    const error = new LlmObjectOwnershipUnprovenError("llm-job");
    await expect(
      storage.withOwner({ kind: "conversion-job", id: "llm-job" }, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(fixture.endWrite).not.toHaveBeenCalled();
  });
  it.each([
    "different-id",
    "same-name",
  ])("does not retain %s errors as the current owner's termination proof", async (mode) => {
    const fixture = ownerUow();
    const storage = new CoordinatedObjectStorage(
      await root(),
      fixture.uow,
      clock,
    );
    const error =
      mode === "different-id"
        ? new LlmObjectOwnershipUnprovenError("other")
        : Object.assign(new Error("safe fixture"), {
            name: "LlmObjectOwnershipUnprovenError",
            code: "LLM_OWNERSHIP_UNKNOWN",
            owner: { kind: "conversion-job", id: "llm-job" },
          });
    await expect(
      storage.withOwner({ kind: "conversion-job", id: "llm-job" }, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(fixture.endWrite).toHaveBeenCalledTimes(1);
  });
});

afterEach(async () => {
  for (const release of releases.splice(0)) release();
  vi.restoreAllMocks();
  for (const value of transfers)
    for (const id of value.ids()) value.release(id);
  await Promise.allSettled([
    ...reads.splice(0).map((value) => value.close()),
    ...executions.splice(0).map((value) => value.stop()),
    ...transfers.splice(0).map((value) => value.stop()),
  ]);
  for (const handle of handles.splice(0))
    if (handle.fd !== -1) await handle.close();
  for (const directory of roots.splice(0))
    await rm(directory, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("FileObjectStorage owned reader", () => {
  it("returns exact synthetic bytes, bounded chunks, and a natively closed handle at EOF", async () => {
    const bytes = Buffer.alloc(150_003, 37);
    const { value, handle } = await owned(await stored(bytes));
    const reader = value.body.getReader();
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        expect(next.value.byteLength).toBeLessThanOrEqual(64 * 1024);
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    await value.closed;
    expect(Buffer.concat(chunks)).toEqual(bytes);
    expect(handle.fd).toBe(-1);
    expect(value.close()).toBe(value.close());
    await value.close();
  });

  it("waits for real file.close on EOF before resolving closed or reader.done", async () => {
    const { value, handle } = await owned(await stored(Buffer.alloc(0)));
    const closing = gate();
    const allowClose = gate();
    const nativeClose = handle.close.bind(handle);
    vi.spyOn(handle, "close").mockImplementation(async () => {
      closing.release();
      await allowClose.promise;
      await nativeClose();
    });
    let closed = false;
    let done = false;
    const closedResult = value.closed.then(() => {
      closed = true;
    });
    const reader = value.body.getReader();
    const reading = reader.read().then((result) => {
      done = result.done;
      return result;
    });
    await closing.promise;
    expect(handle.fd).toBeGreaterThanOrEqual(0);
    expect(closed).toBe(false);
    expect(done).toBe(false);
    allowClose.release();
    await expect(reading).resolves.toMatchObject({ done: true });
    await closedResult;
    reader.releaseLock();
    expect(handle.fd).toBe(-1);
  });

  it.each([
    "close",
    "cancel",
    "abort",
  ] as const)("%s and reentrant close share completion without outrunning native close", async (operation) => {
    const controller = new AbortController();
    const { value, handle } = await owned(
      await stored(Buffer.alloc(150_003)),
      controller.signal,
    );
    const closing = gate();
    const allowClose = gate();
    const nativeClose = handle.close.bind(handle);
    const close = vi.spyOn(handle, "close").mockImplementation(async () => {
      closing.release();
      await allowClose.promise;
      await nativeClose();
    });
    let operationResult: Promise<unknown>;
    if (operation === "cancel") operationResult = value.body.cancel();
    else if (operation === "abort") {
      controller.abort();
      operationResult = value.closed;
    } else operationResult = value.close();
    const first = value.close();
    expect(first).toBe(value.close());
    let closed = false;
    const closingResult = first.then(() => {
      closed = true;
    });
    await closing.promise;
    expect(closed).toBe(false);
    expect(handle.fd).toBeGreaterThanOrEqual(0);
    allowClose.release();
    await Promise.all([operationResult, closingResult, value.closed]);
    expect(handle.fd).toBe(-1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("rejects an immediately aborted open without acquiring a handle", async () => {
    const storage = await stored(Buffer.from("small"));
    const controller = new AbortController();
    controller.abort();
    await expect(
      storage.openOwnedRead("test-object", controller.signal),
    ).rejects.toMatchObject({ code: "OBJECT_ABORTED" });
    expect(open).not.toHaveBeenCalled();
  });
});

describe("ZIP runtime ownership", () => {
  it("execution cancel and stop wait for the work's explicit close completion", async () => {
    const runtime = newExecution();
    const started = gate();
    const closed = gate();
    let workSignal: AbortSignal | undefined;
    expect(
      runtime.start("run", deadline(), async (signal) => {
        workSignal = signal;
        started.release();
        await closed.promise;
      }),
    ).toBe(true);
    await started.promise;
    runtime.cancel("run");
    expect(workSignal?.aborted).toBe(true);
    expect(runtime.active("run")).toBe(true);
    expect(runtime.start("other", deadline(), async () => {})).toBe(false);
    let stopped = false;
    const stopping = runtime.stop().then(() => {
      stopped = true;
    });
    await setImmediate();
    expect(stopped).toBe(false);
    closed.release();
    await stopping;
    expect(runtime.active("run")).toBe(false);
    expect(runtime.start("late", deadline(), async () => {})).toBe(false);
  });

  it("execution retains a typed unknown owner and rejects stop without admitting new work", async () => {
    const runtime = newExecution();
    const unknown = new ObjectOwnershipUnprovenError({
      kind: "zip-assembly",
      id: "assembly",
    });
    runtime.start("run", deadline(), async () => {
      throw unknown;
    });
    await setImmediate();
    expect(runtime.active("run")).toBe(true);
    runtime.cancel("run");
    expect(runtime.start("other", deadline(), async () => {})).toBe(false);
    await expect(runtime.stop()).rejects.toBe(unknown);
    expect(runtime.active("run")).toBe(true);
    await expect(runtime.stop()).rejects.toBe(unknown);
  });

  it("execution releases an ordinary failed operation", async () => {
    const runtime = newExecution();
    runtime.start("run", deadline(), async () => {
      throw new Error("ordinary failure");
    });
    await setImmediate();
    expect(runtime.active("run")).toBe(false);
    await expect(runtime.stop()).resolves.toBeUndefined();
  });

  it("transfer capacity, cancellation and stop do not substitute for explicit release", async () => {
    const runtime = newTransfers();
    const first = runtime.hold("first", deadline());
    const second = runtime.hold("second", deadline());
    expect(() => runtime.hold("first", deadline())).toThrow(
      expect.objectContaining({ code: "ZIP_DELIVERY_BUSY" }),
    );
    expect(() => runtime.hold("third", deadline())).toThrow(
      expect.objectContaining({ code: "ZIP_DELIVERY_BUSY" }),
    );
    runtime.cancel("first");
    expect(first.aborted).toBe(true);
    expect(runtime.ids()).toEqual(["first", "second"]);
    let stopped = false;
    const stopping = runtime.stop().then(() => {
      stopped = true;
    });
    expect(second.aborted).toBe(true);
    runtime.release("first");
    await setImmediate();
    expect(stopped).toBe(false);
    runtime.release("second");
    await stopping;
    expect(runtime.ids()).toEqual([]);
    expect(() => runtime.hold("late", deadline())).toThrow(
      expect.objectContaining({ code: "ZIP_DELIVERY_BUSY" }),
    );
  });

  it("a retained transfer cannot be released and makes stop reject", async () => {
    const runtime = newTransfers();
    const signal = runtime.hold("delivery", deadline());
    const unknown = new ObjectOwnershipUnprovenError({
      kind: "zip-delivery",
      id: "delivery",
    });
    runtime.retain("delivery", unknown);
    expect(signal.aborted).toBe(true);
    runtime.release("delivery");
    expect(runtime.ids()).toEqual(["delivery"]);
    expect(() => runtime.hold("next", deadline())).toThrow(
      expect.objectContaining({ code: "ZIP_DELIVERY_BUSY" }),
    );
    await expect(runtime.stop()).rejects.toBe(unknown);
    expect(runtime.ids()).toEqual(["delivery"]);
  });

  it.each([
    { kind: "zip-spool", id: "delivery" },
    { kind: "zip-delivery", id: "other" },
  ] as const)("rejects a mismatched retained owner %# without retaining a different transfer", (owner) => {
    const runtime = newTransfers();
    runtime.hold("delivery", deadline());
    const unknown = new ObjectOwnershipUnprovenError(owner);
    expect(() => runtime.retain("delivery", unknown)).toThrow(unknown);
    runtime.release("delivery");
    expect(runtime.ids()).toEqual([]);
  });
});

describe("CoordinatedObjectStorage ZIP owner fence", () => {
  it("registers owned reads and ends a ZIP owner only after native read close", async () => {
    const directory = await root();
    await writeFile(path.join(directory, "test-object"), Buffer.alloc(100));
    const fixture = ownerUow();
    const storage = new CoordinatedObjectStorage(directory, fixture.uow, clock);
    await expect(storage.openOwnedRead("test-object")).rejects.toMatchObject({
      code: "OBJECT_OWNER_REQUIRED",
    });
    const closing = gate();
    const allowClose = gate();
    const owner = { kind: "zip-delivery", id: "delivery" } as const;
    const work = storage.withOwner(owner, async () => {
      const value = await storage.openOwnedRead("test-object");
      reads.push(value);
      const result = vi.mocked(open).mock.results.at(-1);
      if (!result || result.type !== "return")
        throw new Error("Missing owned open");
      const handle = await result.value;
      handles.push(handle);
      const nativeClose = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        closing.release();
        await allowClose.promise;
        await nativeClose();
      });
      await value.close();
      expect(handle.fd).toBe(-1);
    });
    await closing.promise;
    expect(fixture.endWrite).not.toHaveBeenCalled();
    expect(fixture.registerKey).toHaveBeenCalledTimes(1);
    const operationId = fixture.beginWrite.mock.calls[0]?.[0];
    expect(fixture.registerKey).toHaveBeenCalledWith(
      operationId,
      "test-object",
      clock.now(),
    );
    allowClose.release();
    await work;
    expect(fixture.endWrite).toHaveBeenCalledExactlyOnceWith(operationId);
  });

  it.each([
    "zip-spool",
    "zip-assembly",
    "zip-delivery",
  ] as const)("retains only the same typed %s owner", async (kind) => {
    const fixture = ownerUow();
    const storage = new CoordinatedObjectStorage(
      await root(),
      fixture.uow,
      clock,
    );
    const owner = { kind, id: "owned" };
    const unknown = new ObjectOwnershipUnprovenError(owner);
    await expect(
      storage.withOwner(owner, async () => {
        throw unknown;
      }),
    ).rejects.toBe(unknown);
    expect(fixture.beginWrite).toHaveBeenCalledTimes(1);
    expect(fixture.endWrite).not.toHaveBeenCalled();
  });

  it.each([
    "ordinary",
    "untyped",
    "other-id",
    "other-kind",
    "non-zip",
  ] as const)("ends ownership for %s failure without broadening the typed ZIP exception", async (fault) => {
    const fixture = ownerUow();
    const storage = new CoordinatedObjectStorage(
      await root(),
      fixture.uow,
      clock,
    );
    const owner: WriteOwner = {
      kind: fault === "non-zip" ? "pdf-artifact" : "zip-spool",
      id: "owned",
    };
    const cause =
      fault === "ordinary"
        ? new Error("failure")
        : fault === "untyped"
          ? {
              code: "ZIP_OWNERSHIP_UNKNOWN",
              owner: { kind: "zip-spool", id: "owned" },
            }
          : new ObjectOwnershipUnprovenError({
              kind: fault === "other-kind" ? "zip-assembly" : "zip-spool",
              id: fault === "other-id" ? "other" : "owned",
            });
    await expect(
      storage.withOwner(owner, async () => {
        throw cause;
      }),
    ).rejects.toBe(cause);
    expect(fixture.endWrite).toHaveBeenCalledExactlyOnceWith(
      fixture.beginWrite.mock.calls[0]?.[0],
    );
  });
});
