import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { chmod, open, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureDirectory, startSmtpFixture } from "./__tests__/smtpFixture";
import { loadNodeSmtpConfig } from "./config";

let root: string;
let file: string;
let passwordFile: string;
let config: Record<string, unknown>;
const unavailable = {
  code: "EXTERNAL_API_ERROR",
  message: "メールの送信設定を利用できません。",
};

beforeEach(async () => {
  root = await fixtureDirectory();
  file = join(root, "smtp.json");
  passwordFile = join(root, "password");
  await writeFile(passwordFile, "synthetic-password", { mode: 0o600 });
  config = {
    version: 1,
    host: "smtp.example.invalid",
    port: 465,
    tls: "implicit",
    serverName: "smtp.example.invalid",
    from: "sender@example.invalid",
    auth: { user: "synthetic-user", passwordFile },
  };
});

async function save(value: unknown = config) {
  await writeFile(file, JSON.stringify(value), { mode: 0o600 });
  return file;
}

describe("loadNodeSmtpConfig owned-file contract", () => {
  it.each([
    "implicit",
    "starttls",
  ])("loads strict %s configuration", async (tls) => {
    config.tls = tls;
    expect(await loadNodeSmtpConfig(await save())).toEqual({
      host: "smtp.example.invalid",
      port: 465,
      tls,
      serverName: "smtp.example.invalid",
      from: "sender@example.invalid",
      auth: { user: "synthetic-user", password: "synthetic-password" },
    });
  });

  it("loads configuration without contacting the SMTP endpoint", async () => {
    const fixture = await startSmtpFixture("implicit");
    try {
      config.host = fixture.config.host;
      config.port = fixture.config.port;
      config.serverName = fixture.config.serverName;
      await loadNodeSmtpConfig(await save());
      expect(fixture.acceptedConnections).toBe(0);
    } finally {
      await fixture.close();
    }
  });

  it.each([
    "configuration",
    "password",
  ])("rejects a %s FIFO without waiting for a writer", async (target) => {
    await save();
    const path = target === "configuration" ? file : passwordFile;
    await unlink(path);
    await promisify(execFile)("mkfifo", ["-m", "600", path]);
    const pending = loadNodeSmtpConfig(file).then(
      () => ({ kind: "loaded" as const }),
      (error: unknown) => ({ kind: "rejected" as const, error }),
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      pending,
      new Promise<{ kind: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "timeout" }), 1000);
      }),
    ]);
    clearTimeout(timer);
    if (result.kind === "timeout") {
      const writer = await open(path, constants.O_RDWR | constants.O_NONBLOCK);
      try {
        await pending;
      } finally {
        await writer.close();
      }
    }
    expect(result).toEqual({
      kind: "rejected",
      error: expect.objectContaining(unavailable),
    });
  });

  it.each([
    ["version", 2],
    ["host", "smtp.example.invalid\r\nAUTH"],
    ["host", "https://smtp.example.invalid"],
    ["host", "smtp..invalid"],
    ["host", ""],
    ["port", 0],
    ["port", 65536],
    ["port", 465.5],
    ["port", "465"],
    ["tls", "opportunistic"],
    ["tls", "none"],
    ["serverName", "*.example.invalid"],
    ["serverName", "wrong/name"],
    ["from", "Display <sender@example.invalid>"],
    ["from", "sender@example.invalid,other@example.invalid"],
    ["from", "sender@example.invalid\r\nBcc: other@example.invalid"],
    ["from", "sender"],
    ["from", "a..b@example.invalid"],
    ["auth", { user: "synthetic-user", password: "inline-secret" }],
    ["auth", { user: "synthetic-user", passwordFile: "./password" }],
    ["auth", { user: "synthetic-user\0", passwordFile: "/missing" }],
  ])("rejects invalid %s", async (key, value) => {
    config[String(key)] = value;
    await expect(loadNodeSmtpConfig(await save())).rejects.toMatchObject(
      unavailable,
    );
  });

  it("rejects unknown and missing JSON fields", async () => {
    await expect(
      loadNodeSmtpConfig(await save({ ...config, rejectUnauthorized: false })),
    ).rejects.toMatchObject(unavailable);
    const incomplete = { ...config };
    delete incomplete.serverName;
    await expect(
      loadNodeSmtpConfig(await save(incomplete)),
    ).rejects.toMatchObject(unavailable);
  });

  it("rejects unknown nested authentication fields", async () => {
    config.auth = { user: "synthetic-user", passwordFile, insecure: true };
    await expect(loadNodeSmtpConfig(await save())).rejects.toMatchObject(
      unavailable,
    );
  });

  it.each([
    0o644, 0o660, 0o640, 0o700,
  ])("rejects configuration permissions %o", async (mode) => {
    await save();
    await chmod(file, mode);
    await expect(loadNodeSmtpConfig(file)).rejects.toMatchObject(unavailable);
  });

  it("rejects password permissions broader than 0600", async () => {
    await save();
    await chmod(passwordFile, 0o644);
    await expect(loadNodeSmtpConfig(file)).rejects.toMatchObject(unavailable);
  });

  it("rejects parent directory permissions broader than 0700", async () => {
    await save();
    await chmod(root, 0o750);
    try {
      await expect(loadNodeSmtpConfig(file)).rejects.toMatchObject(unavailable);
    } finally {
      await chmod(root, 0o700);
    }
  });

  it("rejects files not owned by the effective process owner", async () => {
    await save();
    const uid = process.getuid?.();
    if (uid === undefined)
      throw new Error("Owned-file contracts require getuid");
    const owner = vi.spyOn(process, "getuid").mockReturnValue(uid + 1);
    try {
      await expect(loadNodeSmtpConfig(file)).rejects.toMatchObject(unavailable);
    } finally {
      owner.mockRestore();
    }
  });

  it("rejects symlink configuration and password files", async () => {
    await save();
    const alias = join(root, "smtp-link.json");
    await symlink(file, alias);
    await expect(loadNodeSmtpConfig(alias)).rejects.toMatchObject(unavailable);
    const passwordAlias = join(root, "password-link");
    await symlink(passwordFile, passwordAlias);
    config.auth = { user: "synthetic-user", passwordFile: passwordAlias };
    await expect(loadNodeSmtpConfig(await save())).rejects.toMatchObject(
      unavailable,
    );
  });

  it("rejects a parent directory reached through a symlink", async () => {
    await save();
    const container = await fixtureDirectory();
    const alias = join(container, "alias");
    await symlink(root, alias);
    await expect(
      loadNodeSmtpConfig(join(alias, "smtp.json")),
    ).rejects.toMatchObject(unavailable);
  });

  it("rejects missing, relative and non-normalized paths", async () => {
    await save();
    for (const path of [
      "smtp.json",
      `${root}/child/../smtp.json`,
      `${root}/missing`,
    ])
      await expect(loadNodeSmtpConfig(path)).rejects.toMatchObject(unavailable);
  });

  it.each([
    "",
    "synthetic-password\n",
    "synthetic\rpassword",
    "a".repeat(4097),
  ])("rejects empty, multiline or oversized passwords", async (password) => {
    await writeFile(passwordFile, password);
    await expect(loadNodeSmtpConfig(await save())).rejects.toMatchObject(
      unavailable,
    );
  });

  it("rejects invalid UTF-8 and oversized configuration without leaking bytes", async () => {
    await save();
    await writeFile(file, Buffer.from([0xff]));
    await expect(loadNodeSmtpConfig(file)).rejects.toMatchObject(unavailable);
    await writeFile(file, "a".repeat(16_385));
    await expect(loadNodeSmtpConfig(file)).rejects.toMatchObject(unavailable);
    await save();
    await writeFile(passwordFile, Buffer.from([0xff]));
    await expect(loadNodeSmtpConfig(file)).rejects.toMatchObject(unavailable);
  });
});
