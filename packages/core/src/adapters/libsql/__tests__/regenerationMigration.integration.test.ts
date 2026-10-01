import path from "node:path";
import type { Client } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { expect, it } from "vitest";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import {
  copyRegenerationDatabase,
  regenerationDatabase,
  regenerationMigrationFolder,
  seedRegenerationLocal,
} from "./regenerationFixtures";

declare module "vitest" {
  interface TaskMeta {
    regenerationStage?: number;
  }
}

async function snapshot(client: Client) {
  const schema = (
    await client.execute(
      "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    )
  ).rows;
  const tables = (
    await client.execute(
      "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).rows;
  if (tables.length > 200) throw Error("REGENERATION_TABLE_LIMIT");
  const rows: {
    name: string;
    columns: string[];
    values: unknown[];
    foreignKeys: unknown[];
  }[] = [];
  for (const table of tables) {
    const name = String(table.name);
    if (!/^[a-z_]+$/.test(name)) throw Error("REGENERATION_TABLE");
    const columns = (
      await client.execute(`PRAGMA table_info(${name})`)
    ).rows.map((row) => String(row.name));
    const result = await client.execute(
      `SELECT * FROM ${name} ORDER BY ${columns.map((column) => `"${column}"`).join(",")}`,
    );
    rows.push({
      name,
      columns,
      values: result.rows.map((row) => columns.map((column) => row[column])),
      foreignKeys: (
        await client.execute(`PRAGMA foreign_key_list(${name})`)
      ).rows.map((row) => ({
        table: row.table,
        from: row.from,
        to: row.to,
        on_update: row.on_update,
        on_delete: row.on_delete,
        match: row.match,
      })),
    });
  }
  return { schema, rows };
}
it.skipIf(!process.env.HOLLOW_REGENERATION_TEST_ROOT)(
  "0042 preserves every old value and exact guards, with atomic rollback at three stages",
  async (context) => {
    let stage = 1;
    context.task.meta.regenerationStage = stage;
    const baselineLabel =
      process.env.HOLLOW_REGENERATION_BASELINE_LABEL ?? "migration-baseline";
    if (!/^migration-baseline(?:-v[234])?$/.test(baselineLabel))
      throw Error("REGENERATION_LABEL");
    const baseline = await regenerationDatabase(baselineLabel, 41);
    let before: Awaited<ReturnType<typeof snapshot>>;
    try {
      await seedRegenerationLocal(baseline, 1, true, false);
      context.task.meta.regenerationStage = 11;
      await seedRegenerationLocal(baseline, 2, true, true);
      context.task.meta.regenerationStage = 12;
      await seedRegenerationLocal(baseline, 3, true, false);
      context.task.meta.regenerationStage = 13;
      await seedRegenerationLocal(baseline, 4, true, false, {
        consumers: "preview",
      });
      context.task.meta.regenerationStage = 14;
      // The ready history is legitimately stale; backfill must not refresh its receipt.
      await baseline.client.execute(
        "UPDATE notes SET version=version+1 WHERE id IN(SELECT note_id FROM llm_pdf_previews WHERE state='ready')",
      );
      before = await snapshot(baseline.client);
      expect(
        (await baseline.client.execute("PRAGMA foreign_key_check")).rows.length,
      ).toBe(0);
      stage = 2;
    } finally {
      baseline.client.close();
      context.task.meta.fixtureClosed = true;
    }
    try {
      const expected = readMigrationFiles({
        migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
      })[42];
      if (!expected || expected.folderMillis !== 1790985600000)
        throw Error("REGENERATION_JOURNAL");
      for (const fault of [null, "drop", "backfill", "fk"] as const) {
        const file = copyRegenerationDatabase(
          baseline.filename,
          `migration-${fault ?? (baselineLabel.endsWith("-v4") ? "success-v4" : "success")}`,
        );
        const client = createLibsqlClient({ url: `file:${file}` });
        context.task.meta.fixtureClosed = false;
        context.task.meta.regenerationStage = stage * 100;
        try {
          await applyPragmas(client);
          const task = migrate(getDatabase(client), {
            migrationsFolder: regenerationMigrationFolder(
              `migration-${fault ?? (baselineLabel.endsWith("-v4") ? "success-v4" : "success")}-ddl`,
              42,
              fault ?? undefined,
            ),
          });
          if (fault) {
            await expect(task).rejects.toBeDefined();
            context.task.meta.regenerationStage = stage * 100 + 1;
            expect(await snapshot(client)).toEqual(before);
          } else {
            await task;
            for (const table of before.rows) {
              context.task.meta.regenerationStage = 201;
              const result = await client.execute(
                `SELECT ${table.columns.map((column) => `"${column}"`).join(",")} FROM ${table.name} ORDER BY ${table.columns.map((column) => `"${column}"`).join(",")}`,
              );
              const values = result.rows.map((row) =>
                table.columns.map((column) => row[column]),
              );
              if (table.name === "__drizzle_migrations") {
                context.task.meta.regenerationStage = 202;
                const hash = table.columns.indexOf("hash");
                const createdAt = table.columns.indexOf("created_at");
                expect(hash >= 0 && createdAt >= 0).toBe(true);
                const isNew = (row: unknown[]) =>
                  row[hash] === expected.hash &&
                  row[createdAt] === expected.folderMillis;
                expect(values.filter(isNew).length).toBe(1);
                expect(values.length).toBe(table.values.length + 1);
                expect(values.filter((row) => !isNew(row))).toEqual(
                  table.values,
                );
              } else expect(values).toEqual(table.values);
            }
            context.task.meta.regenerationStage = 203;
            const after = await snapshot(client);
            for (const table of before.rows) {
              const current = after.rows.find((row) => row.name === table.name);
              expect(
                current?.foreignKeys.filter(
                  (row) =>
                    !(
                      typeof row === "object" &&
                      row !== null &&
                      "from" in row &&
                      row.from === "source_binding_id"
                    ),
                ),
              ).toEqual(table.foreignKeys);
            }
            context.task.meta.regenerationStage = 204;
            for (const value of before.schema.filter((v) => v.type !== "table"))
              expect(
                after.schema.find(
                  (row) => row.type === value.type && row.name === value.name,
                ),
              ).toEqual(value);
            context.task.meta.regenerationStage = 205;
            for (const table of ["llm_conversions", "llm_pdf_previews"]) {
              const state = (
                await client.execute(
                  `SELECT count(*) AS total,sum(source_origin='local-original' AND source_binding_id IS NULL AND source_memory_bytes=0) AS explicit FROM ${table}`,
                )
              ).rows[0];
              expect(state?.total).toBe(2);
              expect(state?.explicit).toBe(2);
            }
            context.task.meta.regenerationStage = 206;
            await expect(
              client.execute(
                "UPDATE llm_conversions SET instruction=instruction",
              ),
            ).rejects.toBeDefined();
            context.task.meta.regenerationStage = 207;
            await expect(
              client.execute(
                "UPDATE llm_pdf_previews SET version=version+1 WHERE state='ready'",
              ),
            ).rejects.toBeDefined();
          }
          context.task.meta.regenerationStage = stage * 100 + 9;
          expect(
            (await client.execute("PRAGMA foreign_key_check")).rows.length,
          ).toBe(0);
          stage++;
        } finally {
          client.close();
          context.task.meta.fixtureClosed = true;
        }
      }
      context.task.meta.regenerationStage = 600;
      expect(stage).toBe(6);
    } finally {
      context.task.meta.fixtureClosed = true;
    }
  },
  120000,
);
