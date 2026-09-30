import { spawn } from "node:child_process";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import { acquireDriveRuntime } from "@repo/core/adapters/node/drive/runtimeOwnership";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  driveTarget,
  failedControl,
} from "@repo/core/application/integration/drive/runner";
import type { DriveControl } from "@repo/core/domain/integration/drive";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  createDriveRuntime,
  type DriveRuntime,
} from "../../../../../../apps/web/app/driveRuntime.node";
import { createNodeShutdown } from "../../../../../../apps/web/scripts/nodeShutdown";
import { driveFixture, driveNow, driveRejected } from "./driveFixtures";

type Fixture = Awaited<ReturnType<typeof driveFixture>>;
let fixture: Fixture | undefined;
let c: HollowContainer;
let e: NodeDriveExecution;
let runtime: DriveRuntime | undefined;
let database: string;
const pending: Promise<unknown>[] = [];
const releases: (() => void)[] = [];
const root = process.env.DRIVE_S5A_ROOT;
if (!root || !root.startsWith("/") || !root.includes("/p5c1-s5a-"))
  throw Error("DRIVE_ROOT");
function f() {
  if (!fixture) throw Error("DRIVE_FIXTURE");
  return fixture;
}
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  releases.push(resolve);
  return { promise, resolve };
}
function container(execution: NodeDriveExecution): HollowContainer {
  const unavailable = async (): Promise<never> => {
    throw Error("DRIVE_NO_HTTP");
  };
  return {
    ...createHollowContainer(f().db, "http://localhost:3100", {
      send: async () => {},
    }),
    unitOfWorkProvider: f().uow,
    clock: { now: () => driveNow },
    idGenerator: { next: () => f().id(), validate: () => true },
    drive: {
      runtimeGeneration: execution.runtimeGeneration,
      execution,
      picker: { appId: "1", apiKey: "synthetic" },
      wake: () => {},
      protector: {
        available: () => true,
        protect: () => "synthetic",
        reveal: () => "synthetic",
      },
      authorization: {
        authorization: unavailable,
        exchange: unavailable,
        refresh: unavailable,
        verifyCandidate: unavailable,
      },
      folders: {
        generateFolderId: unavailable,
        createFolder: unavailable,
        inspectFolder: unavailable,
      },
    },
  };
}
async function seed(generation = e.runtimeGeneration) {
  const row = await f().control({ kind: "refresh", phase: "queued" });
  await f().uow.run((u) => u.driveControls.insert(row));
  const owner = { ...f().owner(), runtimeGeneration: generation };
  const claimed: DriveControl = {
    ...row,
    version: 2,
    owner,
    credentialUse: {
      kind: "bound",
      version: 1,
      ownerToken: owner.token,
      runtimeGeneration: generation,
    },
    data: { kind: "refresh", phase: "running" },
  };
  return {
    row,
    claimed,
    target: driveTarget("control", row.id, owner),
    claim: async () => {
      expect(
        await f().uow.run((u) => u.driveControls.claim(claimed, row.version)),
      ).toBe(true);
      return claimed;
    },
  };
}
beforeEach(async () => {
  fixture = await driveFixture();
  const directory = process.env.DRIVE_TEST_ROOT;
  if (!directory) throw Error("DRIVE_ROOT");
  const entries = await readdir(directory);
  if (entries.length !== 1 || !entries[0]?.startsWith("drive-"))
    throw Error("DRIVE_DB_PATH");
  database = await realpath(join(directory, entries[0], "app.db"));
  e = new NodeDriveExecution("synthetic-runtime", undefined, {
    operationMs: 20,
    closeMs: 10,
  });
  c = container(e);
});
afterEach(async (ctx) => {
  for (const release of releases.splice(0)) release();
  await Promise.allSettled(pending.splice(0));
  await runtime?.quiesce();
  await e.stop();
  runtime = undefined;
  const owned = fixture;
  fixture = undefined;
  await owned?.close(ctx.task.result?.state === "pass");
});
test("R1 maintenance commits before readiness and boot failure cannot become successful wake", async () => {
  const row = await f().control({ kind: "picker", phase: "queued" });
  await f().uow.run((u) => u.driveControls.insert(row));
  c = { ...c, clock: { now: () => new Date(row.expiresAt.getTime() + 1) } };
  runtime = await createDriveRuntime(
    c,
    "http://localhost:3100/auth/drive/callback",
  );
  const saved = await f().uow.run((u) => u.driveControls.find(row.id));
  expect(
    saved?.data.phase === "failed" &&
      saved.data.failure === "DRIVE_EXPIRED" &&
      saved.owner.state === "none",
  ).toBe(true);
  await runtime.quiesce();
  const failureExecution = new NodeDriveExecution("synthetic-failed-boot");
  const failure = {
    ...container(failureExecution),
    unitOfWorkProvider: {
      run: async (): Promise<never> => {
        throw Error("DRIVE_DB_UNKNOWN");
      },
    },
  };
  expect(
    await driveRejected(() =>
      createDriveRuntime(failure, "http://localhost:3100/auth/drive/callback"),
    ),
  ).toBe(true);
  expect(
    !failureExecution.accepting() &&
      failureExecution.unacknowledged(1).length === 0,
  ).toBe(true);
});
test("R3 dedicated child exit precedes same-database recovery commit and predecessor ACK", async () => {
  const directory = join(root, "runtime", "predecessor");
  const req = createRequire(resolve("apps/web/package.json"));
  const source = pathToFileURL(
    resolve("packages/core/src/adapters/node/drive/runtimeOwnership.ts"),
  ).href;
  const script = `const {acquireDriveRuntime}=await import(${JSON.stringify(source)});const owner=await acquireDriveRuntime(process.env.DRIVE_CHILD_DIRECTORY,process.env.DRIVE_CHILD_DATABASE);process.on('message',message=>{if(message==='stop')process.disconnect();});process.send({generation:owner.runtimeGeneration});`;
  const child = spawn(
    process.execPath,
    [
      "--import",
      pathToFileURL(req.resolve("tsx")).href,
      "--input-type=module",
      "-e",
      script,
    ],
    {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
        NODE_DISABLE_COMPILE_CACHE: "1",
        TSX_DISABLE_CACHE: "1",
        DRIVE_CHILD_DIRECTORY: directory,
        DRIVE_CHILD_DATABASE: database,
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  let pipeBytes = 0;
  let exited = false;
  let disconnected = false;
  const pipeEnd = [false, false];
  const pipeClose = [false, false];
  for (const [index, pipe] of [child.stdout!, child.stderr!].entries()) {
    pipe.on("data", (bytes: Buffer) => {
      pipeBytes += bytes.length;
    });
    pipe.once("end", () => {
      pipeEnd[index] = true;
    });
    pipe.once("close", () => {
      pipeClose[index] = true;
    });
  }
  child.once("exit", (code) => {
    exited = code === 0;
  });
  child.once("disconnect", () => {
    disconnected = true;
  });
  const closed = new Promise<void>((yes, no) => {
    child.once("error", () => no(Error("DRIVE_CHILD")));
    child.once("close", (code) =>
      code === 0 ? yes() : no(Error("DRIVE_CHILD")),
    );
  });
  const ready = new Promise<string>((yes, no) => {
    child.once("message", (message: unknown) => {
      if (
        typeof message === "object" &&
        message &&
        "generation" in message &&
        typeof message.generation === "string" &&
        /^[a-f0-9-]{36}$/.test(message.generation)
      )
        yes(message.generation);
      else no(Error("DRIVE_CHILD_MESSAGE"));
    });
    child.once("close", () => no(Error("DRIVE_CHILD_READY")));
  });
  const metadata = await open(
    join(root, "predecessor-child.json"),
    "wx",
    0o600,
  );
  try {
    await metadata.writeFile(
      JSON.stringify({ pid: child.pid, at: new Date().toISOString() }),
    );
    await metadata.sync();
  } finally {
    await metadata.close();
  }
  let generation: string;
  try {
    generation = await ready;
    expect(
      await driveRejected(() => acquireDriveRuntime(directory, database)),
    ).toBe(true);
  } finally {
    if (child.connected) child.send("stop");
    await closed;
  }
  let ended = false;
  try {
    process.kill(child.pid!, 0);
  } catch (error) {
    ended = Boolean(
      error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ESRCH",
    );
  }
  expect(
    exited &&
      disconnected &&
      ended &&
      pipeEnd.every(Boolean) &&
      pipeClose.every(Boolean) &&
      pipeBytes === 0,
  ).toBe(true);
  const op = await seed(generation);
  await op.claim();
  await e.stop();
  const ownership = await acquireDriveRuntime(directory, database);
  e = new NodeDriveExecution(ownership.runtimeGeneration, ownership);
  c = container(e);
  expect(e.predecessors().length === 1 && !e.accepting()).toBe(true);
  runtime = await createDriveRuntime(
    c,
    "http://localhost:3100/auth/drive/callback",
  );
  const saved = await f().uow.run((u) => u.driveControls.find(op.row.id));
  expect(
    saved?.owner.state === "closed" &&
      saved.data.phase === "failed" &&
      e.predecessors().length === 0 &&
      e.unacknowledged(1).length === 0,
  ).toBe(true);
  expect((await lstat(join(directory, "owner.json"))).size <= 16384).toBe(true);
});
test("R6 unknown refuses DB close until real-close save ACK and explicit drain", async () => {
  const op = await seed();
  const finish = gate();
  await e.withCaller(op.target, op.claim, async () => {
    const handle = e.run(op.target, async () => {
      await finish.promise;
      return "late";
    });
    const closed = handle.closed.then(
      () => false,
      () => true,
    );
    expect((await handle.result).kind === "failure" && (await closed)).toBe(
      true,
    );
    const row = await f().uow.run((u) => u.driveControls.find(op.row.id));
    if (!row) throw Error("DRIVE_ROW");
    expect(
      await f().uow.run((u) =>
        u.driveControls.replace(
          {
            ...failedControl(row, "DRIVE_UNAVAILABLE", driveNow),
            owner: { ...op.target.owner, state: "unknown" },
          },
          row.version,
        ),
      ),
    ).toBe(true);
  });
  runtime = await createDriveRuntime(
    c,
    "http://localhost:3100/auth/drive/callback",
  );
  let dbClosed = false;
  let listenerClosed = 0;
  const shutdown = createNodeShutdown({
    quiesce: () => runtime!.quiesce(),
    closeListener: async () => {
      listenerClosed++;
    },
    shutdown: async () => {
      dbClosed = true;
    },
  });
  expect(await driveRejected(shutdown)).toBe(true);
  expect(
    !dbClosed &&
      listenerClosed === 1 &&
      (await f().uow.run((u) => u.driveControls.find(op.row.id)))?.owner
        .state === "unknown",
  ).toBe(true);
  finish.resolve();
  await new Promise((resolve) => setTimeout(resolve, 1));
  await shutdown();
  const saved = await f().uow.run((u) => u.driveControls.find(op.row.id));
  expect(
    dbClosed &&
      listenerClosed === 1 &&
      saved?.owner.state === "closed" &&
      saved.data.phase === "failed" &&
      e.unacknowledged(1).length === 0 &&
      !e.accepting(),
  ).toBe(true);
});
