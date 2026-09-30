import { describe, expect, it } from "vitest";
import {
  driveBackupCancelSchema,
  driveBackupReadSchema,
  driveBackupRequestSchema,
} from "./driveBackupInput";

const id = "00000000-0000-4000-8000-000000000001";
describe("Drive backup closed transport", () => {
  it("accepts one current manual command and rejects caller-supplied source, actor and credentials", () => {
    const value = {
      noteId: id,
      commandId: id,
      expectedEpoch: 1,
      expectedSettingsVersion: 1,
    };
    expect(driveBackupRequestSchema.safeParse(value).success).toBe(true);
    for (const extra of [
      { actor: id },
      { source: "object" },
      { token: "fake" },
      { folder: id },
      { url: "https://example.invalid" },
    ])
      expect(
        driveBackupRequestSchema.safeParse({ ...value, ...extra }).success,
      ).toBe(false);
  });
  it("keeps GET read-only with only UUID locators", () => {
    expect(
      driveBackupReadSchema.safeParse({ noteId: id, commandId: id }).success,
    ).toBe(true);
    expect(
      driveBackupReadSchema.safeParse({ noteId: id, start: true }).success,
    ).toBe(false);
    expect(
      driveBackupReadSchema.safeParse({ noteId: "../secret" }).success,
    ).toBe(false);
  });
  it("bounds versions and makes cancellation a distinct exact job command", () => {
    for (const value of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])
      expect(
        driveBackupRequestSchema.safeParse({
          noteId: id,
          commandId: id,
          expectedEpoch: value,
          expectedSettingsVersion: 1,
        }).success,
      ).toBe(false);
    expect(driveBackupCancelSchema.safeParse({ jobId: id }).success).toBe(true);
    expect(
      driveBackupCancelSchema.safeParse({ jobId: id, accountId: id }).success,
    ).toBe(false);
  });
});
