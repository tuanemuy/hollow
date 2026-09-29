import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import { createNodeDriveRunner } from "@repo/core/adapters/node/drive/runner";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { driveChanged } from "@repo/core/application/integration/drive/current";
import type {
  DriveClosedProof,
  DriveExecutionTarget,
} from "@repo/core/application/integration/drive/ports";
import {
  driveTarget,
  failedControl,
  maintainDrive,
  prepareDriveClaim,
  reconcileDriveClosures,
} from "@repo/core/application/integration/drive/runner";
import type { DriveControl } from "@repo/core/domain/integration/drive";
import { afterEach, beforeEach, expect, test } from "vitest";
import { driveFixture, driveNow, driveRejected } from "./driveFixtures";

type Fixture = Awaited<ReturnType<typeof driveFixture>>;
let fixture: Fixture | undefined;
let c: HollowContainer;
let e: NodeDriveExecution;
const runtime = "synthetic-runtime";
const pending: Promise<unknown>[] = [];
const releases: (() => void)[] = [];
function f() {
  if (!fixture) throw Error("DRIVE_FIXTURE");
  return fixture;
}
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
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
      execution,
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
async function seed(
  generation = runtime,
  kind: "refresh" | "picker" = "refresh",
) {
  const row = await f().control({ kind, phase: "queued" });
  await f().uow.run((u) => u.driveControls.insert(row));
  const owner = { ...f().owner(), runtimeGeneration: generation };
  const claimed: DriveControl = {
    ...row,
    owner,
    version: 2,
    credentialUse: {
      kind: "bound",
      version: 1,
      ownerToken: owner.token,
      runtimeGeneration: generation,
    },
    data: { kind, phase: "running" },
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
async function failAfterClose(
  op: Awaited<ReturnType<typeof seed>>,
  beforeThrow?: () => Promise<void>,
) {
  return e.withCaller(op.target, op.claim, async () => {
    const h = e.run(op.target, async () => true);
    await h.result;
    await h.closed;
    await beforeThrow?.();
    throw Error("DRIVE_SAVE_ROLLBACK");
  });
}
async function current(id: string) {
  const row = await f().uow.run((u) => u.driveControls.find(id));
  if (!row) throw Error("DRIVE_ROW");
  return row;
}
beforeEach(async () => {
  fixture = await driveFixture();
  e = new NodeDriveExecution(runtime, undefined, {
    operationMs: 20,
    closeMs: 10,
  });
  c = container(e);
});
afterEach(async (ctx) => {
  for (const release of releases.splice(0)) release();
  await Promise.allSettled(pending.splice(0));
  await e.stop();
  const owned = fixture;
  fixture = undefined;
  await owned?.close(ctx.task.result?.state === "pass");
});

test("proof 1a: pending real-close waits for original caller", async () => {
  const op = await seed();
  const ready = gate();
  const finish = gate();
  const call = e.withCaller(op.target, op.claim, async () => {
    const h = e.run(op.target, async () => true);
    await h.result;
    await h.closed;
    ready.resolve();
    await finish.promise;
  });
  pending.push(call);
  await ready.promise;
  expect(e.hasPendingCallers() && (await maintainDrive(c)) === 0).toBe(true);
  expect(
    (await current(op.row.id)).owner.state === "active" &&
      e.unacknowledged(66).length === 1,
  ).toBe(true);
  finish.resolve();
  await call;
  await reconcileDriveClosures(c);
  expect(
    (await current(op.row.id)).owner.state === "closed" &&
      !e.hasPendingCallers(),
  ).toBe(true);
});
test("proof 1b: untracked is not ended", async () => {
  const op = await seed();
  expect(await driveRejected(() => failAfterClose(op))).toBe(true);
  const real = e.caller.bind(e);
  e.caller = () => "untracked";
  expect(await driveRejected(() => reconcileDriveClosures(c))).toBe(true);
  expect(
    (await current(op.row.id)).owner.state === "active" &&
      e.unacknowledged(66).length === 1,
  ).toBe(true);
  e.caller = real;
});
test("proof 2a: ended active rollback converges only after DB commit", async () => {
  const op = await seed();
  expect(await driveRejected(() => failAfterClose(op))).toBe(true);
  const original = c.unitOfWorkProvider;
  c = {
    ...c,
    unitOfWorkProvider: {
      run: async () => {
        throw Error("DRIVE_DB_UNKNOWN");
      },
    },
  };
  expect(await driveRejected(() => reconcileDriveClosures(c))).toBe(true);
  expect(
    e.unacknowledged(66).length === 1 &&
      (await current(op.row.id)).owner.state === "active",
  ).toBe(true);
  c = { ...c, unitOfWorkProvider: original };
  await reconcileDriveClosures(c);
  const row = await current(op.row.id);
  expect(
    row.data.phase === "failed" &&
      row.owner.state === "closed" &&
      e.unacknowledged(1).length === 0,
  ).toBe(true);
});
test("proof 2b: terminal cancellation keeps reason and time", async () => {
  const op = await seed();
  expect(
    await driveRejected(() =>
      failAfterClose(op, async () => {
        const row = await current(op.row.id);
        await f().uow.run((u) =>
          u.driveControls.replace(
            {
              ...failedControl(row, "DRIVE_CANCELLED", driveNow),
              cancelGeneration: 1,
            },
            row.version,
          ),
        );
      }),
    ),
  ).toBe(true);
  const before = await current(op.row.id);
  await reconcileDriveClosures(c);
  const row = await current(op.row.id);
  expect(
    row.owner.state === "closed" &&
      row.cancelGeneration === 1 &&
      row.data.phase === "failed" &&
      row.data.failure === "DRIVE_CANCELLED" &&
      row.terminalAt?.getTime() === before.terminalAt?.getTime(),
  ).toBe(true);
});
test("proof 3: committed success ACK failure blocks new owner", async () => {
  const op = await seed(runtime, "picker");
  let first = true;
  const ack = e.acknowledge.bind(e);
  e.acknowledge = async (p) => {
    if (first) {
      first = false;
      throw Error("DRIVE_ACK_UNKNOWN");
    }
    await ack(p);
  };
  expect(
    await driveRejected(() =>
      e.withCaller(op.target, op.claim, async () => {
        const h = e.run(op.target, async () => true);
        await h.result;
        await h.closed;
        await e.coordinate("settle", async () => {
          const row = await current(op.row.id);
          expect(
            await f().uow.run((u) =>
              u.driveControls.replace(
                {
                  ...row,
                  version: row.version + 1,
                  owner: { ...op.target.owner, state: "closed" },
                  terminalAt: driveNow,
                  data: { kind: "picker", phase: "completed" },
                },
                row.version,
              ),
            ),
          ).toBe(true);
          const proof = e.closure(op.target);
          if (proof.kind !== "closed") throw Error("DRIVE_PROOF");
          await e.acknowledge(proof.proof);
        });
      }),
    ),
  ).toBe(true);
  const next = {
    ...op.target,
    owner: { runtimeGeneration: runtime, token: "synthetic-next" },
  };
  let calls = 0;
  expect(
    await driveRejected(() =>
      e.withCaller(
        next,
        async () => {
          calls++;
          return null;
        },
        async () => true,
      ),
    ),
  ).toBe(true);
  expect(calls === 0).toBe(true);
  const before = await current(op.row.id);
  await reconcileDriveClosures(c);
  const after = await current(op.row.id);
  expect(
    after.version === before.version && after.data.phase === "completed",
  ).toBe(true);
  expect(
    (
      await e.withCaller(
        next,
        async () => {
          calls++;
          return null;
        },
        async () => true,
      )
    ).kind === "not-claimed" && calls === 1,
  ).toBe(true);
});
test("proof 4: ended unknown keeps owner until eventual work close", async () => {
  const op = await seed();
  const finish = gate();
  let rejected = false;
  await e.withCaller(op.target, op.claim, async () => {
    const h = e.run(op.target, async () => {
      await finish.promise;
      return "late-business";
    });
    const closed = h.closed.then(
      () => false,
      () => true,
    );
    expect((await h.result).kind === "failure").toBe(true);
    rejected = await closed;
    const row = await current(op.row.id);
    await f().uow.run((u) =>
      u.driveControls.replace(
        {
          ...failedControl(row, "DRIVE_UNAVAILABLE", driveNow),
          owner: { ...op.target.owner, state: "unknown" },
        },
        row.version,
      ),
    );
  });
  expect(
    rejected &&
      (await reconcileDriveClosures(c)) === 0 &&
      (await current(op.row.id)).owner.state === "unknown",
  ).toBe(true);
  const runner = createNodeDriveRunner(c, runtime);
  expect(await driveRejected(() => runner.stop())).toBe(true);
  finish.resolve();
  await new Promise((r) => setTimeout(r, 1));
  await runner.stop();
  const row = await current(op.row.id);
  expect(row.owner.state === "closed" && row.data.phase === "failed").toBe(
    true,
  );
});
test("proof 5a: normal null and current refusal release reservation", async () => {
  const op = await seed();
  let runs = 0;
  const result = await e.withCaller(
    op.target,
    async () => null,
    async () => {
      runs++;
    },
  );
  expect(
    result.kind === "not-claimed" &&
      runs === 0 &&
      e.caller(op.target) === "untracked" &&
      e.unacknowledged(1).length === 0,
  ).toBe(true);
  let rejected: Error | null = null;
  await e.withCaller(
    op.target,
    async () => {
      const prepared = await prepareDriveClaim(c, async () => {
        throw driveChanged();
      });
      if (prepared.kind === "rejected") {
        rejected = prepared.error;
        return null;
      }
      return prepared.value;
    },
    async () => {
      runs++;
    },
  );
  expect(
    rejected !== null &&
      e.accepting() &&
      e.caller(op.target) === "untracked" &&
      runs === 0,
  ).toBe(true);
  expect(
    (
      await e.withCaller(
        op.target,
        async () => null,
        async () => true,
      )
    ).kind === "not-claimed",
  ).toBe(true);
  let prunes = 0;
  const original = c.unitOfWorkProvider;
  c = {
    ...c,
    unitOfWorkProvider: {
      run: (work) =>
        original.run((u) =>
          work({
            ...u,
            driveAttempts: new Proxy(u.driveAttempts, {
              get(repo, prop) {
                if (prop === "prune")
                  return (...args: Parameters<typeof repo.prune>) => {
                    prunes++;
                    return repo.prune(...args);
                  };
                const v = Reflect.get(repo, prop);
                return typeof v === "function" ? v.bind(repo) : v;
              },
            }),
            driveControls: new Proxy(u.driveControls, {
              get(repo, prop) {
                if (prop === "prune")
                  return (...args: Parameters<typeof repo.prune>) => {
                    prunes++;
                    return repo.prune(...args);
                  };
                const v = Reflect.get(repo, prop);
                return typeof v === "function" ? v.bind(repo) : v;
              },
            }),
          }),
        ),
    },
  };
  const ready = gate();
  const finish = gate();
  const call = e.withCaller(
    op.target,
    async () => true,
    async () => {
      ready.resolve();
      await finish.promise;
    },
  );
  pending.push(call);
  await ready.promise;
  expect(
    e.hasPendingCallers() && (await maintainDrive(c)) === 0 && prunes === 0,
  ).toBe(true);
  finish.resolve();
  await call;
  const proof = e.closure(op.target);
  if (proof.kind !== "closed") throw Error("DRIVE_PROOF");
  await e.acknowledge(proof.proof);
  expect(
    !e.hasPendingCallers() && (await maintainDrive(c)) === 0 && prunes === 2,
  ).toBe(true);
});
test("proof 5b: claim commit unknown keeps exact no-native proof", async () => {
  const op = await seed();
  let runs = 0;
  expect(
    await driveRejected(() =>
      e.withCaller(
        op.target,
        async () => {
          await op.claim();
          throw Error("DRIVE_COMMIT_UNKNOWN");
        },
        async () => {
          runs++;
        },
      ),
    ),
  ).toBe(true);
  expect(
    runs === 0 &&
      e.caller(op.target) === "ended" &&
      e.closure(op.target).kind === "closed",
  ).toBe(true);
  await reconcileDriveClosures(c);
  expect((await current(op.row.id)).owner.state === "closed").toBe(true);
});
test("proof 6a: predecessor closes held rows before generation ACK", async () => {
  const op = await seed("synthetic-predecessor");
  await op.claim();
  let acknowledged = false;
  const previous = {
    runtimeGeneration: "synthetic-predecessor",
    evidenceId: "synthetic-evidence",
  };
  e = new NodeDriveExecution(runtime, {
    list: () => (acknowledged ? [] : [previous]),
    acknowledge: async () => {
      expect((await current(op.row.id)).owner.state === "closed").toBe(true);
      acknowledged = true;
    },
  });
  c = container(e);
  await reconcileDriveClosures(c);
  expect(
    acknowledged &&
      e.predecessors().length === 0 &&
      e.unacknowledged(1).length === 0,
  ).toBe(true);
});
test("proof 6b: wrong owner and missing row never acknowledge", async () => {
  const op = await seed();
  await op.claim();
  const makeProof = (target: DriveExecutionTarget): DriveClosedProof => ({
    target,
    source: "local-close",
    evidenceId: "synthetic-proof",
  });
  let proof = makeProof({
    ...op.target,
    owner: { runtimeGeneration: runtime, token: "wrong" },
  });
  let acks = 0;
  e.caller = () => "ended";
  e.unacknowledged = () => [proof];
  e.acknowledge = async () => {
    acks++;
  };
  expect(await driveRejected(() => reconcileDriveClosures(c))).toBe(true);
  proof = makeProof({ ...op.target, id: f().id() });
  expect(await driveRejected(() => reconcileDriveClosures(c))).toBe(true);
  expect(
    acks === 0 && (await current(op.row.id)).owner.state === "active",
  ).toBe(true);
});
