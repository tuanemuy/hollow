import { driveCurrentMatches } from "@repo/core/application/integration/drive/current";
import { describe, expect, it } from "vitest";
import {
  DRIVE_LIMITS,
  driveAttemptSchema,
  driveCanClaim,
  driveConnectionSchema,
  driveControlSchema,
  driveOwnerTransition,
  parseDrive,
} from "./drive";

const now = new Date("2026-09-29T00:00:00.000Z");
const accountId = "00000000-0000-4000-8000-000000000001";
const context = {
  accountId,
  sessionHash: "synthetic-session",
  authVersion: 1,
  browserHash: "synthetic-browser",
  browserEpoch: 1,
};
const base = {
  id: "00000000-0000-4000-8000-000000000002",
  accountId,
  commandId: "00000000-0000-4000-8000-000000000003",
  context,
  expectedEpoch: 1,
  expectedCredentialVersion: 1,
  expectedSettingsVersion: 1,
  version: 1,
  cancelGeneration: 0,
  owner: { state: "none" },
  createdAt: now,
  updatedAt: now,
  expiresAt: new Date(now.getTime() + DRIVE_LIMITS.operationMs),
  terminalAt: null,
};
const connection = parseDrive(driveConnectionSchema, {
  accountId,
  epoch: 1,
  credentialVersion: 1,
  settingsVersion: 1,
  admissionSequence: 0,
  version: 1,
  autoBackup: false,
  state: "linked",
  credential: {
    subject: "synthetic",
    email: null,
    envelope: "synthetic",
    scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
    accessExpiresAt: now,
    connectedAt: now,
  },
  folder: null,
  lastUsedAt: null,
  updatedAt: now,
});
const attempt = {
  ...base,
  stateHash: "synthetic-state",
  nonceHash: "synthetic-nonce",
  confirmedAdmissionSequence: 0,
  returnTo: "settings",
  data: { phase: "pending", verifierEnvelope: "synthetic" },
};
const control = {
  ...base,
  subject: "synthetic",
  data: { kind: "folder-create", phase: "queued" },
};
const active = {
  state: "active" as const,
  runtimeGeneration: "synthetic-runtime",
  token: "synthetic-token",
};

describe("Drive closed values and current fences", () => {
  it("accepts legal states but never backup-on or login-purpose data", () => {
    expect(
      driveAttemptSchema.safeParse(attempt).success &&
        driveControlSchema.safeParse(control).success,
    ).toBe(true);
    expect(
      driveConnectionSchema.safeParse({ ...connection, autoBackup: true })
        .success,
    ).toBe(false);
    expect(
      driveAttemptSchema.safeParse({ ...attempt, returnTo: "login" }).success,
    ).toBe(false);
  });
  it("rejects mixed union payload and plaintext extension", () => {
    expect(
      driveControlSchema.safeParse({
        ...control,
        data: { kind: "picker", phase: "prepared", fileId: "synthetic" },
      }).success,
    ).toBe(false);
    expect(
      driveAttemptSchema.safeParse({
        ...attempt,
        data: { ...attempt.data, refreshToken: "synthetic" },
      }).success,
    ).toBe(false);
    expect(
      driveAttemptSchema.safeParse({
        ...attempt,
        data: { phase: "exchanging", verifierEnvelope: "synthetic" },
        owner: active,
      }).success,
    ).toBe(false);
  });
  it("rejects null timestamps, reversed lifetime and UTF8 payload overflow", () => {
    for (const data of [
      { ...attempt, createdAt: null },
      { ...attempt, expiresAt: now },
      { ...attempt, updatedAt: new Date(now.getTime() - 1) },
      {
        ...attempt,
        data: { phase: "pending", verifierEnvelope: "あ".repeat(22000) },
      },
    ])
      expect(driveAttemptSchema.safeParse(data).success).toBe(false);
  });
  it("binds terminal/current context and candidate to closed owner", () => {
    const candidate = {
      ...attempt,
      data: { phase: "candidate", candidateEnvelope: "synthetic" },
    };
    expect(
      driveAttemptSchema.safeParse({ ...candidate, owner: active }).success,
    ).toBe(false);
    expect(
      driveAttemptSchema.safeParse({
        ...candidate,
        owner: { ...active, state: "closed" },
      }).success,
    ).toBe(true);
    expect(
      driveAttemptSchema.safeParse({ ...attempt, context: null }).success,
    ).toBe(false);
    expect(
      driveAttemptSchema.safeParse({
        ...attempt,
        context: { ...context, accountId: base.commandId },
      }).success,
    ).toBe(false);
  });
  it("Picker lifetime and waiting owner are separate from provider lifetime", () => {
    const picker = {
      ...control,
      expiresAt: new Date(now.getTime() + DRIVE_LIMITS.pickerMs),
      data: {
        kind: "picker",
        phase: "awaiting-selection",
        ticketHash: "synthetic",
      },
      owner: { ...active, state: "closed" },
    };
    expect(driveControlSchema.safeParse(picker).success).toBe(true);
    expect(
      driveControlSchema.safeParse({ ...picker, expiresAt: base.expiresAt })
        .success,
    ).toBe(false);
    expect(
      driveControlSchema.safeParse({ ...picker, owner: active }).success,
    ).toBe(false);
  });
  it("same ID send counter is bounded and failure remains a finite code", () => {
    const running = {
      ...control,
      owner: active,
      data: {
        kind: "folder-create",
        phase: "running",
        fileId: "synthetic",
        marker: "synthetic",
        sends: 2,
        observedParent: null,
      },
    };
    expect(driveControlSchema.safeParse(running).success).toBe(true);
    expect(
      driveControlSchema.safeParse({
        ...running,
        data: { ...running.data, sends: 3 },
      }).success,
    ).toBe(false);
    expect(
      driveControlSchema.safeParse({
        ...control,
        terminalAt: now,
        data: {
          kind: "folder-create",
          phase: "failed",
          failure: "raw-error",
          identity: null,
        },
      }).success,
    ).toBe(false);
  });
  it("owner unknown cannot become idle or active and close cannot reuse a token", () => {
    const unknown = { ...active, state: "unknown" as const };
    const closed = { ...active, state: "closed" as const };
    expect(
      driveOwnerTransition(unknown, { state: "none" }) ||
        driveOwnerTransition(unknown, active) ||
        driveOwnerTransition(closed, active),
    ).toBe(false);
    expect(
      driveOwnerTransition(unknown, closed) &&
        driveOwnerTransition(closed, { ...active, token: "synthetic-next" }),
    ).toBe(true);
  });
  it("owner limits require finite whole counts", () => {
    expect(driveCanClaim({ globalHeld: 1, accountHeld: 0 })).toBe(true);
    for (const v of [
      { globalHeld: 2, accountHeld: 0 },
      { globalHeld: 1, accountHeld: 1 },
      { globalHeld: -1, accountHeld: 0 },
      { globalHeld: 0.5, accountHeld: 0 },
      { globalHeld: Number.NaN, accountHeld: 0 },
    ])
      expect(driveCanClaim(v)).toBe(false);
  });
  it("current actor session browser epoch settings and connection are all bound", () => {
    const input = {
      expected: context,
      current: context,
      expectedEpoch: 1,
      expectedSettingsVersion: 1,
      connection,
    };
    expect(driveCurrentMatches(input)).toBe(true);
    for (const current of [
      null,
      { ...context, accountId: base.id },
      { ...context, sessionHash: "other" },
      { ...context, authVersion: 2 },
      { ...context, browserHash: "other" },
      { ...context, browserEpoch: 2 },
    ])
      expect(driveCurrentMatches({ ...input, current })).toBe(false);
    expect(
      driveCurrentMatches({ ...input, expectedEpoch: 2 }) ||
        driveCurrentMatches({ ...input, expectedSettingsVersion: 2 }) ||
        driveCurrentMatches({ ...input, connection: null }),
    ).toBe(false);
  });
  it("terminal result versions advance exactly once", () => {
    const completed = {
      ...control,
      terminalAt: now,
      data: { kind: "disconnect", phase: "completed", resultEpoch: 2 },
    };
    expect(driveControlSchema.safeParse(completed).success).toBe(true);
    expect(
      driveControlSchema.safeParse({
        ...completed,
        data: { ...completed.data, resultEpoch: 3 },
      }).success,
    ).toBe(false);
  });
});
