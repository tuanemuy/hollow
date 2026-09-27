import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeLlmRuntimeOwnership } from "./runtimeOwnership";

const refused = {
  code: "LLM_OWNERSHIP_UNKNOWN",
  delivery: "not-sent",
  closed: false,
};
type ChildOwner = Readonly<{
  runtimeId: string;
  predecessors: readonly string[];
}>;
let directory: string;
const children: Array<{ finish(): Promise<void> }> = [];

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "hollow-llm-ownership-test-"));
  await chmod(directory, 0o700);
});
afterEach(async () => {
  const settled = await Promise.allSettled(
    children.map((child) => child.finish()),
  );
  try {
    expect(settled.every((result) => result.status === "fulfilled")).toBe(true);
  } finally {
    children.length = 0;
    await rm(directory, { recursive: true, force: true });
  }
});

async function childOwner(): Promise<ChildOwner> {
  const moduleUrl = new URL("./runtimeOwnership.ts", import.meta.url).href;
  const program = `
    import { NodeLlmRuntimeOwnership } from ${JSON.stringify(moduleUrl)};
    try {
      const owner = await NodeLlmRuntimeOwnership.acquire(process.argv[1]);
      process.on('message', () => process.disconnect());
      process.send({ runtimeId: owner.runtimeId, predecessors: owner.predecessors() });
    } catch {
      process.send({ failed: true });
      process.disconnect();
      process.exitCode = 1;
    }
  `;
  const child = spawn(
    process.execPath,
    [
      "--experimental-transform-types",
      "--input-type=module",
      "--eval",
      program,
      directory,
    ],
    {
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  const closed = new Promise<number | null>((resolve, reject) => {
    child.once("close", resolve);
    child.once("error", () => reject(new Error("self child could not start")));
  });
  void closed.catch(() => {});
  let finished: Promise<void> | undefined;
  const finish = () => {
    finished ??= (async () => {
      if (child.connected) child.send("exit");
      const fallback = setTimeout(() => child.kill("SIGTERM"), 3_000);
      try {
        const code = await closed;
        expect(code).toBe(0);
        const pid = child.pid;
        if (pid === undefined) throw new Error("self child PID unavailable");
        expect(() => process.kill(pid, 0)).toThrow(
          expect.objectContaining({ code: "ESRCH" }),
        );
      } finally {
        clearTimeout(fallback);
      }
    })();
    return finished;
  };
  children.push({ finish });
  const ready = new Promise<ChildOwner>((resolve, reject) => {
    child.once("message", (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "runtimeId" in message &&
        typeof message.runtimeId === "string" &&
        "predecessors" in message &&
        Array.isArray(message.predecessors) &&
        message.predecessors.every((id: unknown) => typeof id === "string")
      )
        resolve({
          runtimeId: message.runtimeId,
          predecessors: message.predecessors,
        });
      else reject(new Error("self child ownership failed"));
    });
    void closed.then(
      () => reject(new Error("self child ended before ready")),
      reject,
    );
  });
  return ready;
}

async function endLastChild() {
  const child = children.at(-1);
  if (!child) throw new Error("self child unavailable");
  await child.finish();
}

describe("NodeLlmRuntimeOwnership", () => {
  it("creates a private record and refuses another acquire while the recorded process is live", async () => {
    const owner = await NodeLlmRuntimeOwnership.acquire(directory);
    expect((await stat(directory)).mode & 0o777).toBe(0o700);
    expect((await stat(path.join(directory, "owner.json"))).mode & 0o777).toBe(
      0o600,
    );
    expect(owner.predecessors()).toEqual([]);
    expect(() => owner.assertReady()).not.toThrow();
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
  });

  it("keeps every unacknowledged predecessor across two normal child exits, then acknowledges idempotently", async () => {
    const first = await childOwner();
    expect(first.predecessors).toEqual([]);
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
    await endLastChild();
    const second = await childOwner();
    expect(second.predecessors).toEqual([first.runtimeId]);
    await endLastChild();
    const current = await NodeLlmRuntimeOwnership.acquire(directory);
    expect(current.predecessors()).toEqual([first.runtimeId, second.runtimeId]);
    expect(() => current.assertReady()).toThrow(
      expect.objectContaining(refused),
    );
    await current.acknowledge(first.runtimeId);
    expect(current.predecessors()).toEqual([second.runtimeId]);
    expect(() => current.assertReady()).toThrow(
      expect.objectContaining(refused),
    );
    const saved = await readFile(path.join(directory, "owner.json"), "utf8");
    await current.acknowledge(first.runtimeId);
    expect(await readFile(path.join(directory, "owner.json"), "utf8")).toBe(
      saved,
    );
    await current.acknowledge(second.runtimeId);
    expect(current.predecessors()).toEqual([]);
    expect(() => current.assertReady()).not.toThrow();
  });

  it("rejects a recovery lock without taking or deleting that lock", async () => {
    const lock = path.join(directory, "recovery.lock");
    await writeFile(lock, "self lock", { mode: 0o600 });
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
    expect(await readFile(lock, "utf8")).toBe("self lock");
  });

  it("does not acknowledge after the persisted record differs from the acquired record", async () => {
    const previous = await childOwner();
    await endLastChild();
    const current = await NodeLlmRuntimeOwnership.acquire(directory);
    const file = path.join(directory, "owner.json");
    const changed = JSON.stringify({
      pid: process.pid,
      runtimeId: randomUUID(),
      predecessors: [previous.runtimeId],
    });
    await writeFile(file, changed, { mode: 0o600 });
    await expect(current.acknowledge(previous.runtimeId)).rejects.toMatchObject(
      refused,
    );
    expect(current.predecessors()).toEqual([previous.runtimeId]);
    expect(await readFile(file, "utf8")).toBe(changed);
  });

  it("rejects nonprivate directory permissions", async () => {
    await chmod(directory, 0o755);
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
  });

  it("rejects nonprivate record permissions", async () => {
    await NodeLlmRuntimeOwnership.acquire(directory);
    await chmod(path.join(directory, "owner.json"), 0o644);
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
  });

  it("rejects a symlink record without following it", async () => {
    const target = path.join(directory, "synthetic-record");
    await writeFile(target, "{}", { mode: 0o600 });
    await symlink(target, path.join(directory, "owner.json"));
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
    expect(await readFile(target, "utf8")).toBe("{}");
  });

  it.each([
    "{",
    "{}",
    "x".repeat(16 * 1024 + 1),
  ])("rejects malformed or oversized records (%#)", async (value) => {
    await writeFile(path.join(directory, "owner.json"), value, { mode: 0o600 });
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
  });
});
