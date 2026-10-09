import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { NodeOpenRouterExecution } from "@repo/core/adapters/node/openrouter/execution";
import { NodeOpenRouterProvider } from "@repo/core/adapters/node/openrouter/provider";
import { SystemClock } from "@repo/core/application/ports/clock";
import { z } from "zod";

const args = process.argv.slice(2);
const file = args[args.indexOf("--key-file") + 1];
if (
  !args.includes("--metadata") ||
  !args.includes("--key-file") ||
  !file ||
  !isAbsolute(file)
)
  throw new Error(
    "Use --metadata --key-file <dedicated absolute credential file> for an explicitly authorized live metadata contract.",
  );
const parent = await lstat(dirname(file));
if (
  !parent.isDirectory() ||
  parent.isSymbolicLink() ||
  parent.uid !== process.getuid?.() ||
  (parent.mode & 0o777) !== 0o700
)
  throw new Error("A private dedicated credential directory is required");
const handle = await open(
  file,
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
);
const buffer = Buffer.alloc(64 * 1024 + 1);
let credential: string;
try {
  const before = await handle.stat();
  if (
    !before.isFile() ||
    before.uid !== process.getuid?.() ||
    (before.mode & 0o777) !== 0o600 ||
    before.size > 64 * 1024
  )
    throw new Error("A private bounded regular credential file is required");
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
  const after = await handle.stat();
  if (
    bytesRead !== before.size ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  )
    throw new Error("Credential file changed during the read");
  credential = z
    .string()
    .min(1)
    .max(64 * 1024)
    .regex(/^[\x21-\x7e]+$/)
    .parse(
      new TextDecoder("utf-8", { fatal: true })
        .decode(buffer.subarray(0, bytesRead))
        .trim(),
    );
} finally {
  buffer.fill(0);
  await handle.close();
}
const provider = new NodeOpenRouterProvider(
  "http://127.0.0.1:4317",
  SystemClock,
);
const execution = new NodeOpenRouterExecution();
try {
  const result = await execution.run(async (signal) => {
    const metadata = await provider.inspectCredential({ credential, signal });
    const models = await provider.list(signal);
    return {
      expiresAt: metadata.expiresAt?.toISOString() ?? null,
      creatorIdentityAvailable: metadata.providerUserId !== null,
      modelCount: models.length,
    };
  });
  console.log(
    JSON.stringify({
      metadataContract: "accepted",
      ...result,
      generation: "not-executed",
    }),
  );
} finally {
  await execution.stop();
}
