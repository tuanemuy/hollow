import { constants } from "node:fs";
import { open } from "node:fs/promises";
import type { Database } from "@repo/core/adapters/libsql/client";
import type { ZipCapacity } from "@repo/core/application/zip/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import { sql } from "drizzle-orm";
import { z } from "zod";

const bytes = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const timer = bytes.max(2_147_483_647);
const schema = z.strictObject({
  version: z.literal(1),
  capacity: z.strictObject({
    diskBytes: bytes,
    protectedDiskBytes: bytes,
    totalMs: timer,
    childMs: timer,
    assemblyMs: timer,
    deliveryMs: timer,
    leaseMs: timer,
    cleanupMs: timer,
  }),
});
const invalid = () =>
  new BusinessRuleError(
    "ZIP_CONFIGURATION_INVALID",
    "ZIP配備設定を確認してください。",
  );

export async function readNodeZipConfiguration(
  filename: string | undefined,
  existingPoolBytes: number,
): Promise<ZipCapacity | null> {
  if (!filename) return null;
  if (!Number.isSafeInteger(existingPoolBytes) || existingPoolBytes < 1)
    throw invalid();
  try {
    const file = await open(
      filename,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const before = await file.stat();
      if (!before.isFile() || before.size > 16384) throw invalid();
      const buffer = Buffer.alloc(16385);
      const read = await file.read(buffer, 0, buffer.length, 0);
      const after = await file.stat();
      if (
        read.bytesRead !== before.size ||
        after.size !== before.size ||
        after.mtimeMs !== before.mtimeMs
      )
        throw invalid();
      const parsed = schema.safeParse(
        JSON.parse(buffer.subarray(0, read.bytesRead).toString("utf8")),
      );
      if (
        !parsed.success ||
        parsed.data.capacity.protectedDiskBytes <
          Math.max(6 * 1024 ** 3, existingPoolBytes)
      )
        throw invalid();
      return parsed.data.capacity;
    } finally {
      await file.close();
    }
  } catch {
    throw invalid();
  }
}

/** This read must precede storage construction, which can recover old owners. */
export async function assertZipBootConfiguration(
  db: Database,
  configured: boolean,
) {
  if (configured) return;
  const rows = await db.all(sql`select 1 where
    exists(select 1 from zip_requests where state!='terminal') or
    exists(select 1 from zip_runs where state in('queued','running','assembling','stopping')) or
    exists(select 1 from zip_deliveries where state!='closed') or
    exists(select 1 from zip_spools where state!='removed' or storage_key is not null or reserved_bytes!=0) or
    exists(select 1 from zip_assemblies where state!='closed' or storage_key is not null or reserved_bytes!=0) or
    exists(select 1 from zip_artifacts where state!='removed' or storage_key is not null or reserved_bytes!=0) or
    exists(select 1 from zip_spool_refs) or
    exists(select 1 from object_writes where active=1 and kind in('zip-spool','zip-assembly','zip-delivery'))`);
  if (rows.length)
    throw new BusinessRuleError(
      "ZIP_CONFIGURATION_REQUIRED",
      "残存ZIP資源を安全に回収するためZIP設定を復元して再起動してください。",
    );
}
