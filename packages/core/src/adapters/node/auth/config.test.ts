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
import type {
  AuthenticationBinding,
  GoogleAuthentication,
} from "@repo/core/application/account/ports";
import { ConflictError } from "@repo/core/application/errors";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeTokenGenerator } from "../tokenGenerator";
import { readNodeGoogleAuthentication } from "./config";
import { NodeAuthenticationSecretProtector } from "./secretProtector";

describe("Google authentication private configuration and PKCE protection", () => {
  let root: string;
  let keyFile: string;
  let configFile: string;
  const configured: GoogleAuthentication[] = [];
  const deps = {
    clock: { now: () => new Date("2026-09-27T13:00:00Z") },
    tokens: NodeTokenGenerator,
  };
  const binding: AuthenticationBinding = {
    attemptId: "synthetic-attempt",
    mode: "login",
    browser: { hash: "synthetic-browser-binding", epoch: 1 },
  };
  const verifier = "synthetic_verifier_".padEnd(64, "a");

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "hollow-auth-config-test-"));
    await chmod(root, 0o700);
    keyFile = join(root, "synthetic-key");
    configFile = join(root, "config.json");
    await writeFile(keyFile, Buffer.alloc(32, 23), { mode: 0o600 });
    await writeFile(configFile, config(), { mode: 0o600 });
  });

  afterEach(async () => {
    try {
      await Promise.all(
        configured.splice(0).map((value) => value.execution.stop()),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  function config(extra: Readonly<Record<string, unknown>> = {}) {
    return JSON.stringify({
      clientId: "synthetic-client",
      clientSecret: "synthetic-secret",
      pkceKeyFile: keyFile,
      ...extra,
    });
  }
  async function available(file: string | undefined = configFile) {
    const value = await readNodeGoogleAuthentication(
      file,
      "http://localhost:3000",
      deps,
    );
    if (value) configured.push(value);
    return Boolean(value?.protector.available());
  }
  function safeResult(work: () => unknown) {
    try {
      work();
      return "accepted";
    } catch (error) {
      return error instanceof ConflictError ? error.code : "unexpected-error";
    }
  }

  it("loads an exact 16 KiB regular configuration with a private 32-byte key", async () => {
    const value = config();
    await writeFile(configFile, value.padEnd(16 * 1024, " "));
    expect(await available()).toBe(true);
  });

  it("rejects the byte immediately beyond the configuration limit", async () => {
    await writeFile(configFile, config().padEnd(16 * 1024 + 1, " "));
    expect(await available()).toBe(false);
  });

  it("keeps absent, missing and relative configuration unconfigured", async () => {
    expect(
      Boolean(
        await readNodeGoogleAuthentication(
          undefined,
          "http://localhost:3000",
          deps,
        ),
      ),
    ).toBe(false);
    expect(await available("relative-config.json")).toBe(false);
    expect(await available(join(root, "missing"))).toBe(false);
  });

  it.each([
    "unknown",
    "empty-client",
    "empty-secret",
    "invalid-json",
    "invalid-utf8",
  ] as const)("rejects %s input without exposing its content", async (kind) => {
    const value =
      kind === "unknown"
        ? config({ unexpected: true })
        : kind === "empty-client"
          ? config({ clientId: "" })
          : kind === "empty-secret"
            ? config({ clientSecret: "" })
            : kind === "invalid-json"
              ? "{"
              : Buffer.from([0xff]);
    await writeFile(configFile, value);
    expect(await available()).toBe(false);
  });

  it.each([
    "configuration",
    "key",
    "parent",
  ] as const)("rejects broad %s permissions", async (target) => {
    await chmod(
      target === "configuration"
        ? configFile
        : target === "key"
          ? keyFile
          : root,
      target === "parent" ? 0o755 : 0o644,
    );
    expect(await available()).toBe(false);
    if (target !== "configuration")
      expect(
        (await NodeAuthenticationSecretProtector.load(keyFile)).available(),
      ).toBe(false);
  });

  it.each([
    "configuration",
    "key",
    "parent",
  ] as const)("rejects a symbolic %s path", async (target) => {
    if (target === "configuration") {
      const alias = join(root, "config-alias");
      await symlink(configFile, alias);
      expect(await available(alias)).toBe(false);
    } else if (target === "key") {
      const alias = join(root, "key-alias");
      await symlink(keyFile, alias);
      await writeFile(configFile, config({ pkceKeyFile: alias }));
      expect(await available()).toBe(false);
      expect(
        (await NodeAuthenticationSecretProtector.load(alias)).available(),
      ).toBe(false);
    } else {
      const real = join(root, "private");
      await mkdir(real, { mode: 0o700 });
      await writeFile(join(real, "key"), Buffer.alloc(32, 29), { mode: 0o600 });
      await writeFile(join(real, "config"), config(), { mode: 0o600 });
      const alias = join(root, "private-alias");
      await symlink(real, alias);
      expect(await available(join(alias, "config"))).toBe(false);
      expect(
        (
          await NodeAuthenticationSecretProtector.load(join(alias, "key"))
        ).available(),
      ).toBe(false);
    }
  });

  it.each([31, 33])("rejects a %i-byte key", async (bytes) => {
    await writeFile(keyFile, Buffer.alloc(bytes, 23));
    expect(await available()).toBe(false);
    expect(
      (await NodeAuthenticationSecretProtector.load(keyFile)).available(),
    ).toBe(false);
  });

  it("returns a safe unavailable protector for absent and relative keys", async () => {
    for (const file of [undefined, "relative-key", join(root, "missing")]) {
      const protector = await NodeAuthenticationSecretProtector.load(file);
      expect(protector.available()).toBe(false);
      expect(safeResult(() => protector.protect(verifier, binding))).toBe(
        "AUTH_KEY_UNAVAILABLE",
      );
      expect(
        safeResult(() => protector.reveal("synthetic-envelope", binding)),
      ).toBe("AUTH_KEY_UNAVAILABLE");
    }
  });

  it("roundtrips with independent nonces and does not expose plaintext", async () => {
    const protector = await NodeAuthenticationSecretProtector.load(keyFile);
    const first = protector.protect(verifier, binding);
    const second = protector.protect(verifier, binding);
    expect(protector.reveal(first, binding) === verifier).toBe(true);
    expect(protector.reveal(second, binding) === verifier).toBe(true);
    expect(first === second).toBe(false);
    expect(first.includes(verifier) || second.includes(verifier)).toBe(false);
  });

  it.each([
    "attempt",
    "mode",
    "browser",
    "epoch",
  ] as const)("binds the encrypted verifier to %s AAD", async (field) => {
    const protector = await NodeAuthenticationSecretProtector.load(keyFile);
    const envelope = protector.protect(verifier, binding);
    const changed: AuthenticationBinding =
      field === "attempt"
        ? { ...binding, attemptId: "other-attempt" }
        : field === "mode"
          ? { ...binding, mode: "link" }
          : field === "browser"
            ? {
                ...binding,
                browser: { ...binding.browser, hash: "other-browser" },
              }
            : { ...binding, browser: { ...binding.browser, epoch: 2 } };
    expect(safeResult(() => protector.reveal(envelope, changed))).toBe(
      "AUTH_KEY_UNAVAILABLE",
    );
    expect(protector.reveal(envelope, binding) === verifier).toBe(true);
  });

  it("rejects authenticated-part mutation, wrong key and malformed envelopes with the same safe code", async () => {
    const protector = await NodeAuthenticationSecretProtector.load(keyFile);
    const envelope = protector.protect(verifier, binding);
    for (const index of [1, 2, 3]) {
      const parts = envelope.split(".");
      const part = parts[index];
      if (!part) throw new Error("synthetic envelope shape unavailable");
      parts[index] = `${part[0] === "A" ? "B" : "A"}${part.slice(1)}`;
      expect(safeResult(() => protector.reveal(parts.join("."), binding))).toBe(
        "AUTH_KEY_UNAVAILABLE",
      );
    }
    for (const malformed of [
      "",
      "v2.a.b.c",
      `${envelope}.extra`,
      "x".repeat(513),
    ])
      expect(safeResult(() => protector.reveal(malformed, binding))).toBe(
        "AUTH_KEY_UNAVAILABLE",
      );
    const otherKey = join(root, "other-key");
    await writeFile(otherKey, Buffer.alloc(32, 30), { mode: 0o600 });
    const other = await NodeAuthenticationSecretProtector.load(otherKey);
    expect(safeResult(() => other.reveal(envelope, binding))).toBe(
      "AUTH_KEY_UNAVAILABLE",
    );
  });
});
