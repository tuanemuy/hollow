import { createCipheriv, randomBytes } from "node:crypto";
import {
  chmod,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Mail } from "@repo/core/application/ports/mailer";
import { afterEach, describe, expect, it } from "vitest";
import { LocalInvitationMailer } from "../invitationMailer";
import { NodeTokenProtector } from "../tokenProtector";

const roots: string[] = [];
const binding = { invitationId: "fixture-invitation", generation: 1 };
const token = "fixture-token-never-used-for-authentication";
const keyError = { code: "INVITATION_KEY_UNAVAILABLE" };
const mail: Mail = {
  to: "invited@example.test",
  subject: "Fixture invitation",
  text: "A local-only invitation fixture; no usable invitation URL.",
};

async function temporaryRoot() {
  const root = await mkdtemp(join(tmpdir(), "hollow-invitation-adapter-test-"));
  roots.push(root);
  await chmod(root, 0o700);
  return root;
}

async function protectedFixture() {
  const root = await temporaryRoot();
  const keyFile = join(root, "fixture.key");
  await writeFile(keyFile, randomBytes(32), { flag: "wx", mode: 0o600 });
  return { root, keyFile, protector: await NodeTokenProtector.load(keyFile) };
}

function unavailable(protector: NodeTokenProtector) {
  expect(() => protector.protect(token, binding)).toThrowError(
    expect.objectContaining(keyError),
  );
  expect(() =>
    protector.reveal("v1.invalid.invalid.invalid", binding),
  ).toThrowError(expect.objectContaining(keyError));
}

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

describe("NodeTokenProtector", () => {
  it("round-trips with the same protected key after reloading and uses fresh envelopes", async () => {
    const { root, keyFile, protector } = await protectedFixture();
    const first = protector.protect(token, binding);
    const second = protector.protect(token, binding);
    expect(first === second).toBe(false);
    expect(first.includes(token)).toBe(false);
    expect(protector.reveal(first, binding)).toBe(token);
    expect(
      (await NodeTokenProtector.load(keyFile)).reveal(first, binding),
    ).toBe(token);
    expect((await stat(root)).mode & 0o777).toBe(0o700);
    expect((await stat(keyFile)).mode & 0o777).toBe(0o600);
  });

  it("authenticates the invitation identity and generation", async () => {
    const { protector } = await protectedFixture();
    const envelope = protector.protect(token, binding);
    for (const changed of [
      { ...binding, invitationId: "another-invitation" },
      { ...binding, generation: 2 },
    ])
      expect(() => protector.reveal(envelope, changed)).toThrowError(
        expect.objectContaining(keyError),
      );
  });

  it("rejects an otherwise valid AES-GCM envelope authenticated for a different purpose", async () => {
    const { keyFile, protector } = await protectedFixture();
    const key = await readFile(keyFile);
    try {
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, nonce, {
        authTagLength: 16,
      });
      cipher.setAAD(
        Buffer.from(
          JSON.stringify([
            "hollow-other-purpose-v1",
            binding.invitationId,
            binding.generation,
          ]),
        ),
      );
      const body = Buffer.concat([
        cipher.update(token, "utf8"),
        cipher.final(),
      ]);
      const envelope = [
        "v1",
        nonce.toString("base64url"),
        body.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
      ].join(".");
      expect(() => protector.reveal(envelope, binding)).toThrowError(
        expect.objectContaining(keyError),
      );
    } finally {
      key.fill(0);
    }
  });

  it("rejects ciphertext encrypted with another valid protected key", async () => {
    const first = await protectedFixture();
    const other = await protectedFixture();
    const envelope = first.protector.protect(token, binding);
    expect(() => other.protector.reveal(envelope, binding)).toThrowError(
      expect.objectContaining(keyError),
    );
  });

  it("rejects modified ciphertext, tag, and nonce without exposing token contents", async () => {
    const { protector } = await protectedFixture();
    const original = protector.protect(token, binding).split(".");
    for (const index of [1, 2, 3]) {
      const altered = [...original];
      const part = altered[index];
      if (!part) throw new Error("Fixture envelope has no required segment");
      const bytes = Buffer.from(part, "base64url");
      bytes[0] = (bytes[0] ?? 0) ^ 1;
      altered[index] = bytes.toString("base64url");
      expect(() => protector.reveal(altered.join("."), binding)).toThrowError(
        expect.objectContaining(keyError),
      );
    }
  });

  it.each([
    "",
    "v2.a.b.c",
    "v1.a.b.c.extra",
    "v1..b.c",
    "v1.a.b.c",
    `v1.${"a".repeat(2049)}.b.c`,
  ])("rejects invalid envelope framing (%#)", async (envelope) => {
    const { protector } = await protectedFixture();
    expect(() => protector.reveal(envelope, binding)).toThrowError(
      expect.objectContaining(keyError),
    );
  });

  it("fails closed for missing configuration and a nonexistent key file", async () => {
    const root = await temporaryRoot();
    unavailable(await NodeTokenProtector.load(undefined));
    unavailable(await NodeTokenProtector.load(join(root, "missing.key")));
    expect(await readdir(root)).toEqual([]);
  });

  it.each([
    0o400, 0o640, 0o644,
  ])("refuses a key with mode %i without repairing it", async (mode) => {
    const { keyFile } = await protectedFixture();
    await chmod(keyFile, mode);
    unavailable(await NodeTokenProtector.load(keyFile));
    expect((await stat(keyFile)).mode & 0o777).toBe(mode);
  });

  it.each([
    0o750, 0o755,
  ])("refuses a non-private immediate parent (%i)", async (mode) => {
    const { root, keyFile } = await protectedFixture();
    await chmod(root, mode);
    unavailable(await NodeTokenProtector.load(keyFile));
    expect((await stat(root)).mode & 0o777).toBe(mode);
  });

  it.each([
    0, 31, 33,
  ])("refuses keys with an invalid byte length (%i)", async (length) => {
    const root = await temporaryRoot();
    const keyFile = join(root, "wrong-size.key");
    await writeFile(keyFile, randomBytes(length), { flag: "wx", mode: 0o600 });
    unavailable(await NodeTokenProtector.load(keyFile));
    expect((await stat(keyFile)).size).toBe(length);
  });

  it("refuses a symlink key and a directory instead of a key", async () => {
    const { root, keyFile } = await protectedFixture();
    const symbolic = join(root, "symlink.key");
    await symlink(keyFile, symbolic);
    unavailable(await NodeTokenProtector.load(symbolic));
    unavailable(await NodeTokenProtector.load(root));
  });

  it("refuses an immediate parent that is a symlink", async () => {
    const { root, keyFile } = await protectedFixture();
    const other = await temporaryRoot();
    const symbolic = join(other, "linked-directory");
    await symlink(root, symbolic, "dir");
    unavailable(await NodeTokenProtector.load(join(symbolic, "fixture.key")));
    expect(
      (await NodeTokenProtector.load(keyFile)).reveal(
        (await NodeTokenProtector.load(keyFile)).protect(token, binding),
        binding,
      ),
    ).toBe(token);
  });
});

describe("LocalInvitationMailer", () => {
  it("publishes one private mail file for repeated delivery and survives a new adapter instance", async () => {
    const root = await temporaryRoot();
    const mailbox = join(root, "mailbox");
    const sender = new LocalInvitationMailer(mailbox);
    await sender.send("same-delivery-1", mail, new AbortController().signal);
    await sender.send("same-delivery-1", mail, new AbortController().signal);
    await new LocalInvitationMailer(mailbox).send(
      "same-delivery-1",
      mail,
      new AbortController().signal,
    );
    expect(await readdir(mailbox)).toEqual(["invitation-same-delivery-1.json"]);
    const target = join(mailbox, "invitation-same-delivery-1.json");
    expect(JSON.parse(await readFile(target, "utf8"))).toEqual(mail);
    expect((await stat(mailbox)).mode & 0o777).toBe(0o700);
    expect((await stat(target)).mode & 0o777).toBe(0o600);
  });

  it("converges concurrent identical deliveries to one file without temporary files", async () => {
    const mailbox = join(await temporaryRoot(), "mailbox");
    await Promise.all(
      Array.from({ length: 8 }, () =>
        new LocalInvitationMailer(mailbox).send(
          "concurrent-1",
          mail,
          new AbortController().signal,
        ),
      ),
    );
    expect(await readdir(mailbox)).toEqual(["invitation-concurrent-1.json"]);
    expect(
      JSON.parse(
        await readFile(join(mailbox, "invitation-concurrent-1.json"), "utf8"),
      ),
    ).toEqual(mail);
  });

  it("refuses a different payload under the same delivery ID and preserves the first mail", async () => {
    const mailbox = join(await temporaryRoot(), "mailbox");
    const sender = new LocalInvitationMailer(mailbox);
    await sender.send("payload-1", mail, new AbortController().signal);
    await expect(
      sender.send(
        "payload-1",
        { ...mail, to: "other@example.test" },
        new AbortController().signal,
      ),
    ).rejects.toThrow("Delivery ID payload mismatch");
    expect(await readdir(mailbox)).toEqual(["invitation-payload-1.json"]);
    expect(
      JSON.parse(
        await readFile(join(mailbox, "invitation-payload-1.json"), "utf8"),
      ),
    ).toEqual(mail);
  });

  it("keeps distinct delivery generations as separate deliveries", async () => {
    const mailbox = join(await temporaryRoot(), "mailbox");
    const sender = new LocalInvitationMailer(mailbox);
    await sender.send("invitation-1", mail, new AbortController().signal);
    await sender.send("invitation-2", mail, new AbortController().signal);
    expect((await readdir(mailbox)).sort()).toEqual([
      "invitation-invitation-1.json",
      "invitation-invitation-2.json",
    ]);
  });

  it("rejects an already aborted delivery before creating a mailbox", async () => {
    const root = await temporaryRoot();
    const signal = AbortSignal.abort(new Error("Fixture aborted before I/O"));
    await expect(
      new LocalInvitationMailer(join(root, "mailbox")).send(
        "aborted-1",
        mail,
        signal,
      ),
    ).rejects.toThrow("Fixture aborted before I/O");
    expect(await readdir(root)).toEqual([]);
  });

  it("does not remove completed mail when its signal is later aborted", async () => {
    const mailbox = join(await temporaryRoot(), "mailbox");
    const controller = new AbortController();
    await new LocalInvitationMailer(mailbox).send(
      "completed-1",
      mail,
      controller.signal,
    );
    controller.abort();
    expect(await readdir(mailbox)).toEqual(["invitation-completed-1.json"]);
    expect(
      JSON.parse(
        await readFile(join(mailbox, "invitation-completed-1.json"), "utf8"),
      ),
    ).toEqual(mail);
  });

  it("reports absent configuration as a distinct unavailable state", async () => {
    await expect(
      new LocalInvitationMailer(undefined).send(
        "configured-1",
        mail,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "INVITATION_DELIVERY_CONFIGURATION" });
  });

  it.each([
    "",
    "../escape",
    "slash/path",
    "underscore_id",
    "x".repeat(101),
  ])("rejects unsafe delivery IDs before filesystem writes (%#)", async (id) => {
    const root = await temporaryRoot();
    await expect(
      new LocalInvitationMailer(join(root, "mailbox")).send(
        id,
        mail,
        new AbortController().signal,
      ),
    ).rejects.toThrow("Invalid delivery ID");
    expect(await readdir(root)).toEqual([]);
  });

  it("rejects an unwritable mailbox shape without silently reporting delivery", async () => {
    const root = await temporaryRoot();
    const mailbox = join(root, "mailbox");
    await writeFile(mailbox, "fixture is a file", { flag: "wx", mode: 0o600 });
    await expect(
      new LocalInvitationMailer(mailbox).send(
        "blocked-1",
        mail,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "EXTERNAL_API_ERROR" });
    expect(await readFile(mailbox, "utf8")).toBe("fixture is a file");
    expect(await readdir(root)).toEqual(["mailbox"]);
  });
});
