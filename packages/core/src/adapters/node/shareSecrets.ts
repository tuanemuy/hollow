import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  ShareTokenBinding,
  ShareTokenProtector,
} from "@repo/core/application/ports/shareSecrets";
import { BusinessRuleError } from "@repo/core/domain/error";

const keyIdPattern = /^[a-z0-9-]{1,40}$/;
const unavailable = () =>
  new BusinessRuleError(
    "SHARE_KEY_UNAVAILABLE",
    "共有リンクの保護を利用できません。しばらくしてから再試行してください。",
  );

function aad(binding: ShareTokenBinding) {
  if (
    !binding.noteId ||
    !Number.isSafeInteger(binding.generation) ||
    binding.generation < 0
  )
    throw unavailable();
  return Buffer.from(
    JSON.stringify([
      "hollow-note-share-v1",
      binding.noteId,
      binding.generation,
    ]),
  );
}

function decode(value: string, bytes?: number) {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw unavailable();
  const decoded = Buffer.from(value, "base64url");
  if (
    decoded.toString("base64url") !== value ||
    (bytes !== undefined && decoded.length !== bytes)
  )
    throw unavailable();
  return decoded;
}

export class NodeShareTokenProtector implements ShareTokenProtector {
  private constructor(
    private readonly activeKeyId: string,
    private readonly keys: ReadonlyMap<string, Buffer>,
  ) {}

  static async load(
    options: Readonly<{
      directory: string;
      activeKeyId: string;
      keyIds: readonly string[];
    }>,
  ): Promise<NodeShareTokenProtector> {
    const keys = new Map<string, Buffer>();
    try {
      const uid = process.getuid?.();
      if (
        uid === undefined ||
        !keyIdPattern.test(options.activeKeyId) ||
        !options.keyIds.includes(options.activeKeyId) ||
        options.keyIds.some((id) => !keyIdPattern.test(id)) ||
        new Set(options.keyIds).size !== options.keyIds.length
      )
        throw unavailable();
      const directory = resolve(options.directory);
      if ((await realpath(directory)) !== directory) throw unavailable();
      const before = await lstat(directory);
      if (
        !before.isDirectory() ||
        before.uid !== uid ||
        (before.mode & 0o7777) !== 0o700
      )
        throw unavailable();
      const dir = await open(
        directory,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      );
      try {
        const opened = await dir.stat();
        if (opened.dev !== before.dev || opened.ino !== before.ino)
          throw unavailable();
        for (const id of options.keyIds) {
          const key = await open(
            join(directory, `${id}.key`),
            constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
          );
          try {
            const stat = await key.stat();
            if (
              !stat.isFile() ||
              stat.uid !== uid ||
              (stat.mode & 0o7777) !== 0o600 ||
              stat.size !== 32
            )
              throw unavailable();
            const data = Buffer.alloc(33);
            let length = 0;
            while (length < data.length) {
              const read = await key.read(
                data,
                length,
                data.length - length,
                length,
              );
              if (!read.bytesRead) break;
              length += read.bytesRead;
            }
            const after = await key.stat();
            if (
              length !== 32 ||
              after.size !== 32 ||
              after.uid !== uid ||
              (after.mode & 0o7777) !== 0o600
            )
              throw unavailable();
            keys.set(id, Buffer.from(data.subarray(0, 32)));
            data.fill(0);
          } finally {
            await key.close();
          }
        }
        const after = await lstat(directory);
        if (
          !after.isDirectory() ||
          after.dev !== opened.dev ||
          after.ino !== opened.ino ||
          after.uid !== uid ||
          (after.mode & 0o7777) !== 0o700
        )
          throw unavailable();
      } finally {
        await dir.close();
      }
      return new NodeShareTokenProtector(options.activeKeyId, keys);
    } catch {
      for (const key of keys.values()) key.fill(0);
      return new NodeShareTokenProtector(options.activeKeyId, new Map());
    }
  }

  protect(token: string, binding: ShareTokenBinding): string {
    try {
      const key = this.keys.get(this.activeKeyId);
      if (!key) throw unavailable();
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv, {
        authTagLength: 16,
      });
      cipher.setAAD(aad(binding));
      const encrypted = Buffer.concat([
        cipher.update(token, "utf8"),
        cipher.final(),
      ]);
      return [
        "v1",
        this.activeKeyId,
        iv.toString("base64url"),
        encrypted.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
      ].join(".");
    } catch {
      throw unavailable();
    }
  }

  reveal(envelope: string, binding: ShareTokenBinding): string {
    try {
      const parts = envelope.split(".");
      const [version, id, iv, encrypted, tag] = parts;
      if (
        parts.length !== 5 ||
        version !== "v1" ||
        !id ||
        !keyIdPattern.test(id) ||
        iv === undefined ||
        encrypted === undefined ||
        tag === undefined
      )
        throw unavailable();
      const key = this.keys.get(id);
      if (!key) throw unavailable();
      const decipher = createDecipheriv("aes-256-gcm", key, decode(iv, 12), {
        authTagLength: 16,
      });
      decipher.setAAD(aad(binding));
      decipher.setAuthTag(decode(tag, 16));
      return Buffer.concat([
        decipher.update(decode(encrypted)),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw unavailable();
    }
  }

  needsRotation(envelope: string): boolean {
    return envelope.split(".")[1] !== this.activeKeyId;
  }
}
