import {
  createCipheriv,
  createDecipheriv,
  createSecretKey,
  type KeyObject,
  randomBytes,
} from "node:crypto";
import type {
  DriveSecretBinding,
  DriveSecretProtector,
} from "@repo/core/application/integration/drive/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { NodeDriveConfig } from "./config";

const maximumPlaintext = 49_095;
const maximumEnvelope = 65_536;
const kidPattern = /^[A-Za-z0-9_-]{1,32}$/;
const unavailable = () =>
  new BusinessRuleError(
    "DRIVE_UNAVAILABLE",
    "Driveの保護設定を利用できません。",
  );

function aad(binding: DriveSecretBinding, kid: string): Buffer {
  const prefix = [
    "hollow-drive-v1",
    "d1",
    kid,
    binding.purpose,
    binding.accountId,
  ];
  switch (binding.purpose) {
    case "credential":
      return Buffer.from(
        JSON.stringify([
          ...prefix,
          binding.subject,
          binding.epoch,
          binding.credentialVersion,
        ]),
      );
    case "resource-key":
      return Buffer.from(
        JSON.stringify([
          ...prefix,
          binding.subject,
          binding.epoch,
          binding.fileId,
        ]),
      );
    case "verifier":
    case "candidate":
    case "folder-confirmation":
      return Buffer.from(
        JSON.stringify([
          ...prefix,
          binding.attemptId,
          binding.browserHash,
          binding.browserEpoch,
        ]),
      );
  }
}

function decode(value: string, buffers: Buffer[]): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw unavailable();
  const bytes = Buffer.from(value, "base64url");
  buffers.push(bytes);
  if (bytes.toString("base64url") !== value) throw unavailable();
  return bytes;
}

/** Keys are copied into private KeyObjects; the caller retains ownership of input buffers. */
export function createDriveSecretProtector(
  config: Pick<NodeDriveConfig, "activeKid" | "keys"> | null,
): DriveSecretProtector {
  const keys = new Map<string, KeyObject>();
  if (config !== null) {
    try {
      if (
        !kidPattern.test(config.activeKid) ||
        config.keys.size < 1 ||
        config.keys.size > 8 ||
        !config.keys.has(config.activeKid)
      )
        throw unavailable();
      for (const [kid, bytes] of config.keys) {
        if (!kidPattern.test(kid) || bytes.length !== 32) throw unavailable();
        keys.set(kid, createSecretKey(bytes));
      }
    } catch {
      throw unavailable();
    }
  }
  const activeKid = config?.activeKid;
  return {
    available: () => activeKid !== undefined,
    protect(value, binding) {
      const buffers: Buffer[] = [];
      try {
        const key = activeKid === undefined ? undefined : keys.get(activeKid);
        if (!key || activeKid === undefined || value.length > maximumPlaintext)
          throw unavailable();
        const plaintext = Buffer.from(value, "utf8");
        buffers.push(plaintext);
        if (
          plaintext.length < 1 ||
          plaintext.length > maximumPlaintext ||
          plaintext.toString("utf8") !== value
        )
          throw unavailable();
        const iv = randomBytes(12);
        const associated = aad(binding, activeKid);
        buffers.push(iv, associated);
        const cipher = createCipheriv("aes-256-gcm", key, iv, {
          authTagLength: 16,
        });
        cipher.setAAD(associated);
        const update = cipher.update(plaintext);
        buffers.push(update);
        const final = cipher.final();
        buffers.push(final);
        const ciphertext = Buffer.concat([update, final]);
        const tag = cipher.getAuthTag();
        buffers.push(ciphertext, tag);
        const envelope = [
          "d1",
          activeKid,
          iv.toString("base64url"),
          ciphertext.toString("base64url"),
          tag.toString("base64url"),
        ].join(".");
        if (envelope.length > maximumEnvelope) throw unavailable();
        return envelope;
      } catch {
        throw unavailable();
      } finally {
        for (const buffer of buffers) buffer.fill(0);
      }
    },
    reveal(envelope, binding) {
      const buffers: Buffer[] = [];
      try {
        if (envelope.length > maximumEnvelope) throw unavailable();
        const [version, kid, nonce, body, authentication, ...extra] =
          envelope.split(".");
        if (
          version !== "d1" ||
          !kid ||
          !kidPattern.test(kid) ||
          !nonce ||
          !body ||
          !authentication ||
          extra.length
        )
          throw unavailable();
        const key = keys.get(kid);
        if (!key) throw unavailable();
        const iv = decode(nonce, buffers);
        const ciphertext = decode(body, buffers);
        const tag = decode(authentication, buffers);
        if (
          iv.length !== 12 ||
          tag.length !== 16 ||
          ciphertext.length < 1 ||
          ciphertext.length > maximumPlaintext
        )
          throw unavailable();
        const associated = aad(binding, kid);
        buffers.push(associated);
        const decipher = createDecipheriv("aes-256-gcm", key, iv, {
          authTagLength: 16,
        });
        decipher.setAAD(associated);
        decipher.setAuthTag(tag);
        const update = decipher.update(ciphertext);
        buffers.push(update);
        const final = decipher.final();
        buffers.push(final);
        const plaintext = Buffer.concat([update, final]);
        buffers.push(plaintext);
        if (plaintext.length < 1 || plaintext.length > maximumPlaintext)
          throw unavailable();
        return new TextDecoder("utf-8", {
          fatal: true,
          ignoreBOM: true,
        }).decode(plaintext);
      } catch {
        throw unavailable();
      } finally {
        for (const buffer of buffers) buffer.fill(0);
      }
    },
  };
}
