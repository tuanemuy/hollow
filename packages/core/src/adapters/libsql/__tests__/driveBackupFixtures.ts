import {
  closeSync,
  constants,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import type { Client } from "@libsql/client";
import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import type { AuthenticationRequest } from "@repo/core/application/account/ports";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { isDriveBackupOwnershipUnprovenError } from "@repo/core/application/integration/drive/backup/ownershipError";
import type {
  DriveBackupFile,
  DriveBackupProvider,
  DriveBackupReceived,
  DriveBackupSource,
} from "@repo/core/application/integration/drive/backup/ports";
import { requestDriveBackup } from "@repo/core/application/integration/drive/backup/request";
import { runDriveBackup } from "@repo/core/application/integration/drive/backup/runner";
import type {
  DriveFolderObservation,
  DriveSecretBinding,
  DriveServices,
} from "@repo/core/application/integration/drive/ports";
import { reconcileDriveClosures } from "@repo/core/application/integration/drive/runner";
import { beginNotePurge } from "@repo/core/application/note/purge";
import type { ObjectStorage } from "@repo/core/application/ports/objectStorage";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { Original } from "@repo/core/domain/import/entity";
import { DRIVE_LIMITS } from "@repo/core/domain/integration/drive";
import { DRIVE_BACKUP_LIMITS } from "@repo/core/domain/integration/driveBackup";
import { createNote } from "@repo/core/domain/note/entity";
import {
  TRASH_RETENTION_MS,
  trashLifecycle,
} from "@repo/core/domain/note/lifecycle";
import { isSerializableError } from "@repo/core/lib/error";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";

export const backupNow = new Date("2026-09-30T00:00:00.000Z");
export const backupFixtureHistory = {
  rows: 100,
  maxCaseJobs: 128,
  pruneBatch: 100,
} as const;
export function backupFixtureCreatedAt(offset: number) {
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > backupFixtureHistory.rows
  )
    throw fail("DRIVE_BACKUP_FIXTURE_TIME");
  return new Date(backupNow.getTime() + offset);
}
export const backupConfigured = Boolean(
  process.env.HOLLOW_DRIVE_BACKUP_TEST_ROOT,
);
const fail = (code = "DRIVE_BACKUP_FIXTURE") =>
  new BusinessRuleError(code, "バックアップ検証器具の状態を確認してください。");
export function closedWorld<T extends object>(provided: Partial<T>): T {
  return new Proxy(provided, {
    get(target, key) {
      if (!Reflect.has(target, key)) throw fail("DRIVE_BACKUP_FIXTURE_PORT");
      return Reflect.get(target, key);
    },
  }) as T;
}
export function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
export async function finite(work: () => Promise<unknown>) {
  try {
    await work();
    return "resolved";
  } catch (error) {
    return isSerializableError(error) &&
      "code" in error &&
      typeof error.code === "string"
      ? error.code
      : "UNEXPECTED";
  }
}
function rootPath() {
  try {
    const root = process.env.HOLLOW_DRIVE_BACKUP_TEST_ROOT;
    if (
      !root ||
      !path.isAbsolute(root) ||
      path.resolve(root) !== root ||
      realpathSync(root) !== root ||
      typeof process.getuid !== "function"
    )
      throw fail("DRIVE_BACKUP_FIXTURE_ROOT");
    const stat = lstatSync(root);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      stat.uid !== process.getuid() ||
      (stat.mode & 0o777) !== 0o700
    )
      throw fail("DRIVE_BACKUP_FIXTURE_ROOT");
    return root;
  } catch {
    throw fail("DRIVE_BACKUP_FIXTURE_ROOT");
  }
}
function fileBudget(file: string, limit = 16 * 1024 * 1024) {
  let bytes = 0;
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      const stat = lstatSync(file + suffix);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        typeof process.getuid !== "function" ||
        stat.uid !== process.getuid()
      )
        throw fail("DRIVE_BACKUP_FIXTURE_FILE");
      bytes += stat.size;
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw fail("DRIVE_BACKUP_FIXTURE_FILE");
    }
  }
  if (bytes > limit) throw fail("DRIVE_BACKUP_FIXTURE_BUDGET");
}
type Actor = Readonly<{ accountId: string; request: AuthenticationRequest }>;

export async function backupFixture(
  options: Readonly<{
    label?: "native" | `application-v${number}`;
    bytes?: number;
    sha256?: string;
    s3?: boolean;
    retarget?: boolean;
  }> = {},
) {
  const root = rootPath();
  const label =
    options.label ??
    process.env.HOLLOW_DRIVE_BACKUP_CASE_LABEL ??
    "application";
  if (!/^(?:application(?:-v(?:[2-9]|[1-9][0-9]))?|native)$/.test(label))
    throw fail("DRIVE_BACKUP_FIXTURE_LABEL");
  const file = path.join(root, `${label}.sqlite`);
  for (const suffix of ["-wal", "-shm"]) {
    try {
      lstatSync(file + suffix);
      throw fail("DRIVE_BACKUP_FIXTURE_EXISTS");
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw fail("DRIVE_BACKUP_FIXTURE_EXISTS");
    }
  }
  try {
    const descriptor = openSync(
      file,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_RDWR |
        constants.O_NOFOLLOW,
      0o600,
    );
    closeSync(descriptor);
  } catch {
    throw fail("DRIVE_BACKUP_FIXTURE_EXCLUSIVE_FILE");
  }
  let client: Client | undefined;
  try {
    const migrationsFolder = path.resolve(import.meta.dirname, "../migrations");
    const journal: unknown = JSON.parse(
      readFileSync(path.join(migrationsFolder, "meta/_journal.json"), "utf8"),
    );
    if (
      !journal ||
      typeof journal !== "object" ||
      !("entries" in journal) ||
      !Array.isArray(journal.entries) ||
      !journal.entries.some(
        (entry) => entry?.tag === "0041_drive_backup_target_heads",
      )
    )
      throw fail("DRIVE_BACKUP_FIXTURE_MIGRATION");
    client = createLibsqlClient({ url: `file:${file}` });
    await client.execute("PRAGMA page_size = 4096");
    await applyPragmas(client);
    await client.execute(
      options.s3 || options.retarget
        ? "PRAGMA max_page_count = 7168"
        : "PRAGMA max_page_count = 3584",
    );
    const db = getDatabase(client);
    await migrate(db, { migrationsFolder });
    await client.execute("PRAGMA wal_checkpoint(TRUNCATE)");
    const budget = () =>
      fileBudget(
        file,
        (options.s3 ? 32 : options.retarget ? 24 : 16) * 1024 * 1024,
      );
    budget();
    const base = createHollowContainer(db, "http://localhost:3100", {
      send: async () => {},
    });
    let serial = 0;
    const id = () =>
      `00000000-0000-4000-8000-${String(++serial).padStart(12, "0")}`;
    const uow = base.unitOfWorkProvider;
    const actors: Actor[] = [];
    const originals: Original[] = [];
    for (let i = 0; i < (options.s3 ? 11 : 3); i++) {
      const accountId = id();
      const request = {
        sessionToken: `backup-session-${i}`,
        browserToken: `backup-browser-${i}`,
      };
      actors.push({ accountId, request });
      await uow.run(async (u) => {
        await u.accounts.save(
          verifyAccount(
            createAccount(
              accountId,
              `backup-${i}@fixture.invalid`,
              "synthetic",
              backupNow,
            ),
            backupNow,
          ),
        );
        const browser = await u.authBrowsers.ensure(
          base.tokens.hash(request.browserToken),
          new Date(backupNow.getTime() + DRIVE_LIMITS.receiptMs),
          backupNow,
        );
        await u.accounts.saveSession({
          accountId,
          tokenHash: base.tokens.hash(request.sessionToken),
          browser,
          expiresAt: new Date(backupNow.getTime() + DRIVE_LIMITS.receiptMs),
        });
        await u.driveConnections.ensure(accountId, backupNow);
      });
    }
    const workspaceId = id();
    await uow.run(async (u) => {
      await u.workspaces.create({
        id: workspaceId,
        creatorId: actors[0]!.accountId,
        name: "Backup fixture",
        description: "",
        slug: null,
        createdAt: backupNow,
        state: "active",
      });
      for (let i = 0; i < actors.length; i++)
        await u.workspaces.join(
          workspaceId,
          actors[i]!.accountId,
          i === 0 ? "owner" : i === 1 || options.s3 ? "editor" : "viewer",
          backupNow,
        );
      for (let i = 0; i < 3; i++) {
        const accountId = actors[0]!.accountId;
        const noteId = id();
        await u.notes.insert(
          createNote(
            {
              id: noteId,
              accountId,
              ...(i === 1
                ? { owner: { kind: "workspace" as const, workspaceId } }
                : {}),
              title: `Original ${i}`,
              html: "<p>fixture</p>",
              text: "fixture",
            },
            backupNow,
          ),
        );
        const original: Original = {
          id: id(),
          noteId,
          accountId,
          name: `original-${i}.pdf`,
          bytes: options.bytes ?? DRIVE_BACKUP_LIMITS.chunkBytes + 17,
          storageKey: `backup-original-${i}`,
          sha256: options.sha256 ?? "a".repeat(64),
          format: "pdf",
          state: "ready",
          coverage: "complete",
          activeJobId: id(),
          createdAt: backupNow,
        };
        await u.imports.insertOriginal(original);
        originals.push(original);
      }
    });
    const ownedClient = client;
    return {
      db,
      base,
      uow,
      id,
      actors,
      originals,
      workspaceId,
      s3: options.s3 === true,
      retarget: options.retarget === true,
      originalCount: 3,
      caseTime: { now: backupNow },
      async cleanupTime() {
        if (!options.s3 && !options.retarget)
          return backupFixtureCreatedAt(backupFixtureHistory.rows);
        const [row] = (
          await ownedClient.execute(
            "select (select max(stamp) from (select max(updated_at) stamp from drive_backup_jobs union all select max(updated_at) from drive_backup_transfers)) as latest,count(*) as n from drive_backup_jobs",
          )
        ).rows;
        if (
          !row ||
          typeof row.n !== "number" ||
          row.n > 1200 ||
          (row.latest !== null &&
            (typeof row.latest !== "number" ||
              row.latest < backupNow.getTime() ||
              row.latest > backupNow.getTime() + 180 * 86400000))
        )
          throw fail("DRIVE_BACKUP_FIXTURE_HISTORY_BUDGET");
        return new Date(
          Math.max(backupNow.getTime(), Number(row.latest ?? 0)) + 1,
        );
      },
      failed: false,
      checkBudget: budget,
      async close() {
        try {
          if (
            (await ownedClient.execute("PRAGMA foreign_key_check")).rows.length
          )
            throw fail("DRIVE_BACKUP_FIXTURE_FK");
          await ownedClient.execute("PRAGMA wal_checkpoint(TRUNCATE)");
          budget();
        } finally {
          ownedClient.close();
        }
      },
    };
  } catch {
    client?.close();
    throw fail("DRIVE_BACKUP_FIXTURE_SETUP");
  }
}
export type BackupFixture = Awaited<ReturnType<typeof backupFixture>>;

export async function backupCase(
  f: BackupFixture,
  options: Readonly<{
    execution?: NodeDriveExecution;
    protector?: DriveServices["protector"];
  }> = {},
) {
  if (f.failed) throw fail("DRIVE_BACKUP_FIXTURE_STOPPED");
  let execution =
    options.execution ??
    new NodeDriveExecution("backup-test-runtime", undefined, {
      operationMs: 60_000,
      backupMs: 60_000,
      closeMs: 20,
    });
  const calls = {
    opens: 0,
    prepares: 0,
    closes: 0,
    allocate: 0,
    start: 0,
    query: 0,
    inspect: 0,
    refresh: 0,
    wakes: 0,
    ranges: [] as { offset: number; length: number }[],
    uploads: [] as { offset: number; length: number }[],
  };
  const controls = {
    holdClose: false,
    folder: "usable" as "usable" | "trashed" | "missing",
    uploadFailure: null as null | "DRIVE_BACKUP_QUOTA",
    unknownFirst: false,
    statusOffset: null as number | null,
    beforeRead: null as (() => Promise<void>) | null,
    beforeRefresh: null as (() => Promise<void>) | null,
    exchangeFailure: false,
    queryKind: null as
      | null
      | "session-expired"
      | "conflict"
      | "unknown"
      | "complete",
    startUnknown: false,
    now: f.s3 ? f.caseTime.now : backupNow,
  };
  const values = new Map<string, { binding: string; value: string }>();
  const protector: DriveServices["protector"] = options.protector ?? {
    available: () => true,
    protect(value, binding) {
      const envelope = `fixture-envelope-${f.id()}`;
      values.set(envelope, { binding: JSON.stringify(binding), value });
      return envelope;
    },
    reveal(envelope, binding) {
      const value = values.get(envelope);
      if (!value || value.binding !== JSON.stringify(binding))
        throw fail("DRIVE_BACKUP_FIXTURE_BINDING");
      return value.value;
    },
  };
  const folderId = "backup-folder";
  let file: DriveBackupFile | null = null;
  let totalReceived = 0;
  const files = new Map<string, { file: DriveBackupFile; received: number }>();
  let authorizationState = "";
  const releases: (() => void)[] = [];
  const writers = new Map<string, string>();
  const pending: Promise<string>[] = [];
  let c!: HollowContainer;
  const provider: DriveBackupProvider = {
    async allocateFileId() {
      calls.allocate++;
      return f.s3 ? `backup-file-${f.id()}` : "backup-file";
    },
    async startResumable(input) {
      calls.start++;
      file = {
        id: input.fileId,
        parents: [input.folderId],
        marker: input.marker,
        bytes: input.bytes,
        sha256: "a".repeat(64),
        trashed: false,
        webViewLink: `https://drive.google.com/file/d/${input.fileId}/view`,
        resourceKey: "fixture-file-resource",
      };
      if (f.s3) files.set(input.fileId, { file, received: 0 });
      if (controls.startUnknown) return { kind: "unknown" };
      return {
        kind: "started",
        session: f.s3 ? input.fileId : "fixture-session",
      };
    },
    async queryReceived(input) {
      calls.query++;
      if (f.s3) {
        const state = files.get(input.session);
        if (!state) throw fail();
        file = state.file;
        totalReceived = state.received;
      }
      if (controls.queryKind === "complete" && file) {
        totalReceived = file.bytes;
        return { kind: "complete", file };
      }
      if (controls.queryKind && controls.queryKind !== "complete")
        return { kind: controls.queryKind };
      return {
        kind: "incomplete",
        offset: controls.statusOffset ?? totalReceived,
      };
    },
    async uploadChunk(input): Promise<DriveBackupReceived> {
      if (f.s3) {
        const state = files.get(input.session);
        if (!state) throw fail();
        file = state.file;
        totalReceived = state.received;
      }
      calls.uploads.push({
        offset: input.offset,
        length: input.chunk.byteLength,
      });
      if (controls.uploadFailure) throw fail(controls.uploadFailure);
      totalReceived = input.offset + input.chunk.byteLength;
      if (f.s3 && file) files.set(file.id, { file, received: totalReceived });
      if (controls.unknownFirst && calls.uploads.length === 1)
        return { kind: "unknown" };
      if (!file) throw fail();
      return totalReceived === input.bytes
        ? { kind: "complete", file }
        : { kind: "incomplete", offset: totalReceived };
    },
    async inspectFile(input) {
      calls.inspect++;
      if (f.s3) {
        const state = files.get(input.fileId);
        return state && state.received === state.file.bytes ? state.file : null;
      }
      return totalReceived === file?.bytes ? file : null;
    },
  };
  const source: DriveBackupSource = {
    async open(input, signal) {
      calls.opens++;
      const release = execution.register(signal);
      const closed = gate();
      let released = false;
      const physicalClose = () => {
        if (released) return;
        released = true;
        release();
        closed.resolve();
      };
      releases.push(physicalClose);
      return {
        bytes: input.bytes,
        closed: closed.promise,
        async prepare() {
          calls.prepares++;
        },
        async readRange(offset, length) {
          calls.ranges.push({ offset, length });
          await controls.beforeRead?.();
          if (signal.aborted || released) throw fail("DRIVE_BACKUP_CANCELLED");
          return new Uint8Array(length);
        },
        async close() {
          calls.closes++;
          if (controls.holdClose)
            throw fail("DRIVE_BACKUP_FIXTURE_CLOSE_UNKNOWN");
          physicalClose();
        },
      };
    },
  };
  const storage = closedWorld<ObjectStorage>({
    async withOwner(owner, work) {
      if (owner.kind !== "drive-backup") throw fail();
      const writerId = f.id();
      await f.uow.run(async (u) => {
        const row = await u.driveBackupTransfers.find(owner.id);
        if (!row) throw fail();
        await u.objectOperations.beginWrite(
          writerId,
          execution.runtimeGeneration,
          owner,
          backupNow,
        );
        await u.objectOperations.registerKey(
          writerId,
          row.identity.storageKey,
          backupNow,
        );
      });
      writers.set(owner.id, writerId);
      let unknown = false;
      try {
        return await work();
      } catch (error) {
        unknown =
          isDriveBackupOwnershipUnprovenError(error) &&
          error.owner.id === owner.id;
        throw error;
      } finally {
        if (!unknown) {
          await f.uow.run((u) => u.objectOperations.endWrite(writerId));
          writers.delete(owner.id);
        }
      }
    },
  });
  const service: DriveServices = {
    get runtimeGeneration() {
      return execution.runtimeGeneration;
    },
    get execution() {
      return execution;
    },
    protector,
    picker: { appId: "1", apiKey: "fixture" },
    wake: () => {
      calls.wakes++;
    },
    authorization: {
      authorization: async (input) => {
        authorizationState = input.state;
        return "https://provider.invalid/authorize";
      },
      exchange: async () => {
        if (controls.exchangeFailure) throw fail("DRIVE_PROVIDER_REJECTED");
        return {
          accessToken: "fixture-candidate",
          refreshToken: "fixture-candidate-refresh",
          idToken: "fixture-id-token",
          scope: "openid https://www.googleapis.com/auth/drive.file",
          accessExpiresAt: new Date(backupNow.getTime() + 3_600_000),
        };
      },
      verifyCandidate: async () => ({
        subject: `backup-subject-${f.actors[0]!.accountId}`,
        email: null,
        scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
      }),
      async refresh() {
        calls.refresh++;
        await controls.beforeRefresh?.();
        return {
          accessToken: "fixture-refreshed",
          refreshToken: null,
          idToken: null,
          scope: null,
          accessExpiresAt: new Date(backupNow.getTime() + 3_600_000),
        };
      },
    },
    folders: {
      generateFolderId: async () => {
        throw fail();
      },
      createFolder: async () => {
        throw fail();
      },
      async inspectFolder(input): Promise<DriveFolderObservation> {
        if (controls.folder === "trashed")
          return { kind: "trashed", explicitly: true };
        if (controls.folder === "missing")
          return { kind: "unavailable-ambiguous" };
        return {
          kind: "usable",
          folder: { id: input.fileId, name: "Backup folder", driveId: null },
          resourceKey: "fixture-folder-resource",
          parents: ["root"],
          marker: null,
        };
      },
    },
    backup: { provider, source },
  };
  c = {
    ...f.base,
    unitOfWorkProvider: f.uow,
    clock: { now: () => controls.now },
    idGenerator: { next: f.id, validate: () => true },
    tokens: { hash: (token) => f.base.tokens.hash(token), generate: f.id },
    logger: { info() {}, warn() {}, error() {} },
    drive: service,
    importing: closedWorld<NonNullable<HollowContainer["importing"]>>({
      storage,
      wake() {},
    }),
  };
  for (const actor of f.actors)
    await f.uow.run(async (u) => {
      const previous = await u.driveConnections.ensure(
        actor.accountId,
        controls.now,
      );
      const epoch = previous.epoch + 1;
      const credentialVersion = previous.credentialVersion + 1;
      const subject = `backup-subject-${actor.accountId}`;
      const binding: DriveSecretBinding = {
        purpose: "credential",
        accountId: actor.accountId,
        subject,
        epoch,
        credentialVersion,
      };
      const adopted = {
        ...previous,
        state: "linked" as const,
        epoch,
        credentialVersion,
        version: previous.version + 1,
        settingsVersion: previous.settingsVersion + 1,
        autoBackup: false,
        folder: null,
        lastUsedAt: null,
        updatedAt: controls.now,
        credential: {
          subject,
          email: null,
          envelope: protector.protect(
            JSON.stringify({
              version: 1,
              accessToken: "fixture-access",
              refreshToken: "fixture-refresh",
            }),
            binding,
          ),
          scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
          accessExpiresAt: new Date(controls.now.getTime() + 3_600_000),
          connectedAt: controls.now,
        },
      };
      if (
        !(await u.driveConnections.replace(adopted, previous.version, "adopt"))
      )
        throw fail();
      const folder = {
        id: folderId,
        name: "Backup folder",
        driveId: null,
        resourceKeyEnvelope: protector.protect("fixture-folder-resource", {
          purpose: "resource-key",
          accountId: actor.accountId,
          subject,
          epoch,
          fileId: folderId,
        }),
        checkedAt: controls.now,
      };
      if (
        !(await u.driveConnections.replace(
          {
            ...adopted,
            folder,
            settingsVersion: adopted.settingsVersion + 1,
            version: adopted.version + 1,
          },
          adopted.version,
          "folder",
        ))
      )
        throw fail();
    });
  async function admission(
    actor = f.actors[0]!,
    original = f.originals[0]!,
    commandId = f.id(),
  ) {
    const connection = await f.uow.run((u) =>
      u.driveConnections.find(actor.accountId),
    );
    if (!connection) throw fail();
    const input = {
      commandId,
      noteId: original.noteId,
      expectedEpoch: connection.epoch,
      expectedSettingsVersion: connection.settingsVersion,
    };
    const receipt = await requestDriveBackup(c, actor.request, input);
    const job = await f.uow.run((u) => u.driveBackupJobs.find(receipt.jobId));
    if (!job?.targetId) throw fail();
    const [transfer] = await f.uow.run((u) =>
      u.driveBackupTransfers.forTarget(job.targetId!),
    );
    return { actor, original, input, receipt, transfer };
  }
  return {
    c,
    get execution() {
      return execution;
    },
    replaceExecution(next: NodeDriveExecution) {
      if (writers.size || pending.length || execution.accepting())
        throw fail("DRIVE_BACKUP_FIXTURE_RUNTIME");
      execution = next;
    },
    calls,
    controls,
    service,
    writers,
    admission,
    authorizationState: () => authorizationState,
    run(id: string) {
      const result = finite(() =>
        runDriveBackup(c, id, execution.runtimeGeneration),
      );
      pending.push(result);
      return result;
    },
    releasePhysical() {
      for (const release of releases) release();
    },
    trackRelease(release: () => void) {
      releases.push(release);
    },
    closeStage: "STOP",
    async retirePins() {
      for (const [id, writerId] of writers) {
        const row = await f.uow.run((u) => u.driveBackupTransfers.find(id));
        if (
          row?.owner.state !== "closed" ||
          row.readPinned ||
          row.refreshPending
        )
          throw fail("DRIVE_BACKUP_FIXTURE_OWNER_HELD");
        await f.uow.run((u) => u.objectOperations.endWrite(writerId));
        writers.delete(id);
      }
    },
    async close(clean: boolean, preserve = false) {
      this.closeStage = "STOP";
      for (const release of releases) release();
      await Promise.all(pending);
      await execution.stop();
      this.closeStage = "RECONCILE";
      await reconcileDriveClosures(c);
      this.closeStage = "PINS";
      await this.retirePins();
      if (!clean) {
        f.failed = true;
        return;
      }
      if (preserve) {
        f.checkBudget();
        return;
      }
      this.closeStage = "CLOCK";
      const latest = await f.cleanupTime();
      await f.uow.run(async (u) => {
        this.closeStage = "CANCEL";
        for (const actor of f.actors)
          await u.driveBackupJobs.cancelPending(
            { kind: "account", accountId: actor.accountId },
            latest,
          );
        for (const actor of f.actors)
          await u.driveBackupTransfers.cancel(
            { kind: "account", accountId: actor.accountId },
            latest,
          );
        for (const original of f.originals) {
          this.closeStage = "PURGE_BEGIN";
          const note = await u.notes.findById(original.noteId);
          if (note && note.lifecycle.kind !== "purging") {
            const operationId = f.id();
            await u.notes.save(
              {
                ...note,
                lifecycle: trashLifecycle(
                  new Date(latest.getTime() - TRASH_RETENTION_MS),
                  operationId,
                ),
                version: note.version + 1,
                updatedAt: latest,
              },
              note.version,
            );
            await beginNotePurge(
              { ...c, clock: { now: () => latest } },
              u,
              { id: note.id, operationId },
              "expired",
            );
          }
          this.closeStage = "PURGE_TARGETS";
          await u.driveBackupTargets.purgeNote(original.noteId);
        }
        const cutoff = new Date(
          latest.getTime() + DRIVE_BACKUP_LIMITS.historyMs,
        );
        let removed = 0;
        this.closeStage = "PRUNE";
        for (
          let batch = 0;
          batch <
          Math.ceil(
            (f.s3
              ? 1200
              : f.retarget
                ? 130
                : backupFixtureHistory.maxCaseJobs) /
              backupFixtureHistory.pruneBatch,
          );
          batch++
        ) {
          const count = await u.driveBackupJobs.prune(
            cutoff,
            backupFixtureHistory.pruneBatch,
          );
          removed += count;
          if (
            removed >
            (f.s3 ? 1200 : f.retarget ? 130 : backupFixtureHistory.maxCaseJobs)
          )
            throw fail("DRIVE_BACKUP_FIXTURE_HISTORY_BUDGET");
          if (count < backupFixtureHistory.pruneBatch) break;
        }
        for (const actor of f.actors)
          if (
            (await u.driveBackupJobs.history(actor.accountId, new Date(0), 1))
              .length
          )
            throw fail("DRIVE_BACKUP_FIXTURE_HISTORY_REMAINS");
      });
      const replacements: Original[] = [];
      this.closeStage = "NEXT_ORIGINALS";
      if (f.retarget && f.originalCount + 3 > 24)
        throw fail("DRIVE_BACKUP_FIXTURE_ORIGINAL_BUDGET");
      await f.uow.run(async (u) => {
        for (let i = 0; i < 3; i++) {
          const previous = f.originals[i];
          if (!previous) throw fail("DRIVE_BACKUP_FIXTURE_ORIGINAL");
          const noteId = f.id();
          await u.notes.insert(
            createNote(
              {
                id: noteId,
                accountId: f.actors[0]!.accountId,
                ...(i === 1
                  ? {
                      owner: {
                        kind: "workspace" as const,
                        workspaceId: f.workspaceId,
                      },
                    }
                  : {}),
                title: `Original ${i}`,
                html: "<p>fixture</p>",
                text: "fixture",
              },
              backupNow,
            ),
          );
          const original = {
            ...previous,
            id: f.id(),
            noteId,
            storageKey: `backup-original-${f.id()}`,
            activeJobId: f.id(),
          };
          await u.imports.insertOriginal(original);
          replacements.push(original);
        }
      });
      f.originals.splice(0, f.originals.length, ...replacements);
      f.originalCount += replacements.length;
      f.checkBudget();
      this.closeStage = "COMPLETE";
      if (f.s3) f.caseTime.now = controls.now;
    },
  };
}
export type BackupCase = Awaited<ReturnType<typeof backupCase>>;
