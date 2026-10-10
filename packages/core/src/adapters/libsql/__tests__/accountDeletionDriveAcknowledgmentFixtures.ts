import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
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
import type {
  AccountDeletionIntent,
  DriveAcknowledgment,
} from "@repo/core/domain/account/deletion";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import type { AccountDeletionRepository } from "@repo/core/domain/account/ports/accountDeletionRepository";
import type { DriveAttempt } from "@repo/core/domain/integration/drive";
import { migrate } from "drizzle-orm/libsql/migrator";
import { z } from "zod";
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
        throw new Error("P5D_DRIVE_ACK_DEADLINE");
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
    throw new Error("P5D_DRIVE_ACK_DIRECTORY");
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
const debtSchema = z
  .object({
    intent_id: z.string(),
    kind: z.literal("drive-attempt"),
    owner_id: z.string(),
    locator: z
      .string()
      .transform((value, context) => {
        try {
          const parsed: unknown = JSON.parse(value);
          return parsed;
        } catch {
          context.addIssue({
            code: "custom",
            message: "P5D_DRIVE_ACK_LOCATOR",
          });
          return z.NEVER;
        }
      })
      .pipe(
        z
          .object({
            table: z.literal("drive-attempts"),
            id: z.string(),
            version: z.number().int().positive(),
            runtimeId: z.string(),
            token: z.string(),
            cancelGeneration: z.number().int().nonnegative(),
          })
          .strict(),
      ),
  })
  .strict();
export class NativeAckBeforeInvoke extends Error {}
let opened = false;
export async function createDriveAcknowledgmentFixture() {
  const root = process.env.HOLLOW_ACCOUNT_DELETION_DRIVE_ACK_ROOT;
  if (!root || !isAbsolute(root) || opened)
    throw new Error("P5D_DRIVE_ACK_FRESH_ROOT");
  await directory(root);
  opened = true;
  const started = performance.now();
  let failed = false;
  let closed = false;
  let now = new Date("2026-10-06T00:00:00.000Z");
  const file = join(root, "drive-ack.db");
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
    if (entries.length > 8) throw new Error("P5D_DRIVE_ACK_ROOT_ENTRIES");
    for (const name of entries) {
      const path = join(root, name);
      if (name === "drive-owner" || name === "objects") {
        await directory(path);
        const files = await readdir(path);
        if (files.length > (name === "drive-owner" ? 3 : 2))
          throw new Error("P5D_DRIVE_ACK_OWNER_ENTRIES");
        for (const child of files) {
          const allowed =
            name === "drive-owner"
              ? child === "owner.json" ||
                child === "recovery.lock" ||
                /^owner-[a-f0-9-]{36}\.tmp$/.test(child)
              : child === ".hollow-writer-owner" ||
                child === ".hollow-writer-owner.recovery";
          if (!allowed) throw new Error("P5D_DRIVE_ACK_OWNER_PATH");
          const value = await lstat(join(path, child));
          if (
            !value.isFile() ||
            value.isSymbolicLink() ||
            value.nlink !== 1 ||
            value.uid !== process.getuid?.() ||
            (value.mode & 0o7777) !== 0o600 ||
            value.size > (name === "drive-owner" ? 16_384 : 256)
          )
            throw new Error("P5D_DRIVE_ACK_OWNER_FILE");
          if (child === ".hollow-writer-owner.recovery" && value.size !== 0)
            throw new Error("P5D_DRIVE_ACK_RECOVERY_SIZE");
          total += value.size;
        }
        continue;
      }
      if (
        ![
          "drive-ack.db",
          "drive-ack.db-wal",
          "drive-ack.db-shm",
          "drive.key",
          "drive-keyring.json",
          "drive.json",
        ].includes(name)
      )
        throw new Error("P5D_DRIVE_ACK_ROOT_PATH");
      const value = await lstat(path);
      if (
        !value.isFile() ||
        value.isSymbolicLink() ||
        value.nlink !== 1 ||
        value.uid !== process.getuid?.() ||
        (value.mode & 0o7777) !== 0o600
      )
        throw new Error("P5D_DRIVE_ACK_FILE");
      if (name === "drive.key" && value.size !== 32)
        throw new Error("P5D_DRIVE_ACK_KEY_SIZE");
      if (name === "drive.json" || name === "drive-keyring.json")
        configBytes += value.size;
      if (name.startsWith("drive-ack.db")) databases += value.size;
      total += value.size;
    }
    if (
      databases > 32 * 1024 ** 2 ||
      configBytes > 16_384 ||
      total > 192 * 1024 ** 2
    )
      throw new Error("P5D_DRIVE_ACK_BYTES");
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
      throw new Error("P5D_DRIVE_ACK_NATIVE_FACTORY");
    const services = node.services;
    const execution = node.services.execution;
    stop = async () => {
      await execution.stop();
      await base.passwordHasher.stop();
    };
    const originalAcknowledge = execution.acknowledge;
    const ackFault = new NativeAckBeforeInvoke();
    let faultTarget: string | null = null;
    let faultEnabled = false;
    let faultProof: DriveClosedProof | null = null;
    const faultCalls: {
      proof: DriveClosedProof;
      row: DriveAttempt;
      caller: ReturnType<typeof execution.caller>;
    }[] = [];
    const nativeAcknowledgments: {
      proof: DriveClosedProof;
      caller: ReturnType<typeof execution.caller>;
    }[] = [];
    execution.acknowledge = async (proof) => {
      if (proof.target.id === faultTarget) {
        const row = await original.run((u) =>
          u.driveAttempts.find(proof.target.id),
        );
        const closure = execution.closure(proof.target);
        if (
          proof.target.kind !== "authorization" ||
          proof.source !== "local-close" ||
          !row ||
          row.owner.state !== "closed" ||
          row.owner.runtimeGeneration !==
            proof.target.owner.runtimeGeneration ||
          row.owner.token !== proof.target.owner.token ||
          !row.terminalAt ||
          row.data.phase !== "failed" ||
          closure.kind !== "closed" ||
          closure.proof !== proof ||
          (faultProof !== null && faultProof !== proof)
        )
          throw new Error("P5D_DRIVE_ACK_EXACT_SAVED_PROOF");
        faultProof = proof;
        if (faultEnabled) {
          if (faultCalls.length >= 2)
            throw new Error("P5D_DRIVE_ACK_FAULT_BOUND");
          faultCalls.push({
            proof,
            row,
            caller: execution.caller(proof.target),
          });
          throw ackFault;
        }
      }
      if (
        nativeAcknowledgments.length >= 2 ||
        nativeAcknowledgments.some(
          (value) => value.proof.target.id === proof.target.id,
        )
      )
        throw new Error("P5D_DRIVE_ACK_NATIVE_BOUND");
      const caller = execution.caller(proof.target);
      const result = await originalAcknowledge.call(execution, proof);
      nativeAcknowledgments.push({ proof, caller });
      return result;
    };
    restore = () => {
      execution.acknowledge = originalAcknowledge;
    };
    const pages: {
      intent: AccountDeletionIntent;
      result: Awaited<ReturnType<AccountDeletionRepository["step"]>>;
    }[] = [];
    const drains: {
      receipt: DriveAcknowledgedReceipt;
      value: DriveAcknowledgment;
    }[] = [];
    const provider: HollowUnitOfWorkProvider = {
      async run<T>(fn: (u: HollowUnitOfWorkContext) => Promise<T>): Promise<T> {
        const touched: {
          page: (typeof pages)[number] | null;
          acknowledgment: (typeof drains)[number] | null;
        } = { page: null, acknowledgment: null };
        const result = await original.run(async (u) => {
          const step = u.accountDeletions.step;
          const save = u.accountDeletions.saveDriveAcknowledgment;
          u.accountDeletions.step = async (...args) => {
            const value = await step.call(u.accountDeletions, ...args);
            if (touched.page) throw new Error("P5D_DRIVE_ACK_PAGE_BOUND");
            touched.page = { intent: args[0], result: value };
            return value;
          };
          u.accountDeletions.saveDriveAcknowledgment = async (value) => {
            const receipt = execution
              .acknowledgedReceipts(25)
              .find((row) => row.proof.target.id === value.id);
            if (
              !receipt ||
              !execution.verifyAcknowledgedReceipt(receipt) ||
              touched.acknowledgment
            )
              throw new Error("P5D_DRIVE_ACK_NATIVE_RECEIPT");
            const saved = await save.call(u.accountDeletions, value);
            if (saved) touched.acknowledgment = { receipt, value };
            return saved;
          };
          try {
            return await fn(u);
          } finally {
            u.accountDeletions.step = step;
            u.accountDeletions.saveDriveAcknowledgment = save;
          }
        });
        if (touched.page) {
          if (pages.length >= 64) throw new Error("P5D_DRIVE_ACK_PAGE_BOUND");
          pages.push(touched.page);
        }
        if (touched.acknowledgment) {
          const { receipt, value } = touched.acknowledgment;
          if (
            drains.length >= 2 ||
            !execution.verifyAcknowledgedReceipt(receipt) ||
            !(await original.run((u) =>
              u.accountDeletions.driveAcknowledgment(value),
            ))
          )
            throw new Error("P5D_DRIVE_ACK_COMMITTED_RECEIPT");
          drains.push({ receipt, value });
        }
        return result;
      },
    };
    const nativeContainer: HollowContainer = {
      ...base,
      clock,
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
          throw new Error("P5D_DRIVE_ACK_FIXTURE_UNAVAILABLE");
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
          row.attempts > 2 ||
          typeof row.debts !== "number" ||
          row.debts > 1 ||
          typeof row.acknowledgments !== "number" ||
          row.acknowledgments > 2 ||
          row.notes !== 0 ||
          row.workspaces !== 0 ||
          row.uses !== 0 ||
          row.writes !== 0
        )
          throw new Error("P5D_DRIVE_ACK_ENTITY_BOUND");
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
      pages,
      drains,
      nativeAcknowledgments,
      guard,
      restore,
      advance() {
        now = new Date(now.getTime() + 2_001);
      },
      fail() {
        failed = true;
      },
      failed() {
        return failed;
      },
      ackFault,
      faultCalls,
      fault(id: string) {
        if (faultTarget !== null) throw new Error("P5D_DRIVE_ACK_TARGET_BOUND");
        faultTarget = id;
        faultEnabled = true;
      },
      releaseFault() {
        faultEnabled = false;
      },
      async debts() {
        return (
          await client.execute(
            "select intent_id,kind,owner_id,locator from account_deletion_debts order by owner_id,locator",
          )
        ).rows.map((row) => {
          const value = debtSchema.parse(row);
          return {
            intentId: value.intent_id,
            kind: value.kind,
            ownerId: value.owner_id,
            locator: value.locator,
          };
        });
      },
      async count(
        table:
          | "account_deletion_drive_acknowledgments"
          | "account_deletion_credential_uses"
          | "account_deletion_credential_origins",
      ) {
        const row = (await client.execute(`select count(*) n from ${table}`))
          .rows[0];
        if (!row || typeof row.n !== "number")
          throw new Error("P5D_DRIVE_ACK_COUNT");
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
              throw new Error("P5D_DRIVE_ACK_FOREIGN_KEYS");
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
            'P5D_DRIVE_ACK {"event":"fixture-closed","executionStopped":true,"clientClosed":true}\n',
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
export type DriveAcknowledgmentFixture = Awaited<
  ReturnType<typeof createDriveAcknowledgmentFixture>
>;
