import type { ZipAccept } from "@repo/core/application/zip/ports";
import {
  ZIP_ARTIFACT_MS,
  ZIP_HISTORY_MS,
  type ZipAssembly,
  type ZipAttemptResult,
  type ZipRun,
  type ZipSpool,
} from "@repo/core/domain/zip/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts, notes } from "../hollowSchema";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { createTestContainer, type TestContainer } from "./helpers";

describe("ZIP transactional ownership and lifetimes", () => {
  let c: TestContainer;
  let u: LibsqlHollowUnitOfWorkProvider;
  const now = new Date("2026-09-26T10:00:00Z");
  const expires = new Date(now.getTime() + ZIP_HISTORY_MS);
  const lease = {
    token: "lease",
    runtimeId: "self",
    until: new Date(now.getTime() + 60_000),
  };
  const key = { requestId: "q", generation: 1 };
  const result: ZipAttemptResult = {
    bytes: 4,
    sha256: "a".repeat(64),
    filename: "日本語.html",
    sourceIdentity: "source",
    externalIdentity: "external",
    profile: "html-v1",
  };
  beforeEach(async () => {
    c = await createTestContainer();
    u = new LibsqlHollowUnitOfWorkProvider(c.db);
    await c.db.insert(accounts).values(
      ["a", "b"].map((id) => ({
        id,
        email: `${id}@zip-repo.example.test`,
        passwordHash: "synthetic",
        createdAt: now,
        verifiedAt: now,
      })),
    );
    await c.db.insert(notes).values(
      ["n0", "n1"].map((id) => ({
        id,
        ownerAccountId: "a",
        title: id,
        html: "<p>data</p>",
        version: 1,
        createdAt: now,
        updatedAt: now,
      })),
    );
  });
  afterEach(() => c?.close());
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
      targets: [0, 1].map((ordinal) => ({
        requestId: "q",
        ordinal,
        targetNoteId: `n${ordinal}`,
        liveNoteId: `n${ordinal}`,
        latestAttemptNumber: 1,
      })),
      attempts: [0, 1].map((ordinal) => ({
        ...key,
        id: `p${ordinal}`,
        ordinal,
        attemptNumber: 1,
        title: `n${ordinal}`,
        expectedIdentity: "source",
        createdAt: now,
        historyExpiresAt: expires,
        version: 1,
        state: "queued",
        result: null,
        failure: null,
      })),
      reused: [],
    };
  }
  async function acceptClaim() {
    await u.run((x) => x.zipRequests.accept(input(), now));
    expect(await u.run((x) => x.zipWork.claim(now, lease))).not.toBeNull();
  }
  const spool = (ordinal: number): ZipSpool => ({
    id: `s${ordinal}`,
    attemptId: `p${ordinal}`,
    format: "html",
    generation: 1,
    reservedBytes: 10,
    createdAt: now,
    cleanup: { nextAt: now, claim: null },
    state: "writing",
    key: `zip-spool-${ordinal}`,
    result: null,
  });
  async function success(ordinal: number) {
    const attempt = await u.run((x) =>
      x.zipWork.nextAttempt(key, lease.token, now),
    );
    expect(attempt?.ordinal).toBe(ordinal);
    expect(
      await u.run((x) =>
        x.zipSpools.reserve(spool(ordinal), lease.token, 4096, now),
      ),
    ).toBe(true);
    expect(
      await u.run((x) =>
        x.zipSpools.publish(`s${ordinal}`, lease.token, result, now),
      ),
    ).toBe(true);
  }
  async function finish(partial = false) {
    await acceptClaim();
    await success(0);
    if (partial) {
      const p = await u.run((x) =>
        x.zipWork.nextAttempt(key, lease.token, now),
      );
      if (!p) throw Error("fixture");
      const { pdf: _pdf, ...base } = p;
      expect(
        await u.run((x) =>
          x.zipWork.finishAttempt(
            p.id,
            lease.token,
            {
              ...base,
              state: "failed",
              failure: "ZIP_SOURCE_CHANGED",
              result: null,
            },
            now,
          ),
        ),
      ).toBe(true);
    } else await success(1);
    const assembly: ZipAssembly = {
      ...key,
      id: "assembly",
      assemblyGeneration: 1,
      ordinals: partial ? [0] : [0, 1],
      sealDigest: "seal",
      reservedBytes: 400,
      createdAt: now,
      cleanup: { nextAt: now, claim: null },
      state: "writing",
      key: "zip-archive",
      file: null,
      outcome: null,
    };
    expect(
      await u.run((x) =>
        x.zipWork.beginAssembly(assembly, lease.token, 4096, now),
      ),
    ).toBe(true);
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
              key: "zip-archive",
              file,
            },
            entries: assembly.ordinals.map((ordinal) => ({
              ...result,
              artifactId: "artifact",
              ordinal,
              targetNoteId: `n${ordinal}`,
              liveNoteId: `n${ordinal}`,
            })),
            run: key,
            token: lease.token,
            partial,
          },
          now,
        ),
      ),
    ).toBe(true);
  }
  it("replays the same receipt and rejects another global admission", async () => {
    const first = await u.run((x) => x.zipRequests.accept(input(), now));
    expect(
      await u.run((x) =>
        x.zipRequests.accept(input(), new Date(now.getTime() + 1)),
      ),
    ).toEqual(first);
    await expect(
      u.run((x) =>
        x.zipRequests.accept(
          { ...input(), run: { ...input().run, inputDigest: "other" } },
          now,
        ),
      ),
    ).rejects.toThrow();
    const other = input();
    await expect(
      u.run((x) =>
        x.zipRequests.accept(
          {
            ...other,
            request: {
              ...other.request,
              id: "other",
              accountId: "b",
              commandId: "other",
            },
            run: {
              ...other.run,
              requestId: "other",
              accountId: "b",
              commandId: "other",
            },
          },
          now,
        ),
      ),
    ).rejects.toThrow();
  });
  it("publishes without double-accounting assembly and releases full-success spools", async () => {
    await finish();
    expect((await u.run((x) => x.zipRequests.find("q")))?.state).toBe(
      "terminal",
    );
    expect((await u.run((x) => x.zipRequests.findRun(key)))?.state).toBe(
      "succeeded",
    );
    expect(await u.run((x) => x.zipSpools.refs(key))).toEqual([]);
    expect(await u.run((x) => x.zipWork.reserved())).toEqual({
      bytes: 258,
      unmaterializedBytes: 0,
    });
    expect(await c.db.all(sql`pragma foreign_key_check`)).toEqual([]);
  });
  it("retains partial successes and atomically hands references to a fresh retry", async () => {
    await finish(true);
    const q = await u.run((x) => x.zipRequests.find("q"));
    if (!q) throw Error("fixture");
    const later = new Date(now.getTime() + 1000);
    const run: ZipRun = {
      ...input().run,
      generation: 2,
      commandId: "retry",
      inputDigest: "retry",
      acceptedAt: later,
      historyExpiresAt: new Date(later.getTime() + ZIP_HISTORY_MS),
    };
    const p = input().attempts[1];
    if (!p) throw Error("fixture");
    await u.run((x) =>
      x.zipRequests.acceptRetry(
        {
          requestId: "q",
          accountId: "a",
          expectedVersion: q.version,
          expectedGeneration: 1,
          run,
          attempts: [
            {
              ...p,
              id: "retry-p",
              generation: 2,
              attemptNumber: 2,
              createdAt: later,
              historyExpiresAt: run.historyExpiresAt,
            },
          ],
          reused: [
            {
              requestId: "q",
              generation: 2,
              ordinal: 0,
              spoolId: "s0",
              purpose: "active",
              retryUntil: null,
            },
          ],
        },
        later,
      ),
    );
    expect(
      (await u.run((x) => x.zipRequests.find("q")))?.historyExpiresAt,
    ).toEqual(expires);
    expect(
      (
        await u.run((x) =>
          x.zipRequests.findRun({ requestId: "q", generation: 2 }),
        )
      )?.historyExpiresAt,
    ).toEqual(run.historyExpiresAt);
    expect(
      (
        await u.run((x) => x.zipSpools.refs({ requestId: "q", generation: 2 }))
      )[0]?.ref.purpose,
    ).toBe("active");
  });
  it("does not publish or release global ownership while a spool owner is active", async () => {
    await acceptClaim();
    await u.run((x) => x.zipWork.nextAttempt(key, lease.token, now));
    await u.run((x) => x.zipSpools.reserve(spool(0), lease.token, 4096, now));
    await c.db.run(
      sql`insert into object_writes(id,runtime,kind,owner_id,active,created_at) values('w','self','zip-spool','s0',1,${now.getTime()})`,
    );
    expect(
      await u.run((x) => x.zipSpools.publish("s0", lease.token, result, now)),
    ).toBe(false);
    await u.run((x) => x.zipRequests.cancel("q", "a", now));
    expect(
      await u.run((x) => x.zipWork.finishClosed(key, lease.token, now)),
    ).toBe(false);
    expect((await u.run((x) => x.zipRequests.find("q")))?.state).toBe(
      "stopping",
    );
    await c.db.run(sql`update object_writes set active=0 where id='w'`);
    expect(
      await u.run((x) => x.zipWork.finishClosed(key, lease.token, now)),
    ).toBe(true);
    expect((await u.run((x) => x.zipWork.reserved())).bytes).toBe(10);
  });
  it("persists monotonic exclusions without rewriting successful attempts", async () => {
    await acceptClaim();
    await success(0);
    expect(
      await u.run((x) =>
        x.zipWork.exclude(key, lease.token, [0], "ZIP_CONTENT_CHANGED", now),
      ),
    ).toBe(true);
    expect((await u.run((x) => x.zipRequests.attempts(key)))[0]?.state).toBe(
      "succeeded",
    );
    expect(await u.run((x) => x.zipSpools.refs(key))).toEqual([]);
    await expect(
      c.db.run(sql`update zip_runs set exclusions='[]' where request_id='q'`),
    ).rejects.toThrow();
    await expect(
      c.db.run(
        sql`update zip_runs set exclusions='[{"ordinal":0,"reason":"ZIP_CONTENT_CHANGED"},{"ordinal":0,"reason":"ZIP_CONTENT_CHANGED"}]' where request_id='q'`,
      ),
    ).rejects.toThrow();
    await expect(
      c.db.run(
        sql`update zip_runs set exclusions='[{"ordinal":0,"reason":"ZIP_CONTENT_CHANGED"},{"ordinal":2,"reason":"ZIP_CONTENT_CHANGED"}]' where request_id='q'`,
      ),
    ).rejects.toThrow();
  });
  it("holds delivery capacity through closing and rejects early artifact removal", async () => {
    await finish();
    for (const id of ["d1", "d2"])
      await u.run((x) =>
        x.zipDeliveries.prepare(
          {
            id,
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
    await expect(
      u.run((x) =>
        x.zipDeliveries.prepare(
          {
            id: "d3",
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
      ),
    ).rejects.toThrow();
    await u.run((x) => x.zipDeliveries.claim("d1", "a", "claim", "self", now));
    await c.db.run(
      sql`insert into object_writes(id,runtime,kind,owner_id,active,created_at) values('reader','self','zip-delivery','d1',1,${now.getTime()})`,
    );
    await u.run((x) => x.zipDeliveries.beginClose("d1", "claim", now));
    expect(await u.run((x) => x.zipDeliveries.close("d1", "claim"))).toBe(
      false,
    );
    await u.run((x) => x.zipArtifacts.retire("artifact", now));
    expect(
      await u.run((x) =>
        x.zipArtifacts.claimCleanup(now, "cleanup", lease.until),
      ),
    ).toBeNull();
    await c.db.run(sql`update object_writes set active=0 where id='reader'`);
    expect(await u.run((x) => x.zipDeliveries.close("d1", "claim"))).toBe(true);
    expect(
      await u.run((x) =>
        x.zipArtifacts.claimCleanup(now, "cleanup", lease.until),
      ),
    ).not.toBeNull();
  });
  it("keeps debt until a matching physical deletion receipt", async () => {
    await finish();
    await u.run((x) => x.zipArtifacts.retire("artifact", now));
    await u.run((x) =>
      x.zipArtifacts.claimCleanup(now, "cleanup", lease.until),
    );
    expect(
      await u.run((x) =>
        x.zipArtifacts.cleaned("artifact", "cleanup", "missing"),
      ),
    ).toBe(false);
    await c.db.run(
      sql`insert into object_deletes(storage_key,token,done,lease_until) values('zip-archive','deleted',1,${lease.until.getTime()})`,
    );
    expect(
      await u.run((x) =>
        x.zipArtifacts.cleaned("artifact", "cleanup", "deleted"),
      ),
    ).toBe(true);
    expect((await u.run((x) => x.zipWork.reserved())).bytes).toBe(8);
    expect(
      (await u.run((x) => x.zipRequests.findRun(key)))?.publishedAt,
    ).toEqual(now);
  });
});
