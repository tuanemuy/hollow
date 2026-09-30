import { describe, expect, it } from "vitest";
import {
  boundedDriveDto,
  driveAutoSettingSchema,
  driveBeginSchema,
  driveCancelSchema,
  driveContinueSchema,
  driveInitialSchema,
  driveLookupSchema,
  driveSelectSchema,
} from "./driveInput";

const id = "00000000-0000-4000-8000-000000000001";
const initial = { commandId: id, expectedEpoch: 0, expectedSettingsVersion: 1 };
describe("Drive closed transport shapes", () => {
  it("auto toggles are current-version booleans without caller credentials or folder mutation", () => {
    const value = {
      expectedEpoch: 1,
      expectedSettingsVersion: 2,
      enabled: true,
    };
    expect(driveAutoSettingSchema.safeParse(value).success).toBe(true);
    for (const patch of [
      { enabled: "true" },
      { expectedSettingsVersion: 0 },
      { folder: id },
      { actor: id },
      { token: "synthetic" },
    ])
      expect(
        driveAutoSettingSchema.safeParse({ ...value, ...patch }).success,
      ).toBe(false);
  });
  it("accepts initial immutable intent and rejects extra or unsafe versions", () => {
    const begin = {
      ...initial,
      consent: true,
      chooseAccount: false,
      confirmation: { version: 1, expectedEpoch: 0, sequence: 0, ids: [] },
    };
    expect(
      driveBeginSchema.safeParse(begin).success &&
        driveInitialSchema.safeParse(initial).success,
    ).toBe(true);
    expect(
      [
        { ...begin, token: "synthetic" },
        { ...initial, expectedEpoch: -1 },
        { ...initial, expectedSettingsVersion: Number.MAX_SAFE_INTEGER + 1 },
        { ...begin, confirmation: { ...begin.confirmation, ids: [id, id] } },
      ].every((value) => !driveBeginSchema.safeParse(value).success),
    ).toBe(true);
  });
  it("GET locator and cancellation cannot carry another browser or invoke work", () => {
    expect(
      driveLookupSchema.safeParse({ by: "id", kind: "control", id }).success &&
        driveLookupSchema.safeParse({
          by: "command",
          kind: "authorization",
          commandId: id,
        }).success &&
        driveCancelSchema.safeParse({ id, kind: "control", expectedVersion: 1 })
          .success,
    ).toBe(true);
    expect(
      !driveLookupSchema.safeParse({
        by: "id",
        kind: "control",
        id,
        start: true,
      }).success &&
        !driveCancelSchema.safeParse({
          id,
          kind: "control",
          expectedVersion: 1,
          browser: "other",
        }).success,
    ).toBe(true);
  });
  it("continuation carries saved target and sends CAS without a new intent ledger", () => {
    const base = { id, expectedVersion: 3 };
    expect(
      driveContinueSchema.safeParse({
        ...base,
        phase: "ready",
        action: "confirm",
        targetId: "folder",
      }).success &&
        driveContinueSchema.safeParse({
          ...base,
          phase: "ready",
          action: "confirm",
          targetId: "parent",
          sends: 2,
        }).success &&
        driveContinueSchema.safeParse({
          ...base,
          phase: "reconciling",
          action: "inspect",
          sends: 1,
        }).success &&
        driveContinueSchema.safeParse({
          ...base,
          phase: "reconciling",
          action: "resend",
          sends: 1,
        }).success,
    ).toBe(true);
    expect(
      !driveContinueSchema.safeParse({
        ...base,
        phase: "reconciling",
        action: "inspect",
      }).success &&
        !driveContinueSchema.safeParse({
          ...base,
          phase: "reconciling",
          action: "resend",
          sends: 2,
        }).success,
    ).toBe(true);
  });
  it("selection counts UTF8 bytes and ordinary DTO has its own finite ceiling", () => {
    const value = {
      ...initial,
      pickerId: id,
      ticket: "synthetic-ticket",
      fileId: "folder",
      resourceKey: null,
    };
    expect(
      driveSelectSchema.safeParse(value).success &&
        !driveSelectSchema.safeParse({ ...value, fileId: "あ".repeat(342) })
          .success &&
        !driveSelectSchema.safeParse({ ...value, name: "untrusted" }).success,
    ).toBe(true);
    expect(boundedDriveDto({ state: "unlinked" }).state === "unlinked").toBe(
      true,
    );
    let rejected = false;
    try {
      boundedDriveDto("x".repeat(131071));
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });
});
