import { randomUUID } from "node:crypto";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { createNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TemporalCivilDate } from "../../node/browse/civilDate";
import { projectNote } from "../../node/browse/projection";
import { NodeTagNormalizer } from "../../node/browse/tagNormalizer";
import { LibsqlBrowseReadSnapshot } from "../browseReadSnapshot";
import { createTestContainer, type TestContainer } from "./helpers";

describe("fixed selection from current exact snapshot", () => {
  let b: TestContainer;
  let actor: string;
  let read: LibsqlBrowseReadSnapshot;
  const now = new Date("2026-09-11T00:00:00Z");
  const conditions = {
    query: "",
    tags: [] as string[],
    zone: "Asia/Tokyo",
    sort: "updated-desc" as const,
    layout: "list" as const,
  };
  beforeEach(async () => {
    b = await createTestContainer();
    actor = randomUUID();
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [actor, `${actor}@example.test`, "unused", +now, +now],
    });
    await b.client.execute({
      sql: "insert into sessions values(?,?,?)",
      args: ["selection", actor, +now + 86400000],
    });
    const url = `file:${String((await b.client.execute("pragma database_list")).rows[0]?.file)}`;
    read = new LibsqlBrowseReadSnapshot(
      url,
      { now: () => now },
      TemporalCivilDate,
      NodeTagNormalizer,
    );
  });
  afterEach(() => b.close());
  async function seed(count: number, html: string, projected = true) {
    const c = createHollowContainer(b.db, "http://localhost", {
      async send() {},
    });
    const rows = Array.from({ length: count }, (_, i) =>
      createNote(
        {
          id: randomUUID(),
          accountId: actor,
          title: `Selection ${i}`,
          html,
          text: "",
        },
        new Date(+now + i),
      ),
    );
    for (const n of rows) {
      const projection = projectNote({ title: n.title, html: n.html });
      await c.unitOfWorkProvider.run(async (x) => {
        await x.notes.insert(n);
        if (projected) await x.browseIndex.save(n.id, n.version, projection);
      });
    }
    return rows;
  }
  it("applies exact text and current lifecycle before the 501 sentinel, not first 500", async () => {
    const candidates = await seed(501, "<p>東京 京駅</p>");
    const [match] = await seed(1, "<p>東京駅</p>");
    if (!match) throw Error("fixture");
    expect(
      await read.read({
        kind: "selection",
        sessionHash: "selection",
        conditions,
      }),
    ).toMatchObject({ result: { kind: "too-many" } });
    expect(
      await read.read({
        kind: "selection",
        sessionHash: "selection",
        conditions: { ...conditions, query: "東京駅" },
      }),
    ).toMatchObject({ result: { kind: "selected", ids: [match.id] } });
    const first = candidates[0];
    const second = candidates[1];
    if (!first || !second) throw Error("fixture");
    await b.client.execute({
      sql: "update notes set lifecycle='trashed',trashed_at=?,purge_after=?,trash_operation_id=? where id in(?,?)",
      args: [+now, +now + 86400000, randomUUID(), first.id, second.id],
    });
    const selected = await read.read({
      kind: "selection",
      sessionHash: "selection",
      conditions,
    });
    expect(
      selected.kind === "selection" &&
        selected.result.kind === "selected" &&
        selected.result.ids.length,
    ).toBe(500);
  }, 15000);
  it("shares AND tag filtering and relevance tie order with the current list", async () => {
    const rows = await seed(55, "<p>matching phrase</p>");
    const [a, z] = [randomUUID(), randomUUID()];
    for (const id of [a, z])
      await b.client.execute({
        sql: "insert into tags(id,scope_key,name,normalized_key,meaning_version) values(?,?,?,?,?)",
        args: [id, `p:${actor}`, id, id, NodeTagNormalizer.version],
      });
    for (const n of rows)
      await b.client.execute({
        sql: "insert into note_tags values(?,?),(?,?)",
        args: [n.id, a, n.id, z],
      });
    const query = {
      ...conditions,
      query: "matching",
      tags: [a, z],
      sort: "relevance" as const,
    };
    const selected = await read.read({
      kind: "selection",
      sessionHash: "selection",
      conditions: query,
    });
    const list = await read.read({
      kind: "notes",
      sessionHash: "selection",
      conditions: query,
    });
    if (
      selected.kind !== "selection" ||
      selected.result.kind !== "selected" ||
      list.kind !== "notes"
    )
      throw Error("fixture");
    expect(selected.result.ids.slice(0, 50)).toEqual(
      list.page.items.map((n) => n.id),
    );
    expect(selected.result.ids).toHaveLength(55);
    expect(
      await read.read({
        kind: "selection",
        sessionHash: "selection",
        conditions: { ...query, tags: [a, randomUUID()] },
      }),
    ).toMatchObject({ result: { kind: "selected", ids: [] } });
  });
  it("does not represent missing projection or expired authentication as empty success", async () => {
    await seed(1, "<p>waiting</p>", false);
    await expect(
      read.read({ kind: "selection", sessionHash: "selection", conditions }),
    ).rejects.toMatchObject({ code: "SEARCH_PREPARING" });
    await b.client.execute("delete from sessions");
    await expect(
      read.read({ kind: "selection", sessionHash: "selection", conditions }),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
  });
});
