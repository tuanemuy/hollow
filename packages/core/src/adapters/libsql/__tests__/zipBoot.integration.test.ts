import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertZipBootConfiguration,
  readNodeZipConfiguration,
} from "@repo/core/adapters/node/zip/config";
import type { ZipAccept } from "@repo/core/application/zip/ports";
import {
  ZIP_ARTIFACT_MS,
  ZIP_HISTORY_MS,
  type ZipAttemptResult,
} from "@repo/core/domain/zip/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts, notes } from "../hollowSchema";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { createTestContainer, type TestContainer } from "./helpers";

const capacity = {
  diskBytes: 4 * 1024 ** 3,
  protectedDiskBytes: 6 * 1024 ** 3,
  totalMs: 1_800_000,
  childMs: 120_000,
  assemblyMs: 120_000,
  deliveryMs: 600_000,
  leaseMs: 60_000,
  cleanupMs: 30_000,
};
describe("ZIP configuration boundary", () => {
  let root: string;
  let file: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-config-test-"));
    file = path.join(root, "config.json");
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  async function config(value: unknown) {
    await writeFile(file, JSON.stringify(value));
  }
  const read = (existing = 6 * 1024 ** 3) =>
    readNodeZipConfiguration(file, existing);
  it("leaves absent configuration disabled and returns exact configured capacity", async () => {
    expect(await readNodeZipConfiguration(undefined, 6 * 1024 ** 3)).toBeNull();
    await config({ version: 1, capacity });
    expect(await read()).toEqual(capacity);
  });
  it("rejects strict shape, noninteger, unsafe, nonpositive and timer overflow inputs", async () => {
    const { totalMs: _totalMs, ...missing } = capacity;
    const invalid = [
      { version: 2, capacity },
      { version: 1, capacity, extra: true },
      { version: 1, capacity: { ...capacity, extra: 1 } },
      { version: 1, capacity: missing },
      ...[0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "4096"].map((diskBytes) => ({
        version: 1,
        capacity: { ...capacity, diskBytes },
      })),
      { version: 1, capacity: { ...capacity, childMs: 2_147_483_648 } },
      {
        version: 1,
        capacity: { ...capacity, protectedDiskBytes: 6 * 1024 ** 3 - 1 },
      },
    ];
    for (const value of invalid) {
      await config(value);
      await expect(read()).rejects.toMatchObject({
        code: "ZIP_CONFIGURATION_INVALID",
      });
    }
  });
  it("requires protection of the actual existing pools and safe pool metadata", async () => {
    await config({ version: 1, capacity });
    await expect(read(7 * 1024 ** 3)).rejects.toMatchObject({
      code: "ZIP_CONFIGURATION_INVALID",
    });
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      await expect(read(value)).rejects.toMatchObject({
        code: "ZIP_CONFIGURATION_INVALID",
      });
    const configured = {
      ...capacity,
      protectedDiskBytes: 7 * 1024 ** 3,
      totalMs: 2_147_483_647,
    };
    await config({ version: 1, capacity: configured });
    expect(await read(7 * 1024 ** 3)).toEqual(configured);
  });
  it("accepts 16 KiB exactly and rejects one byte over without leaking paths", async () => {
    const value = JSON.stringify({ version: 1, capacity });
    await writeFile(file, value.padEnd(16384, " "));
    expect(await read()).toEqual(capacity);
    await writeFile(file, value.padEnd(16385, " "));
    const error = await read().catch((value: unknown) => value);
    expect(error).toMatchObject({ code: "ZIP_CONFIGURATION_INVALID" });
    expect(String(error)).not.toContain(root);
  });
  it("rejects malformed JSON, absent file, directories and symlink files", async () => {
    await expect(read()).rejects.toMatchObject({
      code: "ZIP_CONFIGURATION_INVALID",
    });
    await writeFile(file, "{not JSON}");
    await expect(read()).rejects.toMatchObject({
      code: "ZIP_CONFIGURATION_INVALID",
    });
    await expect(
      readNodeZipConfiguration(root, 6 * 1024 ** 3),
    ).rejects.toMatchObject({ code: "ZIP_CONFIGURATION_INVALID" });
    await config({ version: 1, capacity });
    const link = path.join(root, "linked.json");
    await symlink(file, link);
    await expect(
      readNodeZipConfiguration(link, 6 * 1024 ** 3),
    ).rejects.toMatchObject({ code: "ZIP_CONFIGURATION_INVALID" });
  });
});

describe("ZIP unconfigured boot residual-resource guard", () => {
  let c: TestContainer;
  let u: LibsqlHollowUnitOfWorkProvider;
  const now = new Date("2026-09-27T06:00:00Z");
  const expires = new Date(now.getTime() + ZIP_HISTORY_MS);
  const key = { requestId: "q", generation: 1 };
  const lease = {
    token: "self-lease",
    runtimeId: "self-fixture",
    until: new Date(now.getTime() + 60_000),
  };
  const result: ZipAttemptResult = {
    bytes: 4,
    sha256: "a".repeat(64),
    filename: "fixture.html",
    sourceIdentity: "source",
    externalIdentity: "external",
    profile: "fixture",
  };
  beforeEach(async () => {
    c = await createTestContainer();
    u = new LibsqlHollowUnitOfWorkProvider(c.db);
    await c.db.insert(accounts).values({
      id: "a",
      email: "zip-boot@example.test",
      passwordHash: "synthetic",
      createdAt: now,
      verifiedAt: now,
    });
    await c.db.insert(notes).values({
      id: "n",
      ownerAccountId: "a",
      title: "fixture",
      html: "<p>x</p>",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  });
  afterEach(async () => {
    try {
      expect(await c.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      c?.close();
    }
  });
  function input(): ZipAccept {
    return {
      request: {
        id: "q",
        accountId: "a",
        commandId: "command",
        inputDigest: "digest",
        options: { format: "html", style: "saved" },
        state: "active",
        createdAt: now,
        historyExpiresAt: expires,
        updatedAt: now,
        generation: 1,
        cancelGeneration: 0,
        retryOf: null,
        version: 1,
      },
      run: {
        ...key,
        accountId: "a",
        commandId: "command",
        inputDigest: "digest",
        state: "queued",
        lease: null,
        failure: null,
        acceptedAt: now,
        historyExpiresAt: expires,
        deadlineAt: new Date(now.getTime() + 1_800_000),
        publishedAt: null,
        finishedAt: null,
        artifactId: null,
        exclusions: [],
        results: null,
        version: 1,
      },
      targets: [
        {
          requestId: "q",
          ordinal: 0,
          targetNoteId: "n",
          liveNoteId: "n",
          latestAttemptNumber: 1,
        },
      ],
      attempts: [
        {
          ...key,
          id: "attempt",
          ordinal: 0,
          attemptNumber: 1,
          title: "fixture",
          expectedIdentity: "source",
          createdAt: now,
          historyExpiresAt: expires,
          version: 1,
          state: "queued",
          result: null,
          failure: null,
        },
      ],
      reused: [],
    };
  }
  const snapshot = async () => {
    const tables = [
      "zip_requests",
      "zip_runs",
      "zip_targets",
      "zip_attempts",
      "zip_spools",
      "zip_spool_refs",
      "zip_assemblies",
      "zip_artifacts",
      "zip_artifact_entries",
      "zip_deliveries",
      "object_writes",
    ] as const;
    return Promise.all(
      tables.map((table) =>
        c.db.all(sql.raw(`select * from ${table} order by rowid`)),
      ),
    );
  };
  async function blocked() {
    const before = await snapshot();
    await expect(assertZipBootConfiguration(c.db, false)).rejects.toMatchObject(
      { code: "ZIP_CONFIGURATION_REQUIRED" },
    );
    expect(await snapshot()).toEqual(before);
    await expect(
      assertZipBootConfiguration(c.db, true),
    ).resolves.toBeUndefined();
    expect(await snapshot()).toEqual(before);
  }
  async function accept() {
    await u.run((x) => x.zipRequests.accept(input(), now));
  }
  async function spool() {
    await accept();
    await u.run((x) => x.zipWork.claim(now, lease));
    await u.run((x) => x.zipWork.nextAttempt(key, lease.token, now));
    expect(
      await u.run((x) =>
        x.zipSpools.reserve(
          {
            id: "spool",
            attemptId: "attempt",
            format: "html",
            generation: 1,
            reservedBytes: 10,
            createdAt: now,
            cleanup: { nextAt: now, claim: null },
            state: "writing",
            key: "self-spool",
            result: null,
          },
          lease.token,
          4096,
          now,
        ),
      ),
    ).toBe(true);
    expect(
      await u.run((x) =>
        x.zipSpools.publish("spool", lease.token, result, now),
      ),
    ).toBe(true);
  }
  async function assembly() {
    await spool();
    expect(
      await u.run((x) =>
        x.zipWork.beginAssembly(
          {
            ...key,
            id: "assembly",
            assemblyGeneration: 1,
            ordinals: [0],
            sealDigest: "seal",
            reservedBytes: 400,
            createdAt: now,
            cleanup: { nextAt: now, claim: null },
            state: "writing",
            key: "self-archive",
            file: null,
            outcome: null,
          },
          lease.token,
          4096,
          now,
        ),
      ),
    ).toBe(true);
  }
  async function published() {
    await assembly();
    const file = {
      bytes: 250,
      sha256: "b".repeat(64),
      filename: "hollow-export.zip",
    };
    expect(
      await u.run((x) =>
        x.zipWork.closeAssembly("assembly", lease.token, "success", file, now),
      ),
    ).toBe(true);
    expect(
      await u.run((x) =>
        x.zipArtifacts.publish(
          {
            artifact: {
              id: "artifact",
              assemblyId: "assembly",
              generation: 1,
              publishedAt: now,
              expiresAt: new Date(now.getTime() + ZIP_ARTIFACT_MS),
              reservedBytes: 250,
              cleanup: { nextAt: now, claim: null },
              state: "ready",
              key: "self-archive",
              file,
            },
            entries: [
              {
                ...result,
                artifactId: "artifact",
                ordinal: 0,
                targetNoteId: "n",
                liveNoteId: "n",
              },
            ],
            run: key,
            token: lease.token,
            partial: false,
          },
          now,
        ),
      ),
    ).toBe(true);
    await u.run((x) =>
      x.zipSpools.claimCleanup(now, "spool-clean", lease.until),
    );
    await c.db.run(
      sql`insert into object_deletes(storage_key,token,done,lease_until) values('self-spool','spool-delete',1,${lease.until.getTime()})`,
    );
    expect(
      await u.run((x) =>
        x.zipSpools.cleaned("spool", "spool-clean", "spool-delete"),
      ),
    ).toBe(true);
  }
  async function prepare() {
    await u.run((x) =>
      x.zipDeliveries.prepare(
        {
          id: "delivery",
          artifactId: "artifact",
          artifactGeneration: 1,
          accountId: "a",
          createdAt: now,
          expiresAt: new Date(now.getTime() + 600_000),
          state: "ready",
          claim: null,
        },
        now,
      ),
    );
  }
  it("allows an empty ZIP database without changing it", async () => {
    const before = await snapshot();
    await expect(
      assertZipBootConfiguration(c.db, false),
    ).resolves.toBeUndefined();
    expect(await snapshot()).toEqual(before);
  });
  it("refuses queued admission and then allows its resource-free cancelled history", async () => {
    await accept();
    await blocked();
    await u.run((x) => x.zipRequests.cancel("q", "a", now));
    await u.run((x) => x.zipWork.finishClosed(key, null, now));
    const before = await snapshot();
    await expect(
      assertZipBootConfiguration(c.db, false),
    ).resolves.toBeUndefined();
    expect(await snapshot()).toEqual(before);
  });
  it("refuses an active spool reference even after its run has failed", async () => {
    await spool();
    await u.run((x) =>
      x.zipWork.fail(key, lease.token, "ZIP_FIXTURE_FAILURE", now),
    );
    await u.run((x) => x.zipWork.finishClosed(key, lease.token, now));
    expect((await u.run((x) => x.zipRequests.find("q")))?.state).toBe(
      "terminal",
    );
    expect(await u.run((x) => x.zipSpools.refs(key))).toHaveLength(1);
    await blocked();
  });
  it("refuses nonclosed assembly and closed assembly debt", async () => {
    await assembly();
    await blocked();
    await u.run((x) =>
      x.zipWork.closeAssembly("assembly", lease.token, "failure", null, now),
    );
    await u.run((x) =>
      x.zipWork.fail(key, lease.token, "ZIP_FIXTURE_FAILURE", now),
    );
    await u.run((x) => x.zipWork.finishClosed(key, lease.token, now));
    expect((await u.run((x) => x.zipWork.assembly("assembly")))?.state).toBe(
      "closed",
    );
    await blocked();
  });
  it.each([
    "writing",
    "cleanup",
  ] as const)("refuses standalone %s spool debt", async (state) => {
    await c.db.run(
      sql`insert into zip_spools(id,attempt_id,format,generation,storage_key,state,reserved_bytes,created_at,next_cleanup_at) values('debt','old-attempt','html',1,'self-debt',${state},10,${now.getTime()},${now.getTime()})`,
    );
    await blocked();
  });
  it.each([
    "zip-spool",
    "zip-assembly",
    "zip-delivery",
  ] as const)("refuses an active %s owner even without other retained rows", async (kind) => {
    await c.db.run(
      sql`insert into object_writes(id,runtime,kind,owner_id,active,created_at) values('owner','self',${kind},'old-owner',1,${now.getTime()})`,
    );
    await blocked();
  });
  it("refuses ready/cleanup artifacts and live delivery states, then allows only zero-resource history", async () => {
    await published();
    await blocked();
    await prepare();
    await blocked();
    await u.run((x) =>
      x.zipDeliveries.claim("delivery", "a", "claim", "self", now),
    );
    await blocked();
    await u.run((x) => x.zipArtifacts.retire("artifact", now));
    expect((await u.run((x) => x.zipDeliveries.find("delivery")))?.state).toBe(
      "closing",
    );
    await blocked();
    expect(await u.run((x) => x.zipDeliveries.close("delivery", "claim"))).toBe(
      true,
    );
    await blocked();
    await u.run((x) =>
      x.zipArtifacts.claimCleanup(now, "artifact-clean", lease.until),
    );
    await c.db.run(
      sql`insert into object_deletes(storage_key,token,done,lease_until) values('self-archive','artifact-delete',1,${lease.until.getTime()})`,
    );
    expect(
      await u.run((x) =>
        x.zipArtifacts.cleaned("artifact", "artifact-clean", "artifact-delete"),
      ),
    ).toBe(true);
    await c.db.run(
      sql`insert into object_writes(id,runtime,kind,owner_id,active,created_at) values('closed-owner','self','zip-assembly','assembly',0,${now.getTime()})`,
    );
    expect((await u.run((x) => x.zipWork.reserved())).bytes).toBe(0);
    expect((await u.run((x) => x.zipRequests.findRun(key)))?.state).toBe(
      "succeeded",
    );
    expect((await u.run((x) => x.zipDeliveries.find("delivery")))?.state).toBe(
      "closed",
    );
    const before = await snapshot();
    await expect(
      assertZipBootConfiguration(c.db, false),
    ).resolves.toBeUndefined();
    expect(await snapshot()).toEqual(before);
  });
});
