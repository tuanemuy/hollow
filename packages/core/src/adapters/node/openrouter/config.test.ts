import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConflictError } from "@repo/core/application/errors";
import {
  OpenRouterProviderError,
  type OpenRouterSecretBinding,
  type OpenRouterServices,
} from "@repo/core/application/integration/openRouter/ports";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readNodeOpenRouter } from "./config";
import { NodeOpenRouterExecution } from "./execution";
import { NodeOpenRouterSecretProtector } from "./secretProtector";

const clock = { now: () => new Date("2026-09-28T00:00:00Z") };
const attemptBinding = {
  accountId: "synthetic-account",
  attemptId: "synthetic-attempt",
  browser: { hash: "synthetic-browser", epoch: 1 },
};
const bindings: readonly OpenRouterSecretBinding[] = [
  { ...attemptBinding, purpose: "verifier" },
  { ...attemptBinding, purpose: "candidate" },
  { purpose: "credential", accountId: "synthetic-account", epoch: 1 },
];
const plaintext = "synthetic-protected-value";
function safe(work: () => unknown) {
  try {
    work();
    return "accepted";
  } catch (error) {
    return error instanceof ConflictError ? error.code : "unexpected-error";
  }
}
async function outcome(promise: Promise<unknown>) {
  try {
    await promise;
    return "accepted";
  } catch (error) {
    return error instanceof ConflictError ||
      error instanceof OpenRouterProviderError
      ? error.code
      : "unexpected-error";
  }
}
function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe("OpenRouter private configuration and purpose-bound protection", () => {
  let root: string;
  let keyFile: string;
  let configFile: string;
  const services: OpenRouterServices[] = [];
  const config = (extra: Readonly<Record<string, unknown>> = {}) =>
    JSON.stringify({ keyFile, ...extra });

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "hollow-openrouter-config-test-"));
    await chmod(root, 0o700);
    keyFile = join(root, "synthetic-key");
    configFile = join(root, "config.json");
    await writeFile(keyFile, Buffer.alloc(32, 37), { mode: 0o600 });
    await writeFile(configFile, config(), { mode: 0o600 });
  });
  afterEach(async () => {
    try {
      await Promise.all(
        services.splice(0).map((service) => service.execution.stop()),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  async function available(file = configFile) {
    const value = await readNodeOpenRouter(
      file,
      "https://hollow.example.test",
      clock,
    );
    if (value) services.push(value);
    return Boolean(value?.protector.available());
  }

  it("loads a private exact 16 KiB configuration and shares provider identity only inside its services", async () => {
    await writeFile(configFile, config().padEnd(16 * 1024, " "));
    const value = await readNodeOpenRouter(
      configFile,
      "https://hollow.example.test",
      clock,
    );
    if (value) services.push(value);
    expect(Boolean(value?.protector.available())).toBe(true);
    expect(Object.is(value?.authorization, value?.catalog)).toBe(true);
  });
  it("rejects one byte beyond the config budget", async () => {
    await writeFile(configFile, config().padEnd(16 * 1024 + 1, " "));
    expect(await available()).toBe(false);
  });
  it("leaves absent, relative and missing configuration unavailable", async () => {
    expect(
      Boolean(
        await readNodeOpenRouter(
          undefined,
          "https://hollow.example.test",
          clock,
        ),
      ),
    ).toBe(false);
    expect(await available("relative-config.json")).toBe(false);
    expect(await available(join(root, "missing"))).toBe(false);
  });
  it.each([
    "unknown",
    "empty-key",
    "json",
    "utf8",
  ] as const)("rejects %s config without exposing its values", async (kind) => {
    await writeFile(
      configFile,
      kind === "unknown"
        ? config({ extra: true })
        : kind === "empty-key"
          ? config({ keyFile: "" })
          : kind === "json"
            ? "{"
            : Buffer.from([0xff]),
    );
    expect(await available()).toBe(false);
  });
  it.each([
    "config",
    "key",
    "parent",
  ] as const)("rejects broad %s permissions", async (target) => {
    await chmod(
      target === "config" ? configFile : target === "key" ? keyFile : root,
      target === "parent" ? 0o755 : 0o644,
    );
    expect(await available()).toBe(false);
  });
  it.each([
    "config",
    "key",
    "parent",
  ] as const)("rejects a symbolic %s", async (target) => {
    const alias = join(root, "alias");
    if (target === "config") {
      await symlink(configFile, alias);
      expect(await available(alias)).toBe(false);
    } else if (target === "key") {
      await symlink(keyFile, alias);
      await writeFile(configFile, config({ keyFile: alias }));
      expect(await available()).toBe(false);
      expect(
        (await NodeOpenRouterSecretProtector.load(alias)).available(),
      ).toBe(false);
    } else {
      const privateDir = join(root, "private");
      await mkdir(privateDir, { mode: 0o700 });
      await writeFile(join(privateDir, "config"), config(), { mode: 0o600 });
      await writeFile(join(privateDir, "key"), Buffer.alloc(32, 41), {
        mode: 0o600,
      });
      await symlink(privateDir, alias);
      expect(await available(join(alias, "config"))).toBe(false);
      expect(
        (
          await NodeOpenRouterSecretProtector.load(join(alias, "key"))
        ).available(),
      ).toBe(false);
    }
  });
  it.each([31, 33])("rejects a %i byte key", async (bytes) => {
    await writeFile(keyFile, Buffer.alloc(bytes, 37));
    expect(await available()).toBe(false);
    expect(
      (await NodeOpenRouterSecretProtector.load(keyFile)).available(),
    ).toBe(false);
  });
  it.each(
    bindings,
  )("roundtrips purpose $purpose without exposing plaintext", async (binding) => {
    const protector = await NodeOpenRouterSecretProtector.load(keyFile);
    const first = protector.protect(plaintext, binding);
    const second = protector.protect(plaintext, binding);
    expect(
      protector.reveal(first, binding) === plaintext &&
        protector.reveal(second, binding) === plaintext,
    ).toBe(true);
    expect(
      first !== second &&
        !first.includes(plaintext) &&
        !second.includes(plaintext),
    ).toBe(true);
  });
  it.each([
    "verifier",
    "candidate",
  ] as const)("binds %s to its account, attempt, browser and epoch", async (purpose) => {
    const protector = await NodeOpenRouterSecretProtector.load(keyFile);
    const binding: OpenRouterSecretBinding = { ...attemptBinding, purpose };
    const envelope = protector.protect(plaintext, binding);
    const changed: readonly OpenRouterSecretBinding[] = [
      { ...binding, accountId: "other-account" },
      { ...binding, attemptId: "other-attempt" },
      { ...binding, browser: { ...binding.browser, hash: "other-browser" } },
      { ...binding, browser: { ...binding.browser, epoch: 2 } },
    ];
    for (const value of changed)
      expect(safe(() => protector.reveal(envelope, value))).toBe(
        "OPENROUTER_KEY_UNAVAILABLE",
      );
  });
  it("separates all three purposes and binds a credential to account and connection epoch", async () => {
    const protector = await NodeOpenRouterSecretProtector.load(keyFile);
    for (const source of bindings) {
      const envelope = protector.protect(plaintext, source);
      for (const target of bindings)
        if (target.purpose !== source.purpose)
          expect(safe(() => protector.reveal(envelope, target))).toBe(
            "OPENROUTER_KEY_UNAVAILABLE",
          );
    }
    const binding: OpenRouterSecretBinding = {
      purpose: "credential",
      accountId: "synthetic-account",
      epoch: 1,
    };
    const envelope = protector.protect(plaintext, binding);
    expect(
      safe(() =>
        protector.reveal(envelope, { ...binding, accountId: "other-account" }),
      ),
    ).toBe("OPENROUTER_KEY_UNAVAILABLE");
    expect(
      safe(() => protector.reveal(envelope, { ...binding, epoch: 2 })),
    ).toBe("OPENROUTER_KEY_UNAVAILABLE");
  });
  it("rejects nonce, ciphertext, tag, version and key changes with one safe error", async () => {
    const protector = await NodeOpenRouterSecretProtector.load(keyFile);
    const binding: OpenRouterSecretBinding = {
      purpose: "credential",
      accountId: "synthetic-account",
      epoch: 1,
    };
    const envelope = protector.protect(plaintext, binding);
    for (const index of [1, 2, 3]) {
      const parts = envelope.split(".");
      const part = parts[index];
      if (!part) throw new Error("synthetic envelope unavailable");
      parts[index] = `${part[0] === "A" ? "B" : "A"}${part.slice(1)}`;
      expect(safe(() => protector.reveal(parts.join("."), binding))).toBe(
        "OPENROUTER_KEY_UNAVAILABLE",
      );
    }
    for (const invalid of [
      "",
      "v2.a.b.c",
      `${envelope}.extra`,
      "x".repeat(88_001),
    ])
      expect(safe(() => protector.reveal(invalid, binding))).toBe(
        "OPENROUTER_KEY_UNAVAILABLE",
      );
    const otherKey = join(root, "other-key");
    await writeFile(otherKey, Buffer.alloc(32, 42), { mode: 0o600 });
    const other = await NodeOpenRouterSecretProtector.load(otherKey);
    expect(safe(() => other.reveal(envelope, binding))).toBe(
      "OPENROUTER_KEY_UNAVAILABLE",
    );
  });
  it("fails unavailable protectors safely without synthesizing a credential", async () => {
    const binding: OpenRouterSecretBinding = {
      purpose: "credential",
      accountId: "synthetic-account",
      epoch: 1,
    };
    for (const file of [undefined, "relative-key", join(root, "missing")]) {
      const protector = await NodeOpenRouterSecretProtector.load(file);
      expect(protector.available()).toBe(false);
      expect(safe(() => protector.protect(plaintext, binding))).toBe(
        "OPENROUTER_KEY_UNAVAILABLE",
      );
      expect(safe(() => protector.reveal("synthetic-envelope", binding))).toBe(
        "OPENROUTER_KEY_UNAVAILABLE",
      );
    }
  });
  it("roundtrips the maximum payload and rejects oversized or non-printable inputs", async () => {
    const protector = await NodeOpenRouterSecretProtector.load(keyFile);
    const binding: OpenRouterSecretBinding = {
      purpose: "credential",
      accountId: "synthetic-account",
      epoch: 1,
    };
    const value = "x".repeat(65536);
    expect(
      protector.reveal(protector.protect(value, binding), binding) === value,
    ).toBe(true);
    for (const invalid of ["", "x".repeat(65537), "synthetic\ninvalid"])
      expect(safe(() => protector.protect(invalid, binding))).toBe(
        "OPENROUTER_KEY_UNAVAILABLE",
      );
  });
});

describe("OpenRouter execution ownership", () => {
  afterEach(() => vi.useRealTimers());

  it("admits four operations, never queues a fifth and reuses a slot only after settlement", async () => {
    const execution = new NodeOpenRouterExecution();
    const gates = Array.from({ length: 4 }, deferred);
    let calls = 0;
    const results = gates.map((gate) =>
      execution.run(async () => {
        calls++;
        await gate.promise;
        return true;
      }),
    );
    const observed = results.map(outcome);
    try {
      await Promise.resolve();
      expect(calls).toBe(4);
      expect(
        await outcome(
          execution.run(async () => {
            calls++;
            return true;
          }),
        ),
      ).toBe("OPENROUTER_BUSY");
      expect(calls).toBe(4);
      gates[0]?.release();
      expect(await observed[0]).toBe("accepted");
      expect(await outcome(execution.run(async () => true))).toBe("accepted");
    } finally {
      for (const gate of gates) gate.release();
      await Promise.all(observed);
      await execution.stop();
    }
  });

  it("aborts at ten seconds but retains all slots until the actual work Promises settle", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const execution = new NodeOpenRouterExecution();
    const gates = Array.from({ length: 4 }, deferred);
    const signals: AbortSignal[] = [];
    let settled = 0;
    const results = gates.map((gate) =>
      execution.run(async (signal) => {
        signals.push(signal);
        await gate.promise;
        return true;
      }),
    );
    const observed = results.map(async (result) => {
      const value = await outcome(result);
      settled++;
      return value;
    });
    try {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(9_999);
      expect(signals.every((signal) => !signal.aborted)).toBe(true);
      await vi.advanceTimersByTimeAsync(1);
      expect(
        signals.length === 4 && signals.every((signal) => signal.aborted),
      ).toBe(true);
      expect(settled).toBe(0);
      expect(await outcome(execution.run(async () => true))).toBe(
        "OPENROUTER_BUSY",
      );
      for (const gate of gates) gate.release();
      expect(
        (await Promise.all(observed)).every(
          (value) => value === "OPENROUTER_UNAVAILABLE",
        ),
      ).toBe(true);
      expect(await outcome(execution.run(async () => true))).toBe("accepted");
    } finally {
      for (const gate of gates) gate.release();
      await Promise.all(observed);
      await execution.stop();
    }
  });

  it("keeps stop pending beyond the deadline and closes admission until every owned Promise terminates", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const execution = new NodeOpenRouterExecution();
    const first = deferred();
    const second = deferred();
    const signals: AbortSignal[] = [];
    const work = [first, second].map((gate) =>
      outcome(
        execution.run(async (signal) => {
          signals.push(signal);
          await gate.promise;
          return true;
        }),
      ),
    );
    let stopped = false;
    let stop: Promise<void> | null = null;
    try {
      await Promise.resolve();
      stop = execution.stop().then(() => {
        stopped = true;
      });
      await vi.advanceTimersByTimeAsync(60_000);
      expect(
        signals.length === 2 && signals.every((signal) => signal.aborted),
      ).toBe(true);
      expect(stopped).toBe(false);
      first.release();
      await work[0];
      await Promise.resolve();
      expect(stopped).toBe(false);
      expect(await outcome(execution.run(async () => true))).toBe(
        "OPENROUTER_BUSY",
      );
      second.release();
      await Promise.all(work);
      await stop;
      expect(stopped).toBe(true);
      expect(await outcome(execution.run(async () => true))).toBe(
        "OPENROUTER_BUSY",
      );
    } finally {
      first.release();
      second.release();
      await Promise.all(work);
      await stop;
      await execution.stop();
    }
  });
});
