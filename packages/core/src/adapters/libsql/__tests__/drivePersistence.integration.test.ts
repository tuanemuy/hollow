import {
  DRIVE_LIMITS,
  type DriveControl,
  type DriveOwner,
} from "@repo/core/domain/integration/drive";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { driveFixture, driveNow, driveRejected } from "./driveFixtures";

function withOwner(owner: Exclude<DriveOwner, { state: "none" }>, version = 1) {
  return {
    owner,
    credentialUse: {
      kind: "bound" as const,
      runtimeGeneration: owner.runtimeGeneration,
      ownerToken: owner.token,
      version,
    },
  };
}

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
  it("preserves target names through confirmation and legacy terminal JSON through owner close", async () => {
    const x = f();
    for (const targetName of [undefined, null, "確認した保存先"]) {
      const pickerId = x.id();
      const row = await x.control({
        kind: "folder-select",
        phase: "queued",
        fileId: "synthetic-source",
        resourceKeyEnvelope: null,
        pickerId,
      });
      const owner = x.owner();
      const ready: DriveControl = {
        ...row,
        version: 3,
        ...withOwner({ ...owner, state: "closed" }),
        data: {
          kind: "folder-select",
          phase: "ready",
          sourceId: "synthetic-source",
          targetId: "synthetic-target",
          targetKeyEnvelope: null,
          ...(targetName === undefined ? {} : { targetName }),
        },
      };
      await x.uow.run(async (u) => {
        await u.driveControls.insert(row);
        expect(
          await u.driveControls.claim(
            {
              ...row,
              version: 2,
              ...withOwner(owner),
              data: {
                kind: "folder-select",
                phase: "running",
                fileId: "synthetic-source",
                resourceKeyEnvelope: null,
                pickerId,
              },
            },
            1,
          ),
        ).toBe(true);
        expect(await u.driveControls.replace(ready, 2)).toBe(true);
      });
      const saved = await x.uow.run((u) => u.driveControls.find(row.id));
      if (
        !saved ||
        saved.data.kind !== "folder-select" ||
        saved.data.phase !== "ready"
      )
        throw Error("DRIVE_FIXTURE_STATE");
      const readyData = saved.data;
      expect(Object.hasOwn(readyData, "targetName")).toBe(
        targetName !== undefined,
      );
      const verificationOwner = x.owner();
      const verifying: DriveControl = {
        ...saved,
        version: 4,
        ...withOwner(verificationOwner),
        data: {
          ...readyData,
          phase: "verifying-target",
          confirmedReadyVersion: saved.version,
        },
      };
      expect(
        await driveRejected(() =>
          x.uow.run((u) =>
            u.driveControls.claim(
              {
                ...verifying,
                data: {
                  ...readyData,
                  phase: "verifying-target",
                  confirmedReadyVersion: saved.version,
                  targetName: targetName === undefined ? null : "別の名称",
                },
              },
              3,
            ),
          ),
        ),
      ).toBe(true);
      await x.uow.run(async (u) => {
        expect(await u.driveControls.claim(verifying, 3)).toBe(true);
        const checked = await u.driveControls.find(row.id);
        expect(checked?.data).toEqual(verifying.data);
        expect(
          await u.driveControls.replace(
            {
              ...verifying,
              version: 5,
              owner: { ...verificationOwner, state: "closed" },
              terminalAt: driveNow,
              data: {
                kind: "folder-select",
                phase: "completed",
                folderId: "synthetic-target",
              },
            },
            4,
          ),
        ).toBe(true);
      });
    }
    const row = await x.control();
    const allocationOwner = x.owner();
    const sendOwner = x.owner();
    const identity = {
      fileId: "synthetic-legacy-folder",
      marker: "synthetic-legacy-marker",
      sends: 1,
      observedParent: null,
    };
    const failed: DriveControl = {
      ...row,
      version: 5,
      ...withOwner({ ...sendOwner, state: "unknown" }),
      terminalAt: driveNow,
      data: {
        kind: "folder-create",
        phase: "failed",
        failure: "DRIVE_CREATE_UNKNOWN",
        identity,
      },
    };
    await x.uow.run(async (u) => {
      await u.driveControls.insert(row);
      expect(
        await u.driveControls.claim(
          {
            ...row,
            version: 2,
            ...withOwner(allocationOwner),
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
            ...withOwner({ ...allocationOwner, state: "closed" }),
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
      expect(
        await u.driveControls.claim(
          {
            ...row,
            version: 4,
            ...withOwner(sendOwner),
            data: { kind: "folder-create", phase: "running", ...identity },
          },
          3,
        ),
      ).toBe(true);
      expect(await u.driveControls.replace(failed, 4)).toBe(true);
    });
    const before = await x.client.execute({
      sql: "SELECT data FROM drive_control_operations WHERE id=?",
      args: [row.id],
    });
    const saved = await x.uow.run((u) => u.driveControls.find(row.id));
    if (
      !saved ||
      saved.data.kind !== "folder-create" ||
      saved.data.phase !== "failed" ||
      saved.data.identity === null
    )
      throw Error("DRIVE_FIXTURE_STATE");
    const failedData = saved.data;
    expect(Object.hasOwn(saved.data.identity, "targetName")).toBe(false);
    expect(
      await driveRejected(() =>
        x.uow.run((u) =>
          u.driveControls.replace(
            {
              ...saved,
              version: 6,
              owner: { ...sendOwner, state: "closed" },
              data: {
                ...failedData,
                identity: { ...identity, targetName: null },
              },
            },
            5,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      await x.uow.run((u) =>
        u.driveControls.replace(
          {
            ...saved,
            version: 6,
            owner: { ...sendOwner, state: "closed" },
          },
          5,
        ),
      ),
    ).toBe(true);
    const after = await x.client.execute({
      sql: "SELECT data FROM drive_control_operations WHERE id=?",
      args: [row.id],
    });
    expect(after.rows[0]?.data).toBe(before.rows[0]?.data);
  });
  it("reads account history newest first across phases and scrubbed contexts with strict limits", async () => {
    const x = f();
    const first = await x.attempt();
    const second = await x.attempt({ ...x.context, browserEpoch: 2 });
    const folder = await x.control();
    const selected = await x.control({
      kind: "folder-select",
      phase: "queued",
      fileId: "synthetic-folder",
      resourceKeyEnvelope: null,
      pickerId: x.id(),
    });
    const disconnect = await x.control({ kind: "disconnect", phase: "queued" });
    const picker = await x.control({ kind: "picker", phase: "queued" });
    const refresh = await x.control({ kind: "refresh", phase: "queued" });
    await x.uow.run(async (u) => {
      await u.driveAttempts.insert(first);
      expect(
        await u.driveAttempts.replace(
          {
            ...first,
            version: 2,
            terminalAt: driveNow,
            confirmedFolderIdsEnvelope: null,
            data: { phase: "failed", failure: "DRIVE_CANCELLED" },
          },
          1,
        ),
      ).toBe(true);
      await u.driveAttempts.insert(second);
      for (const row of [folder, selected, disconnect, picker, refresh])
        await u.driveControls.insert(row);
    });
    const later = new Date(driveNow.getTime() + 1);
    const third = {
      ...(await x.attempt()),
      createdAt: later,
      updatedAt: later,
      expiresAt: new Date(later.getTime() + DRIVE_LIMITS.authorizationMs),
    };
    const owner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveAttempts.insert(third);
      expect(await u.driveAttempts.claim(third.id, 1, owner, later)).toBe(true);
      expect(
        await u.driveAttempts.replace(
          {
            ...third,
            version: 3,
            owner: { ...owner, state: "closed" },
            data: { phase: "candidate", candidateEnvelope: "synthetic" },
          },
          2,
        ),
      ).toBe(true);
      expect(
        await u.driveAttempts.replace(
          {
            ...third,
            version: 4,
            owner: { ...owner, state: "closed" },
            terminalAt: later,
            confirmedFolderIdsEnvelope: null,
            data: { phase: "completed", resultEpoch: 2 },
          },
          3,
        ),
      ).toBe(true);
      expect(
        await u.driveAttempts.replace(
          {
            ...first,
            version: 3,
            terminalAt: driveNow,
            confirmedFolderIdsEnvelope: null,
            context: null,
            updatedAt: new Date(driveNow.getTime() + DRIVE_LIMITS.receiptMs),
            data: { phase: "failed", failure: "DRIVE_CANCELLED" },
          },
          2,
        ),
      ).toBe(true);
      const connection = await u.driveConnections.find(x.context.accountId);
      if (!connection || connection.state !== "linked")
        throw Error("DRIVE_FIXTURE_STATE");
      expect(
        await u.driveConnections.replace(
          {
            ...connection,
            version: connection.version + 1,
            epoch: connection.epoch + 1,
            credentialVersion: connection.credentialVersion + 1,
            settingsVersion: connection.settingsVersion + 1,
            credential: { ...connection.credential, connectedAt: later },
            updatedAt: later,
          },
          connection.version,
          "adopt",
        ),
      ).toBe(true);
    });
    const history = await x.uow.run((u) =>
      u.driveAttempts.history(x.context.accountId, driveNow, 100),
    );
    expect(history.map((row) => row.id)).toEqual([
      third.id,
      second.id,
      first.id,
    ]);
    expect(history.map((row) => row.data.phase)).toEqual([
      "completed",
      "pending",
      "failed",
    ]);
    expect(history[1]?.context?.browserEpoch).toBe(2);
    expect(history[2]?.context).toBeNull();
    expect(
      (
        await x.uow.run((u) =>
          u.driveAttempts.history(x.context.accountId, later, 100),
        )
      ).map((row) => row.id),
    ).toEqual([third.id]);
    expect(
      (
        await x.uow.run((u) =>
          u.driveAttempts.history(x.context.accountId, driveNow, 1),
        )
      ).map((row) => row.id),
    ).toEqual([third.id]);
    expect(
      (
        await x.uow.run((u) =>
          u.driveControls.history(x.context.accountId, driveNow, 100),
        )
      ).map((row) => row.id),
    ).toEqual([disconnect.id, selected.id, folder.id]);
    expect(
      (
        await x.uow.run((u) =>
          u.driveControls.history(x.context.accountId, driveNow, 1),
        )
      ).map((row) => row.id),
    ).toEqual([disconnect.id]);
    expect(
      await x.uow.run((u) =>
        u.driveControls.history(x.context.accountId, later, 100),
      ),
    ).toEqual([]);
    const absentAccount = x.id();
    expect(
      await x.uow.run((u) =>
        u.driveAttempts.history(absentAccount, driveNow, 100),
      ),
    ).toEqual([]);
    expect(
      await x.uow.run((u) =>
        u.driveControls.history(absentAccount, driveNow, 100),
      ),
    ).toEqual([]);
    for (const maximum of [0, -1, 101, 1.5, Number.NaN]) {
      expect(
        await driveRejected(() =>
          x.uow.run((u) =>
            u.driveAttempts.history(x.context.accountId, driveNow, maximum),
          ),
        ),
      ).toBe(true);
      expect(
        await driveRejected(() =>
          x.uow.run((u) =>
            u.driveControls.history(x.context.accountId, driveNow, maximum),
          ),
        ),
      ).toBe(true);
    }
  });
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
  it("initial digest is immutable and command IDs cannot cross both tables", async () => {
    const x = f();
    const a = await x.attempt();
    await x.uow.run((u) => u.driveAttempts.insert(a));
    const control = { ...(await x.control()), commandId: a.commandId };
    expect(
      await driveRejected(() =>
        x.uow.run((u) => u.driveControls.insert(control)),
      ),
    ).toBe(true);
    expect(
      await driveRejected(() =>
        x.client.execute({
          sql: "UPDATE drive_authorization_attempts SET version=version+1,intent_digest=? WHERE id=?",
          args: ["b".repeat(64), a.id],
        }),
      ),
    ).toBe(true);
    const b = await x.control();
    await x.uow.run((u) => u.driveControls.insert(b));
    const second = { ...(await x.attempt()), commandId: b.commandId };
    expect(
      await driveRejected(() =>
        x.uow.run((u) => u.driveAttempts.insert(second)),
      ),
    ).toBe(true);
    expect(
      await driveRejected(() =>
        x.client.execute({
          sql: "UPDATE drive_control_operations SET version=version+1,intent_digest=? WHERE id=?",
          args: ["b".repeat(64), b.id],
        }),
      ),
    ).toBe(true);
  });
  it("only new folder admission advances the confirmation sequence", async () => {
    const x = f();
    const before = await x.uow.run((u) =>
      u.driveConnections.find(x.context.accountId),
    );
    if (!before) throw Error("DRIVE_FIXTURE_STATE");
    const a = await x.attempt();
    await x.uow.run((u) => u.driveAttempts.insert(a));
    const picker = await x.control({ kind: "picker", phase: "queued" });
    await x.uow.run((u) => u.driveControls.insert(picker));
    const after = await x.uow.run((u) =>
      u.driveConnections.find(x.context.accountId),
    );
    expect(after?.admissionSequence === before.admissionSequence).toBe(true);
    const folder = await x.control();
    await x.uow.run((u) => u.driveControls.insert(folder));
    expect(
      (await x.uow.run((u) => u.driveConnections.find(x.context.accountId)))
        ?.admissionSequence ===
        before.admissionSequence + 1,
    ).toBe(true);
  });
  it("claim captures a new credential version without changing its admission snapshot", async () => {
    const x = f();
    const row = await x.control();
    const owner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveControls.insert(row);
      const c = await u.driveConnections.find(row.accountId);
      if (!c || c.state !== "linked") throw Error("DRIVE_FIXTURE_STATE");
      await u.driveConnections.replace(
        { ...c, version: c.version + 1, credentialVersion: 2 },
        c.version,
        "refresh",
      );
      const running = {
        ...row,
        version: 2,
        ...withOwner(owner, 2),
        data: { kind: "folder-create" as const, phase: "allocating" as const },
      };
      expect(await u.driveControls.claim(running, 1)).toBe(true);
      const saved = await u.driveControls.find(row.id);
      expect(
        saved?.expectedCredentialVersion === 1 &&
          saved.credentialUse.kind === "bound" &&
          saved.credentialUse.version === 2,
      ).toBe(true);
    });
  });
  it("self refresh atomically advances exactly its active owner proof", async () => {
    const x = f();
    const row = await x.control();
    const owner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveControls.insert(row);
      const running = {
        ...row,
        version: 2,
        ...withOwner(owner),
        data: { kind: "folder-create" as const, phase: "allocating" as const },
      };
      expect(await u.driveControls.claim(running, 1)).toBe(true);
      const c = await u.driveConnections.find(row.accountId);
      if (!c || c.state !== "linked") throw Error("DRIVE_FIXTURE_STATE");
      const next = {
        ...running,
        version: 3,
        credentialUse: {
          kind: "self-refreshed" as const,
          runtimeGeneration: owner.runtimeGeneration,
          ownerToken: owner.token,
          fromVersion: 1,
          version: 2,
        },
      };
      await u.driveControls.refreshCredential({
        control: next,
        expectedVersion: 2,
        connection: { ...c, version: c.version + 1, credentialVersion: 2 },
        expectedConnectionVersion: c.version,
      });
      const saved = await u.driveControls.find(row.id);
      expect(
        saved?.credentialUse.kind === "self-refreshed" &&
          saved.credentialUse.version === 2,
      ).toBe(true);
    });
    expect(
      await driveRejected(() =>
        x.uow.run(async (u) => {
          const saved = await u.driveControls.find(row.id);
          const c = await u.driveConnections.find(row.accountId);
          if (!saved || !c) throw Error("DRIVE_FIXTURE_STATE");
          await u.driveControls.refreshCredential({
            control: { ...saved, version: saved.version + 1 },
            expectedVersion: saved.version,
            connection: { ...c, version: c.version + 1, credentialVersion: 3 },
            expectedConnectionVersion: c.version,
          });
        }),
      ),
    ).toBe(true);
    expect(
      (await x.uow.run((u) => u.driveConnections.find(row.accountId)))
        ?.credentialVersion === 2,
    ).toBe(true);
  });
  it("bounded global scans separate held owners and closed waiting candidates", async () => {
    const x = f();
    const a = await x.attempt();
    const owner = x.owner();
    await x.uow.run(async (u) => {
      await u.driveAttempts.insert(a);
      await u.driveAttempts.claim(a.id, 1, owner, driveNow);
      expect(
        (
          await u.driveAttempts.scan({
            kind: "held",
            now: driveNow,
            after: null,
            limit: 3,
          })
        ).length,
      ).toBe(1);
      await u.driveAttempts.replace(
        {
          ...a,
          version: 3,
          owner: { ...owner, state: "closed" },
          data: { phase: "candidate", candidateEnvelope: "synthetic" },
        },
        2,
      );
      expect(
        (
          await u.driveAttempts.scan({
            kind: "held",
            now: driveNow,
            after: null,
            limit: 3,
          })
        ).length,
      ).toBe(0);
      expect(
        (
          await u.driveAttempts.scan({
            kind: "candidate",
            now: driveNow,
            after: null,
            limit: 100,
          })
        ).length,
      ).toBe(1);
    });
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
            confirmedFolderIdsEnvelope: null,
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
              ...withOwner(x.owner()),
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
          ...withOwner(owner),
          data: { kind: "folder-create", phase: "allocating" },
        },
        1,
      );
      await u.driveControls.replace(
        {
          ...first,
          version: 3,
          ...withOwner({ ...owner, state: "unknown" }),
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
            autoBackup: false,
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
            ...withOwner(owner),
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
            ...withOwner({ ...owner, state: "closed" }),
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
    ).toBe(0);
    expect(
      await x.uow.run((u) =>
        u.accountDeletions.saveDriveAcknowledgment({
          kind: "control",
          id: row.id,
          runtimeGeneration: owner.runtimeGeneration,
          ownerToken: owner.token,
          evidenceId: "recorded-picker-close",
        }),
      ),
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
          ...withOwner(owner),
          data: { kind: "folder-create", phase: "allocating" },
        },
        1,
      );
      await u.driveControls.replace(
        {
          ...row,
          version: 3,
          ...withOwner({ ...owner, state: "closed" }),
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
        ...withOwner(activeOwner),
        data: { kind: "folder-create", phase: "running", ...identity, sends },
      };
      expect(
        await x.uow.run((u) => u.driveControls.claim(running, version - 1)),
      ).toBe(true);
      const closed: DriveControl = {
        ...running,
        version: ++version,
        ...withOwner({ ...activeOwner, state: "closed" }),
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
              ...withOwner(x.owner()),
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
              ...withOwner(x.owner()),
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
      ...withOwner(owner),
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
            ...withOwner(owner),
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
            confirmedFolderIdsEnvelope: null,
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
            ...withOwner(owner),
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
            ...withOwner({ ...owner, state: "closed" }),
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
            ...withOwner(sendOwner),
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
            ...withOwner({ ...sendOwner, state: "closed" }),
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
            ...withOwner(metadataOwner),
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
            ...withOwner({ ...metadataOwner, state: "closed" }),
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
      ...withOwner(nextOwner),
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
            ...withOwner({ ...nextOwner, state: "closed" }),
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
      ...withOwner(x.owner()),
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
            ...withOwner(x.owner()),
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
