import { createHash } from "node:crypto";
import {
  isObjectReadCloseUnprovenError,
  ObjectReadCloseUnprovenError,
  type OwnedObjectRandomRead,
} from "@repo/core/application/ports/objectStorage";
import { describe, expect, it, vi } from "vitest";
import { NodeDriveBackupSource } from "./backupSource";

const BLOCK = 1024 * 1024;
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

function fixture(length = 1024) {
  const data = Buffer.alloc(length, 37);
  let ended = false;
  let resolveClosed!: () => void;
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  const readAt = vi.fn(async (offset: number, size: number) => {
    if (ended) throw new Error("closed");
    return Uint8Array.from(data.subarray(offset, offset + size));
  });
  const close = vi.fn(async () => {
    ended = true;
    resolveClosed();
  });
  const raw: OwnedObjectRandomRead = { bytes: length, readAt, closed, close };
  const openOwnedRandomRead = vi.fn(async () => raw);
  const adapter = new NodeDriveBackupSource({ openOwnedRandomRead });
  const controller = new AbortController();
  const identity = {
    storageKey: "source",
    bytes: length,
    sha256: digest(data),
  };
  return {
    data,
    raw,
    readAt,
    close,
    openOwnedRandomRead,
    adapter,
    controller,
    identity,
  };
}

describe("NodeDriveBackupSource", () => {
  it("requires the owned random-read capability without fallback", () => {
    expect(() => new NodeDriveBackupSource({})).toThrowError(
      expect.objectContaining({ code: "DRIVE_BACKUP_SOURCE_UNAVAILABLE" }),
    );
  });

  it("prepares once, uses bounded reads, and preserves the same open handle for a nonaligned range", async () => {
    const f = fixture(BLOCK + 17);
    const source = await f.adapter.open(f.identity, f.controller.signal);
    await expect(source.readRange(0, 1)).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_INVALID",
    });
    await source.prepare();
    const prepareCalls = f.readAt.mock.calls.length;
    await source.prepare();
    expect(f.readAt.mock.calls.length).toBe(prepareCalls);
    f.readAt.mockClear();
    const range = await source.readRange(17, BLOCK);
    expect(range).toEqual(f.data.subarray(17));
    expect(f.readAt.mock.calls[0]).toEqual([0, 65536]);
    expect(f.readAt.mock.calls.at(-1)).toEqual([BLOCK, 17]);
    expect(
      f.readAt.mock.calls.every(([, size]) => size >= 1 && size <= 65536),
    ).toBe(true);
    expect(f.openOwnedRandomRead).toHaveBeenCalledTimes(1);
    expect(f.close).not.toHaveBeenCalled();
    f.data.fill(0);
    expect(range.every((value) => value === 37)).toBe(true);
    await source.close();
    await expect(source.closed).resolves.toBeUndefined();
  });

  it.each([
    "bytes",
    "sha256",
  ] as const)("rejects a mismatched original %s before a range can be returned", async (field) => {
    const f = fixture();
    const identity = {
      ...f.identity,
      [field]: field === "bytes" ? 1025 : "0".repeat(64),
    };
    const source = await f.adapter.open(identity, f.controller.signal);
    await expect(source.prepare()).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_CHANGED",
    });
    await expect(source.readRange(0, 1)).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_INVALID",
    });
    expect(f.close).not.toHaveBeenCalled();
    await source.close();
  });

  it("rehashes the whole covering block and refuses a changed second block without invalidating already returned bytes", async () => {
    const f = fixture(BLOCK + 17);
    const source = await f.adapter.open(f.identity, f.controller.signal);
    await source.prepare();
    const sent = await source.readRange(0, 256 * 1024);
    f.data[BLOCK + 16] = 0;
    await expect(source.readRange(BLOCK - 1, 2)).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_CHANGED",
    });
    expect(sent.byteLength).toBe(256 * 1024);
    expect(sent.every((value) => value === 37)).toBe(true);
    await expect(source.readRange(0, 1)).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_INVALID",
    });
    await source.close();
  });

  it.each([
    [0, 0],
    [-1, 1],
    [0.5, 1],
    [0, BLOCK + 1],
    [1024, 1],
  ])("rejects invalid range %s/%s before storage reads", async (offset, length) => {
    const f = fixture();
    const source = await f.adapter.open(f.identity, f.controller.signal);
    await source.prepare();
    f.readAt.mockClear();
    await expect(source.readRange(offset, length)).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_INVALID",
    });
    expect(f.readAt).not.toHaveBeenCalled();
    await source.close();
  });

  it("rejects simultaneous prepare and range reads", async () => {
    const f = fixture();
    const source = await f.adapter.open(f.identity, f.controller.signal);
    const preparing = source.prepare();
    await expect(source.prepare()).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_INVALID",
    });
    await preparing;
    const first = source.readRange(0, 1);
    await expect(source.readRange(0, 1)).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_INVALID",
    });
    await first;
    await source.close();
  });

  it("rejects short reads and abort without returning a partial range", async () => {
    const f = fixture();
    const source = await f.adapter.open(f.identity, f.controller.signal);
    await source.prepare();
    f.readAt.mockResolvedValueOnce(new Uint8Array(1));
    await expect(source.readRange(0, 1)).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_CHANGED",
    });
    await source.close();
    const aborted = fixture();
    aborted.controller.abort();
    await expect(
      aborted.adapter.open(aborted.identity, aborted.controller.signal),
    ).rejects.toMatchObject({ code: "DRIVE_BACKUP_SOURCE_UNAVAILABLE" });
    expect(aborted.openOwnedRandomRead).not.toHaveBeenCalled();
  });

  it("retains close rejection and its independent closure proof", async () => {
    const f = fixture();
    const error = new ObjectReadCloseUnprovenError();
    let rejectClosed!: (error: unknown) => void;
    const closed = new Promise<void>((_, reject) => {
      rejectClosed = reject;
    });
    void closed.catch(() => {});
    const adapter = new NodeDriveBackupSource({
      openOwnedRandomRead: async () => ({
        ...f.raw,
        closed,
        async close() {
          rejectClosed(error);
          throw error;
        },
      }),
    });
    const source = await adapter.open(f.identity, f.controller.signal);
    await source.prepare();
    await expect(source.close()).rejects.toBe(error);
    await expect(source.closed).rejects.toBe(error);
    expect(isObjectReadCloseUnprovenError(error)).toBe(true);
    expect(isObjectReadCloseUnprovenError({ name: error.name })).toBe(false);
    await expect(source.readRange(0, 1)).rejects.toMatchObject({
      code: "DRIVE_BACKUP_SOURCE_UNAVAILABLE",
    });
  });

  it("does not flatten an open-time unproven close into an ordinary failure", async () => {
    const f = fixture();
    const error = new ObjectReadCloseUnprovenError();
    const adapter = new NodeDriveBackupSource({
      openOwnedRandomRead: async () => {
        throw error;
      },
    });
    await expect(adapter.open(f.identity, f.controller.signal)).rejects.toBe(
      error,
    );
  });
});
