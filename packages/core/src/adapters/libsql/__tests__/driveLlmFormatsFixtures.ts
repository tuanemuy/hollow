import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BoundedAuthenticationPasswordHasher } from "@repo/core/adapters/node/authenticationExecution";
import { createNodeLlm } from "@repo/core/adapters/node/llm/config";
import { createNodeRegeneration } from "@repo/core/adapters/node/regeneration/config";
import type { DriveLlmRequest } from "@repo/core/application/llm/driveRequest";
import { beginPdfPreview } from "@repo/core/application/llm/pdfPreview";
import { ensureRevisionHead } from "@repo/core/application/note/commitNote";
import type { ObjectStorage } from "@repo/core/application/ports/objectStorage";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import {
  PDF_PAGE_POLICY,
  PDF_PAGE_RENDERER,
  type PdfChoice,
  type PdfPreview,
} from "@repo/core/domain/llm/pdfPreview";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import {
  regenerationId,
  regenerationNow,
  regenerationRoot,
  seedRegenerationLocal,
} from "./regenerationFixtures";
import { inputComposition } from "./regenerationInputFixtures";

export const formatsNow = regenerationNow;
export type DriveFormat = "text" | "image" | "docx" | "xlsx" | "pptx" | "pdf";
export async function driveFormatsFixture(format: DriveFormat) {
  const root = await mkdtemp(
    path.join(regenerationRoot(), "drive-llm-formats-"),
  );
  const filename = path.join(root, "application.sqlite");
  await writeFile(filename, "", { flag: "wx", mode: 0o600 });
  const client = createLibsqlClient({ url: `file:${filename}` });
  await applyPragmas(client);
  const db = getDatabase(client);
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
  });
  const migrations = await client.execute(
    "SELECT count(*) AS n FROM __drizzle_migrations",
  );
  if (migrations.rows[0]?.n !== 49) throw Error("DRIVE_FORMATS_MIGRATIONS");
  const uow = new LibsqlHollowUnitOfWorkProvider(db);
  const base = { filename, client, db, uow };
  const unexpected = async (): Promise<never> => {
    throw Error("DRIVE_FORMATS_NO_IO");
  };
  const unused = (): never => {
    throw Error("DRIVE_FORMATS_NO_IO");
  };
  const context = inputComposition(base, {
    provider: { readInto: unexpected, read: unexpected, inspect: unexpected },
  });
  const passwordHasher = context.c.passwordHasher;
  if (!(passwordHasher instanceof BoundedAuthenticationPasswordHasher))
    throw Error("DRIVE_FORMATS_HASHER");
  const storage: ObjectStorage = {
    put: unexpected,
    putBounded: unexpected,
    read: unexpected,
    stat: unexpected,
    stream: unexpected,
    remove: unexpected,
  };
  const directory = path.join(root, "runtime");
  await mkdir(directory, { mode: 0o700 });
  const worker = (name: string) =>
    fileURLToPath(new URL(`../../node/llm/${name}`, import.meta.url));
  const options = {
    storage,
    directory,
    workerPath: worker("sourceWorker.mjs"),
    documentWorkerPath: worker("documentWorker.mjs"),
    imageChildPath: worker("imageChild.mjs"),
    pdfPagesChildPath: worker("pdfPagesChild.mjs"),
  };
  const shared = await createNodeRegeneration(context.c, options);
  if (!context.c.drive || !context.services.provider)
    throw Error("DRIVE_FORMATS_SOURCE");
  let wakes = 0;
  const llm = await createNodeLlm(context.c, {
    ...options,
    shared,
    source: { provider: context.services.provider, drive: context.c.drive },
    monthlyLimit: "30",
    profiles: { inspect: unexpected },
    wake: () => {
      wakes++;
    },
  });
  const c = {
    ...context.c,
    llm,
    openRouter: {
      authorization: {
        authorization: unexpected,
        exchange: unexpected,
        inspectCredential: unexpected,
      },
      catalog: { list: unexpected, fallback: unused },
      protector: { available: () => true, protect: unused, reveal: unused },
      execution: { run: unexpected, stop: async () => {} },
    },
  };
  const recorderId = regenerationId(901);
  const workspaceId = regenerationId(902);
  await uow.run(async (u) => {
    await u.accounts.save(
      verifyAccount(
        createAccount(
          recorderId,
          "recorder@fixture.invalid",
          "synthetic",
          formatsNow,
        ),
        formatsNow,
      ),
    );
    await u.workspaces.create({
      id: workspaceId,
      creatorId: recorderId,
      name: "Drive formats",
      description: "",
      slug: null,
      state: "active",
      createdAt: formatsNow,
    });
    await u.workspaces.join(workspaceId, recorderId, "owner", formatsNow);
  });
  const row = await seedRegenerationLocal(base, 1, false, false, {
    consumers: false,
    format: "pdf",
    workspaceId,
  });
  const recordId = regenerationId(903);
  const targetId = regenerationId(904);
  const token = "drive-formats-executor";
  const folder = {
    id: "synthetic-source-folder",
    name: "Synthetic",
    driveId: null,
    resourceKeyEnvelope: null,
    checkedAt: formatsNow,
  };
  await uow.run(async (u) => {
    await u.workspaces.join(workspaceId, row.accountId, "editor", formatsNow);
    await u.jobs.cancelNote(row.noteId, formatsNow);
    const original = await u.imports.findOriginal(row.originalId);
    if (!original) throw Error("DRIVE_FORMATS_ORIGINAL");
    await u.imports.saveOriginal({ ...original, format, state: "ready" });
    await u.accounts.saveSession({
      accountId: row.accountId,
      tokenHash: c.tokens.hash(token),
      expiresAt: new Date(formatsNow.getTime() + 3600000),
    });
    const or = await u.openRouterConnections.find(row.accountId);
    if (
      !or ||
      or.state !== "linked" ||
      !(await u.openRouterConnections.replace(
        {
          ...or,
          epoch: 2,
          version: or.version + 1,
          updatedAt: formatsNow,
        },
        or.version,
      ))
    )
      throw Error("DRIVE_FORMATS_OR");
    const drive = await u.driveConnections.ensure(recorderId, formatsNow);
    if (
      !(await u.driveConnections.replace(
        {
          ...drive,
          state: "linked",
          epoch: 1,
          credentialVersion: 1,
          version: drive.version + 1,
          settingsVersion: drive.settingsVersion + 1,
          folder: null,
          autoBackup: false,
          lastUsedAt: null,
          credential: {
            subject: "synthetic-recorder-subject",
            email: null,
            envelope: "synthetic-unused",
            scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
            connectedAt: formatsNow,
            accessExpiresAt: new Date(formatsNow.getTime() + 3600000),
          },
          updatedAt: formatsNow,
        },
        drive.version,
        "adopt",
      ))
    )
      throw Error("DRIVE_FORMATS_DRIVE");
    const linked = await u.driveConnections.find(recorderId);
    if (
      !linked ||
      linked.state !== "linked" ||
      !(await u.driveConnections.replace(
        {
          ...linked,
          folder,
          version: linked.version + 1,
          settingsVersion: linked.settingsVersion + 1,
          updatedAt: formatsNow,
        },
        linked.version,
        "folder",
      ))
    )
      throw Error("DRIVE_FORMATS_FOLDER");
    const target = {
      id: targetId,
      noteId: row.noteId,
      originalId: row.originalId,
      accountId: recorderId,
      subject: "synthetic-recorder-subject",
      marker: regenerationId(905),
      folder,
      folderEpoch: 1,
      version: 1,
      createdAt: formatsNow,
      updatedAt: formatsNow,
      state: "unallocated" as const,
      fileId: null,
    };
    await u.driveBackupTargets.insertInitial(target);
    if (
      !(await u.driveBackupTargets.replace(
        {
          ...target,
          state: "allocated",
          fileId: "synthetic-source-file",
          version: 2,
        },
        1,
      ))
    )
      throw Error("DRIVE_FORMATS_TARGET");
    if (
      !(await u.driveBackupTargets.replace(
        {
          ...target,
          state: "confirmed",
          fileId: "synthetic-source-file",
          version: 3,
        },
        2,
      ))
    )
      throw Error("DRIVE_FORMATS_TARGET");
    await u.driveBackupRecords.insert({
      id: recordId,
      version: 1,
      targetId,
      noteId: row.noteId,
      originalId: row.originalId,
      accountId: recorderId,
      subject: target.subject,
      fileId: "synthetic-source-file",
      folder,
      bytes: original.bytes,
      sha256: original.sha256,
      createdAt: formatsNow,
      webViewLink: null,
      resourceKeyEnvelope: null,
    });
    const note = await u.notes.findById(row.noteId);
    if (!note) throw Error("DRIVE_FORMATS_NOTE");
    await ensureRevisionHead(u, note);
  });
  const input: DriveLlmRequest = {
    noteId: row.noteId,
    noteVersion: 0,
    recordId,
    commandId: c.idGenerator.next(),
    expectedEpoch: 2,
    modelId: format === "image" ? "fixture/image" : "fixture/text",
    instruction: "日本語で整える",
    confirmed: true,
  };
  async function preview(drive: boolean, visual = false) {
    const result = await beginPdfPreview(c, token, {
      noteId: row.noteId,
      noteVersion: 0,
      expectedEpoch: 2,
      commandId: c.idGenerator.next(),
      ...(drive ? { recordId } : {}),
    });
    return uow.run(async (u) => {
      const value = await u.llmPdfPreviews.find(result.previewId);
      if (!value || value.state !== "queued")
        throw Error("DRIVE_FORMATS_PREVIEW");
      const running: PdfPreview & { state: "running" } = {
        ...value,
        state: "running",
        owner: {
          state: "active",
          runtimeId: c.idGenerator.next(),
          token: c.idGenerator.next(),
        },
        version: value.version + 1,
        updatedAt: formatsNow,
      };
      if (!(await u.llmPdfPreviews.replace(running, value.version)))
        throw Error("DRIVE_FORMATS_RUNNING");
      const choice: PdfChoice = visual
        ? {
            kind: "pages",
            preparationVersion: 4,
            promptVersion: 3,
            modelKind: "chat-image",
            reason: "VISUAL_CONTENT",
            manifest: {
              kind: "pdf-pages",
              preparationVersion: 4,
              source: value.source,
              policy: PDF_PAGE_POLICY,
              renderer: PDF_PAGE_RENDERER,
              total: 1,
              sha256: "c".repeat(64),
              pages: [
                {
                  ordinal: 0,
                  width: 16,
                  height: 16,
                  bytes: 32,
                  sha256: "d".repeat(64),
                },
              ],
            },
          }
        : {
            kind: "strict-text",
            preparationVersion: 2,
            promptVersion: 1,
            modelKind: "chat-text",
            preparedDocumentHash: "b".repeat(64),
            pages: 1,
            policy: "strict-text-v1",
          };
      const ready: PdfPreview & { state: "ready" } = {
        ...running,
        state: "ready",
        result: choice,
        owner: { ...running.owner, state: "closed" },
        version: running.version + 1,
        updatedAt: formatsNow,
      };
      if (!(await u.llmPdfPreviews.replace(ready, running.version)))
        throw Error("DRIVE_FORMATS_READY");
      return ready;
    });
  }
  async function snapshot(previewId?: string) {
    const content = await uow.run(async (u) => ({
      note: await u.notes.findById(row.noteId),
      original: await u.imports.findOriginal(row.originalId),
      head: await u.revisions.head(row.noteId),
      revisions: await u.revisions.list(row.noteId),
      quota: await u.llmQuota.usage(row.accountId, "2026-10"),
      executorConnection: await u.openRouterConnections.find(row.accountId),
      recorderConnection: await u.driveConnections.find(recorderId),
      role: await u.workspaces.role(workspaceId, row.accountId),
      preview: previewId ? await u.llmPdfPreviews.find(previewId) : null,
    }));
    const counts = [];
    for (const table of [
      "regeneration_source_bindings",
      "llm_conversions",
      "llm_quota_reservations",
      "conversion_jobs",
      "import_batches",
    ])
      counts.push(
        (await client.execute(`SELECT count(*) AS n FROM ${table}`)).rows,
      );
    return { ...content, counts, wakes };
  }
  return {
    c,
    base,
    row,
    token,
    input,
    recordId,
    recorderId,
    workspaceId,
    preview,
    snapshot,
    async close(healthy: boolean) {
      await shared.execution.stop();
      await context.execution.stop();
      await passwordHasher.stop();
      try {
        if ((await client.execute("PRAGMA foreign_key_check")).rows.length)
          throw Error("DRIVE_FORMATS_INTEGRITY");
      } finally {
        client.close();
      }
      if (!client.closed) throw Error("DRIVE_FORMATS_CLOSE");
      if (healthy) await rm(root, { recursive: true });
    },
  };
}
