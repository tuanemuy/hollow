import { type BigIntStats, constants } from "node:fs";
import { type FileHandle, lstat, open, realpath } from "node:fs/promises";
import { isIP } from "node:net";
import { dirname, isAbsolute, normalize } from "node:path";
import { SystemError, SystemErrorCode } from "../../../application/errors";

export type NodeSmtpConfig = Readonly<{
  host: string;
  port: number;
  tls: "implicit" | "starttls";
  serverName: string;
  from: string;
  auth: Readonly<{ user: string; password: string }>;
}>;

const unavailable = () =>
  new SystemError(
    SystemErrorCode.ExternalApiError,
    "メールの送信設定を利用できません。",
  );

function record(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key))
  )
    throw unavailable();
  return value as Record<string, unknown>;
}

function text(value: unknown, maximum: number): string {
  if (
    typeof value !== "string" ||
    !value.length ||
    Buffer.byteLength(value, "utf8") > maximum ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
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
  const path = text(value, 4096);
  if (!isAbsolute(path) || normalize(path) !== path) throw unavailable();
  return path;
}

function hostname(value: unknown): string {
  const host = text(value, 253);
  if (
    !host
      .split(".")
      .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  )
    throw unavailable();
  return host;
}

function address(value: unknown): string {
  const from = text(value, 254);
  const parts = from.split("@");
  const local = parts[0];
  const domain = parts[1];
  if (
    parts.length !== 2 ||
    !local ||
    !domain ||
    local.length > 64 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  )
    throw unavailable();
  hostname(domain);
  return from;
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
    if (
      length !== Number(before.size) ||
      length > maximum ||
      !sameMetadata(before, await handle.stat({ bigint: true })) ||
      !sameMetadata(before, await lstat(path, { bigint: true })) ||
      !sameMetadata(parent, await lstat(parentPath, { bigint: true })) ||
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

async function closeSecret(handle: FileHandle, result: Buffer | undefined) {
  try {
    await handle.close();
  } catch {
    result?.fill(0);
    throw unavailable();
  }
}

/** Reads only owned configuration files; never opens a network connection. */
export async function loadNodeSmtpConfig(
  file: string,
): Promise<NodeSmtpConfig> {
  let json: Buffer | undefined;
  let password: Buffer | undefined;
  try {
    json = await readSecret(absolutePath(file), 16_384);
    const config = record(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(json)),
      ["version", "host", "port", "tls", "serverName", "from", "auth"],
    );
    if (
      config.version !== 1 ||
      typeof config.port !== "number" ||
      !Number.isInteger(config.port) ||
      config.port < 1 ||
      config.port > 65535 ||
      (config.tls !== "implicit" && config.tls !== "starttls")
    )
      throw unavailable();
    const host = text(config.host, 253);
    if (!isIP(host)) hostname(host);
    const serverName = hostname(config.serverName);
    const from = address(config.from);
    const auth = record(config.auth, ["user", "passwordFile"]);
    const user = text(auth.user, 1024);
    password = await readSecret(absolutePath(auth.passwordFile), 4096);
    return {
      host,
      port: config.port,
      tls: config.tls,
      serverName,
      from,
      auth: {
        user,
        password: text(
          new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
            password,
          ),
          4096,
        ),
      },
    };
  } catch {
    throw unavailable();
  } finally {
    json?.fill(0);
    password?.fill(0);
  }
}
