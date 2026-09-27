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
import type {
  AuthenticationBinding,
  AuthenticationSecretProtector,
} from "@repo/core/application/account/ports";
import { ConflictError } from "@repo/core/application/errors";

const unavailable = () =>
  new ConflictError(
    "AUTH_KEY_UNAVAILABLE",
    "認証設定を利用できません。通常のパスワード認証は利用できます。",
  );
const aad = (b: AuthenticationBinding) =>
  Buffer.from(
    JSON.stringify([
      "hollow-google-pkce-v1",
      b.attemptId,
      b.mode,
      b.browser.hash,
      b.browser.epoch,
    ]),
  );

export class NodeAuthenticationSecretProtector
  implements AuthenticationSecretProtector
{
  private constructor(private readonly key: KeyObject | null) {}
  static async load(file: string | undefined) {
    if (!file || !isAbsolute(file))
      return new NodeAuthenticationSecretProtector(null);
    try {
      const parent = await lstat(dirname(file));
      if (
        !parent.isDirectory() ||
        parent.isSymbolicLink() ||
        parent.uid !== process.getuid?.() ||
        (parent.mode & 0o777) !== 0o700
      )
        return new NodeAuthenticationSecretProtector(null);
      const handle = await open(
        file,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const stat = await handle.stat();
        if (
          !stat.isFile() ||
          stat.uid !== process.getuid?.() ||
          (stat.mode & 0o777) !== 0o600 ||
          stat.size !== 32
        )
          return new NodeAuthenticationSecretProtector(null);
        const bytes = Buffer.alloc(33);
        try {
          const { bytesRead } = await handle.read(bytes, 0, 33, 0);
          if (bytesRead !== 32)
            return new NodeAuthenticationSecretProtector(null);
          return new NodeAuthenticationSecretProtector(
            createSecretKey(bytes.subarray(0, 32)),
          );
        } finally {
          bytes.fill(0);
        }
      } finally {
        await handle.close();
      }
    } catch {
      return new NodeAuthenticationSecretProtector(null);
    }
  }
  available() {
    return this.key !== null;
  }
  protect(value: string, binding: AuthenticationBinding) {
    if (!this.key || !/^[A-Za-z0-9_-]{43,128}$/.test(value))
      throw unavailable();
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
  reveal(envelope: string, binding: AuthenticationBinding) {
    if (!this.key || envelope.length > 512) throw unavailable();
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
      if (!/^[A-Za-z0-9_-]{43,128}$/.test(value)) throw unavailable();
      return value;
    } catch {
      throw unavailable();
    }
  }
}
