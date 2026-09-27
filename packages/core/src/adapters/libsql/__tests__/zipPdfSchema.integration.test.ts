import { assertZipPdfBootConfiguration } from "@repo/core/adapters/node/zip/config";
import { ConflictError } from "@repo/core/application/errors";
import { ZIP_HISTORY_MS } from "@repo/core/domain/zip/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts, notes } from "../hollowSchema";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { pdfArtifacts, pdfComputations } from "../pdfSchema";
import { zipPdfHolds } from "../zipPdfSchema";
import { zipAttempts, zipRequests, zipRuns, zipTargets } from "../zipSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("ZIP PDF binding and unopened hold schema guards", () => {
  let c: TestContainer;
  const now = new Date("2026-09-27T10:00:00.000Z");
  const time = now.getTime();
  const history = new Date(time + ZIP_HISTORY_MS);
  const identity = "a".repeat(64);
  const external = "b".repeat(64);
  beforeEach(async () => {
    c = await createTestContainer();
    await c.db.insert(accounts).values({
      id: "actor",
      email: "zip-pdf-schema@example.test",
      passwordHash: "synthetic",
      createdAt: now,
      verifiedAt: now,
    });
    await c.db.insert(notes).values({
      id: "note",
      ownerAccountId: "actor",
      title: "synthetic",
      html: "<p>data</p>",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await c.db.insert(pdfComputations).values({
      id: "compute",
      targetNoteId: "note",
      liveNoteId: "note",
      sourceIdentity: identity,
      profile: "pdf-profile",
      state: "closed",
      generation: 1,
      deadlineAt: new Date(time + 120_000),
      workspaceId: "synthetic-workspace",
      reservedBytes: 0,
      workspaceRemoved: true,
      nextCleanupAt: now,
      createdAt: now,
    });
    await c.db.insert(pdfArtifacts).values({
      id: "artifact",
      targetNoteId: "note",
      liveNoteId: "note",
      computeId: "compute",
      sourceIdentity: identity,
      profile: "pdf-profile",
      state: "ready",
      key: "synthetic-pdf",
      file: { filename: "synthetic.pdf", bytes: 4, sha256: "c".repeat(64) },
      publishedAt: now,
      expiresAt: new Date(time + 86_400_000),
      reservedBytes: 8,
      generation: 1,
      nextCleanupAt: now,
      createdAt: now,
    });
  });
  afterEach(async () => {
    try {
      expect(await c.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      c?.close();
    }
  });

  async function seed(format: "html" | "markdown" | "pdf" = "pdf") {
    await c.db.insert(zipRequests).values({
      id: "request",
      accountId: "actor",
      commandId: "command",
      inputDigest: "digest",
      format,
      style: "saved",
      state: "active",
      generation: 1,
      cancelGeneration: 0,
      version: 1,
      createdAt: now,
      historyExpiresAt: history,
      updatedAt: now,
    });
    await c.db.insert(zipRuns).values({
      requestId: "request",
      generation: 1,
      accountId: "actor",
      commandId: "command",
      inputDigest: "digest",
      state: "running",
      leaseToken: "lease",
      runtimeId: "self",
      leaseUntil: new Date(time + 60_000),
      deadlineAt: new Date(time + 1_800_000),
      acceptedAt: now,
      historyExpiresAt: history,
      finishedAt: null,
      version: 1,
    });
    await c.db.insert(zipTargets).values({
      requestId: "request",
      ordinal: 0,
      targetNoteId: "note",
      liveNoteId: "note",
      latestAttemptNumber: 1,
    });
    await c.db.insert(zipAttempts).values(attempt());
  }
  const attempt = () => ({
    id: "attempt",
    requestId: "request",
    generation: 1,
    ordinal: 0,
    attemptNumber: 1,
    title: "synthetic",
    expectedIdentity: "d".repeat(64),
    state: "queued" as const,
    createdAt: now,
    historyExpiresAt: history,
    version: 1,
  });
  const binding = () => ({
    state: "running" as const,
    pdfComputeId: "compute",
    pdfSourceIdentity: identity,
    pdfProfile: "pdf-profile",
    pdfExternalIdentity: external,
    pdfDeadlineAt: new Date(time + 120_000),
    pdfPhase: "waiting-pdf" as const,
  });
  const hold = () => ({
    attemptId: "attempt",
    artifactId: "artifact",
    artifactGeneration: 1,
    acquiredAt: now,
    state: "held" as const,
    version: 1,
  });
  const attach = () => c.db.update(zipAttempts).set(binding());
  const clear = () =>
    c.db.run(
      sql`update zip_attempts set pdf_compute_id=null,pdf_source_identity=null,pdf_profile=null,pdf_external_identity=null,pdf_deadline_at=null,pdf_phase=null where id='attempt'`,
    );
  const closing = () =>
    c.db.run(
      sql`update zip_pdf_holds set state='closing',version=version+1 where attempt_id='attempt'`,
    );
  const release = () =>
    c.db.run(
      sql`update zip_pdf_holds set state='released',claim_token=null,runtime_id=null,version=version+1 where attempt_id='attempt'`,
    );
  const deleteClaim = () =>
    c.db.run(
      sql`insert into object_deletes(storage_key,token,lease_until,done) values('synthetic-pdf','delete',${time + 60_000},0)`,
    );

  it("rejects missing PDF configuration while binding or unopened holds remain, but not released history", async () => {
    await seed();
    await expect(
      assertZipPdfBootConfiguration(c.db, false),
    ).resolves.toBeUndefined();
    await attach();
    await expect(
      assertZipPdfBootConfiguration(c.db, false),
    ).rejects.toMatchObject({ code: "PDF_CONFIGURATION_REQUIRED" });
    await c.db.insert(zipPdfHolds).values(hold());
    await c.db.run(sql`update zip_attempts set pdf_phase='copy-ready'`);
    await expect(
      assertZipPdfBootConfiguration(c.db, true),
    ).resolves.toBeUndefined();
    await closing();
    await release();
    await clear();
    await expect(
      assertZipPdfBootConfiguration(c.db, false),
    ).resolves.toBeUndefined();
  });

  it("recovers unopened holds only after the old computation and object owners are closed", async () => {
    await seed();
    await attach();
    await c.db.insert(zipPdfHolds).values(hold());
    await c.db.run(sql`update zip_attempts set pdf_phase='copy-ready'`);
    const uow = new LibsqlHollowUnitOfWorkProvider(c.db);
    await uow.run(async (u) => {
      await u.pdfComputations.recover(now);
      await u.zipPdf.recover(now);
      expect(await u.zipPdf.find("attempt")).toBeNull();
    });
    expect(await c.db.all(sql`select state from zip_pdf_holds`)).toEqual([
      { state: "released" },
    ]);
    await expect(
      assertZipPdfBootConfiguration(c.db, false),
    ).resolves.toBeUndefined();
  });

  it("rolls back copy-ready and its unopened hold together when the enclosing transaction fails", async () => {
    await seed();
    await attach();
    const uow = new LibsqlHollowUnitOfWorkProvider(c.db);
    await expect(
      uow.run(async (u) => {
        expect(
          await u.zipPdf.acquireCached("attempt", 1, "artifact", now),
        ).toBe(true);
        throw new ConflictError("TEST_ROLLBACK", "fixture rollback");
      }),
    ).rejects.toMatchObject({ code: "TEST_ROLLBACK" });
    expect(await c.db.all(sql`select count(*) n from zip_pdf_holds`)).toEqual([
      { n: 0 },
    ]);
    expect(
      await c.db.all(sql`select pdf_phase,version from zip_attempts`),
    ).toEqual([{ pdf_phase: "waiting-pdf", version: 1 }]);
  });

  it.each([
    "html",
    "markdown",
  ] as const)("preserves all-null %s attempts without admitting PDF binding", async (format) => {
    await seed(format);
    await c.db.run(sql`update zip_attempts set state='running'`);
    expect(
      await c.db.all(
        sql`select pdf_compute_id,pdf_source_identity,pdf_profile,pdf_external_identity,pdf_deadline_at,pdf_phase from zip_attempts`,
      ),
    ).toEqual([
      {
        pdf_compute_id: null,
        pdf_source_identity: null,
        pdf_profile: null,
        pdf_external_identity: null,
        pdf_deadline_at: null,
        pdf_phase: null,
      },
    ]);
    await expect(attach()).rejects.toThrow();
  });

  it("requires post-admission complete binding and preserves its identities and deadline", async () => {
    await seed();
    await expect(
      c.db
        .insert(zipAttempts)
        .values({ ...attempt(), ...binding(), id: "second", attemptNumber: 2 }),
    ).rejects.toThrow();
    for (const partial of [
      { pdfComputeId: "compute" },
      { pdfSourceIdentity: identity },
      { pdfProfile: "pdf-profile" },
      { pdfExternalIdentity: external },
      { pdfDeadlineAt: now },
      { pdfPhase: "waiting-pdf" as const },
    ])
      await expect(
        c.db.update(zipAttempts).set({ state: "running", ...partial }),
      ).rejects.toThrow();
    for (const invalid of [
      { pdfSourceIdentity: "d".repeat(64) },
      { pdfProfile: "other" },
      { pdfExternalIdentity: "B".repeat(64) },
      { pdfDeadlineAt: new Date(time + 1_800_001) },
    ])
      await expect(
        c.db.update(zipAttempts).set({ ...binding(), ...invalid }),
      ).rejects.toThrow();
    await attach();
    for (const changed of [
      { pdfExternalIdentity: "e".repeat(64) },
      { pdfDeadlineAt: new Date(time + 119_999) },
    ])
      await expect(c.db.update(zipAttempts).set(changed)).rejects.toThrow();
    await expect(
      c.db.run(sql`update zip_attempts set pdf_phase='copy-ready'`),
    ).rejects.toThrow();
    expect(
      await c.db.all(sql`select pdf_compute_id,pdf_phase from zip_attempts`),
    ).toEqual([{ pdf_compute_id: "compute", pdf_phase: "waiting-pdf" }]);
  });

  it.each([
    ["inactive parent", sql`update zip_requests set state='stopping'`],
    ["different generation", sql`update zip_requests set generation=2`],
    ["superseded attempt", sql`update zip_targets set latest_attempt_number=2`],
    ["cancelled generation", sql`update zip_requests set cancel_generation=1`],
    [
      "queued run",
      sql`update zip_runs set state='queued',lease_token=null,runtime_id=null,lease_until=null`,
    ],
    [
      "excluded ordinal",
      sql`update zip_runs set exclusions='[{"ordinal":0,"reason":"ZIP_CANCELLED"}]'`,
    ],
  ])("rejects attachment for %s", async (_label, mutation) => {
    await seed();
    await c.db.run(mutation);
    await expect(attach()).rejects.toThrow();
  });

  it("requires an unclaimed matching generation, initial held state, and strict live deadlines", async () => {
    await seed();
    await attach();
    for (const invalid of [
      { artifactGeneration: 2 },
      { state: "reading" as const, claimToken: "claim", runtimeId: "self" },
      { version: 2 },
      { acquiredAt: new Date(time + 60_000) },
    ])
      await expect(
        c.db.insert(zipPdfHolds).values({ ...hold(), ...invalid }),
      ).rejects.toThrow();
    await deleteClaim();
    await expect(c.db.insert(zipPdfHolds).values(hold())).rejects.toThrow();
    await c.db.run(
      sql`delete from object_deletes where storage_key='synthetic-pdf'`,
    );
    await c.db.run(sql`update zip_runs set lease_until=${time + 1_000_000}`);
    await expect(
      c.db
        .insert(zipPdfHolds)
        .values({ ...hold(), acquiredAt: new Date(time + 120_000) }),
    ).rejects.toThrow();
    await c.db.insert(zipPdfHolds).values(hold());
    await expect(c.db.insert(zipPdfHolds).values(hold())).rejects.toThrow();
  });

  it("rejects an artifact whose expiry equals acquisition even with live ZIP deadlines", async () => {
    await seed();
    await c.db.run(sql`update pdf_artifacts set state='cleanup'`);
    await c.db.insert(pdfArtifacts).values({
      id: "expired",
      targetNoteId: "note",
      liveNoteId: "note",
      computeId: "compute",
      sourceIdentity: identity,
      profile: "pdf-profile",
      state: "ready",
      key: "synthetic-expired",
      file: { filename: "expired.pdf", bytes: 4, sha256: "c".repeat(64) },
      publishedAt: new Date(time - 86_400_000),
      expiresAt: now,
      reservedBytes: 4,
      generation: 1,
      nextCleanupAt: now,
      createdAt: new Date(time - 86_400_000),
    });
    await attach();
    await expect(
      c.db.insert(zipPdfHolds).values({ ...hold(), artifactId: "expired" }),
    ).rejects.toThrow();
    await expect(c.db.insert(zipPdfHolds).values(hold())).rejects.toThrow();
  });

  it("permits logical retirement while pinning unopened PDF bytes until hold and binding release", async () => {
    await seed();
    await attach();
    await c.db.insert(zipPdfHolds).values(hold());
    await c.db.run(sql`update zip_attempts set pdf_phase='copy-ready'`);
    await c.db.run(sql`update pdf_artifacts set state='cleanup'`);
    for (const mutation of [
      sql`update pdf_artifacts set state='ready'`,
      sql`update pdf_artifacts set generation=2`,
      sql`update pdf_artifacts set reserved_bytes=7`,
      sql`update pdf_artifacts set cleanup_token='claim',cleanup_until=${time + 60_000}`,
    ])
      await expect(c.db.run(mutation)).rejects.toThrow();
    await expect(deleteClaim()).rejects.toThrow();
    await expect(c.db.run(sql`delete from pdf_artifacts`)).rejects.toThrow();
    await expect(c.db.run(sql`delete from zip_pdf_holds`)).rejects.toThrow();
    await expect(clear()).rejects.toThrow();
    await closing();
    await release();
    await expect(c.db.run(sql`delete from zip_pdf_holds`)).rejects.toThrow();
    await clear();
    await c.db.run(sql`delete from zip_pdf_holds`);
    await c.db.run(sql`update pdf_artifacts set state='cleanup'`);
    await deleteClaim();
    expect(await c.db.all(sql`select count(*) n from object_deletes`)).toEqual([
      { n: 1 },
    ]);
  });

  it("enforces claim pairs, version steps, phase order, and non-reacquisition after release", async () => {
    await seed();
    await attach();
    await c.db.insert(zipPdfHolds).values(hold());
    await c.db.run(sql`update zip_attempts set pdf_phase='copy-ready'`);
    await expect(
      c.db.run(
        sql`update zip_pdf_holds set state='reading',claim_token='claim',version=2`,
      ),
    ).rejects.toThrow();
    await expect(
      c.db.run(
        sql`update zip_pdf_holds set state='reading',claim_token='claim',runtime_id='self',version=3`,
      ),
    ).rejects.toThrow();
    await c.db.run(
      sql`update zip_pdf_holds set state='reading',claim_token='claim',runtime_id='self',version=2`,
    );
    await c.db.run(sql`update zip_attempts set pdf_phase='copying'`);
    await expect(
      c.db.run(sql`update zip_attempts set pdf_phase='copy-ready'`),
    ).rejects.toThrow();
    await expect(
      c.db.run(
        sql`update zip_pdf_holds set state='closing',claim_token='changed',version=3`,
      ),
    ).rejects.toThrow();
    await closing();
    await release();
    await expect(
      c.db.run(sql`update zip_pdf_holds set state='held',version=version+1`),
    ).rejects.toThrow();
    await clear();
    await expect(attach()).rejects.toThrow();
  });

  it.each([
    "zip-source",
    "zip-spool",
  ] as const)("retains closing holds while %s metadata is active", async (kind) => {
    await seed();
    await attach();
    await c.db.insert(zipPdfHolds).values(hold());
    await closing();
    if (kind === "zip-spool")
      await c.db.run(
        sql`insert into zip_spools(id,attempt_id,format,generation,storage_key,state,reserved_bytes,created_at,next_cleanup_at) values('spool','attempt','pdf',1,'synthetic-spool','writing',8,${time},${time})`,
      );
    const owner = kind === "zip-source" ? "attempt" : "spool";
    await c.db.run(
      sql`insert into object_writes(id,runtime,kind,owner_id,active,created_at) values('owner','self',${kind},${owner},1,${time})`,
    );
    await expect(release()).rejects.toThrow();
    await expect(clear()).rejects.toThrow();
    await c.db.run(sql`update object_writes set active=0 where id='owner'`);
    await release();
    await clear();
    expect(await c.db.all(sql`select state from zip_pdf_holds`)).toEqual([
      { state: "released" },
    ]);
  });

  it("retains binding during PDF stopping and blocks premature ZIP terminal state", async () => {
    await seed();
    await attach();
    await c.db.run(
      sql`update pdf_computations set workspace_removed=0,state='stopping',lease_token='pdf-lease',lease_until=${time + 60_000}`,
    );
    await expect(clear()).rejects.toThrow();
    const terminal = () =>
      c.db.run(
        sql`update zip_runs set state='cancelled',finished_at=${time},lease_token=null,runtime_id=null,lease_until=null`,
      );
    await expect(terminal()).rejects.toThrow();
    await c.db.run(
      sql`update pdf_computations set state='closed',lease_token=null,lease_until=null,workspace_removed=1`,
    );
    await clear();
    await c.db.run(sql`update zip_attempts set state='cancelled'`);
    await terminal();
    expect(await c.db.all(sql`select state from zip_runs`)).toEqual([
      { state: "cancelled" },
    ]);
  });
});
