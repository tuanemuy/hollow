import { randomUUID } from "node:crypto";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { restoreRevision } from "@repo/core/application/note/history";
import { saveNote } from "@repo/core/application/note/saveNote";
import { restoreNote, trashNote } from "@repo/core/application/note/trash";
import type { TagReadInput } from "@repo/core/application/tag/ports";
import {
  changeNoteTags,
  manageTags,
  readTags,
} from "@repo/core/application/tag/usecases";
import { BusinessRuleError } from "@repo/core/domain/error";
import { createNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TemporalCivilDate } from "../../node/browse/civilDate";
import { NodeTagNormalizer } from "../../node/browse/tagNormalizer";
import { LibsqlBrowseReadSnapshot } from "../browseReadSnapshot";
import { createTestContainer, type TestContainer } from "./helpers";

describe("transactional tag commands and bounded reads", () => {
  let b: TestContainer;
  let c: HollowContainer;
  let account: string;
  const token = "tag-self-session";
  const now = new Date("2026-09-11T02:00:00Z");
  beforeEach(async () => {
    b = await createTestContainer();
    account = randomUUID();
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [
        account,
        `${account}@example.test`,
        "unused",
        now.getTime(),
        now.getTime(),
      ],
    });
    await b.client.execute({
      sql: "insert into sessions values(?,?,?)",
      args: [token, account, now.getTime() + 86400000],
    });
    const url = `file:${String((await b.client.execute("pragma database_list")).rows[0]?.file)}`;
    const reader = new LibsqlBrowseReadSnapshot(
      url,
      { now: () => now },
      TemporalCivilDate,
      NodeTagNormalizer,
    );
    c = {
      ...createHollowContainer(b.db, "http://localhost", { async send() {} }),
      clock: { now: () => now },
      tokens: { generate: randomUUID, hash: (value) => value },
      tagging: {
        normalizer: NodeTagNormalizer,
        read: {
          async read(sessionHash, input) {
            const response = await reader.read({
              kind: "tag-management",
              sessionHash,
              input,
            });
            if (response.kind !== "tag-management")
              throw Error("Wrong response");
            return response.result;
          },
        },
      },
    };
  });
  afterEach(() => b.close());
  async function note() {
    const n = createNote(
      {
        id: randomUUID(),
        accountId: account,
        title: "Tag fixture",
        html: "<p>Body</p>",
        text: "Body",
      },
      now,
    );
    await c.unitOfWorkProvider.run((x) => x.notes.insert(n));
    return n;
  }
  const create = (noteId: string, name: string) =>
    changeNoteTags(c, token, {
      noteId,
      expectedScope: {},
      change: { kind: "create", name },
    });
  const delta = (noteId: string, tagId: string, kind: "attach" | "detach") =>
    changeNoteTags(c, token, {
      noteId,
      expectedScope: {},
      change: { kind, tagId },
    });
  async function row(id: string) {
    return c.unitOfWorkProvider.run(async (x) => {
      const tag = await x.tags.find(id);
      if (!tag) throw Error("Missing fixture");
      return tag;
    });
  }
  const stamp = async (id: string) => ({
    id,
    revision: (await row(id)).mutationRevision,
  });
  async function lifecycle(id: string, state: "trashed" | "purging") {
    await b.client.execute({
      sql: "update notes set lifecycle=?,trashed_at=?,purge_after=?,trash_operation_id=? where id=?",
      args: [
        state,
        state === "trashed" ? now.getTime() : null,
        state === "trashed" ? now.getTime() + 86400000 : null,
        randomUUID(),
        id,
      ],
    });
  }
  async function page(input: TagReadInput) {
    const p = await readTags(c, token, input);
    if (p.kind !== "page") throw Error("Wrong page");
    return p;
  }

  it("trims, normalizes concurrent same names, validates 50 codepoints, and leaves note columns unchanged", async () => {
    const n = await note();
    const before = (
      await b.client.execute({
        sql: "select * from notes where id=?",
        args: [n.id],
      })
    ).rows;
    const [a, d] = await Promise.all([
      create(n.id, " ＴＡＧ "),
      create(n.id, "tag"),
    ]);
    expect(a.tags[0]?.id).toBe(d.tags[0]?.id);
    expect((await row(a.tags[0]?.id ?? "")).name).toBe("ＴＡＧ");
    await expect(create(n.id, " ")).rejects.toMatchObject({ code: "TAG_NAME" });
    await expect(create(n.id, "😀".repeat(51))).rejects.toMatchObject({
      code: "TAG_NAME",
    });
    await create(n.id, "😀".repeat(50));
    expect(
      (
        await b.client.execute({
          sql: "select * from notes where id=?",
          args: [n.id],
        })
      ).rows,
    ).toEqual(before);
  });
  it("rolls back a new 51st tag and permits detach then attach", async () => {
    const n = await note();
    for (let i = 0; i < 50; i++) await create(n.id, `tag${i}`);
    await expect(create(n.id, "orphan forbidden")).rejects.toMatchObject({
      code: "TAG_LIMIT",
    });
    expect(
      Number(
        (await b.client.execute("select count(*) c from tags")).rows[0]?.c,
      ),
    ).toBe(50);
    const p = await page({ purpose: "picker", noteId: n.id, query: "" });
    const id = p.selected[0]?.id ?? "";
    await delta(n.id, id, "detach");
    await create(n.id, "after detach");
    expect(
      Number(
        (await b.client.execute("select count(*) c from note_tags")).rows[0]?.c,
      ),
    ).toBe(50);
  });
  it("tracks real relation/name/lifecycle changes, same values do not increment, and rollback restores revision", async () => {
    const n = await note();
    const id = (await create(n.id, "revision")).tags[0]?.id ?? "";
    expect((await row(id)).mutationRevision).toBe(2);
    await delta(n.id, id, "attach");
    await b.client.execute({
      sql: "update note_tags set tag_id=tag_id where tag_id=?",
      args: [id],
    });
    await b.client.execute({
      sql: "update notes set lifecycle=lifecycle where id=?",
      args: [n.id],
    });
    expect((await row(id)).mutationRevision).toBe(2);
    await manageTags(c, token, {
      scope: {},
      action: { kind: "rename", source: await stamp(id), name: "renamed" },
    });
    expect((await row(id)).mutationRevision).toBe(3);
    await lifecycle(n.id, "trashed");
    expect((await row(id)).mutationRevision).toBe(4);
    await expect(
      c.unitOfWorkProvider.run(async (x) => {
        await x.tags.detach(n.id, id);
        throw new BusinessRuleError("FIXTURE_ROLLBACK", "rollback");
      }),
    ).rejects.toMatchObject({ code: "FIXTURE_ROLLBACK" });
    expect((await row(id)).mutationRevision).toBe(4);
    await b.client.execute({
      sql: "delete from notes where id=?",
      args: [n.id],
    });
    expect((await row(id)).mutationRevision).toBe(5);
  });
  it("detects equal-count relation swaps and permits unrelated tag changes", async () => {
    const a = await note();
    const bnote = await note();
    const id = (await create(a.id, "source")).tags[0]?.id ?? "";
    const initial = await stamp(id);
    await delta(a.id, id, "detach");
    await delta(bnote.id, id, "attach");
    await expect(
      manageTags(c, token, {
        scope: {},
        action: { kind: "delete", source: initial },
      }),
    ).rejects.toMatchObject({ code: "TAG_CHANGED" });
    const current = await stamp(id);
    await create(a.id, "unrelated");
    await manageTags(c, token, {
      scope: {},
      action: { kind: "rename", source: current, name: "valid" },
    });
  });
  it("requires merge confirmation then de-duplicates before moving relations", async () => {
    const a = await note();
    const other = await note();
    const source = (await create(a.id, "source")).tags[0]?.id ?? "";
    const target = (await create(other.id, "target")).tags[0]?.id ?? "";
    await delta(a.id, target, "attach");
    const r = await manageTags(c, token, {
      scope: {},
      action: { kind: "rename", source: await stamp(source), name: "TARGET" },
    });
    expect(r.kind).toBe("merge-required");
    if (r.kind !== "merge-required") throw Error();
    expect(r.impact.overlap).toBe(1);
    expect(r.impact.affected).toBe(2);
    await manageTags(c, token, {
      scope: {},
      action: {
        kind: "merge",
        source: { id: source, revision: r.impact.source.revision },
        target: { id: target, revision: r.impact.target?.revision ?? 0 },
      },
    });
    expect(
      Number(
        (await b.client.execute("select count(*) c from note_tags")).rows[0]?.c,
      ),
    ).toBe(2);
    expect(
      await c.unitOfWorkProvider.run((x) => x.tags.find(source)),
    ).toBeNull();
  });
  it("deletes tags across active/trash/purging but preserves every note", async () => {
    const notes = await Promise.all([note(), note(), note()]);
    const id = (await create(notes[0]?.id ?? "", "all")).tags[0]?.id ?? "";
    for (const n of notes.slice(1)) await delta(n.id, id, "attach");
    await lifecycle(notes[1]?.id ?? "", "trashed");
    await lifecycle(notes[2]?.id ?? "", "purging");
    const impact = await readTags(c, token, {
      purpose: "impact",
      sourceId: id,
    });
    expect(impact.kind === "impact" && impact.source).toMatchObject({
      active: 1,
      trashed: 1,
      purging: 1,
      total: 3,
    });
    const before = (await b.client.execute("select * from notes order by id"))
      .rows;
    await manageTags(c, token, {
      scope: {},
      action: { kind: "delete", source: await stamp(id) },
    });
    expect(
      (await b.client.execute("select * from notes order by id")).rows,
    ).toEqual(before);
  });
  it("cleanup compares all displayed revisions atomically and excludes trash-only tags", async () => {
    const n = await note();
    const a = (await create(n.id, "a")).tags[0]?.id ?? "";
    const bb =
      (await create(n.id, "b")).tags.find((t) => t.name === "b")?.id ?? "";
    await delta(n.id, a, "detach");
    await delta(n.id, bb, "detach");
    const targets = [await stamp(a), await stamp(bb)];
    await delta(n.id, bb, "attach");
    await lifecycle(n.id, "trashed");
    await expect(
      manageTags(c, token, { scope: {}, action: { kind: "cleanup", targets } }),
    ).rejects.toMatchObject({ code: "TAG_CHANGED" });
    expect(await row(a)).toBeTruthy();
    const unused = await page({
      purpose: "manager",
      query: "",
      unusedOnly: true,
    });
    expect(unused.items.map((t) => t.id)).toEqual([a]);
    await manageTags(c, token, {
      scope: {},
      action: { kind: "cleanup", targets: [await stamp(a)] },
    });
  });
  it("rejects revision overflow and rolls relation deletion back", async () => {
    const n = await note();
    const id = (await create(n.id, "overflow")).tags[0]?.id ?? "";
    await b.client.execute({
      sql: "update tags set mutation_revision=? where id=?",
      args: [Number.MAX_SAFE_INTEGER, id],
    });
    await expect(delta(n.id, id, "detach")).rejects.toBeTruthy();
    expect(
      Number(
        (await b.client.execute("select count(*) c from note_tags")).rows[0]?.c,
      ),
    ).toBe(1);
    expect((await row(id)).mutationRevision).toBe(Number.MAX_SAFE_INTEGER);
  });
  it("reads 50 pages, zero-use tags and exact match independently of selected page without index", async () => {
    const n = await note();
    for (let i = 0; i < 53; i++) {
      const id =
        (await create(n.id, `z${String(i).padStart(2, "0")}`)).tags.find(
          (t) => t.name === `z${String(i).padStart(2, "0")}`,
        )?.id ?? "";
      await delta(n.id, id, "detach");
    }
    const first = await page({
      purpose: "manager",
      query: "",
      unusedOnly: false,
    });
    expect(first.items).toHaveLength(50);
    expect(first.unusedTotal).toBe(53);
    const second = await page({
      purpose: "manager",
      query: "",
      unusedOnly: false,
      cursor: first.nextCursor ?? "",
    });
    expect(second.items).toHaveLength(3);
    const exact = await page({ purpose: "picker", noteId: n.id, query: "Z52" });
    expect(exact.exact?.name).toBe("z52");
    await expect(
      page({
        purpose: "manager",
        query: "z",
        unusedOnly: false,
        cursor: first.nextCursor ?? "",
      }),
    ).rejects.toMatchObject({ code: "TAG_CURSOR" });
    expect(
      Number(
        (await b.client.execute("select count(*) c from note_projections"))
          .rows[0]?.c,
      ),
    ).toBe(0);
  });
  it("preserves tag changes across canonical save/restore and increments only on actual trash/restore", async () => {
    const first = (
      await saveNote(c, token, { title: "First", html: "<p>First</p>" })
    ).note;
    const tag = (await create(first.id, "survivor")).tags[0]?.id ?? "";
    const revision = (await row(tag)).mutationRevision;
    const before = await c.unitOfWorkProvider.run(async (x) => ({
      n: await x.notes.findById(first.id),
      h: await x.revisions.head(first.id),
      r: await x.revisions.list(first.id),
      p: await x.assets.referenceIds(first.id, 0),
    }));
    await create(first.id, "another");
    const after = await c.unitOfWorkProvider.run(async (x) => ({
      n: await x.notes.findById(first.id),
      h: await x.revisions.head(first.id),
      r: await x.revisions.list(first.id),
      p: await x.assets.referenceIds(first.id, 0),
    }));
    expect(after).toEqual(before);
    const second = (
      await saveNote(c, token, {
        id: first.id,
        version: first.version,
        title: "Second",
        html: "<p>Second</p>",
      })
    ).note;
    await restoreRevision(c, token, {
      noteId: first.id,
      revisionNo: 1,
      expectedVersion: second.version,
    });
    expect(
      (await page({ purpose: "picker", noteId: first.id, query: "" })).selected,
    ).toHaveLength(2);
    expect((await row(tag)).mutationRevision).toBe(revision);
    const current = await c.unitOfWorkProvider.run((x) =>
      x.notes.findById(first.id),
    );
    const receipt = await trashNote(c, token, {
      id: first.id,
      version: current?.version ?? 0,
      cancelProcessing: false,
    });
    expect((await row(tag)).mutationRevision).toBe(revision + 1);
    await expect(create(first.id, "blocked")).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
    });
    await restoreNote(c, token, {
      id: first.id,
      operationId: receipt.operationId,
    });
    expect((await row(tag)).mutationRevision).toBe(revision + 2);
  });
  it("rechecks current roles/scope/session and rejects foreign tags without leaking their names", async () => {
    const w = randomUUID();
    const outsider = randomUUID();
    await c.unitOfWorkProvider.run(async (x) => {
      await x.workspaces.create({
        id: w,
        creatorId: account,
        name: "Self workspace",
        description: "",
        slug: null,
        createdAt: now,
        state: "active",
      });
      await x.workspaces.membership(w, account, "owner");
    });
    const ws = (
      await saveNote(c, token, {
        workspaceId: w,
        title: "WS",
        html: "<p>Body</p>",
      })
    ).note;
    const personal = await note();
    const foreign =
      (await create(personal.id, "private-name")).tags[0]?.id ?? "";
    await expect(
      changeNoteTags(c, token, {
        noteId: ws.id,
        expectedScope: {},
        change: { kind: "create", name: "no" },
      }),
    ).rejects.toMatchObject({ code: "TAG_CHANGED" });
    await expect(
      changeNoteTags(c, token, {
        noteId: ws.id,
        expectedScope: { workspaceId: w },
        change: { kind: "attach", tagId: foreign },
      }),
    ).rejects.toMatchObject({ code: "TAG_NOT_FOUND" });
    await c.unitOfWorkProvider.run((x) =>
      x.workspaces.membership(w, account, "viewer"),
    );
    await expect(
      page({ purpose: "picker", noteId: ws.id, workspaceId: w, query: "" }),
    ).rejects.toMatchObject({ code: "TAG_EDIT_REQUIRED" });
    await expect(
      changeNoteTags(c, token, {
        noteId: ws.id,
        expectedScope: { workspaceId: w },
        change: { kind: "create", name: "no" },
      }),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await c.unitOfWorkProvider.run((x) =>
      x.workspaces.membership(w, account, "editor"),
    );
    await changeNoteTags(c, token, {
      noteId: ws.id,
      expectedScope: { workspaceId: w },
      change: { kind: "create", name: "yes" },
    });
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [
        outsider,
        `${outsider}@example.test`,
        "unused",
        now.getTime(),
        now.getTime(),
      ],
    });
    await b.client.execute({
      sql: "insert into sessions values(?,?,?)",
      args: ["tag-outsider", outsider, now.getTime() + 86400000],
    });
    await expect(
      readTags(c, "tag-outsider", {
        purpose: "manager",
        workspaceId: w,
        query: "",
        unusedOnly: false,
      }),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    await b.client.execute({
      sql: "delete from sessions where token_hash=?",
      args: [token],
    });
    await expect(
      page({ purpose: "manager", query: "", unusedOnly: false }),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
  });
  it("relation pair UPDATE tracks both tags once and invalid foreign relations cannot be cleaned", async () => {
    const n = await note();
    const source = (await create(n.id, "source")).tags[0]?.id ?? "";
    const target =
      (await create(n.id, "target")).tags.find((t) => t.name === "target")
        ?.id ?? "";
    await delta(n.id, target, "detach");
    const a = (await row(source)).mutationRevision;
    const d = (await row(target)).mutationRevision;
    await b.client.execute({
      sql: "update note_tags set tag_id=? where tag_id=?",
      args: [target, source],
    });
    expect((await row(source)).mutationRevision).toBe(a + 1);
    expect((await row(target)).mutationRevision).toBe(d + 1);
    const foreignId = randomUUID();
    await b.client.execute({
      sql: "insert into tags(id,scope_key,name,normalized_key,meaning_version) values(?,?,?,?,?)",
      args: [
        foreignId,
        `p:${randomUUID()}`,
        "foreign",
        "foreign",
        NodeTagNormalizer.version,
      ],
    });
    await b.client.execute({
      sql: "insert into note_tags values(?,?)",
      args: [n.id, foreignId],
    });
    await expect(
      page({ purpose: "picker", noteId: n.id, query: "" }),
    ).rejects.toMatchObject({ code: "TAG_RELATION" });
    await expect(delta(n.id, target, "detach")).rejects.toMatchObject({
      code: "TAG_RELATION",
    });
  });
  it("merges a full 50-tag note without transient relation growth and rolls back both revisions on overflow", async () => {
    const n = await note();
    for (let i = 0; i < 50; i++) await create(n.id, `full${i}`);
    const selected = await page({ purpose: "picker", noteId: n.id, query: "" });
    const source = selected.selected[0]?.id ?? "";
    const target = selected.selected[1]?.id ?? "";
    const other = await note();
    await delta(other.id, source, "attach");
    await b.client.execute(
      "create trigger fixture_no_51 after insert on note_tags when (select count(*) from note_tags where note_id=NEW.note_id)>50 begin select raise(abort,'fixture-transient-51');end",
    );
    await b.client.execute(
      "create trigger fixture_no_51_update after update on note_tags when (select count(*) from note_tags where note_id=NEW.note_id)>50 begin select raise(abort,'fixture-transient-51');end",
    );
    await b.client.execute({
      sql: "update tags set mutation_revision=? where id=?",
      args: [Number.MAX_SAFE_INTEGER, target],
    });
    const before = await row(source);
    await expect(
      manageTags(c, token, {
        scope: {},
        action: {
          kind: "merge",
          source: await stamp(source),
          target: await stamp(target),
        },
      }),
    ).rejects.toBeTruthy();
    expect(await row(source)).toEqual(before);
    expect(
      Number(
        (await b.client.execute("select count(*) c from note_tags")).rows[0]?.c,
      ),
    ).toBe(51);
    await b.client.execute({
      sql: "update tags set mutation_revision=2 where id=?",
      args: [target],
    });
    await manageTags(c, token, {
      scope: {},
      action: {
        kind: "merge",
        source: await stamp(source),
        target: await stamp(target),
      },
    });
    expect(
      Number(
        (await b.client.execute("select count(*) c from note_tags")).rows[0]?.c,
      ),
    ).toBe(50);
  });
  it("keeps manager/picker metadata bounded with 5001 tags and cleans only the displayed 50", async () => {
    await b.client.execute({
      sql: "with recursive seq(i) as(values(1) union all select i+1 from seq where i<5001) insert into tags(id,scope_key,name,normalized_key,meaning_version) select printf('00000000-0000-4000-8000-%012d',i),?,printf('bulk%05d',i),printf('bulk%05d',i),? from seq",
      args: [`p:${account}`, NodeTagNormalizer.version],
    });
    const start = performance.now();
    const p = await page({ purpose: "manager", query: "", unusedOnly: true });
    expect(p.items).toHaveLength(50);
    expect(p.unusedTotal).toBe(5001);
    expect(JSON.stringify(p).length).toBeLessThan(30000);
    await manageTags(c, token, {
      scope: {},
      action: {
        kind: "cleanup",
        targets: p.items.map((t) => ({ id: t.id, revision: t.revision })),
      },
    });
    expect(
      Number(
        (await b.client.execute("select count(*) c from tags")).rows[0]?.c,
      ),
    ).toBe(4951);
    console.info(
      JSON.stringify({
        fixture: "tags-5001-read-cleanup50",
        milliseconds: Math.round(performance.now() - start),
        dtoBytes: Buffer.byteLength(JSON.stringify(p)),
      }),
    );
  });
});
