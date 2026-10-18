import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readNodeZipConfiguration } from "./config";

const GiB = 1024 ** 3;
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "hollow-zip-config-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
const file = async (protectedDiskBytes: number) => {
  const filename = path.join(directory, `zip-${protectedDiskBytes}.json`);
  await writeFile(
    filename,
    JSON.stringify({
      version: 1,
      capacity: {
        diskBytes: GiB,
        protectedDiskBytes,
        totalMs: 1_800_000,
        childMs: 120_000,
        assemblyMs: 120_000,
        deliveryMs: 600_000,
        leaseMs: 60_000,
        cleanupMs: 30_000,
      },
    }),
  );
  return filename;
};

describe("ZIP protected disk floor", () => {
  it("accepts 6 GiB when the single-export pool is the default 2 GiB", async () => {
    await expect(
      readNodeZipConfiguration(await file(6 * GiB), 2 * GiB),
    ).resolves.toMatchObject({ protectedDiskBytes: 6 * GiB });
  });

  it("rejects less than 6 GiB even with a small export pool", async () => {
    await expect(
      readNodeZipConfiguration(await file(6 * GiB - 1), 2 * GiB),
    ).rejects.toMatchObject({ code: "ZIP_CONFIGURATION_INVALID" });
  });

  it("follows a single-export pool larger than 6 GiB", async () => {
    await expect(
      readNodeZipConfiguration(await file(7 * GiB - 1), 7 * GiB),
    ).rejects.toMatchObject({ code: "ZIP_CONFIGURATION_INVALID" });
    await expect(
      readNodeZipConfiguration(await file(7 * GiB), 7 * GiB),
    ).resolves.toMatchObject({ protectedDiskBytes: 7 * GiB });
  });

  it("is unconfigured without a file", async () => {
    await expect(readNodeZipConfiguration(undefined, 2 * GiB)).resolves.toBe(
      null,
    );
  });
});
