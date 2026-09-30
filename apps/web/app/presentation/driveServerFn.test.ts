import { describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  methods: [] as string[],
  contexts: [] as boolean[],
  read: vi.fn(async () => ({ state: "linked" })),
  mutate: vi.fn(async () => ({ accepted: true })),
  continuation: vi.fn(async () => ({ kind: "accepted" })),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: ({ method }: { method: string }) => {
    fake.methods.push(method);
    let validate = (value: unknown) => value;
    const chain = {
      middleware: () => chain,
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return chain;
      },
      handler:
        (fn: (input: { data: unknown }) => unknown) =>
        async (input?: { data: unknown }) =>
          fn({ data: validate(input?.data) }),
    };
    return chain;
  },
}));
vi.mock("./errorResponseMiddleware", () => ({ errorResponseMiddleware: {} }));
vi.mock("./hollowServer", () => ({
  hollowContext: async (mutation: boolean) => {
    fake.contexts.push(mutation);
    return {
      container: { drive: { runtimeGeneration: "synthetic-runtime" } },
      token: "synthetic",
    };
  },
  authenticationRequest: () => ({
    sessionToken: "synthetic",
    browserToken: "synthetic",
  }),
}));
vi.mock("@repo/core/application/integration/drive/read", () => ({
  getDriveSettings: fake.read,
  getDriveReceipt: fake.read,
  getDriveHistory: fake.read,
}));
vi.mock("@repo/core/application/integration/drive/connection", () => ({
  beginDriveAuthorization: fake.mutate,
}));
vi.mock("@repo/core/application/integration/drive/folders", () => ({
  beginDriveFolderCreation: fake.mutate,
  continueDriveFolder: fake.continuation,
}));
vi.mock("@repo/core/application/integration/drive/control", () => ({
  cancelDriveOperation: fake.mutate,
  disconnectDrive: fake.mutate,
}));
vi.mock("@repo/core/application/integration/drive/autoSetting", () => ({
  setDriveAutoBackup: fake.mutate,
}));
vi.mock("@repo/core/application/integration/drive/current", () => ({
  driveServices: () => ({ runtimeGeneration: "synthetic-runtime" }),
}));

import {
  cancelDriveFn,
  continueDriveFolderFn,
  driveHistoryFn,
  driveReceiptFn,
  driveSettingsFn,
  setDriveAutoBackupFn,
  unlinkDriveFn,
} from "./driveServerFn";

const id = "00000000-0000-4000-8000-000000000001";
describe("Drive server function pure GET and explicit POST facade", () => {
  it("settings locator history are GET with no mutation context or provider operation", async () => {
    fake.contexts.length = 0;
    await driveSettingsFn();
    await driveHistoryFn();
    await driveReceiptFn({ data: { by: "id", kind: "control", id } });
    expect(
      fake.methods.filter((v) => v === "GET").length === 3 &&
        fake.methods.filter((v) => v === "POST").length === 6 &&
        fake.contexts.length === 3 &&
        fake.contexts.every((v) => !v) &&
        fake.mutate.mock.calls.length === 0,
    ).toBe(true);
  });
  it("auto setting is an explicit bounded POST in the authenticated mutation context", async () => {
    fake.contexts.length = 0;
    await setDriveAutoBackupFn({
      data: { expectedEpoch: 1, expectedSettingsVersion: 2, enabled: true },
    });
    expect(fake.contexts).toEqual([true]);
    expect(fake.mutate).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      { expectedEpoch: 1, expectedSettingsVersion: 2, enabled: true },
    );
  });
  it("continuation injects server generation and cancel unlink retain mutation context", async () => {
    fake.contexts.length = 0;
    await continueDriveFolderFn({
      data: {
        id,
        expectedVersion: 2,
        phase: "reconciling",
        action: "inspect",
        sends: 1,
      },
    });
    await cancelDriveFn({ data: { id, kind: "control", expectedVersion: 2 } });
    await unlinkDriveFn({
      data: {
        commandId: id,
        expectedEpoch: 1,
        expectedSettingsVersion: 2,
        confirmation: {
          version: 1,
          expectedEpoch: 1,
          sequence: 0,
          ids: [],
          backupIds: [],
        },
      },
    });
    expect(
      fake.contexts.length === 3 &&
        fake.contexts.every(Boolean) &&
        fake.continuation.mock.calls.length === 1 &&
        Reflect.get(fake.continuation.mock.calls[0] ?? [], 4) ===
          "synthetic-runtime",
    ).toBe(true);
  });
});
