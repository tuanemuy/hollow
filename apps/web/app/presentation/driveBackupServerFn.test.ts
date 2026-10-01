import { beforeEach, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  contexts: [] as boolean[],
  preview: vi.fn(async () => ({ selected: 500, denied: 500, pending: 0 })),
  mutation: vi.fn(),
  retargetPreview: vi.fn(),
  retarget: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: ({ method }: { method: string }) => {
    let validate = (value: unknown) => value;
    const chain = {
      middleware: () => chain,
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return chain;
      },
      handler: (fn: (value: { data: unknown }) => unknown) =>
        Object.assign(
          async (input: { data: unknown }) =>
            fn({ data: validate(input.data) }),
          { method },
        ),
    };
    return chain;
  },
}));
vi.mock("./errorResponseMiddleware", () => ({ errorResponseMiddleware: {} }));
vi.mock("./hollowServer", () => ({
  hollowContext: async (mutation: boolean) => {
    fake.contexts.push(mutation);
    return { container: {}, token: "synthetic" };
  },
  authenticationRequest: () => ({
    sessionToken: "synthetic",
    browserToken: "synthetic",
  }),
}));
vi.mock("@repo/core/application/integration/drive/backup/bulk", () => ({
  previewDriveBackup: fake.preview,
  requestDriveBackupBulk: fake.mutation,
  retryDriveBackupParent: fake.mutation,
  cancelDriveBackupParent: fake.mutation,
}));
vi.mock("@repo/core/application/integration/drive/backup/retarget", () => ({
  previewDriveBackupRetarget: fake.retargetPreview,
  retargetDriveBackup: fake.retarget,
}));

import {
  previewDriveBackupFn,
  previewDriveBackupRetargetFn,
  retargetDriveBackupFn,
} from "./driveBackupServerFn";

const ids = Array.from(
  { length: 501 },
  (_, index) =>
    `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
beforeEach(() => {
  fake.contexts.length = 0;
  vi.clearAllMocks();
});
it("accepts all 500 fixed IDs through a read-only POST and current authentication", async () => {
  const data = { noteIds: ids.slice(0, 500), workspaceId: null };
  expect(Reflect.get(previewDriveBackupFn, "method")).toBe("POST");
  expect(await previewDriveBackupFn({ data })).toEqual({
    selected: 500,
    denied: 500,
    pending: 0,
  });
  expect(fake.contexts).toEqual([false]);
  expect(fake.preview).toHaveBeenCalledExactlyOnceWith(
    {},
    { sessionToken: "synthetic", browserToken: "synthetic" },
    data,
  );
  expect(fake.mutation).not.toHaveBeenCalled();
});
it("rejects 501 before context or application work without truncating", async () => {
  await expect(
    previewDriveBackupFn({ data: { noteIds: ids, workspaceId: null } }),
  ).rejects.toBeDefined();
  expect(fake.contexts).toEqual([]);
  expect(fake.preview).not.toHaveBeenCalled();
  expect(fake.mutation).not.toHaveBeenCalled();
});
it("rejects mutation fields in a preview before context or application work", async () => {
  await expect(
    previewDriveBackupFn({
      data: { noteIds: ids.slice(0, 1), workspaceId: null, commandId: ids[1] },
    } as Parameters<typeof previewDriveBackupFn>[0]),
  ).rejects.toBeDefined();
  expect(fake.contexts).toEqual([]);
  expect(fake.preview).not.toHaveBeenCalled();
});
it("separates pure retarget GET from current-authenticated confirmation POST", async () => {
  const noteId = ids[0]!;
  const preview = {
    actor: { accountId: noteId, authVersion: 1, browserEpoch: 1 },
    noteId,
    preview: { kind: "unavailable", reason: "changed" },
  };
  fake.retargetPreview.mockResolvedValueOnce(preview);
  expect(Reflect.get(previewDriveBackupRetargetFn, "method")).toBe("GET");
  expect(await previewDriveBackupRetargetFn({ data: { noteId } })).toEqual(
    preview,
  );
  expect(fake.contexts).toEqual([false]);
  expect(fake.retargetPreview).toHaveBeenCalledExactlyOnceWith(
    {},
    { sessionToken: "synthetic", browserToken: "synthetic" },
    { noteId },
  );
  expect(fake.retarget).not.toHaveBeenCalled();
  const data = {
    noteId,
    commandId: ids[1]!,
    expectedEpoch: 1,
    expectedSettingsVersion: 2,
    expectedHeadTargetId: ids[2]!,
    expectedHeadVersion: 3,
    expectedTargetVersion: 4,
    expectedDigest: "a".repeat(64),
  };
  fake.retarget.mockResolvedValueOnce({
    requestId: ids[3]!,
    jobId: ids[4]!,
    accepted: true,
  });
  expect(Reflect.get(retargetDriveBackupFn, "method")).toBe("POST");
  await retargetDriveBackupFn({ data });
  expect(fake.contexts).toEqual([false, true]);
  expect(fake.retarget).toHaveBeenCalledExactlyOnceWith(
    {},
    { sessionToken: "synthetic", browserToken: "synthetic" },
    data,
  );
});
it("rejects retarget preview commands before context and bounds its response to 64 KiB", async () => {
  await expect(
    previewDriveBackupRetargetFn({
      data: { noteId: ids[0]!, commandId: ids[1]! },
    } as Parameters<typeof previewDriveBackupRetargetFn>[0]),
  ).rejects.toBeDefined();
  expect(fake.contexts).toEqual([]);
  fake.retargetPreview.mockResolvedValueOnce({ oversized: "x".repeat(65536) });
  await expect(
    previewDriveBackupRetargetFn({ data: { noteId: ids[0]! } }),
  ).rejects.toBeDefined();
  expect(fake.retarget).not.toHaveBeenCalled();
});
it("rejects an incomplete retarget confirmation before authentication context or application work", async () => {
  await expect(
    retargetDriveBackupFn({
      data: {
        noteId: ids[0]!,
        commandId: ids[1]!,
        expectedEpoch: 1,
        expectedSettingsVersion: 2,
        expectedHeadTargetId: ids[2]!,
        expectedHeadVersion: 3,
        expectedDigest: "a".repeat(64),
      },
    } as Parameters<typeof retargetDriveBackupFn>[0]),
  ).rejects.toBeDefined();
  expect(fake.contexts).toEqual([]);
  expect(fake.retarget).not.toHaveBeenCalled();
});
