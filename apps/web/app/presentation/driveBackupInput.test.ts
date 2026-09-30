import { describe, expect, it } from "vitest";
import {
  driveBackupActivitySchema,
  driveBackupBulkSchema,
  driveBackupCancelSchema,
  driveBackupDetailSchema,
  driveBackupParentRetrySchema,
  driveBackupReadSchema,
  driveBackupRequestSchema,
  driveBackupSelectionSchema,
} from "./driveBackupInput";

const id = "00000000-0000-4000-8000-000000000001";
describe("Drive backup closed transport", () => {
  it("bounds the fixed bulk selection to 500 unique UUIDs and an exact digest", () => {
    const noteIds = Array.from(
      { length: 500 },
      (_, n) => `00000000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`,
    );
    const input = { noteIds, workspaceId: null };
    expect(driveBackupSelectionSchema.safeParse(input).success).toBe(true);
    for (const value of [
      { ...input, noteIds: [] },
      { ...input, noteIds: [id, id] },
      {
        ...input,
        noteIds: [...noteIds, "00000000-0000-4000-8000-999999999999"],
      },
      { ...input, actor: id },
    ])
      expect(driveBackupSelectionSchema.safeParse(value).success).toBe(false);
    expect(
      driveBackupBulkSchema.safeParse({
        ...input,
        commandId: id,
        expectedDigest: "a".repeat(64),
      }).success,
    ).toBe(true);
    expect(
      driveBackupBulkSchema.safeParse({
        ...input,
        commandId: id,
        expectedDigest: "a".repeat(63),
      }).success,
    ).toBe(false);
  });
  it("new retry/redo use an exact job version without transfer, identity or session input", () => {
    for (const kind of ["retry", "redo"]) {
      const input = {
        kind,
        noteId: id,
        commandId: id,
        expectedEpoch: 1,
        expectedSettingsVersion: 1,
        priorJobId: id,
        priorJobVersion: 1,
      };
      expect(driveBackupRequestSchema.safeParse(input).success).toBe(true);
      for (const patch of [
        { priorJobVersion: 0 },
        { priorJobId: undefined },
        { priorTransferId: id },
        { source: id },
      ])
        expect(
          driveBackupRequestSchema.safeParse({ ...input, ...patch }).success,
        ).toBe(false);
    }
  });
  it("parent retry and read cursors cannot carry a child list, hidden actor or start action", () => {
    expect(
      driveBackupParentRetrySchema.safeParse({
        requestId: id,
        expectedGeneration: 1,
        commandId: id,
      }).success,
    ).toBe(true);
    expect(
      driveBackupParentRetrySchema.safeParse({
        requestId: id,
        expectedGeneration: 1,
        commandId: id,
        jobIds: [id],
      }).success,
    ).toBe(false);
    expect(
      driveBackupActivitySchema.safeParse({ watch: [id], watchAfter: 0 })
        .success,
    ).toBe(true);
    for (const input of [
      { watch: [id, id] },
      { watchAfter: 51 },
      { start: true },
      { actor: id },
    ])
      expect(driveBackupActivitySchema.safeParse(input).success).toBe(false);
    expect(
      driveBackupDetailSchema.safeParse({
        requestId: id,
        generation: 2,
        after: 500,
      }).success,
    ).toBe(true);
    expect(
      driveBackupDetailSchema.safeParse({
        requestId: id,
        generation: 2,
        after: 501,
      }).success,
    ).toBe(false);
  });
  it("requires the exact prior locator and version for explicit retry", () => {
    const value = {
      noteId: id,
      commandId: id,
      expectedEpoch: 2,
      expectedSettingsVersion: 4,
      kind: "retry",
      priorTransferId: id,
      priorVersion: 3,
    };
    expect(driveBackupRequestSchema.safeParse(value).success).toBe(true);
    for (const patch of [
      { priorVersion: 0 },
      { priorTransferId: undefined },
      { priorVersion: undefined },
      { kind: "initial" },
      { session: "secret" },
      { received: 0 },
    ])
      expect(
        driveBackupRequestSchema.safeParse({ ...value, ...patch }).success,
      ).toBe(false);
  });
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
