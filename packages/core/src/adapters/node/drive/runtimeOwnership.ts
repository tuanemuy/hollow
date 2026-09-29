import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  type FileHandle,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { DrivePredecessorProof } from "@repo/core/application/integration/drive/ports";
import { z } from "zod";
import { type DrivePredecessorStore, DriveTransportError } from "./execution";

const schema = z
  .object({
    version: z.literal(1),
    runtimeGeneration: z.uuid(),
    pid: z.number().int().positive().safe(),
    predecessors: z.array(z.uuid()).max(64),
    databaseBinding: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
type RecordValue = z.infer<typeof schema>;
const fail = () => new DriveTransportError();
async function releaseLock(
  handle: FileHandle,
  path: string,
  identity: { dev: bigint; ino: bigint } | undefined,
) {
  await handle.close();
  const stat = await lstat(path, { bigint: true });
  if (!identity || stat.dev !== identity.dev || stat.ino !== identity.ino)
    throw fail();
  await unlink(path);
}
function absent(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
async function readRecord(path: string) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    const byPath = await lstat(path, { bigint: true });
    if (
      !before.isFile() ||
      before.uid !== BigInt(process.getuid!()) ||
      (before.mode & 0o7777n) !== 0o600n ||
      before.size > 16_384n ||
      before.ino !== byPath.ino ||
      before.dev !== byPath.dev
    )
      throw fail();
    const buffer = Buffer.alloc(16_385);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(path, { bigint: true });
    if (
      BigInt(bytesRead) !== before.size ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
      pathAfter.ino !== before.ino ||
      pathAfter.dev !== before.dev ||
      pathAfter.ctimeNs !== before.ctimeNs
    )
      throw fail();
    const parsed = schema.parse(
      JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          buffer.subarray(0, bytesRead),
        ),
      ),
    );
    if (new Set(parsed.predecessors).size !== parsed.predecessors.length)
      throw fail();
    return parsed;
  } finally {
    await handle.close();
  }
}

export type NodeDriveRuntimeOwnership = DrivePredecessorStore &
  Readonly<{ runtimeGeneration: string }>;
export async function acquireDriveRuntime(
  directory: string,
  canonicalDatabasePath: string,
): Promise<NodeDriveRuntimeOwnership> {
  if (
    !isAbsolute(directory) ||
    !isAbsolute(canonicalDatabasePath) ||
    !process.getuid
  )
    throw fail();
  const binding = createHash("sha256")
    .update(canonicalDatabasePath)
    .digest("hex");
  let lock: Awaited<ReturnType<typeof open>> | undefined;
  let lockIdentity: { dev: bigint; ino: bigint } | undefined;
  try {
    await mkdir(directory, { mode: 0o700 }).catch((e: unknown) => {
      if (!(typeof e === "object" && e && "code" in e && e.code === "EEXIST"))
        throw e;
    });
    const stat = await lstat(directory, { bigint: true });
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      stat.uid !== BigInt(process.getuid()) ||
      (stat.mode & 0o7777n) !== 0o700n ||
      (await realpath(directory)) !== directory
    )
      throw fail();
    const lockPath = join(directory, "recovery.lock");
    lock = await open(
      lockPath,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    lockIdentity = await lock.stat({ bigint: true });
    const recordPath = join(directory, "owner.json");
    let previous: RecordValue | null;
    try {
      previous = await readRecord(recordPath);
    } catch (e) {
      if (absent(e)) previous = null;
      else throw e;
    }
    if (previous) {
      if (
        previous.databaseBinding !== binding ||
        previous.predecessors.length >= 64
      )
        throw fail();
      let dead = false;
      try {
        process.kill(previous.pid, 0);
      } catch (e) {
        dead =
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          e.code === "ESRCH";
      }
      if (
        !dead ||
        JSON.stringify(await readRecord(recordPath)) !==
          JSON.stringify(previous)
      )
        throw fail();
    }
    let record: RecordValue = {
      version: 1,
      runtimeGeneration: randomUUID(),
      pid: process.pid,
      predecessors: [
        ...new Set([
          ...(previous?.predecessors ?? []),
          ...(previous ? [previous.runtimeGeneration] : []),
        ]),
      ],
      databaseBinding: binding,
    };
    const persist = async (value: RecordValue) => {
      const dirBefore = await lstat(directory, { bigint: true });
      if (
        dirBefore.dev !== stat.dev ||
        dirBefore.ino !== stat.ino ||
        dirBefore.uid !== stat.uid ||
        dirBefore.mode !== stat.mode
      )
        throw fail();
      const data = JSON.stringify(value);
      if (Buffer.byteLength(data) > 16_384) throw fail();
      const temp = join(directory, `owner-${randomUUID()}.tmp`);
      const file = await open(
        temp,
        constants.O_CREAT |
          constants.O_EXCL |
          constants.O_WRONLY |
          constants.O_NOFOLLOW,
        0o600,
      );
      try {
        await file.writeFile(data);
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temp, recordPath);
      const dir = await open(
        directory,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        await dir.sync();
      } finally {
        await dir.close();
      }
    };
    await persist(record);
    const proofs = new Map(
      record.predecessors.map((runtimeGeneration) => [
        runtimeGeneration,
        { runtimeGeneration, evidenceId: randomUUID() },
      ]),
    );
    return {
      runtimeGeneration: record.runtimeGeneration,
      list: () => [...proofs.values()],
      async acknowledge(proof: DrivePredecessorProof) {
        try {
          const current = proofs.get(proof.runtimeGeneration);
          if (!current) return;
          if (
            current.evidenceId !== proof.evidenceId ||
            JSON.stringify(await readRecord(recordPath)) !==
              JSON.stringify(record)
          )
            throw fail();
          const next = {
            ...record,
            predecessors: record.predecessors.filter(
              (g) => g !== proof.runtimeGeneration,
            ),
          };
          await persist(next);
          record = next;
          proofs.delete(proof.runtimeGeneration);
        } catch {
          throw fail();
        }
      },
    };
  } catch {
    throw fail();
  } finally {
    if (lock) {
      await releaseLock(
        lock,
        join(directory, "recovery.lock"),
        lockIdentity,
      ).catch(() => {
        throw fail();
      });
    }
  }
}
