import path from "node:path";
import type { Client } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { expect, it } from "vitest";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import { seedRegenerationLocal } from "./regenerationFixtures";
import {
  copyInputBaseline,
  inputCapacity,
  inputDatabase,
  inputId,
  inputMigrations,
} from "./regenerationInputFixtures";

declare module "vitest" {
  interface TaskMeta {
    inputStage?: number;
    inputClosed?: boolean;
  }
}
async function snapshot(client: Client) {
  const schema = (
    await client.execute(
      "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    )
  ).rows;
  const tables = schema.filter((r) => r.type === "table");
  if (tables.length > 200) throw Error("INPUT_TABLE_LIMIT");
  const rows = [];
  for (const table of tables) {
    const name = String(table.name);
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw Error("INPUT_TABLE");
    const columns = (
      await client.execute(`PRAGMA table_info(${name})`)
    ).rows.map((r) => String(r.name));
    const result = await client.execute(
      `SELECT * FROM ${name} ORDER BY ${columns.map((c) => `"${c}"`).join(",")}`,
    );
    rows.push({
      name,
      columns,
      values: result.rows.map((r) => columns.map((c) => r[c])),
      foreignKeys: (await client.execute(`PRAGMA foreign_key_list(${name})`))
        .rows,
    });
  }
  return { schema, rows };
}
it.skipIf(!process.env.HOLLOW_REGENERATION_INPUT_ROOT)(
  "0043 preserves old tuples and guards, NULL legacy and atomic rollback at three positions",
  async (ctx) => {
    ctx.task.meta.inputStage = 10;
    ctx.task.meta.inputClosed = false;
    const baseline = await inputDatabase("baseline", 42);
    let before: Awaited<ReturnType<typeof snapshot>>;
    try {
      ctx.task.meta.inputStage = 11;
      const llm = await seedRegenerationLocal(baseline, 1, false, false, {
        format: "html",
      });
      ctx.task.meta.inputStage = 12;
      await seedRegenerationLocal(baseline, 2, false, true);
      ctx.task.meta.inputStage = 13;
      await baseline.client.execute({
        sql: "UPDATE llm_conversions SET phase='preparing',owner_state='active',runtime_id=?,owner_token=?,response_budget=2097152,version=version+1 WHERE job_id=?",
        args: [inputId(1), inputId(2), llm.jobId],
      });
      ctx.task.meta.inputStage = 14;
      await baseline.client.execute({
        sql: "UPDATE llm_conversions SET source_memory_bytes=52428800,version=version+1 WHERE job_id=?",
        args: [llm.jobId],
      });
      ctx.task.meta.inputStage = 15;
      await baseline.client.execute(
        "UPDATE notes SET version=version+1 WHERE id IN(SELECT note_id FROM llm_pdf_previews WHERE state='ready')",
      );
      before = await snapshot(baseline.client);
      expect(
        (await baseline.client.execute("PRAGMA foreign_key_check")).rows,
      ).toHaveLength(0);
    } finally {
      baseline.client.close();
      ctx.task.meta.inputClosed = true;
    }
    const expected = readMigrationFiles({
      migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
    })[43];
    if (!expected) throw Error("INPUT_JOURNAL");
    for (const fault of [null, "columns", "guards", "fk"] as const) {
      const label = fault ? (`rollback-${fault}` as const) : "success";
      ctx.task.meta.inputStage =
        fault === "columns"
          ? 41
          : fault === "guards"
            ? 42
            : fault === "fk"
              ? 43
              : 20;
      const file = copyInputBaseline(baseline.filename, label);
      const client = createLibsqlClient({ url: `file:${file}` });
      ctx.task.meta.inputClosed = false;
      try {
        await applyPragmas(client);
        const task = migrate(getDatabase(client), {
          migrationsFolder: inputMigrations(
            label + "-ddl",
            43,
            fault ?? undefined,
          ),
        });
        if (fault) {
          await expect(task).rejects.toBeDefined();
          expect(await snapshot(client)).toEqual(before);
        } else {
          await task;
          ctx.task.meta.inputStage = 21;
          for (const table of before.rows) {
            const result = await client.execute(
              `SELECT ${table.columns.map((c) => `"${c}"`).join(",")} FROM ${table.name} ORDER BY ${table.columns.map((c) => `"${c}"`).join(",")}`,
            );
            const values = result.rows.map((r) =>
              table.columns.map((c) => r[c]),
            );
            if (table.name === "__drizzle_migrations") {
              const hi = table.columns.indexOf("hash");
              const ti = table.columns.indexOf("created_at");
              const added = (r: unknown[]) =>
                r[hi] === expected.hash && r[ti] === expected.folderMillis;
              expect(values.filter(added)).toHaveLength(1);
              expect(values).toHaveLength(table.values.length + 1);
              expect(values.filter((r) => !added(r))).toEqual(table.values);
            } else expect(values).toEqual(table.values);
          }
          ctx.task.meta.inputStage = 22;
          const after = await snapshot(client);
          const changed = new Set(
            [
              "llm_conversions",
              "llm_pdf_previews",
              "machine_regenerations",
            ].flatMap((t) =>
              ["insert", "update", "delete"].map((o) => `${t}_source_${o}`),
            ),
          );
          for (const entry of before.schema) {
            if (
              entry.type === "table" &&
              [
                "llm_conversions",
                "llm_pdf_previews",
                "machine_regenerations",
              ].includes(String(entry.name))
            )
              continue;
            if (entry.type === "trigger" && changed.has(String(entry.name)))
              continue;
            expect(
              after.schema.find(
                (r) => r.type === entry.type && r.name === entry.name,
              ),
            ).toEqual(entry);
          }
          for (const row of before.rows)
            expect(
              after.rows.find((r) => r.name === row.name)?.foreignKeys,
            ).toEqual(row.foreignKeys);
          for (const table of [
            "llm_conversions",
            "llm_pdf_previews",
            "machine_regenerations",
          ])
            expect(
              (
                await client.execute(
                  `SELECT count(*) AS n FROM ${table} WHERE source_input_receipt IS NOT NULL`,
                )
              ).rows[0]?.n,
            ).toBe(0);
          ctx.task.meta.inputStage = 30;
          await expect(
            client.execute(
              "UPDATE llm_conversions SET source_memory_bytes=0,version=version+1",
            ),
          ).rejects.toBeDefined();
          await expect(
            client.execute(
              "UPDATE llm_pdf_previews SET version=version+1 WHERE state='ready'",
            ),
          ).rejects.toBeDefined();
          await client.execute(
            "UPDATE llm_conversions SET owner_state='closed',phase='terminal',outcome='cancelled',cancel_generation=1,source_memory_bytes=0,version=version+1",
          );
          expect(
            (
              await client.execute(
                "SELECT source_memory_bytes,source_input_receipt FROM llm_conversions",
              )
            ).rows[0],
          ).toMatchObject({
            source_memory_bytes: 0,
            source_input_receipt: null,
          });
        }
        expect(
          (await client.execute("PRAGMA foreign_key_check")).rows,
        ).toHaveLength(0);
      } finally {
        client.close();
        ctx.task.meta.inputClosed = true;
        inputCapacity();
      }
    }
    ctx.task.meta.inputStage = 90;
  },
  120000,
);
