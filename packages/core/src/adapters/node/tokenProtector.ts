import {
  createCipheriv,
  createDecipheriv,
  createSecretKey,
  type KeyObject,
  randomBytes,
} from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  TokenBinding,
  TokenProtector,
} from "@repo/core/application/ports/tokenProtector";
import { BusinessRuleError } from "@repo/core/domain/error";

const unavailable = () =>
  new BusinessRuleError(
    "INVITATION_KEY_UNAVAILABLE",
    "招待リンクの保護設定を確認してください。通常のサインインと招待の取消は利用できます。",
  );
const aad = (binding: TokenBinding) =>
  Buffer.from(
    JSON.stringify([
      "hollow-invitation-v1",
      binding.invitationId,
      binding.generation,
    ]),
  );
export class NodeTokenProtector implements TokenProtector {
  private constructor(private readonly key: KeyObject | null) {}
  static async load(path: string | undefined) {
    if (!path) return new NodeTokenProtector(null);
    try {
      const [stat, parent] = await Promise.all([
        lstat(path),
        lstat(dirname(path)),
      ]);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.uid !== process.getuid?.() ||
        (stat.mode & 0o777) !== 0o600 ||
        !parent.isDirectory() ||
        parent.isSymbolicLink() ||
        (parent.mode & 0o777) !== 0o700 ||
        stat.size !== 32
      )
        return new NodeTokenProtector(null);
      return new NodeTokenProtector(createSecretKey(await readFile(path)));
    } catch {
      return new NodeTokenProtector(null);
    }
  }
  protect(token: string, binding: TokenBinding) {
    if (!this.key) throw unavailable();
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, nonce, {
      authTagLength: 16,
    });
    cipher.setAAD(aad(binding));
    const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    return [
      "v1",
      nonce.toString("base64url"),
      body.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
    ].join(".");
  }
  reveal(envelope: string, binding: TokenBinding) {
    if (!this.key) throw unavailable();
    try {
      const [version, iv, body, tag, ...rest] = envelope.split(".");
      if (
        version !== "v1" ||
        !iv ||
        !body ||
        !tag ||
        rest.length ||
        envelope.length > 2048
      )
        throw Error();
      const nonce = Buffer.from(iv, "base64url");
      const auth = Buffer.from(tag, "base64url");
      if (nonce.length !== 12 || auth.length !== 16) throw Error();
      const decipher = createDecipheriv("aes-256-gcm", this.key, nonce, {
        authTagLength: 16,
      });
      decipher.setAAD(aad(binding));
      decipher.setAuthTag(auth);
      return Buffer.concat([
        decipher.update(Buffer.from(body, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw unavailable();
    }
  }
}
