import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { issueSession } from "@repo/core/application/account/session";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";

type Label = "schema" | "application" | "credentials";
const opened = new Set<Label>();
const labels: readonly Label[] = ["schema", "application", "credentials"];
const deadlineMs = 180_000;
const rootBytes = 192 * 1024 ** 2;
const dbBytes = 32 * 1024 ** 2;
const allDbBytes = 64 * 1024 ** 2;

async function directory(path: string) {
  const stat = await lstat(path);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== process.getuid?.() ||
    (stat.mode & 0o7777) !== 0o700 ||
    (await realpath(path)) !== path
  )
    throw new Error("P5d root boundary");
}

async function bounded<T>(work: Promise<T>, milliseconds = 10_000): Promise<T> {
  const controller = new AbortController();
  try {
    return await Promise.race([
      work,
      delay(milliseconds, undefined, { signal: controller.signal }).then(() => {
        throw new Error("P5d stop deadline");
      }),
    ]);
  } finally {
    controller.abort();
  }
}

export async function createAccountDeletionFixture(label: Label) {
  const root = process.env.HOLLOW_ACCOUNT_DELETION_ROOT;
  if (!root || !isAbsolute(root) || opened.has(label))
    throw new Error("P5d fresh root is required");
  await directory(root);
  opened.add(label);
  let now = new Date("2026-10-06T00:00:00.000Z");
  const started = performance.now();
  let failed = false;
  let closed = false;
  let databaseCreated = false;
  const file = join(root, `${label}.db`);
  const guardFiles = async () => {
    await directory(root);
    let total = 0;
    let databases = 0;
    const entries = await readdir(root);
    if (entries.length > 9) throw new Error("P5d root entry bound");
    for (const name of entries) {
      if (
        !labels.some(
          (value) =>
            name === `${value}.db` ||
            name === `${value}.db-wal` ||
            name === `${value}.db-shm`,
        )
      )
        throw new Error("P5d unknown root entry");
      const stat = await lstat(join(root, name));
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.nlink !== 1 ||
        stat.uid !== process.getuid?.() ||
        (stat.mode & 0o7777) !== 0o600
      )
        throw new Error("P5d database boundary");
      total += stat.size;
      databases += stat.size;
    }
    for (const value of labels) {
      let bytes = 0;
      for (const name of entries.filter((name) =>
        name.startsWith(`${value}.db`),
      ))
        bytes += (await lstat(join(root, name))).size;
      if (bytes > dbBytes) throw new Error("P5d database size bound");
    }
    if (total > rootBytes || databases > allDbBytes)
      throw new Error("P5d aggregate size bound");
  };
  await guardFiles();
  const handle = await open(
    file,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.sync();
    databaseCreated = true;
  } finally {
    await handle.close();
  }
  if (!databaseCreated) throw new Error("P5d database creation");
  const client = createLibsqlClient({ url: `file:${file}` });
  try {
    await bounded(applyPragmas(client));
    const db = getDatabase(client);
    await bounded(
      migrate(db, {
        migrationsFolder: new URL("../migrations", import.meta.url).pathname,
      }),
      30_000,
    );
    const base = createHollowContainer(db, "http://p5d.fixture.test", {
      send: async () => {},
    });
    const container = {
      ...base,
      clock: { now: () => new Date(now) },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    };
    const passwordHash = await bounded(
      container.passwordHasher.hash("P5d-self-only-password-2026"),
    );
    const guard = async () => {
      if (failed || closed || performance.now() - started > deadlineMs)
        throw new Error("P5d fixture unavailable");
      await guardFiles();
      const rows = await client.execute(
        "select (select count(*) from accounts) accounts,(select count(*) from workspaces) workspaces,(select count(*) from notes) notes",
      );
      const row = rows.rows[0];
      if (
        !row ||
        typeof row.accounts !== "number" ||
        typeof row.workspaces !== "number" ||
        typeof row.notes !== "number"
      )
        throw new Error("P5d count shape");
      if (
        row.accounts > (label === "application" ? 5 : 1) ||
        row.workspaces > (label === "application" ? 2 : 0) ||
        row.notes > (label === "application" ? 12 : 0)
      )
        throw new Error("P5d entity bound");
    };
    await guard();
    return {
      container,
      db,
      client,
      root,
      advance(milliseconds = 2_001) {
        now = new Date(now.getTime() + milliseconds);
      },
      fail() {
        failed = true;
      },
      guard,
      async account(email: string) {
        await guard();
        const account = verifyAccount(
          createAccount(
            container.idGenerator.next(),
            email,
            passwordHash,
            container.clock.now(),
          ),
          container.clock.now(),
        );
        const session = await container.unitOfWorkProvider.run(async (u) => {
          await u.accounts.save(account);
          return issueSession(container, u.accounts, account);
        });
        await guard();
        return { account, token: session.token };
      },
      async close() {
        if (closed) return;
        await bounded(container.passwordHasher.stop());
        try {
          const fk = await bounded(client.execute("PRAGMA foreign_key_check"));
          if (fk.rows.length) throw new Error("P5d foreign key audit");
          const integrity = await bounded(
            client.execute("PRAGMA integrity_check"),
          );
          if (
            integrity.rows.length !== 1 ||
            integrity.rows[0]?.integrity_check !== "ok"
          )
            throw new Error("P5d integrity audit");
          await bounded(client.execute("PRAGMA wal_checkpoint(TRUNCATE)"));
          await guardFiles();
        } finally {
          client.close();
          closed = true;
        }
      },
    };
  } catch (error) {
    client.close();
    throw error;
  }
}

export type AccountDeletionFixture = Awaited<
  ReturnType<typeof createAccountDeletionFixture>
>;
