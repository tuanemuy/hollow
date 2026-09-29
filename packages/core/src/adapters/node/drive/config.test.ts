import { chmod, lstat, symlink, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { BusinessRuleError } from "@repo/core/domain/error";
import { expect, test, vi } from "vitest";
import { loadDriveConfig } from "./config";

async function rejected(work: () => Promise<unknown>): Promise<boolean> {
  try {
    await work();
    return false;
  } catch (error) {
    return (
      error instanceof BusinessRuleError &&
      error.code === "DRIVE_UNAVAILABLE" &&
      error.cause === undefined
    );
  }
}

test("family 23: unconfigured, strict configuration, bounds, uid, modes and symlinks", async () => {
  const root = process.env.DRIVE_S3_TEST_ROOT;
  if (!root || !isAbsolute(root)) throw new Error("DRIVE_S3_FIXTURE_REQUIRED");
  const directory = join(root, "crypto-fixture");
  const configFile = join(directory, "config.json");
  const keyringFile = join(directory, "keyring.json");
  const configLink = join(directory, "config-link.json");
  const activeKeyFile = join(directory, "active.key");
  const retiredKeyFile = join(directory, "retired.key");
  const uid = process.getuid?.();
  if (uid === undefined) throw new Error("DRIVE_S3_UID_REQUIRED");
  const parent = await lstat(directory);
  if (
    !parent.isDirectory() ||
    parent.isSymbolicLink() ||
    parent.uid !== uid ||
    (parent.mode & 0o7777) !== 0o700
  )
    throw new Error("DRIVE_S3_FIXTURE_INVALID");
  const config = {
    version: 1,
    clientId: "synthetic-client",
    clientSecret: "synthetic-secret",
    keyringFile,
    picker: { appId: "123456", apiKey: "synthetic-picker-key" },
  };
  const keyring = {
    version: 1,
    activeKid: "active",
    keys: [
      { kid: "active", keyFile: activeKeyFile },
      { kid: "retired", keyFile: retiredKeyFile },
    ],
  };
  let linkCreated = false;
  let configCreated = false;
  let keyringCreated = false;
  let successful = false;
  const configJson = JSON.stringify(config);
  const keyringJson = JSON.stringify(keyring);
  const rewrite = async (file: string, content: string) => {
    if (Buffer.byteLength(content) > 16_385)
      throw new Error("DRIVE_S3_CONFIG_BUDGET");
    await writeFile(file, content, { flag: "w", mode: 0o600 });
  };
  const load = () => loadDriveConfig(configFile, "https://hollow.example");
  const checkLoaded = async (
    origin = "https://hollow.example",
    local = false,
  ) => {
    const loaded = await loadDriveConfig(configFile, origin, local);
    try {
      expect(
        loaded !== null &&
          loaded.keys.size === 2 &&
          loaded.activeKid === "active",
      ).toBe(true);
      expect(
        loaded?.callbackUrl === new URL("/auth/drive/callback", origin).href,
      ).toBe(true);
    } finally {
      if (loaded) for (const key of loaded.keys.values()) key.fill(0);
    }
  };
  try {
    await writeFile(configFile, configJson, { flag: "wx", mode: 0o600 });
    configCreated = true;
    await writeFile(keyringFile, keyringJson, { flag: "wx", mode: 0o600 });
    keyringCreated = true;
    expect((await loadDriveConfig(undefined, "invalid")) === null).toBe(true);
    expect(
      await rejected(() => loadDriveConfig("", "https://hollow.example")),
    ).toBe(true);
    await checkLoaded();
    await checkLoaded("http://127.0.0.1:12345", true);
    for (const origin of [
      "http://127.0.0.1",
      "https://user@hollow.example",
      "https://hollow.example/path",
      "https://hollow.example/?query",
      "https://hollow.example/#fragment",
    ]) {
      expect(await rejected(() => loadDriveConfig(configFile, origin))).toBe(
        true,
      );
    }
    for (const invalid of [
      { ...config, redirectUri: "https://other.example" },
      { ...config, clientId: "x".repeat(1025) },
      { ...config, clientSecret: "x".repeat(4097) },
      { ...config, picker: { ...config.picker, appId: "not-digits" } },
    ]) {
      await rewrite(configFile, JSON.stringify(invalid));
      expect(await rejected(load)).toBe(true);
    }
    await rewrite(configFile, configJson.padEnd(16_384, " "));
    await checkLoaded();
    await rewrite(configFile, configJson.padEnd(16_385, " "));
    expect(await rejected(load)).toBe(true);
    await rewrite(configFile, configJson);
    for (const invalid of [
      { ...keyring, extra: true },
      { ...keyring, activeKid: "missing" },
      { ...keyring, keys: [keyring.keys[0], keyring.keys[0]] },
      {
        ...keyring,
        keys: [keyring.keys[0], { kid: "retired", keyFile: activeKeyFile }],
      },
      { ...keyring, keys: [] },
    ]) {
      await rewrite(keyringFile, JSON.stringify(invalid));
      expect(await rejected(load)).toBe(true);
    }
    await rewrite(keyringFile, keyringJson.padEnd(16_384, " "));
    await checkLoaded();
    await rewrite(keyringFile, keyringJson.padEnd(16_385, " "));
    expect(await rejected(load)).toBe(true);
    await rewrite(keyringFile, keyringJson);
    await chmod(configFile, 0o640);
    expect(await rejected(load)).toBe(true);
    await chmod(configFile, 0o600);
    await chmod(activeKeyFile, 0o640);
    expect(await rejected(load)).toBe(true);
    await chmod(activeKeyFile, 0o600);
    await chmod(directory, 0o750);
    expect(await rejected(load)).toBe(true);
    await chmod(directory, 0o700);
    const changedUid = vi.spyOn(process, "getuid").mockReturnValue(uid + 1);
    try {
      expect(await rejected(load)).toBe(true);
    } finally {
      changedUid.mockRestore();
    }
    await symlink(configFile, configLink);
    linkCreated = true;
    expect(
      await rejected(() =>
        loadDriveConfig(configLink, "https://hollow.example"),
      ),
    ).toBe(true);
    await checkLoaded();
    successful = true;
  } finally {
    await chmod(directory, 0o700);
    await chmod(activeKeyFile, 0o600);
    if (configCreated) await chmod(configFile, 0o600);
    if (successful) {
      if (linkCreated) await unlink(configLink);
      if (configCreated) await unlink(configFile);
      if (keyringCreated) await unlink(keyringFile);
    }
  }
});
