import { randomUUID } from "node:crypto";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createTestContainer,
  type TestContainer,
} from "@repo/core/adapters/libsql/__tests__/helpers";
import { LibsqlPublicDiscoverySnapshot } from "@repo/core/adapters/libsql/publicDiscoverySnapshot";
import { projectNote } from "@repo/core/adapters/node/browse/projection";
import { NodeTagNormalizer } from "@repo/core/adapters/node/browse/tagNormalizer";
import { NodePublicDiscoveryExecution } from "@repo/core/adapters/node/publication/execution";
import { publicConditionsSchema } from "@repo/core/adapters/node/publication/wire";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { PublicDiscoveryRequest } from "@repo/core/application/publication/ports";
import { searchQuery } from "@repo/core/domain/browse/query";
import { createNote } from "@repo/core/domain/note/entity";
import { tagName } from "@repo/core/domain/tag/entity";
import { workspaceFields } from "@repo/core/domain/workspace/entity";
import { build } from "esbuild";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { publicDiscoveryHttp } from "@/presentation/publicDiscoveryHttp.node";

describe("legal public discovery boundary through SQL, actual worker and HTTP", () => {
  let directory: string;
  let b: TestContainer;
  let c: HollowContainer;
  let reader: LibsqlPublicDiscoverySnapshot;
  let execution: NodePublicDiscoveryExecution;
  let account: string;
  const now = new Date("2026-09-20T00:00:00Z");
  const root = path.resolve(import.meta.dirname, "../../../../../..");
  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "hollow-public-boundary-"));
    await symlink(
      path.join(root, "packages/core/node_modules"),
      path.join(directory, "node_modules"),
    );
    await build({
      entryPoints: ["searchSupervisor", "publicQuery"].map((name) =>
        path.join(root, `apps/web/app/worker/node/${name}.ts`),
      ),
      outdir: directory,
      outExtension: { ".js": ".mjs" },
      platform: "node",
      format: "esm",
      target: "node22",
      bundle: true,
      external: ["@libsql/client", "libsql", "css-tree"],
      logLevel: "silent",
    });
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  beforeEach(async () => {
    b = await createTestContainer();
    account = randomUUID();
    const databaseUrl = `file:${String((await b.client.execute("pragma database_list")).rows[0]?.file)}`;
    reader = new LibsqlPublicDiscoverySnapshot(databaseUrl);
    execution = new NodePublicDiscoveryExecution({
      databaseUrl,
      childPath: path.join(directory, "searchSupervisor.mjs"),
      workerPath: path.join(directory, "publicQuery.mjs"),
    });
    c = {
      ...createHollowContainer(b.db, "http://localhost:3000", {
        async send() {},
      }),
      publicDiscovery: execution,
    };
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [
        account,
        `${account}@example.test`,
        "fixture",
        now.getTime(),
        now.getTime(),
      ],
    });
    await b.client.execute({
      sql: "insert into account_public_profiles(account_id,handle,bio,version) values(?,?,?,0)",
      args: [account, "boundary-person", ""],
    });
  });
  afterEach(async () => {
    await execution.stop();
    b.close();
  });
  const get = (url: string) =>
    publicDiscoveryHttp(
      new Request(`http://localhost:3000${url}`, {
        headers: { cookie: `hollow_public_browser=${"b".repeat(43)}` },
      }),
      c,
    );
  it.each([
    ["astral1200", "😀".repeat(1200)],
    ["astral1201", "😀".repeat(1201)],
    ["astral2000", "😀".repeat(2000)],
    ["BMP2000", "あ".repeat(2000)],
  ])("preserves complete legal workspace description %s", async (_label, description) => {
    const fields = workspaceFields({
      name: "boundary",
      description,
      slug: "boundary-workspace",
    });
    const id = randomUUID();
    await b.client.execute({
      sql: "insert into workspaces(id,creator_id,name,description,slug,created_at,state) values(?,?,?,?,?,?,'active')",
      args: [
        id,
        account,
        fields.name,
        fields.description,
        fields.slug,
        now.getTime(),
      ],
    });
    await b.client.execute({
      sql: "insert into workspace_public_settings(workspace_id,page_public,version) values(?,1,0)",
      args: [id],
    });
    const request: PublicDiscoveryRequest = {
      kind: "list",
      scope: { kind: "workspace", slug: "boundary-workspace" },
      conditions: { query: "", tags: [], zone: "UTC" },
    };
    const response = await get("/w/boundary-workspace");
    expect(response?.status).toBe(200);
    expect(await response?.text()).toContain(
      `<p class="pd-description">${description}</p>`,
    );
    expect(await reader.read(request)).toMatchObject({
      kind: "list",
      page: { owner: { description } },
    });
    expect(await execution.execute(request)).toMatchObject({
      kind: "list",
      page: { owner: { description } },
    });
  });
  it.each([
    "😀",
    "あ",
  ])("keeps the existing 2001-codepoint rejection for %s", (character) => {
    expect(() =>
      workspaceFields({
        name: "boundary",
        description: character.repeat(2001),
      }),
    ).toThrowError(expect.objectContaining({ code: "WORKSPACE_DESCRIPTION" }));
  });
  it("paginates 51 matches with legal normalization-expanding query and all 50 tags", async () => {
    const tags = Array.from({ length: 50 }, (_, i) =>
      tagName("𝅘𝅥𝅮".repeat(49) + String.fromCharCode(0x4e00 + i)),
    );
    const query = searchQuery("ﷺ".repeat(200));
    const conditions = publicConditionsSchema.parse({
      query: query.raw,
      tags,
      zone: "Asia/Tokyo",
    });
    const tagIds = tags.map(() => randomUUID());
    for (const [i, name] of tags.entries())
      await b.client.execute({
        sql: "insert into tags(id,scope_key,name,normalized_key,meaning_version) values(?,?,?,?,?)",
        args: [
          tagIds[i] ?? "",
          `p:${account}`,
          name,
          NodeTagNormalizer.key(name),
          NodeTagNormalizer.version,
        ],
      });
    for (let i = 0; i < 51; i++) {
      const note = createNote(
        {
          id: randomUUID(),
          accountId: account,
          title: `boundary ${i}`,
          html: `<p>${query.raw}</p>`,
          text: "",
        },
        now,
      );
      const publicId = randomUUID();
      await c.unitOfWorkProvider.run(async (u) => {
        await u.notes.insert(note);
        await u.browseIndex.save(note.id, note.version, projectNote(note));
        await u.publicNotes.create({
          noteId: note.id,
          publicId,
          urlGeneration: 1,
          accessEpoch: 0,
          createdAt: now,
        });
      });
      await b.client.execute({
        sql: "update note_sharing set visibility='public',link_generation=1,token_hash=?,token_envelope=? where note_id=?",
        args: [`fixture-${publicId}`, `fixture-${publicId}`, note.id],
      });
      await b.client.batch(
        tagIds.map((tagId) => ({
          sql: "insert into note_tags(note_id,tag_id) values(?,?)",
          args: [note.id, tagId],
        })),
        "write",
      );
    }
    const params = new URLSearchParams({ q: query.raw, zone: conditions.zone });
    for (const name of tags) params.append("tag", name);
    expect(params.toString().length).toBeLessThan(32768);
    const request: PublicDiscoveryRequest = {
      kind: "list",
      scope: { kind: "all" },
      conditions,
    };
    const firstResponse = await get(`/discover?${params}`);
    const first = await reader.read(request);
    expect(firstResponse?.status).toBe(200);
    if (first.kind !== "list" || !first.page.nextCursor) throw Error("page");
    expect(first.page.items).toHaveLength(50);
    expect(first.page.total).toBe(51);
    const html = await firstResponse?.text();
    const href = html
      ?.match(/<a rel="next" href="([^"]+)">/)?.[1]
      ?.replaceAll("&amp;", "&");
    if (!href) throw Error("next");
    expect(new URL(href, c.appUrl).search.length).toBeLessThanOrEqual(32768);
    console.info({
      publicCursorBoundary: {
        firstQueryLength: params.toString().length,
        cursorLength: first.page.nextCursor.length,
        nextQueryLength: new URL(href, c.appUrl).search.length,
      },
    });
    const secondResponse = await get(href);
    expect(secondResponse?.status).toBe(200);
    expect(await secondResponse?.text()).toContain("このページ 1 件");
    const next = await execution.execute({
      ...request,
      conditions: { ...conditions, cursor: first.page.nextCursor },
    });
    if (next.kind !== "list") throw Error("page");
    expect(next.page.items).toHaveLength(1);
    expect(next.page.nextCursor).toBeNull();
    expect(
      first.page.items.some((item) => item.path === next.page.items[0]?.path),
    ).toBe(false);
    for (const altered of [
      {
        ...request,
        scope: { kind: "profile" as const, handle: "boundary-person" },
      },
      { ...request, conditions: { ...conditions, query: "boundary" } },
      { ...request, conditions: { ...conditions, tags: tags.slice(0, 49) } },
      { ...request, conditions: { ...conditions, zone: "UTC" } },
      { ...request, conditions: { ...conditions, from: "2026-09-19" } },
      { ...request, conditions: { ...conditions, until: "2026-09-22" } },
    ])
      await expect(
        reader.read({
          ...altered,
          conditions: { ...altered.conditions, cursor: first.page.nextCursor },
        }),
      ).rejects.toMatchObject({ code: "PUBLIC_CURSOR" });
    const changed = JSON.parse(first.page.nextCursor) as Record<
      string,
      unknown
    >;
    changed.identity = "changed";
    await expect(
      reader.read({
        ...request,
        conditions: { ...conditions, cursor: JSON.stringify(changed) },
      }),
    ).rejects.toMatchObject({ code: "PUBLIC_CURSOR" });
    const legacy = JSON.parse(first.page.nextCursor) as Record<string, unknown>;
    delete legacy.version;
    for (const cursor of [
      JSON.stringify(legacy),
      JSON.stringify({ ...legacy, version: 2 }),
    ]) {
      await expect(
        reader.read({ ...request, conditions: { ...conditions, cursor } }),
      ).rejects.toMatchObject({ code: "PUBLIC_CURSOR" });
      const invalid = new URLSearchParams(params);
      invalid.set("cursor", cursor);
      expect((await get(`/discover?${invalid}`))?.status).toBe(422);
    }
  });
});
