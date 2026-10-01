import { createHash } from "node:crypto";
import {
  constants,
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { Client } from "@libsql/client";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import type { DriveBackupTarget } from "@repo/core/domain/integration/driveBackup";
import { createNote } from "@repo/core/domain/note/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { expect, it } from "vitest";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import { driveBackupTargets } from "../driveBackupSchema";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";

const source = path.resolve(import.meta.dirname, "../migrations");
const now = new Date("2026-09-30T00:00:00Z");
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function rootDirectory() {
  const root = process.env.HOLLOW_DRIVE_BACKUP_TEST_ROOT;
  if (!root || !path.isAbsolute(root)) throw new Error("BACKUP_MIGRATION_ROOT");
  const stat = lstatSync(root);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== process.getuid?.() ||
    (stat.mode & 0o777) !== 0o700 ||
    realpathSync(root) !== root
  )
    throw new Error("BACKUP_MIGRATION_ROOT");
  const directory = path.join(root, "migration");
  mkdirSync(directory, { mode: 0o700 });
  return directory;
}
function journal() {
  const data: {
    version: string;
    dialect: string;
    entries: {
      idx: number;
      tag: string;
      when: number;
      version: string;
      breakpoints: boolean;
    }[];
  } = JSON.parse(readFileSync(path.join(source, "meta/_journal.json"), "utf8"));
  if (
    data.entries.length !== 42 ||
    data.entries[41]?.tag !== "0041_drive_backup_target_heads"
  )
    throw new Error("BACKUP_MIGRATION_JOURNAL");
  return data;
}
function migrationFolder(
  root: string,
  label: string,
  fault?: "copy" | "trigger" | "fk",
) {
  const directory = path.join(root, label);
  mkdirSync(directory, { mode: 0o700 });
  mkdirSync(path.join(directory, "meta"), { mode: 0o700 });
  const data = journal();
  const entries = fault ? data.entries.slice(41) : data.entries.slice(0, 41);
  writeFileSync(
    path.join(directory, "meta/_journal.json"),
    JSON.stringify({ ...data, entries }),
    { flag: "wx", mode: 0o600 },
  );
  for (const entry of entries) {
    let sql = readFileSync(path.join(source, `${entry.tag}.sql`), "utf8");
    if (fault === "copy")
      sql = sql.replace(
        "INSERT INTO drive_backup_target_heads(original_id,account_id,subject,target_id,version)",
        "INSERT INTO __drive_backup_injected_failure VALUES(0);",
      );
    if (fault === "trigger")
      sql = sql.replace(
        "CREATE TRIGGER drive_backup_head_insert BEFORE",
        "CREATE TRIGGER drive_backup_request_insert_guard BEFORE",
      );
    if (fault === "fk")
      sql = sql.replace(
        "INSERT INTO __drive_backup_head_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;",
        "INSERT INTO drive_backup_target_heads VALUES('00000000-0000-4000-8000-000000000998','00000000-0000-4000-8000-000000000003','fixture-missing','00000000-0000-4000-8000-000000000999',1);\n--> statement-breakpoint\nINSERT INTO __drive_backup_head_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;",
      );
    writeFileSync(path.join(directory, `${entry.tag}.sql`), sql, {
      flag: "wx",
      mode: 0o600,
    });
  }
  return directory;
}
async function snapshot(client: Client) {
  const tables = (
    await client.execute(
      "SELECT name,sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).rows;
  const schema = (
    await client.execute(
      "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    )
  ).rows;
  const connection = (
    await client.execute(
      "SELECT account_id,epoch,version,credential_version,settings_version,admission_sequence,state,auto_backup,hex(cast(credential as blob)),hex(cast(folder as blob)),last_used_at,updated_at FROM drive_connections ORDER BY account_id",
    )
  ).rows;
  const ledger = (
    await client.execute(
      "SELECT * FROM __drizzle_migrations ORDER BY created_at",
    )
  ).rows;
  const backup = [];
  for (const name of [
    "drive_backup_requests",
    "drive_backup_jobs",
    "drive_backup_targets",
    "drive_backup_transfers",
    "drive_backup_records",
  ]) {
    const rows = (await client.execute(`SELECT * FROM ${name} ORDER BY id`))
      .rows;
    backup.push({ name, rows });
  }
  return { tables, schema, connection, ledger, backup };
}
function fingerprint(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}
function copyDatabase(from: string, to: string) {
  const before: string[] = [];
  for (const suffix of ["", "-wal", "-shm"]) {
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(from + suffix);
    } catch {
      if (suffix === "") throw new Error("BACKUP_MIGRATION_COPY");
      continue;
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024)
      throw new Error("BACKUP_MIGRATION_COPY");
    const hash = fingerprint(from + suffix);
    before.push(hash);
    copyFileSync(from + suffix, to + suffix, constants.COPYFILE_EXCL);
    if (
      fingerprint(from + suffix) !== hash ||
      fingerprint(to + suffix) !== hash
    )
      throw new Error("BACKUP_MIGRATION_COPY");
  }
  return before;
}
it("0041 preserves all 0040 rows and guards, backfills every target state, and rolls back three interruptions", async () => {
  const root = rootDirectory();
  const baseline = path.join(root, "baseline.sqlite");
  writeFileSync(baseline, "", { flag: "wx", mode: 0o600 });
  const client = createLibsqlClient({ url: `file:${baseline}` });
  let before: Awaited<ReturnType<typeof snapshot>>;
  try {
    await applyPragmas(client);
    const db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: migrationFolder(root, "baseline-ddl"),
    });
    const uow = new LibsqlHollowUnitOfWorkProvider(db);
    for (let n = 1; n <= 3; n++) {
      await uow.run(async (u) => {
        await u.accounts.save(
          verifyAccount(
            createAccount(
              id(n),
              `migration-${n}@fixture.invalid`,
              "synthetic",
              now,
            ),
            now,
          ),
        );
        const old = await u.driveConnections.ensure(id(n), now);
        if (n !== 1)
          await u.driveConnections.replace(
            {
              ...old,
              state: "linked",
              epoch: 1,
              version: 2,
              settingsVersion: 2,
              credentialVersion: 1,
              credential: {
                subject: `migration-${n}`,
                email: null,
                envelope: `synthetic-envelope-${n}`,
                scopes: [
                  "openid",
                  "https://www.googleapis.com/auth/drive.file",
                ],
                accessExpiresAt: new Date(now.getTime() + 3600000),
                connectedAt: now,
              },
            },
            old.version,
            "adopt",
          );
      });
    }
    await uow.run(async (u) => {
      const old = await u.driveConnections.find(id(3));
      if (!old || old.state !== "linked")
        throw new Error("BACKUP_MIGRATION_FIXTURE");
      await u.driveConnections.replace(
        {
          ...old,
          version: old.version + 1,
          settingsVersion: old.settingsVersion + 1,
          folder: {
            id: "folder",
            name: "移行保存先",
            driveId: null,
            resourceKeyEnvelope: "synthetic-key",
            checkedAt: now,
          },
        },
        old.version,
        "folder",
      );
      const next = await u.driveConnections.find(id(3));
      if (!next || next.state !== "linked")
        throw new Error("BACKUP_MIGRATION_FIXTURE");
      await u.driveConnections.replace(
        { ...next, version: next.version + 1, state: "needs-relink" },
        next.version,
        "invalidate",
      );
    });
    const baselineTargets: DriveBackupTarget[] = [];
    await uow.run(async (u) => {
      const connection = await u.driveConnections.find(id(3));
      if (!connection || connection.state === "unlinked" || !connection.folder)
        throw new Error("BACKUP_MIGRATION_FIXTURE");
      for (let n = 0; n < 4; n++) {
        const noteId = id(100 + n);
        const originalId = id(110 + n);
        const targetId = id(120 + n);
        await u.notes.insert(
          createNote(
            {
              id: noteId,
              accountId: id(3),
              title: `migration original ${n}`,
              html: "<p>fixture</p>",
              text: "fixture",
            },
            now,
          ),
        );
        await u.imports.insertOriginal({
          id: originalId,
          noteId,
          accountId: id(3),
          name: `migration-${n}.pdf`,
          bytes: 1024,
          sha256: "a".repeat(64),
          storageKey: `migration-original-${n}`,
          format: "pdf",
          state: "ready",
          coverage: "complete",
          activeJobId: id(130 + n),
          createdAt: now,
        });
        const target = {
          id: targetId,
          originalId,
          noteId,
          accountId: id(3),
          subject: connection.credential.subject,
          marker: id(140 + n),
          folder: connection.folder,
          folderEpoch: connection.epoch,
          state: "unallocated" as const,
          fileId: null,
          version: 1,
          createdAt: now,
          updatedAt: now,
        };
        baselineTargets.push(target);
      }
    });
    for (const [n, target] of baselineTargets.entries()) {
      await db.insert(driveBackupTargets).values(target);
      await uow.run(async (u) => {
        const { id: targetId, noteId, originalId } = target;
        if (n === 1) {
          await u.driveBackupTargets.replace(
            {
              ...target,
              state: "allocated",
              fileId: "migration-record-file",
              version: 2,
            },
            1,
          );
          await u.driveBackupTargets.replace(
            {
              ...target,
              state: "confirmed",
              fileId: "migration-record-file",
              version: 3,
            },
            2,
          );
          await u.driveBackupRecords.insert({
            id: id(150),
            version: 1,
            targetId,
            noteId,
            originalId,
            accountId: id(3),
            subject: target.subject,
            fileId: "migration-record-file",
            folder: target.folder,
            bytes: 1024,
            sha256: "a".repeat(64),
            createdAt: now,
            webViewLink: null,
            resourceKeyEnvelope: null,
          });
        } else if (n > 1) {
          await u.driveBackupTargets.replace(
            {
              ...target,
              state: n === 2 ? "allocated" : "unknown",
              fileId: `migration-file-${n}`,
              version: 2,
            },
            1,
          );
        }
      });
    }
    await client.execute({
      sql: "INSERT INTO drive_backup_requests(id,account_id,command_id,intent_digest,kind,version,created_at,cancelled_at,count) VALUES(?,?,?,?,?,1,?,NULL,2)",
      args: [id(160), id(3), id(161), "b".repeat(64), "manual", now.getTime()],
    });
    for (let n = 0; n < 2; n++)
      await client.execute({
        sql: "INSERT INTO drive_backup_jobs(id,request_id,account_id,ordinal,attempt,retry_of,note_id,target_id,title,version,created_at,updated_at,terminal_at,state,bytes,failure,record_id) VALUES(?,?,?,?,1,NULL,?,?,?,1,?,?,?,?,?,NULL,?)",
        args: [
          id(170 + n),
          id(160),
          id(3),
          n,
          id(100 + n),
          id(120 + n),
          `migration original ${n}`,
          now.getTime(),
          now.getTime(),
          n === 0 ? null : now.getTime(),
          n === 0 ? "queued" : "succeeded",
          n === 0 ? 0 : 1024,
          n === 0 ? null : id(150),
        ],
      });
    await uow.run(async (u) => {
      const connection = await u.driveConnections.find(id(3));
      if (!connection || connection.state === "unlinked" || !connection.folder)
        throw new Error("BACKUP_MIGRATION_FIXTURE");
      await u.driveBackupTransfers.insert({
        id: id(180),
        jobId: id(170),
        targetId: id(120),
        identity: {
          noteId: id(100),
          originalId: id(110),
          accountId: id(3),
          workspaceId: null,
          ownershipGeneration: 1,
          storageKey: "migration-original-0",
          bytes: 1024,
          sha256: "a".repeat(64),
          name: "migration-0.pdf",
          subject: connection.credential.subject,
          epoch: connection.epoch,
          settingsVersion: connection.settingsVersion,
          folder: connection.folder,
        },
        phase: "queued",
        owner: { state: "none" },
        credentialVersion: connection.credentialVersion,
        version: 1,
        cancelGeneration: 0,
        received: 0,
        sessionEnvelope: null,
        statusAttempts: 0,
        readPinned: false,
        refreshPending: false,
        createdAt: now,
        updatedAt: now,
        deadlineAt: new Date(now.getTime() + 1800000),
      });
    });
    before = await snapshot(client);
    expect(before.ledger.length === 41).toBe(true);
    expect(
      (await client.execute("PRAGMA foreign_key_check")).rows.length === 0,
    ).toBe(true);
  } catch {
    throw new Error("BACKUP_MIGRATION_BASELINE");
  } finally {
    client.close();
  }
  const baselineHash = fingerprint(baseline);
  for (const variant of ["success", "copy", "trigger", "fk"] as const) {
    const file = path.join(root, `${variant}.sqlite`);
    copyDatabase(baseline, file);
    const owned = createLibsqlClient({ url: `file:${file}` });
    try {
      await applyPragmas(owned);
      let applied = false;
      try {
        await migrate(getDatabase(owned), {
          migrationsFolder:
            variant === "success"
              ? source
              : migrationFolder(root, `fault-${variant}`, variant),
        });
        applied = true;
      } catch {
        /* Expected injected migration failures are projected below. */
      }
      expect(applied === (variant === "success")).toBe(true);
      const after = await snapshot(owned);
      expect(
        JSON.stringify(after.connection) === JSON.stringify(before.connection),
      ).toBe(true);
      expect(
        JSON.stringify(after.backup) === JSON.stringify(before.backup),
      ).toBe(true);
      expect(
        (await owned.execute("PRAGMA foreign_key_check")).rows.length === 0,
      ).toBe(true);
      if (variant === "success") {
        expect(
          after.ledger.length === 42 &&
            JSON.stringify(after.ledger.slice(0, 41)) ===
              JSON.stringify(before.ledger),
        ).toBe(true);
        const additions = new Set([
          "drive_backup_target_heads",
          "drive_backup_target_heads_target_id_unique",
          "drive_backup_target_head_identity",
          "drive_backup_head_insert",
          "drive_backup_head_update",
          "drive_backup_head_delete",
          "drive_backup_target_head_insert",
          "drive_backup_target_head_update",
          "drive_backup_job_head_insert",
          "drive_backup_transfer_head_insert",
          "drive_backup_transfer_head_update",
          "drive_backup_record_head_insert",
        ]);
        const retained = after.schema.filter(
          (row) => !additions.has(String(row.name)),
        );
        const original = before.schema.filter(
          (row) => row.name !== "drive_backup_target_original",
        );
        expect(JSON.stringify(retained) === JSON.stringify(original)).toBe(
          true,
        );
        expect(after.tables.length === before.tables.length + 1).toBe(true);
        expect(
          (
            await owned.execute(
              "select count(*) n from drive_backup_target_heads h join drive_backup_targets t on t.id=h.target_id and t.original_id=h.original_id and t.account_id=h.account_id and t.subject=h.subject where h.version=1",
            )
          ).rows[0]?.n,
        ).toBe(4);
        const deferred = await owned.transaction("write");
        let commitRejected = false;
        try {
          await deferred.execute(
            "INSERT INTO drive_backup_target_heads VALUES('00000000-0000-4000-8000-000000000998','00000000-0000-4000-8000-000000000003','fixture-missing','00000000-0000-4000-8000-000000000999',1)",
          );
          try {
            await deferred.commit();
          } catch {
            commitRejected = true;
          }
        } finally {
          deferred.close();
        }
        expect(commitRejected).toBe(true);
        expect(
          (
            await owned.execute(
              "select count(*) n from drive_backup_target_heads",
            )
          ).rows[0]?.n,
        ).toBe(4);
        expect(
          (
            await owned.execute(
              "SELECT count(*) n FROM drive_backup_jobs WHERE admission_identity IS NULL AND root_ordinal IS NULL",
            )
          ).rows[0]?.n,
        ).toBe(2);
        expect(
          (
            await owned.execute(
              "SELECT count(*) n FROM drive_backup_requests WHERE generation=1 AND root_request_id IS NULL AND bulk_summary IS NULL",
            )
          ).rows[0]?.n,
        ).toBe(1);
        expect(
          (
            await owned.execute(
              "SELECT count(*) AS n FROM pragma_foreign_key_list('drive_connections') WHERE \"table\"='accounts' AND on_delete='RESTRICT'",
            )
          ).rows[0]?.n === 1,
        ).toBe(true);
        let invalid = false;
        try {
          await owned.execute({
            sql: "UPDATE drive_connections SET auto_backup=1,version=version+1,settings_version=settings_version+1 WHERE account_id=?",
            args: [id(1)],
          });
        } catch {
          invalid = true;
        }
        expect(invalid).toBe(true);
      } else
        expect(JSON.stringify(after) === JSON.stringify(before)).toBe(true);
    } catch {
      throw new Error(`BACKUP_MIGRATION_${variant.toUpperCase()}`);
    } finally {
      owned.close();
    }
    expect(statSync(file).size <= 16 * 1024 * 1024).toBe(true);
    expect(fingerprint(baseline) === baselineHash).toBe(true);
  }
}, 60000);
