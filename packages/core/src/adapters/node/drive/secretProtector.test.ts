import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { DriveSecretBinding } from "@repo/core/application/integration/drive/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import { expect, test } from "vitest";
import { createDriveSecretProtector } from "./secretProtector";

const activeKid = "a".repeat(32);
const retiredKid = "r".repeat(32);
const credential: DriveSecretBinding = {
  purpose: "credential",
  accountId: "account",
  subject: "subject",
  epoch: 1,
  credentialVersion: 1,
};
const bindings: readonly DriveSecretBinding[] = [
  credential,
  {
    purpose: "backup-session",
    accountId: "account",
    subject: "subject",
    epoch: 1,
    transferId: "transfer",
    fileId: "file",
  },
  ...(["backup-record-file-key", "backup-record-folder-key"] as const).map(
    (purpose) => ({
      purpose,
      accountId: "account",
      subject: "subject",
      recordId: "record",
      fileId: "file",
    }),
  ),
  {
    purpose: "resource-key",
    accountId: "account",
    subject: "subject",
    epoch: 1,
    fileId: "file",
  },
  ...(["verifier", "candidate", "folder-confirmation"] as const).map(
    (purpose) => ({
      purpose,
      accountId: "account",
      attemptId: "attempt",
      browserHash: "browser",
      browserEpoch: 1,
    }),
  ),
];

async function selfKeys(): Promise<Map<string, Buffer>> {
  const root = process.env.DRIVE_S3_TEST_ROOT;
  if (!root || !isAbsolute(root)) throw new Error("DRIVE_S3_FIXTURE_REQUIRED");
  const active = await readFile(join(root, "crypto-fixture", "active.key"));
  try {
    const retired = await readFile(join(root, "crypto-fixture", "retired.key"));
    if (
      active.length !== 32 ||
      retired.length !== 32 ||
      active.equals(retired)
    ) {
      retired.fill(0);
      throw new Error("DRIVE_S3_FIXTURE_INVALID");
    }
    return new Map([
      [activeKid, active],
      [retiredKid, retired],
    ]);
  } catch {
    active.fill(0);
    throw new Error("DRIVE_S3_FIXTURE_INVALID");
  }
}

function rejects(work: () => unknown): boolean {
  try {
    work();
    return false;
  } catch (error) {
    return (
      error instanceof BusinessRuleError &&
      error.code === "DRIVE_UNAVAILABLE" &&
      error.cause === undefined
    );
  }
}

function differences(
  binding: DriveSecretBinding,
): readonly DriveSecretBinding[] {
  const common = { ...binding, accountId: "other-account" };
  switch (binding.purpose) {
    case "backup-session":
      return [
        common,
        { ...binding, subject: "other-subject" },
        { ...binding, epoch: 2 },
        { ...binding, transferId: "other-transfer" },
        { ...binding, fileId: "other-file" },
      ];
    case "backup-record-file-key":
    case "backup-record-folder-key":
      return [
        common,
        { ...binding, subject: "other-subject" },
        { ...binding, recordId: "other-record" },
        { ...binding, fileId: "other-file" },
      ];
    case "credential":
      return [
        common,
        { ...binding, subject: "other-subject" },
        { ...binding, epoch: 2 },
        { ...binding, credentialVersion: 2 },
      ];
    case "resource-key":
      return [
        common,
        { ...binding, subject: "other-subject" },
        { ...binding, epoch: 2 },
        { ...binding, fileId: "other-file" },
      ];
    case "verifier":
    case "candidate":
    case "folder-confirmation":
      return [
        common,
        { ...binding, attemptId: "other-attempt" },
        { ...binding, browserHash: "other-browser" },
        { ...binding, browserEpoch: 2 },
      ];
  }
}

test("family 21: two-key encryption and retained-key decryption", async () => {
  const keys = await selfKeys();
  try {
    const retired = createDriveSecretProtector({ activeKid: retiredKid, keys });
    const active = createDriveSecretProtector({ activeKid, keys });
    const oldEnvelope = retired.protect("synthetic-old", credential);
    const newEnvelope = active.protect("synthetic-new", credential);
    expect(active.available()).toBe(true);
    expect(newEnvelope.startsWith(`d1.${activeKid}.`)).toBe(true);
    expect(oldEnvelope.startsWith(`d1.${retiredKid}.`)).toBe(true);
    expect(active.reveal(oldEnvelope, credential) === "synthetic-old").toBe(
      true,
    );
    expect(active.reveal(newEnvelope, credential) === "synthetic-new").toBe(
      true,
    );
    for (const key of keys.values()) key.fill(0);
    expect(active.reveal(oldEnvelope, credential) === "synthetic-old").toBe(
      true,
    );
  } finally {
    for (const key of keys.values()) key.fill(0);
  }
});

test("family 22: purpose/AAD, tampering, unknown kid and UTF-8 envelope boundary", async () => {
  const keys = await selfKeys();
  try {
    const protector = createDriveSecretProtector({ activeKid, keys });
    const unavailable = createDriveSecretProtector(null);
    expect(unavailable.available()).toBe(false);
    expect(rejects(() => unavailable.protect("synthetic", credential))).toBe(
      true,
    );
    for (const binding of bindings) {
      const envelope = protector.protect("synthetic 日本語", binding);
      expect(protector.reveal(envelope, binding) === "synthetic 日本語").toBe(
        true,
      );
      for (const changed of differences(binding)) {
        expect(rejects(() => protector.reveal(envelope, changed))).toBe(true);
      }
      for (const other of bindings.filter(
        (candidate) => candidate.purpose !== binding.purpose,
      )) {
        expect(rejects(() => protector.reveal(envelope, other))).toBe(true);
      }
      const parts = envelope.split(".");
      const ciphertext = parts[3];
      if (!ciphertext) throw new Error("DRIVE_S3_ENVELOPE_SHAPE");
      parts[3] = (ciphertext[0] === "A" ? "B" : "A") + ciphertext.slice(1);
      expect(rejects(() => protector.reveal(parts.join("."), binding))).toBe(
        true,
      );
      expect(
        rejects(() =>
          protector.reveal(
            envelope.replace(`.${activeKid}.`, ".unknown."),
            binding,
          ),
        ),
      ).toBe(true);
      expect(rejects(() => protector.reveal(`${envelope}=`, binding))).toBe(
        true,
      );
      expect(rejects(() => unavailable.reveal(envelope, binding))).toBe(true);
    }
    const boundary = "あ".repeat(16_365);
    const envelope = protector.protect(boundary, credential);
    expect(Buffer.byteLength(boundary, "utf8") === 49_095).toBe(true);
    expect(envelope.length === 65_536).toBe(true);
    expect(protector.reveal(envelope, credential) === boundary).toBe(true);
    expect(rejects(() => protector.protect(`${boundary}a`, credential))).toBe(
      true,
    );
    expect(rejects(() => protector.protect("", credential))).toBe(true);
    expect(rejects(() => protector.protect("\ud800", credential))).toBe(true);
    expect(rejects(() => protector.reveal(`${envelope}A`, credential))).toBe(
      true,
    );
  } finally {
    for (const key of keys.values()) key.fill(0);
  }
});
