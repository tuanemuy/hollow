import { timingSafeEqual } from "node:crypto";
import { type BigIntStats, constants } from "node:fs";
import { type FileHandle, lstat, open, realpath } from "node:fs/promises";
import { dirname, isAbsolute, normalize } from "node:path";
import { BusinessRuleError } from "@repo/core/domain/error";

export type NodeDriveConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  picker: Readonly<{ appId: string; apiKey: string }>;
  activeKid: string;
  keys: ReadonlyMap<string, Buffer>;
}>;

const unavailable = () =>
  new BusinessRuleError(
    "DRIVE_UNAVAILABLE",
    "Driveの保護設定を利用できません。",
  );
const kidPattern = /^[A-Za-z0-9_-]{1,32}$/;

function record(
  value: unknown,
  names: readonly string[],
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== names.length ||
    !names.every((name) => Object.hasOwn(value, name))
  )
    throw unavailable();
  return value as Record<string, unknown>;
}

function boundedString(value: unknown, maximum: number): string {
  if (
    typeof value !== "string" ||
    !value.length ||
    Buffer.byteLength(value, "utf8") > maximum
  )
    throw unavailable();
  const bytes = Buffer.from(value, "utf8");
  try {
    if (bytes.toString("utf8") !== value) throw unavailable();
    return value;
  } finally {
    bytes.fill(0);
  }
}

function absolutePath(value: unknown): string {
  const path = boundedString(value, 4096);
  if (!isAbsolute(path) || normalize(path) !== path || path.includes("\0"))
    throw unavailable();
  return path;
}

function sameMetadata(left: BigIntStats, right: BigIntStats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function secureMetadata(
  stats: BigIntStats,
  uid: bigint,
  directory: boolean,
): boolean {
  return (
    stats.uid === uid &&
    !stats.isSymbolicLink() &&
    (directory ? stats.isDirectory() : stats.isFile()) &&
    (stats.mode & 0o7777n) === (directory ? 0o700n : 0o600n)
  );
}

async function closeSecret(
  handle: FileHandle,
  result: Buffer | undefined,
): Promise<void> {
  try {
    await handle.close();
  } catch {
    result?.fill(0);
    throw unavailable();
  }
}

async function readSecret(path: string, maximum: number): Promise<Buffer> {
  const uid = process.getuid?.();
  if (uid === undefined) throw unavailable();
  const parentPath = dirname(path);
  const parent = await lstat(parentPath, { bigint: true });
  if (
    !secureMetadata(parent, BigInt(uid), true) ||
    (await realpath(parentPath)) !== parentPath
  )
    throw unavailable();
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  const bytes = Buffer.alloc(maximum + 1);
  let result: Buffer | undefined;
  try {
    const before = await handle.stat({ bigint: true });
    const pathBefore = await lstat(path, { bigint: true });
    if (
      !secureMetadata(before, BigInt(uid), false) ||
      !sameMetadata(before, pathBefore) ||
      before.size < 1n ||
      before.size > BigInt(maximum)
    )
      throw unavailable();
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await handle.read(
        bytes,
        length,
        bytes.length - length,
        length,
      );
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(path, { bigint: true });
    const parentAfter = await lstat(parentPath, { bigint: true });
    if (
      length !== Number(before.size) ||
      length > maximum ||
      !sameMetadata(before, after) ||
      !sameMetadata(before, pathAfter) ||
      !sameMetadata(parent, parentAfter) ||
      (await realpath(parentPath)) !== parentPath
    )
      throw unavailable();
    result = Buffer.from(bytes.subarray(0, length));
    return result;
  } finally {
    bytes.fill(0);
    await closeSecret(handle, result);
  }
}

async function readJson(path: string): Promise<unknown> {
  const bytes = await readSecret(path, 16_384);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally {
    bytes.fill(0);
  }
}

function callbackUrl(appUrl: string, allowLoopback: boolean): string {
  if (appUrl.length > 4096 || !/^https?:\/\/[^/?#\\]+\/?$/.test(appUrl))
    throw unavailable();
  const url = new URL(appUrl);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(allowLoopback && loopback && url.protocol === "http:")) ||
    appUrl !== appUrl.trim() ||
    [...appUrl].some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    throw unavailable();
  return new URL("/auth/drive/callback", url.origin).href;
}

/** Undefined means unconfigured; an explicit invalid configuration fails closed. */
export async function loadDriveConfig(
  configFile: string | undefined,
  appUrl: string,
  allowLoopback = false,
): Promise<NodeDriveConfig | null> {
  if (configFile === undefined) return null;
  const keys = new Map<string, Buffer>();
  try {
    const callback = callbackUrl(appUrl, allowLoopback);
    const config = record(await readJson(absolutePath(configFile)), [
      "version",
      "clientId",
      "clientSecret",
      "keyringFile",
      "picker",
    ]);
    if (config.version !== 1) throw unavailable();
    const clientId = boundedString(config.clientId, 1024);
    const clientSecret = boundedString(config.clientSecret, 4096);
    const picker = record(config.picker, ["appId", "apiKey"]);
    const appId = boundedString(picker.appId, 32);
    const apiKey = boundedString(picker.apiKey, 256);
    if (
      !/^[0-9]{1,32}$/.test(appId) ||
      [...apiKey].some((character) => character.charCodeAt(0) > 127)
    )
      throw unavailable();
    const keyring = record(await readJson(absolutePath(config.keyringFile)), [
      "version",
      "activeKid",
      "keys",
    ]);
    if (
      keyring.version !== 1 ||
      typeof keyring.activeKid !== "string" ||
      !kidPattern.test(keyring.activeKid) ||
      !Array.isArray(keyring.keys) ||
      keyring.keys.length < 1 ||
      keyring.keys.length > 8
    )
      throw unavailable();
    const paths = new Set<string>();
    for (const entry of keyring.keys) {
      const descriptor = record(entry, ["kid", "keyFile"]);
      if (
        typeof descriptor.kid !== "string" ||
        !kidPattern.test(descriptor.kid) ||
        keys.has(descriptor.kid)
      )
        throw unavailable();
      const path = absolutePath(descriptor.keyFile);
      if (paths.has(path)) throw unavailable();
      paths.add(path);
      const key = await readSecret(path, 32);
      if (
        key.length !== 32 ||
        [...keys.values()].some((other) => timingSafeEqual(other, key))
      ) {
        key.fill(0);
        throw unavailable();
      }
      keys.set(descriptor.kid, key);
    }
    if (!keys.has(keyring.activeKid)) throw unavailable();
    return {
      clientId,
      clientSecret,
      callbackUrl: callback,
      picker: { appId, apiKey },
      activeKid: keyring.activeKid,
      keys,
    };
  } catch {
    for (const key of keys.values()) key.fill(0);
    throw unavailable();
  }
}
