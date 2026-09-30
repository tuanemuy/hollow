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
import { driveActor } from "@repo/core/application/integration/drive/current";
import {
  beginDriveFolderCreation,
  beginDriveFolderSelection,
  beginDrivePicker,
  beginDriveRefresh,
  continueDriveFolder,
  runDriveControl,
} from "@repo/core/application/integration/drive/folders";
import { launchDrivePicker } from "@repo/core/application/integration/drive/picker";
import type {
  DriveClosedProof,
  DriveExecution,
  DriveExecutionTarget,
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
import { googleIdentities } from "../authSchema";
import { driveFixture, driveNow, driveRejected } from "./driveFixtures";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
class FakeExecution implements DriveExecution {
  changeRevision() {
    return 0;
  }
  async waitForChange() {
    return "expired" as const;
  }
  private callers = new Map<string, "pending" | "ended">();
  private proofs = new Map<string, DriveClosedProof>();
  private lane: Promise<unknown> = Promise.resolve();
  private key(target: DriveExecutionTarget) {
    return JSON.stringify(target);
  }
  accepting() {
    return this.proofs.size === 0;
  }
  hasPendingCallers() {
    return [...this.callers.values()].some((state) => state === "pending");
  }
  async withCaller<C, T>(
    target: DriveExecutionTarget,
    claim: () => Promise<C | null>,
    settle: (claimed: C) => Promise<T>,
  ) {
    const key = this.key(target);
    try {
      const value = await this.coordinate("claim", async () => {
        if (!this.accepting())
          throw new BusinessRuleError("DRIVE_UNAVAILABLE", "finite");
        this.callers.set(key, "pending");
        const claimed = await claim();
        if (claimed === null) this.callers.delete(key);
        return claimed;
      });
      if (value === null) return { kind: "not-claimed" as const };
      return { kind: "settled" as const, value: await settle(value) };
    } finally {
      if (this.callers.has(key)) this.callers.set(key, "ended");
    }
  }
  caller(target: DriveExecutionTarget) {
    return this.callers.get(this.key(target)) ?? "untracked";
  }
  coordinate<T>(
    _phase: "claim" | "settle" | "maintenance",
    work: () => Promise<T>,
  ) {
    const value = this.lane.then(work);
    this.lane = value.catch(() => {});
    return value;
  }
  closure(target: DriveExecutionTarget) {
    const proof = this.proofs.get(this.key(target));
    return proof
      ? { kind: "closed" as const, proof }
      : { kind: "unproven" as const };
  }
  unacknowledged(limit: number) {
    return [...this.proofs.values()].slice(0, limit);
  }
  async acknowledge(proof: DriveClosedProof) {
    this.proofs.delete(this.key(proof.target));
  }
  predecessors() {
    return [];
  }
  async acknowledgePredecessor() {}
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
    target: DriveExecutionTarget,
    work: (signal: AbortSignal) => Promise<T>,
  ) {
    const abort = new AbortController();
    const closed = deferred<void>();
    const owner = target.owner;
    const key = owner.runtimeGeneration + ":" + owner.token;
    const close = () => {
      this.active.delete(key);
      this.proofs.set(this.key(target), {
        target,
        evidenceId: "synthetic-proof",
        source: "local-close",
      });
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
  let auth: {
    state: string;
    nonce: string;
    verifier: string;
    loginHint: string | null;
  } | null;
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
  let createConflict: boolean;
  let refreshRejected: boolean;
  let createMetadataTransient: boolean;
  let duringExchange: (() => Promise<void>) | null;
  let rejectedPurpose: DriveSecretBinding["purpose"] | null;
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
    createConflict = true;
    refreshRejected = false;
    createMetadataTransient = false;
    duringExchange = null;
    rejectedPurpose = null;
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
        if (binding.purpose === rejectedPurpose)
          throw new BusinessRuleError("DRIVE_UNAVAILABLE", "finite");
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
      runtimeGeneration: runtime,
      picker: { appId: "1", apiKey: "synthetic-picker" },
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
          return { kind: createConflict ? "conflict" : "created" };
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
        driveFolderConfirmation(u, f().context.accountId, (value) =>
          c.tokens.hash(value),
        ),
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
  async function unknownCreation() {
    const operation = await beginDriveFolderCreation(
      c,
      request,
      await initial(),
    );
    await runDriveControl(c, operation.row.id, runtime);
    createUnknown = true;
    await runDriveControl(c, operation.row.id, runtime);
    createUnknown = false;
    return operation;
  }
  async function creation(id: string) {
    const row = await c.unitOfWorkProvider.run((u) => u.driveControls.find(id));
    if (!row || row.data.kind !== "folder-create" || !("fileId" in row.data))
      throw Error("DRIVE_FIXTURE_STATE");
    return { ...row, data: row.data };
  }
  async function inspectCreation(id: string) {
    const row = await creation(id);
    if (row.data.phase !== "ready" && row.data.phase !== "reconciling")
      throw Error("DRIVE_FIXTURE_STATE");
    return continueDriveFolder(
      c,
      request,
      id,
      {
        expectedVersion: row.version,
        phase: row.data.phase,
        action: "inspect",
        sends: row.data.sends,
      },
      runtime,
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
      by: "command",
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
      by: "command",
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
      by: "command",
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
    const ready = await creation(started.row.id);
    expect(
      ready.data.phase === "ready" &&
        (await getDriveSettings(c, request)).folder?.id !== "synthetic-created",
    ).toBe(true);
    await continueDriveFolder(
      c,
      request,
      ready.id,
      {
        phase: "ready",
        expectedVersion: ready.version,
        action: "confirm",
        sends: 1,
        targetId: ready.data.fileId,
      },
      runtime,
    );
    expect(
      calls.create === 1 &&
        calls.inspect === 2 &&
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
      by: "command",
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
  it("S5a D1: needs-relink disconnect preserves login without provider work", async () => {
    await c.unitOfWorkProvider.run(async (u) => {
      const connection = await u.driveConnections.find(f().context.accountId);
      if (!connection || connection.state !== "linked")
        throw Error("DRIVE_FIXTURE");
      expect(
        await u.driveConnections.replace(
          {
            ...connection,
            state: "needs-relink",
            version: connection.version + 1,
          },
          connection.version,
          "invalidate",
        ),
      ).toBe(true);
    });
    const input = await initial();
    const result = await disconnectDrive(c, request, input);
    const after = await getDriveSettings(c, request);
    expect(
      result.phase === "completed" &&
        after.state === "unlinked" &&
        after.epoch === input.expectedEpoch + 1 &&
        Object.values(calls).every((n) => n === 0),
    ).toBe(true);
    expect(
      await c.unitOfWorkProvider.run(async (u) =>
        Boolean(
          await u.accounts.findSession(c.tokens.hash(request.sessionToken)),
        ),
      ),
    ).toBe(true);
  });
  it("S5a D2: unconfigured and unavailable protection never prevent local unlink", async () => {
    const input = await initial();
    const { drive: _drive, ...withoutDrive } = c;
    const unavailable = {
      ...c,
      drive: {
        ...service,
        protector: {
          available: () => false,
          protect: (): never => {
            throw Error("DRIVE_SECRET_FORBIDDEN");
          },
          reveal: (): never => {
            throw Error("DRIVE_SECRET_FORBIDDEN");
          },
        },
      },
    };
    const result = await disconnectDrive(withoutDrive, request, input);
    const repeated = await disconnectDrive(unavailable, request, input);
    expect(
      result.id === repeated.id &&
        repeated.phase === "completed" &&
        Object.values(calls).every((n) => n === 0),
    ).toBe(true);
    expect(
      (await getDriveSettings(withoutDrive, request)).state === "unlinked",
    ).toBe(true);
  });
  it("S5a D3: full local queue permits only one live disconnect", async () => {
    for (let i = 0; i < DRIVE_LIMITS.accountQueued; i++) {
      const row = await f().control();
      await f().uow.run((u) => u.driveControls.insert(row));
    }
    const existing = await f().control({ kind: "disconnect", phase: "queued" });
    await f().uow.run((u) => u.driveControls.insert(existing));
    const input = await initial();
    expect(await driveRejected(() => disconnectDrive(c, request, input))).toBe(
      true,
    );
    await f().uow.run(async (u) => {
      expect(
        await u.driveControls.replace(
          {
            ...existing,
            version: 2,
            cancelGeneration: 1,
            terminalAt: now,
            data: {
              kind: "disconnect",
              phase: "failed",
              failure: "DRIVE_CANCELLED",
            },
          },
          1,
        ),
      ).toBe(true);
    });
    expect(
      (await disconnectDrive(c, request, input)).phase === "completed",
    ).toBe(true);
    expect(Object.values(calls).every((n) => n === 0)).toBe(true);
  });
  it("S5a D4: unlink preserves unknown ownership until exact fake close", async () => {
    execution.hold = true;
    const op = await beginDrivePicker(c, request, await initial());
    const work = runDriveControl(c, op.row.id, runtime);
    pending.push(work);
    await execution.entered.promise;
    await execution.finished.promise;
    await c.unitOfWorkProvider.run(async (u) => {
      const row = await u.driveControls.find(op.row.id);
      if (!row || row.owner.state !== "active") throw Error("DRIVE_FIXTURE");
      expect(
        await u.driveControls.replace(
          {
            ...row,
            version: row.version + 1,
            owner: { ...row.owner, state: "unknown" },
          },
          row.version,
        ),
      ).toBe(true);
    });
    await disconnectDrive(c, request, await initial());
    const held = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(op.row.id),
    );
    expect(
      held?.data.phase === "failed" &&
        held.owner.state === "unknown" &&
        execution.active.size === 1 &&
        execution.aborts === 1,
    ).toBe(true);
    execution.release();
    await work;
    await maintainDrive(c, runtime);
    const closed = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(op.row.id),
    );
    expect(
      closed?.data.phase === "failed" &&
        closed.owner.state === "closed" &&
        (await getDriveSettings(c, request)).state === "unlinked",
    ).toBe(true);
  });
  it("S5a D5: local unlink retains current and cross-command fences", async () => {
    const input = await initial();
    expect(
      await driveRejected(() =>
        disconnectDrive(c, { ...request, browserToken: "other" }, input),
      ),
    ).toBe(true);
    expect(
      await driveRejected(() =>
        disconnectDrive(c, request, {
          ...input,
          expectedEpoch: input.expectedEpoch + 1,
        }),
      ),
    ).toBe(true);
    expect(
      await driveRejected(() =>
        disconnectDrive(c, request, {
          ...input,
          expectedSettingsVersion: input.expectedSettingsVersion + 1,
        }),
      ),
    ).toBe(true);
    const auth = await authorize();
    expect(
      await driveRejected(() =>
        disconnectDrive(c, request, {
          ...input,
          commandId: auth.input.commandId,
        }),
      ),
    ).toBe(true);
    expect((await getDriveSettings(c, request)).state === "linked").toBe(true);
    await disconnectDrive(c, request, input);
    expect(
      await driveRejected(() =>
        disconnectDrive(c, request, {
          ...input,
          expectedEpoch: input.expectedEpoch + 1,
        }),
      ),
    ).toBe(true);
    expect(Object.values(calls).every((n) => n === 0)).toBe(true);
  });
  it("S5a D6: queued continuation and same-command receipt never revive terminal unlink", async () => {
    const input = await initial();
    const base = await f().control({ kind: "disconnect", phase: "queued" });
    const context = await c.unitOfWorkProvider.run((u) =>
      driveActor(c, u, request),
    );
    const cancelledInput = { ...input, commandId: f().id() };
    const cancelled = {
      ...base,
      id: f().id(),
      context,
      commandId: cancelledInput.commandId,
      intentDigest: c.tokens.hash(
        JSON.stringify([
          "drive-intent",
          1,
          context.accountId,
          "disconnect",
          input.expectedEpoch,
          input.expectedSettingsVersion,
        ]),
      ),
    };
    await f().uow.run((u) => u.driveControls.insert(cancelled));
    await cancelDriveOperation(c, request, {
      id: cancelled.id,
      kind: "control",
      expectedVersion: 1,
    });
    expect(
      (await disconnectDrive(c, request, cancelledInput)).phase === "failed" &&
        (await getDriveSettings(c, request)).state === "linked",
    ).toBe(true);
    const row = {
      ...base,
      context,
      commandId: input.commandId,
      intentDigest: c.tokens.hash(
        JSON.stringify([
          "drive-intent",
          1,
          context.accountId,
          "disconnect",
          input.expectedEpoch,
          input.expectedSettingsVersion,
        ]),
      ),
    };
    await f().uow.run((u) => u.driveControls.insert(row));
    const first = await disconnectDrive(c, request, input);
    const before = await getDriveSettings(c, request);
    const { drive: _drive, ...withoutDrive } = c;
    const again = await disconnectDrive(withoutDrive, request, input);
    const receipt = await getDriveReceipt(c, request, {
      by: "command",
      kind: "control",
      commandId: input.commandId,
    });
    expect(
      first.id === row.id &&
        again.id === row.id &&
        receipt?.id === row.id &&
        (await getDriveSettings(c, request)).epoch === before.epoch,
    ).toBe(true);
    const newInput = await initial();
    expect(
      await driveRejected(() => disconnectDrive(c, request, newInput)),
    ).toBe(true);
    expect(Object.values(calls).every((n) => n === 0)).toBe(true);
  });
  it("pure settings receipt and history reads perform no writes or provider work", async () => {
    const before = await f().client.execute("SELECT total_changes() AS n");
    await getDriveSettings(c, request);
    await getDriveReceipt(c, request, {
      by: "command",
      kind: "control",
      commandId: f().id(),
    });
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
        (await creation(row.id)).data.phase === "ready" &&
        (await getDriveSettings(c, request)).folder?.id !== row.data.fileId,
    ).toBe(true);
  });
  it("V1 existing authorization command is bound to the same live browser and session", async () => {
    const a = await authorize();
    const other = {
      sessionToken: "synthetic-other-session",
      browserToken: "synthetic-other-browser",
    };
    await c.unitOfWorkProvider.run(async (u) => {
      const browser = await u.authBrowsers.ensure(
        c.tokens.hash(other.browserToken),
        new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
        now,
      );
      await u.accounts.saveSession({
        accountId: f().context.accountId,
        tokenHash: c.tokens.hash(other.sessionToken),
        browser,
        expiresAt: new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
      });
    });
    auth = null;
    expect(
      await driveRejected(() => beginDriveAuthorization(c, other, a.input)),
    ).toBe(true);
    expect(auth === null && calls.exchange === 0).toBe(true);
    const replay = await beginDriveAuthorization(c, request, a.input);
    expect(replay.id === a.start.id && replay.url !== null).toBe(true);
  });
  it("V2 ambiguous create lookup preserves same-ID explicit second send and no third intent", async () => {
    const op = await unknownCreation();
    observation = { kind: "unavailable-ambiguous" };
    await inspectCreation(op.row.id);
    const row = await creation(op.row.id);
    const receipt = await getDriveReceipt(c, request, {
      by: "command",
      kind: "control",
      commandId: op.row.commandId,
    });
    expect(
      row.data.phase === "reconciling" &&
        row.owner.state === "closed" &&
        row.terminalAt === null &&
        receipt?.creation?.canResend === true,
    ).toBe(true);
    await runDriveQueue(c, runtime, { controls: null, candidates: null });
    expect(calls.create === 1 && calls.allocate === 1).toBe(true);
    createUnknown = true;
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
    const again = await creation(row.id);
    const third = await continueDriveFolder(
      c,
      request,
      row.id,
      {
        expectedVersion: again.version,
        phase: "reconciling",
        action: "resend",
        sends: 2,
      },
      runtime,
    );
    expect(
      again.data.fileId === row.data.fileId &&
        again.data.sends === 2 &&
        calls.create === 2 &&
        calls.allocate === 1 &&
        third.kind === "stale",
    ).toBe(true);
  });
  it("V3 unknown parent requires current explicit confirmation before adoption", async () => {
    const op = await unknownCreation();
    if (observation.kind !== "usable") throw Error("DRIVE_FIXTURE_STATE");
    observation = { ...observation, parents: ["synthetic-other-parent"] };
    await inspectCreation(op.row.id);
    const row = await creation(op.row.id);
    const receipt = await getDriveReceipt(c, request, {
      by: "command",
      kind: "control",
      commandId: op.row.commandId,
    });
    expect(
      row.data.phase === "ready" &&
        row.data.observedParent === "synthetic-other-parent" &&
        row.owner.state === "closed" &&
        receipt?.creation?.confirmation?.fileId === row.data.fileId &&
        (await getDriveSettings(c, request)).folder?.id !== row.data.fileId,
    ).toBe(true);
    const wrong = await continueDriveFolder(
      c,
      request,
      row.id,
      {
        expectedVersion: row.version,
        phase: "ready",
        action: "confirm",
        sends: 1,
        targetId: "wrong-target",
      },
      runtime,
    );
    expect(wrong.kind === "stale" && calls.inspect === 1).toBe(true);
    const confirm = {
      expectedVersion: row.version,
      phase: "ready" as const,
      action: "confirm" as const,
      sends: 1,
      targetId: row.data.fileId,
    };
    await continueDriveFolder(c, request, row.id, confirm, runtime);
    const rejected = await driveRejected(() =>
      continueDriveFolder(c, request, row.id, confirm, runtime),
    );
    expect(
      rejected &&
        (await creation(row.id)).data.phase === "completed" &&
        (await getDriveSettings(c, request)).folder?.id === row.data.fileId &&
        calls.create === 1 &&
        calls.inspect === 2,
    ).toBe(true);
    createConflict = false;
    const normal = await beginDriveFolderCreation(c, request, await initial());
    await runDriveControl(c, normal.row.id, runtime);
    await runDriveControl(c, normal.row.id, runtime);
    expect(
      (await creation(normal.row.id)).data.phase === "completed" &&
        calls.create === 2 &&
        calls.inspect === 3,
    ).toBe(true);
  });
  it("V3 confirmation rejects a parent change after the ready observation", async () => {
    const op = await unknownCreation();
    await inspectCreation(op.row.id);
    const row = await creation(op.row.id);
    if (observation.kind !== "usable") throw Error("DRIVE_FIXTURE_STATE");
    observation = { ...observation, parents: ["synthetic-moved-parent"] };
    await continueDriveFolder(
      c,
      request,
      row.id,
      {
        expectedVersion: row.version,
        phase: "ready",
        action: "confirm",
        sends: 1,
        targetId: row.data.fileId,
      },
      runtime,
    );
    const failed = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(row.id),
    );
    expect(
      failed?.data.phase === "failed" &&
        failed.data.failure === "DRIVE_CREATE_CONFLICT" &&
        failed.owner.state === "closed" &&
        (await getDriveSettings(c, request)).folder?.id !== row.data.fileId &&
        calls.create === 1,
    ).toBe(true);
  });
  it("V4 resource protection failure preserves proven closure without adopting the folder", async () => {
    if (observation.kind !== "usable") throw Error("DRIVE_FIXTURE_STATE");
    observation = { ...observation, resourceKey: "synthetic-resource" };
    rejectedPurpose = "resource-key";
    const before = await getDriveSettings(c, request);
    const row = await selected();
    expect(
      row?.data.phase === "failed" &&
        row.data.failure === "DRIVE_UNAVAILABLE" &&
        row.owner.state === "closed" &&
        execution.active.size === 0 &&
        (await getDriveSettings(c, request)).settingsVersion ===
          before.settingsVersion &&
        calls.inspect === 1,
    ).toBe(true);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.driveControls.held(f().context.accountId),
        )
      ).account === 0,
    ).toBe(true);
  });
  it("V4 candidate protection failure closes the authorization and preserves the old credential", async () => {
    const before = await getDriveSettings(c, request);
    const a = await authorize();
    rejectedPurpose = "candidate";
    await exchangeDriveAuthorization(
      c,
      request,
      { state: a.state, code: "synthetic-code" },
      runtime,
    );
    const row = await c.unitOfWorkProvider.run((u) =>
      u.driveAttempts.find(a.start.id),
    );
    const after = await getDriveSettings(c, request);
    expect(
      row?.data.phase === "failed" &&
        row.data.failure === "DRIVE_UNAVAILABLE" &&
        row.owner.state === "closed" &&
        row.confirmedFolderIdsEnvelope === null &&
        before.epoch === after.epoch &&
        before.state === after.state &&
        calls.exchange === 1 &&
        execution.active.size === 0,
    ).toBe(true);
  });
  it("V4 cancellation between failed adoption and recovery retains its terminal outcome", async () => {
    if (observation.kind !== "usable") throw Error("DRIVE_FIXTURE_STATE");
    observation = { ...observation, resourceKey: "synthetic-resource" };
    const p = await picker();
    const op = await beginDriveFolderSelection(c, request, {
      ...(await initial()),
      pickerId: p.id,
      ticket: p.ticket,
      fileId: "synthetic-folder",
      resourceKey: null,
    });
    rejectedPurpose = "resource-key";
    const original = c.unitOfWorkProvider;
    let cancelled = false;
    c = {
      ...c,
      unitOfWorkProvider: {
        run: async (work) => {
          try {
            return await original.run(work);
          } catch (error) {
            if (
              !cancelled &&
              error instanceof BusinessRuleError &&
              error.code === "DRIVE_UNAVAILABLE"
            ) {
              cancelled = true;
              const row = await original.run((u) =>
                u.driveControls.find(op.row.id),
              );
              if (!row) throw Error("DRIVE_FIXTURE_STATE");
              await cancelDriveOperation(
                { ...c, unitOfWorkProvider: original },
                request,
                { kind: "control", id: row.id, expectedVersion: row.version },
              );
            }
            throw error;
          }
        },
      },
    };
    await runDriveControl(c, op.row.id, runtime);
    const row = await original.run((u) => u.driveControls.find(op.row.id));
    expect(
      cancelled &&
        row?.cancelGeneration === 1 &&
        row.data.phase === "failed" &&
        row.data.failure === "DRIVE_CANCELLED" &&
        row.owner.state === "closed" &&
        execution.active.size === 0,
    ).toBe(true);
  });
  it("V4 database-unknown rollback is not reclassified as a proven failed commit", async () => {
    if (observation.kind !== "usable") throw Error("DRIVE_FIXTURE_STATE");
    observation = { ...observation, resourceKey: "synthetic-resource" };
    const p = await picker();
    const op = await beginDriveFolderSelection(c, request, {
      ...(await initial()),
      pickerId: p.id,
      ticket: p.ticket,
      fileId: "synthetic-folder",
      resourceKey: null,
    });
    rejectedPurpose = "resource-key";
    const original = c.unitOfWorkProvider;
    let failures = 0;
    c = {
      ...c,
      unitOfWorkProvider: {
        run: async (work) => {
          try {
            return await original.run(work);
          } catch {
            failures++;
            throw Error("SYNTHETIC_DB_UNKNOWN");
          }
        },
      },
    };
    expect(
      await driveRejected(() => runDriveControl(c, op.row.id, runtime)),
    ).toBe(true);
    const row = await original.run((u) => u.driveControls.find(op.row.id));
    expect(
      failures === 1 &&
        row?.owner.state === "active" &&
        row.data.phase === "running" &&
        execution.active.size === 0 &&
        calls.inspect === 1,
    ).toBe(true);
  });
  it("S4 usable ready and confirmed folder preserve server name and monotonic last use", async (context) => {
    Object.assign(context.task.meta, { driveStage: 1 });
    now = new Date(now.getTime() + 1000);
    const row = await selected();
    if (!row || row.data.kind !== "folder-select" || row.data.phase !== "ready")
      throw Error("DRIVE_FIXTURE_STATE");
    const ready = await getDriveSettings(c, request);
    const receipt = await getDriveReceipt(c, request, {
      by: "id",
      kind: "control",
      id: row.id,
    });
    expect(
      ready.lastUsedAt === now.toISOString() &&
        ready.folder === null &&
        receipt?.target?.targetName === "Synthetic",
    ).toBe(true);
    const touched = now.toISOString();
    now = new Date(now.getTime() - 500);
    Object.assign(context.task.meta, { driveStage: 2 });
    let rejected: string | null = null;
    try {
      await continueDriveFolder(
        c,
        request,
        row.id,
        {
          expectedVersion: row.version,
          phase: "ready",
          action: "confirm",
          targetId: row.data.targetId,
        },
        runtime,
      );
    } catch (error) {
      if (error instanceof BusinessRuleError) rejected = error.code;
    }
    const unchanged = await c.unitOfWorkProvider.run((u) =>
      u.driveControls.find(row.id),
    );
    expect(
      rejected === "DRIVE_STATE_INVALID" &&
        unchanged?.version === row.version &&
        unchanged.data.phase === "ready" &&
        JSON.stringify(unchanged.owner) === JSON.stringify(row.owner) &&
        (await getDriveSettings(c, request)).lastUsedAt === touched &&
        execution.active.size === 0 &&
        !execution.hasPendingCallers(),
    ).toBe(true);
    now = new Date(now.getTime() + 1500);
    Object.assign(context.task.meta, { driveStage: 3 });
    await continueDriveFolder(
      c,
      request,
      row.id,
      {
        expectedVersion: row.version,
        phase: "ready",
        action: "confirm",
        targetId: row.data.targetId,
      },
      runtime,
    );
    const saved = await getDriveSettings(c, request);
    expect(
      saved.folder?.name === "Synthetic" &&
        saved.lastUsedAt === now.toISOString() &&
        saved.lastUsedAt > touched &&
        execution.active.size === 0,
    ).toBe(true);
  });
  it("S4 conflict metadata ready records use without adopting an unconfirmed parent", async () => {
    const op = await beginDriveFolderCreation(c, request, await initial());
    await runDriveControl(c, op.row.id, runtime);
    now = new Date(now.getTime() + 1000);
    await runDriveControl(c, op.row.id, runtime);
    const settings = await getDriveSettings(c, request);
    const receipt = await getDriveReceipt(c, request, {
      by: "id",
      kind: "control",
      id: op.row.id,
    });
    expect(
      settings.lastUsedAt === now.toISOString() &&
        settings.folder === null &&
        receipt?.phase === "ready" &&
        receipt.creation?.confirmation?.targetName === "Synthetic",
    ).toBe(true);
  });
  it("S4 touch false rolls back ready and preserves exact proven owner closure", async () => {
    const p = await picker();
    const op = await beginDriveFolderSelection(c, request, {
      ...(await initial()),
      pickerId: p.id,
      ticket: p.ticket,
      fileId: "synthetic-folder",
      resourceKey: null,
    });
    const original = c.unitOfWorkProvider;
    let touches = 0;
    c = {
      ...c,
      unitOfWorkProvider: {
        run: (work) =>
          original.run((u) =>
            work({
              ...u,
              driveConnections: {
                ...u.driveConnections,
                find: u.driveConnections.find.bind(u.driveConnections),
                ensure: u.driveConnections.ensure.bind(u.driveConnections),
                replace: (value, version, change) => {
                  if (change === "touch") {
                    touches++;
                    return Promise.resolve(false);
                  }
                  return u.driveConnections.replace(value, version, change);
                },
              },
            }),
          ),
      },
    };
    await runDriveControl(c, op.row.id, runtime);
    const row = await original.run((u) => u.driveControls.find(op.row.id));
    const settings = await getDriveSettings(c, request);
    expect(
      touches === 1 &&
        row?.data.phase === "failed" &&
        row.data.failure === "DRIVE_UNAVAILABLE" &&
        row.owner.state === "closed" &&
        settings.lastUsedAt === null &&
        settings.folder === null &&
        execution.active.size === 0,
    ).toBe(true);
  });
  it("S4 OAuth refresh Picker GET and shortcut without usable metadata do not record use", async () => {
    const a = await authorize();
    await exchangeDriveAuthorization(
      c,
      request,
      { state: a.state, code: "synthetic-code" },
      runtime,
    );
    const refresh = await beginDriveRefresh(c, request, await initial());
    await runDriveControl(c, refresh.row.id, runtime);
    observation = {
      kind: "shortcut",
      targetId: "synthetic-target",
      targetResourceKey: null,
    };
    const row = await selected();
    const settings = await getDriveSettings(c, request);
    const receipt =
      row &&
      (await getDriveReceipt(c, request, {
        by: "id",
        kind: "control",
        id: row.id,
      }));
    expect(
      settings.lastUsedAt === null &&
        settings.account?.connectedAt === now.toISOString() &&
        receipt?.target?.targetName === null &&
        receipt.target.targetId === "synthetic-target",
    ).toBe(true);
  });
  it("S4 receipt ID and command are equivalent only for the current same actor", async () => {
    const input = await initial();
    const op = await beginDrivePicker(c, request, input);
    const other = {
      sessionToken: "synthetic-second-session",
      browserToken: "synthetic-second-browser",
    };
    await c.unitOfWorkProvider.run(async (u) => {
      const browser = await u.authBrowsers.ensure(
        c.tokens.hash(other.browserToken),
        new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
        now,
      );
      await u.accounts.saveSession({
        accountId: f().context.accountId,
        tokenHash: c.tokens.hash(other.sessionToken),
        browser,
        expiresAt: new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
      });
    });
    const a = await getDriveReceipt(c, request, {
      by: "id",
      kind: "control",
      id: op.row.id,
    });
    const b = await getDriveReceipt(c, request, {
      by: "command",
      kind: "control",
      commandId: input.commandId,
    });
    const hidden = await getDriveReceipt(c, other, {
      by: "id",
      kind: "control",
      id: op.row.id,
    });
    expect(
      JSON.stringify(a) === JSON.stringify(b) &&
        hidden === null &&
        (await getDriveSettings(c, other)).live.length === 0,
    ).toBe(true);
  });
  it("S4 settings locator is bounded and its pure read projects no secret context", async () => {
    const op = await beginDrivePicker(c, request, await initial());
    const before = await f().client.execute("SELECT total_changes() AS n");
    const settings = await getDriveSettings(c, request);
    const after = await f().client.execute("SELECT total_changes() AS n");
    expect(
      before.rows[0]?.n === after.rows[0]?.n &&
        settings.live.length === 1 &&
        settings.live[0]?.id === op.row.id &&
        settings.live.length <= 206 &&
        settings.account?.email === null &&
        settings.lastUsedAt === null &&
        ![
          "subject",
          "envelope",
          "sessionHash",
          "browserHash",
          "runtimeGeneration",
        ].some((key) => JSON.stringify(settings).includes(`"${key}"`)),
    ).toBe(true);
  });
  it("S4 account history merges authorization and folder rows across browser scopes", async () => {
    const a = await authorize();
    const old = await c.unitOfWorkProvider.run((u) =>
      u.driveAttempts.find(a.start.id),
    );
    if (!old) throw Error("DRIVE_FIXTURE_STATE");
    await cancelDriveOperation(c, request, {
      kind: "authorization",
      id: old.id,
      expectedVersion: old.version,
    });
    const foreign = await f().control();
    await c.unitOfWorkProvider.run((u) => u.driveControls.insert(foreign));
    const history = await getDriveHistory(c, request);
    expect(
      history.length === 2 &&
        history.some((v) => v.kind === "authorization") &&
        history.some((v) => v.id === foreign.id) &&
        history.length <= 100 &&
        history[0]?.id === [old.id, foreign.id].sort().reverse()[0] &&
        (await getDriveReceipt(c, request, {
          by: "id",
          kind: "control",
          id: foreign.id,
        })) === null,
    ).toBe(true);
  });
  it("S4 current verified SSO subject is advisory and identity changes refuse URL replay", async () => {
    await f().db.insert(googleIdentities).values({
      accountId: f().context.accountId,
      issuer: "https://accounts.google.com",
      subject: "synthetic-sso-subject",
      linkedAt: now,
    });
    const a = await authorize();
    expect(auth?.loginHint === "synthetic-sso-subject").toBe(true);
    const original = c.unitOfWorkProvider;
    c = {
      ...c,
      unitOfWorkProvider: {
        run: (work) =>
          original.run((u) =>
            work({
              ...u,
              accounts: new Proxy(u.accounts, {
                get(target, key) {
                  if (key === "findById")
                    return async (id: string) => {
                      const account = await target.findById(id);
                      return account
                        ? {
                            ...account,
                            google: {
                              issuer: "https://accounts.google.com" as const,
                              subject: "synthetic-different-subject",
                              linkedAt: now,
                            },
                          }
                        : null;
                    };
                  const value: unknown = Reflect.get(target, key);
                  return typeof value === "function"
                    ? value.bind(target)
                    : value;
                },
              }),
            }),
          ),
      },
    };
    auth = null;
    expect(
      await driveRejected(() => beginDriveAuthorization(c, request, a.input)),
    ).toBe(true);
    expect(auth === null && calls.exchange === 0).toBe(true);
  });
  it("S4 choose-account omits hint and legacy digest blocks only URL reconstruction", async () => {
    const input = {
      ...(await initial()),
      confirmation: await c.unitOfWorkProvider.run((u) =>
        driveFolderConfirmation(u, f().context.accountId, (value) =>
          c.tokens.hash(value),
        ),
      ),
      consent: true,
      chooseAccount: true,
    };
    const original = c.unitOfWorkProvider;
    c = {
      ...c,
      unitOfWorkProvider: {
        run: (work) =>
          original.run((u) =>
            work({
              ...u,
              driveAttempts: new Proxy(u.driveAttempts, {
                get(target, key) {
                  if (key === "insert")
                    return (row: Parameters<typeof target.insert>[0]) =>
                      target.insert({
                        ...row,
                        intentDigest: c.tokens.hash(
                          JSON.stringify([
                            "drive-intent",
                            1,
                            row.accountId,
                            "authorization",
                            input.expectedEpoch,
                            input.expectedSettingsVersion,
                            input.confirmation,
                            input.consent,
                            input.chooseAccount,
                            "settings",
                          ]),
                        ),
                      });
                  const value: unknown = Reflect.get(target, key);
                  return typeof value === "function"
                    ? value.bind(target)
                    : value;
                },
              }),
            }),
          ),
      },
    };
    const a = await beginDriveAuthorization(c, request, input);
    if (!auth) throw Error("DRIVE_FIXTURE_STATE");
    expect(auth.loginHint === null).toBe(true);
    const state = auth.state;
    c = { ...c, unitOfWorkProvider: original };
    expect(
      await driveRejected(() => beginDriveAuthorization(c, request, input)),
    ).toBe(true);
    expect(
      (
        await getDriveReceipt(c, request, {
          by: "id",
          kind: "authorization",
          id: a.id,
        })
      )?.phase === "pending",
    ).toBe(true);
    await exchangeDriveAuthorization(
      c,
      request,
      { state, code: "synthetic-code" },
      runtime,
    );
    expect(
      (
        await getDriveReceipt(c, request, {
          by: "id",
          kind: "authorization",
          id: a.id,
        })
      )?.phase === "completed" && calls.exchange === 1,
    ).toBe(true);
  });
  it("S4 newly accepted Picker facade issues separate ticket and provider expiry only once", async () => {
    const input = await initial();
    const result = await launchDrivePicker(c, request, input);
    expect(
      result.kind === "issued" &&
        result.picker.appId === "1" &&
        result.picker.apiKey === "synthetic-picker" &&
        Date.parse(result.picker.accessExpiresAt) >
          Date.parse(result.picker.pickerExpiresAt) &&
        result.receipt.owner === "closed",
    ).toBe(true);
    expect(
      calls.refresh === 0 &&
        calls.inspect === 0 &&
        execution.active.size === 0 &&
        (await getDriveSettings(c, request)).lastUsedAt === null,
    ).toBe(true);
  });
  it("S4 Picker command replay is receipt-only and never returns a token through GET", async () => {
    const input = await initial();
    const first = await launchDrivePicker(c, request, input);
    const replay = await launchDrivePicker(c, request, input);
    const receipt = await getDriveReceipt(c, request, {
      by: "command",
      kind: "control",
      commandId: input.commandId,
    });
    expect(
      first.kind === "issued" &&
        replay.kind === "receipt" &&
        replay.receipt.id === first.receipt.id &&
        receipt?.phase === "awaiting-selection" &&
        !JSON.stringify([replay, receipt]).includes("synthetic-access") &&
        calls.refresh === 0,
    ).toBe(true);
  });
  it("S4 Picker late result after current actor invalidation discloses no token", async () => {
    execution.hold = true;
    const task = launchDrivePicker(c, request, await initial());
    pending.push(task);
    await execution.finished.promise;
    await c.unitOfWorkProvider.run(async (u) => {
      const browser = await u.authBrowsers.find(
        c.tokens.hash(request.browserToken),
      );
      if (!browser) throw Error("DRIVE_FIXTURE_STATE");
      await u.authBrowsers.advance(
        browser,
        new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
        now,
      );
    });
    execution.release();
    expect(await driveRejected(() => task)).toBe(true);
    expect(
      execution.active.size === 0 && calls.inspect === 0 && calls.create === 0,
    ).toBe(true);
  });
});
