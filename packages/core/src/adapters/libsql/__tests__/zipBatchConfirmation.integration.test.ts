import { randomUUID } from "node:crypto";
import type { BatchAcceptInput } from "@repo/core/application/batch/ports";
import {
  acceptBatch,
  batchConfirmation,
  getBatch,
  previewBatch,
} from "@repo/core/application/batch/usecases";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { ZipAccept } from "@repo/core/application/zip/ports";
import { createNote } from "@repo/core/domain/note/entity";
import { ZIP_HISTORY_MS } from "@repo/core/domain/zip/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts, sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("batch trash confirmation includes ZIP run identity but not its lease", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let actor: string;
  let noteId: string;
  let now: Date;
  const token = "self-zip-batch-session";
  const key = { requestId: "self-zip-request", generation: 1 };
  const lease = () => ({
    token: "self-lease",
    runtimeId: "self-fixture",
    until: new Date(now.getTime() + 60_000),
  });
  beforeEach(async () => {
    base = await createTestContainer();
    actor = randomUUID();
    noteId = randomUUID();
    now = new Date("2026-09-27T06:00:00Z");
    c = {
      ...createHollowContainer(base.db, "http://localhost", {
        async send() {},
      }),
      clock: { now: () => now },
    };
    await base.db.insert(accounts).values({
      id: actor,
      email: "zip-batch@example.test",
      passwordHash: "synthetic",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(token),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 86400000),
    });
    await c.unitOfWorkProvider.run((u) =>
      u.notes.insert(
        createNote(
          {
            id: noteId,
            accountId: actor,
            title: "確認対象",
            html: "<p>fixture</p>",
            text: "fixture",
          },
          now,
        ),
      ),
    );
  });
  afterEach(async () => {
    try {
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
      expect(
        await base.db.all(sql`select id from object_writes where active=1`),
      ).toEqual([]);
    } finally {
      base?.close();
    }
  });
  function zipInput(): ZipAccept {
    const expires = new Date(now.getTime() + ZIP_HISTORY_MS);
    return {
      request: {
        id: key.requestId,
        accountId: actor,
        commandId: "self-zip-command",
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
        accountId: actor,
        commandId: "self-zip-command",
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
          requestId: key.requestId,
          ordinal: 0,
          targetNoteId: noteId,
          liveNoteId: noteId,
          latestAttemptNumber: 1,
        },
      ],
      attempts: [
        {
          ...key,
          id: "self-attempt",
          ordinal: 0,
          attemptNumber: 1,
          title: "確認対象",
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
  async function prepare(): Promise<BatchAcceptInput> {
    const source = { kind: "personal" as const, accountId: actor };
    const operation = { kind: "trash" as const, cancelProcessing: true };
    const result = await previewBatch(c, token, {
      ids: [noteId],
      source,
      operation,
    });
    return {
      requestId: randomUUID(),
      source,
      operation,
      items: result.items.map(batchConfirmation),
    };
  }
  function expected(input: BatchAcceptInput) {
    const item = input.items[0];
    if (!item || item.kind !== "ready" || item.expected.kind !== "trash")
      throw new Error("Missing trash confirmation fixture");
    return item.expected;
  }
  async function zipSnapshot() {
    return Promise.all([
      base.db.all(sql`select * from zip_requests order by id`),
      base.db.all(sql`select * from zip_runs order by request_id,generation`),
      base.db.all(sql`select * from zip_attempts order by id`),
    ]);
  }
  async function rejectedWithoutMutation(input: BatchAcceptInput) {
    const prior = await zipSnapshot();
    await expect(acceptBatch(c, token, input)).rejects.toMatchObject({
      code: "BATCH_CHANGED",
    });
    expect(await base.db.all(sql`select id from note_batches`)).toEqual([]);
    expect(await base.db.all(sql`select id from note_batch_attempts`)).toEqual(
      [],
    );
    expect(await zipSnapshot()).toEqual(prior);
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    expect(note?.lifecycle.kind).toBe("active");
    expect(note?.version).toBe(expected(input).version);
  }
  it("rejects a confirmation made before a later ZIP starts without cancelling it", async () => {
    const stale = await prepare();
    expect(expected(stale).hasRunningJobs).toBe(false);
    await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.accept(zipInput(), now),
    );
    const current = await prepare();
    expect(expected(current).hasRunningJobs).toBe(true);
    expect(expected(current).processingFingerprint).not.toBe(
      expected(stale).processingFingerprint,
    );
    expect(expected(current).version).toBe(expected(stale).version);
    await rejectedWithoutMutation(stale);
  });
  it("rejects replacement by a new generation of the same ZIP request despite the same running flag", async () => {
    const initial = zipInput();
    await c.unitOfWorkProvider.run((u) => u.zipRequests.accept(initial, now));
    const stale = await prepare();
    expect(expected(stale).hasRunningJobs).toBe(true);
    const owned = lease();
    await c.unitOfWorkProvider.run(async (u) => {
      expect(await u.zipWork.claim(now, owned)).not.toBeNull();
      const attempt = await u.zipWork.nextAttempt(key, owned.token, now);
      if (!attempt) throw new Error("Missing ZIP attempt fixture");
      const { pdf: _pdf, ...base } = attempt;
      expect(
        await u.zipWork.finishAttempt(
          attempt.id,
          owned.token,
          {
            ...base,
            state: "failed",
            result: null,
            failure: "ZIP_FIXTURE_FAILURE",
          },
          now,
        ),
      ).toBe(true);
      await u.zipWork.fail(key, owned.token, "ZIP_FIXTURE_FAILURE", now);
      expect(await u.zipWork.finishClosed(key, owned.token, now)).toBe(true);
    });
    now = new Date(now.getTime() + 1000);
    const queued = initial.attempts[0];
    if (!queued) throw new Error("Missing queued attempt fixture");
    await c.unitOfWorkProvider.run(async (u) => {
      const prior = await u.zipRequests.find(key.requestId);
      if (!prior) throw new Error("Missing ZIP parent fixture");
      await u.zipRequests.acceptRetry(
        {
          requestId: prior.id,
          accountId: actor,
          expectedVersion: prior.version,
          expectedGeneration: 1,
          run: {
            ...initial.run,
            generation: 2,
            commandId: "self-retry-command",
            inputDigest: "retry",
            acceptedAt: now,
            historyExpiresAt: new Date(now.getTime() + ZIP_HISTORY_MS),
          },
          attempts: [
            {
              ...queued,
              id: "self-retry-attempt",
              generation: 2,
              attemptNumber: 2,
              createdAt: now,
              historyExpiresAt: new Date(now.getTime() + ZIP_HISTORY_MS),
            },
          ],
          reused: [],
        },
        now,
      );
    });
    const active = await c.unitOfWorkProvider.run((u) => u.zipWork.active());
    expect(active?.request.id).toBe(key.requestId);
    expect(active?.run.generation).toBe(2);
    const current = await prepare();
    expect(expected(current).hasRunningJobs).toBe(true);
    expect(expected(current).version).toBe(expected(stale).version);
    expect(expected(current).processingFingerprint).not.toBe(
      expected(stale).processingFingerprint,
    );
    await rejectedWithoutMutation(stale);
  });
  it("keeps confirmation valid when only the same run lease is renewed", async () => {
    await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.accept(zipInput(), now),
    );
    const owned = lease();
    await c.unitOfWorkProvider.run((u) => u.zipWork.claim(now, owned));
    const confirmation = await prepare();
    const renewed = new Date(owned.until.getTime() + 1000);
    now = new Date(now.getTime() + 1000);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipWork.renew(key, owned.token, now, renewed),
      ),
    ).toBe(true);
    const active = await c.unitOfWorkProvider.run((u) => u.zipWork.active());
    expect(active?.run.lease?.until).toEqual(renewed);
    expect(expected(await prepare())).toEqual(expected(confirmation));
    const parent = await acceptBatch(c, token, confirmation);
    expect((await getBatch(c, token, { id: parent.id })).items[0]?.state).toBe(
      "queued",
    );
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.active()))?.run.lease
        ?.until,
    ).toEqual(renewed);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
        ?.lifecycle.kind,
    ).toBe("active");
  });
});
