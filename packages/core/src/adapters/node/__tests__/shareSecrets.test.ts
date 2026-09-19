import { randomBytes } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeShareTokenProtector } from "../shareSecrets";

const binding = { noteId: "note-one", generation: 1 };
let directory: string;
let token: string;

beforeEach(async () => {
  directory = await mkdtemp(
    join(await realpath(tmpdir()), "hollow-share-unit-"),
  );
  await chmod(directory, 0o700);
  token = randomBytes(32).toString("base64url");
  await writeFile(join(directory, "first.key"), randomBytes(32), {
    mode: 0o600,
  });
  await writeFile(join(directory, "second.key"), randomBytes(32), {
    mode: 0o600,
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

const load = (activeKeyId = "first", keyIds = ["first", "second"]) =>
  NodeShareTokenProtector.load({ directory, activeKeyId, keyIds });

function rejectsSecret(operation: () => unknown) {
  try {
    operation();
    expect.fail("Expected a closed sharing-key operation");
  } catch (error) {
    expect(error).toMatchObject({
      name: "BusinessRuleError",
      code: "SHARE_KEY_UNAVAILABLE",
    });
    expect(String(error).includes(token)).toBe(false);
    expect(String(error).includes(directory)).toBe(false);
    expect(error).not.toHaveProperty("cause");
  }
}

describe("NodeShareTokenProtector", () => {
  it("uses fresh authenticated envelopes and does not rotate on reads", async () => {
    const protector = await load();
    const one = protector.protect(token, binding);
    const two = protector.protect(token, binding);
    expect(one === two).toBe(false);
    expect(one.includes(token)).toBe(false);
    const parts = one.split(".");
    expect(parts.length).toBe(5);
    expect(parts[0]).toBe("v1");
    expect(parts[1]).toBe("first");
    expect(Buffer.from(parts[2] ?? "", "base64url").length).toBe(12);
    expect(Buffer.from(parts[4] ?? "", "base64url").length).toBe(16);
    expect(protector.reveal(one, binding) === token).toBe(true);
    expect(protector.reveal(one, binding) === token).toBe(true);
    expect(protector.needsRotation(one)).toBe(false);
  });

  it("authenticates both binding fields", async () => {
    const protector = await load();
    const envelope = protector.protect(token, binding);
    rejectsSecret(() =>
      protector.reveal(envelope, { ...binding, noteId: "other" }),
    );
    rejectsSecret(() =>
      protector.reveal(envelope, { ...binding, generation: 2 }),
    );
    rejectsSecret(() =>
      protector.protect(token, { ...binding, generation: Number.NaN }),
    );
  });

  it("retains old-key reads during explicit rotation and refuses retired keys", async () => {
    const old = await load();
    const envelope = old.protect(token, binding);
    const rotating = await load("second");
    expect(rotating.needsRotation(envelope)).toBe(true);
    expect(rotating.reveal(envelope, binding) === token).toBe(true);
    const fresh = rotating.protect(token, binding);
    expect(rotating.needsRotation(fresh)).toBe(false);
    expect(old.reveal(fresh, binding) === token).toBe(true);
    const retired = await load("second", ["second"]);
    rejectsSecret(() => retired.reveal(envelope, binding));
    expect(retired.reveal(fresh, binding) === token).toBe(true);
  });

  it("rejects malformed, modified, truncated, and unknown-key envelopes", async () => {
    const protector = await load();
    const envelope = protector.protect(token, binding);
    const parts = envelope.split(".");
    for (const [index, value] of [
      [0, "v2"],
      [1, "missing"],
      [1, "../first"],
      [2, "AA"],
      [2, `${parts[2]}=`],
      [3, "AA"],
      [4, "AA"],
      [4, "!"],
    ] as const) {
      const changed = [...parts];
      changed[index] = value;
      rejectsSecret(() => protector.reveal(changed.join("."), binding));
    }
    rejectsSecret(() => protector.reveal(`${envelope}.extra`, binding));
    rejectsSecret(() => protector.reveal("", binding));
  });

  it("compares only the embedded key ID for rotation", async () => {
    const protector = await load();
    expect(protector.needsRotation("v1.first.invalid.invalid.invalid")).toBe(
      false,
    );
    expect(protector.needsRotation("v1.second.invalid.invalid.invalid")).toBe(
      true,
    );
  });

  it.each([
    "../first",
    "UPPER",
    "",
    "a".repeat(41),
  ])("closes invalid key IDs (%#)", async (id) => {
    const protector = await load(id, [id]);
    rejectsSecret(() => protector.protect(token, binding));
    rejectsSecret(() => protector.reveal("v1.first.a.b.c", binding));
  });

  it("closes for an unconfigured active key, duplicate key, or any missing key", async () => {
    for (const protector of [
      await load("first", ["second"]),
      await load("first", ["first", "first"]),
      await load("first", ["first", "missing"]),
      await NodeShareTokenProtector.load({
        directory: join(directory, "absent"),
        activeKeyId: "first",
        keyIds: ["first"],
      }),
    ])
      rejectsSecret(() => protector.protect(token, binding));
  });

  it.each([31, 33])("closes for wrong key length (%i)", async (bytes) => {
    await writeFile(join(directory, "first.key"), randomBytes(bytes));
    const protector = await load();
    rejectsSecret(() => protector.protect(token, binding));
  });

  it.each([
    0o400, 0o640, 0o644,
  ])("closes for unsafe or unexpected key mode (%i)", async (mode) => {
    await chmod(join(directory, "first.key"), mode);
    const protector = await load();
    rejectsSecret(() => protector.protect(token, binding));
  });

  it("closes for a non-private directory", async () => {
    await chmod(directory, 0o750);
    const protector = await load();
    rejectsSecret(() => protector.protect(token, binding));
  });

  it("closes for the wrong owner", async () => {
    const uid = process.getuid?.();
    expect(uid).toBeDefined();
    vi.spyOn(process, "getuid").mockReturnValue((uid ?? 0) + 1);
    const protector = await load();
    rejectsSecret(() => protector.protect(token, binding));
  });

  it("does not follow key or directory symlinks", async () => {
    await symlink(join(directory, "first.key"), join(directory, "linked.key"));
    const keyLink = await load("linked", ["linked"]);
    rejectsSecret(() => keyLink.protect(token, binding));
    const alias = join(directory, "alias");
    await symlink(directory, alias);
    const dirLink = await NodeShareTokenProtector.load({
      directory: alias,
      activeKeyId: "first",
      keyIds: ["first"],
    });
    rejectsSecret(() => dirLink.protect(token, binding));
  });

  it("rejects a directory in place of a regular key file", async () => {
    await mkdir(join(directory, "folder.key"), { mode: 0o600 });
    const protector = await load("folder", ["folder"]);
    rejectsSecret(() => protector.protect(token, binding));
  });
});
