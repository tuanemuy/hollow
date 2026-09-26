import { createHmac } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PdfAnonymousTicketClaims } from "@repo/core/application/pdf/anonymousPorts";
import { BusinessRuleError } from "@repo/core/domain/error";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodePdfAnonymousTicketSigner } from "./anonymousTicketSigner";

const key = Buffer.alloc(32, 19);
const oldKey = Buffer.alloc(32, 23);
const claims: PdfAnonymousTicketClaims = {
  v: 1,
  purpose: "hollow-anonymous-pdf-v1",
  kid: "current",
  requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ticketGeneration: 1,
  issuedAt: 1_700_000_000_000,
  expiresAt: 1_700_000_600_000,
  browserHash: "a".repeat(64),
  authorityDigest: "b".repeat(64),
};

function signedJson(json: string | Buffer, secret = key) {
  const message = `v1.${Buffer.from(json).toString("base64url")}`;
  return `${message}.${createHmac("sha256", secret).update(message).digest("base64url")}`;
}

describe("anonymous PDF ticket signer", () => {
  let root: string;
  let configPath: string;
  const config = () => ({
    activeKeyId: "current",
    keys: [
      { id: "current", path: "current.key" },
      { id: "old", path: "old.key" },
    ],
  });
  async function writeConfig(value: unknown) {
    await writeFile(configPath, JSON.stringify(value), { mode: 0o600 });
  }
  async function disabled(file = configPath) {
    const signer = await NodePdfAnonymousTicketSigner.load(file);
    expect(signer.activeKeyId()).toBeNull();
    expect(signer.verify(signedJson(JSON.stringify(claims)))).toBeNull();
    expect(() => signer.sign(claims)).toThrow(BusinessRuleError);
    try {
      signer.sign(claims);
    } catch (error) {
      expect(error).toMatchObject({ code: "PDF_NOT_CONFIGURED" });
      expect(String(error).includes(root)).toBe(false);
    }
  }
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "hollow-anonymous-ticket-unit-"));
    await chmod(root, 0o700);
    configPath = path.join(root, "ring.json");
    await writeFile(path.join(root, "current.key"), key, { mode: 0o600 });
    await writeFile(path.join(root, "old.key"), oldKey, { mode: 0o600 });
    await writeConfig(config());
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it("signs the canonical payload and verifies independently computed HMAC", async () => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    expect(signer.activeKeyId()).toBe("current");
    const ticket = signer.sign(claims);
    expect(ticket === signedJson(JSON.stringify(claims))).toBe(true);
    expect(signer.verify(ticket)).toEqual(claims);
  });

  it("keeps issuedAt/expiresAt and verifies an expired ticket without a clock", async () => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    const clock = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("clock is not a signer dependency");
    });
    expect(signer.verify(signer.sign(claims))).toEqual(claims);
    expect(clock).not.toHaveBeenCalled();
  });

  it("reissues with a retained old kid without changing receipt times", async () => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    const original = { ...claims, kid: "old" };
    expect(
      signer.sign(original) === signedJson(JSON.stringify(original), oldKey),
    ).toBe(true);
    expect(signer.verify(signer.sign(original))).toEqual(original);
  });

  it("accepts boundary key IDs, safe generations and epoch zero", async () => {
    const kid = `${"a".repeat(30)}_-`;
    await writeConfig({
      activeKeyId: kid,
      keys: [{ id: kid, path: "current.key" }],
    });
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    const input = {
      ...claims,
      kid,
      ticketGeneration: Number.MAX_SAFE_INTEGER,
      issuedAt: 0,
      expiresAt: 600_000,
    };
    expect(signer.verify(signer.sign(input))).toEqual(input);
  });

  it("authenticates all receipt bindings rather than trusting parsed claims", async () => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    const mac = signer.sign(claims).split(".")[2];
    for (const change of [
      { requestId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      { ticketGeneration: 2 },
      { kid: "old" },
      { issuedAt: claims.issuedAt + 1, expiresAt: claims.expiresAt + 1 },
      { browserHash: "c".repeat(64) },
      { authorityDigest: "c".repeat(64) },
    ]) {
      const payload = Buffer.from(
        JSON.stringify({ ...claims, ...change }),
      ).toString("base64url");
      expect(signer.verify(`v1.${payload}.${mac}`)).toBeNull();
    }
  });

  it("rejects removed and unknown kids without fallback to the active key", async () => {
    await writeConfig({ activeKeyId: "current", keys: [config().keys[0]] });
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    const original = { ...claims, kid: "old" };
    expect(
      signer.verify(signedJson(JSON.stringify(original), oldKey)),
    ).toBeNull();
    expect(() => signer.sign(original)).toThrow(BusinessRuleError);
  });

  it("canonicalizes signing property order but rejects noncanonical incoming JSON", async () => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    const reversed = Object.fromEntries(
      Object.entries(claims).reverse(),
    ) as PdfAnonymousTicketClaims;
    expect(signer.sign(reversed) === signer.sign(claims)).toBe(true);
    for (const json of [
      JSON.stringify(reversed),
      JSON.stringify(claims, null, 1),
      JSON.stringify(claims).replace('"v":1', '"v":1,"v":1'),
      JSON.stringify(claims).replace('"v":1', '"v":1.0'),
    ]) {
      expect(signer.verify(signedJson(json))).toBeNull();
    }
  });

  it.each([
    { v: 2 },
    { purpose: "another-purpose" },
    { kid: "bad.key" },
    { requestId: "not-uuid" },
    { ticketGeneration: 0 },
    { ticketGeneration: 1.5 },
    { ticketGeneration: Number.MAX_SAFE_INTEGER + 1 },
    { issuedAt: -1 },
    { issuedAt: 1.5 },
    { expiresAt: claims.expiresAt + 1 },
    { expiresAt: Number.MAX_SAFE_INTEGER + 1 },
    { browserHash: "A".repeat(64) },
    { browserHash: "a".repeat(63) },
    { authorityDigest: "z".repeat(64) },
    { additional: true },
  ])("rejects invalid claims shape %#", async (change) => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    const input = { ...claims, ...change };
    expect(signer.verify(signedJson(JSON.stringify(input)))).toBeNull();
    expect(() => signer.sign(input as PdfAnonymousTicketClaims)).toThrow(
      BusinessRuleError,
    );
  });

  it("rejects missing fields and wrong JSON value kinds", async () => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    for (const field of Object.keys(claims)) {
      const input: Record<string, unknown> = { ...claims };
      delete input[field];
      expect(signer.verify(signedJson(JSON.stringify(input)))).toBeNull();
    }
    for (const value of [null, [], 3, "claims", true]) {
      expect(signer.verify(signedJson(JSON.stringify(value)))).toBeNull();
    }
  });

  it("rejects tampering, alternate encoding, prefix, segments and MAC lengths", async () => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    const ticket = signer.sign(claims);
    const parts = ticket.split(".");
    const payload = parts[1] ?? "";
    const mac = parts[2] ?? "";
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const alternateMac =
      mac.slice(0, -1) + alphabet[alphabet.indexOf(mac.slice(-1)) + 1];
    for (const input of [
      "",
      `v2.${payload}.${mac}`,
      `${ticket}.extra`,
      `${ticket}\n`,
      `v1.${payload}=.${mac}`,
      `v1.${payload}.${mac}=`,
      `v1.${payload}.${mac.slice(1)}`,
      `v1.${payload}.${alternateMac}`,
      `v1.${payload}.${Buffer.alloc(32).toString("base64url")}`,
      signedJson(
        JSON.stringify({ ...claims, browserHash: "c".repeat(64) }),
        oldKey,
      ),
    ])
      expect(signer.verify(input)).toBeNull();
  });

  it("rejects malformed UTF8/JSON and over-limit decoded input", async () => {
    const signer = await NodePdfAnonymousTicketSigner.load(configPath);
    for (const input of [
      Buffer.from([0xff]),
      Buffer.from("{"),
      Buffer.alloc(1025, 32),
    ]) {
      expect(signer.verify(signedJson(input))).toBeNull();
    }
  });

  it("uses absolute key paths as well as paths relative to the config directory", async () => {
    await writeConfig({
      activeKeyId: "current",
      keys: [{ id: "current", path: path.join(root, "current.key") }],
    });
    expect(
      (await NodePdfAnonymousTicketSigner.load(configPath)).activeKeyId(),
    ).toBe("current");
  });

  it("fails closed when unset or missing", async () => {
    const empty = await NodePdfAnonymousTicketSigner.load(undefined);
    expect(empty.activeKeyId()).toBeNull();
    expect(empty.verify("invalid")).toBeNull();
    expect(() => empty.sign(claims)).toThrow(BusinessRuleError);
    await disabled(path.join(root, "missing.json"));
  });

  it.each([
    0o644, 0o400, 0o1600,
  ])("rejects config permissions %i", async (mode) => {
    await chmod(configPath, mode);
    await disabled();
  });
  it("rejects key permissions and parent permissions", async () => {
    await chmod(path.join(root, "old.key"), 0o640);
    await disabled();
    await chmod(path.join(root, "old.key"), 0o600);
    await chmod(root, 0o750);
    await disabled();
  });
  it("rejects a different uid", async () => {
    const current = process.getuid?.();
    if (current === undefined) throw new Error("unit test requires a uid");
    vi.spyOn(process, "getuid").mockReturnValue(current + 1);
    await disabled();
  });
  it("rejects symlink config, key and direct parent", async () => {
    const alias = path.join(root, "alias.json");
    await symlink(configPath, alias);
    await disabled(alias);
    await symlink(path.join(root, "current.key"), path.join(root, "alias.key"));
    await writeConfig({
      activeKeyId: "current",
      keys: [{ id: "current", path: "alias.key" }],
    });
    await disabled();
    await writeConfig(config());
    await symlink(root, path.join(root, "parent-alias"));
    await disabled(path.join(root, "parent-alias", "ring.json"));
  });
  it("rejects directory files and a key with an unsafe separate parent", async () => {
    await mkdir(path.join(root, "folder"), { mode: 0o700 });
    await disabled(path.join(root, "folder"));
    await writeFile(path.join(root, "folder", "key"), key, { mode: 0o600 });
    await chmod(path.join(root, "folder"), 0o755);
    await writeConfig({
      activeKeyId: "current",
      keys: [{ id: "current", path: "folder/key" }],
    });
    await disabled();
  });
  it.each([0, 31, 33])("rejects a key with %i bytes", async (size) => {
    await writeFile(path.join(root, "old.key"), Buffer.alloc(size));
    await disabled();
  });
  it.each([
    {},
    { activeKeyId: "current", keys: [] },
    { activeKeyId: "missing", keys: [{ id: "current", path: "current.key" }] },
    {
      activeKeyId: "current",
      keys: [
        { id: "current", path: "current.key" },
        { id: "current", path: "old.key" },
      ],
    },
    {
      activeKeyId: "current",
      keys: [{ id: "current", path: "current.key", extra: true }],
    },
    {
      activeKeyId: "current",
      keys: [{ id: "current", path: "current.key" }],
      extra: true,
    },
    { activeKeyId: "", keys: [{ id: "", path: "current.key" }] },
    {
      activeKeyId: "a".repeat(33),
      keys: [{ id: "a".repeat(33), path: "current.key" }],
    },
    { activeKeyId: "日本語", keys: [{ id: "日本語", path: "current.key" }] },
    { activeKeyId: "current", keys: [{ id: "current", path: "" }] },
    { activeKeyId: "current", keys: [{ id: "current", path: "missing.key" }] },
  ])("fails closed on invalid configuration %#", async (value) => {
    await writeConfig(value);
    await disabled();
  });
  it("accepts sixteen keys but rejects seventeen", async () => {
    const keys = Array.from({ length: 17 }, (_, index) => ({
      id: `key_${index}`,
      path: "current.key",
    }));
    await writeConfig({ activeKeyId: "key_0", keys: keys.slice(0, 16) });
    expect(
      (await NodePdfAnonymousTicketSigner.load(configPath)).activeKeyId(),
    ).toBe("key_0");
    await writeConfig({ activeKeyId: "key_0", keys });
    await disabled();
  });
  it("accepts exactly 16KiB config and rejects oversized, malformed and invalid UTF8 config", async () => {
    const json = JSON.stringify(config());
    await writeFile(configPath, json.padEnd(16 * 1024));
    expect(
      (await NodePdfAnonymousTicketSigner.load(configPath)).activeKeyId(),
    ).toBe("current");
    for (const data of [json.padEnd(16 * 1024 + 1), "{", Buffer.from([0xff])]) {
      await writeFile(configPath, data);
      await disabled();
    }
  });
});
