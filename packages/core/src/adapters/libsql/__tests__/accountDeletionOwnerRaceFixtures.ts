import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type {
  Client,
  InArgs,
  InStatement,
  ResultSet,
  Transaction,
  TransactionMode,
} from "@libsql/client";
import { issueSession } from "@repo/core/application/account/session";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";

async function bounded<T>(work: Promise<T>, milliseconds = 10_000): Promise<T> {
  const controller = new AbortController();
  try {
    return await Promise.race([
      work,
      delay(milliseconds, undefined, { signal: controller.signal }).then(() => {
        throw new Error("P5D_OWNER_RACE_DEADLINE");
      }),
    ]);
  } finally {
    controller.abort();
  }
}

type RaceLane = "first" | "second";
type Request = {
  lane: RaceLane;
  completed: boolean;
  opened: boolean;
};
type SourceFault =
  | "client-bound"
  | "statement-bound"
  | "uow-bound"
  | "observer";
let opened = false;

export async function createAccountDeletionOwnerRaceFixture() {
  const root = process.env.HOLLOW_ACCOUNT_DELETION_OWNER_RACE_ROOT;
  if (!root || !isAbsolute(root) || opened)
    throw new Error("P5D_OWNER_RACE_FRESH_ROOT");
  const rootIdentity = await lstat(root);
  if (
    !rootIdentity.isDirectory() ||
    rootIdentity.isSymbolicLink() ||
    rootIdentity.uid !== process.getuid?.() ||
    (rootIdentity.mode & 0o7777) !== 0o700 ||
    (await realpath(root)) !== root
  )
    throw new Error("P5D_OWNER_RACE_DIRECTORY");
  opened = true;
  const started = performance.now();
  const file = join(root, "owner-race.db");
  let failed = false;
  let closed = false;
  let race = false;
  let sourceFault: SourceFault | null = null;
  let methods = 0;
  let statements = 0;
  let unitOfWorkCalls = 0;
  let overlap = false;
  const requests: Request[] = [];
  const observers: Promise<void>[] = [];
  const restorations: (() => void)[] = [];
  const clients: Client[] = [];
  const closeReturned: boolean[] = [];
  const fault = (value: SourceFault): never => {
    failed = true;
    sourceFault ??= value;
    throw new Error("P5D_OWNER_RACE_BOUND");
  };
  const count = (size: number) => {
    if (++methods > 4096) fault("client-bound");
    statements += size;
    if (statements > 4096) fault("statement-bound");
  };
  const watch = (promise: Promise<unknown>, onSuccess: () => void) => {
    const observer = promise.then(
      () => {
        try {
          onSuccess();
        } catch {
          failed = true;
          sourceFault ??= "observer";
        }
      },
      () => {},
    );
    observers.push(observer);
    if (observers.length > 64) fault("observer");
  };
  const instrumentTransaction = (
    transaction: Transaction,
    request: Request | null,
  ) => {
    if (request) request.opened = true;
    const execute = transaction.execute;
    transaction.execute = function (...args) {
      count(1);
      return execute.apply(this, args);
    };
    const batch = transaction.batch;
    transaction.batch = function (...args) {
      count(args[0].length);
      return batch.apply(this, args);
    };
    const commit = transaction.commit;
    transaction.commit = function (...args) {
      count(1);
      const result = commit.apply(this, args);
      if (request)
        watch(result, () => {
          request.completed = true;
        });
      return result;
    };
    const rollback = transaction.rollback;
    transaction.rollback = function (...args) {
      count(1);
      const result = rollback.apply(this, args);
      if (request)
        watch(result, () => {
          request.completed = true;
        });
      return result;
    };
    const close = transaction.close;
    transaction.close = function (...args) {
      count(0);
      const result = close.apply(this, args);
      if (request) request.completed = true;
      return result;
    };
    restorations.push(() => {
      transaction.execute = execute;
      transaction.batch = batch;
      transaction.commit = commit;
      transaction.rollback = rollback;
      transaction.close = close;
    });
  };
  const instrumentClient = (client: Client, lane: RaceLane) => {
    const execute = client.execute.bind(client);
    function observedExecute(statement: InStatement): Promise<ResultSet>;
    function observedExecute(
      statement: string,
      args?: InArgs,
    ): Promise<ResultSet>;
    function observedExecute(
      statement: InStatement,
      args?: InArgs,
    ): Promise<ResultSet> {
      count(1);
      return typeof statement === "string" && arguments.length === 2
        ? execute(statement, args)
        : execute(statement);
    }
    const previousExecute = client.execute;
    client.execute = observedExecute;
    const batch = client.batch;
    client.batch = function (...args) {
      count(args[0].length);
      return batch.apply(this, args);
    };
    const transaction = client.transaction;
    const originalTransaction = transaction.bind(client);
    client.transaction = function (mode?: TransactionMode) {
      count(1);
      let request: Request | null = null;
      if (race) {
        if (requests.length >= 2 || requests.some((row) => row.lane === lane))
          fault("observer");
        overlap ||= requests.some((row) => row.lane !== lane && !row.completed);
        request = { lane, completed: false, opened: false };
        requests.push(request);
      }
      const result =
        arguments.length === 0
          ? originalTransaction()
          : originalTransaction(mode);
      const observer = result.then(
        (handle) => {
          try {
            instrumentTransaction(handle, request);
          } catch {
            failed = true;
            sourceFault ??= "observer";
          }
        },
        () => {
          if (request) request.completed = true;
        },
      );
      observers.push(observer);
      if (observers.length > 64) fault("observer");
      return result;
    };
    restorations.push(() => {
      client.execute = previousExecute;
      client.batch = batch;
      client.transaction = transaction;
    });
  };
  const fileGuard = async () => {
    const directory = await lstat(root);
    if (
      directory.dev !== rootIdentity.dev ||
      directory.ino !== rootIdentity.ino ||
      !directory.isDirectory() ||
      directory.isSymbolicLink() ||
      directory.uid !== process.getuid?.() ||
      (directory.mode & 0o7777) !== 0o700 ||
      (await realpath(root)) !== root
    )
      throw new Error("P5D_OWNER_RACE_DIRECTORY");
    const entries = await readdir(root);
    if (entries.length > 3) throw new Error("P5D_OWNER_RACE_ENTRY_BOUND");
    let bytes = 0;
    for (const name of entries) {
      if (
        !["owner-race.db", "owner-race.db-wal", "owner-race.db-shm"].includes(
          name,
        )
      )
        throw new Error("P5D_OWNER_RACE_FILE");
      const row = await lstat(join(root, name));
      if (
        !row.isFile() ||
        row.isSymbolicLink() ||
        row.nlink !== 1 ||
        row.uid !== process.getuid?.() ||
        (row.mode & 0o7777) !== 0o600
      )
        throw new Error("P5D_OWNER_RACE_FILE_BOUNDARY");
      bytes += row.size;
    }
    if (bytes > 32 * 1024 ** 2) throw new Error("P5D_OWNER_RACE_DB_CAPACITY");
  };
  await fileGuard();
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
  } finally {
    await handle.close();
  }
  let stop: (() => Promise<void>) | null = null;
  try {
    const firstClient = createLibsqlClient({ url: `file:${file}` });
    clients.push(firstClient);
    instrumentClient(firstClient, "first");
    await bounded(applyPragmas(firstClient));
    const firstDb = getDatabase(firstClient);
    await bounded(
      migrate(firstDb, {
        migrationsFolder: new URL("../migrations", import.meta.url).pathname,
      }),
      30_000,
    );
    const secondClient = createLibsqlClient({ url: `file:${file}` });
    clients.push(secondClient);
    instrumentClient(secondClient, "second");
    await bounded(applyPragmas(secondClient));
    const secondDb = getDatabase(secondClient);
    const base = createHollowContainer(firstDb, "https://p5d.fixture.test", {
      send: async () => {},
    });
    const secondBase = createHollowContainer(
      secondDb,
      base.appUrl,
      base.mailer,
    );
    stop = async () => {
      const results = await Promise.allSettled([
        base.passwordHasher.stop(),
        secondBase.passwordHasher.stop(),
      ]);
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
    };
    const instrumentProvider = (provider: typeof base.unitOfWorkProvider) => {
      const previous = provider.run;
      const original = provider.run.bind(provider);
      provider.run = (fn) => {
        if (++unitOfWorkCalls > 32) fault("uow-bound");
        return original(fn);
      };
      restorations.push(() => {
        provider.run = previous;
      });
    };
    instrumentProvider(base.unitOfWorkProvider);
    instrumentProvider(secondBase.unitOfWorkProvider);
    const now = new Date("2026-10-06T00:00:00.000Z");
    const common = {
      clock: { now: () => new Date(now) },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    };
    const first = { ...base, ...common };
    const second = { ...secondBase, ...common };
    const passwordHash = await bounded(
      first.passwordHasher.hash("P5d-self-only-owner-race-2026"),
    );
    const guard = async () => {
      if (failed || closed || performance.now() - started > 180_000)
        throw new Error("P5D_OWNER_RACE_UNAVAILABLE");
      await fileGuard();
      const row = (
        await firstClient.execute(
          "select (select count(*) from accounts) accounts,(select count(*) from workspaces) workspaces,(select count(*) from notes) notes,(select count(*) from account_deletions) intents",
        )
      ).rows[0];
      if (
        !row ||
        typeof row.accounts !== "number" ||
        row.accounts > 2 ||
        typeof row.workspaces !== "number" ||
        row.workspaces > 1 ||
        typeof row.notes !== "number" ||
        row.notes > 1 ||
        typeof row.intents !== "number" ||
        row.intents > 1
      )
        throw new Error("P5D_OWNER_RACE_ENTITY_BOUND");
    };
    await guard();
    return {
      first,
      second,
      client: firstClient,
      guard,
      fail() {
        failed = true;
      },
      sourceFault: () => sourceFault,
      counters: () => ({ methods, statements, unitOfWorkCalls }),
      beginRace() {
        if (race || requests.length || failed || closed) fault("observer");
        race = true;
      },
      async endRace() {
        race = false;
        await bounded(Promise.all(observers));
        return {
          overlappingRequests: overlap,
          requested: requests.length,
          actualOpened: requests.filter((row) => row.opened).length,
          completed: requests.filter((row) => row.completed).length,
          observerFault: sourceFault !== null,
        };
      },
      async account(email: string) {
        await guard();
        const account = verifyAccount(
          createAccount(first.idGenerator.next(), email, passwordHash, now),
          now,
        );
        const session = await first.unitOfWorkProvider.run(async (u) => {
          await u.accounts.save(account);
          return issueSession(first, u.accounts, account);
        });
        await guard();
        return { account, token: session.token };
      },
      async close() {
        if (closed) return;
        let normal = false;
        let closeFailed = false;
        let closeFailure: unknown;
        const recordCloseFailure = (error: unknown) => {
          if (!closeFailed) closeFailure = error;
          closeFailed = true;
        };
        try {
          await bounded(stop?.() ?? Promise.resolve());
          await bounded(Promise.all(observers));
          if (!failed) {
            const fk = await firstClient.execute("PRAGMA foreign_key_check");
            const integrity = await firstClient.execute(
              "PRAGMA integrity_check",
            );
            if (
              fk.rows.length !== 0 ||
              integrity.rows.length !== 1 ||
              integrity.rows[0]?.integrity_check !== "ok"
            )
              throw new Error("P5D_OWNER_RACE_INTEGRITY");
            const checkpoint = await firstClient.execute(
              "PRAGMA main.wal_checkpoint(TRUNCATE)",
            );
            if (
              checkpoint.rows.length !== 1 ||
              checkpoint.columns.join(",") !== "busy,log,checkpointed" ||
              !["busy", "log", "checkpointed"].every(
                (name) => checkpoint.rows[0]?.[name] === 0,
              )
            )
              throw new Error("P5D_OWNER_RACE_CHECKPOINT");
            await fileGuard();
            normal = true;
          }
        } catch (error) {
          recordCloseFailure(error);
        } finally {
          try {
            for (const [index, client] of clients.entries()) {
              try {
                client.close();
                closeReturned[index] = true;
              } catch (error) {
                recordCloseFailure(error);
              }
            }
          } finally {
            for (const restore of restorations.reverse()) {
              try {
                restore();
              } catch (error) {
                recordCloseFailure(error);
              }
            }
            closed = true;
          }
        }
        if (closeFailed) throw closeFailure;
        if (
          normal &&
          clients.length === 2 &&
          closeReturned.every(Boolean) &&
          clients.every((client) => client.closed)
        ) {
          await fileGuard();
          process.stdout.write(
            'P5D_OWNER_RACE {"event":"fixture-closed","hashersStopped":true,"client1Closed":true,"client2Closed":true}\n',
          );
        } else if (!failed) {
          throw new Error("P5D_OWNER_RACE_CLOSE_UNPROVEN");
        }
      },
    };
  } catch (error) {
    try {
      await bounded(stop?.() ?? Promise.resolve());
    } catch {
      failed = true;
    } finally {
      for (const client of clients) {
        try {
          client.close();
        } catch {
          failed = true;
        }
      }
      for (const restore of restorations.reverse()) {
        try {
          restore();
        } catch {
          failed = true;
        }
      }
    }
    throw error;
  }
}

export type AccountDeletionOwnerRaceFixture = Awaited<
  ReturnType<typeof createAccountDeletionOwnerRaceFixture>
>;
