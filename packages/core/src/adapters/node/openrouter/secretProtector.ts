import {
  createCipheriv,
  createDecipheriv,
  createSecretKey,
  type KeyObject,
  randomBytes,
} from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { ConflictError } from "@repo/core/application/errors";
import type {
  OpenRouterSecretBinding,
  OpenRouterSecretProtector,
} from "@repo/core/application/integration/openRouter/ports";

const unavailable = () =>
  new ConflictError(
    "OPENROUTER_KEY_UNAVAILABLE",
    "連携の保護設定を利用できません。通常の取り込みは利用できます。",
  );
const aad = (b: OpenRouterSecretBinding) =>
  Buffer.from(
    JSON.stringify(
      b.purpose === "credential"
        ? ["hollow-openrouter-v1", b.purpose, b.accountId, b.epoch]
        : [
            "hollow-openrouter-v1",
            b.purpose,
            b.accountId,
            b.attemptId,
            b.browser.hash,
            b.browser.epoch,
          ],
    ),
  );

export class NodeOpenRouterSecretProtector
  implements OpenRouterSecretProtector
{
  private constructor(private readonly key: KeyObject | null) {}
  static async load(file: string | undefined) {
    if (!file || !isAbsolute(file))
      return new NodeOpenRouterSecretProtector(null);
    try {
      const parent = await lstat(dirname(file));
      if (
        !parent.isDirectory() ||
        parent.isSymbolicLink() ||
        parent.uid !== process.getuid?.() ||
        (parent.mode & 0o777) !== 0o700
      )
        return new NodeOpenRouterSecretProtector(null);
      const handle = await open(
        file,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const before = await handle.stat();
        if (
          !before.isFile() ||
          before.uid !== process.getuid?.() ||
          (before.mode & 0o777) !== 0o600 ||
          before.size !== 32
        )
          return new NodeOpenRouterSecretProtector(null);
        const bytes = Buffer.alloc(33);
        try {
          const { bytesRead } = await handle.read(bytes, 0, 33, 0);
          const after = await handle.stat();
          if (
            bytesRead !== 32 ||
            after.size !== before.size ||
            after.mtimeMs !== before.mtimeMs
          )
            return new NodeOpenRouterSecretProtector(null);
          return new NodeOpenRouterSecretProtector(
            createSecretKey(bytes.subarray(0, 32)),
          );
        } finally {
          bytes.fill(0);
        }
      } finally {
        await handle.close();
      }
    } catch {
      return new NodeOpenRouterSecretProtector(null);
    }
  }
  available() {
    return this.key !== null;
  }
  protect(value: string, binding: OpenRouterSecretBinding) {
    if (!this.key || !/^[\x21-\x7e]{1,65536}$/.test(value)) throw unavailable();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv, {
      authTagLength: 16,
    });
    cipher.setAAD(aad(binding));
    const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64url"),
      body.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
    ].join(".");
  }
  reveal(envelope: string, binding: OpenRouterSecretBinding) {
    if (!this.key || envelope.length > 88_000) throw unavailable();
    try {
      const [version, iv, body, tag, ...rest] = envelope.split(".");
      if (
        version !== "v1" ||
        !iv ||
        !body ||
        !tag ||
        rest.length ||
        ![iv, body, tag].every((v) => /^[A-Za-z0-9_-]+$/.test(v))
      )
        throw unavailable();
      const nonce = Buffer.from(iv, "base64url");
      const auth = Buffer.from(tag, "base64url");
      if (nonce.length !== 12 || auth.length !== 16) throw unavailable();
      const decipher = createDecipheriv("aes-256-gcm", this.key, nonce, {
        authTagLength: 16,
      });
      decipher.setAAD(aad(binding));
      decipher.setAuthTag(auth);
      const value = Buffer.concat([
        decipher.update(Buffer.from(body, "base64url")),
        decipher.final(),
      ]).toString("utf8");
      if (!/^[\x21-\x7e]{1,65536}$/.test(value)) throw unavailable();
      return value;
    } catch {
      throw unavailable();
    }
  }
}
