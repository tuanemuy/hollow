import { type ChildProcess, spawn } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import { afterEach, describe, expect, it } from "vitest";
import { CoordinatedObjectStorage } from "../coordinatedObjectStorage";

function ownerUow() {
  const recovered: string[] = [];
  const unused = (): never => {
    throw new Error("Unexpected repository access in process-owner test");
  };
  const context: HollowUnitOfWorkContext = {
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
    get pdfAnonymousRequests() {
      return unused();
    },
    get pdfAnonymousDeliveries() {
      return unused();
    },
    get pdfDemands() {
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
    get workspaceIcons(): never {
      throw new Error("unused");
    },
    get invitations() {
      return unused();
    },
    get workspaces() {
      return unused();
    },
    get workspaceDeletions() {
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
    get emptyTrash() {
      return unused();
    },
    get purges() {
      return unused();
    },
    collectEvents: unused,
    objectOperations: {
      beginWrite: async () => unused(),
      endWrite: async () => unused(),
      recoverWrites: async (runtime) => {
        recovered.push(runtime);
      },
      registerKey: async () => unused(),
      canPublish: async () => unused(),
      claimDelete: async () => unused(),
      finishDelete: async () => unused(),
      releaseDelete: async () => unused(),
    },
  };
  const uow: HollowUnitOfWorkProvider = {
    run: async (operation) => operation(context),
  };
  return { uow, recovered };
}

const clock = { now: () => new Date("2035-01-01T00:00:00.000Z") };
const adapterUrl = new URL("../coordinatedObjectStorage.ts", import.meta.url)
  .href;
const webRequire = createRequire(
  new URL("../../../../../../apps/web/package.json", import.meta.url),
);
const tsxLoader = webRequire.resolve("tsx");
const roots: string[] = [];
const children = new Map<
  ChildProcess,
  Promise<{ code: number | null; signal: NodeJS.Signals | null }>
>();
const ownerFile = (root: string) => path.join(root, ".hollow-writer-owner");
const recoveryFile = (root: string) => `${ownerFile(root)}.recovery`;

async function temporaryRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "hollow-owner-test-"));
  roots.push(root);
  return root;
}

type ChildReport = {
  kind: "ready" | "rejected";
  pid: number;
  node: string;
  recovered: string[];
  code?: string;
  name?: string;
};

function startOwner(root: string, hold: boolean) {
  const program = `
    import { CoordinatedObjectStorage } from ${JSON.stringify(adapterUrl)};
    const fixture = (${ownerUow.toString()})();
    const storage = new CoordinatedObjectStorage(${JSON.stringify(root)}, fixture.uow, { now: () => new Date("2035-01-01T00:00:00.000Z") });
    try {
      await storage.recoverOwners();
      process.send({ kind: "ready", pid: process.pid, node: process.versions.node, recovered: fixture.recovered });
      if (${hold}) process.on("message", (message) => { if (message === "exit") process.exit(0); });
      else process.disconnect();
    } catch (error) {
      process.send({ kind: "rejected", pid: process.pid, node: process.versions.node, recovered: fixture.recovered, code: typeof error?.code === "string" ? error.code : undefined, name: error?.name });
      process.disconnect();
    }
  `;
  const child = spawn(
    process.execPath,
    ["--import", tsxLoader, "--input-type=module", "--eval", program],
    {
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    },
  );
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-8000);
  });
  const exited = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
    child.once("error", () => resolve({ code: null, signal: null }));
  });
  children.set(child, exited);
  const report = new Promise<ChildReport>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(new Error(`Owned child did not report readiness: ${stderr}`)),
      8000,
    );
    const finish = () => clearTimeout(timeout);
    child.once("message", (value: unknown) => {
      finish();
      if (
        !value ||
        typeof value !== "object" ||
        !("kind" in value) ||
        !["ready", "rejected"].includes(String(value.kind)) ||
        !("pid" in value) ||
        value.pid !== child.pid ||
        !("node" in value) ||
        typeof value.node !== "string" ||
        !("recovered" in value) ||
        !Array.isArray(value.recovered) ||
        !value.recovered.every((item: unknown) => typeof item === "string")
      ) {
        reject(new Error("Invalid owned-child readiness message"));
        return;
      }
      resolve(value as ChildReport);
    });
    child.once("error", (error) => {
      finish();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      finish();
      reject(
        new Error(
          `Owned child exited before readiness (${code}/${signal}): ${stderr}`,
        ),
      );
    });
  });
  return { child, report, exited };
}

async function readOwner(root: string): Promise<{ pid: number; id: string }> {
  const value: unknown = JSON.parse(await readFile(ownerFile(root), "utf8"));
  if (
    !value ||
    typeof value !== "object" ||
    !("pid" in value) ||
    typeof value.pid !== "number" ||
    !("id" in value) ||
    typeof value.id !== "string"
  )
    throw new Error("Invalid test owner file");
  return { pid: value.pid, id: value.id };
}

afterEach(async () => {
  for (const [child, exited] of children) {
    if (
      child.exitCode === null &&
      child.signalCode === null &&
      child.pid !== undefined
    )
      child.kill("SIGKILL");
    await exited;
  }
  children.clear();
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

describe("CoordinatedObjectStorage process-owner lock", () => {
  it("rejects a second live process without recovering writes or changing the owner, then acquires after normal exit", async () => {
    const root = await temporaryRoot();
    const holder = startOwner(root, true);
    const ready = await holder.report;
    expect(ready.kind).toBe("ready");
    expect(ready.node).toMatch(/^22\./);
    expect(ready.recovered).toHaveLength(1);
    const initial = await readOwner(root);
    expect(initial.pid).toBe(holder.child.pid);
    expect(initial.id).toBe(ready.recovered[0]);
    const contender = startOwner(root, false);
    await expect(contender.report).resolves.toMatchObject({
      kind: "rejected",
      code: "OBJECT_BUSY",
      recovered: [],
    });
    await contender.exited;
    expect(await readOwner(root)).toEqual(initial);
    expect(holder.child.exitCode).toBeNull();
    expect(holder.child.signalCode).toBeNull();
    holder.child.send("exit");
    await expect(holder.exited).resolves.toEqual({ code: 0, signal: null });
    const fixture = ownerUow();
    await new CoordinatedObjectStorage(
      root,
      fixture.uow,
      clock,
    ).recoverOwners();
    const current = await readOwner(root);
    expect(current.pid).toBe(process.pid);
    expect(current.id).not.toBe(initial.id);
    expect(fixture.recovered).toEqual([current.id]);
    await expect(stat(recoveryFile(root))).rejects.toMatchObject({
      code: "ENOENT",
    });
  }, 15000);

  it("acquires only after its owned child has actually crashed, preserving existing object bytes", async () => {
    const root = await temporaryRoot();
    const bytes = Buffer.from("retained-object-before-crash");
    await writeFile(path.join(root, "existing-object"), bytes);
    const holder = startOwner(root, true);
    expect((await holder.report).kind).toBe("ready");
    const previous = await readOwner(root);
    expect(holder.child.kill("SIGKILL")).toBe(true);
    await expect(holder.exited).resolves.toEqual({
      code: null,
      signal: "SIGKILL",
    });
    const fixture = ownerUow();
    await new CoordinatedObjectStorage(
      root,
      fixture.uow,
      clock,
    ).recoverOwners();
    const owner = await readOwner(root);
    expect(owner.pid).toBe(process.pid);
    expect(owner.id).not.toBe(previous.id);
    expect(fixture.recovered).toEqual([owner.id]);
    expect(await readFile(path.join(root, "existing-object"))).toEqual(bytes);
  }, 15000);

  it("shares one acquired runtime across same-process DI instances", async () => {
    const root = await temporaryRoot();
    const first = ownerUow();
    const second = ownerUow();
    const a = new CoordinatedObjectStorage(root, first.uow, clock);
    const b = new CoordinatedObjectStorage(
      path.join(root, "."),
      second.uow,
      clock,
    );
    await Promise.all([a.recoverOwners(), b.recoverOwners()]);
    expect(first.recovered).toEqual([(await readOwner(root)).id]);
    expect(second.recovered).toEqual([]);
  });

  it("refuses a known live PID with an unrelated runtime id even when the owner file is very old", async () => {
    const root = await temporaryRoot();
    const raw = JSON.stringify({
      pid: process.pid,
      id: "a-prior-runtime-not-this-process",
    });
    await writeFile(ownerFile(root), raw);
    await utimes(
      ownerFile(root),
      new Date("2000-01-01"),
      new Date("2000-01-01"),
    );
    const fixture = ownerUow();
    await expect(
      new CoordinatedObjectStorage(root, fixture.uow, clock).recoverOwners(),
    ).rejects.toMatchObject({ code: "OBJECT_BUSY" });
    expect(fixture.recovered).toEqual([]);
    expect(await readFile(ownerFile(root), "utf8")).toBe(raw);
  });

  it.each([
    null,
    {},
    { pid: 0 },
    { pid: -1 },
    { pid: "not-a-pid" },
    { pid: 1.5 },
  ])("fails closed for invalid owner shape %j without entering database recovery", async (value) => {
    const root = await temporaryRoot();
    const raw = JSON.stringify(value);
    await writeFile(ownerFile(root), raw);
    const fixture = ownerUow();
    await expect(
      new CoordinatedObjectStorage(root, fixture.uow, clock).recoverOwners(),
    ).rejects.toMatchObject({ code: "OBJECT_BUSY" });
    expect(fixture.recovered).toEqual([]);
    expect(await readFile(ownerFile(root), "utf8")).toBe(raw);
    await expect(stat(recoveryFile(root))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("does not repair malformed owner JSON or start database recovery", async () => {
    const root = await temporaryRoot();
    const raw = '{"pid":';
    await writeFile(ownerFile(root), raw);
    const fixture = ownerUow();
    await expect(
      new CoordinatedObjectStorage(root, fixture.uow, clock).recoverOwners(),
    ).rejects.toMatchObject({ code: "STORAGE_OWNER_UNKNOWN" });
    expect(fixture.recovered).toEqual([]);
    expect(await readFile(ownerFile(root), "utf8")).toBe(raw);
    await expect(stat(recoveryFile(root))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuses an unknown recovery lock without assuming age proves its owner ended", async () => {
    const root = await temporaryRoot();
    const raw = "unknown-recovery-owner";
    await writeFile(recoveryFile(root), raw);
    await utimes(
      recoveryFile(root),
      new Date("2000-01-01"),
      new Date("2000-01-01"),
    );
    const fixture = ownerUow();
    await expect(
      new CoordinatedObjectStorage(root, fixture.uow, clock).recoverOwners(),
    ).rejects.toMatchObject({ code: "STORAGE_OWNER_UNKNOWN" });
    expect(fixture.recovered).toEqual([]);
    expect(await readFile(recoveryFile(root), "utf8")).toBe(raw);
    await expect(stat(ownerFile(root))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
