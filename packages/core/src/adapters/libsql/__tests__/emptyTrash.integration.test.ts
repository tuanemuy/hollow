import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  admitEmptyTarget,
  cancelEmptyTrash,
  confirmEmptyTrash,
  discardEmptyTrash,
  getEmptyTrash,
  listEmptyAttempts,
  listEmptyTrash,
  prepareEmptyTrash,
  retryEmptyTrash,
  sweepEmptyTrash,
} from "@repo/core/application/note/emptyTrash";
import {
  listNotePurges,
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { restoreNote, trashNote } from "@repo/core/application/note/trash";
import { processOutboxEvents } from "@repo/core/application/workers/eventRelayWorker";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoordinatedObjectStorage } from "../../node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { notes } from "../hollowSchema";
import { LibsqlNoteRepository } from "../repositories/noteRepository";
import { createTestContainer, type TestContainer } from "./helpers";

describe("fixed-scope empty trash and logical child attempts", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let token: string;
  let other: string;
  let owner: string;
  let now: Date;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-empty-test-"));
    now = new Date("2026-09-10T05:00:00Z");
    const mails: string[] = [];
    const common = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    const storage = new CoordinatedObjectStorage(
      dir,
      common.unitOfWorkProvider,
      common.clock,
    );
    c = {
      ...common,
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
    };
    async function user(email: string) {
      const r = await signUp(c, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const s = await verifyEmail(
        c,
        new URL(link).searchParams.get("token") ?? "",
        r.browserToken,
      );
      if (!s) throw Error("session");
      return s;
    }
    const a = await user("empty-a@example.test");
    token = a.token;
    owner = a.user.id;
    other = (await user("empty-b@example.test")).token;
    await storage.recoverOwners();
  });
  afterEach(async () => {
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  async function seed(n: number) {
    const rows = Array.from({ length: n }, (_, i) => ({
      id: c.idGenerator.next(),
      ownerAccountId: owner,
      lifecycle: "trashed" as const,
      trashedAt: now,
      purgeAfter: new Date(now.getTime() + 30 * 86400_000),
      trashOperationId: c.idGenerator.next(),
      title: `metadata ${i}`,
      html: "<p>source</p>",
      version: 0,
      createdAt: now,
      updatedAt: now,
    }));
    for (let i = 0; i < n; i += 50)
      await base.db.insert(notes).values(rows.slice(i, i + 50));
    return rows;
  }
  async function prepare() {
    const p = await prepareEmptyTrash(c, token);
    if (p.kind !== "prepared") throw Error("empty fixture");
    return p;
  }
  async function detail(id: string) {
    const d = await getEmptyTrash(c, token, { id });
    if (d.kind !== "job") throw Error("not accepted");
    return d;
  }
  it("persists, decodes and dispatches the accepted empty wake once, alongside purge wakes", async () => {
    await seed(1);
    const p = await prepare();
    await confirmEmptyTrash(c, token, p);
    await confirmEmptyTrash(c, token, p);
    const observed: string[] = [];
    const wake = vi.fn();
    const dispatch = async () =>
      processOutboxEvents({ ...base, clock: c.clock }, async (events) =>
        events.map((event) => {
          observed.push(event.type);
          wake();
          if (event.type === "EmptyTrashQueued")
            expect(event.payload).toEqual({ parentId: p.id });
          return { kind: "success" as const, id: event.id };
        }),
      );
    expect((await dispatch()).processed).toBe(1);
    expect(observed).toEqual(["EmptyTrashQueued"]);
    expect((await dispatch()).processed).toBe(0);
    await sweepEmptyTrash(c);
    expect((await dispatch()).processed).toBe(1);
    expect(observed).toEqual(["EmptyTrashQueued", "PurgeQueued"]);
    expect(wake).toHaveBeenCalledTimes(2);
    expect((await detail(p.id)).job.counts.total).toBe(1);
  });
  it("makes no destructive job for zero, discard and expired confirmation", async () => {
    expect(await prepareEmptyTrash(c, token)).toEqual({ kind: "empty" });
    await seed(1);
    const p = await prepare();
    await discardEmptyTrash(c, token, p);
    await expect(confirmEmptyTrash(c, token, p)).rejects.toMatchObject({
      code: "EMPTY_EXPIRED",
    });
    const q = await prepare();
    now = new Date(now.getTime() + 15 * 60000);
    await expect(confirmEmptyTrash(c, token, q)).rejects.toMatchObject({
      code: "EMPTY_EXPIRED",
    });
    expect((await listEmptyTrash(c, token)).items).toHaveLength(0);
    expect(
      (
        await base.db.all<{ n: number }>(
          sql`select count(*) n from note_purges`,
        )
      )[0]?.n,
    ).toBe(0);
    expect((await base.db.select().from(notes))[0]?.lifecycle).toBe("trashed");
  });
  it("fixes exact generations before new same-time trash and restore/retrash", async () => {
    const [old] = await seed(1);
    if (!old) throw Error("seed");
    const p = await prepare();
    await expect(confirmEmptyTrash(c, other, p)).rejects.toMatchObject({
      code: "EMPTY_NOT_FOUND",
    });
    await restoreNote(c, token, {
      id: old.id,
      operationId: old.trashOperationId,
    });
    const restored = await c.unitOfWorkProvider.run((x) =>
      x.notes.findById(old.id),
    );
    if (!restored) throw Error("note");
    await trashNote(c, token, {
      id: old.id,
      version: restored.version,
      cancelProcessing: true,
    });
    await seed(1);
    const [a, b] = await Promise.all([
      confirmEmptyTrash(c, token, p),
      confirmEmptyTrash(c, token, p),
    ]);
    expect(a.id).toBe(b.id);
    await sweepEmptyTrash(c);
    const d = await detail(p.id);
    expect(d.job.counts).toMatchObject({
      total: 1,
      cancelled: 1,
      succeeded: 0,
    });
    expect(
      (await base.db.select().from(notes)).every(
        (n) => n.lifecycle === "trashed",
      ),
    ).toBe(true);
  });
  it("keeps accepted work beyond the preparation TTL and uses original confirmation time", async () => {
    await seed(1);
    const p = await prepare();
    now = new Date(now.getTime() + 60000);
    await confirmEmptyTrash(c, token, p);
    const created = (await detail(p.id)).job.createdAt;
    expect(created).toBe(now.toISOString());
    now = new Date(now.getTime() + 16 * 60000);
    await sweepEmptyTrash(c);
    await confirmEmptyTrash(c, token, p);
    expect((await detail(p.id)).job.createdAt).toBe(created);
    expect((await detail(p.id)).job.counts.total).toBe(1);
    await sweepNotePurges(c);
    expect((await detail(p.id)).job.counts.succeeded).toBe(1);
  });
  it("pages one hundred and one same-time parents without hiding old unfinished work", async () => {
    await seed(1);
    const first = await prepare();
    await confirmEmptyTrash(c, token, first);
    for (let i = 0; i < 101; i++) {
      const p = await prepare();
      await confirmEmptyTrash(c, token, p);
      await cancelEmptyTrash(c, token, { id: p.id, generation: 0 });
    }
    const unfinished = await listEmptyTrash(c, token);
    expect(unfinished.items.map((p) => p.id)).toEqual([first.id]);
    expect(unfinished.summary.active).toBe(1);
    const seen: string[] = [];
    let cursor: { at: string; id: string } | undefined;
    for (let i = 0; i < 3; i++) {
      const page = await listEmptyTrash(c, token, {
        scope: "completed",
        cursor,
      });
      expect(page.items.length).toBe(i === 2 ? 1 : 50);
      seen.push(...page.items.map((p) => p.id));
      cursor = page.nextCursor ?? undefined;
    }
    expect(new Set(seen).size).toBe(101);
    expect(cursor).toBeUndefined();
    expect(
      (await listEmptyTrash(c, other, { watch: [first.id] })).observed,
    ).toHaveLength(0);
    await expect(getEmptyTrash(c, other, first)).rejects.toMatchObject({
      code: "EMPTY_NOT_FOUND",
    });
  });
  it.each([
    1, 50, 51, 501,
  ])("fixes and cursor-reads all %i metadata targets without a 500 cap", async (n) => {
    await seed(n);
    const p = await prepare();
    expect(p.total).toBe(n);
    const receipt = await confirmEmptyTrash(c, token, p);
    expect(receipt.asynchronous).toBe(n > 50);
    const seen: number[] = [];
    let after = 0;
    do {
      const d = await getEmptyTrash(c, token, { id: p.id, after });
      if (d.kind !== "job") throw Error("job");
      expect(d.items.length).toBeLessThanOrEqual(50);
      seen.push(...d.items.map((t) => t.ordinal));
      if (d.nextCursor === null) break;
      after = d.nextCursor;
    } while (after < n);
    expect(new Set(seen).size).toBe(n);
    expect((await detail(p.id)).job.state).toBe("queued");
  });
  it("makes cancellation atomic with admission and ignores stale generation", async () => {
    await seed(2);
    const p = await prepare();
    await confirmEmptyTrash(c, token, p);
    const pending = await c.unitOfWorkProvider.run((x) =>
      x.emptyTrash.pending(20),
    );
    const first = pending[0];
    const second = pending[1];
    if (!first || !second) throw Error("targets");
    await c.unitOfWorkProvider.run((x) => admitEmptyTarget(c, x, first));
    await cancelEmptyTrash(c, token, { id: p.id, generation: 0 });
    expect(
      await c.unitOfWorkProvider.run((x) => admitEmptyTarget(c, x, second)),
    ).toBe(false);
    const waiting = await detail(p.id);
    expect(waiting.job.counts).toMatchObject({ active: 1, cancelled: 1 });
    expect(waiting.job.state).toBe("running");
    await sweepNotePurges(c);
    await sweepEmptyTrash(c);
    const done = await detail(p.id);
    expect(done.job).toMatchObject({
      state: "cancelled",
      counts: { succeeded: 1, cancelled: 1, total: 2 },
    });
    expect(await base.db.select().from(notes)).toHaveLength(1);
  });
  it("shares one intent across parents and freezes only the explicitly retried old child", async () => {
    const rows = await seed(2);
    const p = await prepare();
    const q = await prepare();
    await confirmEmptyTrash(c, token, p);
    await confirmEmptyTrash(c, token, q);
    await sweepEmptyTrash(c);
    expect(
      (
        await base.db.all<{ n: number }>(
          sql`select count(*) n from note_purges`,
        )
      )[0]?.n,
    ).toBe(2);
    expect((await listNotePurges(c, token)).summary.active).toBe(0);
    expect((await listEmptyTrash(c, token)).summary.active).toBe(2);
    const failed = await c.unitOfWorkProvider.run(async (x) => {
      const claim = await x.purges.claim(
        now,
        "test-fault",
        new Date(now.getTime() + 60000),
      );
      if (!claim) throw Error("claim");
      await x.purges.defer(
        claim.id,
        "test-fault",
        now,
        "storage fixture failure",
      );
      return claim;
    });
    const pd = await detail(p.id);
    const failure = pd.items.find((t) => t.latest?.purgeId === failed.id);
    if (!failure?.latest) throw Error("failed child");
    const oldId = failure.latest.id;
    const before = await base.db.all<{ n: number }>(
      sql`select count(*) n from empty_trash_attempts`,
    );
    const result = await retryEmptyTrash(c, token, {
      id: p.id,
      generation: 0,
      ordinal: failure.ordinal,
    });
    expect(result.retried).toBe(1);
    expect(
      (
        await retryEmptyTrash(c, token, {
          id: p.id,
          generation: 0,
          ordinal: failure.ordinal,
        })
      ).retried,
    ).toBe(0);
    expect(
      (
        await base.db.all<{ n: number }>(
          sql`select count(*) n from empty_trash_attempts`,
        )
      )[0]?.n,
    ).toBe((before[0]?.n ?? 0) + 1);
    await sweepNotePurges(c);
    await sweepNotePurges(c);
    await sweepEmptyTrash(c);
    expect((await detail(p.id)).job.counts.succeeded).toBe(2);
    expect((await detail(q.id)).job.counts.succeeded).toBe(2);
    const history = await listEmptyAttempts(c, token, {
      id: p.id,
      ordinal: failure.ordinal,
    });
    expect(history.items.find((x) => x.id === oldId)).toMatchObject({
      state: "failed",
      failure: "storage fixture failure",
    });
    expect(rows).toHaveLength(2);
  });
  it("keeps repeated automatic recovery in one latest child and accepts existing single intent", async () => {
    const [row] = await seed(1);
    if (!row) throw Error("seed");
    const p = await prepare();
    const single = await requestNotePurge(c, token, {
      id: row.id,
      operationId: row.trashOperationId,
    });
    await confirmEmptyTrash(c, token, p);
    await sweepEmptyTrash(c);
    for (let i = 0; i < 30; i++) {
      await c.unitOfWorkProvider.run(async (x) => {
        const claim = await x.purges.claim(
          now,
          `fail-${i}`,
          new Date(now.getTime() + 60000),
        );
        if (!claim) throw Error("claim");
        expect(claim.id).toBe(single.id);
        await x.purges.defer(claim.id, `fail-${i}`, now, "storage unavailable");
      });
      now = new Date(now.getTime() + 30001);
      await sweepEmptyTrash(c);
    }
    expect(
      (
        await base.db.all<{ n: number }>(
          sql`select count(*) n from empty_trash_attempts`,
        )
      )[0]?.n,
    ).toBe(1);
    expect((await detail(p.id)).items[0]?.latest?.recoveries).toBe(29);
    await sweepNotePurges(c);
    await sweepEmptyTrash(c);
    expect((await detail(p.id)).job.state).toBe("succeeded");
  });
  it("keeps old parent minimal relationship for a new retry while pruning old ended detail", async () => {
    await seed(2);
    const p = await prepare();
    await confirmEmptyTrash(c, token, p);
    await sweepEmptyTrash(c);
    await sweepNotePurges(c);
    await c.unitOfWorkProvider.run(async (x) => {
      const claim = await x.purges.claim(
        now,
        "long-fault",
        new Date(now.getTime() + 60000),
      );
      if (!claim) throw Error("claim");
      await x.purges.defer(claim.id, "long-fault", now, "storage unavailable");
    });
    await sweepEmptyTrash(c);
    now = new Date(now.getTime() + 91 * 86400_000);
    const signed = await signIn(c, {
      email: "empty-a@example.test",
      password: "test-password-1234",
    });
    token = signed.token;
    const d = await detail(p.id);
    const target = d.items.find((t) => t.latest?.state === "failed");
    if (!target) throw Error("failure");
    await retryEmptyTrash(c, token, {
      id: p.id,
      generation: d.job.generation,
      ordinal: target.ordinal,
    });
    await sweepEmptyTrash(c);
    const after = await detail(p.id);
    expect(after.items.every((item) => item.title === "")).toBe(true);
    expect(
      (
        await base.db.all<{ n: number }>(
          sql`select count(*) n from empty_trash_targets where parent_id=${p.id} and title!=''`,
        )
      )[0]?.n,
    ).toBe(0);
    expect(after.job.historical).toBe(true);
    expect(after.job.counts).toMatchObject({
      total: 2,
      succeeded: 1,
      active: 1,
      expired: 1,
    });
    expect(after.items).toHaveLength(1);
    expect(
      (await listEmptyAttempts(c, token, { id: p.id, ordinal: target.ordinal }))
        .items,
    ).toHaveLength(1);
    await sweepNotePurges(c);
    await sweepEmptyTrash(c);
    expect((await detail(p.id)).job.counts.succeeded).toBe(2);
  });
  it("does not starve later targets after admission failure and rechecks the retry generation policy", async () => {
    await seed(21);
    const p = await prepare();
    await confirmEmptyTrash(c, token, p);
    const first = await c.unitOfWorkProvider.run((x) =>
      x.emptyTrash.target(p.id, 1),
    );
    if (!first?.noteId || !first.operationId) throw Error("first");
    const original = LibsqlNoteRepository.prototype.findById;
    const fault = vi
      .spyOn(LibsqlNoteRepository.prototype, "findById")
      .mockImplementation(function (this: LibsqlNoteRepository, id) {
        if (id === first.noteId) throw Error("test admission unavailable");
        return original.call(this, id);
      });
    try {
      await sweepEmptyTrash(c);
    } finally {
      fault.mockRestore();
    }
    expect((await detail(p.id)).job.counts).toMatchObject({
      total: 21,
      failed: 1,
      active: 19,
      waiting: 1,
    });
    await sweepEmptyTrash(c);
    expect((await detail(p.id)).job.counts.waiting).toBe(0);
    await expect(
      retryEmptyTrash(c, other, { id: p.id, generation: 0, ordinal: 1 }),
    ).rejects.toMatchObject({ code: "EMPTY_NOT_FOUND" });
    await restoreNote(c, token, {
      id: first.noteId,
      operationId: first.operationId,
    });
    await retryEmptyTrash(c, token, { id: p.id, generation: 0, ordinal: 1 });
    await sweepEmptyTrash(c);
    const d = await detail(p.id);
    expect(d.items[0]?.state).toBe("cancelled");
    expect(d.items[0]?.latest?.failure).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.purges.forNote(first.noteId as string),
      ),
    ).toBeNull();
  });
  it("hides ended detail at ninety days before prune and preserves page order through cancellation", async () => {
    await seed(51);
    const p = await prepare();
    await confirmEmptyTrash(c, token, p);
    const page = await detail(p.id);
    expect(page.nextCursor).toBe(50);
    await cancelEmptyTrash(c, token, { id: p.id, generation: 0 });
    const end = await getEmptyTrash(c, token, { id: p.id, after: 50 });
    if (end.kind !== "job") throw Error("job");
    expect(end.items.map((x) => x.ordinal)).toEqual([51]);
    expect(end.items[0]?.state).toBe("cancelled");
    now = new Date(now.getTime() + 91 * 86400_000);
    token = (
      await signIn(c, {
        email: "empty-a@example.test",
        password: "test-password-1234",
      })
    ).token;
    expect(
      (await listEmptyTrash(c, token, { scope: "completed", watch: [p.id] }))
        .observed,
    ).toHaveLength(0);
    await expect(getEmptyTrash(c, token, p)).rejects.toMatchObject({
      code: "EMPTY_NOT_FOUND",
    });
    await sweepEmptyTrash(c);
    expect(
      (
        await base.db.all<{ n: number }>(
          sql`select count(*) n from empty_trash_targets where parent_id=${p.id}`,
        )
      )[0]?.n,
    ).toBe(51);
    await sweepEmptyTrash(c);
    expect(
      await c.unitOfWorkProvider.run((x) => x.emptyTrash.find(p.id)),
    ).toBeNull();
  });
  it.each([
    501, 5001,
  ])("measures bounded snapshot metadata for %i without collecting targets in the usecase", async (n) => {
    await seed(n);
    const times: number[] = [];
    const heaps: number[] = [];
    const bytes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const before = process.memoryUsage().heapUsed;
      const at = performance.now();
      const p = await prepare();
      const elapsed = performance.now() - at;
      if (i) {
        times.push(elapsed);
        heaps.push(process.memoryUsage().heapUsed - before);
        bytes.push(Buffer.byteLength(JSON.stringify(p)));
      }
      expect(p.total).toBe(n);
      await discardEmptyTrash(c, token, p);
    }
    times.sort((a, b) => a - b);
    const p = await prepare();
    await confirmEmptyTrash(c, token, p);
    const at = performance.now();
    await sweepEmptyTrash(c);
    const admissionMs = performance.now() - at;
    const first = await detail(p.id);
    expect(first.job.counts.active).toBe(20);
    expect(first.items).toHaveLength(50);
    process.stdout.write(
      `EMPTY_METADATA_MEASUREMENT ${JSON.stringify({ n, warmup: 1, count: times.length, p50: times[2], p95: times[4], max: times[4], heapDeltaMax: Math.max(...heaps), responseBytes: Math.max(...bytes), admission20Ms: admissionMs, detail50Bytes: Buffer.byteLength(JSON.stringify(first)), heapGuarantee: false })}\n`,
    );
  });
});
