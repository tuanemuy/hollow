import type { FileHandle } from "node:fs/promises";
import * as fs from "node:fs/promises";
import path from "node:path";
import {
  isObjectReadCloseUnprovenError,
  ObjectReadCloseUnprovenError,
} from "@repo/core/application/ports/objectStorage";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FileObjectStorage } from "../objectStorage";

vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof import("node:fs/promises")>();
  return { ...fs, open: vi.fn(fs.open) };
});

afterEach(() => vi.restoreAllMocks());

describe("FileObjectStorage random-read closure contracts", () => {
  it.each([
    "stat",
    "abort",
  ] as const)("retains an unproven close after open-time %s failure", async (failure) => {
    const controller = new AbortController();
    const file = {
      stat: vi.fn(async () => {
        if (failure === "stat") throw new Error("fixture failure");
        controller.abort();
        return { isFile: () => true, size: 1 };
      }),
      close: vi.fn(async () => {
        throw new Error("fixture failure");
      }),
    };
    vi.mocked(fs.open).mockResolvedValueOnce(file as unknown as FileHandle);
    const result = new FileObjectStorage(
      "/unused-fixture-root",
    ).openOwnedRandomRead("source", controller.signal);
    await expect(result).rejects.toBeInstanceOf(ObjectReadCloseUnprovenError);
    expect(file.close).toHaveBeenCalledTimes(1);
  });

  it("rejects both close and closed without an unhandled secondary rejection", async () => {
    const file = {
      stat: vi.fn(async () => ({ isFile: () => true, size: 1 })),
      close: vi.fn(async () => {
        throw new Error("fixture failure");
      }),
    };
    vi.mocked(fs.open).mockResolvedValueOnce(file as unknown as FileHandle);
    const source = await new FileObjectStorage(
      "/unused-fixture-root",
    ).openOwnedRandomRead("source");
    const close = source.close();
    await expect(close).rejects.toBeInstanceOf(ObjectReadCloseUnprovenError);
    await expect(source.closed).rejects.toBeInstanceOf(
      ObjectReadCloseUnprovenError,
    );
    await expect(source.close()).rejects.toBeInstanceOf(
      ObjectReadCloseUnprovenError,
    );
    expect(file.close).toHaveBeenCalledTimes(1);
    expect(isObjectReadCloseUnprovenError(new Error("unproven"))).toBe(false);
  });

  it("waits for an outstanding read before closing the FD and refuses a simultaneous read", async () => {
    let completeStat!: () => void;
    const heldStat = new Promise<void>((resolve) => {
      completeStat = resolve;
    });
    const info = { isFile: () => true, size: 1 };
    const stat = vi.fn(async () => info);
    const file = { stat, close: vi.fn(async () => {}), read: vi.fn() };
    vi.mocked(fs.open).mockResolvedValueOnce(file as unknown as FileHandle);
    const source = await new FileObjectStorage(
      "/unused-fixture-root",
    ).openOwnedRandomRead("source");
    stat.mockImplementationOnce(async () => {
      await heldStat;
      return info;
    });
    const read = source.readAt(0, 1);
    await expect(source.readAt(0, 1)).rejects.toMatchObject({
      code: "OBJECT_READ_INVALID",
    });
    const close = source.close();
    await Promise.resolve();
    expect(file.close).not.toHaveBeenCalled();
    completeStat();
    await expect(read).rejects.toMatchObject({ code: "OBJECT_READ_INVALID" });
    await close;
    await source.closed;
    expect(file.read).not.toHaveBeenCalled();
    expect(file.close).toHaveBeenCalledTimes(1);
  });

  it("rejects a short positional read", async () => {
    const file = {
      stat: vi.fn(async () => ({ isFile: () => true, size: 2 })),
      read: vi.fn(async () => ({ bytesRead: 1 })),
      close: vi.fn(async () => {}),
    };
    vi.mocked(fs.open).mockResolvedValueOnce(file as unknown as FileHandle);
    const source = await new FileObjectStorage(
      "/unused-fixture-root",
    ).openOwnedRandomRead("source");
    await expect(source.readAt(0, 2)).rejects.toMatchObject({
      code: "OBJECT_READ_INVALID",
    });
    await source.close();
  });
});

const fixtureRoot = process.env.HOLLOW_DRIVE_BACKUP_SOURCE_TEST_ROOT;

describe.skipIf(!fixtureRoot)(
  "FileObjectStorage native random read (dedicated root)",
  () => {
    let root: string;
    let storage: FileObjectStorage;
    beforeAll(async () => {
      if (!fixtureRoot || !path.isAbsolute(fixtureRoot))
        throw new Error("Dedicated fixture root is required");
      const info = await fs.lstat(fixtureRoot);
      if (
        !info.isDirectory() ||
        info.isSymbolicLink() ||
        (info.mode & 0o777) !== 0o700 ||
        info.uid !== process.getuid?.()
      )
        throw new Error("Dedicated fixture root is invalid");
      root = path.join(fixtureRoot, "random-read-native");
      await fs.mkdir(root, { mode: 0o700 });
      storage = new FileObjectStorage(root);
    });

    async function write(key: string) {
      const bytes = Buffer.alloc(1024, 37);
      await fs.writeFile(path.join(root, key), bytes, {
        flag: "wx",
        mode: 0o600,
      });
      return bytes;
    }

    it("uses the initially opened file despite pathname replacement and has no EOF autoclose", async () => {
      const bytes = await write("identity");
      const source = await storage.openOwnedRandomRead("identity");
      try {
        await fs.rename(
          path.join(root, "identity"),
          path.join(root, "identity-retained"),
        );
        await fs.writeFile(path.join(root, "identity"), Buffer.alloc(1024, 0), {
          flag: "wx",
          mode: 0o600,
        });
        expect(await source.readAt(1000, 24)).toEqual(bytes.subarray(1000));
        expect(await source.readAt(0, 1)).toEqual(bytes.subarray(0, 1));
      } finally {
        await source.close();
      }
      await expect(source.closed).resolves.toBeUndefined();
      await expect(source.readAt(0, 1)).rejects.toMatchObject({
        code: "OBJECT_ABORTED",
      });
    });

    it("rejects unsafe bounds and detects changed file length", async () => {
      await write("bounds");
      const source = await storage.openOwnedRandomRead("bounds");
      try {
        for (const [offset, length] of [
          [-1, 1],
          [0, 0],
          [0, 65537],
          [1024, 1],
          [0.5, 1],
        ] as const)
          await expect(source.readAt(offset, length)).rejects.toMatchObject({
            code: "OBJECT_READ_INVALID",
          });
        await fs.truncate(path.join(root, "bounds"), 1);
        await expect(source.readAt(0, 1)).rejects.toMatchObject({
          code: "OBJECT_READ_INVALID",
        });
      } finally {
        await source.close();
      }
    });

    it("closes after abort and rejects symlink sources", async () => {
      await write("abort");
      const controller = new AbortController();
      const source = await storage.openOwnedRandomRead(
        "abort",
        controller.signal,
      );
      controller.abort();
      await expect(source.closed).resolves.toBeUndefined();
      await expect(source.readAt(0, 1)).rejects.toMatchObject({
        code: "OBJECT_ABORTED",
      });
      await fs.symlink("abort", path.join(root, "symbolic"));
      await expect(
        storage.openOwnedRandomRead("symbolic"),
      ).rejects.toMatchObject({ code: "OBJECT_READ_UNAVAILABLE" });
    });

    it("preserves the existing owned stream and its EOF closure", async () => {
      const bytes = await write("stream");
      const source = await storage.openOwnedRead("stream");
      const reader = source.body.getReader();
      try {
        expect((await reader.read()).value).toEqual(bytes);
        expect((await reader.read()).done).toBe(true);
        await expect(source.closed).resolves.toBeUndefined();
      } finally {
        reader.releaseLock();
        await source.close();
      }
    });
  },
);
