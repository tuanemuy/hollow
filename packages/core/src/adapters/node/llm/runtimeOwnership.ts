import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import { z } from "zod";

const recordSchema = z
  .object({
    pid: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    runtimeId: z.uuid(),
    predecessors: z.array(z.uuid()).max(64),
  })
  .strict();
type RecordValue = z.infer<typeof recordSchema>;
const unknown = () =>
  new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
const absent = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "ENOENT";
const dead = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "ESRCH";
  }
};
async function readRecord(file: string): Promise<RecordValue | null> {
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (absent(error)) return null;
    throw unknown();
  }
  try {
    const info = await handle.stat();
    if (
      !info.isFile() ||
      info.size > 16 * 1024 ||
      (info.mode & 0o777) !== 0o600
    )
      throw unknown();
    const value = recordSchema.safeParse(
      JSON.parse(await handle.readFile("utf8")),
    );
    if (
      !value.success ||
      new Set(value.data.predecessors).size !==
        value.data.predecessors.length ||
      value.data.predecessors.includes(value.data.runtimeId)
    )
      throw unknown();
    return value.data;
  } catch {
    throw unknown();
  } finally {
    await handle.close();
  }
}
async function syncDirectory(directory: string) {
  const handle = await open(
    directory,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}
async function persist(directory: string, file: string, value: RecordValue) {
  const temporary = path.join(directory, `${randomUUID()}.pending`);
  const handle = await open(temporary, "wx", 0o600);
  let renamed = false;
  try {
    await handle.writeFile(JSON.stringify(value));
    await handle.sync();
    await handle.close();
    await rename(temporary, file);
    renamed = true;
    await syncDirectory(directory);
  } finally {
    await handle.close();
    if (!renamed) await unlink(temporary).catch(() => {});
  }
}

export class NodeLlmRuntimeOwnership {
  private constructor(
    private readonly directory: string,
    private value: RecordValue,
  ) {}
  get runtimeId() {
    return this.value.runtimeId;
  }
  predecessors(): readonly string[] {
    return [...this.value.predecessors];
  }
  assertReady() {
    if (this.value.predecessors.length) throw unknown();
  }
  static async acquire(directory: string): Promise<NodeLlmRuntimeOwnership> {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const dir = await open(
      directory,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const info = await dir.stat();
      if (!info.isDirectory() || (info.mode & 0o777) !== 0o700) throw unknown();
    } finally {
      await dir.close();
    }
    const file = path.join(directory, "owner.json");
    const lock = path.join(directory, "recovery.lock");
    let recovery: Awaited<ReturnType<typeof open>>;
    try {
      recovery = await open(lock, "wx", 0o600);
    } catch {
      throw unknown();
    }
    try {
      const previous = await readRecord(file);
      if (previous && !dead(previous.pid)) throw unknown();
      const predecessors = previous
        ? [...previous.predecessors, previous.runtimeId]
        : [];
      if (predecessors.length > 64) throw unknown();
      const current = await readRecord(file);
      if (JSON.stringify(previous) !== JSON.stringify(current)) throw unknown();
      const value: RecordValue = {
        pid: process.pid,
        runtimeId: randomUUID(),
        predecessors,
      };
      await persist(directory, file, value);
      return new NodeLlmRuntimeOwnership(directory, value);
    } catch {
      throw unknown();
    } finally {
      await recovery.close();
      await unlink(lock);
      await syncDirectory(directory);
    }
  }
  async acknowledge(runtimeId: string): Promise<void> {
    if (!this.value.predecessors.includes(runtimeId)) return;
    const file = path.join(this.directory, "owner.json");
    const lock = path.join(this.directory, "recovery.lock");
    let recovery: Awaited<ReturnType<typeof open>>;
    try {
      recovery = await open(lock, "wx", 0o600);
    } catch {
      throw unknown();
    }
    try {
      const current = await readRecord(file);
      if (JSON.stringify(current) !== JSON.stringify(this.value))
        throw unknown();
      const value = {
        ...this.value,
        predecessors: this.value.predecessors.filter((id) => id !== runtimeId),
      };
      await persist(this.directory, file, value);
      this.value = value;
    } catch {
      throw unknown();
    } finally {
      await recovery.close();
      await unlink(lock);
      await syncDirectory(this.directory);
    }
  }
}
