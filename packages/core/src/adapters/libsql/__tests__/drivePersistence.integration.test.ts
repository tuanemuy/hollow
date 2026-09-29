import {
  DRIVE_LIMITS,
  type DriveControl,
} from "@repo/core/domain/integration/drive";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { driveFixture, driveNow, driveRejected } from "./driveFixtures";

describe("Drive isolated persistence", () => {
  let current: Awaited<ReturnType<typeof driveFixture>> | undefined;
  beforeEach(async () => {
    current = await driveFixture();
  });
  afterEach(async (c) => {
    await current?.close(c.task.result?.state !== "fail");
    current = undefined;
  });
  function f() {
    if (!current) throw Error("DRIVE_FIXTURE_MISSING");
    return current;
  }
  it("hydrates dedicated connection without changing Google identity or LLM", async () => {
    const x = f();
    const c = await x.uow.run((u) =>
      u.driveConnections.find(x.context.accountId),
    );
    expect(
      c?.state === "linked" &&
        c.epoch === 1 &&
        c.autoBackup === false &&
        c.folder === null,
    ).toBe(true);
    for (const table of ["google_identities", "openrouter_connections"])
      expect(
        (await x.client.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0]
          ?.n === 0,
      ).toBe(true);
  });
  it("connection CAS rejects stale writes and separates refresh from epoch", async () => {
    const x = f();
    await x.uow.run(async (u) => {
      const c = await u.driveConnections.find(x.context.accountId);
      if (!c || c.state !== "linked") throw Error("DRIVE_FIXTURE_STATE");
      const next = {
        ...c,
        version: c.version + 1,
        credentialVersion: c.credentialVersion + 1,
        credential: { ...c.credential, envelope: "synthetic-next" },
      };
      expect(await u.driveConnections.replace(next, c.version, "refresh")).toBe(
        true,
      );
      expect(await u.driveConnections.replace(next, c.version, "refresh")).toBe(
        false,
      );
      const found = await u.driveConnections.find(c.accountId);
      expect(
        found?.epoch === c.epoch &&
          found?.settingsVersion === c.settingsVersion &&
          found?.credentialVersion === 2,
      ).toBe(true);
    });
  });
  it("candidate after close holds no HTTP slot and can be adopted", async () => {
    const x = f();
    const a = await x.attempt();
    const owner = x.owner();
    await x.uow.run((u) => u.driveAttempts.insert(a));
    await x.uow.run(async (u) => {
      expect(await u.driveAttempts.claim(a.id, 1, owner, driveNow)).toBe(true);
      expect(
        await u.driveAttempts.replace(
          {
            ...a,
            version: 3,
            owner: { ...owner, state: "closed" },
            data: {
              phase: "candidate",
              candidateEnvelope: "synthetic-candidate",
            },
          },
          2,
        ),
      ).toBe(true);
      expect((await u.driveControls.held(a.accountId)).account === 0).toBe(
        true,
      );
      const c = await u.driveConnections.find(a.accountId);
      if (!c || c.state !== "linked") throw Error("DRIVE_FIXTURE_STATE");
      expect(
        await u.driveConnections.replace(
          {
            ...c,
            epoch: 2,
            version: c.version + 1,
            credentialVersion: 2,
            settingsVersion: 3,
          },
          c.version,
          "adopt",
        ),
      ).toBe(true);
    });
    expect(
      (await x.uow.run((u) => u.driveAttempts.find(a.id)))?.data.phase ===
        "candidate",
    ).toBe(true);
  });
  it("unknown is not pruned, cannot be reclaimed, and blocks adoption until closed", async () => {
    const x = f();
    const a = await x.attempt();
    const owner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveAttempts.insert(a);
      await u.driveAttempts.claim(a.id, 1, owner, driveNow);
      expect(
        await u.driveAttempts.replace(
          {
            ...a,
            version: 3,
            owner: { ...owner, state: "unknown" },
            data: { phase: "failed", failure: "DRIVE_EXCHANGE_UNKNOWN" },
            terminalAt: driveNow,
          },
          2,
        ),
      ).toBe(true);
      expect(
        await u.driveAttempts.prune(
          new Date(driveNow.getTime() + DRIVE_LIMITS.historyMs + 1),
          100,
        ),
      ).toBe(0);
      expect((await u.driveControls.held(a.accountId)).account === 1).toBe(
        true,
      );
      const c = await u.driveConnections.find(a.accountId);
      if (!c || c.state !== "linked") throw Error("DRIVE_FIXTURE_STATE");
      expect(
        await u.driveConnections.replace(
          {
            ...c,
            epoch: 2,
            version: c.version + 1,
            credentialVersion: 2,
            settingsVersion: 3,
          },
          c.version,
          "adopt",
        ),
      ).toBe(false);
      expect(await u.driveAttempts.claim(a.id, 3, x.owner(), driveNow)).toBe(
        false,
      );
    });
  });
  it("global two and account one owner limit does not count closed candidates", async () => {
    const x = f();
    const b = await x.account();
    const c = await x.account();
    const rows = [
      await x.control(),
      await x.control({ kind: "folder-create", phase: "queued" }, b),
      await x.control({ kind: "folder-create", phase: "queued" }, c),
      await x.control(),
    ];
    for (const row of rows) await x.uow.run((u) => u.driveControls.insert(row));
    for (const [i, row] of rows.entries())
      expect(
        await x.uow.run((u) =>
          u.driveControls.claim(
            {
              ...row,
              version: 2,
              owner: x.owner(),
              data: { kind: "folder-create", phase: "allocating" },
            },
            1,
          ),
        ),
      ).toBe(i < 2);
    expect(
      (await x.uow.run((u) => u.driveControls.held(x.context.accountId)))
        .global === 2,
    ).toBe(true);
  });
  it("queue saturation and unknown still allow one local disconnect without releasing owners", async () => {
    const x = f();
    const first = await x.control();
    const owner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveControls.insert(first);
      await u.driveControls.claim(
        {
          ...first,
          version: 2,
          owner,
          data: { kind: "folder-create", phase: "allocating" },
        },
        1,
      );
      await u.driveControls.replace(
        {
          ...first,
          version: 3,
          owner: { ...owner, state: "unknown" },
          data: {
            kind: "folder-create",
            phase: "failed",
            failure: "DRIVE_CREATE_UNKNOWN",
            identity: null,
          },
          terminalAt: driveNow,
        },
        2,
      );
    });
    for (let i = 0; i < 10; i++) {
      const row = await x.control();
      await x.uow.run((u) => u.driveControls.insert(row));
    }
    const extra = await x.control();
    expect(
      await driveRejected(() =>
        x.uow.run((u) => u.driveControls.insert(extra)),
      ),
    ).toBe(true);
    const d = await x.control({ kind: "disconnect", phase: "queued" });
    await x.uow.run((u) => u.driveControls.insert(d));
    const duplicate = await x.control({ kind: "disconnect", phase: "queued" });
    expect(
      await driveRejected(() =>
        x.uow.run((u) => u.driveControls.insert(duplicate)),
      ),
    ).toBe(true);
    await x.uow.run(async (u) => {
      const c = await u.driveConnections.find(d.accountId);
      if (!c) throw Error("DRIVE_FIXTURE_STATE");
      expect(
        await u.driveConnections.replace(
          {
            ...c,
            state: "unlinked",
            credential: null,
            folder: null,
            lastUsedAt: null,
            epoch: c.epoch + 1,
            credentialVersion: c.credentialVersion + 1,
            settingsVersion: c.settingsVersion + 1,
            version: c.version + 1,
          },
          c.version,
          "disconnect",
        ),
      ).toBe(true);
      expect(
        await u.driveControls.replace(
          {
            ...d,
            version: 2,
            data: { kind: "disconnect", phase: "completed", resultEpoch: 2 },
            terminalAt: driveNow,
          },
          1,
        ),
      ).toBe(true);
      expect((await u.driveControls.held(d.accountId)).account === 1).toBe(
        true,
      );
    });
  });
  it("Picker waiting is closed, single-live, and expires without provider work", async () => {
    const x = f();
    const row = await x.control({ kind: "picker", phase: "queued" });
    const owner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveControls.insert(row);
      expect(
        await u.driveControls.claim(
          {
            ...row,
            version: 2,
            owner,
            data: { kind: "picker", phase: "running" },
          },
          1,
        ),
      ).toBe(true);
      expect(
        await u.driveControls.replace(
          {
            ...row,
            version: 3,
            owner: { ...owner, state: "closed" },
            data: {
              kind: "picker",
              phase: "awaiting-selection",
              ticketHash: "synthetic-ticket",
            },
          },
          2,
        ),
      ).toBe(true);
    });
    const duplicate = await x.control({ kind: "picker", phase: "queued" });
    expect(
      await driveRejected(() =>
        x.uow.run((u) => u.driveControls.insert(duplicate)),
      ),
    ).toBe(true);
    expect(
      (await x.uow.run((u) => u.driveControls.held(row.accountId))).account ===
        0,
    ).toBe(true);
    expect(
      await x.uow.run((u) => u.driveControls.prune(row.expiresAt, 100)),
    ).toBe(1);
    expect(
      (await x.uow.run((u) => u.driveControls.find(row.id)))?.data.phase ===
        "failed",
    ).toBe(true);
  });
  it("create binds one ID and permits only one explicit additional send", async () => {
    const x = f();
    const row = await x.control();
    const owner = x.owner();
    const identity = {
      fileId: "synthetic-folder",
      marker: "synthetic-marker",
      sends: 0 as const,
      observedParent: null,
    };
    await x.uow.run(async (u) => {
      await u.driveControls.insert(row);
      await u.driveControls.claim(
        {
          ...row,
          version: 2,
          owner,
          data: { kind: "folder-create", phase: "allocating" },
        },
        1,
      );
      await u.driveControls.replace(
        {
          ...row,
          version: 3,
          owner: { ...owner, state: "closed" },
          data: { kind: "folder-create", phase: "prepared", ...identity },
        },
        2,
      );
    });
    let version = 3;
    for (const sends of [1, 2] as const) {
      const activeOwner = x.owner();
      const running: DriveControl = {
        ...row,
        version: ++version,
        owner: activeOwner,
        data: { kind: "folder-create", phase: "running", ...identity, sends },
      };
      expect(
        await x.uow.run((u) => u.driveControls.claim(running, version - 1)),
      ).toBe(true);
      const closed: DriveControl = {
        ...running,
        version: ++version,
        owner: { ...activeOwner, state: "closed" },
        data: {
          ...running.data,
          kind: "folder-create",
          phase: "reconciling",
          ...identity,
          sends,
        },
      };
      expect(
        await x.uow.run((u) => u.driveControls.replace(closed, version - 1)),
      ).toBe(true);
    }
    const last = await x.uow.run((u) => u.driveControls.find(row.id));
    if (!last) throw Error("DRIVE_FIXTURE_STATE");
    expect(
      await driveRejected(() =>
        x.uow.run((u) =>
          u.driveControls.claim(
            {
              ...last,
              version: last.version + 1,
              owner: x.owner(),
              data: {
                kind: "folder-create",
                phase: "running",
                ...identity,
                sends: 3 as 2,
              },
            },
            last.version,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      await driveRejected(() =>
        x.uow.run((u) =>
          u.driveControls.claim(
            {
              ...last,
              version: last.version + 1,
              owner: x.owner(),
              data: {
                kind: "folder-create",
                phase: "running",
                ...identity,
                fileId: "replacement",
                sends: 2,
              },
            },
            last.version,
          ),
        ),
      ),
    ).toBe(true);
  });
  it("terminal control cannot reacquire ownership but its held owner can close", async () => {
    const x = f();
    const row = await x.control();
    const owner = x.owner();
    const failed: DriveControl = {
      ...row,
      version: 3,
      owner,
      terminalAt: driveNow,
      data: {
        kind: "folder-create",
        phase: "failed",
        failure: "DRIVE_UNAVAILABLE",
        identity: null,
      },
    };
    await x.uow.run(async (u) => {
      await u.driveControls.insert(row);
      expect(
        await u.driveControls.claim(
          {
            ...row,
            version: 2,
            owner,
            data: { kind: "folder-create", phase: "allocating" },
          },
          1,
        ),
      ).toBe(true);
      expect(await u.driveControls.replace(failed, 2)).toBe(true);
      expect(
        await u.driveControls.replace(
          { ...failed, version: 4, owner: { ...owner, state: "unknown" } },
          3,
        ),
      ).toBe(true);
      expect((await u.driveControls.held(row.accountId)).account === 1).toBe(
        true,
      );
      expect(
        await u.driveControls.replace(
          { ...failed, version: 5, owner: { ...owner, state: "closed" } },
          4,
        ),
      ).toBe(true);
      expect(
        await u.driveControls.claim(
          { ...failed, version: 6, owner: x.owner() },
          5,
        ),
      ).toBe(false);
      expect((await u.driveControls.held(row.accountId)).account === 0).toBe(
        true,
      );
    });
    const next = x.owner();
    expect(
      await driveRejected(() =>
        x.client.execute({
          sql: "UPDATE drive_control_operations SET version=version+1,owner_state='active',runtime_generation=?,owner_token=? WHERE id=?",
          args: [next.runtimeGeneration, next.token, row.id],
        }),
      ),
    ).toBe(true);
    const saved = await x.uow.run((u) => u.driveControls.find(row.id));
    expect(
      saved?.version === 5 &&
        saved.data.phase === "failed" &&
        saved.owner.state === "closed",
    ).toBe(true);
    const a = await x.attempt();
    const aOwner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveAttempts.insert(a);
      expect(await u.driveAttempts.claim(a.id, 1, aOwner, driveNow)).toBe(true);
      expect(
        await u.driveAttempts.replace(
          {
            ...a,
            version: 3,
            owner: { ...aOwner, state: "closed" },
            terminalAt: driveNow,
            data: { phase: "failed", failure: "DRIVE_UNAVAILABLE" },
          },
          2,
        ),
      ).toBe(true);
      expect(await u.driveAttempts.claim(a.id, 3, x.owner(), driveNow)).toBe(
        false,
      );
    });
    expect(
      await driveRejected(() =>
        x.client.execute({
          sql: "UPDATE drive_authorization_attempts SET version=version+1,owner_state='active',runtime_generation=?,owner_token=? WHERE id=?",
          args: [next.runtimeGeneration, next.token, a.id],
        }),
      ),
    ).toBe(true);
  });
  it("new create intent increments sends while metadata reconciliation keeps it", async () => {
    const x = f();
    const row = await x.control();
    const owner = x.owner();
    const identity = {
      fileId: "synthetic-folder",
      marker: "synthetic-marker",
      observedParent: null,
    };
    await x.uow.run(async (u) => {
      await u.driveControls.insert(row);
      expect(
        await u.driveControls.claim(
          {
            ...row,
            version: 2,
            owner,
            data: { kind: "folder-create", phase: "allocating" },
          },
          1,
        ),
      ).toBe(true);
      expect(
        await u.driveControls.replace(
          {
            ...row,
            version: 3,
            owner: { ...owner, state: "closed" },
            data: {
              kind: "folder-create",
              phase: "prepared",
              ...identity,
              sends: 0,
            },
          },
          2,
        ),
      ).toBe(true);
      const sendOwner = x.owner();
      expect(
        await u.driveControls.claim(
          {
            ...row,
            version: 4,
            owner: sendOwner,
            data: {
              kind: "folder-create",
              phase: "running",
              ...identity,
              sends: 1,
            },
          },
          3,
        ),
      ).toBe(true);
      expect(
        await u.driveControls.replace(
          {
            ...row,
            version: 5,
            owner: { ...sendOwner, state: "closed" },
            data: {
              kind: "folder-create",
              phase: "reconciling",
              ...identity,
              sends: 1,
            },
          },
          4,
        ),
      ).toBe(true);
      const metadataOwner = x.owner();
      expect(
        await u.driveControls.claim(
          {
            ...row,
            version: 6,
            owner: metadataOwner,
            data: {
              kind: "folder-create",
              phase: "reconciling",
              ...identity,
              sends: 1,
            },
          },
          5,
        ),
      ).toBe(true);
      expect(
        await u.driveControls.replace(
          {
            ...row,
            version: 7,
            owner: { ...metadataOwner, state: "closed" },
            data: {
              kind: "folder-create",
              phase: "reconciling",
              ...identity,
              sends: 1,
            },
          },
          6,
        ),
      ).toBe(true);
    });
    const nextOwner = x.owner();
    const next: DriveControl = {
      ...row,
      version: 8,
      owner: nextOwner,
      data: { kind: "folder-create", phase: "running", ...identity, sends: 1 },
    };
    expect(
      await driveRejected(() =>
        x.uow.run((u) => u.driveControls.claim(next, 7)),
      ),
    ).toBe(true);
    expect(
      await driveRejected(() =>
        x.client.execute({
          sql: "UPDATE drive_control_operations SET version=version+1,phase='running',data=?,owner_state='active',runtime_generation=?,owner_token=? WHERE id=?",
          args: [
            JSON.stringify(next.data),
            nextOwner.runtimeGeneration,
            nextOwner.token,
            row.id,
          ],
        }),
      ),
    ).toBe(true);
    expect(
      await driveRejected(() =>
        x.client.execute({
          sql: "UPDATE drive_control_operations SET version=version+1,data=json_set(data,'$.sends',2) WHERE id=?",
          args: [row.id],
        }),
      ),
    ).toBe(true);
    await x.uow.run(async (u) => {
      expect((await u.driveControls.held(row.accountId)).account === 0).toBe(
        true,
      );
      expect(
        await u.driveControls.claim(
          {
            ...next,
            data: {
              kind: "folder-create",
              phase: "running",
              ...identity,
              sends: 2,
            },
          },
          7,
        ),
      ).toBe(true);
      expect(
        await u.driveControls.replace(
          {
            ...next,
            version: 9,
            owner: { ...nextOwner, state: "closed" },
            data: {
              kind: "folder-create",
              phase: "reconciling",
              ...identity,
              sends: 2,
            },
          },
          8,
        ),
      ).toBe(true);
    });
    const third = {
      ...next,
      version: 10,
      owner: x.owner(),
      data: {
        kind: "folder-create" as const,
        phase: "running" as const,
        ...identity,
        sends: 2 as const,
      },
    };
    expect(
      await driveRejected(() =>
        x.uow.run((u) => u.driveControls.claim(third, 9)),
      ),
    ).toBe(true);
    expect(
      await driveRejected(() =>
        x.client.execute({
          sql: "UPDATE drive_control_operations SET version=version+1,phase='running',data=?,owner_state='active',runtime_generation=?,owner_token=? WHERE id=?",
          args: [
            JSON.stringify(third.data),
            third.owner.runtimeGeneration,
            third.owner.token,
            row.id,
          ],
        }),
      ),
    ).toBe(true);
    const saved = await x.uow.run((u) => u.driveControls.find(row.id));
    expect(
      saved?.version === 9 &&
        saved.data.phase === "reconciling" &&
        saved.owner.state === "closed",
    ).toBe(true);
  });
  it("claim rechecks connection version after refresh and cancel fences success", async () => {
    const x = f();
    const row = await x.control();
    await x.uow.run(async (u) => {
      await u.driveControls.insert(row);
      const c = await u.driveConnections.find(row.accountId);
      if (!c || c.state !== "linked") throw Error("DRIVE_FIXTURE_STATE");
      await u.driveConnections.replace(
        {
          ...c,
          version: c.version + 1,
          credentialVersion: c.credentialVersion + 1,
        },
        c.version,
        "refresh",
      );
      expect(
        await u.driveControls.claim(
          {
            ...row,
            version: 2,
            owner: x.owner(),
            data: { kind: "folder-create", phase: "allocating" },
          },
          1,
        ),
      ).toBe(false);
    });
    const a = await x.attempt();
    const owner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveAttempts.insert(a);
      await u.driveAttempts.claim(a.id, 1, owner, driveNow);
      await u.driveAttempts.replace(
        {
          ...a,
          version: 3,
          owner,
          cancelGeneration: 1,
          data: { phase: "exchanging" },
        },
        2,
      );
    });
    expect(
      await driveRejected(() =>
        x.uow.run((u) =>
          u.driveAttempts.replace(
            {
              ...a,
              version: 4,
              cancelGeneration: 1,
              owner: { ...owner, state: "closed" },
              data: { phase: "candidate", candidateEnvelope: "synthetic" },
            },
            3,
          ),
        ),
      ),
    ).toBe(true);
  });
  it("CHECK rejects missing context, wrong lifetime, mixed union and failure code", async () => {
    const x = f();
    const row = await x.control();
    await x.uow.run((u) => u.driveControls.insert(row));
    for (const sql of [
      "auth_version=NULL",
      "expires_at=expires_at+1",
      "kind='picker'",
      "phase='failed',terminal_at=created_at,data='{}'",
    ])
      expect(
        await driveRejected(() =>
          x.client.execute({
            sql: `UPDATE drive_control_operations SET ${sql} WHERE id=?`,
            args: [row.id],
          }),
        ),
      ).toBe(true);
  });
  it("receipts retain history but detach browser only after receipt lifetime", async () => {
    const x = f();
    const d = await x.control({ kind: "disconnect", phase: "queued" });
    await x.uow.run(async (u) => {
      await u.driveControls.insert(d);
      await u.driveControls.replace(
        {
          ...d,
          version: 2,
          terminalAt: driveNow,
          data: { kind: "disconnect", phase: "completed", resultEpoch: 2 },
        },
        1,
      );
    });
    expect(
      await x.uow.run((u) =>
        u.driveControls.prune(
          new Date(driveNow.getTime() + DRIVE_LIMITS.receiptMs - 1),
          100,
        ),
      ),
    ).toBe(0);
    expect(
      await x.uow.run((u) =>
        u.driveControls.prune(
          new Date(driveNow.getTime() + DRIVE_LIMITS.receiptMs),
          100,
        ),
      ),
    ).toBe(1);
    const found = await x.uow.run((u) => u.driveControls.find(d.id));
    expect(found?.context === null && found.data.phase === "completed").toBe(
      true,
    );
    expect(
      (
        await x.uow.run((u) =>
          u.driveControls.history(d.accountId, driveNow, 100),
        )
      ).length,
    ).toBe(1);
    expect(
      await x.uow.run((u) =>
        u.driveControls.prune(
          new Date(driveNow.getTime() + DRIVE_LIMITS.historyMs),
          100,
        ),
      ),
    ).toBe(1);
  });
});
