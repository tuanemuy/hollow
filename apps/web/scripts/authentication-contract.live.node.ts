import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { Server } from "node:http";
import { dirname, isAbsolute } from "node:path";
import { serve } from "@hono/node-server";
import { readNodeGoogleAuthentication } from "@repo/core/adapters/node/auth/config";
import { loadNodeSmtpConfig } from "@repo/core/adapters/node/mail/config";
import { NodeSmtpMailer } from "@repo/core/adapters/node/mail/smtpMailer";
import { NodeTokenGenerator } from "@repo/core/adapters/node/tokenGenerator";
import { SystemClock } from "@repo/core/application/ports/clock";
import { z } from "zod";

const args = process.argv.slice(2);
const profile = args[args.indexOf("--profile") + 1];
if (!args.includes("--profile") || !profile || !isAbsolute(profile))
  throw new Error(
    "Supply a dedicated private --profile file and an explicit --send or --exchange action.",
  );
async function privateJson(file: string): Promise<unknown> {
  const parent = await lstat(dirname(file));
  if (
    !parent.isDirectory() ||
    parent.isSymbolicLink() ||
    parent.uid !== process.getuid?.() ||
    (parent.mode & 0o777) !== 0o700
  )
    throw new Error("Private profile directory required");
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (
      !stat.isFile() ||
      stat.uid !== process.getuid?.() ||
      (stat.mode & 0o777) !== 0o600 ||
      stat.size > 16_384
    )
      throw new Error("Private bounded profile required");
    return JSON.parse(await handle.readFile("utf8"));
  } finally {
    await handle.close();
  }
}
const absolute = z.string().max(4096).refine(isAbsolute);
const value = await privateJson(profile);
if (args.includes("--send") && !args.includes("--exchange")) {
  const settings = z
    .object({
      version: z.literal(1),
      mode: z.literal("mail"),
      smtpConfigFile: absolute,
      approvedRecipient: z.email().max(254),
    })
    .strict()
    .parse(value);
  const recipient = args[args.indexOf("--recipient") + 1];
  if (!args.includes("--recipient") || recipient !== settings.approvedRecipient)
    throw new Error(
      "Recipient must match the explicitly approved dedicated profile",
    );
  const mailer = new NodeSmtpMailer(
    await loadNodeSmtpConfig(settings.smtpConfigFile),
  );
  try {
    await mailer.send({
      to: recipient,
      subject: "Hollow メール配送契約の確認",
      text: "承認済み宛先への一通だけの配送確認です。受信できたことを別途確認してください。",
    });
    console.log(
      "SMTP accepted the message. Recipient arrival has not been verified. No automatic resend was attempted.",
    );
  } finally {
    await mailer.stop();
  }
} else if (args.includes("--exchange") && !args.includes("--send")) {
  const settings = z
    .object({
      version: z.literal(1),
      mode: z.literal("google"),
      googleConfigFile: absolute,
      appUrl: z.url().max(2048),
      expectedEmail: z.email().max(254),
      expectedSubject: z.string().min(1).max(255),
    })
    .strict()
    .parse(value);
  const origin = new URL(settings.appUrl);
  if (
    origin.protocol !== "http:" ||
    origin.hostname !== "127.0.0.1" ||
    !origin.port ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error("Use the dedicated registered loopback app URL");
  const google = await readNodeGoogleAuthentication(
    settings.googleConfigFile,
    origin.href,
    { clock: SystemClock, tokens: NodeTokenGenerator },
  );
  if (!google) throw new Error("Google adapter is not configured");
  const state = NodeTokenGenerator.generate();
  const nonce = NodeTokenGenerator.generate();
  const verifier = NodeTokenGenerator.generate();
  let settle: (code: string) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const code = new Promise<string>((done, fail) => {
    settle = done;
    reject = fail;
  });
  let consumed = false;
  const server = serve({
    hostname: "127.0.0.1",
    port: Number(origin.port),
    fetch: (request) => {
      const url = new URL(request.url);
      if (
        request.method !== "GET" ||
        url.pathname !== "/auth/google/callback" ||
        consumed ||
        url.search.length > 8192 ||
        url.searchParams.getAll("state").length !== 1 ||
        url.searchParams.get("state") !== state
      )
        return new Response(null, { status: 400 });
      consumed = true;
      const value = url.searchParams.get("code");
      if (
        url.searchParams.has("error") ||
        url.searchParams.getAll("code").length !== 1 ||
        !value ||
        value.length > 4096
      )
        reject(new Error("Google consent did not complete"));
      else settle(value);
      return new Response(
        "The dedicated contract callback was received. Return to the terminal.",
        {
          headers: {
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        },
      );
    },
  });
  const timer = setTimeout(
    () => reject(new Error("Dedicated consent deadline expired")),
    300_000,
  );
  try {
    console.log(
      "Use the approved test identity to open this dedicated authorization URL:",
    );
    console.log(
      await google.provider.authorization({
        state,
        nonce,
        verifier,
        mode: "login",
      }),
    );
    const authorizationCode = await code;
    const result = await google.execution.run((signal) =>
      google.provider.exchange({
        code: authorizationCode,
        verifier,
        nonceHash: NodeTokenGenerator.hash(nonce),
        signal,
      }),
    );
    if (
      result.email !== settings.expectedEmail ||
      result.subject !== settings.expectedSubject
    )
      throw new Error("Approved Google identity contract did not match");
    console.log(
      "Google signature, issuer, audience, nonce, expiry, verified email, and approved identity contract passed. No account or session was created.",
    );
  } finally {
    clearTimeout(timer);
    await google.execution.stop();
    await new Promise<void>((done, fail) => {
      server.close((error) => (error ? fail(error) : done()));
      if (server instanceof Server) server.closeIdleConnections();
    });
  }
} else
  throw new Error("Choose exactly one explicit --send or --exchange action.");
