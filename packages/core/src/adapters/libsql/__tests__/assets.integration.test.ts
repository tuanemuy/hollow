import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signOut } from "@repo/core/application/account/session";
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
import { beginUpload } from "@repo/core/application/import/beginUpload";
import { listImports } from "@repo/core/application/import/readImports";
import { getNote } from "@repo/core/application/note/getNote";
import { saveNote } from "@repo/core/application/note/saveNote";
import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { IMPORT_LIMITS } from "@repo/core/domain/import/entity";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mediaHttp } from "../../../../../../apps/web/app/presentation/mediaHttp.node";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "../../node/inlineMediaProcessor";
import { FileObjectStorage } from "../../node/objectStorage";
import {
  assets,
  mediaUploads,
  notes,
  uploadReservations,
} from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

const stream = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
const image = () =>
  readFile(
    new URL(
      "../../node/import/__tests__/fixtures/media-valid.png",
      import.meta.url,
    ),
  );
describe("private assets, drafts, capacity and storage lifecycle", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let storage: FileObjectStorage;
  let directory: string;
  let now: Date;
  let token: string;
  let otherToken: string;
  beforeEach(async () => {
    base = await createTestContainer();
    directory = await mkdtemp(path.join(os.tmpdir(), "hollow-asset-test-"));
    storage = new FileObjectStorage(directory);
    now = new Date("2026-09-06T00:00:00Z");
    const mails: string[] = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
      inlineMedia: new IsolatedInlineMediaProcessor(),
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
    };
    async function user(email: string) {
      const registration = await signUp(container, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw new Error("Missing mail");
      const session = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        registration.browserToken,
      );
      if (!session) throw new Error("No session");
      return session.token;
    }
    token = await user("media-a@example.test");
    otherToken = await user("media-b@example.test");
  });
  afterEach(async () => {
    base.close();
    await rm(directory, { recursive: true, force: true });
  });
  async function upload(bytes?: Uint8Array, name = "photo.png") {
    const input = bytes ?? (await image());
    const draft = await createMediaDraft(container, token);
    const reservation = await beginMediaUpload(container, token, {
      draftId: draft.id,
      name,
      bytes: input.length,
    });
    const result = await acceptMediaUpload(
      container,
      token,
      reservation.uploadId,
      stream(input),
    );
    return { ...result, draft, input };
  }
  const ref = (url: string) => {
    const reference = parseAssetUrl(url);
    if (!reference) throw new Error("Bad URL");
    return reference;
  };
  async function http(
    url: string,
    session: string | null = token,
    method = "GET",
    range?: string,
  ) {
    const result = await mediaHttp(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          ...(session ? { cookie: `hollow_session=${session}` } : {}),
          ...(range ? { Range: range } : {}),
        },
      }),
      container,
    );
    if (!result) throw new Error("Not handled");
    return result;
  }
  it("creates no note for upload alone, then atomically binds a media-only note with stable URLs", async () => {
    const item = await upload();
    expect(await base.db.select().from(notes)).toHaveLength(0);
    expect((await http(item.asset.url)).status).toBe(200);
    const saved = await saveNote(container, token, {
      title: "",
      html: `<p><img src="${item.asset.url}" alt="日本語"></p>`,
      draftId: item.draft.id,
    });
    expect(saved.note.title).toBe("無題");
    expect(saved.note.html).not.toContain("/drafts/");
    expect(saved.note.html).toContain(
      `/api/notes/${saved.note.id}/assets/${item.asset.id}`,
    );
    expect((await getNote(container, token, saved.note.id)).html).toBe(
      saved.note.html,
    );
    const rendered = await renderNote(container, token, {
      html: saved.note.html,
      noteId: saved.note.id,
    });
    expect(rendered.assetUrls).toHaveLength(1);
    expect(
      await new Response(
        await storage.stream(
          (await getAsset(container, token, ref(rendered.assetUrls[0] ?? "")))
            .storageKey,
        ),
      ).arrayBuffer(),
    ).toEqual(
      item.input.buffer.slice(
        item.input.byteOffset,
        item.input.byteOffset + item.input.byteLength,
      ),
    );
  });
  it("checks user, exact draft and exact note relation on every GET/HEAD/Range including 416", async () => {
    const item = await upload();
    const otherDraft = await createMediaDraft(container, token);
    const otherNote = await saveNote(container, token, {
      title: "other",
      html: "<p>other</p>",
    });
    const wrongUrls = [
      item.asset.url.replace(item.draft.id, otherDraft.id),
      `/api/notes/${otherNote.note.id}/assets/${item.asset.id}`,
    ];
    for (const method of ["GET", "HEAD"]) {
      for (const session of [null, otherToken])
        for (const range of [undefined, "bytes=0-9", "bytes=999999999-"]) {
          const response = await http(item.asset.url, session, method, range);
          expect([401, 404]).toContain(response.status);
          expect(response.headers.get("Content-Range")).toBeNull();
        }
      for (const url of wrongUrls)
        expect((await http(url, token, method, "bytes=0-9")).status).toBe(404);
    }
    expect((await http(item.asset.url, token, "HEAD")).status).toBe(200);
    const partial = await http(item.asset.url, token, "GET", "bytes=0-9");
    expect(partial.status).toBe(206);
    expect((await partial.arrayBuffer()).byteLength).toBe(10);
    const invalid = await http(
      item.asset.url,
      token,
      "HEAD",
      "bytes=999999999-",
    );
    expect(invalid.status).toBe(416);
    expect(await invalid.text()).toBe("");
    expect(partial.headers.get("Content-Type")).toBe("image/png");
    expect(partial.headers.get("Cache-Control")).toBe("private, no-store");
    expect(partial.headers.get("X-Content-Type-Options")).toBe("nosniff");
    await signOut(container, token);
    expect((await http(item.asset.url)).status).toBe(401);
  });
  it("never restores draft staging after first commit and applies current references before GET/HEAD/Range", async () => {
    const item = await upload();
    const draftHtml = `<img src="${item.asset.url}">`;
    const assertReadable = async (readable: boolean, noteId?: string) => {
      for (const method of ["GET", "HEAD"])
        for (const range of [undefined, "bytes=0-9", "bytes=999999999-"]) {
          const response = await http(item.asset.url, token, method, range);
          expect(response.status).toBe(
            readable
              ? range
                ? range.includes("999")
                  ? 416
                  : 206
                : 200
              : 404,
          );
          if (!readable)
            expect(response.headers.get("Content-Range")).toBeNull();
          if (method === "HEAD") expect(await response.text()).toBe("");
          else await response.arrayBuffer();
        }
      expect(
        (
          await renderNote(container, token, {
            html: draftHtml,
            draftId: item.draft.id,
            ...(noteId ? { noteId } : {}),
          })
        ).assetUrls,
      ).toHaveLength(readable ? 1 : 0);
    };
    await assertReadable(true);
    const saved = await saveNote(container, token, {
      title: "",
      html: draftHtml,
      draftId: item.draft.id,
    });
    await assertReadable(true, saved.note.id);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "removed",
      html: "<p>removed</p>",
    });
    await assertReadable(false, saved.note.id);
    expect(
      (
        await container.unitOfWorkProvider.run(({ assets }) =>
          assets.find(item.asset.id),
        )
      )?.committedToNote,
    ).toBe(true);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "reattached",
      html: saved.note.html,
    });
    await assertReadable(true, saved.note.id);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "removed again",
      html: "<p>removed</p>",
    });
    await assertReadable(false, saved.note.id);
    await base.db
      .update(notes)
      .set({ ownerAccountId: null, ownerWorkspaceId: "inaccessible" })
      .where(eq(notes.id, saved.note.id));
    expect((await http(item.asset.url)).status).toBe(404);
    await expect(
      renderNote(container, token, {
        html: draftHtml,
        draftId: item.draft.id,
        noteId: saved.note.id,
      }),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
  });
  it("allows only new unsaved staging on an already bound editor draft, then commits it irreversibly", async () => {
    const saved = await saveNote(container, token, {
      title: "existing",
      html: "<p>existing</p>",
    });
    const draft = await createMediaDraft(container, token, saved.note.id);
    const bytes = await image();
    const reservation = await beginMediaUpload(container, token, {
      draftId: draft.id,
      name: "added.png",
      bytes: bytes.length,
    });
    const item = await acceptMediaUpload(
      container,
      token,
      reservation.uploadId,
      stream(bytes),
    );
    const html = `<img src="${item.asset.url}">`;
    expect((await http(item.asset.url)).status).toBe(200);
    expect(
      (
        await renderNote(container, token, {
          html,
          noteId: saved.note.id,
          draftId: draft.id,
        })
      ).assetUrls,
    ).toHaveLength(1);
    expect(
      (await http(`/api/notes/${saved.note.id}/assets/${item.asset.id}`))
        .status,
    ).toBe(404);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "still staged",
      html: "<p>no media yet</p>",
      draftId: draft.id,
    });
    expect((await http(item.asset.url)).status).toBe(200);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "added",
      html,
      draftId: draft.id,
    });
    expect((await http(item.asset.url)).status).toBe(200);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "removed",
      html: "<p>removed</p>",
    });
    expect((await http(item.asset.url)).status).toBe(404);
    expect(
      (
        await renderNote(container, token, {
          html,
          noteId: saved.note.id,
          draftId: draft.id,
        })
      ).assetUrls,
    ).toHaveLength(0);
    now = new Date(now.getTime() + 24 * 3600_000);
    await expect(
      beginMediaUpload(container, token, {
        draftId: draft.id,
        name: "expired.png",
        bytes: bytes.length,
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
    await expect(
      getAsset(container, token, ref(item.asset.url)),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
  });
  it("does not let another note borrow assets, and preserves relation changes under later-save-wins", async () => {
    const item = await upload();
    const saved = await saveNote(container, token, {
      title: "image",
      html: `<img src="${item.asset.url}">`,
      draftId: item.draft.id,
    });
    const url = `/api/notes/${saved.note.id}/assets/${item.asset.id}`;
    await expect(
      saveNote(container, token, { title: "copy", html: saved.note.html }),
    ).rejects.toMatchObject({ code: "MEDIA_REFERENCE" });
    await expect(
      saveNote(container, otherToken, {
        id: saved.note.id,
        title: "bad",
        html: "",
      }),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await Promise.all([
      saveNote(container, token, {
        id: saved.note.id,
        version: 0,
        title: "one",
        html: saved.note.html,
      }),
      saveNote(container, token, {
        id: saved.note.id,
        version: 0,
        title: "two",
        html: "<p>removed</p>",
      }),
    ]);
    expect((await getNote(container, token, saved.note.id)).title).toBe("two");
    expect((await http(url)).status).toBe(404);
    expect(
      (
        await renderNote(container, token, {
          noteId: saved.note.id,
          html: `<img src="${url}">`,
        })
      ).assetUrls,
    ).toEqual([]);
  });
  it("keeps current and retained revision pins, then fences GC after pruning and retries deletion after crash", async () => {
    const item = await upload();
    const saved = await saveNote(container, token, {
      title: "image",
      html: `<img src="${item.asset.url}">`,
      draftId: item.draft.id,
    });
    await saveNote(container, token, {
      id: saved.note.id,
      title: "removed",
      html: "<p>text</p>",
    });
    now = new Date(now.getTime() + 8 * 86400_000);
    await collectMediaGarbage(container);
    expect(await base.db.select().from(assets)).toHaveLength(1);
    for (let i = 0; i < 20; i++)
      await saveNote(container, token, {
        id: saved.note.id,
        title: `prune-${i}`,
        html: "<p>text</p>",
      });
    now = new Date(now.getTime() + 8 * 86400_000);
    const garbage = await container.unitOfWorkProvider.run(({ assets }) =>
      assets.collectGarbage(now),
    );
    expect(garbage.assets).toHaveLength(1);
    await expect(
      getAsset(container, token, ref(item.asset.url)),
    ).rejects.toBeDefined();
    const target = garbage.assets[0];
    if (!target) throw new Error("No garbage");
    await storage.remove(target.storageKey);
    await collectMediaGarbage(container);
    expect(await base.db.select().from(assets)).toHaveLength(0);
  });
  it("reattaches only the same bound note within the grace period without reviving expired draft upload access", async () => {
    const item = await upload();
    const saved = await saveNote(container, token, {
      title: "image",
      html: `<img src="${item.asset.url}">`,
      draftId: item.draft.id,
    });
    const other = await saveNote(container, token, {
      title: "other",
      html: "<p>other</p>",
    });
    const unbound = await upload();
    const url = `/api/notes/${saved.note.id}/assets/${item.asset.id}`;
    await saveNote(container, token, {
      id: saved.note.id,
      title: "A removed",
      html: "<p>A</p>",
    });
    expect((await http(url)).status).toBe(404);
    now = new Date(now.getTime() + 2 * 86400_000);
    await expect(
      beginMediaUpload(container, token, {
        draftId: item.draft.id,
        name: "new.png",
        bytes: 1,
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
    for (const html of [
      `<img src="/api/notes/${other.note.id}/assets/${item.asset.id}">`,
      `<img src="/api/notes/${other.note.id}/assets/${unbound.asset.id}">`,
    ])
      await expect(
        saveNote(container, token, {
          id: other.note.id,
          title: "borrow",
          html,
        }),
      ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
    await saveNote(container, token, {
      id: saved.note.id,
      version: 0,
      title: "B later",
      html: saved.note.html,
    });
    expect((await getNote(container, token, saved.note.id)).title).toBe(
      "B later",
    );
    expect((await http(url)).status).toBe(200);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "removed again",
      html: "<p>text</p>",
    });
    await base.db
      .update(assets)
      .set({ state: "deleting" })
      .where(eq(assets.id, item.asset.id));
    await expect(
      saveNote(container, token, {
        id: saved.note.id,
        title: "late",
        html: saved.note.html,
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
    await base.db
      .update(assets)
      .set({ state: "ready" })
      .where(eq(assets.id, item.asset.id));
    for (let i = 0; i < 20; i++)
      await saveNote(container, token, {
        id: saved.note.id,
        title: `prune-${i}`,
        html: "<p>text</p>",
      });
    now = new Date(now.getTime() + 7 * 86400_000);
    await expect(
      saveNote(container, token, {
        id: saved.note.id,
        title: "expired",
        html: saved.note.html,
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
    await collectMediaGarbage(container);
    await expect(
      saveNote(container, token, {
        id: saved.note.id,
        title: "deleted",
        html: saved.note.html,
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
  });
  it("adds original reservations and media bytes under a serialized quota race", async () => {
    const item = await upload();
    const batch = await beginUpload(container, token, {
      files: [{ name: "reserved.txt", bytes: 1 }],
      useAi: false,
    });
    await base.db
      .update(uploadReservations)
      .set({ bytes: IMPORT_LIMITS.quotaBytes - item.asset.bytes - 1 })
      .where(eq(uploadReservations.id, batch.files[0]?.id ?? ""));
    const results = await Promise.allSettled([
      beginUpload(container, token, {
        files: [{ name: "last.txt", bytes: 1 }],
        useAi: false,
      }),
      beginMediaUpload(container, token, {
        draftId: item.draft.id,
        name: "last.png",
        bytes: 1,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await listImports(container, token)).usedBytes).toBe(
      IMPORT_LIMITS.quotaBytes,
    );
  });
  it("backfills legacy bound assets conservatively without deleting objects or revoking unbound staging", async () => {
    const current = await upload();
    const saved = await saveNote(container, token, {
      title: "current",
      html: `<img src="${current.asset.url}">`,
      draftId: current.draft.id,
    });
    const removed = await upload();
    const removedNote = await saveNote(container, token, {
      title: "removed",
      html: `<img src="${removed.asset.url}">`,
      draftId: removed.draft.id,
    });
    await saveNote(container, token, {
      id: removedNote.note.id,
      title: "removed",
      html: "<p>removed</p>",
    });
    const staged = await upload();
    const legacyBoundStaging = await upload();
    await container.unitOfWorkProvider.run(({ assets }) =>
      assets.bindDraft(legacyBoundStaging.draft.id, saved.note.id),
    );
    await base.client.execute(
      "ALTER TABLE assets DROP COLUMN committed_to_note",
    );
    const migration = await readFile(
      new URL("../migrations/0004_previous_garia.sql", import.meta.url),
      "utf8",
    );
    for (const statement of migration.split("--> statement-breakpoint"))
      await base.client.execute(statement);
    const rows = await base.db.select().from(assets);
    expect(rows).toHaveLength(4);
    expect(
      rows
        .filter((r) => r.committedToNote)
        .map((r) => r.id)
        .sort(),
    ).toEqual(
      [current.asset.id, removed.asset.id, legacyBoundStaging.asset.id].sort(),
    );
    expect((await http(current.asset.url)).status).toBe(200);
    expect((await http(removed.asset.url)).status).toBe(404);
    expect((await http(staged.asset.url)).status).toBe(200);
    expect((await http(legacyBoundStaging.asset.url)).status).toBe(404);
    for (const row of rows)
      expect((await storage.stat(row.storageKey)).bytes).toBe(row.bytes);
    expect((await getNote(container, token, saved.note.id)).html).toBe(
      saved.note.html,
    );
  });
  it("retains failed upload cleanup accounting until deletion and keeps draft expiry from late commit", async () => {
    const draft = await createMediaDraft(container, token);
    const bytes = await image();
    const row = await beginMediaUpload(container, token, {
      draftId: draft.id,
      name: "image.png",
      bytes: bytes.length,
    });
    const originalRemove = storage.remove.bind(storage);
    storage.remove = async () => {
      throw new Error("disk busy");
    };
    await expect(
      acceptMediaUpload(
        container,
        token,
        row.uploadId,
        stream(new Uint8Array(bytes.length + 1)),
      ),
    ).rejects.toBeDefined();
    expect((await listImports(container, token)).usedBytes).toBe(bytes.length);
    storage.remove = originalRemove;
    await collectMediaGarbage(container);
    expect((await listImports(container, token)).usedBytes).toBe(0);
    const next = await beginMediaUpload(container, token, {
      draftId: draft.id,
      name: "image.png",
      bytes: bytes.length,
    });
    const processor = container.inlineMedia;
    if (!processor) throw new Error("No processor");
    container = {
      ...container,
      inlineMedia: {
        async inspect(input) {
          const result = await processor.inspect(input);
          now = new Date(now.getTime() + 25 * 3600_000);
          return result;
        },
      },
    };
    await expect(
      acceptMediaUpload(container, token, next.uploadId, stream(bytes)),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
    expect(await base.db.select().from(assets)).toHaveLength(0);
    expect(await base.db.select().from(notes)).toHaveLength(0);
    expect(
      (await base.db.select().from(mediaUploads)).every(
        (x) => x.state === "failed" && x.storageCleaned,
      ),
    ).toBe(true);
  });
  it("stores sanitized SVG only and streams directly with a restrictive response policy", async () => {
    const source = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="green" onclick="alert(1)"/><script>parent.bad=1</script><foreignObject><p>unsafe</p></foreignObject></svg>',
    );
    const item = await upload(source, "image.svg");
    expect(item.removed.length).toBeGreaterThan(0);
    const response = await http(item.asset.url);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "script-src 'none'",
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "sandbox",
    );
    expect(await response.text()).not.toMatch(
      /script|onclick|foreignObject|unsafe/,
    );
    expect((await listImports(container, token)).usedBytes).toBe(
      item.asset.bytes,
    );
  });
});
