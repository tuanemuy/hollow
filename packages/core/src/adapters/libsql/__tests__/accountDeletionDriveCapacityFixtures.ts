import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type {
  InArgs,
  InStatement,
  ResultSet,
  Transaction,
  TransactionMode,
} from "@libsql/client";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { createNodeDrive } from "@repo/core/adapters/node/drive/factory";
import { ensureAuthenticationBrowser } from "@repo/core/application/account/context";
import { issueSession } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import {
  type DriveAcknowledgedReceipt,
  type DriveClosedProof,
  hasDriveRetirement,
} from "@repo/core/application/integration/drive/ports";
import type { DriveAcknowledgment } from "@repo/core/domain/account/deletion";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";

async function bounded<T>(
  promise: Promise<T>,
  milliseconds = 5_000,
): Promise<T> {
  const controller = new AbortController();
  try {
    return await Promise.race([
      promise,
      delay(milliseconds, undefined, { signal: controller.signal }).then(() => {
        throw new Error("P5D_DRIVE_CAPACITY_DEADLINE");
      }),
    ]);
  } finally {
    controller.abort();
  }
}
async function directory(path: string) {
  const value = await lstat(path);
  if (
    !value.isDirectory() ||
    value.isSymbolicLink() ||
    value.uid !== process.getuid?.() ||
    (value.mode & 0o7777) !== 0o700 ||
    (await realpath(path)) !== path
  )
    throw new Error("P5D_DRIVE_CAPACITY_DIRECTORY");
}
async function createFile(path: string, bytes: Uint8Array) {
  const file = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }
}
type DriveCapacitySourceFault =
  | "client-method-bound"
  | "client-statement-bound"
  | "client-both-bound"
  | "uow-bound"
  | "native-receipt"
  | "save-result"
  | "exact-read"
  | "count-result";
let opened = false;
export async function createDriveCapacityFixture() {
  const root = process.env.HOLLOW_ACCOUNT_DELETION_DRIVE_CAPACITY_ROOT;
  if (!root || !isAbsolute(root) || opened)
    throw new Error("P5D_DRIVE_CAPACITY_FRESH_ROOT");
  await directory(root);
  opened = true;
  const started = performance.now();
  let failed = false;
  let sourceFault: DriveCapacitySourceFault | null = null;
  const recordSourceFault = (value: DriveCapacitySourceFault) => {
    sourceFault ??= value;
  };
  let closed = false;
  let now = new Date("2026-10-06T00:00:00.000Z");
  const file = join(root, "drive-capacity.db");
  const ownerDirectory = join(root, "drive-owner");
  const objectsDirectory = join(root, "objects");
  const keyFile = join(root, "drive.key");
  const keyringFile = join(root, "drive-keyring.json");
  const configFile = join(root, "drive.json");
  const fileGuard = async () => {
    await directory(root);
    let total = 0;
    let databases = 0;
    let configBytes = 0;
    const entries = await readdir(root);
    if (entries.length > 8) throw new Error("P5D_DRIVE_CAPACITY_ROOT_ENTRIES");
    for (const name of entries) {
      const path = join(root, name);
      if (name === "drive-owner" || name === "objects") {
        await directory(path);
        const files = await readdir(path);
        if (files.length > (name === "drive-owner" ? 3 : 2))
          throw new Error("P5D_DRIVE_CAPACITY_OWNER_ENTRIES");
        for (const child of files) {
          const allowed =
            name === "drive-owner"
              ? child === "owner.json" ||
                child === "recovery.lock" ||
                /^owner-[a-f0-9-]{36}\.tmp$/.test(child)
              : child === ".hollow-writer-owner" ||
                child === ".hollow-writer-owner.recovery";
          if (!allowed) throw new Error("P5D_DRIVE_CAPACITY_OWNER_PATH");
          const value = await lstat(join(path, child));
          if (
            !value.isFile() ||
            value.isSymbolicLink() ||
            value.nlink !== 1 ||
            value.uid !== process.getuid?.() ||
            (value.mode & 0o7777) !== 0o600 ||
            value.size > (name === "drive-owner" ? 16_384 : 256)
          )
            throw new Error("P5D_DRIVE_CAPACITY_OWNER_FILE");
          if (child === ".hollow-writer-owner.recovery" && value.size !== 0)
            throw new Error("P5D_DRIVE_CAPACITY_RECOVERY_SIZE");
          total += value.size;
        }
        continue;
      }
      if (
        ![
          "drive-capacity.db",
          "drive-capacity.db-wal",
          "drive-capacity.db-shm",
          "drive.key",
          "drive-keyring.json",
          "drive.json",
        ].includes(name)
      )
        throw new Error("P5D_DRIVE_CAPACITY_ROOT_PATH");
      const value = await lstat(path);
      if (
        !value.isFile() ||
        value.isSymbolicLink() ||
        value.nlink !== 1 ||
        value.uid !== process.getuid?.() ||
        (value.mode & 0o7777) !== 0o600
      )
        throw new Error("P5D_DRIVE_CAPACITY_FILE");
      if (name === "drive.key" && value.size !== 32)
        throw new Error("P5D_DRIVE_CAPACITY_KEY_SIZE");
      if (name === "drive.json" || name === "drive-keyring.json")
        configBytes += value.size;
      if (name.startsWith("drive-capacity.db")) databases += value.size;
      total += value.size;
    }
    if (
      databases > 32 * 1024 ** 2 ||
      configBytes > 16_384 ||
      total > 192 * 1024 ** 2
    )
      throw new Error("P5D_DRIVE_CAPACITY_BYTES");
  };
  await fileGuard();
  await createFile(file, new Uint8Array());
  const key = randomBytes(32);
  try {
    await createFile(keyFile, key);
  } finally {
    key.fill(0);
  }
  await createFile(
    keyringFile,
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        activeKid: "self",
        keys: [{ kid: "self", keyFile }],
      }),
    ),
  );
  await createFile(
    configFile,
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        clientId: "p5d-self-only.apps.googleusercontent.com",
        clientSecret: "p5d-self-only-unused-secret",
        keyringFile,
        picker: { appId: "1", apiKey: "p5d-self-only-unused-picker" },
      }),
    ),
  );
  const client = createLibsqlClient({ url: `file:${file}` });
  let clientMethods = 0;
  let clientStatements = 0;
  const countClient = (statements: number) => {
    clientMethods++;
    clientStatements += statements;
    if (clientMethods > 12_288 || clientStatements > 12_288) {
      failed = true;
      recordSourceFault(
        clientMethods > 12_288
          ? clientStatements > 12_288
            ? "client-both-bound"
            : "client-method-bound"
          : "client-statement-bound",
      );
      throw new Error("P5D_DRIVE_CAPACITY_CLIENT_BOUND");
    }
  };
  const originalExecute = client.execute.bind(client);
  function observedExecute(statement: InStatement): Promise<ResultSet>;
  function observedExecute(
    statement: string,
    args?: InArgs,
  ): Promise<ResultSet>;
  function observedExecute(
    statement: InStatement,
    args?: InArgs,
  ): Promise<ResultSet> {
    countClient(1);
    return typeof statement === "string" && arguments.length === 2
      ? originalExecute(statement, args)
      : originalExecute(statement);
  }
  client.execute = observedExecute;
  const originalBatch = client.batch;
  client.batch = function (...args) {
    countClient(args[0].length);
    return originalBatch.apply(this, args);
  };
  const instrumentTransaction = (transaction: Transaction) => {
    const execute = transaction.execute;
    transaction.execute = function (...args) {
      countClient(1);
      return execute.apply(this, args);
    };
    const batch = transaction.batch;
    transaction.batch = function (...args) {
      countClient(args[0].length);
      return batch.apply(this, args);
    };
    const commit = transaction.commit;
    transaction.commit = function () {
      countClient(1);
      return commit.call(this);
    };
    const rollback = transaction.rollback;
    transaction.rollback = function () {
      countClient(1);
      return rollback.call(this);
    };
    const close = transaction.close;
    transaction.close = function () {
      countClient(0);
      return close.call(this);
    };
  };
  const originalTransaction = client.transaction.bind(client);
  function observedTransaction(mode?: TransactionMode): Promise<Transaction> {
    countClient(1);
    const result =
      arguments.length === 0
        ? originalTransaction()
        : originalTransaction(mode);
    void result.then(instrumentTransaction).catch(() => {
      failed = true;
    });
    return result;
  }
  client.transaction = observedTransaction;
  let stop: (() => Promise<void>) | null = null;
  let restore = () => {};
  try {
    await bounded(applyPragmas(client));
    const db = getDatabase(client);
    await bounded(
      migrate(db, {
        migrationsFolder: new URL("../migrations", import.meta.url).pathname,
      }),
      30_000,
    );
    const base = createHollowContainer(db, "https://p5d.fixture.test", {
      send: async () => {},
    });
    const original = base.unitOfWorkProvider;
    let unitOfWorkCalls = 0;
    const originalRun = original.run.bind(original);
    original.run = (fn) => {
      if (++unitOfWorkCalls > 1024) {
        failed = true;
        recordSourceFault("uow-bound");
        throw new Error("P5D_DRIVE_CAPACITY_UOW_BOUND");
      }
      return originalRun(fn);
    };
    const clock = { now: () => new Date(now) };
    stop = () => base.passwordHasher.stop();
    await mkdir(objectsDirectory, { mode: 0o700 });
    const storage = new CoordinatedObjectStorage(
      objectsDirectory,
      original,
      clock,
    );
    await bounded(storage.recoverOwners());
    const node = await createNodeDrive(
      { clock, tokens: base.tokens },
      {
        appUrl: base.appUrl,
        configFile,
        canonicalDatabasePath: file,
        runtimeDirectory: ownerDirectory,
        storage,
        wake: () => {},
      },
    );
    if (!node || !hasDriveRetirement(node.services.execution))
      throw new Error("P5D_DRIVE_CAPACITY_NATIVE_FACTORY");
    const services = node.services;
    const execution = node.services.execution;
    stop = async () => {
      await execution.stop();
      await base.passwordHasher.stop();
    };
    const originalAcknowledge = execution.acknowledge;
    const nativeAcknowledgments: DriveClosedProof[] = [];
    execution.acknowledge = (proof) => {
      if (
        nativeAcknowledgments.length >= 68 ||
        nativeAcknowledgments.some(
          (value) => value.target.id === proof.target.id,
        )
      )
        throw new Error("P5D_DRIVE_CAPACITY_ACK_BOUND");
      const result = originalAcknowledge.call(execution, proof);
      void result
        .then(() => {
          nativeAcknowledgments.push(proof);
        })
        .catch(() => {
          failed = true;
        });
      return result;
    };
    restore = () => {
      execution.acknowledge = originalAcknowledge;
    };
    const drains: {
      receipt: DriveAcknowledgedReceipt;
      value: DriveAcknowledgment;
      read: boolean;
    }[] = [];
    const provider: HollowUnitOfWorkProvider = {
      run<T>(fn: (u: HollowUnitOfWorkContext) => Promise<T>): Promise<T> {
        return original.run(async (u) => {
          const save = u.accountDeletions.saveDriveAcknowledgment;
          const read = u.accountDeletions.driveAcknowledgment;
          u.accountDeletions.saveDriveAcknowledgment = async (value) => {
            const receipt = execution
              .acknowledgedReceipts(25)
              .find((row) => row.proof.target.id === value.id);
            if (
              !receipt ||
              !execution.verifyAcknowledgedReceipt(receipt) ||
              drains.some((row) => row.value.id === value.id)
            ) {
              recordSourceFault("native-receipt");
              throw new Error("P5D_DRIVE_CAPACITY_NATIVE_RECEIPT");
            }
            const saved = await save.call(u.accountDeletions, value);
            if (!saved || drains.length >= 68) {
              recordSourceFault("save-result");
              throw new Error("P5D_DRIVE_CAPACITY_SAVE");
            }
            u.afterCommit(() => {
              drains.push({ receipt, value, read: false });
              return undefined;
            });
            return saved;
          };
          u.accountDeletions.driveAcknowledgment = async (value) => {
            const found = await read.call(u.accountDeletions, value);
            const row = drains.find((entry) => entry.value.id === value.id);
            if (row) {
              if (
                !found ||
                row.read ||
                JSON.stringify(row.value) !== JSON.stringify(value) ||
                !execution.verifyAcknowledgedReceipt(row.receipt)
              ) {
                recordSourceFault("exact-read");
                throw new Error("P5D_DRIVE_CAPACITY_EXACT_READ");
              }
              u.afterCommit(() => {
                row.read = true;
                return undefined;
              });
            }
            return found;
          };
          try {
            return await fn(u);
          } finally {
            u.accountDeletions.saveDriveAcknowledgment = save;
            u.accountDeletions.driveAcknowledgment = read;
          }
        });
      },
    };
    const nativeContainer: HollowContainer = {
      ...base,
      clock,
      unitOfWorkProvider: provider,
      drive: services,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    };
    const container: HollowContainer = {
      ...nativeContainer,
      unitOfWorkProvider: provider,
    };
    const passwordHash = await bounded(
      container.passwordHasher.hash("P5d-self-only-password-2026"),
    );
    const guard = async () => {
      try {
        if (failed || closed || performance.now() - started > 180_000)
          throw new Error("P5D_DRIVE_CAPACITY_FIXTURE_UNAVAILABLE");
        await fileGuard();
        const row = (
          await client.execute(
            "select (select count(*) from accounts) accounts,(select count(*) from auth_browser_contexts) browsers,(select count(*) from drive_authorization_attempts) attempts,(select count(*) from account_deletion_debts) debts,(select count(*) from account_deletion_drive_acknowledgments) acknowledgments,(select count(*) from notes) notes,(select count(*) from workspaces) workspaces,(select count(*) from account_deletion_credential_uses) uses,(select count(*) from object_writes) writes",
          )
        ).rows[0];
        if (
          !row ||
          typeof row.accounts !== "number" ||
          row.accounts > 1 ||
          typeof row.browsers !== "number" ||
          row.browsers > 1 ||
          typeof row.attempts !== "number" ||
          row.attempts > 68 ||
          typeof row.debts !== "number" ||
          row.debts !== 0 ||
          typeof row.acknowledgments !== "number" ||
          row.acknowledgments > 68 ||
          row.notes !== 0 ||
          row.workspaces !== 0 ||
          row.uses !== 0 ||
          row.writes !== 0
        )
          throw new Error("P5D_DRIVE_CAPACITY_ENTITY_BOUND");
      } catch (error) {
        failed = true;
        throw error;
      }
    };
    await guard();
    return {
      client,
      container,
      nativeContainer,
      services,
      execution,
      drains,
      nativeAcknowledgments,
      guard,
      advanceWindow() {
        now = new Date(now.getTime() + 600_001);
      },
      advanceHistory() {
        now = new Date(now.getTime() + 7_776_000_001);
      },
      sourceFault() {
        return sourceFault;
      },
      unitOfWorkCalls() {
        return unitOfWorkCalls;
      },
      clientCalls() {
        return { methods: clientMethods, statements: clientStatements };
      },
      fail() {
        failed = true;
      },
      failed() {
        return failed;
      },
      async count(
        table:
          | "drive_authorization_attempts"
          | "account_deletions"
          | "account_deletion_debts"
          | "account_deletion_drive_acknowledgments"
          | "account_deletion_credential_uses"
          | "account_deletion_credential_origins",
      ) {
        const row = (await client.execute(`select count(*) n from ${table}`))
          .rows[0];
        if (!row || typeof row.n !== "number") {
          recordSourceFault("count-result");
          throw new Error("P5D_DRIVE_CAPACITY_COUNT");
        }
        return row.n;
      },
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
        const browserToken = container.tokens.generate();
        const browser = await ensureAuthenticationBrowser(
          nativeContainer,
          browserToken,
        );
        const session = await provider.run(async (u) => {
          await u.accounts.save(account);
          return issueSession(nativeContainer, u.accounts, account, browser);
        });
        await guard();
        return {
          account,
          token: session.token,
          request: { browserToken, sessionToken: session.token },
        };
      },
      async close() {
        if (closed) return;
        let stopped = false;
        try {
          await bounded(execution.stop(), 10_000);
          stopped = true;
          await bounded(base.passwordHasher.stop());
          if (!failed) {
            if (
              (await bounded(client.execute("PRAGMA foreign_key_check"))).rows
                .length
            )
              throw new Error("P5D_DRIVE_CAPACITY_FOREIGN_KEYS");
            if (
              (await bounded(client.execute("PRAGMA integrity_check"))).rows[0]
                ?.integrity_check !== "ok"
            )
              throw new Error("P5D_DRIVE_CAPACITY_INTEGRITY");
            await bounded(client.execute("PRAGMA wal_checkpoint(TRUNCATE)"));
            await fileGuard();
          }
        } finally {
          restore();
          client.close();
          closed = true;
        }
        if (!failed && stopped)
          process.stdout.write(
            'P5D_DRIVE_CAPACITY {"event":"fixture-closed","executionStopped":true,"clientClosed":true}\n',
          );
      },
    };
  } catch (error) {
    try {
      if (stop) await bounded(stop(), 10_000);
    } finally {
      restore();
      client.close();
    }
    throw error;
  }
}
export type DriveCapacityFixture = Awaited<
  ReturnType<typeof createDriveCapacityFixture>
>;
