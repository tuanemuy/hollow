import { randomBytes } from "node:crypto";
import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  applyPragmas,
  createLibsqlClient,
  getDatabase,
} from "@repo/core/adapters/libsql/client";
import { NodeSharePasswordWork } from "@repo/core/adapters/node/sharePasswordWork";
import { NodeShareTokenProtector } from "@repo/core/adapters/node/shareSecrets";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { readNodeServerEnv } from "@repo/core/application/di/serverNode";
import { rotateShareEnvelopes } from "@repo/core/application/sharing/settings";

async function main() {
  const [operation, argument] = process.argv.slice(2);
  const directory = process.env.HOLLOW_SHARE_KEY_DIR;
  if (!directory || !path.isAbsolute(directory))
    throw Error("Set an absolute HOLLOW_SHARE_KEY_DIR");
  if (operation === "create") {
    if (!argument || !/^[a-z0-9-]{1,40}$/.test(argument))
      throw Error("Specify a new key ID");
    await mkdir(directory, { mode: 0o700 }).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    });
    const info = await lstat(directory);
    if (
      (await realpath(directory)) !== directory ||
      !info.isDirectory() ||
      info.uid !== process.getuid?.() ||
      (info.mode & 0o7777) !== 0o700
    )
      throw Error("Key directory must be private and canonical");
    await writeFile(path.join(directory, `${argument}.key`), randomBytes(32), {
      flag: "wx",
      mode: 0o600,
    });
    console.info("Sharing key created; no existing key was overwritten.");
    return;
  }
  if (operation !== "rotate" || (argument && !/^[a-f0-9-]{36}$/.test(argument)))
    throw Error("Use create <key-id> or rotate [after-note-id]");
  const env = readNodeServerEnv();
  const client = createLibsqlClient({
    url: env.DATABASE_URL,
    ...(env.DATABASE_AUTH_TOKEN ? { authToken: env.DATABASE_AUTH_TOKEN } : {}),
    ...(env.DATABASE_ENCRYPTION_KEY
      ? { encryptionKey: env.DATABASE_ENCRYPTION_KEY }
      : {}),
  });
  const work = new NodeSharePasswordWork();
  try {
    await applyPragmas(
      client,
      env.DATABASE_URL === ":memory:" ? { wal: false } : {},
    );
    const c = {
      ...createHollowContainer(getDatabase(client), env.APP_URL, {
        async send() {
          throw Error("Unavailable in maintenance");
        },
      }),
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory,
          activeKeyId: process.env.HOLLOW_SHARE_ACTIVE_KEY_ID ?? "",
          keyIds: (process.env.HOLLOW_SHARE_KEY_IDS ?? "")
            .split(",")
            .filter(Boolean),
        }),
        passwordWork: work,
      },
    };
    console.info(JSON.stringify(await rotateShareEnvelopes(c, argument)));
  } finally {
    await work.stop();
    client.close();
  }
}
main().catch(() => {
  console.error(
    "Sharing key maintenance failed. Check private paths, key IDs and database configuration. Existing keys were not removed.",
  );
  process.exitCode = 1;
});
