import { randomUUID } from "node:crypto";
import { backfillBrowse } from "@repo/core/application/browse/backfill";
import type {
  BrowseConditions,
  NoteProjectionPort,
} from "@repo/core/application/browse/ports";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { getNote } from "@repo/core/application/note/getNote";
import { restoreRevision } from "@repo/core/application/note/history";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import { createNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TemporalCivilDate } from "../../node/browse/civilDate";
import { projectNote } from "../../node/browse/projection";
import { NodeTagNormalizer } from "../../node/browse/tagNormalizer";
import { LibsqlBrowseReadSnapshot } from "../browseReadSnapshot";
import { createTestContainer, type TestContainer } from "./helpers";

describe("current snapshot note browsing", () => {
  let b: TestContainer;
  let read: LibsqlBrowseReadSnapshot;
  let account: string;
  const now = new Date("2026-09-10T07:00:00Z");
  const conditions: BrowseConditions = {
    query: "",
    tags: [],
    zone: "Asia/Tokyo",
    sort: "updated-desc",
    layout: "list",
  };
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
      args: ["self-fixture-session", account, now.getTime() + 86400000],
    });
    const db = String(
      (await b.client.execute("pragma database_list")).rows[0]?.file,
    );
    read = new LibsqlBrowseReadSnapshot(
      `file:${db}`,
      { now: () => now },
      TemporalCivilDate,
      NodeTagNormalizer,
    );
  });
  afterEach(() => b.close());
  async function note(title: string, html: string, date = now) {
    const c = createHollowContainer(b.db, "http://localhost", {
      async send() {},
    });
    const n = createNote(
      { id: randomUUID(), accountId: account, title, html, text: "" },
      date,
    );
    const p = projectNote({ title: n.title, html: n.html });
    await c.unitOfWorkProvider.run(async (x) => {
      await x.notes.insert(n);
      await x.browseIndex.save(n.id, n.version, p);
    });
    return n;
  }
  async function page(input: Partial<BrowseConditions> = {}) {
    const r = await read.read({
      kind: "notes",
      sessionHash: "self-fixture-session",
      conditions: { ...conditions, ...input },
    });
    if (r.kind !== "notes") throw Error();
    return r.page;
  }
  function application(
    projection: NoteProjectionPort = {
      async project(input) {
        return projectNote(input);
      },
    },
  ): HollowContainer {
    return {
      ...createHollowContainer(b.db, "http://localhost", { async send() {} }),
      clock: { now: () => now },
      tokens: { generate: randomUUID, hash: (token) => token },
      browsing: {
        projection,
        execution: {
          async execute(request) {
            return read.read(request);
          },
          async stop() {},
        },
      },
    };
  }
  it("reads exact text before LIMIT and bounded excerpts", async () => {
    for (let i = 0; i < 55; i++)
      await note(`候補${i}`, "<p>東京 京駅 Cloudflare</p>");
    const good = await note("東京駅", "<p>Cloudflare 日本</p>");
    const p = await page({ query: "東京駅 cloud", sort: "relevance" });
    expect(p.total).toBe(1);
    expect(p.items.map((n) => n.id)).toEqual([good.id]);
    expect(p.items[0]?.excerpt.some((p) => p.match)).toBe(true);
  });
  it("maintains page cursor and rejects other conditions", async () => {
    for (let i = 0; i < 51; i++) await note(`note${i}`, "<p>body</p>");
    const first = await page();
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).not.toBeNull();
    const next = await page({ cursor: first.nextCursor ?? "" });
    expect(next.items).toHaveLength(1);
    expect(first.items.some((n) => n.id === next.items[0]?.id)).toBe(false);
    await expect(
      page({ query: "note", cursor: first.nextCursor ?? "" }),
    ).rejects.toMatchObject({ code: "BROWSE_CURSOR" });
  });
  it("orders equal relevance by updatedAt before ID across pages", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 51; i++)
      ids.push(
        (await note("Cloudflare", "<p>body</p>", new Date(now.getTime() + i)))
          .id,
      );
    const first = await page({ query: "cloud", sort: "relevance" });
    expect(first.items.map((n) => n.id)).toEqual(
      [...ids].reverse().slice(0, 50),
    );
    const next = await page({
      query: "cloud",
      sort: "relevance",
      cursor: first.nextCursor ?? "",
    });
    expect(next.items.map((n) => n.id)).toEqual(ids.slice(0, 1));
  });
  it("reads tag AND and unknown selection as zero without leaking names", async () => {
    const n = await note("tagged", "<p>日本</p>");
    const t = randomUUID();
    await b.client.execute({
      sql: "insert into tags values(?,?,?,?,?)",
      args: [
        t,
        `p:${account}`,
        "ＴＡＧ",
        NodeTagNormalizer.key("TAG"),
        NodeTagNormalizer.version,
      ],
    });
    await b.client.execute({
      sql: "insert into note_tags values(?,?)",
      args: [n.id, t],
    });
    expect((await page({ tags: [t] })).total).toBe(1);
    const unknown = await page({ tags: [randomUUID()] });
    expect(unknown.total).toBe(0);
    expect(unknown.selectedTags[0]?.name).toBeNull();
    const tags = await read.read({
      kind: "tags",
      sessionHash: "self-fixture-session",
      conditions,
      tagQuery: "tag",
    });
    expect(tags.kind === "tags" && tags.items[0]?.count).toBe(1);
  });
  it("calendar derives counts and first three from the same createdAt day", async () => {
    for (let i = 0; i < 4; i++)
      await note(`day${i}`, "<p>body</p>", new Date("2024-03-10T12:00:00Z"));
    await note("outside", "<p>body</p>", new Date("2024-04-01T04:00:00Z"));
    const p = await page({
      layout: "calendar",
      month: "2024-03",
      zone: "America/New_York",
    });
    expect(p.total).toBe(4);
    const day = p.calendar.find((d) => d.date === "2024-03-10");
    expect(day?.count).toBe(4);
    expect(day?.items).toHaveLength(3);
    const next = await page({
      layout: "calendar",
      month: "2024-03",
      zone: "America/New_York",
      day: "2024-03-10",
      cursor: day?.nextCursor ?? "",
    });
    expect(next.items).toHaveLength(1);
  });
  it("requires current session and hides trashed notes", async () => {
    const n = await note("visible", "<p>body</p>");
    await b.client.execute({
      sql: "update notes set lifecycle='trashed',trashed_at=?,purge_after=?,trash_operation_id=?,version=version+1 where id=?",
      args: [now.getTime(), now.getTime() + 86400000, randomUUID(), n.id],
    });
    expect((await page()).total).toBe(0);
    await b.client.execute("delete from sessions");
    await expect(page()).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
  });
  it("derived projection and FTS deletion follow note deletion atomically", async () => {
    const n = await note("keep", "<p>日本</p>");
    await b.client.execute({
      sql: "delete from notes where id=?",
      args: [n.id],
    });
    expect(
      (await b.client.execute("select count(*) total from note_projections"))
        .rows[0]?.total,
    ).toBe(0);
    expect(
      (await b.client.execute("select count(*) total from note_search")).rows[0]
        ?.total,
    ).toBe(0);
  });
  it("commits save and restore projection atomically without reprojecting no-op or style", async () => {
    let calls = 0;
    const c = application({
      async project(input) {
        calls++;
        return projectNote(input);
      },
    });
    const first = (
      await saveNote(c, "self-fixture-session", {
        title: "初版",
        html: "<p>東京駅</p>",
      })
    ).note;
    const same = (
      await saveNote(c, "self-fixture-session", {
        id: first.id,
        title: first.title,
        html: first.html,
        version: first.version,
      })
    ).note;
    expect(same.version).toBe(first.version);
    expect(calls).toBe(1);
    const styled = await setDisplayStyle(c, "self-fixture-session", {
      id: first.id,
      style: "original",
    });
    expect(calls).toBe(1);
    expect((await page({ query: "東京駅" })).total).toBe(1);
    const second = (
      await saveNote(c, "self-fixture-session", {
        id: first.id,
        title: "次版",
        html: "<p>大阪駅</p>",
        version: styled.version,
      })
    ).note;
    expect((await page({ query: "東京駅" })).total).toBe(0);
    expect((await page({ query: "大阪駅" })).total).toBe(1);
    await restoreRevision(c, "self-fixture-session", {
      noteId: first.id,
      revisionNo: 1,
      expectedVersion: second.version,
    });
    expect((await page({ query: "東京駅" })).total).toBe(1);
    expect((await page({ query: "大阪駅" })).total).toBe(0);
    expect(calls).toBe(3);
  });
  it("rejects mismatched or failed preparation before canonical and FTS changes", async () => {
    const c = application();
    const first = (
      await saveNote(c, "self-fixture-session", {
        title: "old",
        html: "<p>東京駅</p>",
      })
    ).note;
    const bad = application({
      async project(input) {
        return { ...projectNote(input), sourceHtml: "wrong" };
      },
    });
    await expect(
      saveNote(bad, "self-fixture-session", {
        id: first.id,
        title: "new",
        html: "<p>大阪駅</p>",
      }),
    ).rejects.toMatchObject({ code: "PROJECTION_STALE" });
    expect((await getNote(c, "self-fixture-session", first.id)).html).toBe(
      first.html,
    );
    expect((await page({ query: "東京駅" })).total).toBe(1);
    expect((await page({ query: "大阪駅" })).total).toBe(0);
  });
  it("rechecks authorization after asynchronous preparation", async () => {
    const c = application();
    const first = (
      await saveNote(c, "self-fixture-session", {
        title: "old",
        html: "<p>東京駅</p>",
      })
    ).note;
    const lost = application({
      async project(input) {
        await b.client.execute("delete from sessions");
        return projectNote(input);
      },
    });
    await expect(
      saveNote(lost, "self-fixture-session", {
        id: first.id,
        title: "new",
        html: "<p>大阪駅</p>",
      }),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
    expect(
      (
        await b.client.execute({
          sql: "select html from notes where id=?",
          args: [first.id],
        })
      ).rows[0]?.html,
    ).toBe(first.html);
  });
  it("never backfills a stale source and reports preparing rather than false zero", async () => {
    const n = await note("old", "<p>東京駅</p>");
    await b.client.execute({
      sql: "delete from note_projections where note_id=?",
      args: [n.id],
    });
    await expect(page()).rejects.toMatchObject({ code: "SEARCH_PREPARING" });
    const racing = application({
      async project(input) {
        await b.client.execute({
          sql: "update notes set title=?,html=?,version=version+1 where id=?",
          args: ["new", "<p>大阪駅</p>", n.id],
        });
        return projectNote(input);
      },
    });
    expect((await backfillBrowse(racing)).count).toBe(0);
    expect((await backfillBrowse(application())).count).toBe(1);
    expect((await page({ query: "大阪駅" })).total).toBe(1);
    expect((await page({ query: "東京駅" })).total).toBe(0);
  });
  it("maps matches to original full-width and supplementary text excerpts", async () => {
    await note(
      "ＦＦＩ Straße",
      `<p>${"前😀".repeat(120)}㍍東京駅 Cloudflare</p>`,
    );
    const result = await page({ query: "メートル東京駅 cloud" });
    expect(result.total).toBe(1);
    expect(
      result.items[0]?.excerpt
        .filter((p) => p.match)
        .map((p) => p.text)
        .join(""),
    ).toContain("㍍東京駅");
    expect(
      [...result.items[0]!.excerpt.map((p) => p.text).join("")].length,
    ).toBeLessThanOrEqual(160);
    expect((await page({ query: "flare" })).total).toBe(0);
    expect((await page({ query: "ffi" })).items[0]?.titleParts).toEqual([
      { text: "ＦＦＩ", match: true },
      { text: " Straße", match: false },
    ]);
  });
  it("paginates expanded legal titles and normalized tag-frequency ties", async () => {
    const expected: string[] = [];
    for (let i = 0; i < 51; i++) {
      const n = await note(
        "ﷺ".repeat(199) + String.fromCharCode(65 + i),
        "<p>body</p>",
      );
      const id = randomUUID();
      const name = "tag" + String(i).padStart(2, "0");
      expected.push(name);
      await b.client.execute({
        sql: "insert into tags values(?,?,?,?,?)",
        args: [
          id,
          `p:${account}`,
          name,
          NodeTagNormalizer.key(name),
          NodeTagNormalizer.version,
        ],
      });
      await b.client.execute({
        sql: "insert into note_tags values(?,?)",
        args: [n.id, id],
      });
    }
    const first = await page({ sort: "title-asc" });
    const last = await page({
      sort: "title-asc",
      cursor: first.nextCursor ?? "",
    });
    expect(first.items.length + last.items.length).toBe(51);
    const tags = await read.read({
      kind: "tags",
      sessionHash: "self-fixture-session",
      conditions,
      tagQuery: "",
    });
    if (tags.kind !== "tags") throw Error();
    expect(tags.items.map((t) => t.name)).toEqual(expected.slice(0, 50));
    const next = await read.read({
      kind: "tags",
      sessionHash: "self-fixture-session",
      conditions,
      tagQuery: "",
      tagCursor: tags.nextCursor ?? "",
    });
    expect(next.kind === "tags" && next.items.map((t) => t.name)).toEqual(
      expected.slice(50),
    );
  });
  it("keeps current WS policy for count, tags and known creator visibility", async () => {
    const n = await note("private", "<p>日本</p>");
    const ws = randomUUID();
    const other = randomUUID();
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [
        other,
        `${other}@example.test`,
        "unused",
        now.getTime(),
        now.getTime(),
      ],
    });
    await b.client.execute({
      sql: "insert into workspaces(id,creator_id,name,description,slug,state,created_at) values(?,?,?,?,?,?,?)",
      args: [ws, account, "self WS", "", "self-" + ws, "active", now.getTime()],
    });
    await b.client.execute({
      sql: "insert into workspace_members values(?,?,?,?)",
      args: [ws, account, "owner", now.getTime()],
    });
    await b.client.execute({
      sql: "insert into workspace_members values(?,?,?,?)",
      args: [ws, other, "viewer", now.getTime()],
    });
    await b.client.execute({
      sql: "update notes set owner_account_id=null,owner_workspace_id=?,creator_id=? where id=?",
      args: [ws, other, n.id],
    });
    expect((await page({ workspaceId: ws })).total).toBe(1);
    expect(
      (await getNote(application(), "self-fixture-session", n.id))
        .creatorDisplay,
    ).toEqual({ kind: "label", label: `${other}@example.test` });
    await b.client.execute({
      sql: "delete from workspace_members where workspace_id=? and account_id=?",
      args: [ws, other],
    });
    expect(
      (await getNote(application(), "self-fixture-session", n.id))
        .creatorDisplay,
    ).toEqual({ kind: "unavailable" });
    await b.client.execute({
      sql: "delete from workspace_members where workspace_id=? and account_id=?",
      args: [ws, account],
    });
    await expect(page({ workspaceId: ws })).rejects.toMatchObject({
      code: "SCOPE_NOT_FOUND",
    });
    await expect(
      read.read({
        kind: "tags",
        sessionHash: "self-fixture-session",
        conditions: { ...conditions, workspaceId: ws },
        tagQuery: "",
      }),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
  });
});
