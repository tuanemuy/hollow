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
import { migrate } from "drizzle-orm/libsql/migrator";
import { expect, it } from "vitest";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
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
    data.entries.length !== 40 ||
    data.entries[39]?.tag !== "0039_drive_backup"
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
  const entries = fault ? data.entries.slice(39) : data.entries.slice(0, 39);
  writeFileSync(
    path.join(directory, "meta/_journal.json"),
    JSON.stringify({ ...data, entries }),
    { flag: "wx", mode: 0o600 },
  );
  for (const entry of entries) {
    let sql = readFileSync(path.join(source, `${entry.tag}.sql`), "utf8");
    if (fault === "copy")
      sql = sql.replace(
        "DROP TRIGGER drive_control_update_guard;",
        "INSERT INTO __drive_backup_assertion VALUES(0);",
      );
    if (fault === "trigger")
      sql = sql.replace(
        "CREATE TRIGGER drive_control_update_guard BEFORE",
        "CREATE TRIGGER drive_connection_update_guard BEFORE",
      );
    if (fault === "fk")
      sql = sql.replace(
        "INSERT INTO __drive_backup_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;",
        "INSERT INTO __drive_backup_assertion VALUES(0);",
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
  return { tables, schema, connection, ledger };
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
it("0039 preserves 0038 values and rolls back copy, trigger and final-FK interruption", async () => {
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
    before = await snapshot(client);
    expect(before.ledger.length === 39).toBe(true);
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
        (await owned.execute("PRAGMA foreign_key_check")).rows.length === 0,
      ).toBe(true);
      if (variant === "success") {
        expect(
          after.ledger.length === 40 &&
            JSON.stringify(after.ledger.slice(0, 39)) ===
              JSON.stringify(before.ledger),
        ).toBe(true);
        const retained = after.schema.filter(
          (row) =>
            !String(row.name).startsWith("drive_backup_") &&
            row.name !== "drive_connections" &&
            row.name !== "drive_connection_update_guard",
        );
        const original = before.schema.filter(
          (row) =>
            row.name !== "drive_connections" &&
            row.name !== "drive_connection_update_guard",
        );
        expect(JSON.stringify(retained) === JSON.stringify(original)).toBe(
          true,
        );
        expect(after.tables.length === before.tables.length + 5).toBe(true);
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
