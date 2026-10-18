import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Client } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, expect, it } from "vitest";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";

const source = path.resolve(import.meta.dirname, "../migrations");
const created = Date.parse("2026-10-01T00:00:00Z");
const expires = created + 7_776_000_000;
const removedObjects =
  /pdf_requests|pdf_artifacts|pdf_computations|pdf_deliveries|pdf_anonymous|zip_pdf|zip-source|pdf_compute_id|pdf_phase|pdf-artifact|pdf-delivery|pdf-anonymous/;

let root: string;
let client: Client;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "hollow-pdf-removal-"));
});
afterEach(() => {
  client?.close();
  rmSync(root, { recursive: true, force: true });
});

function folder(label: string, count: number) {
  const journal: { entries: { tag: string }[] } = JSON.parse(
    readFileSync(path.join(source, "meta/_journal.json"), "utf8"),
  );
  expect(journal.entries[48]?.tag).toBe("0048_remove_pdf_export");
  const directory = path.join(root, label);
  mkdirSync(path.join(directory, "meta"), { recursive: true });
  const entries = journal.entries.slice(0, count);
  writeFileSync(
    path.join(directory, "meta/_journal.json"),
    JSON.stringify({ ...journal, entries }),
  );
  for (const entry of entries)
    copyFileSync(
      path.join(source, `${entry.tag}.sql`),
      path.join(directory, `${entry.tag}.sql`),
    );
  return directory;
}
async function before() {
  client = createLibsqlClient({ url: `file:${path.join(root, "db.sqlite")}` });
  await applyPragmas(client);
  await migrate(getDatabase(client), {
    migrationsFolder: folder("before", 48),
  });
  await client.execute({
    sql: "insert into accounts(id,email,password_hash,created_at,verified_at) values('a','a@pdf-removal.example.test','synthetic',?,?)",
    args: [created, created],
  });
}
const seedRequest = (id: string, format: string, state: string) =>
  client.execute({
    sql: "insert into zip_requests(id,account_id,command_id,input_digest,format,style,state,generation,cancel_generation,version,retry_of,created_at,history_expires_at,updated_at) values(?,'a',?,'digest',?,'saved',?,1,0,1,null,?,?,?)",
    args: [id, `command-${id}`, format, state, created, expires, created],
  });
const after = () =>
  migrate(getDatabase(client), { migrationsFolder: folder("after", 49) });

it("0048 drops the PDF export schema and keeps HTML and Markdown ZIP rows", async () => {
  await before();
  await seedRequest("q", "markdown", "active");
  await client.execute({
    sql: "insert into zip_runs(request_id,account_id,generation,command_id,input_digest,state,accepted_at,history_expires_at,deadline_at,version) values('q','a',1,'command-q','digest','queued',?,?,?,1)",
    args: [created, expires, created + 1_800_000],
  });
  await client.execute(
    "insert into zip_targets(request_id,ordinal,target_note_id,live_note_id,latest_attempt_number) values('q',0,'note',null,1)",
  );
  await client.execute({
    sql: "insert into zip_attempts(id,request_id,generation,ordinal,attempt_number,title,expected_identity,state,result,failure,created_at,history_expires_at,version) values('p','q',1,0,1,'title','identity','queued',null,null,?,?,1)",
    args: [created, expires],
  });
  const triggers = async () =>
    (
      await client.execute(
        "select name from sqlite_master where type='trigger' order by name",
      )
    ).rows.map((row) => String(row.name));
  const kept = (await triggers()).filter(
    (name) =>
      !name.startsWith("pdf_") &&
      !name.startsWith("zip_pdf_") &&
      ![
        "p5d_pdf_requests_actor_insert",
        "object_delete_zip_pdf_hold",
        "zip_run_pdf_terminal",
      ].includes(name),
  );

  await after();

  expect(await triggers()).toEqual(kept);
  const remaining = (
    await client.execute(
      "select name,sql from sqlite_master where sql is not null",
    )
  ).rows.filter((row) => removedObjects.test(String(row.sql)));
  expect(remaining).toEqual([]);
  expect(
    (await client.execute("select id,format,state from zip_requests")).rows,
  ).toEqual([{ id: "q", format: "markdown", state: "active" }]);
  expect(
    (await client.execute("select id,request_id,state from zip_attempts")).rows,
  ).toEqual([{ id: "p", request_id: "q", state: "queued" }]);
  expect(
    (await client.execute("pragma table_info(zip_attempts)")).rows.some((row) =>
      String(row.name).startsWith("pdf_"),
    ),
  ).toBe(false);
  expect((await client.execute("pragma foreign_key_check")).rows).toEqual([]);
  await expect(
    client.execute("update zip_requests set format='html' where id='q'"),
  ).rejects.toThrow();
  await expect(
    client.execute(
      "update zip_attempts set expected_identity='other' where id='p'",
    ),
  ).rejects.toThrow();
  await expect(seedRequest("pdf", "pdf", "terminal")).rejects.toThrow();
});

it("0048 refuses a database that still holds a PDF-format ZIP request and leaves it unchanged", async () => {
  await before();
  await seedRequest("q", "pdf", "terminal");

  await expect(after()).rejects.toThrow();

  expect(
    (
      await client.execute(
        "select name from sqlite_master where name in ('pdf_requests','zip_pdf_holds') order by name",
      )
    ).rows.map((row) => row.name),
  ).toEqual(["pdf_requests", "zip_pdf_holds"]);
  expect(
    (await client.execute("select format from zip_requests")).rows,
  ).toEqual([{ format: "pdf" }]);
  expect(
    (await client.execute("select count(*) n from __drizzle_migrations")).rows,
  ).toEqual([{ n: 48 }]);
});
