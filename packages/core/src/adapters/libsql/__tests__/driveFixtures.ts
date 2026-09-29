import {
  lstatSync,
  mkdtempSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import type { Client } from "@libsql/client";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import {
  DRIVE_LIMITS,
  type DriveAttempt,
  type DriveControl,
  type DriveControlData,
  type DriveOwner,
} from "@repo/core/domain/integration/drive";
import { migrate } from "drizzle-orm/libsql/migrator";
import { authBrowserContexts } from "../authSchema";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";

export const driveNow = new Date("2026-09-29T00:00:00.000Z");
let active = false;
let failed = false;
export function driveFixtureStatus() {
  const root = process.env.DRIVE_TEST_ROOT;
  let regular = false;
  let noSymlink = false;
  let empty = false;
  if (root) {
    try {
      const s = lstatSync(root);
      regular = s.isDirectory();
      noSymlink = !s.isSymbolicLink();
      if (regular && noSymlink) empty = readdirSync(root).length === 0;
    } catch {}
  }
  return {
    configured: Boolean(root),
    tmpMatches: Boolean(
      root &&
        process.env.TMPDIR &&
        root === path.join(process.env.TMPDIR, "db"),
    ),
    absolute: Boolean(root && path.isAbsolute(root)),
    regular,
    noSymlink,
    empty,
    active,
    failed,
  };
}
export async function driveRejected(work: () => Promise<unknown>) {
  try {
    await work();
    return false;
  } catch {
    return true;
  }
}
export async function driveFixture() {
  const root = process.env.DRIVE_TEST_ROOT;
  if (
    !root ||
    !process.env.TMPDIR ||
    root !== path.join(process.env.TMPDIR, "db") ||
    !path.isAbsolute(root) ||
    active ||
    failed ||
    !lstatSync(root).isDirectory() ||
    lstatSync(root).isSymbolicLink() ||
    readdirSync(root).length !== 0
  )
    throw Error("DRIVE_FIXTURE_GUARD");
  active = true;
  const dir = mkdtempSync(path.join(root, "drive-"));
  const file = path.join(dir, "app.db");
  let client: Client | undefined;
  try {
    client = createLibsqlClient({ url: `file:${file}` });
    const ownedClient = client;
    await applyPragmas(client);
    const db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
    });
    const uow = new LibsqlHollowUnitOfWorkProvider(db);
    let sequence = 0;
    const id = () =>
      `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
    async function account(linked = true) {
      const accountId = id();
      await uow.run(async (u) => {
        await u.accounts.save(
          verifyAccount(
            createAccount(
              accountId,
              `${accountId}@fixture.invalid`,
              "synthetic",
              driveNow,
            ),
            driveNow,
          ),
        );
        const initial = await u.driveConnections.ensure(accountId, driveNow);
        if (linked)
          await u.driveConnections.replace(
            {
              ...initial,
              state: "linked",
              epoch: 1,
              credentialVersion: 1,
              settingsVersion: 2,
              version: 2,
              credential: {
                subject: "synthetic-subject",
                email: null,
                envelope: "synthetic-envelope",
                scopes: [
                  "openid",
                  "https://www.googleapis.com/auth/drive.file",
                ],
                accessExpiresAt: new Date(driveNow.getTime() + 3_600_000),
                connectedAt: driveNow,
              },
            },
            initial.version,
            "adopt",
          );
      });
      const browserHash = `synthetic-browser-${accountId}`;
      await db.insert(authBrowserContexts).values({
        hash: browserHash,
        epoch: 1,
        retainUntil: new Date(driveNow.getTime() + DRIVE_LIMITS.receiptMs),
        updatedAt: driveNow,
      });
      return {
        accountId,
        sessionHash: `synthetic-session-${accountId}`,
        authVersion: 1,
        browserHash,
        browserEpoch: 1,
      };
    }
    const context = await account();
    async function base(ctx = context) {
      const c = await uow.run((u) => u.driveConnections.find(ctx.accountId));
      if (!c) throw Error("DRIVE_FIXTURE_CONNECTION");
      return {
        id: id(),
        accountId: ctx.accountId,
        commandId: id(),
        context: ctx,
        expectedEpoch: c.epoch,
        expectedCredentialVersion: c.credentialVersion,
        expectedSettingsVersion: c.settingsVersion,
        version: 1,
        cancelGeneration: 0,
        owner: { state: "none" as const },
        createdAt: driveNow,
        expiresAt: new Date(driveNow.getTime() + DRIVE_LIMITS.operationMs),
        updatedAt: driveNow,
        terminalAt: null,
      };
    }
    async function attempt(
      ctx = context,
    ): Promise<DriveAttempt & { data: { phase: "pending" } }> {
      const b = await base(ctx);
      return {
        ...b,
        stateHash: `synthetic-state-${id()}`,
        nonceHash: `synthetic-nonce-${id()}`,
        confirmedAdmissionSequence: 0,
        returnTo: "settings",
        data: { phase: "pending", verifierEnvelope: "synthetic-verifier" },
      };
    }
    async function control(
      data: DriveControlData & { phase: "queued" } = {
        kind: "folder-create",
        phase: "queued",
      },
      ctx = context,
    ): Promise<DriveControl & { data: { phase: "queued" } }> {
      return {
        ...(await base(ctx)),
        subject: "synthetic-subject",
        expiresAt: new Date(
          driveNow.getTime() +
            (data.kind === "picker"
              ? DRIVE_LIMITS.pickerMs
              : DRIVE_LIMITS.operationMs),
        ),
        data,
      };
    }
    const owner = (): DriveOwner & { state: "active" } => ({
      state: "active",
      runtimeGeneration: "synthetic-runtime",
      token: `synthetic-owner-${id()}`,
    });
    return {
      client,
      db,
      uow,
      id,
      context,
      account,
      attempt,
      control,
      owner,
      async close(success: boolean) {
        let clean = success;
        try {
          if (
            (await ownedClient.execute("PRAGMA foreign_key_check")).rows
              .length !== 0
          ) {
            clean = false;
            throw Error("DRIVE_FIXTURE_FK");
          }
        } finally {
          ownedClient.close();
          const files = readdirSync(dir);
          let bytes = 0;
          for (const name of files) {
            const st = lstatSync(path.join(dir, name));
            if (
              !["app.db", "app.db-wal", "app.db-shm"].includes(name) ||
              !st.isFile() ||
              st.isSymbolicLink()
            ) {
              clean = false;
              break;
            }
            bytes += st.size;
          }
          if (bytes > 16 * 1024 * 1024) clean = false;
          if (clean) {
            for (const name of files) unlinkSync(path.join(dir, name));
            rmdirSync(dir);
          } else failed = true;
          active = false;
        }
        if (!clean && success) throw Error("DRIVE_FIXTURE_RESIDUAL");
      },
    };
  } catch {
    client?.close();
    active = false;
    failed = true;
    throw Error("DRIVE_FIXTURE_SETUP");
  }
}
