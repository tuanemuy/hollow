import { createHash } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type {
  DriveSecretProtector,
  DriveServices,
} from "@repo/core/application/integration/drive/ports";
import type {
  LlmSourcePreparer,
  LlmSourceReader,
} from "@repo/core/application/llm/ports";
import type { RegenerationSourceProvider } from "@repo/core/application/regeneration/services";
import { regenerationServices } from "@repo/core/application/regeneration/services";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import type {
  DriveBackupRecord,
  DriveBackupTarget,
} from "@repo/core/domain/integration/driveBackup";
import type {
  LlmFixedConversion,
  LlmLegacyFormat,
} from "@repo/core/domain/llm/entity";
import { createNote } from "@repo/core/domain/note/entity";
import type {
  MachineRegeneration,
  SourceBinding,
} from "@repo/core/domain/regeneration/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { NodeDriveExecution } from "../../node/drive/execution";
import { NodeRegenerationMemory } from "../../node/regeneration/memory";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";

export const inputNow = new Date("2026-10-01T00:00:00Z");
export const inputId = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function inputRoot() {
  const root = process.env.HOLLOW_REGENERATION_INPUT_ROOT;
  if (!root || !path.isAbsolute(root)) throw Error("INPUT_ROOT");
  const st = lstatSync(root);
  if (
    !st.isDirectory() ||
    st.isSymbolicLink() ||
    (st.mode & 0o777) !== 0o700 ||
    st.uid !== process.getuid?.() ||
    realpathSync(root) !== root
  )
    throw Error("INPUT_ROOT");
  return root;
}
export function inputCapacity() {
  let bytes = 0;
  let dbBytes = 0;
  const walk = (directory: string) => {
    for (const name of readdirSync(directory)) {
      const file = path.join(directory, name);
      const st = lstatSync(file);
      if (st.isSymbolicLink()) throw Error("INPUT_ENTRY");
      if (st.isDirectory()) walk(file);
      else if (st.isFile()) {
        bytes += st.size;
        if (/\.sqlite(?:-wal|-shm)?$/.test(name)) dbBytes += st.size;
      } else throw Error("INPUT_ENTRY");
    }
  };
  walk(inputRoot());
  if (bytes > 288 * 1024 * 1024 || dbBytes > 240 * 1024 * 1024)
    throw Error("INPUT_CAPACITY");
  return { bytes, dbBytes };
}
export function validateInputLabel(label: string) {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(label)) throw Error("INPUT_LABEL");
}
export function inputMigrations(
  label: string,
  last: 42 | 43 = 43,
  fault?: "columns" | "guards" | "fk",
) {
  validateInputLabel(label);
  const directory = path.join(inputRoot(), label);
  const source = path.resolve(import.meta.dirname, "../migrations");
  mkdirSync(directory, { mode: 0o700 });
  mkdirSync(path.join(directory, "meta"), { mode: 0o700 });
  const journal = JSON.parse(
    readFileSync(path.join(source, "meta/_journal.json"), "utf8"),
  ) as { entries: { idx: number; tag: string }[] };
  if (
    journal.entries.length !== 45 ||
    journal.entries[43]?.tag !== "0043_regeneration_input_stage" ||
    journal.entries[44]?.tag !== "0044_authentication_cancelled"
  )
    throw Error("INPUT_JOURNAL");
  const entries = journal.entries.filter((e) => e.idx <= last);
  writeFileSync(
    path.join(directory, "meta/_journal.json"),
    JSON.stringify({ ...journal, entries }),
    { flag: "wx", mode: 0o600 },
  );
  for (const entry of entries) {
    let sql = readFileSync(path.join(source, entry.tag + ".sql"), "utf8");
    if (entry.idx === 43 && fault) {
      const statements = sql.split("--> statement-breakpoint");
      const index = fault === "columns" ? 2 : fault === "guards" ? 20 : 24;
      if (statements.length !== 26) throw Error("INPUT_FAULT_POINT");
      statements.splice(
        index + 1,
        0,
        fault === "fk"
          ? "INSERT INTO __regeneration_input_fk_assertion VALUES(0);"
          : "SELECT * FROM __input_injected_failure;",
      );
      sql = statements.join("\n--> statement-breakpoint\n");
    }
    writeFileSync(path.join(directory, entry.tag + ".sql"), sql, {
      flag: "wx",
      mode: 0o600,
    });
  }
  inputCapacity();
  return directory;
}
export async function inputDatabase(
  label:
    | "baseline"
    | "application"
    | "application-v2"
    | "application-v3"
    | "application-v4"
    | "native",
  last: 42 | 43 = 43,
  observe: (phase: number, closed: boolean) => void = () => {},
) {
  let phase = 2;
  observe(phase, false);
  validateInputLabel(label);
  validateInputLabel(label + "-ddl");
  inputCapacity();
  const filename = path.join(inputRoot(), label + ".sqlite");
  writeFileSync(filename, "", { flag: "wx", mode: 0o600 });
  const client = createLibsqlClient({ url: `file:${filename}` });
  try {
    phase = 3;
    observe(phase, false);
    await applyPragmas(client);
    const db = getDatabase(client);
    phase = 4;
    observe(phase, false);
    const migrationsFolder = inputMigrations(label + "-ddl", last);
    phase = 5;
    observe(phase, false);
    await migrate(db, {
      migrationsFolder,
    });
    phase = 6;
    observe(phase, false);
    return {
      filename,
      client,
      db,
      uow: new LibsqlHollowUnitOfWorkProvider(db),
    };
  } catch (error) {
    client.close();
    observe(phase, true);
    throw error;
  }
}
export function copyInputBaseline(
  from: string,
  label: "success" | "rollback-columns" | "rollback-guards" | "rollback-fk",
) {
  if (from !== path.join(inputRoot(), "baseline.sqlite"))
    throw Error("INPUT_COPY");
  inputCapacity();
  let bytes = 0;
  const to = path.join(inputRoot(), label + ".sqlite");
  for (const suffix of ["", "-wal", "-shm"]) {
    if (!existsSync(from + suffix)) {
      if (!suffix) throw Error("INPUT_COPY");
      continue;
    }
    const before = lstatSync(from + suffix);
    bytes += before.size;
    if (!before.isFile() || before.isSymbolicLink() || bytes > 16 * 1024 * 1024)
      throw Error("INPUT_COPY");
    copyFileSync(from + suffix, to + suffix, constants.COPYFILE_EXCL);
    const after = lstatSync(from + suffix);
    if (
      before.ino !== after.ino ||
      before.mtimeMs !== after.mtimeMs ||
      before.size !== after.size ||
      !readFileSync(from + suffix).equals(readFileSync(to + suffix))
    )
      throw Error("INPUT_COPY_CHANGED");
  }
  inputCapacity();
  return to;
}

export async function seedInputMachine(
  base: Awaited<ReturnType<typeof inputDatabase>>,
  n: number,
  protector: DriveSecretProtector,
  drive = true,
  text = "<p>input</p>",
  stage: (value: number) => void = () => {},
) {
  const key = (offset: number) => inputId(n * 100 + offset);
  const bytes = new TextEncoder().encode(text);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const accountId = key(1);
  const noteId = key(2);
  const originalId = key(3);
  const jobId = key(4);
  const machineId = key(5);
  const bindingId = key(6);
  const folder = {
    id: "source-folder",
    name: "Source",
    driveId: null,
    resourceKeyEnvelope: null,
    checkedAt: inputNow,
  };
  const record: DriveBackupRecord = {
    id: key(7),
    version: 1,
    targetId: key(8),
    noteId,
    originalId,
    accountId,
    subject: `subject-${n}`,
    fileId: `file-${n}`,
    folder,
    bytes: bytes.byteLength,
    sha256,
    createdAt: inputNow,
    webViewLink: null,
    resourceKeyEnvelope: null,
  };
  const machine: MachineRegeneration = {
    id: machineId,
    executorId: accountId,
    noteId,
    originalId,
    commandId: key(9),
    requestDigest: "a".repeat(64),
    access: drive
      ? { origin: "drive-record", bindingId }
      : { origin: "local-original", bindingId: null },
    sourceMemoryBytes: 0,
    inputReceipt: null,
    source: { bytes: bytes.byteLength, sha256, format: "html" },
    noteVersion: 0,
    ownershipGeneration: 1,
    originalRevisionNo: 1,
    previous: { state: "ready", coverage: "complete", activeJobId: jobId },
    phase: "queued",
    outcome: "pending",
    failure: null,
    resultVersion: null,
    owner: { state: "none", runtimeId: null, token: null },
    cancelGeneration: 0,
    version: 1,
    createdAt: inputNow,
    updatedAt: inputNow,
    deadlineAt: new Date(inputNow.getTime() + 1800000),
    terminalAt: null,
  };
  const binding: SourceBinding = {
    id: bindingId,
    recordId: record.id,
    executorId: accountId,
    credentialOwnerId: accountId,
    noteId,
    originalId,
    subject: record.subject,
    driveEpoch: 1,
    ownershipGeneration: 1,
    fingerprint: "b".repeat(64),
    consumer: { kind: "machine-regeneration", id: machineId },
    cancelGeneration: 0,
    version: 1,
    createdAt: inputNow,
  };
  await base.uow.run(async (u) => {
    stage(101);
    await u.accounts.save(
      verifyAccount(
        createAccount(
          accountId,
          `input-${n}@fixture.invalid`,
          "synthetic",
          inputNow,
        ),
        inputNow,
      ),
    );
    stage(102);
    await u.notes.insert(
      createNote(
        {
          id: noteId,
          accountId,
          title: "Source",
          html: "<p>source</p>",
          text: "source",
        },
        inputNow,
      ),
    );
    stage(103);
    await u.imports.insertBatch({
      id: key(10),
      accountId,
      createdAt: inputNow,
      useAi: false,
      cancelledAt: null,
    });
    stage(104);
    await u.imports.insertOriginal({
      id: originalId,
      noteId,
      accountId,
      name: "source.html",
      bytes: bytes.byteLength,
      storageKey: key(11),
      sha256,
      format: "html",
      state: "ready",
      coverage: "complete",
      activeJobId: jobId,
      createdAt: inputNow,
    });
    stage(105);
    await u.jobs.insert({
      id: jobId,
      batchId: key(10),
      originalId,
      accountId,
      noteId,
      noteVersion: 0,
      useAi: false,
      createdAt: inputNow,
      updatedAt: inputNow,
      attempt: 0,
      retryOf: null,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    });
    if (drive) {
      stage(106);
      const old = await u.driveConnections.ensure(accountId, inputNow);
      const credential = {
        subject: record.subject,
        email: null,
        envelope: protector.protect(
          JSON.stringify({
            version: 1,
            accessToken: "synthetic-access",
            refreshToken: "synthetic-refresh",
          }),
          {
            purpose: "credential",
            accountId,
            subject: record.subject,
            epoch: 1,
            credentialVersion: 1,
          },
        ),
        scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
        connectedAt: inputNow,
        accessExpiresAt: new Date(inputNow.getTime() + 3600000),
      };
      stage(107);
      if (
        !(await u.driveConnections.replace(
          {
            ...old,
            state: "linked",
            epoch: 1,
            credentialVersion: 1,
            version: old.version + 1,
            settingsVersion: old.settingsVersion + 1,
            folder: null,
            lastUsedAt: null,
            autoBackup: false,
            credential,
            updatedAt: inputNow,
          },
          old.version,
          "adopt",
        ))
      )
        throw Error("INPUT_SEED_CONNECTION");
      stage(108);
      const adopted = await u.driveConnections.find(accountId);
      if (!adopted || adopted.state !== "linked")
        throw Error("INPUT_SEED_CONNECTION");
      stage(109);
      if (
        !(await u.driveConnections.replace(
          {
            ...adopted,
            folder,
            version: adopted.version + 1,
            settingsVersion: adopted.settingsVersion + 1,
          },
          adopted.version,
          "folder",
        ))
      )
        throw Error("INPUT_SEED_FOLDER");
      const target: DriveBackupTarget = {
        id: record.targetId,
        noteId,
        originalId,
        accountId,
        subject: record.subject,
        marker: key(12),
        folder,
        folderEpoch: 1,
        state: "unallocated",
        fileId: null,
        version: 1,
        createdAt: inputNow,
        updatedAt: inputNow,
      };
      stage(110);
      await u.driveBackupTargets.insertInitial(target);
      stage(111);
      if (
        !(await u.driveBackupTargets.replace(
          { ...target, state: "allocated", fileId: record.fileId, version: 2 },
          1,
        ))
      )
        throw Error("INPUT_SEED_TARGET");
      stage(112);
      if (
        !(await u.driveBackupTargets.replace(
          { ...target, state: "confirmed", fileId: record.fileId, version: 3 },
          2,
        ))
      )
        throw Error("INPUT_SEED_TARGET");
      stage(113);
      await u.driveBackupRecords.insert(record);
      stage(114);
      await u.regenerationBindings.insert(binding);
    }
    stage(115);
    await u.machineRegenerations.insert(machine);
    stage(116);
    if (
      !(await u.machineRegenerations.replace(
        {
          ...machine,
          phase: "acquiring",
          owner: { state: "active", runtimeId: key(13), token: key(14) },
          version: 2,
        },
        1,
      ))
    )
      throw Error("INPUT_SEED_MACHINE");
    stage(199);
  });
  stage(200);
  return {
    machine,
    record,
    binding,
    bytes,
    storageKey: key(11),
    consumer: { kind: "machine-regeneration" as const, id: machine.id },
  };
}

export async function seedInputLlm(
  base: Awaited<ReturnType<typeof inputDatabase>>,
  n: number,
  protector: DriveSecretProtector,
  text = "fixture text 日本語\nsecond line",
  options: Readonly<{ format?: LlmLegacyFormat; drive?: boolean }> = {},
) {
  if (!Number.isSafeInteger(n) || n < 0 || n > 8999)
    throw Error("INPUT_SEED_LLM_INDEX");
  const key = (offset: number) => inputId(n * 100 + 50 + offset);
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength === 0 || bytes.byteLength > 50 * 1024 * 1024)
    throw Error("INPUT_SEED_LLM_BYTES");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const format = options.format ?? "text";
  const drive = options.drive ?? true;
  const accountId = key(1);
  const noteId = key(2);
  const originalId = key(3);
  const jobId = key(4);
  const bindingId = key(5);
  const storageKey = key(10);
  const source = {
    kind: "original" as const,
    originalId,
    bytes: bytes.byteLength,
    sha256,
    format,
  };
  const folder = {
    id: `llm-source-folder-${n}`,
    name: "LLM source",
    driveId: null,
    resourceKeyEnvelope: null,
    checkedAt: inputNow,
  };
  const record: DriveBackupRecord = {
    id: key(6),
    targetId: key(7),
    version: 1,
    noteId,
    originalId,
    accountId,
    subject: `llm-subject-${n}`,
    fileId: `llm-file-${n}`,
    folder,
    bytes: bytes.byteLength,
    sha256,
    createdAt: inputNow,
    webViewLink: null,
    resourceKeyEnvelope: null,
  };
  const consumer = { kind: "llm-conversion" as const, id: jobId };
  const binding: SourceBinding = {
    id: bindingId,
    recordId: record.id,
    executorId: accountId,
    credentialOwnerId: accountId,
    noteId,
    originalId,
    subject: record.subject,
    driveEpoch: 1,
    ownershipGeneration: 1,
    fingerprint: "a".repeat(64),
    consumer,
    cancelGeneration: 0,
    version: 1,
    createdAt: inputNow,
  };
  const llm = await base.uow.run(async (u) => {
    await u.accounts.save(
      verifyAccount(
        createAccount(
          accountId,
          `input-llm-${n}@fixture.invalid`,
          "synthetic",
          inputNow,
        ),
        inputNow,
      ),
    );
    await u.notes.insert(
      createNote(
        {
          id: noteId,
          accountId,
          title: "LLM source",
          html: "<p>source</p>",
          text: "source",
        },
        inputNow,
      ),
    );
    await u.imports.insertBatch({
      id: key(9),
      accountId,
      createdAt: inputNow,
      useAi: true,
      cancelledAt: null,
    });
    await u.imports.insertOriginal({
      id: originalId,
      noteId,
      accountId,
      name: `source.${format === "text" ? "txt" : format === "markdown" ? "md" : "html"}`,
      bytes: bytes.byteLength,
      storageKey,
      sha256,
      format,
      state: "ready",
      coverage: "complete",
      activeJobId: jobId,
      createdAt: inputNow,
    });
    await u.jobs.insert({
      id: jobId,
      batchId: key(9),
      originalId,
      accountId,
      noteId,
      noteVersion: 0,
      useAi: true,
      createdAt: inputNow,
      updatedAt: inputNow,
      attempt: 0,
      retryOf: null,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    });
    const openRouter = await u.openRouterConnections.ensure(
      accountId,
      inputNow,
    );
    if (
      !(await u.openRouterConnections.replace(
        {
          ...openRouter,
          state: "linked",
          epoch: 1,
          version: openRouter.version + 1,
          credentialEnvelope: "synthetic-not-used",
          linkedAt: inputNow,
          everLinkedAt: inputNow,
          lastUsedAt: null,
          providerUserId: null,
          keyExpiresAt: null,
        },
        openRouter.version,
      ))
    )
      throw Error("INPUT_SEED_LLM_CONNECTION");
    if (drive) {
      const old = await u.driveConnections.ensure(accountId, inputNow);
      const credential = {
        subject: record.subject,
        email: null,
        envelope: protector.protect(
          JSON.stringify({
            version: 1,
            accessToken: "synthetic-access",
            refreshToken: "synthetic-refresh",
          }),
          {
            purpose: "credential",
            accountId,
            subject: record.subject,
            epoch: 1,
            credentialVersion: 1,
          },
        ),
        scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
        connectedAt: inputNow,
        accessExpiresAt: new Date(inputNow.getTime() + 3600000),
      };
      if (
        !(await u.driveConnections.replace(
          {
            ...old,
            state: "linked",
            epoch: 1,
            credentialVersion: 1,
            version: old.version + 1,
            settingsVersion: old.settingsVersion + 1,
            folder: null,
            lastUsedAt: null,
            autoBackup: false,
            credential,
            updatedAt: inputNow,
          },
          old.version,
          "adopt",
        ))
      )
        throw Error("INPUT_SEED_CONNECTION");
      const adopted = await u.driveConnections.find(accountId);
      if (!adopted || adopted.state !== "linked")
        throw Error("INPUT_SEED_CONNECTION");
      if (
        !(await u.driveConnections.replace(
          {
            ...adopted,
            folder,
            version: adopted.version + 1,
            settingsVersion: adopted.settingsVersion + 1,
          },
          adopted.version,
          "folder",
        ))
      )
        throw Error("INPUT_SEED_FOLDER");
      const target: DriveBackupTarget = {
        id: record.targetId,
        noteId,
        originalId,
        accountId,
        subject: record.subject,
        marker: key(11),
        folder,
        folderEpoch: 1,
        state: "unallocated",
        fileId: null,
        version: 1,
        createdAt: inputNow,
        updatedAt: inputNow,
      };
      await u.driveBackupTargets.insertInitial(target);
      if (
        !(await u.driveBackupTargets.replace(
          {
            ...target,
            state: "allocated",
            fileId: record.fileId,
            version: 2,
          },
          1,
        ))
      )
        throw Error("INPUT_SEED_TARGET");
      if (
        !(await u.driveBackupTargets.replace(
          {
            ...target,
            state: "confirmed",
            fileId: record.fileId,
            version: 3,
          },
          2,
        ))
      )
        throw Error("INPUT_SEED_TARGET");
      await u.driveBackupRecords.insert(record);
      await u.regenerationBindings.insert(binding);
    }
    const queued: LlmFixedConversion = {
      jobId,
      accountId,
      noteId,
      commandId: key(8),
      requestDigest: "a".repeat(64),
      operation: "regenerate",
      retryOf: null,
      source,
      access: drive
        ? { origin: "drive-record", bindingId }
        : { origin: "local-original", bindingId: null },
      inputReceipt: null,
      sourceMemoryBytes: 0,
      sourceState: "ready",
      sourceCoverage: "complete",
      sourceOwnershipGeneration: null,
      noteVersion: 0,
      originalRevisionNo: null,
      credentialEpoch: 1,
      instruction: "",
      admissionSequence: await u.llmConversions.admit(accountId),
      createdAt: inputNow,
      deadlineAt: new Date(inputNow.getTime() + 1800000),
      updatedAt: inputNow,
      owner: { state: "idle", runtimeId: null, token: null },
      cancelGeneration: 0,
      responseBudget: 0,
      version: 1,
      selection: "fixed",
      modelId: "fixture/text",
      phase: "queued",
      outcome: { kind: "pending" },
      preparationVersion: 1,
      promptVersion: 1,
      pdfProof: null,
    };
    await u.llmConversions.insert(queued);
    const preparing: LlmFixedConversion = {
      ...queued,
      phase: "preparing",
      owner: { state: "active", runtimeId: key(12), token: key(13) },
      version: 2,
    };
    if (!(await u.llmConversions.replace(preparing, queued.version)))
      throw Error("INPUT_SEED_LLM_OWNER");
    return preparing;
  });
  return {
    consumer,
    record,
    binding,
    bytes,
    storageKey,
    source,
    accountId,
    noteId,
    originalId,
    jobId,
    llm,
  };
}

export const inputProtector: DriveSecretProtector = {
  available: () => true,
  protect: (v) => v,
  reveal: (v) => v,
};
export function inputComposition(
  base: Awaited<ReturnType<typeof inputDatabase>>,
  options: Readonly<{
    execution?: NodeDriveExecution;
    provider?: RegenerationSourceProvider;
    preparer?: LlmSourcePreparer;
    local?: LlmSourceReader;
    protector?: DriveSecretProtector;
  }> = {},
) {
  let sequence = 900000;
  const unexpected = async (): Promise<never> => {
    throw Error("INPUT_UNEXPECTED");
  };
  const execution =
    options.execution ?? new NodeDriveExecution(inputId(900001));
  const drive: DriveServices = {
    runtimeGeneration: execution.runtimeGeneration,
    execution,
    protector: options.protector ?? inputProtector,
    picker: { appId: "synthetic", apiKey: "synthetic" },
    authorization: {
      authorization: unexpected,
      exchange: unexpected,
      refresh: unexpected,
      verifyCandidate: unexpected,
    },
    folders: {
      generateFolderId: unexpected,
      inspectFolder: unexpected,
      createFolder: unexpected,
    },
    wake() {},
  };
  const c: HollowContainer = {
    ...createHollowContainer(base.db, "http://fixture.invalid", {
      send: unexpected,
    }),
    unitOfWorkProvider: base.uow,
    clock: { now: () => inputNow },
    idGenerator: {
      next: () => inputId(++sequence),
      validate: (value) => /^20000000-0000-4000-8000-[0-9]{12}$/.test(value),
    },
    drive,
  };
  const memory = new NodeRegenerationMemory(
    options.preparer ?? {
      prepare: async () => ({
        kind: "text-blocks",
        preparationVersion: 1,
        segments: [],
        blocks: 0,
        media: [],
        notices: [],
      }),
    },
  );
  const services = regenerationServices(
    memory,
    options.local ?? { read: unexpected },
    options.provider ?? { read: unexpected, inspect: unexpected },
    drive,
  );
  return { c, services, memory, execution };
}
