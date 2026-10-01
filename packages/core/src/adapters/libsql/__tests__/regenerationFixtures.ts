import {
  constants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { Client, InValue } from "@libsql/client";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";

export const regenerationNow = new Date("2026-10-01T00:00:00Z");
export const regenerationId = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const source = path.resolve(import.meta.dirname, "../migrations");
export function regenerationRoot() {
  const root = process.env.HOLLOW_REGENERATION_TEST_ROOT;
  if (!root || !path.isAbsolute(root)) throw Error("REGENERATION_ROOT");
  const stat = lstatSync(root);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o777) !== 0o700 ||
    stat.uid !== process.getuid?.() ||
    realpathSync(root) !== root
  )
    throw Error("REGENERATION_ROOT");
  return root;
}
export type MigrationFault = "drop" | "backfill" | "fk";
export function regenerationMigrationFolder(
  label: string,
  last = 42,
  fault?: MigrationFault,
) {
  if (!/^[a-z0-9-]+$/.test(label)) throw Error("REGENERATION_LABEL");
  const directory = path.join(regenerationRoot(), label);
  mkdirSync(directory, { mode: 0o700 });
  mkdirSync(path.join(directory, "meta"), { mode: 0o700 });
  const data = JSON.parse(
    readFileSync(path.join(source, "meta/_journal.json"), "utf8"),
  ) as { entries: { idx: number; tag: string }[] };
  if (
    data.entries.length !== 43 ||
    data.entries[42]?.tag !== "0042_regeneration_source"
  )
    throw Error("REGENERATION_JOURNAL");
  const entries = data.entries.filter((e) => e.idx <= last);
  writeFileSync(
    path.join(directory, "meta/_journal.json"),
    JSON.stringify({ ...data, entries }),
    { flag: "wx", mode: 0o600 },
  );
  for (const entry of entries) {
    let sql = readFileSync(path.join(source, `${entry.tag}.sql`), "utf8");
    if (entry.idx === 42 && fault) {
      const marker =
        fault === "drop"
          ? "DROP TRIGGER llm_pdf_preview_ready;"
          : fault === "backfill"
            ? "UPDATE llm_pdf_previews SET source_origin='local-original';"
            : "INSERT INTO __regeneration_fk_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;";
      if (!sql.includes(marker)) throw Error("REGENERATION_FAULT_POINT");
      sql = sql.replace(
        marker,
        marker +
          "\n--> statement-breakpoint\n" +
          (fault === "fk"
            ? "INSERT INTO __regeneration_fk_assertion VALUES(0);"
            : "SELECT * FROM __regeneration_injected_failure;"),
      );
    }
    writeFileSync(path.join(directory, `${entry.tag}.sql`), sql, {
      flag: "wx",
      mode: 0o600,
    });
  }
  return directory;
}
export async function regenerationDatabase(label: string, last = 42) {
  const filename = path.join(regenerationRoot(), `${label}.sqlite`);
  writeFileSync(filename, "", { flag: "wx", mode: 0o600 });
  const client = createLibsqlClient({ url: `file:${filename}` });
  try {
    await applyPragmas(client);
    const db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: regenerationMigrationFolder(`${label}-ddl`, last),
    });
    return {
      filename,
      client,
      db,
      uow: new LibsqlHollowUnitOfWorkProvider(db),
    };
  } catch (error) {
    client.close();
    throw error;
  }
}
export function copyRegenerationDatabase(from: string, label: string) {
  const to = path.join(regenerationRoot(), `${label}.sqlite`);
  let total = 0;
  for (const suffix of ["", "-wal", "-shm"]) {
    if (!existsSync(from + suffix)) {
      if (suffix === "") throw Error("REGENERATION_COPY");
      continue;
    }
    const before = lstatSync(from + suffix);
    total += before.size;
    if (!before.isFile() || before.isSymbolicLink() || total > 16 * 1024 * 1024)
      throw Error("REGENERATION_COPY");
    copyFileSync(from + suffix, to + suffix, constants.COPYFILE_EXCL);
    const after = lstatSync(from + suffix);
    const copied = lstatSync(to + suffix);
    if (
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ino !== after.ino ||
      copied.size !== before.size ||
      !readFileSync(from + suffix).equals(readFileSync(to + suffix))
    )
      throw Error("REGENERATION_COPY_CHANGED");
  }
  return to;
}
export async function insertRegenerationRow(
  client: Client,
  table: string,
  row: Record<string, InValue>,
) {
  if (
    !["llm_conversions", "llm_pdf_previews"].includes(table) ||
    !Object.keys(row).every((k) => /^[a-z_][a-z0-9_]*$/.test(k))
  )
    throw Error("REGENERATION_ROW");
  await client.execute({
    sql: `INSERT INTO ${table}(${Object.keys(row).join(",")}) VALUES(${Object.keys(
      row,
    )
      .map(() => "?")
      .join(",")})`,
    args: Object.values(row),
  });
}
export async function seedRegenerationLocal(
  base: Awaited<ReturnType<typeof regenerationDatabase>>,
  n: number,
  legacy = false,
  ready = false,
  options: Readonly<{
    consumers?: false | "llm" | "preview";
    format?: "pdf" | "html";
    workspaceId?: string;
  }> = {},
) {
  const accountId = regenerationId(n * 100 + 1);
  const noteId = regenerationId(n * 100 + 2);
  const originalId = regenerationId(n * 100 + 3);
  const jobId = regenerationId(n * 100 + 4);
  const batchId = regenerationId(n * 100 + 5);
  const previewId = regenerationId(n * 100 + 6);
  const now = regenerationNow;
  await base.uow.run(async (u) => {
    await u.accounts.save(
      verifyAccount(
        createAccount(
          accountId,
          `source-${n}@fixture.invalid`,
          "synthetic",
          now,
        ),
        now,
      ),
    );
    const note = createNote(
      {
        id: noteId,
        accountId,
        ...(options.workspaceId
          ? {
              owner: {
                kind: "workspace" as const,
                workspaceId: options.workspaceId,
              },
            }
          : {}),
        title: "source",
        html: "<p>source</p>",
        text: "source",
      },
      now,
    );
    await u.notes.insert(note);
    await u.imports.insertBatch({
      id: batchId,
      accountId,
      createdAt: now,
      useAi: true,
      cancelledAt: null,
    });
    await u.imports.insertOriginal({
      id: originalId,
      noteId,
      accountId,
      name: "source.pdf",
      bytes: 5,
      storageKey: `synthetic/not-created/${originalId}`,
      sha256: "a".repeat(64),
      format: options.format ?? "pdf",
      state: "ready",
      coverage: "complete",
      activeJobId: jobId,
      createdAt: now,
    });
    await u.jobs.insert({
      id: jobId,
      batchId,
      originalId,
      accountId,
      noteId,
      noteVersion: note.version,
      useAi: true,
      createdAt: now,
      updatedAt: now,
      attempt: 0,
      retryOf: null,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    });
    const connection = await u.openRouterConnections.ensure(accountId, now);
    await u.openRouterConnections.replace(
      {
        ...connection,
        state: "linked",
        epoch: 1,
        version: 2,
        credentialEnvelope: "synthetic",
        linkedAt: now,
        everLinkedAt: now,
        lastUsedAt: null,
        providerUserId: null,
        keyExpiresAt: null,
      },
      1,
    );
  });
  if (options.consumers === false)
    return { accountId, noteId, originalId, jobId, previewId };
  const common = {
    account_id: accountId,
    note_id: noteId,
    note_version: 0,
    original_id: originalId,
    source_sha256: "a".repeat(64),
    source_bytes: 5,
    credential_epoch: 1,
    created_at: now.getTime(),
    updated_at: now.getTime(),
    cancel_generation: 0,
    version: 1,
    ...(legacy
      ? {}
      : {
          source_origin: "local-original",
          source_binding_id: null,
          source_memory_bytes: 0,
        }),
  };
  if ((options.consumers ?? (ready ? "preview" : "llm")) === "llm")
    await insertRegenerationRow(base.client, "llm_conversions", {
      ...common,
      job_id: jobId,
      command_id: regenerationId(n * 100 + 7),
      request_digest: "b".repeat(64),
      operation: "regenerate",
      retry_of: null,
      source_format: options.format ?? "pdf",
      source_state: "ready",
      source_coverage: "complete",
      original_revision_no: null,
      model_id: "fixture/text",
      instruction: "",
      prompt_version: 1,
      admission_sequence: 1,
      deadline_at: now.getTime() + 1800000,
      phase: "queued",
      outcome: "pending",
      failure: null,
      result_version: null,
      owner_state: "idle",
      runtime_id: null,
      owner_token: null,
      response_budget: 0,
      preparation_version: options.format === "html" ? 1 : 2,
      selection_state: "fixed",
      source_ownership_generation: null,
    });
  const result = JSON.stringify({
    kind: "strict-text",
    modelKind: "chat-text",
    preparationVersion: 2,
    promptVersion: 1,
    policy: "strict-text-v1",
    preparedDocumentHash: "c".repeat(64),
    pages: 1,
  });
  if ((options.consumers ?? (ready ? "preview" : "llm")) === "preview")
    await insertRegenerationRow(base.client, "llm_pdf_previews", {
      ...common,
      id: previewId,
      command_id: regenerationId(n * 100 + 8),
      request_digest: "d".repeat(64),
      ownership_generation: 1,
      policy_version: 1,
      expires_at: now.getTime() + 300000,
      state: "queued",
      owner_state: "idle",
      owner_token: null,
      runtime_id: null,
      result_json: null,
      failure_code: null,
      consumed_job_id: null,
    });
  if (ready) {
    await base.client.execute({
      sql: "UPDATE llm_pdf_previews SET state='running',owner_state='active',owner_token=?,runtime_id=?,version=version+1 WHERE id=?",
      args: [
        regenerationId(n * 100 + 9),
        regenerationId(n * 100 + 10),
        previewId,
      ],
    });
    await base.client.execute({
      sql: "UPDATE llm_pdf_previews SET state='ready',owner_state='closed',result_json=?,version=version+1 WHERE id=?",
      args: [result, previewId],
    });
  }
  return { accountId, noteId, originalId, jobId, previewId };
}
