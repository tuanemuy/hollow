import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { dirname, isAbsolute, normalize } from "node:path";
import { loadNodeSmtpConfig } from "@repo/core/adapters/node/mail/config";
import { NodeSmtpInvitationMailer } from "@repo/core/adapters/node/mail/smtpInvitationMailer";
import { SystemClock } from "@repo/core/application/ports/clock";
import {
  invitationMail,
  invitationMailSnapshot,
} from "@repo/core/application/workspace/invitationMail";
import { z } from "zod";

const args = process.argv.slice(2);
const check = args.length === 3 && args[2] === "--check";
const send =
  args.length === 5 && args[2] === "--recipient" && args[4] === "--send";
if (args[0] !== "--profile" || !args[1] || (!check && !send))
  throw new Error(
    "Usage: invitation-contract.live.node.ts --profile <private absolute profile> --check | --recipient <approved address> --send",
  );
const absolute = z
  .string()
  .max(4096)
  .refine((value) => isAbsolute(value) && normalize(value) === value);
const profile = absolute.parse(args[1]);
async function privateJson(file: string): Promise<unknown> {
  const parentPath = dirname(file);
  const parent = await lstat(parentPath);
  if (
    !parent.isDirectory() ||
    parent.isSymbolicLink() ||
    parent.uid !== process.getuid?.() ||
    (parent.mode & 0o7777) !== 0o700 ||
    (await realpath(parentPath)) !== parentPath
  )
    throw new Error("Owned private profile directory required");
  const handle = await open(
    file,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  const bytes = Buffer.alloc(16_385);
  try {
    const before = await handle.stat();
    const pathBefore = await lstat(file);
    if (
      !before.isFile() ||
      pathBefore.isSymbolicLink() ||
      before.uid !== process.getuid?.() ||
      (before.mode & 0o7777) !== 0o600 ||
      before.size < 1 ||
      before.size > 16_384 ||
      before.dev !== pathBefore.dev ||
      before.ino !== pathBefore.ino
    )
      throw new Error("Owned bounded non-symlink profile required");
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(
        bytes,
        length,
        bytes.length - length,
        length,
      );
      if (result.bytesRead === 0) break;
      length += result.bytesRead;
    }
    const after = await handle.stat();
    const pathAfter = await lstat(file);
    const parentAfter = await lstat(parentPath);
    if (
      length !== before.size ||
      length > 16_384 ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      before.dev !== pathAfter.dev ||
      before.ino !== pathAfter.ino ||
      before.mode !== pathAfter.mode ||
      parent.dev !== parentAfter.dev ||
      parent.ino !== parentAfter.ino ||
      parent.mode !== parentAfter.mode ||
      (await realpath(parentPath)) !== parentPath
    )
      throw new Error("Profile changed while reading");
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(0, length),
      ),
    );
  } catch {
    throw new Error("Private invitation profile cannot be read");
  } finally {
    bytes.fill(0);
    await handle.close();
  }
}
const settings = z
  .object({
    version: z.literal(1),
    mode: z.literal("invitation"),
    smtpConfigFile: absolute,
    approvedRecipient: z.email().max(254),
    deliveryId: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),
    workspaceName: z
      .string()
      .min(1)
      .max(200)
      .refine((value) => Array.from(value).length <= 100),
    role: z.enum(["owner", "editor", "viewer"]),
    expiresAt: z.iso.datetime(),
    approvedInvitationUrl: z.url().max(2048),
  })
  .strict()
  .parse(await privateJson(profile));
const link = new URL(settings.approvedInvitationUrl);
const token = link.searchParams.get("token");
const expiresAt = new Date(settings.expiresAt);
if (
  (link.protocol !== "https:" &&
    !(link.protocol === "http:" && link.hostname === "127.0.0.1")) ||
  link.username ||
  link.password ||
  link.pathname !== "/invitations" ||
  link.hash ||
  [...link.searchParams.keys()].length !== 1 ||
  !token ||
  token.length > 1024 ||
  expiresAt <= SystemClock.now()
)
  throw new Error("Use the approved current invitation link and future expiry");
const config = await loadNodeSmtpConfig(settings.smtpConfigFile);
if (check) {
  console.log(
    "Invitation profile and SMTP configuration are valid. No network connection or delivery was attempted.",
  );
} else {
  if (args[3] !== settings.approvedRecipient)
    throw new Error(
      "Recipient must match the explicitly approved invitation profile",
    );
  const mail = invitationMail(
    invitationMailSnapshot({
      name: settings.workspaceName,
      email: settings.approvedRecipient,
      role: settings.role,
      expiresAt,
      appUrl: link.origin,
    }),
    token,
  );
  const sender = new NodeSmtpInvitationMailer(config);
  try {
    await sender.send(settings.deliveryId, mail, AbortSignal.timeout(30_000));
    console.log(
      "SMTP accepted one invitation message and native connection closure completed. Recipient arrival and workspace joining require separate verification. No automatic resend was attempted.",
    );
  } finally {
    await sender.stop();
  }
}
