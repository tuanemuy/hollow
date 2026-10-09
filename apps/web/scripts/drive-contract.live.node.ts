import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import {
  NodeDriveHttp,
  validDriveReference,
} from "@repo/core/adapters/node/drive/http";
import { NodeDriveFolderProvider } from "@repo/core/adapters/node/drive/provider";
import { z } from "zod";

const args = process.argv.slice(2);
const file = args[args.indexOf("--access-token-file") + 1];
const folderId = args[args.indexOf("--folder-id") + 1];
if (
  !args.includes("--metadata") ||
  !args.includes("--access-token-file") ||
  !file ||
  !isAbsolute(file) ||
  !args.includes("--folder-id") ||
  !validDriveReference(folderId)
)
  throw new Error(
    "Use --metadata --access-token-file <dedicated absolute credential file> --folder-id <explicit folder> for an authorized read-only Drive contract.",
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
const generation = randomUUID();
const execution = new NodeDriveExecution(generation);
const provider = new NodeDriveFolderProvider(new NodeDriveHttp(execution));
const target = {
  kind: "control" as const,
  id: randomUUID(),
  owner: { runtimeGeneration: generation, token: randomUUID() },
};
try {
  const result = await execution.withCaller(
    target,
    async () => true,
    async () => {
      const request = execution.run(target, (signal) =>
        provider.inspectFolder({
          fileId: folderId,
          resourceKey: null,
          accessToken: credential,
          signal,
        }),
      );
      const result = await request.result;
      await request.closed;
      const closure = execution.closure(target);
      if (closure.kind !== "closed")
        throw Error("Drive native closure was not confirmed");
      await execution.coordinate("settle", () =>
        execution.acknowledge(closure.proof),
      );
      return result;
    },
  );
  console.log(
    JSON.stringify({
      metadataContract:
        result.kind === "settled" && result.value.kind === "value"
          ? result.value.value.kind
          : "not-accepted",
      write: "not-executed",
      backup: "not-executed",
      regeneration: "not-executed",
    }),
  );
} finally {
  credential = "";
  await execution.stop();
}
