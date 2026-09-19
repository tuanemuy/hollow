import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { aggregateMoveAmounts } from "@repo/core/application/batch/holding";
import {
  acceptBatch,
  batchConfirmation,
  cancelBatch,
  getBatch,
  previewBatch,
  retryBatch,
  watchBatches,
} from "@repo/core/application/batch/usecases";
import {
  claimBatchAttempt,
  processBatchAttempt,
} from "@repo/core/application/batch/worker";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  moveNote,
  previewNoteMove,
} from "@repo/core/application/move/usecases";
import { trashNote } from "@repo/core/application/note/trash";
import { changeNoteTags } from "@repo/core/application/tag/usecases";
import { processOutboxEvents } from "@repo/core/application/workers/eventRelayWorker";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import type { BatchOperation } from "@repo/core/domain/batch/entity";
import { createNote, type NoteOwner } from "@repo/core/domain/note/entity";
import { tagScopeKey } from "@repo/core/domain/tag/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBatchRunner } from "../../node/batchRunner";
import { NodeTagNormalizer } from "../../node/browse/tagNormalizer";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { createTestContainer, type TestContainer } from "./helpers";

describe("durable fixed batch commands", () => {
  let b: TestContainer;
  let c: HollowContainer;
  let actor: string;
  let ws: string;
  let now: Date;
  const token = "batch-isolated-session";
  const source = (): NoteOwner => ({ kind: "personal", accountId: actor });
  const dest = (): NoteOwner => ({ kind: "workspace", workspaceId: ws });
  const op: BatchOperation = {
    kind: "tag",
    change: { kind: "create", name: "Batch tag" },
  };
  beforeEach(async () => {
    b = await createTestContainer();
    actor = randomUUID();
    ws = randomUUID();
    now = new Date("2026-09-11T06:00:00Z");
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [actor, `${actor}@example.test`, "unused", +now, +now],
    });
    await b.client.execute({
      sql: "insert into sessions values(?,?,?)",
      args: [token, actor, +now + 86400000],
    });
    await b.client.execute({
      sql: "insert into workspaces(id,creator_id,name,description,created_at,state) values(?,?,?,'',?,'active')",
      args: [ws, actor, "Batch destination", +now],
    });
    await b.client.execute({
      sql: "insert into workspace_members(workspace_id,account_id,role) values(?,?,'owner')",
      args: [ws, actor],
    });
    c = {
      ...createHollowContainer(b.db, "http://localhost", { async send() {} }),
      clock: { now: () => now },
      tokens: { generate: randomUUID, hash: (s) => s },
      tagging: {
        normalizer: NodeTagNormalizer,
        read: {
          async read() {
            throw Error("unused");
          },
        },
      },
    };
  });
  afterEach(() => b.close());
  async function notes(count: number, owner?: NoteOwner) {
    const rows = Array.from({ length: count }, (_, i) => ({
      ...createNote(
        {
          id: randomUUID(),
          accountId: actor,
          title: `Batch ${i}`,
          html: "<p>body</p>",
          text: "body",
        },
        now,
      ),
      ...(owner ? { owner } : {}),
    }));
    await c.unitOfWorkProvider.run(async (x) => {
      for (const n of rows) await x.notes.insert(n);
    });
    return rows;
  }
  async function prepare(ids: readonly string[], operation = op) {
    const items = [];
    for (let i = 0; i < ids.length; i += 50)
      items.push(
        ...(
          await previewBatch(c, token, {
            ids: ids.slice(i, i + 50),
            source: source(),
            operation,
          })
        ).items.map(batchConfirmation),
      );
    return { requestId: randomUUID(), source: source(), operation, items };
  }
  async function step() {
    const a = await claimBatchAttempt(c, 60000);
    if (a) await processBatchAttempt(c, a);
    return a;
  }
  async function bundleFor(ids: readonly string[], bytes = 10) {
    const id = randomUUID();
    await b.client.execute({
      sql: "insert into source_bundles(id,account_id,enabled,sealed,created_at) values(?,?,1,1,?)",
      args: [id, actor, +now],
    });
    await b.client.execute({
      sql: "insert into companion_sources(id,bundle_id,account_id,path,storage_key,bytes,sha256) values(?,?,?,'x','unwritten-self-key',?,'unused')",
      args: [randomUUID(), id, actor, bytes],
    });
    for (const noteId of ids)
      await b.client.execute({
        sql: "insert into reference_settings(note_id,enabled,bundle_id) values(?,0,?)",
        args: [noteId, id],
      });
    return id;
  }
  it("accepts 500 unique notes, fixes order/binding once and converges duplicate acceptance", async () => {
    const rows = await notes(500);
    const input = await prepare(rows.map((n) => n.id));
    const bytes = Buffer.byteLength(JSON.stringify(input));
    const start = performance.now();
    const p = await acceptBatch(c, token, input);
    const acceptedMs = performance.now() - start;
    expect(p.total).toBe(500);
    expect(await acceptBatch(c, token, input)).toEqual(p);
    expect(
      (await b.client.execute("select count(*) n from tags")).rows[0]?.n,
    ).toBe(0);
    const first = await step();
    expect(first?.noteId).toBe(rows[0]?.id);
    const h = await c.unitOfWorkProvider.run((x) => x.batches.find(p.id));
    expect(h?.binding).toBeTruthy();
    const second = await step();
    expect(second?.noteId).toBe(rows[1]?.id);
    expect(
      (await b.client.execute("select count(*) n from tags")).rows[0]?.n,
    ).toBe(1);
    process.stdout.write(
      `${JSON.stringify({ batchMeasurement: { count: 500, bytes, acceptedMs } })}\n`,
    );
  }, 60000);
  it("moves through the same command without changing body time or versions", async () => {
    const [n] = await notes(1);
    if (!n) throw Error("fixture");
    const p = await acceptBatch(
      c,
      token,
      await prepare([n.id], { kind: "move", destination: dest() }),
    );
    await step();
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "succeeded",
    );
    const moved = await c.unitOfWorkProvider.run((x) => x.notes.findById(n.id));
    expect(moved?.owner).toEqual(dest());
    expect(moved?.html).toBe(n.html);
    expect(moved?.updatedAt).toEqual(n.updatedAt);
    expect(
      (
        await b.client.execute(
          "select count(*) n from note_batch_move_receipts",
        )
      ).rows[0]?.n,
    ).toBe(0);
  });
  it("does not recreate the resolved tag after external delete", async () => {
    const rows = await notes(2);
    const p = await acceptBatch(c, token, await prepare(rows.map((n) => n.id)));
    await step();
    const h = await c.unitOfWorkProvider.run((x) => x.batches.find(p.id));
    if (!h?.binding) throw Error("fixture");
    await c.unitOfWorkProvider.run((x) => x.tags.delete(h.binding as string));
    await step();
    const result = await getBatch(c, token, { id: p.id });
    expect(result.parent.counts).toMatchObject({ succeeded: 1, failed: 1 });
    expect(result.items[1]?.failure?.code).toBe("TAG_NOT_FOUND");
    expect(
      (await b.client.execute("select count(*) n from tags")).rows[0]?.n,
    ).toBe(0);
  });
  it("keeps tag creation rolled back on the 51st and retries only the failed child", async () => {
    const [n] = await notes(1);
    if (!n) throw Error("fixture");
    for (let i = 0; i < 50; i++)
      await changeNoteTags(c, token, {
        noteId: n.id,
        expectedScope: {},
        change: { kind: "create", name: `Existing ${i}` },
      });
    const p = await acceptBatch(c, token, await prepare([n.id]));
    await step();
    const s = await getBatch(c, token, { id: p.id });
    expect(s.parent.state).toBe("failed");
    expect(s.binding).toBe(null);
    expect(
      (await b.client.execute("select count(*) n from tags")).rows[0]?.n,
    ).toBe(50);
    const tag = (
      await c.unitOfWorkProvider.run((x) => x.tags.selected(n.id))
    )[0];
    if (!tag) throw Error("fixture");
    await changeNoteTags(c, token, {
      noteId: n.id,
      expectedScope: {},
      change: { kind: "detach", tagId: tag.id },
    });
    const preview = await previewBatch(c, token, {
      parentId: p.id,
      ids: [n.id],
      source: source(),
      operation: op,
    });
    const retry = {
      id: p.id,
      generation: 1,
      items: preview.items.map(batchConfirmation),
    };
    await retryBatch(c, token, retry);
    await retryBatch(c, token, retry);
    await step();
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "succeeded",
    );
    expect(
      (await b.client.execute("select count(*) n from note_batch_attempts"))
        .rows[0]?.n,
    ).toBe(2);
  });
  it("waiting cancel keeps a claimed result and cannot cancel a different generation", async () => {
    const rows = await notes(2);
    const p = await acceptBatch(c, token, await prepare(rows.map((n) => n.id)));
    const claimed = await claimBatchAttempt(c, 60000);
    if (!claimed) throw Error("fixture");
    await cancelBatch(c, token, { id: p.id, generation: 1 });
    await processBatchAttempt(c, claimed);
    expect(
      (await getBatch(c, token, { id: p.id })).parent.counts,
    ).toMatchObject({ succeeded: 1, cancelled: 1 });
    expect(await step()).toBe(null);
  });
  it("derives only the shared holding from successful same-parent receipts and charges once", async () => {
    const rows = await notes(2);
    await bundleFor(rows.map((n) => n.id));
    const input = await prepare(
      rows.map((n) => n.id),
      { kind: "move", destination: dest() },
    );
    const expected = input.items.flatMap((i) =>
      i.kind === "ready" && i.expected.kind === "move" ? [i.expected.move] : [],
    );
    expect(expected.map((e) => e.destinationIncrease)).toEqual([10, 10]);
    expect(aggregateMoveAmounts(expected)).toEqual({
      sourceRelease: 10,
      destinationIncrease: 10,
    });
    const p = await acceptBatch(c, token, input);
    await step();
    await step();
    expect(
      (await getBatch(c, token, { id: p.id })).parent.counts.succeeded,
    ).toBe(2);
    expect(
      (
        await b.client.execute(
          "select count(*) n from note_batch_move_receipts",
        )
      ).rows[0]?.n,
    ).toBe(2);
    expect(
      await c.unitOfWorkProvider.run(async (x) => [
        await x.capacity.usedBytes(source(), now),
        await x.capacity.usedBytes(dest(), now),
      ]),
    ).toEqual([0, 10]);
  });
  it("rejects external equal-count holding ABA without adopting a newer state", async () => {
    const rows = await notes(3);
    await bundleFor(rows.map((n) => n.id));
    const [a, z, other] = rows;
    if (!a || !z || !other) throw Error("fixture");
    const p = await acceptBatch(
      c,
      token,
      await prepare([a.id, z.id], { kind: "move", destination: dest() }),
    );
    await step();
    await moveNote(
      c,
      token,
      (
        await previewNoteMove(c, token, {
          noteId: other.id,
          destination: dest(),
        })
      ).expected,
    );
    await moveNote(
      c,
      token,
      (
        await previewNoteMove(c, token, {
          noteId: other.id,
          destination: source(),
        })
      ).expected,
    );
    await step();
    expect(
      (await getBatch(c, token, { id: p.id })).parent.counts,
    ).toMatchObject({ succeeded: 1, failed: 1 });
    expect(
      (await c.unitOfWorkProvider.run((x) => x.notes.findById(z.id)))?.owner,
    ).toEqual(source());
  });
  it("external trash cancels a claimed attempt but own batch trash succeeds", async () => {
    const [n, other] = await notes(2);
    if (!n || !other) throw Error("fixture");
    const p = await acceptBatch(c, token, await prepare([n.id]));
    const a = await claimBatchAttempt(c, 60000);
    if (!a) throw Error("fixture");
    await trashNote(c, token, {
      id: n.id,
      version: n.version,
      cancelProcessing: false,
    });
    await processBatchAttempt(c, a);
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "cancelled",
    );
    const own = await acceptBatch(
      c,
      token,
      await prepare([other.id], { kind: "trash", cancelProcessing: false }),
    );
    await step();
    expect((await getBatch(c, token, { id: own.id })).parent.state).toBe(
      "succeeded",
    );
  });
  it("measures 500 move admission without a read-deadline substitution", async () => {
    const rows = await notes(500);
    const started = performance.now();
    const input = await prepare(
      rows.map((n) => n.id),
      { kind: "move", destination: dest() },
    );
    const previewMs = performance.now() - started;
    const at = performance.now();
    const p = await acceptBatch(c, token, input);
    const acceptedMs = performance.now() - at;
    const childAt = performance.now();
    await step();
    const childMs = performance.now() - childAt;
    expect(p.total).toBe(500);
    process.stdout.write(
      `${JSON.stringify({ batchMoveMeasurement: { count: 500, bytes: Buffer.byteLength(JSON.stringify(input)), previewMs, acceptedMs, childMs } })}\n`,
    );
  }, 60000);
  it("measures 500 notes with 50 long normalized tag mappings through the installed transport codec", async () => {
    const rows = await notes(500);
    const pairs = await c.unitOfWorkProvider.run(async (x) => {
      const ids: string[] = [];
      for (let i = 0; i < 50; i++) {
        const name = "각".repeat(49) + String.fromCharCode(0x4e00 + i);
        const key = NodeTagNormalizer.key(name);
        const sourceTag = await x.tags.ensure({
          id: randomUUID(),
          scopeKey: tagScopeKey(source()),
          name,
          normalizedKey: key,
          meaningVersion: NodeTagNormalizer.version,
        });
        await x.tags.ensure({
          id: randomUUID(),
          scopeKey: tagScopeKey(dest()),
          name,
          normalizedKey: key,
          meaningVersion: NodeTagNormalizer.version,
        });
        ids.push(sourceTag.id);
      }
      return ids;
    });
    for (const n of rows)
      await b.client.execute({
        sql: `insert into note_tags(note_id,tag_id) values ${pairs.map(() => "(?,?)").join(",")}`,
        args: pairs.flatMap((id) => [n.id, id]),
      });
    const started = performance.now();
    const input = await prepare(
      rows.map((n) => n.id),
      { kind: "move", destination: dest() },
    );
    const previewMs = performance.now() - started;
    const bytes = Buffer.byteLength(JSON.stringify(input));
    const startPackage = realpathSync(
      path.resolve("apps/web/node_modules/@tanstack/react-start/package.json"),
    );
    const clientRequire = createRequire(
      realpathSync(
        path.resolve(
          path.dirname(startPackage),
          "../start-client-core/package.json",
        ),
      ),
    );
    const codec = clientRequire("seroval") as {
      toJSONAsync(value: unknown): Promise<unknown>;
      fromJSON(value: unknown): { data: typeof input };
    };
    const encodeAt = performance.now();
    const wire = JSON.stringify(await codec.toJSONAsync({ data: input }));
    const encodeMs = performance.now() - encodeAt;
    const decodeAt = performance.now();
    const decoded = codec.fromJSON(JSON.parse(wire));
    const decodeMs = performance.now() - decodeAt;
    expect(decoded.data).toEqual(input);
    const beforeHeap = process.memoryUsage().heapUsed;
    const webRequire = createRequire(path.resolve("apps/web/package.json"));
    const hono = webRequire("@hono/node-server") as {
      serve(
        options: {
          hostname: string;
          port: number;
          fetch(request: Request): Promise<Response>;
        },
        ready: () => void,
      ): Server;
    };
    let server: Server | undefined;
    let acceptedMs = 0;
    await new Promise<void>((resolve) => {
      server = hono.serve(
        {
          hostname: "127.0.0.1",
          port: 0,
          async fetch(request) {
            try {
              const received = codec.fromJSON(await request.json());
              const at = performance.now();
              const accepted = await acceptBatch(c, token, received.data);
              acceptedMs = performance.now() - at;
              return Response.json(accepted);
            } catch {
              return new Response("Isolated transport failed", { status: 500 });
            }
          },
        },
        resolve,
      );
    });
    if (!server) throw Error("fixture");
    const ownServer = server;
    const httpAt = performance.now();
    const parent = await (async () => {
      try {
        const address = ownServer.address() as AddressInfo;
        const response = await fetch(`http://127.0.0.1:${address.port}/`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: wire,
        });
        expect(response.status).toBe(200);
        return (await response.json()) as {
          id: string;
          total: number;
          excluded: number;
        };
      } finally {
        await new Promise<void>((resolve, reject) =>
          ownServer.close((error) => (error ? reject(error) : resolve())),
        );
      }
    })();
    const httpMs = performance.now() - httpAt;
    const heapDelta = process.memoryUsage().heapUsed - beforeHeap;
    const childAt = performance.now();
    await step();
    const childMs = performance.now() - childAt;
    expect(parent.total).toBe(500);
    const first = input.items[0];
    expect(
      first?.kind === "ready" &&
        first.expected.kind === "move" &&
        first.expected.move.tags.length,
    ).toBe(50);
    process.stdout.write(
      `${JSON.stringify({ batchLargeMeasurement: { count: 500, mappings: 25000, bytes, wireBytes: Buffer.byteLength(wire), encodeMs, decodeMs, previewMs, acceptedMs, httpMs, childMs, heapDelta } })}\n`,
    );
  }, 60000);
  it("expires a lost claim once, rejects its old token and creates a numbered explicit retry", async () => {
    const [n] = await notes(1);
    if (!n) throw Error("fixture");
    const p = await acceptBatch(c, token, await prepare([n.id]));
    const old = await claimBatchAttempt(c, 60000);
    if (!old) throw Error("fixture");
    now = new Date(+now + 59999);
    expect(await claimBatchAttempt(c, 60000)).toBe(null);
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "running",
    );
    now = new Date(+now + 1);
    const otherInstance = {
      ...c,
      unitOfWorkProvider: new LibsqlHollowUnitOfWorkProvider(b.db),
    };
    expect(await claimBatchAttempt(otherInstance, 60000)).toBe(null);
    await processBatchAttempt(c, old);
    const failed = await getBatch(c, token, { id: p.id });
    expect(failed.items[0]).toMatchObject({
      state: "failed",
      attemptNumber: 1,
      failure: { code: "BATCH_INTERRUPTED" },
    });
    expect(
      (await b.client.execute("select count(*) n from tags")).rows[0]?.n,
    ).toBe(0);
    const preview = await previewBatch(c, token, {
      ids: [n.id],
      source: source(),
      operation: op,
      parentId: p.id,
    });
    await retryBatch(c, token, {
      id: p.id,
      generation: 1,
      items: preview.items.map(batchConfirmation),
    });
    await step();
    expect((await getBatch(c, token, { id: p.id })).items[0]).toMatchObject({
      state: "succeeded",
      attemptNumber: 2,
    });
  });
  it("reads a committed result after acknowledgement loss without replaying or incrementing", async () => {
    const [n] = await notes(1);
    if (!n) throw Error("fixture");
    await bundleFor([n.id]);
    const p = await acceptBatch(
      c,
      token,
      await prepare([n.id], { kind: "move", destination: dest() }),
    );
    const a = await claimBatchAttempt(c, 60000);
    if (!a) throw Error("fixture");
    const base = c.unitOfWorkProvider;
    let lost = false;
    const unknown = {
      ...c,
      unitOfWorkProvider: {
        async run<T>(fn: Parameters<typeof base.run<T>>[0]) {
          const result = await base.run(fn);
          if (!lost) {
            lost = true;
            throw Error("Self acknowledgement loss");
          }
          return result;
        },
      },
    };
    await processBatchAttempt(unknown, a);
    await processBatchAttempt(c, a);
    expect((await getBatch(c, token, { id: p.id })).items[0]).toMatchObject({
      state: "succeeded",
      attemptNumber: 1,
    });
    expect(
      (
        await b.client.execute(
          "select count(*) n from note_batch_move_receipts",
        )
      ).rows[0]?.n,
    ).toBe(1);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.notes.findById(n.id)))?.version,
    ).toBe(n.version + 1);
  });
  it("rejects a missing receipt in the required interval and retries from a fresh base", async () => {
    const rows = await notes(2);
    await bundleFor(rows.map((n) => n.id));
    const operation: BatchOperation = { kind: "move", destination: dest() };
    const p = await acceptBatch(
      c,
      token,
      await prepare(
        rows.map((n) => n.id),
        operation,
      ),
    );
    await step();
    await b.client.execute("delete from note_batch_move_receipts");
    await step();
    const results = await getBatch(c, token, { id: p.id });
    expect(results.parent.counts).toMatchObject({ succeeded: 1, failed: 1 });
    const second = rows[1];
    if (!second) throw Error("fixture");
    const preview = await previewBatch(c, token, {
      ids: [second.id],
      source: source(),
      operation,
      parentId: p.id,
    });
    const item = preview.items[0];
    expect(item?.kind === "ready" && item.baseSequence).toBe(1);
    await retryBatch(c, token, {
      id: p.id,
      generation: 1,
      items: preview.items.map(batchConfirmation),
    });
    await step();
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "succeeded",
    );
  });
  it("keeps excluded targets in retry dedup without retrying a succeeded target", async () => {
    const rows = await notes(2);
    const second = rows[1];
    if (!second) throw Error("fixture");
    const p = await acceptBatch(c, token, await prepare(rows.map((n) => n.id)));
    await step();
    const a = await claimBatchAttempt(c, 60000);
    if (!a) throw Error("fixture");
    now = new Date(+now + 60000);
    await claimBatchAttempt(c, 60000);
    const preview = await previewBatch(c, token, {
      ids: rows.map((n) => n.id),
      source: source(),
      operation: op,
      parentId: p.id,
    });
    expect(preview.items.map((i) => i.kind)).toEqual(["excluded", "ready"]);
    const input = {
      id: p.id,
      generation: 1,
      items: preview.items.map(batchConfirmation),
    };
    const first = await retryBatch(c, token, input);
    expect(await retryBatch(c, token, input)).toEqual(first);
    await step();
    expect(
      (await getBatch(c, token, { id: p.id })).parent.counts.succeeded,
    ).toBe(2);
    expect(
      (await b.client.execute("select count(*) n from note_batch_attempts"))
        .rows[0]?.n,
    ).toBe(3);
  });
  it("does not accept changed eligible membership or an empty set and reveals no excluded title", async () => {
    const rows = await notes(2);
    const second = rows[1];
    if (!second) throw Error("fixture");
    const input = await prepare(rows.map((n) => n.id));
    await trashNote(c, token, {
      id: second.id,
      version: second.version,
      cancelProcessing: false,
    });
    await expect(acceptBatch(c, token, input)).rejects.toMatchObject({
      code: "BATCH_CHANGED",
    });
    const excluded = await prepare([second.id]);
    expect(excluded.items).toEqual([{ kind: "excluded", noteId: second.id }]);
    await expect(acceptBatch(c, token, excluded)).rejects.toMatchObject({
      code: "BATCH_EMPTY",
    });
    expect(
      (await b.client.execute("select count(*) n from note_batches")).rows[0]
        ?.n,
    ).toBe(0);
  });
  it("preserves edit on owner demotion but cancels irreversibly on edit loss and later rejoin", async () => {
    const admin = randomUUID();
    const adminToken = "isolated-batch-admin";
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [admin, `${admin}@example.test`, "unused", +now, +now],
    });
    await b.client.execute({
      sql: "insert into sessions values(?,?,?)",
      args: [adminToken, admin, +now + 86400000],
    });
    await c.unitOfWorkProvider.run((x) =>
      x.workspaces.membership(ws, admin, "owner"),
    );
    const [n] = await notes(1, dest());
    if (!n) throw Error("fixture");
    const preview = await previewBatch(c, token, {
      ids: [n.id],
      source: dest(),
      operation: op,
    });
    const p = await acceptBatch(c, token, {
      requestId: randomUUID(),
      source: dest(),
      operation: op,
      items: preview.items.map(batchConfirmation),
    });
    const change = (
      old: "owner" | "editor" | "viewer",
      role: "editor" | "viewer",
    ) =>
      changeWorkspaceMember(c, adminToken, {
        workspaceId: ws,
        accountId: actor,
        expectedRole: old,
        role,
        ownerConfirmed: false,
      });
    await change("owner", "editor");
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "queued",
    );
    const claimed = await claimBatchAttempt(c, 60000);
    if (!claimed) throw Error("fixture");
    await change("editor", "viewer");
    await change("viewer", "editor");
    await processBatchAttempt(c, claimed);
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "cancelled",
    );
    expect(await watchBatches(c, adminToken, [p.id])).toEqual([]);
    await expect(getBatch(c, adminToken, { id: p.id })).rejects.toMatchObject({
      code: "BATCH_NOT_FOUND",
    });
    const nextPreview = await previewBatch(c, token, {
      ids: [n.id],
      source: dest(),
      operation: op,
    });
    const next = await acceptBatch(c, token, {
      requestId: randomUUID(),
      source: dest(),
      operation: op,
      items: nextPreview.items.map(batchConfirmation),
    });
    await step();
    expect((await getBatch(c, token, { id: next.id })).parent.state).toBe(
      "succeeded",
    );
  });
  it("handles GiB resource values, accepts exact current quota and rejects only the later overage", async () => {
    const [n, later] = await notes(2);
    const [held] = await notes(1, dest());
    if (!n || !held || !later) throw Error("fixture");
    const original = (noteId: string, bytes: number) =>
      b.client.execute({
        sql: "insert into originals(id,note_id,account_id,name,bytes,storage_key,sha256,format,state,coverage,active_job_id,created_at) values(?,?,?,'source.txt',?,?,'unused','text','ready','complete','finished',?)",
        args: [randomUUID(), noteId, actor, bytes, randomUUID(), +now],
      });
    await original(n.id, 5 * 1024 ** 3);
    await original(held.id, 15 * 1024 ** 3);
    const operation: BatchOperation = { kind: "move", destination: dest() };
    const input = await prepare([n.id], operation);
    const item = input.items[0];
    expect(
      item?.kind === "ready" &&
        item.expected.kind === "move" &&
        item.expected.move.resources.originals.bytes,
    ).toBe(5 * 1024 ** 3);
    const p = await acceptBatch(c, token, input);
    await step();
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "succeeded",
    );
    expect(
      await c.unitOfWorkProvider.run((x) => x.capacity.usedBytes(dest(), now)),
    ).toBe(20 * 1024 ** 3);
    await original(later.id, 1);
    const next = await acceptBatch(
      c,
      token,
      await prepare([later.id], operation),
    );
    await step();
    expect(
      (await getBatch(c, token, { id: next.id })).items[0]?.failure?.code,
    ).toBe("MOVE_QUOTA");
    expect(
      (await c.unitOfWorkProvider.run((x) => x.notes.findById(later.id)))
        ?.owner,
    ).toEqual(source());
  });
  it("allows unrelated current capacity changes without accepting changed note resources", async () => {
    const [n] = await notes(1);
    const [other] = await notes(1, dest());
    if (!n || !other) throw Error("fixture");
    const input = await prepare([n.id], { kind: "move", destination: dest() });
    await b.client.execute({
      sql: "insert into originals(id,note_id,account_id,name,bytes,storage_key,sha256,format,state,coverage,active_job_id,created_at) values(?,?,?,'other.txt',83,?,'unused','text','ready','complete','finished',?)",
      args: [randomUUID(), other.id, actor, randomUUID(), +now],
    });
    const p = await acceptBatch(c, token, input);
    await step();
    expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
      "succeeded",
    );
  });
  it("decodes durable wake once and resumes queued children across ordinary runner stop", async () => {
    const rows = await notes(30);
    const input = await prepare(rows.map((n) => n.id));
    const p = await acceptBatch(c, token, input);
    await acceptBatch(c, token, input);
    const types: string[] = [];
    const dispatch = () =>
      processOutboxEvents({ ...b, clock: c.clock }, async (events) =>
        events.map((e) => {
          types.push(e.type);
          expect(e.payload).toEqual({ parentId: p.id });
          return { kind: "success" as const, id: e.id };
        }),
      );
    expect((await dispatch()).processed).toBe(1);
    expect((await dispatch()).processed).toBe(0);
    expect(types).toEqual(["NoteBatchQueued"]);
    const runner = createBatchRunner(c, 2000);
    try {
      await vi.waitFor(
        async () =>
          expect(
            (await getBatch(c, token, { id: p.id })).parent.counts.succeeded,
          ).toBe(20),
        { timeout: 1500, interval: 10 },
      );
    } finally {
      await runner.stop();
    }
    expect(
      (await getBatch(c, token, { id: p.id })).parent.counts,
    ).toMatchObject({ succeeded: 20, queued: 10, running: 0 });
    const restarted = createBatchRunner(
      { ...c, unitOfWorkProvider: new LibsqlHollowUnitOfWorkProvider(b.db) },
      10,
    );
    try {
      await vi.waitFor(
        async () =>
          expect((await getBatch(c, token, { id: p.id })).parent.state).toBe(
            "succeeded",
          ),
        { timeout: 1500, interval: 10 },
      );
    } finally {
      await restarted.stop();
    }
    expect(
      (await b.client.execute("select count(*) n from note_batch_attempts"))
        .rows[0]?.n,
    ).toBe(30);
  }, 10000);
  it("keeps a failed first child separate from a later shared-bundle success", async () => {
    const [a, z] = await notes(2);
    if (!a || !z) throw Error("fixture");
    await bundleFor([a.id, z.id]);
    const p = await acceptBatch(
      c,
      token,
      await prepare([a.id, z.id], { kind: "move", destination: dest() }),
    );
    await b.client.execute({
      sql: "insert into originals(id,note_id,account_id,name,bytes,storage_key,sha256,format,state,coverage,active_job_id,created_at) values(?,?,?,'changed.txt',1,?,'unused','text','ready','complete','finished',?)",
      args: [randomUUID(), a.id, actor, randomUUID(), +now],
    });
    await step();
    await step();
    expect(
      (await getBatch(c, token, { id: p.id })).items.map((a) => a.state),
    ).toEqual(["failed", "succeeded"]);
    const h = await c.unitOfWorkProvider.run((x) => x.batches.find(p.id));
    expect(h?.lastSequence).toBe(1);
    expect(
      await c.unitOfWorkProvider.run(async (x) => [
        await x.capacity.usedBytes(source(), now),
        await x.capacity.usedBytes(dest(), now),
      ]),
    ).toEqual([11, 10]);
  });
  it("writes a receipt for zero-byte bundles, but never adopts another parent's move", async () => {
    const [a, z] = await notes(2);
    if (!a || !z) throw Error("fixture");
    await bundleFor([a.id, z.id], 0);
    const operation: BatchOperation = { kind: "move", destination: dest() };
    const first = await acceptBatch(c, token, await prepare([a.id], operation));
    now = new Date(+now + 1);
    const second = await acceptBatch(
      c,
      token,
      await prepare([z.id], operation),
    );
    await step();
    await step();
    expect((await getBatch(c, token, { id: first.id })).parent.state).toBe(
      "succeeded",
    );
    expect((await getBatch(c, token, { id: second.id })).parent.state).toBe(
      "failed",
    );
    expect(
      (
        await b.client.execute(
          "select count(*) n from note_batch_move_receipts",
        )
      ).rows[0]?.n,
    ).toBe(1);
  });
  it("does not cancel an unconfirmed replacement job with the same running flag and note version", async () => {
    const [n, sibling] = await notes(2);
    if (!n || !sibling) throw Error("fixture");
    const oldId = randomUUID();
    const newId = randomUUID();
    const job = async (id: string) =>
      b.client.execute({
        sql: "insert into reference_jobs(id,note_id,account_id,note_version,created_at,updated_at,attempt,total,completed,cancel_requested,state) values(?,?,?,1,?,?,0,1,0,0,'queued')",
        args: [id, n.id, actor, +now, +now],
      });
    await job(oldId);
    const p = await acceptBatch(
      c,
      token,
      await prepare([n.id, sibling.id], {
        kind: "trash",
        cancelProcessing: true,
      }),
    );
    await b.client.execute({
      sql: "update reference_jobs set state='cancelled',cancel_requested=1 where id=?",
      args: [oldId],
    });
    await job(newId);
    await step();
    await step();
    expect(
      (await getBatch(c, token, { id: p.id })).items.map((a) => a.state),
    ).toEqual(["failed", "succeeded"]);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.notes.findById(n.id)))?.lifecycle
        .kind,
    ).toBe("active");
    expect(
      (await c.unitOfWorkProvider.run((x) => x.references.job(newId)))?.state,
    ).toBe("queued");
  });
  it("keeps cancellation consent through normal job progress and rejects changed processing at admission", async () => {
    const [n, other] = await notes(2);
    if (!n || !other) throw Error("fixture");
    const id = randomUUID();
    await b.client.execute({
      sql: "insert into reference_jobs(id,note_id,account_id,note_version,created_at,updated_at,attempt,total,completed,cancel_requested,state) values(?,?,?,1,?,?,0,2,0,0,'queued')",
      args: [id, n.id, actor, +now, +now],
    });
    const noConsent = await acceptBatch(
      c,
      token,
      await prepare([n.id, other.id], {
        kind: "trash",
        cancelProcessing: false,
      }),
    );
    await step();
    await step();
    expect(
      (await getBatch(c, token, { id: noConsent.id })).items.map(
        (a) => a.state,
      ),
    ).toEqual(["failed", "succeeded"]);
    const input = await prepare([n.id], {
      kind: "trash",
      cancelProcessing: true,
    });
    await b.client.execute({
      sql: "update reference_jobs set state='running',lease_token='self-lease',lease_until=?,attempt=1,completed=1 where id=?",
      args: [+now + 60000, id],
    });
    const yes = await acceptBatch(c, token, input);
    await step();
    expect((await getBatch(c, token, { id: yes.id })).parent.state).toBe(
      "succeeded",
    );
    expect(
      (await c.unitOfWorkProvider.run((x) => x.references.job(id)))?.state,
    ).toBe("cancelled");
    const [fresh] = await notes(1);
    if (!fresh) throw Error("fixture");
    const stale = await prepare([fresh.id], {
      kind: "trash",
      cancelProcessing: true,
    });
    await b.client.execute({
      sql: "insert into reference_jobs(id,note_id,account_id,note_version,created_at,updated_at,attempt,total,completed,cancel_requested,state) values(?,?,?,1,?,?,0,1,0,0,'queued')",
      args: [randomUUID(), fresh.id, actor, +now, +now],
    });
    const count = (
      await b.client.execute("select count(*) n from note_batches")
    ).rows[0]?.n;
    await expect(acceptBatch(c, token, stale)).rejects.toMatchObject({
      code: "BATCH_CHANGED",
    });
    expect(
      (await b.client.execute("select count(*) n from note_batches")).rows[0]
        ?.n,
    ).toBe(count);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.notes.findById(fresh.id)))
        ?.lifecycle.kind,
    ).toBe("active");
  });
  it("retains dependent receipts past history expiry, prunes only terminal prefixes, and rejects expired failed retry", async () => {
    const [a, z] = await notes(2);
    if (!a || !z) throw Error("fixture");
    await bundleFor([a.id, z.id]);
    const operation: BatchOperation = { kind: "move", destination: dest() };
    const p = await acceptBatch(
      c,
      token,
      await prepare([a.id, z.id], operation),
    );
    await step();
    const started = +now;
    now = new Date(started + 91 * 86400000);
    await b.client.execute({
      sql: "update sessions set expires_at=? where token_hash=?",
      args: [+now + 86400000, token],
    });
    const cutoff = new Date(+now - 90 * 86400000);
    await c.unitOfWorkProvider.run((x) => x.batches.prune(cutoff, 20));
    expect(
      (
        await b.client.execute(
          "select count(*) n from note_batch_move_receipts",
        )
      ).rows[0]?.n,
    ).toBe(1);
    const pending = await getBatch(c, token, { id: p.id });
    expect(pending.items.map((a) => a.title)).toEqual(["", ""]);
    expect(pending.parent.counts.queued).toBe(1);
    await step();
    expect(
      (await getBatch(c, token, { id: p.id })).parent.counts.succeeded,
    ).toBe(2);
    await c.unitOfWorkProvider.run((x) => x.batches.prune(cutoff, 20));
    expect(
      await c.unitOfWorkProvider.run((x) => x.batches.find(p.id)),
    ).toBeNull();
    expect(
      (
        await b.client.execute(
          "select count(*) n from note_batch_move_receipts",
        )
      ).rows[0]?.n,
    ).toBe(0);
    const [n, other] = await notes(2);
    if (!n || !other) throw Error("fixture");
    const q = await acceptBatch(c, token, await prepare([n.id, other.id]));
    const claim = await claimBatchAttempt(c, 60000);
    if (!claim) throw Error("fixture");
    now = new Date(+now + 60000);
    await c.unitOfWorkProvider.run((x) => x.batches.recover(now));
    now = new Date(+now + 91 * 86400000);
    await b.client.execute({
      sql: "update sessions set expires_at=? where token_hash=?",
      args: [+now + 86400000, token],
    });
    const old = await getBatch(c, token, { id: q.id });
    expect(old.items[0]?.retryable).toBe(false);
    expect(
      (
        await previewBatch(c, token, {
          parentId: q.id,
          source: source(),
          operation: op,
          ids: [n.id],
        })
      ).items,
    ).toEqual([{ kind: "excluded", noteId: n.id }]);
  });
  it("does not use tag management relation revision as a later note's mapping condition", async () => {
    const [a, z] = await notes(2);
    const [target] = await notes(1, dest());
    if (!a || !z || !target) throw Error("fixture");
    for (const n of [a, z])
      await changeNoteTags(c, token, {
        noteId: n.id,
        expectedScope: {},
        change: { kind: "create", name: "Shared label" },
      });
    await changeNoteTags(c, token, {
      noteId: target.id,
      expectedScope: { workspaceId: ws },
      change: { kind: "create", name: "Ｓｈａｒｅｄ label" },
    });
    const p = await acceptBatch(
      c,
      token,
      await prepare([a.id, z.id], { kind: "move", destination: dest() }),
    );
    await step();
    await step();
    expect(
      (await getBatch(c, token, { id: p.id })).parent.counts.succeeded,
    ).toBe(2);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.tags.selected(z.id)))[0]
        ?.scopeKey,
    ).toBe(tagScopeKey(dest()));
  });
});
