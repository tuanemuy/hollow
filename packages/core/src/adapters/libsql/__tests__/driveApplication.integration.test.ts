import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  adoptDriveCandidate,
  beginDriveAuthorization,
  driveFolderConfirmation,
  exchangeDriveAuthorization,
} from "@repo/core/application/integration/drive/connection";
import {
  cancelDriveOperation,
  disconnectDrive,
} from "@repo/core/application/integration/drive/control";
import { attemptBinding } from "@repo/core/application/integration/drive/credentials";
import {
  beginDriveFolderCreation,
  beginDriveFolderSelection,
  beginDrivePicker,
  beginDriveRefresh,
  continueDriveFolder,
  runDriveControl,
} from "@repo/core/application/integration/drive/folders";
import type {
  DriveExecution,
  DriveFolderObservation,
  DriveOwnedResult,
  DriveSecretBinding,
  DriveServices,
} from "@repo/core/application/integration/drive/ports";
import {
  getDriveHistory,
  getDriveReceipt,
  getDriveSettings,
} from "@repo/core/application/integration/drive/read";
import {
  maintainDrive,
  runDriveQueue,
} from "@repo/core/application/integration/drive/runner";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DRIVE_LIMITS,
  type DriveOwner,
  driveFailureSchema,
} from "@repo/core/domain/integration/drive";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { driveFixture, driveNow, driveRejected } from "./driveFixtures";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
class FakeExecution implements DriveExecution {
  readonly active = new Map<
    string,
    { abort: AbortController; close: () => void }
  >();
  hold = false;
  aborts = 0;
  entered = deferred<void>();
  finished = deferred<void>();
  rejection: null | "access-token" | "refresh-token" = null;
  run<T>(
    owner: DriveOwner & { state: "active" },
    work: (signal: AbortSignal) => Promise<T>,
  ) {
    const abort = new AbortController();
    const closed = deferred<void>();
    const key = owner.runtimeGeneration + ":" + owner.token;
    const close = () => {
      this.active.delete(key);
      closed.resolve();
    };
    this.active.set(key, { abort, close });
    this.entered.resolve();
    const result = work(abort.signal)
      .then<DriveOwnedResult<T>, DriveOwnedResult<T>>(
        (value) =>
          this.rejection
            ? {
                kind: "failure",
                code: "DRIVE_PROVIDER_REJECTED",
                delivery: "not-sent",
                credentialRejection: this.rejection,
              }
            : { kind: "value", value },
        (error) => {
          const parsed = driveFailureSchema.safeParse(
            error instanceof BusinessRuleError ? error.code : undefined,
          );
          return {
            kind: "failure",
            code: parsed.success ? parsed.data : "DRIVE_UNAVAILABLE",
            delivery:
              parsed.success && parsed.data === "DRIVE_CREATE_UNKNOWN"
                ? "unknown"
                : "not-sent",
            credentialRejection: this.rejection,
          };
        },
      )
      .finally(() => {
        this.finished.resolve();
        if (!this.hold) close();
      });
    return { result, closed: closed.promise, abort: () => abort.abort() };
  }
  abort(owner: DriveOwner & { state: "active" | "unknown" }) {
    const entry = this.active.get(owner.runtimeGeneration + ":" + owner.token);
    if (entry) {
      this.aborts++;
      entry.abort.abort();
    }
  }
  release() {
    for (const entry of this.active.values()) entry.close();
  }
  async stop() {
    for (const entry of this.active.values()) entry.abort.abort();
    this.release();
  }
}
describe("Drive application with bounded DB and fake owned provider", () => {
  let base: Awaited<ReturnType<typeof driveFixture>> | undefined;
  let c: HollowContainer;
  let service: DriveServices;
  let execution: FakeExecution;
  let now: Date;
  let auth: { state: string; nonce: string; verifier: string } | null;
  let calls: {
    exchange: number;
    refresh: number;
    inspect: number;
    create: number;
    allocate: number;
  };
  let refreshToken: string | null;
  let scope: readonly string[];
  let refreshOmitted: boolean;
  let createUnknown: boolean;
  let refreshRejected: boolean;
  let createMetadataTransient: boolean;
  let duringExchange: (() => Promise<void>) | null;
  let observation: DriveFolderObservation;
  let pending: Promise<unknown>[];
  const request = {
    sessionToken: "synthetic-session-token",
    browserToken: "synthetic-browser-token",
  };
  const runtime = "synthetic-runtime";
  function f() {
    if (!base) throw Error("DRIVE_FIXTURE_STATE");
    return base;
  }
  beforeEach(async () => {
    base = await driveFixture();
    now = new Date(driveNow);
    execution = new FakeExecution();
    auth = null;
    pending = [];
    calls = { exchange: 0, refresh: 0, inspect: 0, create: 0, allocate: 0 };
    refreshToken = "synthetic-refresh";
    scope = ["openid", "https://www.googleapis.com/auth/drive.file"];
    refreshOmitted = true;
    createUnknown = false;
    refreshRejected = false;
    createMetadataTransient = false;
    duringExchange = null;
    observation = {
      kind: "usable",
      folder: { id: "synthetic-folder", name: "Synthetic", driveId: null },
      resourceKey: null,
      parents: ["synthetic-root"],
      marker: null,
    };
    const values = new Map<string, { binding: string; value: string }>();
    let serial = 0;
    const protector = {
      available: () => true,
      protect(value: string, binding: DriveSecretBinding) {
        const key = `sealed-${++serial}`;
        values.set(key, { binding: JSON.stringify(binding), value });
        return key;
      },
      reveal(key: string, binding: DriveSecretBinding) {
        const found = values.get(key);
        if (!found || found.binding !== JSON.stringify(binding))
          throw Error("DRIVE_TEST_BINDING");
        return found.value;
      },
    };
    service = {
      protector,
      execution,
      wake: () => {},
      authorization: {
        authorization: async (input) => {
          auth = input;
          return "https://provider.invalid/authorize";
        },
        exchange: async () => {
          calls.exchange++;
          await duringExchange?.();
          return {
            accessToken: "synthetic-access",
            refreshToken,
            idToken: "synthetic-id",
            scope: scope.join(" "),
            accessExpiresAt: new Date(now.getTime() + 3600000),
          };
        },
        verifyCandidate: async () => ({
          subject: "synthetic-subject",
          email: null,
          scopes: scope,
        }),
        refresh: async () => {
          calls.refresh++;
          if (refreshRejected)
            throw new BusinessRuleError("DRIVE_PROVIDER_REJECTED", "finite");
          return {
            accessToken: "synthetic-refreshed",
            refreshToken: refreshOmitted ? null : "synthetic-rotated",
            idToken: null,
            scope: null,
            accessExpiresAt: new Date(now.getTime() + 3600000),
          };
        },
      },
      folders: {
        generateFolderId: async () => {
          calls.allocate++;
          return "synthetic-created";
        },
        createFolder: async (input) => {
          calls.create++;
          observation = {
            kind: "usable",
            folder: { id: input.fileId, name: "Synthetic", driveId: null },
            resourceKey: null,
            parents: ["synthetic-root"],
            marker: input.marker,
          };
          if (createUnknown)
            throw new BusinessRuleError("DRIVE_CREATE_UNKNOWN", "finite");
          return { kind: "conflict" };
        },
        inspectFolder: async () => {
          calls.inspect++;
          if (createMetadataTransient)
            return { kind: "transient", reason: "network" };
          return observation;
        },
      },
    };
    c = {
      ...createHollowContainer(base.db, "http://localhost:3100", {
        send: async () => {},
      }),
      clock: { now: () => now },
      idGenerator: { next: () => f().id(), validate: () => true },
      drive: service,
    };
    await c.unitOfWorkProvider.run(async (u) => {
      const browser = await u.authBrowsers.ensure(
        c.tokens.hash(request.browserToken),
        new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
        now,
      );
      await u.accounts.saveSession({
        accountId: f().context.accountId,
        tokenHash: c.tokens.hash(request.sessionToken),
        browser,
        expiresAt: new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
      });
      const conn = await u.driveConnections.find(f().context.accountId);
      if (!conn || conn.state !== "linked") throw Error("DRIVE_FIXTURE_STATE");
      const envelope = protector.protect(
        JSON.stringify({
          version: 1,
          accessToken: "synthetic-access",
          refreshToken: "synthetic-refresh",
        }),
        {
          purpose: "credential",
          accountId: conn.accountId,
          subject: conn.credential.subject,
          epoch: conn.epoch,
          credentialVersion: 2,
        },
      );
      await u.driveConnections.replace(
        {
          ...conn,
          version: conn.version + 1,
          credentialVersion: 2,
          credential: { ...conn.credential, envelope },
        },
        conn.version,
        "refresh",
      );
    });
  });
  afterEach(async (context) => {
    await execution?.stop();
    await Promise.allSettled(pending ?? []);
    expect(execution?.active.size === 0).toBe(true);
    const old = base;
    base = undefined;
    await old?.close(context.task.result?.state !== "fail");
  });
  async function initial() {
    const settings = await getDriveSettings(c, request);
    return {
      commandId: f().id(),
      expectedEpoch: settings.epoch,
      expectedSettingsVersion: settings.settingsVersion,
    };
  }
  async function authorize() {
    const input = {
      ...(await initial()),
      confirmation: await c.unitOfWorkProvider.run((u) =>
        driveFolderConfirmation(u, f().context.accountId),
      ),
      consent: true,
      chooseAccount: false,
    };
    const start = await beginDriveAuthorization(c, request, input);
    if (!auth) throw Error("DRIVE_FIXTURE_STATE");
    return { input, start, state: auth.state };
  }
  async function picker() {
    const operation = await beginDrivePicker(c, request, await initial());
    const result = await runDriveControl(c, operation.row.id, runtime);
    if (!result.picker) throw Error("DRIVE_FIXTURE_STATE");
    return { id: operation.row.id, ticket: result.picker.ticket };
  }
  async function selected() {
    const p = await picker();
    const started = await beginDriveFolderSelection(c, request, {
      ...(await initial()),
      pickerId: p.id,
      ticket: p.ticket,
      fileId: "synthetic-folder",
      resourceKey: null,
    });
    await runDriveControl(c, started.row.id, runtime);
    return c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(started.row.id),
    );
  }
  it("begin is payload-idempotent and callback exchanges exactly once", async (context) => {
    Object.assign(context.task.meta, { driveStage: 1 });
    const a = await authorize();
    Object.assign(context.task.meta, { driveStage: 2 });
    const replay = await beginDriveAuthorization(c, request, a.input);
    expect(a.start.id === replay.id).toBe(true);
    Object.assign(context.task.meta, { driveStage: 3 });
    await exchangeDriveAuthorization(
      c,
      request,
      { state: a.state, code: "synthetic-code" },
      runtime,
    );
    Object.assign(context.task.meta, { driveStage: 4 });
    const receipt = await getDriveReceipt(c, request, {
      kind: "authorization",
      commandId: a.input.commandId,
    });
    expect(receipt?.phase === "completed" && calls.exchange === 1).toBe(true);
    expect(
      await driveRejected(() =>
        exchangeDriveAuthorization(
          c,
          request,
          { state: a.state, code: "synthetic-code" },
          runtime,
        ),
      ),
    ).toBe(true);
    expect(calls.exchange === 1).toBe(true);
    Object.assign(context.task.meta, { driveStage: 5 });
  });
  it("same command with changed initial payload is rejected", async () => {
    const a = await authorize();
    expect(
      await driveRejected(() =>
        beginDriveAuthorization(c, request, {
          ...a.input,
          chooseAccount: true,
        }),
      ),
    ).toBe(true);
    expect(calls.exchange === 0).toBe(true);
  });
  it("explicit relink never borrows the old refresh token", async () => {
    const before = await getDriveSettings(c, request);
    const a = await authorize();
    refreshToken = null;
    await exchangeDriveAuthorization(
      c,
      request,
      { state: a.state, code: "synthetic" },
      runtime,
    );
    const receipt = await getDriveReceipt(c, request, {
      kind: "authorization",
      commandId: a.input.commandId,
    });
    expect(
      receipt?.failure === "DRIVE_REFRESH_REQUIRED" &&
        (await getDriveSettings(c, request)).epoch === before.epoch,
    ).toBe(true);
  });
  it("missing Drive scope does not replace the existing connection", async () => {
    const a = await authorize();
    scope = ["openid"];
    await exchangeDriveAuthorization(
      c,
      request,
      { state: a.state, code: "synthetic" },
      runtime,
    );
    expect(
      (await getDriveSettings(c, request)).epoch === 1 && calls.exchange === 1,
    ).toBe(true);
  });
  it("logout before callback rejects without exchange", async () => {
    const a = await authorize();
    await c.unitOfWorkProvider.run((u) =>
      u.accounts.deleteSession(c.tokens.hash(request.sessionToken)),
    );
    expect(
      await driveRejected(() =>
        exchangeDriveAuthorization(
          c,
          request,
          { state: a.state, code: "synthetic" },
          runtime,
        ),
      ),
    ).toBe(true);
    expect(calls.exchange === 0).toBe(true);
  });
  it("folder admission ABA invalidates the confirmed authorization set", async () => {
    const a = await authorize();
    const created = await beginDriveFolderCreation(c, request, await initial());
    await cancelDriveOperation(c, request, {
      kind: "control",
      id: created.row.id,
      expectedVersion: 1,
    });
    expect(
      await driveRejected(() =>
        exchangeDriveAuthorization(
          c,
          request,
          { state: a.state, code: "synthetic" },
          runtime,
        ),
      ),
    ).toBe(true);
    expect(calls.exchange === 0).toBe(true);
    const next = await authorize();
    duringExchange = async () => {
      await beginDriveFolderCreation(c, request, await initial());
    };
    const outcome = await exchangeDriveAuthorization(
      c,
      request,
      { state: next.state, code: "synthetic" },
      runtime,
    );
    const saved = await c.unitOfWorkProvider.run((u) =>
      u.driveAttempts.find(outcome.id),
    );
    expect(
      saved?.data.phase === "failed" &&
        saved.data.failure === "DRIVE_CONTEXT_CHANGED" &&
        saved.owner.state === "closed",
    ).toBe(true);
    expect(calls.exchange === 1).toBe(true);
  });
  it("Picker GET never redistributes its token", async () => {
    const input = await initial();
    const started = await beginDrivePicker(c, request, input);
    expect(
      ["context", "credentialUse", "data", "intentDigest", "subject"].every(
        (key) => !(key in started.row),
      ) && started.row.owner === "none",
    ).toBe(true);
    const result = await runDriveControl(c, started.row.id, runtime);
    const receipt = await getDriveReceipt(c, request, {
      kind: "control",
      commandId: input.commandId,
    });
    expect(
      result.picker !== null &&
        receipt?.phase === "awaiting-selection" &&
        !JSON.stringify(receipt).includes("synthetic-access"),
    ).toBe(true);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.driveControls.held(f().context.accountId),
        )
      ).account === 0,
    ).toBe(true);
  });
  it("shared Drive and resource key survive explicit target confirmation", async () => {
    observation = {
      kind: "usable",
      folder: {
        id: "synthetic-folder",
        name: "Synthetic",
        driveId: "synthetic-shared",
      },
      resourceKey: "synthetic-key",
      parents: ["synthetic-parent"],
      marker: null,
    };
    const row = await selected();
    if (!row || row.data.kind !== "folder-select" || row.data.phase !== "ready")
      throw Error("DRIVE_FIXTURE_STATE");
    await continueDriveFolder(
      c,
      request,
      row.id,
      {
        phase: "ready",
        expectedVersion: row.version,
        action: "confirm",
        targetId: row.data.targetId,
      },
      runtime,
    );
    const settings = await getDriveSettings(c, request);
    expect(
      settings.folder?.driveId === "synthetic-shared" && calls.inspect === 2,
    ).toBe(true);
  });
  it("shortcut target is not followed before explicit confirmation", async () => {
    observation = {
      kind: "shortcut",
      targetId: "synthetic-target",
      targetResourceKey: "synthetic-key",
    };
    const row = await selected();
    if (!row || row.data.kind !== "folder-select" || row.data.phase !== "ready")
      throw Error("DRIVE_FIXTURE_STATE");
    expect(calls.inspect === 1).toBe(true);
    observation = {
      kind: "usable",
      folder: { id: "synthetic-target", name: "Synthetic", driveId: null },
      resourceKey: "synthetic-key",
      parents: ["synthetic-parent"],
      marker: null,
    };
    await continueDriveFolder(
      c,
      request,
      row.id,
      {
        phase: "ready",
        expectedVersion: row.version,
        action: "confirm",
        targetId: "synthetic-target",
      },
      runtime,
    );
    expect(
      (await getDriveSettings(c, request)).folder?.id === "synthetic-target",
    ).toBe(true);
  });
  it("trash refuses adoption without automatic create", async () => {
    observation = { kind: "trashed", explicitly: true };
    const row = await selected();
    expect(
      row?.data.phase === "failed" &&
        row.data.failure === "DRIVE_FOLDER_TRASHED" &&
        calls.create === 0,
    ).toBe(true);
  });
  it("404 ambiguity never establishes deletion or an automatic substitute", async () => {
    observation = { kind: "unavailable-ambiguous" };
    const row = await selected();
    expect(
      row?.data.phase === "failed" &&
        row.data.failure === "DRIVE_FOLDER_UNAVAILABLE" &&
        calls.create === 0,
    ).toBe(true);
  });
  it("folder creation persists its ID before one send and verifies conflict metadata", async () => {
    const started = await beginDriveFolderCreation(c, request, await initial());
    await runDriveControl(c, started.row.id, runtime);
    expect(calls.allocate === 1 && calls.create === 0).toBe(true);
    await runDriveControl(c, started.row.id, runtime);
    expect(
      calls.create === 1 &&
        calls.inspect === 1 &&
        (await getDriveSettings(c, request)).folder?.id === "synthetic-created",
    ).toBe(true);
  });
  it("unknown create requires explicit same-ID extra intent and permits no third send", async () => {
    const started = await beginDriveFolderCreation(c, request, await initial());
    await runDriveControl(c, started.row.id, runtime);
    createUnknown = true;
    await runDriveControl(c, started.row.id, runtime);
    let row = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(started.row.id),
    );
    if (
      !row ||
      row.data.kind !== "folder-create" ||
      row.data.phase !== "reconciling"
    )
      throw Error("DRIVE_FIXTURE_STATE");
    await runDriveQueue(c, runtime, { controls: null, candidates: null });
    expect(calls.create === 1).toBe(true);
    await continueDriveFolder(
      c,
      request,
      row.id,
      {
        expectedVersion: row.version,
        phase: "reconciling",
        action: "resend",
        sends: 1,
      },
      runtime,
    );
    row = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(started.row.id),
    );
    if (!row) throw Error("DRIVE_FIXTURE_STATE");
    const result = await continueDriveFolder(
      c,
      request,
      row.id,
      {
        expectedVersion: row.version,
        phase: "reconciling",
        action: "resend",
        sends: 2,
      },
      runtime,
    );
    expect(calls.create === 2 && result.kind === "stale").toBe(true);
  });
  it("normal refresh may omit refresh token while keeping epoch and folder", async () => {
    const before = await getDriveSettings(c, request);
    const started = await beginDriveRefresh(c, request, await initial());
    await runDriveControl(c, started.row.id, runtime);
    const receipt = await getDriveReceipt(c, request, {
      kind: "control",
      commandId: started.row.commandId,
    });
    expect(
      receipt?.phase === "completed" &&
        calls.refresh === 1 &&
        (await getDriveSettings(c, request)).epoch === before.epoch,
    ).toBe(true);
  });
  it("result arrival does not release ownership before fake close", async () => {
    const started = await beginDrivePicker(c, request, await initial());
    execution.hold = true;
    const running = runDriveControl(c, started.row.id, runtime);
    pending.push(running);
    await execution.entered.promise;
    await execution.finished.promise;
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.driveControls.held(f().context.accountId),
        )
      ).account === 1,
    ).toBe(true);
    execution.release();
    await running;
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.driveControls.held(f().context.accountId),
        )
      ).account === 0,
    ).toBe(true);
  });
  it("cancel targets only the owned request and rejects its late result", async () => {
    const started = await beginDrivePicker(c, request, await initial());
    execution.hold = true;
    const running = runDriveControl(c, started.row.id, runtime);
    pending.push(running);
    await execution.entered.promise;
    await execution.finished.promise;
    const row = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(started.row.id),
    );
    if (!row) throw Error("DRIVE_FIXTURE_STATE");
    await cancelDriveOperation(c, request, {
      kind: "control",
      id: row.id,
      expectedVersion: row.version,
    });
    expect(execution.aborts === 1 && execution.active.size === 1).toBe(true);
    execution.release();
    const result = await running;
    expect(
      result.picker === null &&
        (
          await c.unitOfWorkProvider.run((u) =>
            u.driveControls.held(f().context.accountId),
          )
        ).account === 0,
    ).toBe(true);
  });
  it("independent disconnect keeps authentication and never revokes provider grant", async () => {
    const input = await initial();
    const first = await disconnectDrive(c, request, input);
    const again = await disconnectDrive(c, request, input);
    expect(
      first.id === again.id &&
        (await getDriveSettings(c, request)).state === "unlinked" &&
        calls.exchange === 0 &&
        calls.refresh === 0,
    ).toBe(true);
    expect(
      (await c.unitOfWorkProvider.run((u) =>
        u.accounts.findSession(c.tokens.hash(request.sessionToken)),
      )) !== null,
    ).toBe(true);
  });
  it("pure settings receipt and history reads perform no writes or provider work", async () => {
    const before = await f().client.execute("SELECT total_changes() AS n");
    await getDriveSettings(c, request);
    await getDriveReceipt(c, request, { kind: "control", commandId: f().id() });
    await getDriveHistory(c, request);
    const after = await f().client.execute("SELECT total_changes() AS n");
    expect(
      before.rows[0]?.n === after.rows[0]?.n &&
        Object.values(calls).every((n) => n === 0),
    ).toBe(true);
  });
  it("expired waiting receipt is terminalized by bounded maintenance not GET", async () => {
    const p = await picker();
    now = new Date(now.getTime() + DRIVE_LIMITS.pickerMs);
    await getDriveSettings(c, request);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.driveControls.find(p.id)))?.data
        .phase === "awaiting-selection",
    ).toBe(true);
    await maintainDrive(c, runtime);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.driveControls.find(p.id)))?.data
        .phase === "failed",
    ).toBe(true);
  });
  it("a confirmed access-token rejection invalidates only the current credential", async () => {
    const started = await beginDrivePicker(c, request, await initial());
    execution.rejection = "access-token";
    await runDriveControl(c, started.row.id, runtime);
    expect((await getDriveSettings(c, request)).state === "needs-relink").toBe(
      true,
    );
  });
  it("a late old-version rejection cannot invalidate a newer credential", async () => {
    const started = await beginDrivePicker(c, request, await initial());
    execution.rejection = "access-token";
    execution.hold = true;
    const running = runDriveControl(c, started.row.id, runtime);
    pending.push(running);
    await execution.entered.promise;
    await execution.finished.promise;
    await c.unitOfWorkProvider.run(async (u) => {
      const conn = await u.driveConnections.find(f().context.accountId);
      if (!conn || conn.state !== "linked") throw Error("DRIVE_FIXTURE_STATE");
      await u.driveConnections.replace(
        {
          ...conn,
          version: conn.version + 1,
          credentialVersion: conn.credentialVersion + 1,
        },
        conn.version,
        "refresh",
      );
    });
    execution.release();
    await running;
    expect((await getDriveSettings(c, request)).state === "linked").toBe(true);
  });
  it("a confirmed refresh-token rejection is not treated as a new authorization", async () => {
    const started = await beginDriveRefresh(c, request, await initial());
    execution.rejection = "refresh-token";
    refreshRejected = true;
    await runDriveControl(c, started.row.id, runtime);
    expect(
      (await getDriveSettings(c, request)).state === "needs-relink" &&
        calls.exchange === 0,
    ).toBe(true);
  });
  it("normal refresh does not invalidate a ready target confirmation", async () => {
    const row = await selected();
    if (!row || row.data.kind !== "folder-select" || row.data.phase !== "ready")
      throw Error("DRIVE_FIXTURE_STATE");
    const refresh = await beginDriveRefresh(c, request, await initial());
    await runDriveControl(c, refresh.row.id, runtime);
    await continueDriveFolder(
      c,
      request,
      row.id,
      {
        phase: "ready",
        expectedVersion: row.version,
        action: "confirm",
        targetId: row.data.targetId,
      },
      runtime,
    );
    expect(
      (await getDriveSettings(c, request)).folder !== null &&
        calls.refresh === 1,
    ).toBe(true);
  });
  it("confirmation tolerates only disappearance from the original folder set", async () => {
    const folder = await beginDriveFolderCreation(c, request, await initial());
    const a = await authorize();
    await cancelDriveOperation(c, request, {
      id: folder.row.id,
      expectedVersion: 1,
      kind: "control",
    });
    await exchangeDriveAuthorization(
      c,
      request,
      { state: a.state, code: "synthetic" },
      runtime,
    );
    expect(
      (await getDriveSettings(c, request)).epoch === 2 && calls.exchange === 1,
    ).toBe(true);
  });
  it("a closed candidate waits without occupying the HTTP slot held by another operation", async () => {
    const a = await authorize();
    await c.unitOfWorkProvider.run(async (u) => {
      const row = await u.driveAttempts.find(a.start.id);
      if (!row || !row.context) throw Error("DRIVE_FIXTURE_STATE");
      const owner = f().owner();
      await u.driveAttempts.claim(row.id, row.version, owner, now);
      const candidateEnvelope = service.protector.protect(
        JSON.stringify({
          version: 1,
          accessToken: "synthetic-access",
          refreshToken: "synthetic-refresh",
          subject: "synthetic-subject",
          email: null,
          scopes: scope,
          accessExpiresAt: new Date(now.getTime() + 3600000).toISOString(),
        }),
        attemptBinding("candidate", row.id, row.context),
      );
      await u.driveAttempts.replace(
        {
          ...row,
          version: 3,
          owner: { ...owner, state: "closed" },
          data: { phase: "candidate", candidateEnvelope },
        },
        2,
      );
    });
    const p = await beginDrivePicker(c, request, await initial());
    execution.hold = true;
    const running = runDriveControl(c, p.row.id, runtime);
    pending.push(running);
    await execution.entered.promise;
    await execution.finished.promise;
    expect(await adoptDriveCandidate(c, a.start.id)).toBe(false);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.driveControls.held(f().context.accountId),
        )
      ).account === 1,
    ).toBe(true);
    execution.release();
    await running;
    expect(await adoptDriveCandidate(c, a.start.id)).toBe(true);
    expect(calls.exchange === 0).toBe(true);
  });
  it("a previous runtime owner becomes unknown without fabricated closure", async () => {
    const p = await beginDrivePicker(c, request, await initial());
    const owner = f().owner();
    await c.unitOfWorkProvider.run(async (u) => {
      const stored = await u.driveControls.find(p.row.id);
      if (!stored) throw Error("DRIVE_FIXTURE_STATE");
      await u.driveControls.claim(
        {
          ...stored,
          version: 2,
          owner,
          credentialUse: {
            kind: "bound",
            ownerToken: owner.token,
            runtimeGeneration: owner.runtimeGeneration,
            version: 2,
          },
          data: { kind: "picker", phase: "running" },
        },
        1,
      );
    });
    await maintainDrive(c, "different-runtime");
    const row = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(p.row.id),
    );
    expect(
      row?.owner.state === "unknown" &&
        (
          await c.unitOfWorkProvider.run((u) =>
            u.driveControls.held(f().context.accountId),
          )
        ).account === 1,
    ).toBe(true);
    expect(execution.aborts === 0).toBe(true);
  });
  it("temporary metadata failure remains distinct from invalid or inaccessible folders", async () => {
    for (const reason of ["rate", "provider", "network"] as const) {
      observation = { kind: "transient", reason };
      const row = await selected();
      expect(
        row?.data.phase === "failed" &&
          row.data.failure ===
            (reason === "rate" ? "DRIVE_RATE_LIMIT" : "DRIVE_UNAVAILABLE"),
      ).toBe(true);
    }
    expect(calls.create === 0).toBe(true);
  });
  it("metadata outage after create retains the same ID for a read-only reconciliation", async () => {
    const operation = await beginDriveFolderCreation(
      c,
      request,
      await initial(),
    );
    await runDriveControl(c, operation.row.id, runtime);
    createMetadataTransient = true;
    await runDriveControl(c, operation.row.id, runtime);
    const row = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(operation.row.id),
    );
    if (
      !row ||
      row.data.kind !== "folder-create" ||
      row.data.phase !== "reconciling"
    )
      throw Error("DRIVE_FIXTURE_STATE");
    expect(
      calls.allocate === 1 && calls.create === 1 && row.data.sends === 1,
    ).toBe(true);
    createMetadataTransient = false;
    await continueDriveFolder(
      c,
      request,
      row.id,
      {
        phase: "reconciling",
        expectedVersion: row.version,
        action: "inspect",
        sends: 1,
      },
      runtime,
    );
    expect(
      calls.allocate === 1 &&
        calls.create === 1 &&
        (await getDriveSettings(c, request)).folder?.id === row.data.fileId,
    ).toBe(true);
  });
});
