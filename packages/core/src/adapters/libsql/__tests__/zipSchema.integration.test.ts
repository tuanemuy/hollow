import { ZIP_HISTORY_MS } from "@repo/core/domain/zip/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts } from "../hollowSchema";
import { zipRequests, zipRuns } from "../zipSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("ZIP schema and ownership guards", () => {
  let c: TestContainer;
  const now = new Date("2026-09-26T10:00:00.000Z");
  const expiry = new Date(now.getTime() + ZIP_HISTORY_MS);
  beforeEach(async () => {
    c = await createTestContainer();
    await c.db.insert(accounts).values(
      ["a", "b"].map((id) => ({
        id,
        email: `${id}@zip-schema.example.test`,
        passwordHash: "synthetic",
        createdAt: now,
        verifiedAt: now,
      })),
    );
  });
  afterEach(() => c?.close());

  const request = (id = "q", accountId = "a") => ({
    id,
    accountId,
    commandId: `command-${id}`,
    inputDigest: "digest",
    format: "html" as const,
    style: "saved" as const,
    state: "active" as const,
    generation: 1,
    cancelGeneration: 0,
    version: 1,
    retryOf: null,
    createdAt: now,
    historyExpiresAt: expiry,
    updatedAt: now,
  });
  const run = (requestId = "q", accountId = "a") => ({
    requestId,
    accountId,
    generation: 1,
    commandId: `command-${requestId}`,
    inputDigest: "digest",
    state: "queued" as const,
    acceptedAt: now,
    historyExpiresAt: expiry,
    deadlineAt: new Date(now.getTime() + 1_800_000),
    version: 1,
  });

  it("applies ZIP migrations and retains valid FKs", async () => {
    const rows = await c.db.all(
      sql`select name from sqlite_master where type='table' and name glob 'zip_*'`,
    );
    expect(rows).toHaveLength(11);
    expect(await c.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    expect(
      await c.db.all(sql`select count(*) n from __drizzle_migrations`),
    ).toEqual([{ n: 32 }]);
  });

  it("holds the global slot from admission through stopping across actors", async () => {
    await c.db.insert(zipRequests).values(request());
    await expect(
      c.db.insert(zipRequests).values(request("other", "b")),
    ).rejects.toThrow();
    await c.db.run(sql`update zip_requests set state='stopping' where id='q'`);
    await expect(
      c.db.insert(zipRequests).values(request("other", "b")),
    ).rejects.toThrow();
    await c.db.run(sql`update zip_requests set state='terminal' where id='q'`);
    await c.db.insert(zipRequests).values(request("other", "b"));
  });

  it("does not release a request while a run is queued", async () => {
    await c.db.insert(zipRequests).values(request());
    await c.db.insert(zipRuns).values(run());
    await expect(
      c.db.run(sql`update zip_requests set state='terminal' where id='q'`),
    ).rejects.toThrow();
    await c.db.run(
      sql`update zip_runs set state='cancelled',finished_at=accepted_at where request_id='q'`,
    );
    await c.db.run(sql`update zip_requests set state='terminal' where id='q'`);
  });

  it("binds run actor and generation to the parent", async () => {
    await c.db.insert(zipRequests).values(request());
    await expect(c.db.insert(zipRuns).values(run("q", "b"))).rejects.toThrow();
    await expect(
      c.db.insert(zipRuns).values({ ...run(), generation: 2 }),
    ).rejects.toThrow();
    await c.db.insert(zipRuns).values(run());
  });

  it("never extends parent or accepted run history", async () => {
    await c.db.insert(zipRequests).values(request());
    await c.db.insert(zipRuns).values(run());
    await expect(
      c.db.run(
        sql`update zip_requests set created_at=created_at+1,history_expires_at=history_expires_at+1 where id='q'`,
      ),
    ).rejects.toThrow();
    await expect(
      c.db.run(
        sql`update zip_runs set accepted_at=accepted_at+1,history_expires_at=history_expires_at+1 where request_id='q'`,
      ),
    ).rejects.toThrow();
  });

  it("keeps storage format future-compatible without accepting invalid values", async () => {
    await c.db
      .insert(zipRequests)
      .values({ ...request(), format: "pdf", state: "terminal" });
    await expect(
      c.db.run(sql`update zip_requests set format='markdown' where id='q'`),
    ).rejects.toThrow();
    await expect(
      c.db.run(
        sql`insert into zip_requests select 'bad',account_id,'bad',input_digest,'other',style,state,generation,cancel_generation,version,retry_of,created_at,history_expires_at,updated_at from zip_requests where id='q'`,
      ),
    ).rejects.toThrow();
  });

  it("rejects fractional and unsafe generation values", async () => {
    await expect(
      c.db.insert(zipRequests).values({ ...request(), generation: 1.5 }),
    ).rejects.toThrow();
    await expect(
      c.db
        .insert(zipRequests)
        .values({ ...request(), generation: Number.MAX_SAFE_INTEGER + 1 }),
    ).rejects.toThrow();
    await c.db.insert(zipRequests).values(request());
    await expect(
      c.db.run(sql`update zip_requests set version=1.25 where id='q'`),
    ).rejects.toThrow();
  });

  it("rejects unfinished storage removal and early spool publication", async () => {
    await c.db.run(
      sql`insert into zip_spools(id,attempt_id,format,generation,storage_key,state,reserved_bytes,created_at,next_cleanup_at) values('s','attempt','html',1,'zip-spool-test','writing',10,${now.getTime()},${now.getTime()})`,
    );
    await c.db.run(
      sql`insert into object_writes(id,runtime,kind,owner_id,active,created_at) values('w','self','zip-spool','s',1,${now.getTime()})`,
    );
    await expect(
      c.db.run(
        sql`update zip_spools set state='removed',storage_key=null,reserved_bytes=0 where id='s'`,
      ),
    ).rejects.toThrow();
    await expect(
      c.db.run(
        sql`update zip_spools set state='ready',result='{}' where id='s'`,
      ),
    ).rejects.toThrow();
    await c.db.run(sql`update object_writes set active=0 where id='w'`);
    await c.db.run(sql`update zip_spools set state='cleanup' where id='s'`);
    await c.db.run(
      sql`update zip_spools set state='removed',storage_key=null,reserved_bytes=0 where id='s'`,
    );
    await expect(
      c.db.run(
        sql`update zip_spools set state='writing',storage_key='again' where id='s'`,
      ),
    ).rejects.toThrow();
  });
});
