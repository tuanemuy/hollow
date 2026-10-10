import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { acquireCredentialRuntime } from "@repo/core/adapters/node/auth/credentialRuntimeOwnership";
import { readNodeOpenRouter } from "@repo/core/adapters/node/openrouter/config";
import { ensureAuthenticationBrowser } from "@repo/core/application/account/context";
import type { CredentialClosedProof } from "@repo/core/application/account/ports";
import { ownsCredentials } from "@repo/core/application/account/ports";
import { issueSession } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import type {
  AccountDeletionIntent,
  CredentialUse,
} from "@repo/core/domain/account/deletion";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import type { AccountDeletionRepository } from "@repo/core/domain/account/ports/accountDeletionRepository";
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
        throw new Error("P5D_MULTI_DEADLINE");
      }),
    ]);
  } finally {
    controller.abort();
  }
}
function gate() {
  let enter = () => {};
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const resumed = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    ready: () => bounded(ready),
    release,
    async wait() {
      enter();
      await bounded(resumed);
    },
  };
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
    throw new Error("P5D_MULTI_DIRECTORY");
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
let opened = false;
export async function createMultipleCredentialDebtFixture() {
  const root = process.env.HOLLOW_ACCOUNT_DELETION_MULTI_ROOT;
  if (!root || !isAbsolute(root) || opened)
    throw new Error("P5D_MULTI_FRESH_ROOT");
  await directory(root);
  opened = true;
  const started = performance.now();
  let failed = false;
  let closed = false;
  let now = new Date("2026-10-06T00:00:00.000Z");
  const file = join(root, "native-credentials.db");
  const ownerDirectory = join(root, "openrouter-owner");
  const keyFile = join(root, "openrouter.key");
  const configFile = join(root, "openrouter.json");
  const fileGuard = async () => {
    await directory(root);
    let total = 0;
    let databases = 0;
    const entries = await readdir(root);
    if (entries.length > 6) throw new Error("P5D_MULTI_ROOT_ENTRIES");
    for (const name of entries) {
      const path = join(root, name);
      if (name === "openrouter-owner") {
        await directory(path);
        const ownerFiles = await readdir(path);
        if (ownerFiles.length > 3) throw new Error("P5D_MULTI_OWNER_ENTRIES");
        for (const ownerFile of ownerFiles) {
          if (
            ownerFile !== "owner.json" &&
            ownerFile !== "recovery.lock" &&
            !/^owner-[a-f0-9-]{36}\.tmp$/.test(ownerFile)
          )
            throw new Error("P5D_MULTI_OWNER_PATH");
          const value = await lstat(join(path, ownerFile));
          if (
            !value.isFile() ||
            value.isSymbolicLink() ||
            value.nlink !== 1 ||
            value.uid !== process.getuid?.() ||
            (value.mode & 0o7777) !== 0o600 ||
            value.size > 16_384
          )
            throw new Error("P5D_MULTI_OWNER_FILE");
          total += value.size;
        }
        continue;
      }
      if (
        ![
          "native-credentials.db",
          "native-credentials.db-wal",
          "native-credentials.db-shm",
          "openrouter.key",
          "openrouter.json",
        ].includes(name)
      )
        throw new Error("P5D_MULTI_ROOT_PATH");
      const value = await lstat(path);
      if (
        !value.isFile() ||
        value.isSymbolicLink() ||
        value.nlink !== 1 ||
        value.uid !== process.getuid?.() ||
        (value.mode & 0o7777) !== 0o600
      )
        throw new Error("P5D_MULTI_FILE");
      if (
        (name === "openrouter.key" && value.size !== 32) ||
        (name === "openrouter.json" && value.size > 16_384)
      )
        throw new Error("P5D_MULTI_SECRET_SIZE");
      if (name.startsWith("native-credentials.db")) databases += value.size;
      total += value.size;
    }
    if (databases > 32 * 1024 ** 2 || total > 192 * 1024 ** 2)
      throw new Error("P5D_MULTI_BYTES");
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
    configFile,
    new TextEncoder().encode(JSON.stringify({ keyFile })),
  );
  const client = createLibsqlClient({ url: `file:${file}` });
  let stop: (() => Promise<void>) | null = null;
  const gates: ReturnType<typeof gate>[] = [];
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
    const original = base.unitOfWorkProvider;
    const clock = { now: () => new Date(now) };
    const services = await readNodeOpenRouter(
      configFile,
      base.appUrl,
      clock,
      () =>
        acquireCredentialRuntime(
          ownerDirectory,
          file,
          "openrouter",
          db,
          original,
        ),
    );
    if (!services || !ownsCredentials(services.execution))
      throw new Error("P5D_MULTI_NATIVE_FACTORY");
    const execution = services.execution;
    stop = async () => {
      await execution.stop();
      await base.passwordHasher.stop();
    };
    const callerGates = new Map<string, ReturnType<typeof gate>>();
    const pages: {
      intent: AccountDeletionIntent;
      result: Awaited<ReturnType<AccountDeletionRepository["step"]>>;
    }[] = [];
    const receipts: {
      phase: "closure" | "ack";
      proof: CredentialClosedProof;
      saved: CredentialUse;
    }[] = [];
    const provider: HollowUnitOfWorkProvider = {
      async run<T>(fn: (u: HollowUnitOfWorkContext) => Promise<T>): Promise<T> {
        const touched: {
          failedSource: string | null;
          page: (typeof pages)[number] | null;
          receipt: {
            phase: "closure" | "ack";
            proof: CredentialClosedProof;
          } | null;
        } = { failedSource: null, page: null, receipt: null };
        const result = await original.run(async (u) => {
          const replace = u.openRouterAttempts.replace;
          const step = u.accountDeletions.step;
          const saveClosure = u.accountDeletions.saveCredentialClosure;
          const acknowledge = u.accountDeletions.acknowledgeCredentialUse;
          const observe = (
            phase: "closure" | "ack",
            target: Parameters<typeof saveClosure>[0],
          ) => {
            const proof = execution.closure(target);
            if (!proof || touched.receipt)
              throw new Error("P5D_MULTI_PRIVATE_CLOSURE");
            touched.receipt = { phase, proof };
          };
          u.accountDeletions.saveCredentialClosure = async (...args) => {
            const value = await saveClosure.call(u.accountDeletions, ...args);
            if (value) observe("closure", args[0]);
            return value;
          };
          u.accountDeletions.acknowledgeCredentialUse = async (...args) => {
            const value = await acknowledge.call(u.accountDeletions, ...args);
            if (value) observe("ack", args[0]);
            return value;
          };
          u.openRouterAttempts.replace = async (...args) => {
            const value = await replace.call(u.openRouterAttempts, ...args);
            if (value && args[0].state === "failed") {
              if (touched.failedSource)
                throw new Error("P5D_MULTI_REPLACE_BOUND");
              touched.failedSource = args[0].id;
            }
            return value;
          };
          u.accountDeletions.step = async (...args) => {
            const value = await step.call(u.accountDeletions, ...args);
            if (touched.page) throw new Error("P5D_MULTI_STEP_BOUND");
            touched.page = { intent: args[0], result: value };
            return value;
          };
          try {
            return await fn(u);
          } finally {
            u.openRouterAttempts.replace = replace;
            u.accountDeletions.step = step;
            u.accountDeletions.saveCredentialClosure = saveClosure;
            u.accountDeletions.acknowledgeCredentialUse = acknowledge;
          }
        });
        if (touched.receipt) {
          const { phase, proof } = touched.receipt;
          const saved = await original.run((u) =>
            u.accountDeletions.credentialUse(proof.target.id),
          );
          if (
            !saved ||
            saved.state !== "closed" ||
            !execution.verify(proof, saved) ||
            receipts.length >= 6
          )
            throw new Error("P5D_MULTI_COMMITTED_CLOSURE");
          receipts.push({ phase, proof, saved });
        }
        if (touched.page) {
          if (pages.length >= 64) throw new Error("P5D_MULTI_WAKE_BOUND");
          pages.push(touched.page);
        }
        const held =
          touched.failedSource && callerGates.get(touched.failedSource);
        if (held) await held.wait();
        return result;
      },
    };
    const nativeContainer: HollowContainer = {
      ...base,
      clock,
      openRouter: services,
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
          throw new Error("P5D_MULTI_FIXTURE_UNAVAILABLE");
        await fileGuard();
        const result = await client.execute(
          "select (select count(*) from accounts) accounts,(select count(*) from auth_browser_contexts) browsers,(select count(*) from openrouter_attempts) attempts,(select count(*) from account_deletion_credential_uses) uses,(select count(*) from notes) notes,(select count(*) from workspaces) workspaces",
        );
        const row = result.rows[0];
        if (
          !row ||
          typeof row.accounts !== "number" ||
          row.accounts > 1 ||
          typeof row.browsers !== "number" ||
          row.browsers > 1 ||
          typeof row.attempts !== "number" ||
          row.attempts > 3 ||
          typeof row.uses !== "number" ||
          row.uses > 3 ||
          row.notes !== 0 ||
          row.workspaces !== 0
        )
          throw new Error("P5D_MULTI_ENTITY_BOUND");
      } catch (error) {
        failed = true;
        throw error;
      }
    };
    await guard();
    return {
      root,
      client,
      container,
      nativeContainer,
      execution,
      guard,
      advance() {
        now = new Date(now.getTime() + 2_001);
      },
      fail() {
        failed = true;
      },
      failed() {
        return failed;
      },
      pages,
      receipts,
      holdFailedCaller(sourceId: string) {
        if (callerGates.has(sourceId) || callerGates.size >= 2)
          throw new Error("P5D_MULTI_GATE_BOUND");
        const held = gate();
        callerGates.set(sourceId, held);
        gates.push(held);
        return held;
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
        const session = await original.run(async (u) => {
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
        for (const held of gates) held.release();
        let stopped = false;
        try {
          await bounded(execution.stop(), 10_000);
          stopped = true;
          await bounded(base.passwordHasher.stop());
          if (!failed) {
            const fk = await bounded(
              client.execute("PRAGMA foreign_key_check"),
            );
            if (fk.rows.length) throw new Error("P5D_MULTI_FOREIGN_KEYS");
            await bounded(client.execute("PRAGMA wal_checkpoint(TRUNCATE)"));
            await fileGuard();
          }
        } finally {
          client.close();
          closed = true;
        }
        if (!failed && stopped)
          process.stdout.write(
            'P5D_MULTI {"event":"fixture-closed","executionStopped":true,"clientClosed":true}\n',
          );
      },
    };
  } catch (error) {
    for (const held of gates) held.release();
    try {
      if (stop) await bounded(stop(), 10_000);
    } finally {
      client.close();
    }
    throw error;
  }
}
export type MultipleCredentialDebtFixture = Awaited<
  ReturnType<typeof createMultipleCredentialDebtFixture>
>;
