import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectMediaGarbage } from "@repo/core/application/asset/collectGarbage";
import {
  acceptMediaUpload,
  beginMediaUpload,
} from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { HollowUnitOfWorkProvider } from "@repo/core/application/execution/hollowUnitOfWork";
import {
  listMoveDestinations,
  moveNote,
  previewNoteMove,
  readMoveAudience,
} from "@repo/core/application/move/usecases";
import {
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { trashNote } from "@repo/core/application/note/trash";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import { controlReference } from "@repo/core/application/reference/read";
import { changeNoteTags } from "@repo/core/application/tag/usecases";
import { createNote, type NoteOwner } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeTagNormalizer } from "../../node/browse/tagNormalizer";
import { CoordinatedObjectStorage } from "../../node/coordinatedObjectStorage";
import { NodeReferenceProcessor } from "../../node/reference/referenceProcessor";
import { createTestContainer, type TestContainer } from "./helpers";

describe("atomic single note moves and current ownership", () => {
  let b: TestContainer;
  let c: HollowContainer;
  let actor: string;
  let ws: string;
  const token = "isolated-move-session";
  const now = new Date("2026-09-11T04:00:00Z");
  beforeEach(async () => {
    b = await createTestContainer();
    actor = randomUUID();
    ws = randomUUID();
    await b.client.execute({
      sql: "insert into accounts(id,email,password_hash,created_at,verified_at) values(?,?,?,?,?)",
      args: [actor, `${actor}@example.test`, "unused", +now, +now],
    });
    await b.client.execute({
      sql: "insert into sessions(token_hash,account_id,expires_at) values(?,?,?)",
      args: [token, actor, +now + 86400000],
    });
    await b.client.execute({
      sql: "insert into workspaces(id,creator_id,name,description,created_at,state) values(?,?,?,'',?,'active')",
      args: [ws, actor, "Destination", +now],
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
  const destination = (): NoteOwner => ({ kind: "workspace", workspaceId: ws });
  async function note(owner?: NoteOwner) {
    const n = createNote(
      {
        id: randomUUID(),
        accountId: actor,
        title: "Move body",
        html: "<h1>Original</h1>",
        text: "Original",
      },
      now,
    );
    const row = owner ? { ...n, owner } : n;
    await c.unitOfWorkProvider.run((x) => x.notes.insert(row));
    return row;
  }
  const inspect = (noteId: string, dest = destination()) =>
    previewNoteMove(c, token, { noteId, destination: dest });
  const raw = async (id: string) =>
    (
      await b.client.execute({
        sql: "select * from notes where id=?",
        args: [id],
      })
    ).rows[0];
  async function original(noteId: string, bytes: number) {
    await b.client.execute({
      sql: "insert into originals(id,note_id,account_id,name,bytes,storage_key,sha256,format,state,coverage,active_job_id,created_at) values(?,?,?,'x',?,?, 'unused','text','ready','complete','finished',?)",
      args: [randomUUID(), noteId, actor, bytes, randomUUID(), +now],
    });
  }
  async function referenceJob(noteId: string) {
    const job = randomUUID();
    await b.client.execute({
      sql: "insert into reference_jobs(id,note_id,account_id,note_version,created_at,updated_at,attempt,total,completed,cancel_requested,state,lease_token,lease_until) values(?,?,?,1,?,?,1,1,0,0,'running','lease',?)",
      args: [job, noteId, actor, +now, +now, +now + 60000],
    });
    return job;
  }
  it("moves only control ownership and same-key existing tags, preserving body and metadata", async () => {
    const n = await note();
    const other = await note(destination());
    await changeNoteTags(c, token, {
      noteId: n.id,
      expectedScope: {},
      change: { kind: "create", name: "ＴＡＧ" },
    });
    await changeNoteTags(c, token, {
      noteId: n.id,
      expectedScope: {},
      change: { kind: "create", name: "not inherited" },
    });
    const target = await changeNoteTags(c, token, {
      noteId: other.id,
      expectedScope: { workspaceId: ws },
      change: { kind: "create", name: "tag" },
    });
    const before = await raw(n.id);
    const p = await inspect(n.id);
    expect(p.expected.tags.filter((t) => t.destination)).toHaveLength(1);
    await moveNote(c, token, p.expected);
    const after = await raw(n.id);
    expect(after).toEqual({
      ...before,
      owner_account_id: null,
      owner_workspace_id: ws,
      version: Number(before?.version) + 1,
      ownership_generation: 2,
    });
    const links = (
      await b.client.execute({
        sql: "select tag_id from note_tags where note_id=?",
        args: [n.id],
      })
    ).rows;
    expect(links).toEqual([{ tag_id: target.tags[0]?.id }]);
    expect(
      Number(
        (await b.client.execute("select count(*) n from tags")).rows[0]?.n,
      ),
    ).toBe(3);
  });
  it("rejects scope rename, membership ABA and revoked current permission, not unrelated tag counts", async () => {
    const successor = randomUUID();
    await b.client.execute({
      sql: "insert into accounts(id,email,password_hash,created_at,verified_at) values(?,?,?,?,?)",
      args: [successor, `${successor}@example.test`, "unused", +now, +now],
    });
    await b.client.execute({
      sql: "insert into workspace_members(workspace_id,account_id,role) values(?,?,'owner')",
      args: [ws, successor],
    });
    const n = await note();
    const p = await inspect(n.id);
    await b.client.execute({
      sql: "update workspaces set name='Changed' where id=?",
      args: [ws, actor],
    });
    await expect(moveNote(c, token, p.expected)).rejects.toMatchObject({
      code: "MOVE_CHANGED",
    });
    const fresh = await inspect(n.id);
    await b.client.execute({
      sql: "update workspace_members set role='editor' where workspace_id=? and account_id=?",
      args: [ws, actor],
    });
    await b.client.execute({
      sql: "update workspace_members set role='owner' where workspace_id=? and account_id=?",
      args: [ws, actor],
    });
    await expect(moveNote(c, token, fresh.expected)).rejects.toMatchObject({
      code: "MOVE_CHANGED",
    });
    const valid = await inspect(n.id);
    await b.client.execute({
      sql: "update workspace_members set role='viewer' where workspace_id=? and account_id=?",
      args: [ws, actor],
    });
    await expect(moveNote(c, token, valid.expected)).rejects.toMatchObject({
      code: "SCOPE_NOT_FOUND",
    });
    expect((await raw(n.id))?.owner_account_id).toBe(actor);
  });
  it("paginates current editable destinations and exact audience differences", async () => {
    const n = await note();
    const foreign = randomUUID();
    await b.client.execute({
      sql: "insert into accounts(id,email,password_hash,created_at,verified_at) values(?,?,?,?,?)",
      args: [foreign, `${foreign}@example.test`, "unused", +now, +now],
    });
    await b.client.execute({
      sql: "insert into workspace_members(workspace_id,account_id,role) values(?,?,'viewer')",
      args: [ws, foreign],
    });
    const choices = await listMoveDestinations(c, token, { noteId: n.id });
    expect(choices.items.map((x) => x.owner)).toEqual([destination()]);
    const p = await inspect(n.id);
    expect(p.gained.total).toBe(1);
    expect(p.lost.total).toBe(0);
    expect(
      (
        await readMoveAudience(c, token, {
          expected: p.expected,
          direction: "gained",
        })
      ).items[0]?.id,
    ).toBe(foreign);
    await moveNote(c, token, p.expected);
    const back = await inspect(n.id, { kind: "personal", accountId: actor });
    expect(back.lost.total).toBe(1);
    await moveNote(c, token, back.expected);
    expect((await raw(n.id))?.ownership_generation).toBe(3);
  });
  it("preserves same-scope companion charge and moves only the last logical hold", async () => {
    const a = await note();
    const d = await note();
    const bundle = randomUUID();
    await b.client.execute({
      sql: "insert into source_bundles(id,account_id,enabled,sealed,created_at) values(?,?,1,1,?)",
      args: [bundle, actor, +now],
    });
    await b.client.execute({
      sql: "insert into companion_sources(id,bundle_id,account_id,path,storage_key,bytes,sha256) values(?,?,?,'x','key',10,'unused')",
      args: [randomUUID(), bundle, actor],
    });
    for (const n of [a, d])
      await b.client.execute({
        sql: "insert into reference_settings(note_id,enabled,bundle_id) values(?,0,?)",
        args: [n.id, bundle],
      });
    const p = await inspect(a.id);
    expect(p.expected.destinationIncrease).toBe(10);
    expect(p.expected.sourceRelease).toBe(0);
    await moveNote(c, token, p.expected);
    const next = await inspect(d.id);
    expect(next.expected.destinationIncrease).toBe(0);
    expect(next.expected.sourceRelease).toBe(10);
    await moveNote(c, token, next.expected);
    const charges = await c.unitOfWorkProvider.run(async (x) => [
      await x.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
      await x.capacity.usedBytes(destination(), now),
    ]);
    expect(charges).toEqual([0, 10]);
    expect(
      (
        await b.client.execute({
          sql: "select note_holds,revision from bundle_scope_holdings where bundle_id=? and scope_kind='personal'",
          args: [bundle],
        })
      ).rows[0]?.note_holds,
    ).toBe(0);
  });
  it("moves bound staging debt from workspace to personal without falling back to draft uploader scope", async () => {
    const n = await note(destination());
    const draft = randomUUID();
    const upload = randomUUID();
    await b.client.execute({
      sql: "insert into media_drafts(id,workspace_id,account_id,note_id,expires_at) values(?,?,?,?,?)",
      args: [draft, ws, actor, n.id, +now + 86400000],
    });
    await b.client.execute({
      sql: "insert into media_uploads(id,draft_id,account_id,name,bytes,state,expires_at) values(?,?,?,'x.png',31,'uploading',?)",
      args: [upload, draft, actor, +now + 10000],
    });
    await c.unitOfWorkProvider.run((x) =>
      x.objectOperations.beginWrite(
        "writer",
        "runtime",
        { kind: "media-upload", id: upload },
        now,
      ),
    );
    const p = await inspect(n.id, { kind: "personal", accountId: actor });
    expect(p.expected.destinationIncrease).toBe(31);
    await moveNote(c, token, p.expected);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.objectOperations.canPublish("writer", now),
      ),
    ).toBe(false);
    expect(
      (
        await b.client.execute(
          "select active from object_writes where id='writer'",
        )
      ).rows[0]?.active,
    ).toBe(1);
    expect(
      await c.unitOfWorkProvider.run(async (x) => [
        await x.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
        await x.capacity.usedBytes(destination(), now),
      ]),
    ).toEqual([31, 0]);
    expect(
      (
        await b.client.execute({
          sql: "select state,storage_cleaned from media_uploads where id=?",
          args: [upload],
        })
      ).rows[0],
    ).toEqual({ state: "failed", storage_cleaned: 0 });
  });
  it("recomputes current quota, accepts exact capacity and unrelated usage changes without re-confirmation", async () => {
    const n = await note();
    const other = await note(destination());
    await original(n.id, 10);
    const p = await inspect(n.id);
    await original(other.id, 20 * 1024 ** 3 - 10);
    await moveNote(c, token, p.expected);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.capacity.usedBytes(destination(), now),
      ),
    ).toBe(20 * 1024 ** 3);
  });
  it("rejects capacity overflow atomically, without moving tags or note ownership", async () => {
    const n = await note();
    const other = await note(destination());
    await original(n.id, 11);
    await original(other.id, 20 * 1024 ** 3 - 10);
    await changeNoteTags(c, token, {
      noteId: n.id,
      expectedScope: {},
      change: { kind: "create", name: "keep" },
    });
    const p = await inspect(n.id);
    const before = await raw(n.id);
    await expect(moveNote(c, token, p.expected)).rejects.toMatchObject({
      code: "MOVE_QUOTA",
    });
    expect(await raw(n.id)).toEqual(before);
    expect(
      (
        await b.client.execute({
          sql: "select count(*) n from note_tags where note_id=?",
          args: [n.id],
        })
      ).rows[0]?.n,
    ).toBe(1);
  });
  it("detects resource ABA while ignoring unrelated tag relation revisions", async () => {
    const n = await note();
    const other = await note(destination());
    await original(n.id, 10);
    const ownTags = await changeNoteTags(c, token, {
      noteId: n.id,
      expectedScope: {},
      change: { kind: "create", name: "same" },
    });
    const target = await changeNoteTags(c, token, {
      noteId: other.id,
      expectedScope: { workspaceId: ws },
      change: { kind: "create", name: "same" },
    });
    const p = await inspect(n.id);
    await b.client.execute({
      sql: "update originals set bytes=11 where note_id=?",
      args: [n.id],
    });
    await b.client.execute({
      sql: "update originals set bytes=10 where note_id=?",
      args: [n.id],
    });
    await expect(moveNote(c, token, p.expected)).rejects.toMatchObject({
      code: "MOVE_CHANGED",
    });
    const fresh = await inspect(n.id);
    await changeNoteTags(c, token, {
      noteId: other.id,
      expectedScope: { workspaceId: ws },
      change: { kind: "detach", tagId: target.tags[0]!.id },
    });
    await moveNote(c, token, fresh.expected);
    expect(
      (
        await b.client.execute({
          sql: "select tag_id from note_tags where note_id=?",
          args: [n.id],
        })
      ).rows,
    ).toEqual([{ tag_id: target.tags[0]!.id }]);
    expect(ownTags.tags).toHaveLength(1);
  });
  it("does not revive expired unstarted reservations or move unbound sibling debt", async () => {
    const n = await note(destination());
    const bound = randomUUID();
    const unbound = randomUUID();
    for (const [draft, noteId] of [
      [bound, n.id],
      [unbound, null],
    ] as const)
      await b.client.execute({
        sql: "insert into media_drafts(id,workspace_id,account_id,note_id,expires_at) values(?,?,?,?,?)",
        args: [draft, ws, actor, noteId, +now + 10000],
      });
    for (const [draft, expiry] of [
      [bound, +now - 1],
      [unbound, +now + 10000],
    ])
      await b.client.execute({
        sql: "insert into media_uploads(id,draft_id,account_id,name,bytes,state,expires_at) values(?,?,?,'x',31,'awaiting',?)",
        args: [randomUUID(), draft!, actor, expiry!],
      });
    const p = await inspect(n.id, { kind: "personal", accountId: actor });
    expect(p.expected.destinationIncrease).toBe(0);
    await moveNote(c, token, p.expected);
    expect(
      await c.unitOfWorkProvider.run(async (x) => [
        await x.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
        await x.capacity.usedBytes(destination(), now),
      ]),
    ).toEqual([0, 31]);
    expect(
      (
        await b.client.execute({
          sql: "select state from media_uploads where draft_id=?",
          args: [bound],
        })
      ).rows[0]?.state,
    ).toBe("awaiting");
  });
  it("fences reference results after round-trip ownership and preserves current cleanup charge", async () => {
    const n = await note();
    const job = await referenceJob(n.id);
    const key = randomUUID();
    const object = {
      id: key,
      jobId: job,
      accountId: actor,
      bytes: 17,
      state: "reserved" as const,
      createdAt: now,
    };
    await c.unitOfWorkProvider.run((x) => x.references.saveObject(object));
    await c.unitOfWorkProvider.run((x) =>
      x.objectOperations.beginWrite(
        "old-reference",
        "runtime",
        { kind: "reference-job", id: job },
        now,
      ),
    );
    await moveNote(c, token, (await inspect(n.id)).expected);
    await moveNote(
      c,
      token,
      (await inspect(n.id, { kind: "personal", accountId: actor })).expected,
    );
    await expect(
      c.unitOfWorkProvider.run((x) =>
        x.references.saveObject({ ...object, state: "written" }),
      ),
    ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.objectOperations.canPublish("old-reference", now),
      ),
    ).toBe(false);
    expect(
      (
        await b.client.execute({
          sql: "select state from reference_jobs where id=?",
          args: [job],
        })
      ).rows[0]?.state,
    ).toBe("cancelled");
    await c.unitOfWorkProvider.run((x) =>
      x.references.pruneJobs(new Date(+now + 91 * 86400000)),
    );
    expect(
      await c.unitOfWorkProvider.run((x) => x.references.job(job)),
    ).not.toBeNull();
    const next = await referenceJob(n.id);
    expect(
      (
        await b.client.execute({
          sql: "select ownership_generation from reference_jobs where id=?",
          args: [next],
        })
      ).rows[0]?.ownership_generation,
    ).toBe(3);
    await expect(
      c.unitOfWorkProvider.run((x) =>
        x.references.saveObject({ ...object, jobId: next, state: "written" }),
      ),
    ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
      ),
    ).toBe(17);
    await c.unitOfWorkProvider.run((x) =>
      x.objectOperations.endWrite("old-reference"),
    );
    await c.unitOfWorkProvider.run((x) =>
      x.references.saveObject({ ...object, state: "cleaned" }),
    );
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
      ),
    ).toBe(0);
  });
  it("binds an unbound writer once, but never recaptures it after movement", async () => {
    const n = await note();
    const draft = randomUUID();
    const upload = randomUUID();
    await b.client.execute({
      sql: "insert into media_drafts(id,account_id,expires_at) values(?,?,?)",
      args: [draft, actor, +now + 10000],
    });
    await b.client.execute({
      sql: "insert into media_uploads(id,draft_id,account_id,name,bytes,state,expires_at) values(?,?,?,'x',13,'uploading',?)",
      args: [upload, draft, actor, +now + 10000],
    });
    await c.unitOfWorkProvider.run((x) =>
      x.objectOperations.beginWrite(
        "initial-bind",
        "runtime",
        { kind: "media-upload", id: upload },
        now,
      ),
    );
    expect(
      (
        await b.client.execute(
          "select note_id,ownership_generation from object_writes where id='initial-bind'",
        )
      ).rows[0],
    ).toEqual({ note_id: null, ownership_generation: null });
    await c.unitOfWorkProvider.run((x) => x.assets.bindDraft(draft, n.id));
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.objectOperations.canPublish("initial-bind", now),
      ),
    ).toBe(true);
    await moveNote(c, token, (await inspect(n.id)).expected);
    await c.unitOfWorkProvider.run((x) => x.assets.bindDraft(draft, n.id));
    expect(
      (
        await b.client.execute(
          "select ownership_generation,active from object_writes where id='initial-bind'",
        )
      ).rows[0],
    ).toEqual({ ownership_generation: 1, active: 1 });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.objectOperations.canPublish("initial-bind", now),
      ),
    ).toBe(false);
  });
  it("requires confirmation after holding absent-to-present-zero ABA", async () => {
    const a = await note();
    const d = await note();
    const bundle = randomUUID();
    await b.client.execute({
      sql: "insert into source_bundles(id,account_id,enabled,sealed,created_at) values(?,?,1,1,?)",
      args: [bundle, actor, +now],
    });
    await b.client.execute({
      sql: "insert into companion_sources(id,bundle_id,account_id,path,storage_key,bytes,sha256) values(?,?,?,'x','key',10,'unused')",
      args: [randomUUID(), bundle, actor],
    });
    for (const n of [a, d])
      await b.client.execute({
        sql: "insert into reference_settings(note_id,enabled,bundle_id) values(?,0,?)",
        args: [n.id, bundle],
      });
    const p = await inspect(d.id);
    expect(p.expected.bundle?.destination.kind).toBe("absent");
    await moveNote(c, token, (await inspect(a.id)).expected);
    await moveNote(
      c,
      token,
      (await inspect(a.id, { kind: "personal", accountId: actor })).expected,
    );
    const next = await inspect(d.id);
    expect(next.expected.bundle?.destination).toMatchObject({
      kind: "present",
      noteHolds: 0,
    });
    await expect(moveNote(c, token, p.expected)).rejects.toMatchObject({
      code: "MOVE_CHANGED",
    });
  });
  it("retains last-scope cleanup holding until physical companion metadata is removed", async () => {
    const n = await note();
    const bundle = randomUUID();
    await b.client.execute({
      sql: "insert into source_bundles(id,account_id,enabled,sealed,created_at) values(?,?,1,1,?)",
      args: [bundle, actor, +now],
    });
    await b.client.execute({
      sql: "insert into companion_sources(id,bundle_id,account_id,path,storage_key,bytes,sha256) values(?,?,?,'x','key',10,'unused')",
      args: [randomUUID(), bundle, actor],
    });
    await b.client.execute({
      sql: "insert into reference_settings(note_id,enabled,bundle_id) values(?,0,?)",
      args: [n.id, bundle],
    });
    await moveNote(c, token, (await inspect(n.id)).expected);
    await b.client.execute({
      sql: "delete from reference_settings where note_id=?",
      args: [n.id],
    });
    expect(
      await c.unitOfWorkProvider.run(async (x) => [
        await x.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
        await x.capacity.usedBytes(destination(), now),
      ]),
    ).toEqual([0, 10]);
    await b.client.execute({
      sql: "delete from companion_sources where bundle_id=?",
      args: [bundle],
    });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.capacity.usedBytes(destination(), now),
      ),
    ).toBe(0);
  });
  it("rejects overflow without changing ownership and ignores same-value membership writes", async () => {
    const n = await note();
    const p = await inspect(n.id);
    await b.client.execute({
      sql: "update workspace_members set role='owner' where workspace_id=?",
      args: [ws],
    });
    expect((await inspect(n.id)).expected).toEqual(p.expected);
    await b.client.execute({
      sql: "update notes set ownership_generation=? where id=?",
      args: [Number.MAX_SAFE_INTEGER, n.id],
    });
    const exhausted = await inspect(n.id);
    await expect(moveNote(c, token, exhausted.expected)).rejects.toMatchObject({
      code: "MOVE_CHANGED",
    });
    expect((await raw(n.id))?.owner_account_id).toBe(actor);
  });
  it("returns all editable destinations and audience with bounded 50-row cursors", async () => {
    const n = await note();
    for (let i = 0; i < 51; i++) {
      const account = randomUUID();
      const workspace = randomUUID();
      await b.client.execute({
        sql: "insert into accounts(id,email,password_hash,created_at,verified_at) values(?,?,?,?,?)",
        args: [account, `${account}@example.test`, "unused", +now, +now],
      });
      await b.client.execute({
        sql: "insert into workspaces(id,creator_id,name,description,created_at,state) values(?,?,?,'',?,'active')",
        args: [workspace, account, `Scope ${i}`, +now],
      });
      await b.client.execute({
        sql: "insert into workspace_members(workspace_id,account_id,role) values(?,?,'editor')",
        args: [workspace, actor],
      });
      await b.client.execute({
        sql: "insert into workspace_members(workspace_id,account_id,role) values(?,?,'viewer')",
        args: [ws, account],
      });
    }
    const a = await listMoveDestinations(c, token, { noteId: n.id });
    expect(a.items).toHaveLength(50);
    expect(a.next).not.toBeNull();
    const z = await listMoveDestinations(c, token, {
      noteId: n.id,
      after: a.next!,
    });
    expect(z.items).toHaveLength(2);
    expect(z.next).toBeNull();
    const p = await inspect(n.id);
    expect(p.gained.items).toHaveLength(50);
    expect(p.gained.total).toBe(51);
    const more = await readMoveAudience(c, token, {
      expected: p.expected,
      direction: "gained",
      after: p.gained.next!,
    });
    expect(more.items).toHaveLength(1);
    expect(more.next).toBeNull();
    expect(
      new Set([...p.gained.items, ...more.items].map((x) => x.id)).size,
    ).toBe(51);
  });
  it("keeps pending admission charged in its original scope while a held note moves", async () => {
    const n = await note();
    const bundle = randomUUID();
    await b.client.execute({
      sql: "insert into source_bundles(id,account_id,enabled,sealed,created_at) values(?,?,1,0,?)",
      args: [bundle, actor, +now],
    });
    await b.client.execute({
      sql: "insert into companion_sources(id,bundle_id,account_id,path,storage_key,bytes,sha256) values(?,?,?,'x','key',10,'unused')",
      args: [randomUUID(), bundle, actor],
    });
    await b.client.execute({
      sql: "insert into reference_settings(note_id,enabled,bundle_id) values(?,0,?)",
      args: [n.id, bundle],
    });
    const p = await inspect(n.id);
    expect(p.expected.sourceRelease).toBe(0);
    expect(p.expected.destinationIncrease).toBe(10);
    await moveNote(c, token, p.expected);
    const used = () =>
      c.unitOfWorkProvider.run(async (x) => [
        await x.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
        await x.capacity.usedBytes(destination(), now),
      ]);
    expect(await used()).toEqual([10, 10]);
    await b.client.execute({
      sql: "update source_bundles set sealed=1 where id=?",
      args: [bundle],
    });
    expect(await used()).toEqual([0, 10]);
  });
  it("detects same-count audience replacement and current destination tag mapping changes", async () => {
    const n = await note();
    const other = await note(destination());
    const people = [randomUUID(), randomUUID()];
    for (const account of people)
      await b.client.execute({
        sql: "insert into accounts(id,email,password_hash,created_at,verified_at) values(?,?,?,?,?)",
        args: [account, `${account}@example.test`, "unused", +now, +now],
      });
    await b.client.execute({
      sql: "insert into workspace_members(workspace_id,account_id,role) values(?,?,'viewer')",
      args: [ws, people[0]!],
    });
    const p = await inspect(n.id);
    await b.client.execute({
      sql: "update workspace_members set account_id=? where workspace_id=? and account_id=?",
      args: [people[1]!, ws, people[0]!],
    });
    await expect(
      readMoveAudience(c, token, { expected: p.expected, direction: "gained" }),
    ).rejects.toMatchObject({ code: "MOVE_CHANGED" });
    await changeNoteTags(c, token, {
      noteId: n.id,
      expectedScope: {},
      change: { kind: "create", name: "new" },
    });
    const before = await inspect(n.id);
    expect(before.expected.tags[0]?.destination).toBeNull();
    await changeNoteTags(c, token, {
      noteId: other.id,
      expectedScope: { workspaceId: ws },
      change: { kind: "create", name: "NEW" },
    });
    await expect(moveNote(c, token, before.expected)).rejects.toMatchObject({
      code: "MOVE_CHANGED",
    });
  });
  it("rejects a real late filesystem link after the final guard, retaining debt through writer exit and cleanup failure", async () => {
    const n = await note();
    const draft = randomUUID();
    const upload = randomUUID();
    const bytes = new TextEncoder().encode("move-late-own");
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "hollow-move-physical-"),
    );
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const reached = new Promise<void>((r) => {
      entered = r;
    });
    let pause = true;
    let failRemoval = true;
    const baseUow = c.unitOfWorkProvider;
    const hooked: HollowUnitOfWorkProvider = {
      async run(fn) {
        let checked = false;
        const value = await baseUow.run((x) =>
          fn({
            ...x,
            objectOperations: new Proxy(x.objectOperations, {
              get(target, key) {
                if (key === "canPublish")
                  return async (id: string, checkedAt: Date) => {
                    const result = await target.canPublish(id, checkedAt);
                    checked = result;
                    return result;
                  };
                const member = Reflect.get(target, key);
                return typeof member === "function"
                  ? member.bind(target)
                  : member;
              },
            }),
          }),
        );
        if (checked && pause) {
          pause = false;
          entered();
          await gate;
        }
        return value;
      },
    };
    class FaultStorage extends CoordinatedObjectStorage {
      override async remove(key: string) {
        if (failRemoval) throw new Error("isolated cleanup fault");
        await super.remove(key);
      }
    }
    const storage = new FaultStorage(directory, hooked, c.clock);
    const physical: HollowContainer = {
      ...c,
      logger: { ...c.logger, error() {} },
      inlineMedia: {
        async inspect() {
          return { mime: "image/png", kind: "image", removed: [] };
        },
      },
      importing: {
        storage,
        extractor: {
          async extract() {
            throw Error("unused");
          },
        },
        mediaValidator: {
          async validate() {
            throw Error("unused");
          },
        },
        async detectFormat() {
          throw Error("unused");
        },
        wake() {},
      },
    };
    let pending: Promise<unknown> | undefined;
    try {
      await b.client.execute({
        sql: "insert into media_drafts(id,account_id,note_id,expires_at) values(?,?,?,?)",
        args: [draft, actor, n.id, +now + 10000],
      });
      await b.client.execute({
        sql: "insert into media_uploads(id,draft_id,account_id,name,bytes,state,expires_at) values(?,?,?,'x.png',?,'awaiting',?)",
        args: [upload, draft, actor, bytes.length, +now + 10000],
      });
      pending = acceptMediaUpload(
        physical,
        token,
        upload,
        new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
      ).then(
        () => ({ accepted: true }),
        (error) => ({ code: error.code }),
      );
      await reached;
      await moveNote(c, token, (await inspect(n.id)).expected);
      expect(
        (
          await b.client.execute(
            "select count(*) n from object_writes where active=1",
          )
        ).rows[0]?.n,
      ).toBe(1);
      expect(
        (
          await b.client.execute({
            sql: "select count(*) n from object_write_keys where storage_key=?",
            args: [`${upload}_source`],
          })
        ).rows[0]?.n,
      ).toBe(1);
      expect(
        await c.unitOfWorkProvider.run((x) =>
          x.capacity.usedBytes(destination(), now),
        ),
      ).toBe(bytes.length);
      await expect(
        storage.removeClaimed(`${upload}_source`),
      ).rejects.toMatchObject({ code: "OBJECT_BUSY" });
      release();
      expect(await pending).toEqual({ code: "OBJECT_FENCED" });
      expect(await readFile(path.join(directory, `${upload}_source`))).toEqual(
        Buffer.from(bytes),
      );
      expect(
        (
          await b.client.execute({
            sql: "select count(*) n from assets where id=?",
            args: [upload],
          })
        ).rows[0]?.n,
      ).toBe(0);
      expect(
        (
          await b.client.execute(
            "select count(*) n from object_writes where active=1",
          )
        ).rows[0]?.n,
      ).toBe(0);
      expect(
        await c.unitOfWorkProvider.run((x) =>
          x.capacity.usedBytes(destination(), now),
        ),
      ).toBe(bytes.length);
      failRemoval = false;
      await collectMediaGarbage(physical);
      await expect(
        readFile(path.join(directory, `${upload}_source`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
      expect(
        await c.unitOfWorkProvider.run((x) =>
          x.capacity.usedBytes(destination(), now),
        ),
      ).toBe(0);
      const next = await beginMediaUpload(physical, token, {
        draftId: draft,
        name: "new.png",
        bytes: bytes.length,
      });
      await acceptMediaUpload(
        physical,
        token,
        next.uploadId,
        new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
      );
      await collectMediaGarbage(physical);
      expect(
        await readFile(path.join(directory, `${next.uploadId}_source`)),
      ).toEqual(Buffer.from(bytes));
      expect(
        (
          await b.client.execute({
            sql: "select state from assets where id=?",
            args: [next.uploadId],
          })
        ).rows[0]?.state,
      ).toBe("ready");
      expect(
        await c.unitOfWorkProvider.run((x) =>
          x.capacity.usedBytes(destination(), now),
        ),
      ).toBe(bytes.length);
    } finally {
      release();
      await pending;
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("rolls back pending display on quota rejection, then completes only its owned reference control metadata", async () => {
    const n = await note();
    const other = await note(destination());
    await original(n.id, 1);
    await original(other.id, 20 * 1024 ** 3);
    const job = await referenceJob(n.id);
    const pending = {
      style: "default",
      source: "automatic",
      initialization: { kind: "reference", jobId: job, decorated: true },
    };
    await b.client.execute({
      sql: "update notes set display=? where id=?",
      args: [JSON.stringify(pending), n.id],
    });
    const before = await raw(n.id);
    const p = await inspect(n.id);
    await expect(moveNote(c, token, p.expected)).rejects.toMatchObject({
      code: "MOVE_QUOTA",
    });
    expect(await raw(n.id)).toEqual(before);
    await b.client.execute({
      sql: "update originals set bytes=0 where note_id=?",
      args: [other.id],
    });
    await moveNote(c, token, p.expected);
    const after = await raw(n.id);
    expect(JSON.parse(String(after?.display))).toEqual({
      style: "default",
      source: "automatic",
      initialization: { kind: "complete", reason: "interrupted" },
    });
    expect({ ...after, display: before?.display }).toEqual({
      ...before,
      owner_account_id: null,
      owner_workspace_id: ws,
      version: Number(before?.version) + 1,
      ownership_generation: 2,
    });
  });
  it.each([
    "user",
    "different-job",
    "no-reference",
  ])("does not change %s display controls", async (kind) => {
    const n = await note();
    if (kind !== "no-reference") await referenceJob(n.id);
    const display =
      kind === "user"
        ? {
            style: "original",
            source: "user",
            initialization: { kind: "complete", reason: "user" },
          }
        : kind === "different-job"
          ? {
              style: "default",
              source: "automatic",
              initialization: {
                kind: "reference",
                jobId: randomUUID(),
                decorated: true,
              },
            }
          : {
              style: "default",
              source: "automatic",
              initialization: { kind: "complete", reason: "blank" },
            };
    await b.client.execute({
      sql: "update notes set display=? where id=?",
      args: [JSON.stringify(display), n.id],
    });
    await moveNote(c, token, (await inspect(n.id)).expected);
    expect(JSON.parse(String((await raw(n.id))?.display))).toEqual(display);
  });
  it("rejects queued and running conversions after preview, and preserves all move state", async () => {
    const n = await note();
    await original(n.id, 1);
    const p = await inspect(n.id);
    const batch = randomUUID();
    const job = randomUUID();
    const originalId = (
      await b.client.execute({
        sql: "select id from originals where note_id=?",
        args: [n.id],
      })
    ).rows[0]?.id;
    if (typeof originalId !== "string") throw Error("original fixture missing");
    await b.client.execute({
      sql: "insert into import_batches(id,account_id,created_at,use_ai) values(?,?,?,0)",
      args: [batch, actor, +now],
    });
    await b.client.execute({
      sql: "insert into conversion_jobs(id,batch_id,original_id,account_id,note_id,note_version,use_ai,created_at,updated_at,attempt,state) values(?,?,?,?,?,1,0,?,?,0,'queued')",
      args: [job, batch, originalId, actor, n.id, +now, +now],
    });
    const before = await raw(n.id);
    await expect(moveNote(c, token, p.expected)).rejects.toMatchObject({
      code: "MOVE_CONVERSION_ACTIVE",
    });
    await b.client.execute({
      sql: "update conversion_jobs set state='running',lease_token='fixture',lease_until=? where id=?",
      args: [+now + 60000, job],
    });
    await expect(inspect(n.id)).rejects.toMatchObject({
      code: "MOVE_CONVERSION_ACTIVE",
    });
    expect(await raw(n.id)).toEqual(before);
    await b.client.execute({
      sql: "update conversion_jobs set state='succeeded',lease_token=null,lease_until=null where id=?",
      args: [job],
    });
    await moveNote(c, token, p.expected);
    expect((await raw(n.id))?.owner_workspace_id).toBe(ws);
  });
  it.each([
    false,
    true,
  ])("does not adopt old held reference success/failure=%s after round-trip move; a new job works", async (fail) => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "hollow-move-reference-"),
    );
    const storage = new CoordinatedObjectStorage(
      directory,
      c.unitOfWorkProvider,
      c.clock,
    );
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((r) => {
      enter = r;
    });
    const held = new Promise<void>((r) => {
      release = r;
    });
    let first = true;
    const processing: HollowContainer = {
      ...c,
      logger: { ...c.logger, error() {} },
      inlineMedia: {
        async inspect() {
          return { mime: "image/png", kind: "image", removed: [] };
        },
      },
      importing: {
        storage,
        extractor: {
          async extract() {
            throw Error("unused");
          },
        },
        mediaValidator: {
          async validate() {
            throw Error("unused");
          },
        },
        async detectFormat() {
          throw Error("unused");
        },
        wake() {},
      },
      referencing: {
        processor: new NodeReferenceProcessor(),
        fetcher: {
          async inspect(url) {
            return { url, allowed: true, reason: null };
          },
          async inspectMany(urls) {
            return urls.map((url) => ({ url, allowed: true, reason: null }));
          },
          async fetch(url) {
            if (first) {
              first = false;
              enter();
              await held;
              if (fail) throw Error("isolated reference failure");
            }
            return {
              finalUrl: url,
              contentType: "text/css",
              body: new ReadableStream({
                start(controller) {
                  controller.enqueue(new TextEncoder().encode("p{color:blue}"));
                  controller.close();
                },
              }),
            };
          },
        },
        wake() {},
      },
    };
    let pending: Promise<void> | undefined;
    try {
      const n = (
        await saveNote(processing, token, {
          title: "Held move",
          html: '<p>safe</p><link rel="stylesheet" href="https://public.example/a.css">',
        })
      ).note;
      const claim = () =>
        c.unitOfWorkProvider.run((x) =>
          x.references.claim(now, randomUUID(), new Date(+now + 60000)),
        );
      const old = await claim();
      if (old?.state !== "running") throw Error("reference not running");
      pending = runReferenceJob(processing, old, new AbortController().signal);
      await Promise.race([
        entered,
        pending.then(() => {
          throw Error("worker finished before fetch pause");
        }),
      ]);
      if (!fail)
        await b.client.execute({
          sql: "update notes set display=? where id=?",
          args: [
            JSON.stringify({
              style: "default",
              source: "automatic",
              initialization: {
                kind: "reference",
                jobId: old.id,
                decorated: true,
              },
            }),
            n.id,
          ],
        });
      await moveNote(c, token, (await inspect(n.id)).expected);
      if (!fail)
        expect(
          (await c.unitOfWorkProvider.run((x) => x.notes.findById(n.id)))
            ?.display,
        ).toEqual({
          style: "default",
          source: "automatic",
          initialization: { kind: "complete", reason: "interrupted" },
        });
      await moveNote(
        c,
        token,
        (await inspect(n.id, { kind: "personal", accountId: actor })).expected,
      );
      const before = await c.unitOfWorkProvider.run(async (x) => ({
        note: await x.notes.findById(n.id),
        revisions: await x.revisions.list(n.id),
      }));
      release();
      await pending;
      expect(
        await c.unitOfWorkProvider.run(async (x) => ({
          note: await x.notes.findById(n.id),
          revisions: await x.revisions.list(n.id),
        })),
      ).toEqual(before);
      expect(
        await c.unitOfWorkProvider.run((x) => x.references.job(old.id)),
      ).toMatchObject({ state: "cancelled", failure: null });
      await controlReference(processing, token, { noteId: n.id, action: "on" });
      const next = await claim();
      if (next?.state !== "running") throw Error("new reference not running");
      expect(next.id).not.toBe(old.id);
      await runReferenceJob(processing, next, new AbortController().signal);
      expect(
        await c.unitOfWorkProvider.run((x) => x.references.job(next.id)),
      ).toMatchObject({ state: "succeeded" });
    } finally {
      release();
      await pending;
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("keeps the moved note and draft anchor through purge until the registered physical writer ends", async () => {
    const n = await note();
    const draft = randomUUID();
    const upload = randomUUID();
    const bytes = new TextEncoder().encode("purge-move-own");
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "hollow-move-purge-"),
    );
    const storage = new CoordinatedObjectStorage(
      directory,
      c.unitOfWorkProvider,
      c.clock,
    );
    let time = now;
    const physical: HollowContainer = {
      ...c,
      clock: { now: () => time },
      logger: { ...c.logger, error() {} },
      importing: {
        storage,
        extractor: {
          async extract() {
            throw Error("unused");
          },
        },
        mediaValidator: {
          async validate() {
            throw Error("unused");
          },
        },
        async detectFormat() {
          throw Error("unused");
        },
        wake() {},
      },
    };
    let release!: () => void;
    let enter!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const entered = new Promise<void>((r) => {
      enter = r;
    });
    let writing: Promise<void> | undefined;
    try {
      await b.client.execute({
        sql: "insert into media_drafts(id,account_id,note_id,expires_at) values(?,?,?,?)",
        args: [draft, actor, n.id, +now + 10000],
      });
      await b.client.execute({
        sql: "insert into media_uploads(id,draft_id,account_id,name,bytes,state,expires_at) values(?,?,?,'x',?,'uploading',?)",
        args: [upload, draft, actor, bytes.length, +now + 10000],
      });
      writing = storage.withOwner(
        { kind: "media-upload", id: upload },
        async () => {
          await storage.put(
            `${upload}_source`,
            new ReadableStream({
              start(controller) {
                controller.enqueue(bytes);
                controller.close();
              },
            }),
            bytes.length,
          );
          enter();
          await held;
        },
      );
      await Promise.race([
        entered,
        writing.then(() => {
          throw Error("writer did not pause");
        }),
      ]);
      const moved = await moveNote(c, token, (await inspect(n.id)).expected);
      const receipt = await trashNote(c, token, {
        id: n.id,
        version: moved.version,
        cancelProcessing: true,
      });
      await requestNotePurge(physical, token, receipt);
      await sweepNotePurges(physical);
      expect((await raw(n.id))?.lifecycle).toBe("purging");
      expect(
        (
          await b.client.execute({
            sql: "select note_id from media_drafts where id=?",
            args: [draft],
          })
        ).rows[0]?.note_id,
      ).toBe(n.id);
      expect(
        await c.unitOfWorkProvider.run((x) =>
          x.capacity.usedBytes(destination(), now),
        ),
      ).toBe(bytes.length);
      expect(await readFile(path.join(directory, `${upload}_source`))).toEqual(
        Buffer.from(bytes),
      );
      release();
      await writing;
      time = new Date(+now + 31000);
      await sweepNotePurges(physical);
      expect(await raw(n.id)).toBeUndefined();
      expect(
        (
          await b.client.execute({
            sql: "select count(*) n from media_drafts where id=?",
            args: [draft],
          })
        ).rows[0]?.n,
      ).toBe(0);
      await expect(
        readFile(path.join(directory, `${upload}_source`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
      expect(
        await c.unitOfWorkProvider.run((x) =>
          x.capacity.usedBytes(destination(), time),
        ),
      ).toBe(0);
    } finally {
      release();
      await writing;
      await rm(directory, { recursive: true, force: true });
    }
  });
});
