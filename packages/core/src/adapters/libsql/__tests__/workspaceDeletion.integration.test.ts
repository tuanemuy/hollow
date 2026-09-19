import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { getAsset } from "@repo/core/application/asset/access";
import {
  beginMediaUpload,
  createMediaDraft,
} from "@repo/core/application/asset/uploads";
import {
  acceptBatch,
  batchConfirmation,
  getBatch,
  previewBatch,
} from "@repo/core/application/batch/usecases";
import {
  claimBatchAttempt,
  processBatchAttempt,
} from "@repo/core/application/batch/worker";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import { commitImportResult } from "@repo/core/application/import/processJob";
import { originalDownload } from "@repo/core/application/import/readImports";
import {
  moveNote,
  previewNoteMove,
} from "@repo/core/application/move/usecases";
import { getNote } from "@repo/core/application/note/getNote";
import {
  getNoteVersion,
  listRevisions,
} from "@repo/core/application/note/history";
import {
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  listTrash,
  restoreNote,
  trashNote,
} from "@repo/core/application/note/trash";
import {
  getWorkspaceDeletionReceipt,
  listWorkspaceDeletionReceipts,
  requestWorkspaceDeletion,
  sweepWorkspaceDeletions,
} from "@repo/core/application/workspace/deletion";
import { deliverOneInvitation } from "@repo/core/application/workspace/delivery";
import { sweepWorkspaceIcons } from "@repo/core/application/workspace/icons";
import {
  beginInvitation,
  copyInvitation,
  issueInvitations,
  joinInvitation,
} from "@repo/core/application/workspace/invitations";
import {
  createWorkspace,
  listScopedNotes,
  listWorkspaces,
} from "@repo/core/application/workspace/usecases";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TemporalCivilDate } from "../../node/browse/civilDate";
import { NodeTagNormalizer } from "../../node/browse/tagNormalizer";
import { CoordinatedObjectStorage } from "../../node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { createPurgeRunner } from "../../node/purgeRunner";
import { LibsqlBrowseReadSnapshot } from "../browseReadSnapshot";
import { createTestContainer, type TestContainer } from "./helpers";

describe("durable workspace deletion", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let storage: CoordinatedObjectStorage;
  let now: Date;
  let owner: { id: string; token: string };
  let other: { id: string; token: string };
  let ws: string;
  const name = "削除対象";
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-workspace-deletion-"));
    now = new Date("2026-09-19T00:00:00Z");
    const mails: string[] = [];
    const common = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    storage = new CoordinatedObjectStorage(
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
    await storage.recoverOwners();
    async function user(email: string) {
      const signup = await signUp(c, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const result = await verifyEmail(
        c,
        new URL(link).searchParams.get("token") ?? "",
        signup.browserToken,
      );
      if (!result) throw Error("session");
      return { id: result.user.id, token: result.token };
    }
    owner = await user("deletion-owner@example.test");
    other = await user("deletion-other@example.test");
    ws = (
      await createWorkspace(c, owner.token, {
        name,
        description: "private",
        slug: "delete-reserved",
      })
    ).id;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const input = () => ({
    workspaceId: ws,
    requestId: c.idGenerator.next(),
    confirmation: name,
  });
  const note = async () =>
    (
      await saveNote(c, owner.token, {
        workspaceId: ws,
        title: "対象",
        html: "<p>original</p>",
      })
    ).note;
  async function intentId() {
    return (
      (
        await base.db.all<{ id: string }>(
          sql`select id from workspace_deletions where workspace_id=${ws}`,
        )
      )[0]?.id ?? ""
    );
  }
  it("requires current owner and exact current name; same actor/content is idempotent", async () => {
    const request = input();
    await expect(
      requestWorkspaceDeletion(c, other.token, request),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    await expect(
      requestWorkspaceDeletion(c, owner.token, {
        ...request,
        confirmation: `${name} `,
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_DELETION_NAME" });
    await c.unitOfWorkProvider.run((x) =>
      x.workspaces.join(ws, other.id, "editor", now),
    );
    await expect(
      requestWorkspaceDeletion(c, other.token, request),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    const accepted = await requestWorkspaceDeletion(c, owner.token, request);
    expect(accepted.state).toBe("reclaiming");
    const ownHistory = await listWorkspaceDeletionReceipts(c, owner.token, {});
    expect(ownHistory.actorId).toBe(owner.id);
    expect(ownHistory.items).toEqual([accepted]);
    const otherHistory = await listWorkspaceDeletionReceipts(
      c,
      other.token,
      {},
    );
    expect(otherHistory.actorId).toBe(other.id);
    expect(otherHistory.items).toEqual([]);
    expect(await requestWorkspaceDeletion(c, owner.token, request)).toEqual(
      accepted,
    );
    await expect(
      requestWorkspaceDeletion(c, owner.token, {
        ...request,
        confirmation: "changed",
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_DELETION_REQUEST_CHANGED" });
    expect(
      await getWorkspaceDeletionReceipt(c, other.token, request),
    ).toBeNull();
    expect(await getWorkspaceDeletionReceipt(c, owner.token, request)).toEqual(
      accepted,
    );
    expect(
      await base.db.all(
        sql`select id,creator_id,name,description,created_at,icon_id,state from workspaces where id=${ws}`,
      ),
    ).toEqual([
      {
        id: ws,
        creator_id: null,
        name: null,
        description: null,
        created_at: null,
        icon_id: null,
        state: "deleted",
      },
    ]);
  });
  it("rejects an old confirmation after the current workspace name changes", async () => {
    const request = input();
    await c.unitOfWorkProvider.run(async (x) => {
      const current = await x.workspaces.find(ws);
      if (!current) throw Error("missing fixture");
      expect(
        await x.workspaces.updateSettings(
          ws,
          await x.workspaces.settingsVersion(ws),
          { ...current, name: "改名済み" },
        ),
      ).toBe(true);
    });
    await expect(
      requestWorkspaceDeletion(c, owner.token, request),
    ).rejects.toMatchObject({ code: "WORKSPACE_DELETION_NAME" });
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toBeNull();
    expect(
      await requestWorkspaceDeletion(c, owner.token, {
        ...request,
        confirmation: "改名済み",
      }),
    ).toMatchObject({ name: "改名済み" });
  });
  it("revokes every member immediately and preserves personal data and slug reservation", async () => {
    await c.unitOfWorkProvider.run((x) =>
      x.workspaces.membership(ws, other.id, "editor"),
    );
    const n = await note();
    const { note: personal } = await saveNote(c, owner.token, {
      title: "personal",
      html: "<p>keep</p>",
    });
    await requestWorkspaceDeletion(c, owner.token, input());
    for (const actor of [owner, other]) {
      await expect(getNote(c, actor.token, n.id)).rejects.toBeDefined();
      await expect(
        listScopedNotes(c, actor.token, { workspaceId: ws }),
      ).rejects.toBeDefined();
      await expect(
        saveNote(c, actor.token, {
          workspaceId: ws,
          title: "late",
          html: "<p>late</p>",
        }),
      ).rejects.toBeDefined();
    }
    expect((await listWorkspaces(c, owner.token)).items).toHaveLength(0);
    expect(await getNote(c, owner.token, personal.id)).toBeDefined();
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaces.slugExists("delete-reserved"),
      ),
    ).toBe(true);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaces.countCreated(owner.id),
      ),
    ).toBe(0);
  });
  it("completes zero-note deletion without confusing acceptance and recovery", async () => {
    const request = input();
    await requestWorkspaceDeletion(c, owner.token, request);
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded", totalNotes: 0, completedNotes: 0 });
    expect(
      await base.db.all(
        sql`select 1 from workspace_members where workspace_id=${ws}`,
      ),
    ).toHaveLength(0);
  });
  it("admits active and trash notes then accounts physical purge completion", async () => {
    const active = await note();
    const trash = await note();
    await trashNote(c, owner.token, {
      id: trash.id,
      version: trash.version,
      cancelProcessing: false,
    });
    const request = input();
    await requestWorkspaceDeletion(c, owner.token, request);
    await sweepWorkspaceDeletions(c);
    expect(
      await base.db.all(
        sql`select 1 from note_purges where cause='workspace-deletion' and workspace_id=${ws}`,
      ),
    ).toHaveLength(2);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "reclaiming", totalNotes: 2, completedNotes: 0 });
    await sweepNotePurges(c);
    await sweepNotePurges(c);
    now = new Date(now.getTime() + 2000);
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded", totalNotes: 2, completedNotes: 2 });
    expect(
      await base.db.all(
        sql`select 1 from notes where id in (${active.id},${trash.id})`,
      ),
    ).toHaveLength(0);
    expect(
      (await base.client.execute("PRAGMA foreign_key_check")).rows,
    ).toHaveLength(0);
  });
  it("does not lose an already-running purge that finishes before admission", async () => {
    const n = await note();
    const trashed = await trashNote(c, owner.token, {
      id: n.id,
      version: n.version,
      cancelProcessing: false,
    });
    const existing = await requestNotePurge(c, owner.token, {
      id: n.id,
      operationId: trashed.operationId,
    });
    const request = input();
    await requestWorkspaceDeletion(c, owner.token, request);
    await sweepNotePurges(c);
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded", totalNotes: 1, completedNotes: 1 });
    expect(
      await base.db.all(
        sql`select purge_id from workspace_deletion_notes where intent_id=${await intentId()}`,
      ),
    ).toEqual([{ purge_id: existing.id }]);
  });
  it("claims expired steps once and rejects an old token", async () => {
    await requestWorkspaceDeletion(c, owner.token, input());
    const first = await c.unitOfWorkProvider.run((x) =>
      x.workspaceDeletions.claim(
        now,
        "first",
        new Date(now.getTime() + 60_000),
      ),
    );
    expect(first?.state).toBe("running");
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaceDeletions.claim(
          now,
          "second",
          new Date(now.getTime() + 60_000),
        ),
      ),
    ).toBeNull();
    now = new Date(now.getTime() + 60_000);
    const second = await c.unitOfWorkProvider.run((x) =>
      x.workspaceDeletions.claim(
        now,
        "second",
        new Date(now.getTime() + 60_000),
      ),
    );
    expect(second?.recoveries).toBe(1);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaceDeletions.advance(first?.id ?? "", "first", null, true, now),
      ),
    ).toBe(false);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaceDeletions.advance(
          first?.id ?? "",
          "second",
          null,
          true,
          now,
        ),
      ),
    ).toBe(true);
  });
  it("retains recovery authority when the actor receipt expires", async () => {
    await note();
    const request = input();
    await requestWorkspaceDeletion(c, owner.token, request);
    now = new Date(now.getTime() + 91 * 86400_000);
    await base.db.run(
      sql`update sessions set expires_at=${now.getTime() + 86400_000} where account_id=${owner.id}`,
    );
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toBeNull();
    expect(await intentId()).not.toBe("");
    await expect(
      requestWorkspaceDeletion(c, owner.token, request),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    await sweepNotePurges(c);
    now = new Date(now.getTime() + 2000);
    await sweepWorkspaceDeletions(c);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaceDeletions.find("missing"),
      ),
    ).toBeNull();
    const intentIdValue = await intentId();
    expect(
      (
        await c.unitOfWorkProvider.run((x) =>
          x.workspaceDeletions.find(intentIdValue),
        )
      )?.state,
    ).toBe("succeeded");
  });
  it("admits and completes 501 notes in finite ID pages without the batch-selection cap", async () => {
    const seed = await note();
    await base.db.run(
      sql`with recursive seq(x) as (select 1 union all select x+1 from seq where x<500) insert into notes(id,owner_workspace_id,creator_id,title,html,display,version,created_at,updated_at) select ${seed.id}||'-'||printf('%04d',x),${ws},${owner.id},'finite','<p>x</p>',display,1,created_at,updated_at from seq cross join notes where notes.id=${seed.id}`,
    );
    const request = input();
    await requestWorkspaceDeletion(c, owner.token, request);
    const claim = await c.unitOfWorkProvider.run((x) =>
      x.workspaceDeletions.claim(now, "page", new Date(now.getTime() + 60_000)),
    );
    if (!claim) throw Error("claim");
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaceDeletions.noteCandidates(claim.id, "page", now, 50),
      ),
    ).toHaveLength(50);
    await c.unitOfWorkProvider.run((x) =>
      x.workspaceDeletions.defer(claim.id, "page", now, null, true),
    );
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({
      totalNotes: 501,
      completedNotes: 0,
      state: "reclaiming",
    });
    expect(
      await base.db.all(
        sql`select count(*) n from workspace_deletion_notes where intent_id=${claim.id}`,
      ),
    ).toEqual([{ n: 501 }]);
    expect(
      (
        await c.unitOfWorkProvider.run((x) =>
          x.workspaceDeletions.find(claim.id),
        )
      )?.admissionComplete,
    ).toBe(true);
    for (let step = 0; step < 502; step++) {
      await sweepNotePurges(c);
      now = new Date(+now + 2000);
      await sweepWorkspaceDeletions(c);
      if (
        (await getWorkspaceDeletionReceipt(c, owner.token, request))?.state ===
        "succeeded"
      )
        break;
    }
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({
      state: "succeeded",
      totalNotes: 501,
      completedNotes: 501,
    });
    expect(
      await base.db.all(
        sql`select count(*) n from notes where owner_workspace_id=${ws}`,
      ),
    ).toEqual([{ n: 0 }]);
  }, 60000);
  it("holds unbound media charge until writer exit and real deletion, rejecting late second put", async () => {
    const draft = await createMediaDraft(c, owner.token, undefined, ws);
    const upload = await beginMediaUpload(c, owner.token, {
      draftId: draft.id,
      name: "a.png",
      bytes: 3,
    });
    const scope = { kind: "workspace" as const, workspaceId: ws };
    const bytes = () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });
    const request = input();
    await storage.withOwner(
      { kind: "media-upload", id: upload.uploadId },
      async () => {
        await storage.put(`${upload.uploadId}_source`, bytes(), 3);
        await requestWorkspaceDeletion(c, owner.token, request);
        await sweepWorkspaceDeletions(c);
        expect(
          await c.unitOfWorkProvider.run((x) =>
            x.capacity.usedBytes(scope, now),
          ),
        ).toBe(3);
        expect(
          (await c.unitOfWorkProvider.run((x) => x.assets.collectGarbage(now)))
            .uploads,
        ).toHaveLength(0);
        await expect(
          storage.put(`${upload.uploadId}_safe`, bytes(), 3),
        ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
        expect(await storage.stat(`${upload.uploadId}_source`)).not.toBeNull();
      },
    );
    now = new Date(now.getTime() + 2000);
    await sweepWorkspaceDeletions(c);
    await expect(
      storage.stat(`${upload.uploadId}_source`),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await c.unitOfWorkProvider.run((x) => x.capacity.usedBytes(scope, now)),
    ).toBe(0);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded" });
  });
  it("keeps import reservation charge through cancelled writer finally, then reclaims", async () => {
    const batch = await beginUpload(c, owner.token, {
      workspaceId: ws,
      files: [{ name: "new.html", bytes: 3 }],
      useAi: false,
    });
    const id = batch.files[0]?.id;
    if (!id) throw Error("reservation");
    const request = input();
    const scope = { kind: "workspace" as const, workspaceId: ws };
    await storage.withOwner({ kind: "import-upload", id }, async () => {
      await storage.put(
        id,
        new ReadableStream({
          start(s) {
            s.enqueue(new Uint8Array([1, 2, 3]));
            s.close();
          },
        }),
        3,
      );
      await requestWorkspaceDeletion(c, owner.token, request);
      await c.unitOfWorkProvider.run((x) => x.imports.markStorageCleaned(id));
      expect(
        await c.unitOfWorkProvider.run((x) => x.capacity.usedBytes(scope, now)),
      ).toBe(3);
      expect(
        await c.unitOfWorkProvider.run((x) =>
          x.imports.expireReservations(now),
        ),
      ).toEqual([]);
      await expect(
        storage.put(
          id,
          new ReadableStream({
            start(s) {
              s.close();
            },
          }),
          3,
        ),
      ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
      await sweepWorkspaceDeletions(c);
      expect(
        await getWorkspaceDeletionReceipt(c, owner.token, request),
      ).toMatchObject({ state: "reclaiming" });
    });
    now = new Date(now.getTime() + 2000);
    await sweepWorkspaceDeletions(c);
    await expect(storage.stat(id)).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await c.unitOfWorkProvider.run((x) => x.capacity.usedBytes(scope, now)),
    ).toBe(0);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded" });
  });
  it("fences reference adoption and finally cleanup until its writer exits", async () => {
    const n = await note();
    const jobId = c.idGenerator.next();
    const object = {
      id: c.idGenerator.next(),
      jobId,
      accountId: owner.id,
      workspaceId: ws,
      bytes: 3,
      state: "written" as const,
      createdAt: now,
    };
    await c.unitOfWorkProvider.run(async (x) => {
      await x.references.insertJob({
        id: jobId,
        noteId: n.id,
        accountId: owner.id,
        noteVersion: n.version,
        createdAt: now,
        updatedAt: now,
        attempt: 1,
        retryOf: null,
        total: 1,
        completed: 0,
        cancelRequested: false,
        state: "running",
        leaseToken: "reference-test",
        leaseUntil: new Date(+now + 60000),
        failure: null,
      });
      await x.references.saveObject(object);
    });
    const request = input();
    const scope = { kind: "workspace" as const, workspaceId: ws };
    await storage.withOwner({ kind: "reference-job", id: jobId }, async () => {
      await storage.put(
        object.id,
        new ReadableStream({
          start(s) {
            s.enqueue(new Uint8Array([1, 2, 3]));
            s.close();
          },
        }),
        3,
      );
      await requestWorkspaceDeletion(c, owner.token, request);
      await c.unitOfWorkProvider.run((x) =>
        x.references.saveObject({ ...object, state: "cleaned" }),
      );
      expect(
        await c.unitOfWorkProvider.run((x) => x.capacity.usedBytes(scope, now)),
      ).toBe(3);
      await expect(
        c.unitOfWorkProvider.run((x) =>
          x.references.saveObject({ ...object, state: "committed" }),
        ),
      ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
      await expect(
        storage.put(
          object.id,
          new ReadableStream({
            start(s) {
              s.close();
            },
          }),
          3,
        ),
      ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
      await sweepWorkspaceDeletions(c);
      await sweepNotePurges(c);
      expect(await storage.stat(object.id)).not.toBeNull();
      expect(
        await getWorkspaceDeletionReceipt(c, owner.token, request),
      ).toMatchObject({ state: "reclaiming", completedNotes: 0 });
    });
    now = new Date(+now + 30_000);
    await sweepNotePurges(c);
    await sweepWorkspaceDeletions(c);
    await expect(storage.stat(object.id)).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded", completedNotes: 1 });
  });
  it("keeps icon bytes until writer end and common claim cleanup", async () => {
    const id = c.idGenerator.next();
    const settingsVersion = await c.unitOfWorkProvider.run((x) =>
      x.workspaces.settingsVersion(ws),
    );
    if (settingsVersion === null) throw Error("settings");
    await c.unitOfWorkProvider.run((x) =>
      x.workspaceIcons.create({
        id,
        workspaceId: ws,
        actorId: owner.id,
        settingsVersion,
        inputBytes: 3,
        mime: "image/png",
        bytes: 3,
        storageKey: `icon-${id}`,
        state: "processing",
        output: null,
        createdAt: now,
        expiresAt: new Date(+now + 600000),
        nextAttemptAt: now,
      }),
    );
    const request = input();
    const scope = { kind: "workspace" as const, workspaceId: ws };
    await storage.withOwner({ kind: "icon-upload", id }, async () => {
      await storage.put(
        `icon-${id}`,
        new ReadableStream({
          start(s) {
            s.enqueue(new Uint8Array([1, 2, 3]));
            s.close();
          },
        }),
        3,
      );
      await requestWorkspaceDeletion(c, owner.token, request);
      await sweepWorkspaceIcons(c);
      expect(
        await c.unitOfWorkProvider.run((x) => x.capacity.usedBytes(scope, now)),
      ).toBe(3);
      await expect(
        storage.put(
          `icon-${id}`,
          new ReadableStream({
            start(s) {
              s.close();
            },
          }),
          3,
        ),
      ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
      await sweepWorkspaceDeletions(c);
      expect(
        await getWorkspaceDeletionReceipt(c, owner.token, request),
      ).toMatchObject({ state: "reclaiming" });
    });
    now = new Date(+now + 30000);
    await sweepWorkspaceIcons(c);
    await sweepWorkspaceDeletions(c);
    await expect(storage.stat(`icon-${id}`)).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(
      await c.unitOfWorkProvider.run((x) => x.capacity.usedBytes(scope, now)),
    ).toBe(0);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded" });
  });
  it("preserves successful moved children and fences only still-owned running and queued children", async () => {
    c = {
      ...c,
      tagging: {
        normalizer: NodeTagNormalizer,
        read: {
          async read() {
            throw Error("unused");
          },
        },
      },
    };
    const destination = (
      await createWorkspace(c, owner.token, {
        name: "survivor",
        description: "",
      })
    ).id;
    const notes = [await note(), await note(), await note()];
    const source = { kind: "workspace" as const, workspaceId: ws };
    const operation = {
      kind: "move" as const,
      destination: { kind: "workspace" as const, workspaceId: destination },
    };
    const preview = await previewBatch(c, owner.token, {
      ids: notes.map((n) => n.id),
      source,
      operation,
    });
    const parent = await acceptBatch(c, owner.token, {
      requestId: c.idGenerator.next(),
      source,
      operation,
      items: preview.items.map(batchConfirmation),
    });
    const first = await claimBatchAttempt(c, 60000);
    if (!first) throw Error("first");
    await processBatchAttempt(c, first);
    const running = await claimBatchAttempt(c, 60000);
    if (!running) throw Error("running");
    await requestWorkspaceDeletion(c, owner.token, input());
    await processBatchAttempt(c, running);
    const result = await getBatch(c, owner.token, { id: parent.id });
    expect(result.items.map((row) => row.state)).toEqual([
      "succeeded",
      "cancelled",
      "cancelled",
    ]);
    expect(result.items.map((row) => row.failure)).toEqual([null, null, null]);
    expect(
      (await getNote(c, owner.token, first.noteId)).scope.workspaceId,
    ).toBe(destination);
    await sweepWorkspaceDeletions(c);
    await sweepNotePurges(c);
    now = new Date(+now + 2000);
    await sweepWorkspaceDeletions(c);
    expect(
      (await getBatch(c, owner.token, { id: parent.id })).items.map(
        (row) => row.state,
      ),
    ).toEqual(["succeeded", "cancelled", "cancelled"]);
    expect(
      (await getNote(c, owner.token, first.noteId)).scope.workspaceId,
    ).toBe(destination);
  });
  it("invalidates pending invitation secret, continuation and unsent delivery", async () => {
    let sent = 0;
    c = {
      ...c,
      invitationDelivery: {
        protector: { protect: (value) => value, reveal: (value) => value },
        mailer: {
          async send() {
            sent++;
          },
        },
        wake() {},
      },
    };
    const result = await issueInvitations(c, owner.token, {
      workspaceId: ws,
      emails: ["deletion-other@example.test"],
      role: "editor",
      ownerConfirmed: false,
      requestId: c.idGenerator.next(),
    });
    const id = result.ids[0];
    if (!id) throw Error("invitation");
    const row = await c.unitOfWorkProvider.run((x) => x.invitations.find(id));
    if (!row) throw Error("invitation");
    const copied = await copyInvitation(c, owner.token, {
      workspaceId: ws,
      id,
      generation: row.generation,
    });
    const token = new URL(copied.url).searchParams.get("token") ?? "";
    const browserToken = c.tokens.generate();
    const continuation = await beginInvitation(c, token, browserToken);
    await requestWorkspaceDeletion(c, owner.token, input());
    expect(
      await c.unitOfWorkProvider.run((x) => x.invitations.find(id)),
    ).toMatchObject({
      state: "cancelled",
      tokenHash: null,
      envelope: null,
      deliverySnapshot: null,
      deliveryState: "stopped",
      leaseToken: null,
    });
    await expect(beginInvitation(c, token, browserToken)).rejects.toMatchObject(
      { code: "INVITATION_INVALID" },
    );
    await expect(
      joinInvitation(c, other.token, {
        continuationId: continuation.id,
        browserToken,
        confirmDifferentEmail: false,
      }),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    expect(await deliverOneInvitation(c)).toBe(false);
    expect(sent).toBe(0);
    expect(
      await base.db.all(
        sql`select count(*) n from auth_continuations where invitation_id=${id}`,
      ),
    ).toEqual([{ n: 0 }]);
  });
  it("fences existing ready current, draft and historical media before physical cleanup", async () => {
    const n = await note();
    const draft = await createMediaDraft(c, owner.token, n.id);
    const assetId = c.idGenerator.next();
    await c.unitOfWorkProvider.run(async (x) => {
      await x.assets.insert({
        id: assetId,
        accountId: owner.id,
        draftId: draft.id,
        storageKey: assetId,
        bytes: 3,
        sha256: "synthetic-fixture",
        mime: "image/png",
        kind: "image",
        createdAt: now,
        unreferencedAt: null,
        committedToNote: true,
        state: "ready",
      });
      await x.assets.replaceCurrentReferences(n.id, [assetId], now);
      await x.assets.pinRevision(n.id, 1, [assetId]);
    });
    await writeFile(path.join(dir, assetId), new Uint8Array([1, 2, 3]));
    const references = [
      { scope: "notes", scopeId: n.id, assetId },
      { scope: "drafts", scopeId: draft.id, assetId },
      { scope: "history", scopeId: n.id, assetId, revisionNo: 1 },
    ] as const;
    for (const reference of references)
      expect(await getAsset(c, owner.token, reference)).toMatchObject({
        id: assetId,
      });
    await requestWorkspaceDeletion(c, owner.token, input());
    for (const reference of references)
      await expect(getAsset(c, owner.token, reference)).rejects.toMatchObject({
        code: "NOTE_NOT_FOUND",
      });
    expect(await storage.stat(assetId)).toMatchObject({ bytes: 3 });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.capacity.usedBytes({ kind: "workspace", workspaceId: ws }, now),
      ),
    ).toBe(3);
  });
  it("closes history, edits, trash restore and admission reads before note cleanup", async () => {
    const active = await note();
    const trashed = await note();
    const trash = await trashNote(c, owner.token, {
      id: trashed.id,
      version: trashed.version,
      cancelProcessing: true,
    });
    const draft = await createMediaDraft(c, owner.token, undefined, ws);
    await requestWorkspaceDeletion(c, owner.token, input());
    for (const read of [
      () => getNoteVersion(c, owner.token, active.id),
      () => listRevisions(c, owner.token, active.id),
      () =>
        getAsset(c, owner.token, {
          scope: "history",
          scopeId: active.id,
          revisionNo: 1,
          assetId: c.idGenerator.next(),
        }),
      () =>
        saveNote(c, owner.token, {
          id: active.id,
          version: active.version,
          title: "late",
          html: "<p>late</p>",
        }),
      () =>
        restoreNote(c, owner.token, {
          id: trashed.id,
          operationId: trash.operationId,
        }),
    ]) {
      await expect(read()).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    }
    for (const read of [
      () => listTrash(c, owner.token, undefined, { workspaceId: ws }),
      () =>
        beginMediaUpload(c, owner.token, {
          draftId: draft.id,
          name: "late.png",
          bytes: 3,
        }),
      () =>
        beginUpload(c, owner.token, {
          workspaceId: ws,
          files: [{ name: "late.html", bytes: 3 }],
          useAi: false,
        }),
    ]) {
      await expect(read()).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    }
    expect(
      await base.db.all(sql`select html from notes where id=${active.id}`),
    ).toEqual([{ html: "<p>original</p>" }]);
  });
  it("fences snapshot search, calendar, tag management and selection at deleted scope", async () => {
    await note();
    const file = String(
      (await base.client.execute("pragma database_list")).rows[0]?.file,
    );
    const reader = new LibsqlBrowseReadSnapshot(
      `file:${file}`,
      { now: () => now },
      TemporalCivilDate,
      NodeTagNormalizer,
    );
    const sessionHash = c.tokens.hash(owner.token);
    const conditions = {
      workspaceId: ws,
      query: "original",
      tags: [],
      zone: "Asia/Tokyo",
      sort: "updated-desc" as const,
      layout: "calendar" as const,
      month: "2026-09",
    };
    await requestWorkspaceDeletion(c, owner.token, input());
    for (const kind of ["notes", "selection", "tags"] as const)
      await expect(
        reader.read({ kind, sessionHash, conditions, tagQuery: "" }),
      ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    await expect(
      reader.read({
        kind: "tag-management",
        sessionHash,
        input: {
          purpose: "manager",
          workspaceId: ws,
          query: "",
          unusedOnly: false,
        },
      }),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
  });
  it("rejects old move previews in both directions after deletion commits", async () => {
    const n = await note();
    const personal = (
      await saveNote(c, owner.token, { title: "personal", html: "<p>safe</p>" })
    ).note;
    const out = await previewNoteMove(c, owner.token, {
      noteId: n.id,
      destination: { kind: "personal", accountId: owner.id },
    });
    const into = await previewNoteMove(c, owner.token, {
      noteId: personal.id,
      destination: { kind: "workspace", workspaceId: ws },
    });
    await requestWorkspaceDeletion(c, owner.token, input());
    await expect(moveNote(c, owner.token, out.expected)).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
    });
    await expect(moveNote(c, owner.token, into.expected)).rejects.toMatchObject(
      { code: "SCOPE_NOT_FOUND" },
    );
    expect(
      (await getNote(c, owner.token, personal.id)).scope.workspaceId,
    ).toBeNull();
  });
  it("includes a note moved in before acceptance and recovers after the requester account disappears", async () => {
    const personal = (
      await saveNote(c, owner.token, {
        title: "arrived",
        html: "<p>new arrival</p>",
      })
    ).note;
    const preview = await previewNoteMove(c, owner.token, {
      noteId: personal.id,
      destination: { kind: "workspace", workspaceId: ws },
    });
    await moveNote(c, owner.token, preview.expected);
    const request = input();
    await requestWorkspaceDeletion(c, owner.token, request);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ totalNotes: 1 });
    const deletionId = await intentId();
    await base.db.run(sql`delete from accounts where id=${owner.id}`);
    await sweepWorkspaceDeletions(c);
    await sweepNotePurges(c);
    now = new Date(+now + 2000);
    await sweepWorkspaceDeletions(c);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaceDeletions.find(deletionId),
      ),
    ).toMatchObject({ state: "succeeded", totalNotes: 1 });
    expect(
      await base.db.all(
        sql`select count(*) n from notes where id=${personal.id}`,
      ),
    ).toEqual([{ n: 0 }]);
  });
  it("rolls back acceptance, receipt, cancellations and profile together on a trigger fault", async () => {
    const n = await note();
    await base.db.run(
      sql`create trigger p3f_test_abort before update on workspaces when new.state='deleted' begin select raise(abort,'synthetic-deletion-fault'); end`,
    );
    const request = input();
    await expect(
      requestWorkspaceDeletion(c, owner.token, request),
    ).rejects.toBeDefined();
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toBeNull();
    expect(
      await base.db.all(sql`select count(*) n from workspace_deletions`),
    ).toEqual([{ n: 0 }]);
    expect((await getNote(c, owner.token, n.id)).title).toBe("対象");
    expect(
      await c.unitOfWorkProvider.run((x) => x.workspaces.find(ws)),
    ).toMatchObject({ name, state: "active" });
    await base.db.run(sql`drop trigger p3f_test_abort`);
    await requestWorkspaceDeletion(c, owner.token, request);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "reclaiming" });
  });
  it("boot recovery works without a delivered wake or a live requester session", async () => {
    await note();
    await requestWorkspaceDeletion(c, owner.token, input());
    await base.db.run(sql`delete from sessions where account_id=${owner.id}`);
    const id = await intentId();
    await c.unitOfWorkProvider.run((x) =>
      x.workspaceDeletions.claim(
        now,
        "interrupted-step",
        new Date(+now + 60000),
      ),
    );
    now = new Date(+now + 60001);
    const runner = createPurgeRunner(c, 100000);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await runner.stop();
    expect(
      await base.db.all(
        sql`select count(*) n from notes where owner_workspace_id=${ws}`,
      ),
    ).toEqual([{ n: 0 }]);
    now = new Date(+now + 2000);
    const restarted = createPurgeRunner(c, 100000);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await restarted.stop();
    expect(
      await c.unitOfWorkProvider.run((x) => x.workspaceDeletions.find(id)),
    ).toMatchObject({ state: "succeeded", recoveries: 1 });
    await expect(
      getWorkspaceDeletionReceipt(c, owner.token, {
        requestId: c.idGenerator.next(),
      }),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
  });
  it("pages only the requester's receipts with stable 50-keyset ordering", async () => {
    const requests: string[] = [];
    for (let i = 0; i < 51; i++) {
      const workspaceId = c.idGenerator.next();
      const id = c.idGenerator.next();
      const requestId = c.idGenerator.next();
      requests.push(requestId);
      await base.db.run(
        sql`insert into workspaces(id,state) values(${workspaceId},'deleted')`,
      );
      await base.db.run(
        sql`insert into workspace_deletions(id,workspace_id,state,accepted_at,updated_at,next_attempt_at,total_notes) values(${id},${workspaceId},'queued',${+now},${+now},${+now},0)`,
      );
      await base.db.run(
        sql`insert into workspace_deletion_receipts(account_id,request_id,intent_id,workspace_id,name,accepted_at) values(${owner.id},${requestId},${id},${workspaceId},'history',${+now})`,
      );
    }
    const first = await listWorkspaceDeletionReceipts(c, owner.token, {});
    expect(first.items).toHaveLength(50);
    expect(first.actorId).toBe(owner.id);
    if (!first.nextCursor) throw Error("cursor");
    const second = await listWorkspaceDeletionReceipts(c, owner.token, {
      before: first.nextCursor,
    });
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(
      [...first.items, ...second.items].map((row) => row.requestId),
    ).toEqual(requests.sort().reverse());
    expect(
      (
        await listWorkspaceDeletionReceipts(c, other.token, {
          before: first.nextCursor,
        })
      ).items,
    ).toHaveLength(0);
  });
  it("fences a running conversion's late result and retains original bytes until writer end", async () => {
    const bytes = new TextEncoder().encode("<p>conversion original</p>");
    const stream = () =>
      new ReadableStream<Uint8Array>({
        start(s) {
          s.enqueue(bytes);
          s.close();
        },
      });
    const batch = await beginUpload(c, owner.token, {
      workspaceId: ws,
      files: [{ name: "source.html", bytes: bytes.length }],
      useAi: false,
    });
    const id = batch.files[0]?.id;
    if (!id) throw Error("upload");
    await acceptUpload(c, owner.token, id, stream());
    const job = await c.unitOfWorkProvider.run((x) =>
      x.jobs.claim(now, "conversion-test", new Date(+now + 60000)),
    );
    if (!job || job.state !== "running") throw Error("conversion");
    const request = input();
    await storage.withOwner(
      { kind: "conversion-job", id: job.id },
      async () => {
        await requestWorkspaceDeletion(c, owner.token, request);
        await expect(
          originalDownload(c, owner.token, job.originalId),
        ).rejects.toMatchObject({ code: "ORIGINAL_NOT_FOUND" });
        expect(
          await commitImportResult(c, job, {
            kind: "failed",
            reason: "late failure",
          }),
        ).toBe(false);
        expect(
          await commitImportResult(c, job, {
            kind: "extracted",
            extraction: {
              html: "<p>late success</p>",
              coverage: "complete",
              notices: [],
            },
          }),
        ).toBe(false);
        await expect(
          storage.put(id, stream(), bytes.length),
        ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
        await sweepWorkspaceDeletions(c);
        await sweepNotePurges(c);
        expect(
          await c.unitOfWorkProvider.run((x) =>
            x.capacity.usedBytes({ kind: "workspace", workspaceId: ws }, now),
          ),
        ).toBe(bytes.length);
        expect(await storage.stat(id)).not.toBeNull();
      },
    );
    now = new Date(+now + 30000);
    await sweepNotePurges(c);
    await sweepWorkspaceDeletions(c);
    await expect(storage.stat(id)).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded", completedNotes: 1 });
  });
  it("keeps capacity and durable backoff after remove failure, then recovers", async () => {
    const draft = await createMediaDraft(c, owner.token, undefined, ws);
    const upload = await beginMediaUpload(c, owner.token, {
      draftId: draft.id,
      name: "failed.png",
      bytes: 3,
    });
    const request = input();
    await requestWorkspaceDeletion(c, owner.token, request);
    vi.spyOn(c.logger, "error").mockImplementation(() => {});
    vi.spyOn(storage, "removeClaimed").mockRejectedValueOnce(
      new Error("synthetic removal failure"),
    );
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "reclaiming", delayed: true });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.capacity.usedBytes({ kind: "workspace", workspaceId: ws }, now),
      ),
    ).toBe(3);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaceDeletions.claim(
          now,
          "too-early",
          new Date(now.getTime() + 60_000),
        ),
      ),
    ).toBeNull();
    now = new Date(now.getTime() + 30_000);
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, request),
    ).toMatchObject({ state: "succeeded", delayed: false });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.assets.findUpload(upload.uploadId),
      ),
    ).toBeNull();
  });
  it("uses current bound-note ownership rather than the draft admission workspace", async () => {
    const n = await note();
    const destination = await createWorkspace(c, owner.token, {
      name: "Survivor",
      description: "",
    });
    const draft = await createMediaDraft(c, owner.token, n.id);
    await moveNote(
      c,
      owner.token,
      (
        await previewNoteMove(c, owner.token, {
          noteId: n.id,
          destination: { kind: "workspace", workspaceId: destination.id },
        })
      ).expected,
    );
    await requestWorkspaceDeletion(c, owner.token, input());
    await sweepWorkspaceDeletions(c);
    expect(await getNote(c, owner.token, n.id)).toBeDefined();
    expect(
      await c.unitOfWorkProvider.run((x) => x.assets.findDraft(draft.id)),
    ).not.toBeNull();
    const upload = await beginMediaUpload(c, owner.token, {
      draftId: draft.id,
      name: "survives.png",
      bytes: 3,
    });
    await c.unitOfWorkProvider.run((x) =>
      x.objectOperations.beginWrite(
        "moved-writer",
        "test-runtime",
        { kind: "media-upload", id: upload.uploadId },
        now,
      ),
    );
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.objectOperations.canPublish("moved-writer"),
      ),
    ).toBe(true);
    await c.unitOfWorkProvider.run((x) =>
      x.objectOperations.endWrite("moved-writer"),
    );
  });
  it("preserves an off-reference companion in another scope and reclaims only the final holder", async () => {
    const a = await note();
    const destination = await createWorkspace(c, owner.token, {
      name: "Survivor",
      description: "",
    });
    const { note: b } = await saveNote(c, owner.token, {
      workspaceId: destination.id,
      title: "holder",
      html: "<p>keep</p>",
    });
    const bundle = c.idGenerator.next();
    const companion = c.idGenerator.next();
    await base.db.run(
      sql`insert into source_bundles(id,workspace_id,account_id,enabled,sealed,created_at) values(${bundle},${ws},${owner.id},0,1,${now.getTime()})`,
    );
    await base.db.run(
      sql`insert into companion_sources(id,bundle_id,account_id,path,storage_key,bytes,sha256) values(${companion},${bundle},${owner.id},'x.png',${companion},3,'synthetic-fixture')`,
    );
    await writeFile(path.join(dir, companion), new Uint8Array([1, 2, 3]));
    for (const id of [a.id, b.id])
      await base.db.run(
        sql`insert into reference_settings(note_id,enabled,bundle_id) values(${id},0,${bundle})`,
      );
    const first = input();
    await requestWorkspaceDeletion(c, owner.token, first);
    await sweepWorkspaceDeletions(c);
    await sweepNotePurges(c);
    now = new Date(now.getTime() + 2000);
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, first),
    ).toMatchObject({ state: "succeeded" });
    expect(await storage.stat(companion)).toMatchObject({ bytes: 3 });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.capacity.usedBytes({ kind: "workspace", workspaceId: ws }, now),
      ),
    ).toBe(0);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.capacity.usedBytes(
          { kind: "workspace", workspaceId: destination.id },
          now,
        ),
      ),
    ).toBe(3);
    expect(await getNote(c, owner.token, b.id)).toBeDefined();
    const second = {
      workspaceId: destination.id,
      requestId: c.idGenerator.next(),
      confirmation: "Survivor",
    };
    await requestWorkspaceDeletion(c, owner.token, second);
    await sweepWorkspaceDeletions(c);
    await sweepNotePurges(c);
    now = new Date(now.getTime() + 2000);
    await sweepWorkspaceDeletions(c);
    expect(
      await getWorkspaceDeletionReceipt(c, owner.token, second),
    ).toMatchObject({ state: "succeeded" });
    await expect(storage.stat(companion)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
