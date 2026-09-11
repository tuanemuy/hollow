import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { getAsset } from "@repo/core/application/asset/access";
import { collectMediaGarbage } from "@repo/core/application/asset/collectGarbage";
import { renderNote } from "@repo/core/application/asset/references";
import {
  acceptMediaUpload,
  beginMediaUpload,
  createMediaDraft,
} from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { commitNote } from "@repo/core/application/note/commitNote";
import { getNote } from "@repo/core/application/note/getNote";
import {
  listRevisions,
  renderRevision,
  restoreRevision,
} from "@repo/core/application/note/history";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import { getWysContext } from "@repo/core/application/note/wysContext";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import {
  controlReference,
  readReferences,
} from "@repo/core/application/reference/read";
import {
  historyAssetUrl,
  parseAssetUrl,
  parseHistoryAssetUrl,
} from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { editNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mediaHttp } from "../../../../../../apps/web/app/presentation/mediaHttp.node";
import { guardResourceRequest } from "../../../../../../apps/web/app/presentation/resourceRequestGuard.node";
import {
  detectFormat,
  IsolatedDocumentExtractor,
  withParserAdmission,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "../../node/inlineMediaProcessor";
import { FileObjectStorage } from "../../node/objectStorage";
import { NodeReferenceProcessor } from "../../node/reference/referenceProcessor";
import { browseFixture } from "./browseFixture";
import { createTestContainer, type TestContainer } from "./helpers";

const bytes = (text: string) => new TextEncoder().encode(text);
const stream = (data: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(data);
      c.close();
    },
  });
describe("immutable note history and retention scopes", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let dir: string;
  let now: Date;
  let token: string;
  let other: string;
  let resources: Map<string, Uint8Array>;
  let fetched: string[];
  let storage: FileObjectStorage;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-revision-test-"));
    storage = new FileObjectStorage(dir);
    now = new Date("2026-09-06T00:00:00Z");
    resources = new Map();
    fetched = [];
    const mails: string[] = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
      browsing: browseFixture,
      inlineMedia: new IsolatedInlineMediaProcessor(),
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
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
            fetched.push(url);
            const input = resources.get(url);
            if (!input)
              throw new BusinessRuleError("REFERENCE_FETCH", "test missing");
            return {
              body: stream(input),
              finalUrl: url,
              contentType: "application/octet-stream",
            };
          },
        },
        wake() {},
      },
    };
    async function user(email: string) {
      const registered = await signUp(container, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const session = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        registered.browserToken,
      );
      if (!session) throw Error("session");
      return session.token;
    }
    token = await user("revision-a@example.test");
    other = await user("revision-b@example.test");
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  async function run() {
    const job = await container.unitOfWorkProvider.run((c) =>
      c.references.claim(
        now,
        container.tokens.generate(),
        new Date(now.getTime() + 60_000),
      ),
    );
    if (!job || job.state !== "running") throw Error("job");
    await runReferenceJob(container, job, new AbortController().signal);
    return job;
  }
  async function mediaNote() {
    const data = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    const draft = await createMediaDraft(container, token);
    const upload = await beginMediaUpload(container, token, {
      draftId: draft.id,
      name: "photo.png",
      bytes: data.length,
    });
    const accepted = await acceptMediaUpload(
      container,
      token,
      upload.uploadId,
      stream(data),
    );
    const saved = (
      await saveNote(container, token, {
        title: "media",
        html: `<p>old</p><img src="${accepted.asset.url}" alt="photo">`,
        draftId: draft.id,
      })
    ).note;
    const url = container.htmlSanitizer.assetUrls(saved.html)[0];
    const ref = parseAssetUrl(url ?? "");
    if (!ref) throw Error("ref");
    return { saved, ref, data, url: url ?? "" };
  }
  it("keeps current within twenty immutable versions and ignores exact saves", async () => {
    let saved = (
      await saveNote(container, token, { title: "N", html: "<p>0</p>" })
    ).note;
    expect(saved.version).toBe(0);
    for (let i = 1; i <= 20; i++)
      saved = (
        await saveNote(container, token, {
          id: saved.id,
          version: 0,
          title: "N",
          html: `<p>${i}</p>`,
          cause: "autosave",
        })
      ).note;
    const before = await listRevisions(container, token, saved.id);
    expect(before.items).toHaveLength(20);
    expect(before.currentRevisionNo).toBe(21);
    expect(before.items.at(-1)?.revisionNo).toBe(2);
    expect(before.items[0]?.isCurrent).toBe(true);
    const duplicate = (
      await saveNote(container, token, {
        id: saved.id,
        version: 0,
        title: saved.title,
        html: saved.html,
      })
    ).note;
    expect(duplicate.version).toBe(saved.version);
    expect((await listRevisions(container, token, saved.id)).items).toEqual(
      before.items,
    );
    await expect(
      restoreRevision(container, token, {
        noteId: saved.id,
        revisionNo: 21,
        expectedVersion: saved.version,
      }),
    ).rejects.toMatchObject({ code: "REVISION_UNCHANGED" });
  });
  it("does not cancel pending reference work for a same-value save", async () => {
    const saved = (
      await saveNote(container, token, {
        title: "pending",
        html: '<p>x</p><img src="https://public.example/a.png">',
      })
    ).note;
    const before = await readReferences(container, token, saved.id);
    await saveNote(container, token, {
      id: saved.id,
      title: saved.title,
      html: saved.html,
      importReferences: true,
    });
    expect((await readReferences(container, token, saved.id)).job?.id).toBe(
      before.job?.id,
    );
    expect(
      (await listRevisions(container, token, saved.id)).items,
    ).toHaveLength(1);
  });
  it("records display values but not origin-only confirmations", async () => {
    const saved = (
      await saveNote(container, token, { title: "style", html: "<p>x</p>" })
    ).note;
    const explicit = await setDisplayStyle(container, token, {
      id: saved.id,
      style: "default",
    });
    expect(explicit.version).toBe(1);
    expect(
      (await listRevisions(container, token, saved.id)).items,
    ).toHaveLength(1);
    await setDisplayStyle(container, token, {
      id: saved.id,
      style: "original",
    });
    const history = await listRevisions(container, token, saved.id);
    expect(history.currentRevisionNo).toBe(2);
    expect(history.items[0]?.cause).toBe("style");
    const restored = await restoreRevision(container, token, {
      noteId: saved.id,
      revisionNo: 1,
      expectedVersion: 2,
    });
    expect(restored.display).toMatchObject({
      style: "default",
      source: "user",
      initialization: { kind: "complete" },
    });
    expect(
      (await listRevisions(container, token, saved.id)).currentRevisionNo,
    ).toBe(3);
  });
  it("retains removed media beyond seven days without permitting current reads", async () => {
    const { saved, ref } = await mediaNote();
    const newer = (
      await saveNote(container, token, {
        id: saved.id,
        title: "new",
        html: "<p>new</p>",
      })
    ).note;
    await expect(getAsset(container, token, ref)).rejects.toBeDefined();
    const history = {
      scope: "history" as const,
      scopeId: saved.id,
      revisionNo: 1,
      assetId: ref.assetId,
    };
    now = new Date(now.getTime() + 8 * 86400_000);
    await collectMediaGarbage(container);
    const asset = await getAsset(container, token, history);
    expect(asset.unreferencedAt).toBeNull();
    const rendered = await renderRevision(container, token, {
      noteId: saved.id,
      revisionNo: 1,
    });
    expect(rendered.assetUrls).toContain(historyAssetUrl(history));
    expect(
      (
        await renderNote(container, token, {
          noteId: saved.id,
          html: saved.html,
        })
      ).assetUrls,
    ).toHaveLength(0);
    const restored = await restoreRevision(container, token, {
      noteId: saved.id,
      revisionNo: 1,
      expectedVersion: newer.version,
    });
    expect(restored.html).toBe(saved.html);
    expect(await getAsset(container, token, ref)).toMatchObject({
      id: ref.assetId,
    });
    expect(
      (await listRevisions(container, token, saved.id)).currentRevisionNo,
    ).toBe(3);
  });
  it("authorizes history before HEAD/Range/416 and refuses other scopes and pruning", async () => {
    const { saved, ref } = await mediaNote();
    await saveNote(container, token, {
      id: saved.id,
      title: "new",
      html: "<p>new</p>",
    });
    const url = historyAssetUrl({
      scope: "history",
      scopeId: saved.id,
      revisionNo: 1,
      assetId: ref.assetId,
    });
    const request = (session: string | null, method = "GET", range?: string) =>
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          ...(session ? { cookie: `hollow_session=${session}` } : {}),
          ...(range ? { range } : {}),
        },
      });
    expect((await mediaHttp(request(token), container))?.status).toBe(200);
    expect((await mediaHttp(request(token, "HEAD"), container))?.status).toBe(
      200,
    );
    expect(
      (await mediaHttp(request(token, "GET", "bytes=0-4"), container))?.status,
    ).toBe(206);
    expect(
      (await mediaHttp(request(token, "HEAD", "bytes=999999999-"), container))
        ?.status,
    ).toBe(416);
    expect(
      (await mediaHttp(request(null, "HEAD", "bytes=999999999-"), container))
        ?.status,
    ).not.toBe(416);
    await expect(
      getAsset(container, other, {
        scope: "history",
        scopeId: saved.id,
        revisionNo: 1,
        assetId: ref.assetId,
      }),
    ).rejects.toBeDefined();
    await expect(
      getAsset(container, token, {
        scope: "history",
        scopeId: saved.id,
        revisionNo: 2,
        assetId: ref.assetId,
      }),
    ).rejects.toBeDefined();
    expect(
      parseHistoryAssetUrl(url.replace("/revisions/1/", "/revisions/0/")),
    ).toBeNull();
    for (const site of ["cross-site", "same-site"])
      expect(
        (
          await guardResourceRequest(
            new Request(`http://localhost:3000${url}`, {
              headers: { "Sec-Fetch-Dest": "image", "Sec-Fetch-Site": site },
            }),
          )
        )?.status,
      ).toBe(403);
    expect(
      await guardResourceRequest(
        new Request(`http://localhost:3000${url}`, {
          headers: {
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Site": "same-origin",
          },
        }),
      ),
    ).toBeNull();
    await expect(
      saveNote(container, token, {
        id: saved.id,
        title: "bad",
        html: `<img src="${url}">`,
      }),
    ).rejects.toBeDefined();
    for (let i = 0; i < 20; i++)
      await saveNote(container, token, {
        id: saved.id,
        title: `prune${i}`,
        html: "<p>new</p>",
      });
    expect((await mediaHttp(request(token), container))?.status).toBe(404);
  });
  it("starts collection grace at the last pin removal and retains quota on deletion failure", async () => {
    const { saved, ref } = await mediaNote();
    const asset = await getAsset(container, token, ref);
    const usage = await container.unitOfWorkProvider.run((c) =>
      c.assets.reservedAndUsedBytes(asset.accountId, now),
    );
    for (let i = 0; i < 19; i++)
      await saveNote(container, token, {
        id: saved.id,
        title: `sameasset${i}`,
        html: saved.html,
      });
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.assets.reservedAndUsedBytes(asset.accountId, now),
      ),
    ).toBe(usage);
    await saveNote(container, token, {
      id: saved.id,
      title: "removed",
      html: "<p>removed</p>",
    });
    now = new Date(now.getTime() + 8 * 86400_000);
    await collectMediaGarbage(container);
    expect(
      await container.unitOfWorkProvider.run((c) => c.assets.find(asset.id)),
    ).not.toBeNull();
    for (let i = 0; i < 20; i++)
      await saveNote(container, token, {
        id: saved.id,
        title: `prune${i}`,
        html: "<p>removed</p>",
      });
    expect(
      (await container.unitOfWorkProvider.run((c) => c.assets.find(asset.id)))
        ?.unreferencedAt,
    ).toEqual(now);
    const start = now;
    await saveNote(container, token, {
      id: saved.id,
      title: "prune19",
      html: "<p>removed</p>",
    });
    expect(
      (await container.unitOfWorkProvider.run((c) => c.assets.find(asset.id)))
        ?.unreferencedAt,
    ).toEqual(start);
    now = new Date(start.getTime() + 7 * 86400_000 - 1);
    await collectMediaGarbage(container);
    expect(
      await container.unitOfWorkProvider.run((c) => c.assets.find(asset.id)),
    ).not.toBeNull();
    now = new Date(now.getTime() + 2);
    const remove = vi
      .spyOn(storage, "remove")
      .mockRejectedValueOnce(Error("disk busy"));
    await expect(collectMediaGarbage(container)).rejects.toThrow("disk busy");
    expect(
      (await container.unitOfWorkProvider.run((c) => c.assets.find(asset.id)))
        ?.state,
    ).toBe("deleting");
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.assets.reservedAndUsedBytes(asset.accountId, now),
      ),
    ).toBe(usage);
    remove.mockRestore();
    await collectMediaGarbage(container);
    expect(
      await container.unitOfWorkProvider.run((c) => c.assets.find(asset.id)),
    ).toBeNull();
  });
  it("restores an old CSS snapshot instead of the current resource at the same URL", async () => {
    const url = "https://public.example/style.css";
    resources.set(url, bytes("p{color:blue}"));
    const initial = (
      await saveNote(container, token, {
        title: "blue",
        html: `<link rel="stylesheet" href="${url}"><p>body</p>`,
      })
    ).note;
    await run();
    const blue = await getNote(container, token, initial.id);
    const selected = (await listRevisions(container, token, initial.id))
      .currentRevisionNo;
    await saveNote(container, token, {
      id: initial.id,
      title: "removed",
      html: "<p>body</p>",
    });
    resources.set(url, bytes("p{color:red}"));
    await saveNote(container, token, {
      id: initial.id,
      title: "red",
      html: `<link rel="stylesheet" href="${url}"><p>body</p>`,
    });
    await run();
    const red = await getNote(container, token, initial.id);
    expect(red.html).toContain("red");
    await controlReference(container, token, {
      noteId: initial.id,
      action: "off",
    });
    const fetchedBefore = fetched.length;
    const restored = await restoreRevision(container, token, {
      noteId: initial.id,
      revisionNo: selected,
      expectedVersion: red.version,
    });
    expect(restored.html).toBe(blue.html);
    expect(fetched).toHaveLength(fetchedBefore);
    const ledger = await readReferences(container, token, initial.id);
    expect(ledger.enabled).toBe(false);
    expect(ledger.job).toBeNull();
    expect(
      ledger.entries.filter((e) => e.current && e.state === "acquired"),
    ).toHaveLength(1);
  });
  it("rejects stale restore confirmation and current authorization loss without partial history", async () => {
    const first = (
      await saveNote(container, token, { title: "first", html: "<p>first</p>" })
    ).note;
    const second = (
      await saveNote(container, token, {
        id: first.id,
        title: "second",
        html: "<p>second</p>",
      })
    ).note;
    await saveNote(container, token, {
      id: first.id,
      title: "third",
      html: "<p>third</p>",
    });
    await expect(
      restoreRevision(container, token, {
        noteId: first.id,
        revisionNo: 1,
        expectedVersion: second.version,
      }),
    ).rejects.toMatchObject({ code: "NOTE_CONFLICT" });
    await expect(
      restoreRevision(container, other, {
        noteId: first.id,
        revisionNo: 1,
        expectedVersion: 2,
      }),
    ).rejects.toBeDefined();
    expect(
      (await listRevisions(container, token, first.id)).items,
    ).toHaveLength(3);
  });
  it("rolls note, revision, current pins and prune back together", async () => {
    const { saved, ref } = await mediaNote();
    const projection = await browseFixture.projection.project({
      title: "bad",
      html: "<p>bad</p>",
    });
    let reached = false;
    await expect(
      container.unitOfWorkProvider.run(async (c) => {
        const previous = await c.notes.findById(saved.id);
        if (!previous) throw Error("note");
        await commitNote(container, c, {
          previous,
          note: editNote(previous, "bad", "<p>bad</p>", now),
          projection,
          actor: { kind: "system" },
          cause: "reference",
          afterCurrent: async () => {
            reached = true;
            throw Error("injected");
          },
        });
      }),
    ).rejects.toMatchObject({ code: "DATABASE_ERROR" });
    expect(reached).toBe(true);
    expect((await getNote(container, token, saved.id)).html).toBe(saved.html);
    expect(
      (await listRevisions(container, token, saved.id)).items,
    ).toHaveLength(1);
    expect(await getAsset(container, token, ref)).toMatchObject({
      unreferencedAt: null,
    });
  });
  it("keeps distinct human actors across system revisions and requires a fresh exact confirmation", async () => {
    const first = (
      await saveNote(container, token, { title: "first", html: "<p>first</p>" })
    ).note;
    const actorProjection = await browseFixture.projection.project({
      title: "actor B",
      html: first.html,
    });
    await container.unitOfWorkProvider.run(async (c) => {
      const previous = await c.notes.findById(first.id);
      if (!previous) throw Error("note");
      await commitNote(container, c, {
        previous,
        note: editNote(previous, "actor B", previous.html, now),
        projection: actorProjection,
        actor: { kind: "user", accountId: "future-shared-actor" },
        cause: "manual",
      });
    });
    await expect(
      saveNote(container, token, {
        id: first.id,
        version: 0,
        title: "mine",
        html: "<p>mine</p>",
      }),
    ).rejects.toMatchObject({ code: "NOTE_CONFLICT" });
    const confirmed = (
      await saveNote(container, token, {
        id: first.id,
        version: 0,
        confirmedVersion: 1,
        title: "mine",
        html: "<p>mine</p>",
      })
    ).note;
    for (let i = 0; i < 21; i++) {
      const systemProjection = await browseFixture.projection.project({
        title: `system${i}`,
        html: confirmed.html,
      });
      await container.unitOfWorkProvider.run(async (c) => {
        const previous = await c.notes.findById(first.id);
        if (!previous) throw Error("note");
        await commitNote(container, c, {
          previous,
          note: editNote(previous, `system${i}`, previous.html, now),
          projection: systemProjection,
          actor: { kind: "system" },
          cause: "reference",
        });
      });
    }
    expect(
      (await listRevisions(container, token, first.id)).items,
    ).toHaveLength(20);
    expect(
      (
        await container.unitOfWorkProvider.run((c) =>
          c.revisions.head(first.id),
        )
      )?.actors,
    ).toHaveLength(2);
    await expect(
      saveNote(container, token, {
        id: first.id,
        version: 0,
        confirmedVersion: confirmed.version,
        title: "stale",
        html: "<p>stale</p>",
      }),
    ).rejects.toMatchObject({ code: "NOTE_CONFLICT" });
    const latest = await getNote(container, token, first.id);
    await saveNote(container, token, {
      id: first.id,
      version: 0,
      confirmedVersion: latest.version,
      title: "confirmed again",
      html: "<p>safe</p>",
    });
  });
  it("revalidates small data payloads and does not trust a history number in arbitrary preview HTML", async () => {
    const png = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    const uri = `data:image/png;base64,${png.toString("base64")}`;
    const first = (
      await saveNote(container, token, {
        title: "data",
        html: `<img src="${uri}">`,
      })
    ).note;
    await run();
    const selected = (await listRevisions(container, token, first.id))
      .currentRevisionNo;
    const removed = (
      await saveNote(container, token, {
        id: first.id,
        title: "removed",
        html: "<p>removed</p>",
      })
    ).note;
    if (!container.inlineMedia) throw Error("processor");
    const inspect = vi.spyOn(container.inlineMedia, "inspect");
    expect(
      (
        await renderRevision(container, token, {
          noteId: first.id,
          revisionNo: selected,
        })
      ).assetUrls,
    ).toContain(uri);
    expect(inspect).toHaveBeenCalledTimes(1);
    const restored = await restoreRevision(container, token, {
      noteId: first.id,
      revisionNo: selected,
      expectedVersion: removed.version,
    });
    expect(restored.html).toContain(uri);
    expect(inspect).toHaveBeenCalledTimes(2);
    expect((await readReferences(container, token, first.id)).job).toBeNull();
    const abort = new AbortController();
    abort.abort();
    await expect(
      renderRevision(
        container,
        token,
        { noteId: first.id, revisionNo: selected },
        abort.signal,
      ),
    ).rejects.toBeDefined();
  });
  it("cancels a history inspection waiting for admission and permits the following real inspection", async () => {
    const png = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    const uri = `data:image/png;base64,${png.toString("base64")}`;
    const first = (
      await saveNote(container, token, {
        title: "data",
        html: `<img src="${uri}">`,
      })
    ).note;
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holds = [
      withParserAdmission(() => held),
      withParserAdmission(() => held),
    ];
    const abort = new AbortController();
    if (!container.inlineMedia) throw Error("processor");
    const inspect = vi.spyOn(container.inlineMedia, "inspect");
    try {
      const waiting = renderRevision(
        container,
        token,
        { noteId: first.id, revisionNo: 1 },
        abort.signal,
      );
      const rejected = expect(waiting).rejects.toMatchObject({
        code: "IMPORT_TIMEOUT",
      });
      await vi.waitFor(() => expect(inspect).toHaveBeenCalledOnce());
      abort.abort();
      await rejected;
    } finally {
      release();
      await Promise.all(holds);
    }
    expect(
      (
        await renderRevision(container, token, {
          noteId: first.id,
          revisionNo: 1,
        })
      ).assetUrls,
    ).toContain(uri);
    expect(
      (await listRevisions(container, token, first.id)).items,
    ).toHaveLength(1);
  });
  async function migrateBaseline() {
    const sql = await readFile(
      new URL("../migrations/0007_fast_menace.sql", import.meta.url),
      "utf8",
    );
    const transaction = await base.client.transaction("write");
    try {
      await transaction.executeMultiple(
        "DELETE FROM note_asset_references WHERE version>0; DROP TABLE note_revisions; DROP TABLE note_revision_heads;",
      );
      await transaction.executeMultiple(sql);
      await transaction.executeMultiple(
        await readFile(
          new URL("../migrations/0008_wys_origin.sql", import.meta.url),
          "utf8",
        ),
      );
      await transaction.commit();
    } finally {
      transaction.close();
    }
  }
  it("keeps pre-WYS media pins and restores through the authorized history path while clearing origin", async () => {
    const { saved, ref } = await mediaNote();
    const origin = (await getWysContext(container, token, saved.id))
      .currentRevision;
    if (!origin) throw Error("origin");
    const converted = await saveNote(container, token, {
      id: saved.id,
      title: saved.title,
      html: "<p>converted without image</p>",
      wysOrigin: origin,
    });
    expect(converted.wysContext.origin).toEqual({
      revisionNo: 1,
      available: true,
    });
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.assets.referenceIds(saved.id, 0),
      ),
    ).toEqual([]);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.assets.referenceIds(saved.id, 1),
      ),
    ).toEqual([ref.assetId]);
    await expect(getAsset(container, token, ref)).rejects.toBeDefined();
    await expect(
      getAsset(container, other, {
        scope: "history",
        scopeId: saved.id,
        revisionNo: 1,
        assetId: ref.assetId,
      }),
    ).rejects.toBeDefined();
    const restored = await restoreRevision(container, token, {
      noteId: saved.id,
      revisionNo: 1,
      expectedVersion: converted.note.version,
    });
    expect(restored.html).toBe(saved.html);
    expect(restored.wysContext.origin).toBeNull();
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.assets.referenceIds(saved.id, 0),
      ),
    ).toEqual([ref.assetId]);
    expect(
      (await listRevisions(container, token, saved.id)).items,
    ).toHaveLength(3);
  });
  it("fails closed on a corrupt stored data payload without changing current content or acquisition state", async () => {
    const first = (
      await saveNote(container, token, {
        title: "broken data",
        html: '<img src="data:image/gif;base64,R0lGODlhAQABAA==">',
      })
    ).note;
    const current = (
      await saveNote(container, token, {
        id: first.id,
        title: "safe current",
        html: "<p>current</p>",
      })
    ).note;
    const before = await readReferences(container, token, first.id);
    await expect(
      renderRevision(container, token, { noteId: first.id, revisionNo: 1 }),
    ).rejects.toMatchObject({ code: "MEDIA_CORRUPT" });
    await expect(
      restoreRevision(container, token, {
        noteId: first.id,
        revisionNo: 1,
        expectedVersion: current.version,
      }),
    ).rejects.toMatchObject({ code: "MEDIA_CORRUPT" });
    expect((await getNote(container, token, first.id)).html).toBe(current.html);
    expect(
      (await listRevisions(container, token, first.id)).items,
    ).toHaveLength(2);
    expect(await readReferences(container, token, first.id)).toEqual(before);
  });
  it("does not append an old reference result after restoration supersedes its version", async () => {
    const first = (
      await saveNote(container, token, { title: "first", html: "<p>first</p>" })
    ).note;
    const current = (
      await saveNote(container, token, {
        id: first.id,
        title: "waiting",
        html: '<p>waiting</p><link rel="stylesheet" href="https://public.example/late.css">',
      })
    ).note;
    const old = await container.unitOfWorkProvider.run((c) =>
      c.references.claim(
        now,
        container.tokens.generate(),
        new Date(now.getTime() + 60_000),
      ),
    );
    if (!old || old.state !== "running") throw Error("claim");
    await restoreRevision(container, token, {
      noteId: first.id,
      revisionNo: 1,
      expectedVersion: current.version,
    });
    resources.set("https://public.example/late.css", bytes("p{color:red}"));
    await runReferenceJob(container, old, new AbortController().signal);
    expect((await getNote(container, token, first.id)).html).toBe(first.html);
    expect(
      (await listRevisions(container, token, first.id)).items,
    ).toHaveLength(3);
    expect(fetched).toHaveLength(0);
  });
  it("does not commit or keep an acquired result after the restore deadline expires during DNS", async () => {
    const first = (
      await saveNote(container, token, {
        title: "background",
        html: '<p style="background-image:url(https://public.example/background.png)">old</p>',
      })
    ).note;
    const current = (
      await saveNote(container, token, {
        id: first.id,
        title: "new",
        html: "<p>new</p>",
      })
    ).note;
    const abort = new AbortController();
    if (!container.referencing) throw Error("reference adapter");
    vi.spyOn(
      container.referencing.fetcher,
      "inspectMany",
    ).mockImplementationOnce(async (urls, options) => {
      expect(options?.signal).toBe(abort.signal);
      abort.abort();
      return urls.map((url) => ({
        url,
        allowed: false,
        reason: "REFERENCE_CANCELLED",
      }));
    });
    await expect(
      restoreRevision(
        container,
        token,
        { noteId: first.id, revisionNo: 1, expectedVersion: current.version },
        abort.signal,
      ),
    ).rejects.toMatchObject({ code: "MEDIA_TIMEOUT" });
    expect((await getNote(container, token, first.id)).html).toBe(current.html);
    expect(
      (await listRevisions(container, token, first.id)).items,
    ).toHaveLength(2);
  });
  it("migrates version 37 to revision 1 using current pins without changing existing note or asset bytes", async () => {
    const { saved, ref } = await mediaNote();
    await base.client.execute({
      sql: "UPDATE notes SET version=37 WHERE id=?",
      args: [saved.id],
    });
    const before = (
      await base.client.execute({
        sql: "SELECT * FROM notes WHERE id=?",
        args: [saved.id],
      })
    ).rows;
    const assets = (await base.client.execute("SELECT * FROM assets")).rows;
    await migrateBaseline();
    expect(
      (
        await base.client.execute({
          sql: "SELECT * FROM notes WHERE id=?",
          args: [saved.id],
        })
      ).rows,
    ).toEqual(before);
    expect((await base.client.execute("SELECT * FROM assets")).rows).toEqual(
      assets,
    );
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.assets.referenceIds(saved.id, 1),
      ),
    ).toEqual([ref.assetId]);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.assets.referenceIds(saved.id, 37),
      ),
    ).toEqual([]);
    expect(
      (await listRevisions(container, token, saved.id)).items,
    ).toMatchObject([
      { revisionNo: 1, actorKind: "legacy", cause: "baseline" },
    ]);
    await expect(
      saveNote(container, token, {
        id: saved.id,
        version: 0,
        title: "old tab",
        html: saved.html,
      }),
    ).rejects.toMatchObject({ code: "NOTE_CONFLICT" });
    await saveNote(container, token, {
      id: saved.id,
      version: 0,
      confirmedVersion: 37,
      title: "confirmed",
      html: saved.html,
    });
    expect(
      (await listRevisions(container, token, saved.id)).currentRevisionNo,
    ).toBe(2);
  });
  it("aborts baseline migration on an invalid current relationship without manufacturing a pin from HTML markers", async () => {
    const { saved, ref } = await mediaNote();
    const unrelated = (
      await saveNote(container, token, {
        title: "unrelated",
        html: "<p>no asset</p>",
      })
    ).note;
    await base.client.execute({
      sql: "INSERT INTO note_asset_references(note_id,asset_id,version) VALUES(?,?,0)",
      args: [unrelated.id, ref.assetId],
    });
    await expect(migrateBaseline()).rejects.toBeDefined();
    expect(
      (await listRevisions(container, token, saved.id)).items,
    ).toHaveLength(1);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.assets.referenceIds(unrelated.id, 1),
      ),
    ).toEqual([]);
  });
  it("rejects deleting assets despite stale history pins and rolls back restoration", async () => {
    const { saved, ref } = await mediaNote();
    const current = (
      await saveNote(container, token, {
        id: saved.id,
        title: "removed",
        html: "<p>removed</p>",
      })
    ).note;
    await base.client.execute({
      sql: "UPDATE assets SET state='deleting' WHERE id=?",
      args: [ref.assetId],
    });
    await expect(
      restoreRevision(container, token, {
        noteId: saved.id,
        revisionNo: 1,
        expectedVersion: current.version,
      }),
    ).rejects.toBeDefined();
    await expect(
      getAsset(container, token, {
        scope: "history",
        scopeId: saved.id,
        revisionNo: 1,
        assetId: ref.assetId,
      }),
    ).rejects.toBeDefined();
    expect((await getNote(container, token, saved.id)).version).toBe(
      current.version,
    );
    expect(
      (await listRevisions(container, token, saved.id)).items,
    ).toHaveLength(2);
  });
});
