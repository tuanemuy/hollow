import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { createImportRunner } from "@repo/core/adapters/node/importRunner";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import { NodeSharePasswordWork } from "@repo/core/adapters/node/sharePasswordWork";
import { NodeShareTokenProtector } from "@repo/core/adapters/node/shareSecrets";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { browseNotes } from "@repo/core/application/browse/usecases";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload as acceptAnyUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import {
  cancelImport,
  reimportNote,
  retryImport,
} from "@repo/core/application/import/controlJobs";
import {
  commitImportResult,
  runImportJob,
} from "@repo/core/application/import/processJob";
import { importPublicationNotice } from "@repo/core/application/import/publication";
import {
  listImports,
  originalDownload,
} from "@repo/core/application/import/readImports";
import { getNote } from "@repo/core/application/note/getNote";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import {
  getTrashIntent,
  restoreNote,
  trashNote,
} from "@repo/core/application/note/trash";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import {
  changeSharing,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import {
  createWorkspace,
  getScopeUsage,
} from "@repo/core/application/workspace/usecases";
import {
  IMPORT_LIMITS,
  importVisibility,
} from "@repo/core/domain/import/entity";
import type { ConversionJob } from "@repo/core/domain/job/entity";
import {
  LLM_LIMITS,
  type LlmFixedConversion,
  type LlmOutcome,
} from "@repo/core/domain/llm/entity";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importHttp } from "../../../../../../apps/web/app/presentation/importHttp.node";
import { uploadBatchSchema } from "../../../../../../apps/web/app/presentation/importSchemas";
import { TemporalCivilDate } from "../../node/browse/civilDate";
import { NodeTagNormalizer } from "../../node/browse/tagNormalizer";
import { LibsqlBrowseReadSnapshot } from "../browseReadSnapshot";
import { createLibsqlClient, getDatabase } from "../client";
import {
  conversionJobs,
  notes,
  originals,
  sessions,
  uploadReservations,
} from "../hollowSchema";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { LibsqlJobRepository } from "../repositories/jobRepository";
import { outboxEvents } from "../schema";
import { browseFixture } from "./browseFixture";
import { createTestContainer, type TestContainer } from "./helpers";

async function acceptUpload(...args: Parameters<typeof acceptAnyUpload>) {
  const result = await acceptAnyUpload(...args);
  if (!result.noteId || !result.jobId)
    throw new Error("Expected normal note upload");
  return { noteId: result.noteId, jobId: result.jobId };
}

describe("durable personal imports", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let token: string;
  let otherToken: string;
  let directory: string;
  let now: Date;
  let wakes: number;
  beforeEach(async () => {
    base = await createTestContainer();
    directory = await mkdtemp(path.join(os.tmpdir(), "hollow-import-test-"));
    now = new Date("2026-09-06T00:00:00Z");
    wakes = 0;
    const mails: string[] = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
      browsing: browseFixture,
      importing: {
        storage: new FileObjectStorage(directory),
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake: () => {
          wakes++;
        },
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
      if (!session) throw new Error("Missing session");
      return session.token;
    }
    token = await user("import-a@example.test");
    otherToken = await user("import-b@example.test");
  });
  afterEach(async () => {
    base.close();
    await rm(directory, { recursive: true, force: true });
  });
  const stream = (bytes: Uint8Array) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes);
        c.close();
      },
    });
  async function upload(name = "sample.txt", text = "日本語の取り込み") {
    const bytes = new TextEncoder().encode(text);
    const batch = await beginUpload(container, token, {
      files: [{ name, bytes: bytes.length }],
      useAi: true,
    });
    const row = batch.files[0];
    if (!row) throw new Error("Missing reservation");
    const result = await acceptUpload(container, token, row.id, stream(bytes));
    if (!result.noteId || !result.jobId)
      throw new Error("Expected note upload");
    return {
      noteId: result.noteId,
      jobId: result.jobId,
      batchId: batch.batchId,
      reservationId: row.id,
    };
  }
  async function claim() {
    return container.unitOfWorkProvider.run(({ jobs }) =>
      jobs.claim(
        now,
        container.tokens.generate(),
        new Date(now.getTime() + 90_000),
      ),
    );
  }
  const output = {
    kind: "extracted" as const,
    extraction: {
      html: "<p>converted</p>",
      coverage: "complete" as const,
      notices: [],
    },
  };
  async function conversionSnapshot(noteId: string, batchId: string) {
    const persisted = await container.unitOfWorkProvider.run(async (c) => ({
      note: await c.notes.findById(noteId),
      original: await c.imports.findByNote(noteId),
      jobs: await c.jobs.listBatch(batchId),
      revisions: await c.revisions.list(noteId),
      head: await c.revisions.head(noteId),
    }));
    return { ...persisted, events: await base.db.select().from(outboxEvents) };
  }
  async function editorWorkspace() {
    const workspace = await createWorkspace(container, token, {
      name: "取り込み先",
      description: "",
    });
    const session = await container.unitOfWorkProvider.run((c) =>
      c.accounts.findSession(container.tokens.hash(otherToken)),
    );
    if (!session) throw Error("editor session");
    await container.unitOfWorkProvider.run((c) =>
      c.workspaces.join(workspace.id, session.accountId, "editor", now),
    );
    return { workspaceId: workspace.id, accountId: session.accountId };
  }
  it("validates the publication intent at transport, domain and persistent boundaries", async () => {
    const payload = { files: [{ name: "x.txt", bytes: 1 }], useAi: false };
    expect(importVisibility(undefined)).toBe("private");
    expect(
      uploadBatchSchema.safeParse({
        ...payload,
        requestedVisibility: "everyone",
      }).success,
    ).toBe(false);
    expect(() => importVisibility("everyone")).toThrow(
      expect.objectContaining({ code: "IMPORT_VISIBILITY" }),
    );
    await beginUpload(container, token, payload);
    const result = await base.db.all<{ requested_visibility: string }>(
      "SELECT requested_visibility FROM import_batches",
    );
    expect(result).toEqual([{ requested_visibility: "private" }]);
    await expect(
      base.db.run(
        "UPDATE import_batches SET requested_visibility = 'everyone'",
      ),
    ).rejects.toThrow();
    expect(
      await base.db.all("SELECT requested_visibility FROM import_batches"),
    ).toEqual(result);
  });
  async function publicationKeys() {
    await writeFile(path.join(directory, "share.key"), randomBytes(32), {
      mode: 0o600,
    });
    container = {
      ...container,
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory,
          activeKeyId: "share",
          keyIds: ["share"],
        }),
        passwordWork: new NodeSharePasswordWork(),
      },
    };
  }
  async function profile(handle: string | null) {
    const current = await getProfile(container, token);
    return saveProfile(container, token, {
      displayName: "合成利用者",
      handle,
      bio: "",
      nameVersion: current.nameVersion,
      profileVersion: current.profileVersion,
      confirmHandleChange: true,
    });
  }
  async function staged(
    visibility: "private" | "link" | "public",
    workspaceId?: string,
  ) {
    const bytes = new TextEncoder().encode("staged original");
    const batch = await beginUpload(container, token, {
      ...(workspaceId ? { workspaceId } : {}),
      files: [{ name: "staged.txt", bytes: bytes.length }],
      useAi: false,
      requestedVisibility: visibility,
    });
    const reservation = batch.files[0];
    if (!reservation) throw Error("reservation");
    const accepted = await acceptUpload(
      container,
      token,
      reservation.id,
      stream(bytes),
    );
    const job = await claim();
    if (!job) throw Error("job");
    expect(job.id).toBe(accepted.jobId);
    return { ...accepted, batchId: batch.batchId, job };
  }
  it("rejects public prerequisites before creating a batch or capacity reservation; link needs neither", async () => {
    await publicationKeys();
    const workspace = await createWorkspace(container, token, {
      name: "公開未設定",
      description: "",
    });
    const before = await base.db.select().from(uploadReservations);
    for (const workspaceId of [undefined, workspace.id]) {
      await expect(
        beginUpload(container, token, {
          ...(workspaceId ? { workspaceId } : {}),
          files: [{ name: "x.txt", bytes: 10 }],
          useAi: false,
          requestedVisibility: "public",
        }),
      ).rejects.toMatchObject({
        code: workspaceId
          ? "SHARE_PUBLIC_SLUG_REQUIRED"
          : "SHARE_PUBLIC_HANDLE_REQUIRED",
      });
    }
    expect(await base.db.select().from(uploadReservations)).toEqual(before);
    expect((await listImports(container, token)).batches).toEqual([]);
    const accepted = await staged("link");
    expect(await commitImportResult(container, accepted.job, output)).toBe(
      true,
    );
    expect(
      await container.unitOfWorkProvider.run((u) =>
        u.sharing.find(accepted.noteId),
      ),
    ).toMatchObject({ visibility: "link", version: 1, linkGeneration: 1 });
    expect(
      await container.unitOfWorkProvider.run((u) =>
        u.publicNotes.find(accepted.noteId),
      ),
    ).toBeNull();
  });
  it("publishes a workspace editor's guarded successful import without requiring owner role", async () => {
    await publicationKeys();
    const workspace = await createWorkspace(container, token, {
      name: "共同取り込み",
      description: "",
      slug: "editor-import",
    });
    const person = await container.unitOfWorkProvider.run((u) =>
      u.accounts.findSession(container.tokens.hash(otherToken)),
    );
    if (!person) throw Error("editor");
    await container.unitOfWorkProvider.run((u) =>
      u.workspaces.join(workspace.id, person.accountId, "editor", now),
    );
    const bytes = new TextEncoder().encode("editor original");
    const batch = await beginUpload(container, otherToken, {
      workspaceId: workspace.id,
      requestedVisibility: "public",
      files: [{ name: "editor.txt", bytes: bytes.length }],
      useAi: false,
    });
    const file = batch.files[0];
    if (!file) throw Error("file");
    const accepted = await acceptUpload(
      container,
      otherToken,
      file.id,
      stream(bytes),
    );
    const job = await claim();
    if (!job) throw Error("job");
    expect(job.accountId).toBe(person.accountId);
    expect(await commitImportResult(container, job, output)).toBe(true);
    expect(
      await container.unitOfWorkProvider.run((u) =>
        u.sharing.find(accepted.noteId),
      ),
    ).toMatchObject({ visibility: "public", version: 1 });
    expect(
      (await getNote(container, otherToken, accepted.noteId)).html,
    ).toContain("converted");
  });
  it.each([
    "private",
    "link",
    "public",
  ] as const)("keeps a staged %s note private until the guarded successful body transaction", async (visibility) => {
    await publicationKeys();
    if (visibility === "public") await profile("import-public");
    const accepted = await staged(visibility);
    const before = await container.unitOfWorkProvider.run((u) =>
      u.sharing.find(accepted.noteId),
    );
    expect(before).toMatchObject({
      version: 0,
      visibility: "private",
      tokenHash: null,
      passwordHash: null,
      linkGeneration: 0,
    });
    expect((await getNote(container, token, accepted.noteId)).html).toBe("");
    expect(await commitImportResult(container, accepted.job, output)).toBe(
      true,
    );
    const settings = await container.unitOfWorkProvider.run((u) =>
      u.sharing.find(accepted.noteId),
    );
    expect(settings?.visibility).toBe(visibility);
    if (visibility === "private") expect(settings).toEqual(before);
    expect(
      Boolean(
        await container.unitOfWorkProvider.run((u) =>
          u.publicNotes.find(accepted.noteId),
        ),
      ),
    ).toBe(visibility === "public");
    expect(
      (await listImports(container, token)).batches[0]?.jobs[0],
    ).toMatchObject({ state: "succeeded", publicationNotice: null });
  });
  it("saves a successful conversion privately with a safe notice when the public handle disappears", async () => {
    await publicationKeys();
    await profile("temporary-handle");
    const accepted = await staged("public");
    await profile(null);
    expect(await commitImportResult(container, accepted.job, output)).toBe(
      true,
    );
    expect(
      await container.unitOfWorkProvider.run((u) =>
        u.sharing.find(accepted.noteId),
      ),
    ).toMatchObject({ visibility: "private", version: 0, tokenHash: null });
    const job = (await listImports(container, token)).batches[0]?.jobs[0];
    expect(job).toMatchObject({ state: "succeeded", failure: null });
    expect(job?.publicationNotice).toContain("非公開で保存");
    expect((await getNote(container, token, accepted.noteId)).html).toContain(
      "converted",
    );
    expect(
      importPublicationNotice([
        {
          code: "PUBLICATION_SKIPPED",
          location: "attacker",
          message: "raw provider secret",
        },
      ]),
    ).toBeNull();
  });
  it("preserves a private password and manual share revision changed during conversion", async () => {
    await publicationKeys();
    await profile("manual-change");
    const accepted = await staged("public");
    const initial = await getSharing(container, token, accepted.noteId);
    await changeSharing(container, token, {
      expected: initial.expected,
      operation: { kind: "password", password: "local-manual-password" },
    });
    const manual = await container.unitOfWorkProvider.run((u) =>
      u.sharing.find(accepted.noteId),
    );
    expect(manual?.passwordHash).toBeTruthy();
    expect(await commitImportResult(container, accepted.job, output)).toBe(
      true,
    );
    expect(
      await container.unitOfWorkProvider.run((u) =>
        u.sharing.find(accepted.noteId),
      ),
    ).toEqual(manual);
    expect(
      (await listImports(container, token)).batches[0]?.jobs[0]
        ?.publicationNotice,
    ).toContain("共有設定が変更");
  });
  it("does not publish a staged failed conversion and retains its original", async () => {
    await publicationKeys();
    await profile("failed-public");
    const accepted = await staged("public");
    expect(
      await commitImportResult(container, accepted.job, {
        kind: "failed",
        reason: "合成変換失敗",
      }),
    ).toBe(true);
    expect(
      await container.unitOfWorkProvider.run((u) =>
        u.sharing.find(accepted.noteId),
      ),
    ).toMatchObject({ visibility: "private", version: 0, tokenHash: null });
    expect(
      await container.unitOfWorkProvider.run((u) =>
        u.imports.findByNote(accepted.noteId),
      ),
    ).toMatchObject({ state: "failed" });
  });
  it.each([
    "viewer",
    null,
  ] as const)("commits failed unstarted note and companion uploads after editor becomes %s, releasing only their quota", async (role) => {
    const io = container.importing;
    if (!io) throw Error("import IO");
    const editor = await editorWorkspace();
    const bytes = new TextEncoder().encode("受付済みの原本");
    const batch = await beginUpload(container, otherToken, {
      workspaceId: editor.workspaceId,
      files: [
        { name: "accepted.txt", bytes: bytes.length },
        { name: "remaining.txt", bytes: bytes.length },
        { name: "companion.css", role: "companion", bytes: bytes.length },
      ],
      useAi: false,
    });
    const [first, ...pending] = batch.files;
    if (!first) throw Error("accepted reservation");
    const accepted = await acceptUpload(
      container,
      otherToken,
      first.id,
      stream(bytes),
    );
    await changeWorkspaceMember(container, token, {
      ...editor,
      role,
      expectedRole: "editor",
      ownerConfirmed: false,
    });
    await expect(
      beginUpload(container, otherToken, {
        workspaceId: editor.workspaceId,
        files: [{ name: "not-started.txt", bytes: 1 }],
        useAi: false,
      }),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    const before = await conversionSnapshot(accepted.noteId, batch.batchId);
    const acceptedRow = await container.unitOfWorkProvider.run((c) =>
      c.imports.findReservation(first.id),
    );
    if (!acceptedRow || !before.original) throw Error("accepted original");
    const put = vi.spyOn(io.storage, "put");
    const remove = vi.spyOn(io.storage, "remove");
    const detect = vi.spyOn(io, "detectFormat");
    for (const [index, row] of pending.entries()) {
      const pull = vi.fn();
      const unread = new ReadableStream<Uint8Array>(
        { pull },
        { highWaterMark: 0 },
      );
      await expect(
        acceptAnyUpload(container, otherToken, row.id, unread),
      ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
      const persisted = await container.unitOfWorkProvider.run((c) =>
        c.imports.findReservation(row.id),
      );
      expect(persisted).toMatchObject({
        state: "failed",
        storageCleaned: true,
        failure: expect.stringContaining("編集権限"),
      });
      expect(pull).not.toHaveBeenCalled();
      await expect(io.storage.stat(row.id)).rejects.toMatchObject({
        code: "ENOENT",
      });
      expect(
        (await getScopeUsage(container, token, editor)).usage.usedBytes,
      ).toBe(bytes.length * (pending.length - index));
      await expect(
        acceptAnyUpload(container, otherToken, row.id, unread),
      ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
      expect(
        await container.unitOfWorkProvider.run((c) =>
          c.imports.findReservation(row.id),
        ),
      ).toEqual(persisted);
    }
    await expect(
      acceptAnyUpload(container, otherToken, first.id, stream(bytes)),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.imports.findReservation(first.id),
      ),
    ).toEqual(acceptedRow);
    expect(await conversionSnapshot(accepted.noteId, batch.batchId)).toEqual(
      before,
    );
    expect(await base.db.select().from(originals)).toHaveLength(1);
    expect(await base.db.select().from(notes)).toHaveLength(1);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.companions(batch.batchId),
      ),
    ).toEqual([]);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.bundle(batch.batchId),
      ),
    ).toMatchObject({ sealed: true });
    const source = await originalDownload(container, token, before.original.id);
    expect(
      new Uint8Array(await new Response(source.stream).arrayBuffer()),
    ).toEqual(bytes);
    expect((await getScopeUsage(container, otherToken)).usage.usedBytes).toBe(
      0,
    );
    expect(put).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(detect).not.toHaveBeenCalled();
  });
  it.each([
    "viewer",
    null,
  ] as const)("fails and physically cleans an upload losing edit access after bytes arrive to %s", async (role) => {
    const io = container.importing;
    if (!io) throw Error("import IO");
    const editor = await editorWorkspace();
    const bytes = new TextEncoder().encode("送信中の原本");
    const batch = await beginUpload(container, otherToken, {
      workspaceId: editor.workspaceId,
      files: [{ name: "streamed.txt", bytes: bytes.length }],
      useAi: false,
    });
    const row = batch.files[0];
    if (!row) throw Error("reservation");
    const write = io.storage.put.bind(io.storage);
    const put = vi
      .spyOn(io.storage, "put")
      .mockImplementationOnce(async (...args) => {
        const result = await write(...args);
        await changeWorkspaceMember(container, token, {
          ...editor,
          role,
          expectedRole: "editor",
          ownerConfirmed: false,
        });
        await expect(
          acceptAnyUpload(container, otherToken, row.id, stream(bytes)),
        ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
        expect(
          await container.unitOfWorkProvider.run((c) =>
            c.imports.findReservation(row.id),
          ),
        ).toMatchObject({
          state: "uploading",
          storageCleaned: false,
          failure: null,
        });
        expect(await io.storage.stat(row.id)).toMatchObject({
          bytes: bytes.length,
        });
        expect(
          (await getScopeUsage(container, token, editor)).usage.usedBytes,
        ).toBe(bytes.length);
        return result;
      });
    const remove = vi.spyOn(io.storage, "remove");
    const events = await base.db.select().from(outboxEvents);
    await expect(
      acceptAnyUpload(container, otherToken, row.id, stream(bytes)),
    ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
    expect(put).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledExactlyOnceWith(row.id);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.imports.findReservation(row.id),
      ),
    ).toMatchObject({
      state: "failed",
      storageCleaned: true,
      failure: expect.any(String),
    });
    await expect(io.storage.stat(row.id)).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(await base.db.select().from(originals)).toEqual([]);
    expect(await base.db.select().from(notes)).toEqual([]);
    expect(await base.db.select().from(conversionJobs)).toEqual([]);
    expect(await base.db.select().from(outboxEvents)).toEqual(events);
    expect(
      (await getScopeUsage(container, token, editor)).usage.usedBytes,
    ).toBe(0);
  });
  it.each([
    "expired",
    "cancelled",
  ] as const)("does not terminalize a %s unstarted reservation after edit access is lost", async (ended) => {
    const io = container.importing;
    if (!io) throw Error("import IO");
    const editor = await editorWorkspace();
    const batch = await beginUpload(container, otherToken, {
      workspaceId: editor.workspaceId,
      files: [{ name: "ended.txt", bytes: 3 }],
      useAi: false,
    });
    const row = batch.files[0];
    if (!row) throw Error("reservation");
    await changeWorkspaceMember(container, token, {
      ...editor,
      role: null,
      expectedRole: "editor",
      ownerConfirmed: false,
    });
    const reservation = await container.unitOfWorkProvider.run((c) =>
      c.imports.findReservation(row.id),
    );
    if (!reservation) throw Error("persisted reservation");
    if (ended === "expired") now = reservation.expiresAt;
    else
      await container.unitOfWorkProvider.run((c) =>
        c.imports.cancelBatch(batch.batchId, now),
      );
    const snapshot = async () => ({
      persisted: await container.unitOfWorkProvider.run(async (c) => ({
        reservation: await c.imports.findReservation(row.id),
        batch: await c.imports.findBatch(batch.batchId),
        bundle: await c.references.bundle(batch.batchId),
      })),
      usage: (await getScopeUsage(container, token, editor)).usage.usedBytes,
      originals: await base.db.select().from(originals),
      notes: await base.db.select().from(notes),
      jobs: await base.db.select().from(conversionJobs),
      events: await base.db.select().from(outboxEvents),
    });
    const before = await snapshot();
    expect(reservation.expiresAt <= now).toBe(ended === "expired");
    expect(before.persisted.batch).toMatchObject({
      cancelledAt: ended === "cancelled" ? now : null,
    });
    expect(before.persisted.reservation).toMatchObject({
      state: "awaiting",
      failure: null,
      storageCleaned: false,
    });
    expect(before.persisted.bundle).toMatchObject({ sealed: false });
    expect(before.usage).toBe(ended === "expired" ? 0 : 3);
    expect(before.originals).toEqual([]);
    expect(before.notes).toEqual([]);
    expect(before.jobs).toEqual([]);
    const put = vi.spyOn(io.storage, "put");
    const remove = vi.spyOn(io.storage, "remove");
    const detect = vi.spyOn(io, "detectFormat");
    const pull = vi.fn();
    const unread = new ReadableStream<Uint8Array>(
      { pull },
      { highWaterMark: 0 },
    );
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(
        acceptAnyUpload(container, otherToken, row.id, unread),
      ).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND" });
      expect(await snapshot()).toEqual(before);
    }
    await expect(io.storage.stat(row.id)).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(put).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(detect).not.toHaveBeenCalled();
    expect(pull).not.toHaveBeenCalled();
  });
  it("does not terminalize an unstarted reservation for an unauthenticated or different actor", async () => {
    const io = container.importing;
    if (!io) throw Error("import IO");
    const editor = await editorWorkspace();
    const batch = await beginUpload(container, otherToken, {
      workspaceId: editor.workspaceId,
      files: [{ name: "private.txt", bytes: 3 }],
      useAi: false,
    });
    const row = batch.files[0];
    if (!row) throw Error("reservation");
    await changeWorkspaceMember(container, token, {
      ...editor,
      role: null,
      expectedRole: "editor",
      ownerConfirmed: false,
    });
    const before = await base.db.select().from(uploadReservations);
    const put = vi.spyOn(io.storage, "put");
    for (const [requestToken, code] of [
      [null, "SESSION_REQUIRED"],
      [token, "UPLOAD_NOT_FOUND"],
    ] as const)
      await expect(
        acceptAnyUpload(
          container,
          requestToken,
          row.id,
          stream(new Uint8Array(3)),
        ),
      ).rejects.toMatchObject({ code });
    await base.db
      .update(sessions)
      .set({ expiresAt: now })
      .where(eq(sessions.tokenHash, container.tokens.hash(otherToken)));
    await expect(
      acceptAnyUpload(container, otherToken, row.id, stream(new Uint8Array(3))),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
    expect(await base.db.select().from(uploadReservations)).toEqual(before);
    expect(
      (await getScopeUsage(container, token, editor)).usage.usedBytes,
    ).toBe(3);
    expect(put).not.toHaveBeenCalled();
  });
  it("projects active machine states and safe notices while retrying the failed job exactly once", async () => {
    const plain = await saveNote(container, token, {
      title: "without original",
      html: "<p>本文</p>",
    });
    expect(plain.note).not.toHaveProperty("conversion");
    expect(
      (await getNote(container, token, plain.note.id)).conversion,
    ).toBeNull();
    const database = String(
      (await base.client.execute("pragma database_list")).rows[0]?.file,
    );
    const read = new LibsqlBrowseReadSnapshot(
      `file:${database}`,
      container.clock,
      TemporalCivilDate,
      NodeTagNormalizer,
    );
    const searching: HollowContainer = {
      ...container,
      browsing: {
        ...browseFixture,
        execution: {
          async execute(request) {
            return read.read(request);
          },
          async stop() {},
        },
      },
    };
    const search = (query: string) =>
      browseNotes(searching, token, {
        query,
        tags: [],
        zone: "Asia/Tokyo",
        sort: "relevance",
        layout: "list",
      });
    const sourceText = "本文検索独自語";
    const accepted = await upload("処理中検索タイトル.txt", sourceText);
    const titleOnly = async () => {
      const byTitle = await search("処理中検索タイトル");
      expect(byTitle.total).toBe(1);
      expect(byTitle.items[0]).toMatchObject({
        id: accepted.noteId,
        status: "processing",
      });
      expect((await search(sourceText)).total).toBe(0);
      expect((await getNote(container, token, accepted.noteId)).html).toBe("");
    };
    expect(
      (await getNote(container, token, accepted.noteId)).conversion,
    ).toEqual({
      kind: "machine",
      jobId: accepted.jobId,
      state: "queued",
      notices: [],
      canRetry: false,
      retryBlocked: null,
    });
    await titleOnly();
    const job = await claim();
    if (!job) throw new Error("No job");
    expect(
      (await getNote(container, token, accepted.noteId)).conversion,
    ).toMatchObject({
      kind: "machine",
      jobId: job.id,
      state: "running",
      canRetry: false,
    });
    await titleOnly();
    expect(
      await commitImportResult(container, job, {
        kind: "failed",
        reason: "原本が破損しています。",
      }),
    ).toBe(true);
    const nativeFailure = "synthetic provider body / stack / credential";
    await base.db
      .update(conversionJobs)
      .set({ failure: nativeFailure })
      .where(eq(conversionJobs.id, job.id));
    const failed = await getNote(container, token, accepted.noteId);
    expect(failed.conversion).toEqual({
      kind: "machine",
      jobId: job.id,
      state: "failed",
      notices: [
        {
          code: "IMPORT_FAILURE",
          location: "原本",
          message: "原本が破損しています。",
        },
      ],
      canRetry: true,
      retryBlocked: null,
    });
    expect(JSON.stringify(failed)).not.toContain(nativeFailure);
    await expect(
      reimportNote(container, token, accepted.noteId),
    ).rejects.toMatchObject({ code: "JOB_NOT_RETRYABLE" });
    const retry = await retryImport(container, token, job.id);
    expect(retry.jobId).not.toBe(job.id);
    expect(
      (await getNote(container, token, accepted.noteId)).conversion,
    ).toMatchObject({
      kind: "machine",
      jobId: retry.jobId,
      state: "queued",
      canRetry: false,
      retryBlocked: null,
    });
    const { importing, ...unconfigured } = container;
    expect(importing).toBeDefined();
    const before = await conversionSnapshot(accepted.noteId, accepted.batchId);
    expect(await retryImport(unconfigured, token, job.id)).toEqual(retry);
    expect(await conversionSnapshot(accepted.noteId, accepted.batchId)).toEqual(
      before,
    );
    const running = await claim();
    if (!running || running.id !== retry.jobId) throw new Error("No retry");
    expect(
      await commitImportResult(container, running, {
        ...output,
        extraction: { ...output.extraction, html: `<p>${sourceText}</p>` },
      }),
    ).toBe(true);
    expect(
      (await getNote(container, token, accepted.noteId)).conversion,
    ).toMatchObject({
      kind: "machine",
      jobId: retry.jobId,
      state: "succeeded",
      canRetry: false,
      retryBlocked: null,
    });
    const completedSearch = await search(sourceText);
    expect(completedSearch.total).toBe(1);
    expect(completedSearch.items[0]).toMatchObject({
      id: accepted.noteId,
      status: "ready",
    });
  });
  it.each([
    "retry",
    "reimport",
  ] as const)("rejects an unconfigured %s before changing durable intent", async (kind) => {
    const accepted = await upload();
    if (kind === "retry") {
      const job = await claim();
      if (!job) throw new Error("No job");
      expect(
        await commitImportResult(container, job, {
          kind: "failed",
          reason: "原本を確認してください。",
        }),
      ).toBe(true);
    } else {
      await cancelImport(container, token, accepted.batchId);
    }
    const { importing, ...unconfigured } = container;
    expect(importing).toBeDefined();
    const before = await conversionSnapshot(accepted.noteId, accepted.batchId);
    if (kind === "retry") {
      expect(
        (await getNote(unconfigured, token, accepted.noteId)).conversion,
      ).toMatchObject({
        kind: "machine",
        state: "failed",
        canRetry: false,
        retryBlocked: "unconfigured",
      });
    }
    const request =
      kind === "retry"
        ? retryImport(unconfigured, token, accepted.jobId)
        : reimportNote(unconfigured, token, accepted.noteId);
    await expect(request).rejects.toMatchObject({ code: "EXTERNAL_API_ERROR" });
    expect(await conversionSnapshot(accepted.noteId, accepted.batchId)).toEqual(
      before,
    );
    const acceptedRestart =
      kind === "retry"
        ? await retryImport(container, token, accepted.jobId)
        : await reimportNote(container, token, accepted.noteId);
    const after = await conversionSnapshot(accepted.noteId, accepted.batchId);
    expect(
      kind === "retry"
        ? await retryImport(unconfigured, token, accepted.jobId)
        : await reimportNote(unconfigured, token, accepted.noteId),
    ).toEqual(acceptedRestart);
    expect(await conversionSnapshot(accepted.noteId, accepted.batchId)).toEqual(
      after,
    );
  });
  it("blocks retry after a style revision while preserving the failed original", async () => {
    const accepted = await upload();
    const job = await claim();
    if (!job) throw new Error("No job");
    expect(
      await commitImportResult(container, job, {
        kind: "failed",
        reason: "原本を確認してください。",
      }),
    ).toBe(true);
    await setDisplayStyle(container, token, {
      id: accepted.noteId,
      style: "original",
    });
    const before = await conversionSnapshot(accepted.noteId, accepted.batchId);
    expect(before.original?.state).toBe("failed");
    const current = await getNote(container, token, accepted.noteId);
    expect(current.conversion).toMatchObject({
      kind: "machine",
      state: "failed",
      canRetry: false,
      retryBlocked: "edited",
    });
    await expect(
      retryImport(container, token, accepted.jobId),
    ).rejects.toMatchObject({ code: "IMPORT_EDITED" });
    expect(await conversionSnapshot(accepted.noteId, accepted.batchId)).toEqual(
      before,
    );
  });
  it.each([
    { kind: "pending" },
    { kind: "failed", code: "LLM_MODEL_UNAVAILABLE" },
    { kind: "unknown", code: "LLM_DELIVERY_UNKNOWN" },
    { kind: "unknown", code: "LLM_OWNERSHIP_UNKNOWN" },
  ] satisfies readonly LlmOutcome[])("projects only the typed LLM $kind outcome and omits private execution data", async (outcome) => {
    const accepted = await upload();
    const job = await claim();
    if (!job) throw new Error("No job");
    expect(
      await commitImportResult(container, job, {
        kind: "failed",
        reason: "変換を確認してください。",
      }),
    ).toBe(true);
    const privateInstruction = "synthetic private instruction";
    const privateOwner = "synthetic private owner token";
    const privateFailure = "synthetic native provider stack";
    const llmJobId = container.idGenerator.next();
    const phase = outcome.kind === "pending" ? "queued" : "terminal";
    await container.unitOfWorkProvider.run(async (u) => {
      const original = await u.imports.findByNote(accepted.noteId);
      const note = await u.notes.findById(accepted.noteId);
      if (!original || !note) throw new Error("No original");
      await u.jobs.insert({
        ...job,
        id: llmJobId,
        noteVersion: note.version,
        leaseToken: null,
        leaseUntil: null,
        ...(outcome.kind === "pending"
          ? { state: "queued" as const, failure: null }
          : { state: "failed" as const, failure: privateFailure }),
      });
      await u.imports.saveOriginal({
        ...original,
        activeJobId: llmJobId,
        state: outcome.kind === "pending" ? "processing" : "failed",
      });
      const value: LlmFixedConversion = {
        access: { origin: "local-original", bindingId: null },
        sourceMemoryBytes: 0,
        inputReceipt: null,
        selection: "fixed",
        pdfProof: null,
        sourceOwnershipGeneration: null,
        jobId: llmJobId,
        accountId: job.accountId,
        noteId: note.id,
        commandId: container.idGenerator.next(),
        requestDigest: "b".repeat(64),
        operation: "regenerate",
        retryOf: null,
        source: {
          kind: "original",
          originalId: original.id,
          sha256: original.sha256,
          bytes: original.bytes,
          format: "text",
        },
        sourceState: original.state,
        sourceCoverage: original.coverage,
        noteVersion: note.version,
        originalRevisionNo: null,
        credentialEpoch: 1,
        modelId: "fixture/text",
        instruction: privateInstruction,
        promptVersion: 1,
        preparationVersion: 1,
        admissionSequence: await u.llmConversions.admit(job.accountId),
        createdAt: now,
        deadlineAt: new Date(now.getTime() + LLM_LIMITS.jobMs),
        updatedAt: now,
        phase,
        outcome,
        owner:
          outcome.kind === "pending"
            ? { state: "idle", runtimeId: null, token: null }
            : {
                state: "closed",
                runtimeId: "synthetic private runtime",
                token: privateOwner,
              },
        cancelGeneration: 0,
        responseBudget: 0,
        version: 1,
      };
      await u.llmConversions.insert(value);
    });
    const note = await getNote(container, token, accepted.noteId);
    expect(note.conversion).toEqual({
      kind: "llm",
      jobId: llmJobId,
      phase,
      outcome: outcome.kind,
      failure: "code" in outcome ? outcome.code : null,
    });
    for (const privateValue of [
      privateInstruction,
      privateOwner,
      privateFailure,
      "synthetic private runtime",
    ])
      expect(JSON.stringify(note)).not.toContain(privateValue);
    expect(note.conversion).not.toHaveProperty("canRetry");
    await expect(
      getNote(container, otherToken, accepted.noteId),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
  });
  it("hard-cancels only the trashed conversion and rejects its late success/failure even after restore", async () => {
    const target = await upload();
    const sibling = await upload();
    const job = await claim();
    if (!job) throw Error("job");
    const note = await getNote(container, token, target.noteId);
    expect(
      (await getTrashIntent(container, token, note.id)).hasRunningJobs,
    ).toBe(true);
    await expect(
      trashNote(container, token, {
        id: note.id,
        version: note.version,
        cancelProcessing: false,
      }),
    ).rejects.toMatchObject({ code: "TRASH_PROCESSING" });
    const before = await container.unitOfWorkProvider.run((c) =>
      c.revisions.list(note.id),
    );
    const deleted = await trashNote(container, token, {
      id: note.id,
      version: note.version,
      cancelProcessing: true,
    });
    await expect(getNote(container, token, note.id)).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
    });
    await expect(
      getNote(container, token, container.idGenerator.next()),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    const original = await container.unitOfWorkProvider.run((c) =>
      c.imports.findByNote(note.id),
    );
    if (!original) throw Error("original");
    await expect(
      originalDownload(container, token, original.id),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    for (const method of ["GET", "HEAD"]) {
      const response = await importHttp(
        new Request(
          `http://localhost:3000/api/hollow/originals/${original.id}`,
          {
            method,
            headers: {
              cookie: `hollow_session=${token}`,
              Range: "bytes=99999999-",
            },
          },
        ),
        container,
      );
      expect(response?.status).toBe(404);
    }
    await expect(reimportNote(container, token, note.id)).rejects.toMatchObject(
      { code: "NOTE_NOT_FOUND" },
    );
    expect(await commitImportResult(container, job, output)).toBe(false);
    expect(
      await commitImportResult(container, job, {
        kind: "failed",
        reason: "late failure",
      }),
    ).toBe(false);
    expect(
      await container.unitOfWorkProvider.run((c) => c.jobs.find(job.id)),
    ).toMatchObject({ state: "cancelled", failure: null, leaseToken: null });
    expect(
      await container.unitOfWorkProvider.run((c) => c.jobs.find(sibling.jobId)),
    ).toMatchObject({ state: "queued" });
    await restoreNote(container, token, deleted);
    expect(await commitImportResult(container, job, output)).toBe(false);
    expect(await getNote(container, token, note.id)).toMatchObject({
      html: note.html,
      updatedAt: note.updatedAt,
      status: "cancelled",
      conversion: {
        kind: "machine",
        jobId: job.id,
        state: "cancelled",
        canRetry: false,
        retryBlocked: null,
      },
      display: {
        style: note.display.style,
        initialization: { kind: "complete" },
      },
    });
    expect(
      await container.unitOfWorkProvider.run((c) => c.revisions.list(note.id)),
    ).toEqual(before);
    await expect(retryImport(container, token, job.id)).rejects.toMatchObject({
      code: "JOB_NOT_RETRYABLE",
    });
    const restarted = await reimportNote(container, token, note.id);
    expect(restarted.jobId).not.toBe(job.id);
    const next = await claim();
    if (!next) throw Error("sibling");
    expect(next.id).toBe(sibling.jobId);
    expect(await commitImportResult(container, next, output)).toBe(true);
    const last = await claim();
    if (!last) throw Error("reimport");
    expect(last.id).toBe(restarted.jobId);
    expect(await commitImportResult(container, last, output)).toBe(true);
    expect(
      await new Response(
        (await originalDownload(container, token, original.id)).stream,
      ).text(),
    ).toBe("日本語の取り込み");
  });

  it("atomically accepts original, note, queued job and outbox, then extracts and downloads", async () => {
    const accepted = await upload();
    expect(wakes).toBe(1);
    const note = await getNote(container, token, accepted.noteId);
    expect(note.status).toBe("processing");
    expect(note.html).toBe("");
    const sharing = await getSharing(container, token, note.id);
    await expect(
      changeSharing(container, token, {
        expected: sharing.expected,
        operation: {
          kind: "visibility",
          visibility: "public",
          confirmPasswordRemoval: false,
        },
      }),
    ).rejects.toMatchObject({ code: "SHARE_BODY_REQUIRED" });
    expect(
      await container.unitOfWorkProvider.run((u) => u.sharing.find(note.id)),
    ).toMatchObject({
      linkGeneration: 0,
      tokenHash: null,
      tokenEnvelope: null,
      visibility: "private",
    });
    expect(
      await container.unitOfWorkProvider.run((u) =>
        u.publicNotes.find(note.id),
      ),
    ).toBeNull();
    expect(
      (await base.db.select().from(outboxEvents)).some(
        (e) => e.eventType === "ImportQueued",
      ),
    ).toBe(true);
    await expect(
      saveNote(container, token, {
        id: note.id,
        title: "changed",
        html: "<p>no</p>",
      }),
    ).rejects.toMatchObject({ code: "NOTE_PROCESSING" });
    const job = await claim();
    if (!job) throw new Error("No job");
    await runImportJob(container, job);
    const ready = await getNote(container, token, note.id);
    expect(ready.status).toBe("ready");
    expect(ready.html).toContain("日本語の取り込み");
    if (!ready.original) throw new Error("No source");
    const download = await originalDownload(
      container,
      token,
      ready.original.id,
    );
    expect(await new Response(download.stream).text()).toBe("日本語の取り込み");
  });
  it("holds failed-upload quota until real cleanup succeeds, including retry and absent objects", async () => {
    const io = container.importing;
    if (!io) throw Error("import IO");
    const batch = await beginUpload(container, token, {
      files: [{ name: "x.txt", bytes: 3 }],
      useAi: false,
    });
    const row = batch.files[0];
    if (!row) throw Error("reservation");
    const detect = vi
      .spyOn(io, "detectFormat")
      .mockRejectedValueOnce(new Error("test detection failure"));
    const remove = vi
      .spyOn(io.storage, "remove")
      .mockRejectedValueOnce(new Error("test deletion failure"));
    await expect(
      acceptUpload(
        container,
        token,
        row.id,
        stream(new TextEncoder().encode("abc")),
      ),
    ).rejects.toThrow("test deletion failure");
    const reservation = await container.unitOfWorkProvider.run((c) =>
      c.imports.findReservation(row.id),
    );
    if (!reservation) throw Error("reservation");
    expect(await io.storage.stat(reservation.storageKey)).toMatchObject({
      bytes: 3,
    });
    expect((await listImports(container, token)).usedBytes).toBe(3);
    await base.db
      .update(uploadReservations)
      .set({ bytes: IMPORT_LIMITS.quotaBytes })
      .where(eq(uploadReservations.id, row.id));
    await expect(
      beginUpload(container, token, {
        files: [{ name: "blocked.txt", bytes: 1 }],
        useAi: false,
      }),
    ).rejects.toMatchObject({ code: "IMPORT_QUOTA" });
    now = new Date(reservation.expiresAt.getTime() + 6 * 60_000);
    const keys = await container.unitOfWorkProvider.run((c) =>
      c.imports.expireReservations(now),
    );
    expect(keys).toContain(reservation.storageKey);
    await io.storage.remove(reservation.storageKey);
    await container.unitOfWorkProvider.run((c) =>
      c.imports.markStorageCleaned(reservation.storageKey),
    );
    expect((await listImports(container, token)).usedBytes).toBe(0);
    await io.storage.remove(reservation.storageKey);
    await container.unitOfWorkProvider.run((c) =>
      c.imports.markStorageCleaned(reservation.storageKey),
    );
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.imports.expireReservations(now),
      ),
    ).not.toContain(reservation.storageKey);
    await expect(
      beginUpload(container, token, {
        files: [{ name: "accepted.txt", bytes: 1 }],
        useAi: false,
      }),
    ).resolves.toBeDefined();
    detect.mockRestore();
    remove.mockRestore();
  });
  it("reserves quota and rejects aggregate batch/count/stream mismatches", async () => {
    await expect(
      beginUpload(container, token, {
        files: Array.from({ length: 101 }, () => ({ name: "x", bytes: 1 })),
        useAi: false,
      }),
    ).rejects.toMatchObject({ code: "IMPORT_COUNT" });
    await expect(
      beginUpload(container, token, {
        files: Array.from({ length: 3 }, () => ({
          name: "x.wav",
          bytes: 200 * 1024 * 1024,
        })),
        useAi: false,
      }),
    ).rejects.toMatchObject({ code: "IMPORT_BATCH_SIZE" });
    const batch = await beginUpload(container, token, {
      files: [{ name: "x.txt", bytes: 3 }],
      useAi: false,
    });
    const r = batch.files[0];
    if (!r) throw new Error("No reservation");
    await expect(
      acceptUpload(container, token, r.id, stream(new Uint8Array(4))),
    ).rejects.toMatchObject({ code: "IMPORT_SIZE" });
    expect((await listImports(container, token)).usedBytes).toBe(0);
    expect(
      (await listImports(container, token)).batches[0]?.uploads[0]?.state,
    ).toBe("failed");
    await base.db
      .update(uploadReservations)
      .set({ state: "awaiting", bytes: IMPORT_LIMITS.quotaBytes })
      .where(eq(uploadReservations.id, r.id));
    await expect(
      beginUpload(container, token, {
        files: [{ name: "small.txt", bytes: 1 }],
        useAi: true,
      }),
    ).rejects.toMatchObject({ code: "IMPORT_QUOTA" });
  });
  it("isolates source, job history, upload, retry and cancel ownership", async () => {
    const a = await upload();
    const note = await getNote(container, token, a.noteId);
    expect((await listImports(container, otherToken)).batches).toHaveLength(0);
    await expect(
      originalDownload(container, otherToken, note.original?.id ?? ""),
    ).rejects.toMatchObject({ code: "ORIGINAL_NOT_FOUND" });
    await expect(
      cancelImport(container, otherToken, a.batchId),
    ).rejects.toMatchObject({ code: "IMPORT_NOT_FOUND" });
    await expect(
      retryImport(container, otherToken, a.jobId),
    ).rejects.toMatchObject({ code: "JOB_NOT_FOUND" });
    await expect(
      acceptUpload(
        container,
        otherToken,
        a.reservationId,
        stream(new Uint8Array(1)),
      ),
    ).rejects.toMatchObject({ code: "UPLOAD_NOT_FOUND" });
  });
  it("recovers queued work without wakeup using startup and periodic sweep", async () => {
    const a = await upload();
    const runner = createImportRunner(container, {
      intervalMs: 25,
      concurrency: 1,
    });
    try {
      await expect
        .poll(async () => (await getNote(container, token, a.noteId)).status, {
          timeout: 10000,
        })
        .toBe("ready");
    } finally {
      await runner.stop();
    }
  });
  it("allows only one of two atomic DB claims and fences expired workers", async () => {
    const a = await upload();
    const repo1 = new LibsqlJobRepository(base.db);
    const file = (await base.client.execute("PRAGMA database_list")).rows[0]
      ?.file;
    if (typeof file !== "string") throw new Error("No database file");
    const otherClient = createLibsqlClient({ url: `file:${file}` });
    const repo2 = new LibsqlJobRepository(getDatabase(otherClient));
    const claims = await Promise.all([
      repo1.claim(now, "worker-a", new Date(now.getTime() + 1000)),
      repo2.claim(now, "worker-b", new Date(now.getTime() + 1000)),
    ]).finally(() => otherClient.close());
    expect(claims.filter(Boolean)).toHaveLength(1);
    const old = claims.find(Boolean);
    if (!old) throw new Error("No claimed job");
    now = new Date(now.getTime() + 1001);
    const replacement = await claim();
    if (!replacement) throw new Error("No reclaimed job");
    expect(replacement.attempt).toBe(2);
    expect(await commitImportResult(container, old, output)).toBe(false);
    expect(await commitImportResult(container, replacement, output)).toBe(true);
    expect(await commitImportResult(container, replacement, output)).toBe(
      false,
    );
    expect((await getNote(container, token, a.noteId)).version).toBe(1);
  });
  it("recovers a queued import after closing and reopening the database resource without a wakeup", async () => {
    const accepted = await upload();
    const file = (await base.client.execute("PRAGMA database_list")).rows[0]
      ?.file;
    if (typeof file !== "string") throw new Error("No database file");
    base.client.close();
    const reopened = createLibsqlClient({ url: `file:${file}` });
    container = {
      ...container,
      unitOfWorkProvider: new LibsqlHollowUnitOfWorkProvider(
        getDatabase(reopened),
      ),
    };
    const runner = createImportRunner(container, { intervalMs: 20 });
    try {
      await expect
        .poll(
          async () => (await getNote(container, token, accepted.noteId)).status,
        )
        .toBe("ready");
      const restored = await getNote(container, token, accepted.noteId);
      expect(restored.html).toContain("日本語の取り込み");
      if (!restored.original) throw new Error("No original");
      const download = await originalDownload(
        container,
        token,
        restored.original.id,
      );
      expect(await new Response(download.stream).text()).toBe(
        "日本語の取り込み",
      );
    } finally {
      await runner.stop();
      reopened.close();
    }
  });
  it("reopens one mixed batch with only failed children and preserves successful originals", async () => {
    const contents = ["成功済みの原本", "再試行する原本一", "再試行する原本二"];
    const bytes = contents.map((text) => new TextEncoder().encode(text));
    const batch = await beginUpload(container, token, {
      files: bytes.map((value, index) => ({
        name: `mixed-${index}.txt`,
        bytes: value.length,
      })),
      useAi: false,
    });
    const accepted: Awaited<ReturnType<typeof acceptUpload>>[] = [];
    for (const [index, file] of batch.files.entries())
      accepted.push(
        await acceptUpload(container, token, file.id, stream(bytes[index]!)),
      );
    for (let index = 0; index < accepted.length; index++) {
      const job = await claim();
      if (!job) throw new Error("Missing mixed child");
      await commitImportResult(
        container,
        job,
        job.id === accepted[0]!.jobId
          ? output
          : { kind: "failed", reason: "合成一時失敗" },
      );
    }
    const before = (await listImports(container, token)).batches.find(
      (value) => value.id === batch.batchId,
    )!;
    expect(before.active).toBe(false);
    expect(before.jobs.map((job) => job.state).sort()).toEqual([
      "failed",
      "failed",
      "succeeded",
    ]);
    const success = await getNote(container, token, accepted[0]!.noteId);
    const stored = await base.db.select().from(originals);
    const failed = before.jobs.filter((job) => job.state === "failed");
    const retries = await Promise.all(
      failed.map((job) => retryImport(container, token, job.id)),
    );
    const reopened = (await listImports(container, token)).batches.find(
      (value) => value.id === batch.batchId,
    )!;
    expect(reopened.active).toBe(true);
    expect(reopened.jobs).toHaveLength(3);
    expect(
      reopened.jobs
        .filter((job) => job.state === "queued")
        .map((job) => job.id)
        .sort(),
    ).toEqual(retries.map((job) => job.jobId).sort());
    expect(
      reopened.jobs.find((job) => job.id === accepted[0]!.jobId)?.state,
    ).toBe("succeeded");
    for (let index = 0; index < failed.length; index++) {
      const job = await claim();
      if (!job) throw new Error("Missing retried child");
      expect(job.useAi).toBe(false);
      expect(job.retryOf).toBe(
        failed.find((value) => value.noteId === job.noteId)?.id,
      );
      await commitImportResult(container, job, output);
    }
    const finished = (await listImports(container, token)).batches.find(
      (value) => value.id === batch.batchId,
    )!;
    expect(finished.active).toBe(false);
    expect(finished.jobs.map((job) => job.state)).toEqual([
      "succeeded",
      "succeeded",
      "succeeded",
    ]);
    expect(await getNote(container, token, accepted[0]!.noteId)).toEqual(
      success,
    );
    expect(
      (await base.db.select().from(originals)).map((row) => ({
        id: row.id,
        storageKey: row.storageKey,
        sha256: row.sha256,
        bytes: row.bytes,
      })),
    ).toEqual(
      stored.map((row) => ({
        id: row.id,
        storageKey: row.storageKey,
        sha256: row.sha256,
        bytes: row.bytes,
      })),
    );
    for (const [index, result] of accepted.entries()) {
      const note = await getNote(container, token, result.noteId);
      if (!note.original) throw new Error("Missing retained original");
      expect(
        await new Response(
          (await originalDownload(container, token, note.original.id)).stream,
        ).text(),
      ).toBe(contents[index]);
    }
  });
  it("keeps accepted siblings through a broken upload and creates a separate same-name retry", async () => {
    const content = new TextEncoder().encode("既受付と再取り込みの原本");
    const batch = await beginUpload(container, token, {
      files: [
        { name: "same.txt", bytes: content.length },
        { name: "same.txt", bytes: content.length },
      ],
      useAi: false,
    });
    const first = await acceptUpload(
      container,
      token,
      batch.files[0]!.id,
      stream(content),
    );
    const running = await claim();
    if (!running) throw new Error("Missing accepted sibling");
    await commitImportResult(container, running, output);
    const saved = await getNote(container, token, first.noteId);
    let part = false;
    const broken = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!part) {
          part = true;
          controller.enqueue(content.slice(0, 3));
        } else controller.error(new Error("synthetic connection lost"));
      },
    });
    await expect(
      acceptUpload(container, token, batch.files[1]!.id, broken),
    ).rejects.toMatchObject({
      code: "EXTERNAL_API_ERROR",
      message: "原本を保存できませんでした。",
    });
    const originalBatch = (await listImports(container, token)).batches.find(
      (value) => value.id === batch.batchId,
    )!;
    expect(originalBatch.jobs).toHaveLength(1);
    expect(originalBatch.jobs[0]?.state).toBe("succeeded");
    expect(originalBatch.uploads).toEqual([
      expect.objectContaining({ name: "same.txt", state: "failed" }),
    ]);
    const next = await beginUpload(container, token, {
      files: [{ name: "same.txt", bytes: content.length }],
      useAi: false,
    });
    const retry = await acceptUpload(
      container,
      token,
      next.files[0]!.id,
      stream(content),
    );
    expect(retry.noteId).not.toBe(first.noteId);
    expect(await getNote(container, token, first.noteId)).toEqual(saved);
    expect(
      (await base.db.select().from(notes)).filter(
        (note) => note.title === "same.txt",
      ),
    ).toHaveLength(2);
    expect(
      (await base.db.select().from(originals)).map(
        (original) => original.sha256,
      ),
    ).toEqual([
      createHash("sha256").update(content).digest("hex"),
      createHash("sha256").update(content).digest("hex"),
    ]);
    if (!saved.original) throw new Error("Missing accepted original");
    expect(
      await new Response(
        (await originalDownload(container, token, saved.original.id)).stream,
      ).text(),
    ).toBe(new TextDecoder().decode(content));
  });
  it("cancels queued children but lets running work finish; retries once as a new job", async () => {
    const a = await upload();
    const b = await upload();
    const job = await claim();
    if (!job) throw new Error("No job");
    await cancelImport(container, token, a.batchId);
    expect(await commitImportResult(container, job, output)).toBe(true);
    await cancelImport(container, token, b.batchId);
    expect((await getNote(container, token, b.noteId)).status).toBe(
      "cancelled",
    );
    const retries = await Promise.all([
      reimportNote(container, token, b.noteId),
      reimportNote(container, token, b.noteId),
    ]);
    expect(retries[0]?.jobId).toBe(retries[1]?.jobId);
    expect(retries[0]?.jobId).not.toBe(b.jobId);
    expect(
      (await listImports(container, token)).batches.find(
        (x) => x.id === b.batchId,
      )?.active,
    ).toBe(true);
  });
  it("retains corrupt/encrypted originals with failed jobs and no false empty success", async () => {
    for (const file of ["corrupt.docx", "generated-encrypted.pdf"]) {
      const bytes = await readFile(
        new URL(
          `../../node/import/__tests__/fixtures/${file}`,
          import.meta.url,
        ),
      );
      const batch = await beginUpload(container, token, {
        files: [{ name: file, bytes: bytes.length }],
        useAi: true,
      });
      const row = batch.files[0];
      if (!row) throw new Error("No reservation");
      const accepted = await acceptUpload(
        container,
        token,
        row.id,
        stream(bytes),
      );
      const job = await claim();
      if (job) await runImportJob(container, job);
      const note = await getNote(container, token, accepted.noteId);
      expect(note.status).toBe("failed");
      expect(note.display.initialization.kind).toBe("complete");
      expect(note.original?.bytes).toBe(bytes.length);
    }
  });
  it("distinguishes needs-AI and explicit no-AI failure while preserving original", async () => {
    for (const useAi of [true, false]) {
      const bytes = await readFile(
        new URL(
          "../../node/import/__tests__/fixtures/generated-image.pdf",
          import.meta.url,
        ),
      );
      const batch = await beginUpload(container, token, {
        files: [{ name: "scan.pdf", bytes: bytes.length }],
        useAi,
      });
      const row = batch.files[0];
      if (!row) throw new Error("No reservation");
      const a = await acceptUpload(container, token, row.id, stream(bytes));
      const job = await claim();
      if (!job) throw new Error("No job");
      await runImportJob(container, job);
      const note = await getNote(container, token, a.noteId);
      expect(note.status).toBe(useAi ? "needs_ai" : "failed");
      if (useAi) {
        expect(note.html).toBe("");
        const sharing = await getSharing(container, token, note.id);
        await expect(
          changeSharing(container, token, {
            expected: sharing.expected,
            operation: {
              kind: "visibility",
              visibility: "public",
              confirmPasswordRemoval: false,
            },
          }),
        ).rejects.toMatchObject({ code: "SHARE_BODY_REQUIRED" });
        expect(
          await container.unitOfWorkProvider.run((u) =>
            u.sharing.find(note.id),
          ),
        ).toMatchObject({
          linkGeneration: 0,
          tokenHash: null,
          tokenEnvelope: null,
          visibility: "private",
        });
        expect(
          await container.unitOfWorkProvider.run((u) =>
            u.publicNotes.find(note.id),
          ),
        ).toBeNull();
      }

      expect(note.conversion).toMatchObject({
        kind: "machine",
        jobId: a.jobId,
        state: useAi ? "succeeded" : "failed",
      });
      expect(note.display).toMatchObject({
        style: "default",
        source: "automatic",
        initialization: { kind: "complete" },
      });
      expect(note.html).toBe("");
      expect(note.visibility).toBe("private");
    }
  });
  it("validates real media before needs-AI/no-AI and preserves failed originals across retry", async () => {
    for (const extension of [
      "png",
      "jpg",
      "gif",
      "webp",
      "wav",
      "flac",
      "mp3",
      "ogg",
      "m4a",
    ]) {
      const original = await readFile(
        new URL(
          `../../node/import/__tests__/fixtures/media-valid.${extension}`,
          import.meta.url,
        ),
      );
      for (const variant of ["valid-ai", "valid-no-ai", "truncated"] as const) {
        const bytes =
          variant === "truncated"
            ? original.subarray(0, Math.floor(original.length * 0.8))
            : original;
        const batch = await beginUpload(container, token, {
          files: [{ name: `media.${extension}`, bytes: bytes.length }],
          useAi: variant !== "valid-no-ai",
        });
        const row = batch.files[0];
        if (!row) throw new Error("No reservation");
        const accepted = await acceptUpload(
          container,
          token,
          row.id,
          stream(bytes),
        );
        const job = await claim();
        if (job) await runImportJob(container, job);
        const note = await getNote(container, token, accepted.noteId);
        expect(note.status).toBe(
          variant === "valid-ai" ? "needs_ai" : "failed",
        );
        expect(note.visibility).toBe("private");
        expect(note.html).toBe("");
        if (!note.original) throw new Error("No original");
        const download = await originalDownload(
          container,
          token,
          note.original.id,
        );
        expect(
          Buffer.from(await new Response(download.stream).arrayBuffer()),
        ).toEqual(bytes);
        if (variant === "truncated") {
          expect(
            note.original.notices.some((n) => n.message.includes("破損")),
          ).toBe(true);
          await retryImport(container, token, accepted.jobId);
          const retried = await claim();
          if (!retried) throw new Error("No retry");
          await runImportJob(container, retried);
          expect(
            (await getNote(container, token, accepted.noteId)).status,
          ).toBe("failed");
        }
      }
    }
  }, 30000);
  it("preserves mixed PDF text and permanent notices after 90-day job prune", async () => {
    const bytes = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/generated-mixed.pdf",
        import.meta.url,
      ),
    );
    const batch = await beginUpload(container, token, {
      files: [{ name: "mixed.pdf", bytes: bytes.length }],
      useAi: false,
    });
    const row = batch.files[0];
    if (!row) throw new Error("No reservation");
    const a = await acceptUpload(container, token, row.id, stream(bytes));
    const job = await claim();
    if (!job) throw new Error("No job");
    await runImportJob(container, job);
    const before = await getNote(container, token, a.noteId);
    expect(before.status).toBe("ready");
    expect(before.original?.coverage).toBe("partial");
    expect(before.original?.notices.length).toBeGreaterThan(0);
    await container.unitOfWorkProvider.run(({ imports }) =>
      imports.pruneHistory(new Date(now.getTime() + 91 * 86400_000)),
    );
    expect(
      (await getNote(container, token, a.noteId)).original?.notices,
    ).toEqual(before.original?.notices);
  });
  it("rejects completion after owner/version or active job changes", async () => {
    const a = await upload();
    const job = await claim();
    if (!job) throw new Error("No job");
    await base.db
      .update(originals)
      .set({ activeJobId: "new-job" })
      .where(eq(originals.noteId, a.noteId));
    expect(await commitImportResult(container, job, output)).toBe(false);
    expect((await getNote(container, token, a.noteId)).html).toBe("");
  });
  it("expires upload reservations without leaking quota", async () => {
    await beginUpload(container, token, {
      files: [{ name: "never.txt", bytes: 10 }],
      useAi: true,
    });
    now = new Date(now.getTime() + 61 * 60_000);
    const keys = await container.unitOfWorkProvider.run(({ imports }) =>
      imports.expireReservations(now),
    );
    expect(keys).toHaveLength(0);
    expect((await listImports(container, token)).usedBytes).toBe(10);
    now = new Date(now.getTime() + 5 * 60_000);
    const cleanup = await container.unitOfWorkProvider.run(({ imports }) =>
      imports.expireReservations(now),
    );
    expect(cleanup).toHaveLength(1);
    for (const key of cleanup) {
      await container.importing?.storage.remove(key);
      await container.unitOfWorkProvider.run((c) =>
        c.imports.markStorageCleaned(key),
      );
    }
    expect((await listImports(container, token)).usedBytes).toBe(0);
  });
  it("guards stale heartbeat and reports repeated crash timeout", async () => {
    await upload();
    let job: ConversionJob | null = null;
    for (let i = 0; i < 4; i++) {
      job = await claim();
      now = new Date(now.getTime() + 90_001);
    }
    if (!job || job.state !== "running") throw new Error("No job");
    expect(
      await container.unitOfWorkProvider.run(({ jobs }) =>
        jobs.heartbeat(
          job.id,
          job.leaseToken ?? "",
          now,
          new Date(now.getTime() + 10000),
        ),
      ),
    ).toBe(false);
    const latest = await claim();
    if (!latest) throw new Error("No job");
    await runImportJob(container, latest);
    expect(
      (await listImports(container, token)).batches[0]?.jobs[0]?.failure,
    ).toContain("タイムアウト");
  });
  it("preserves manual edits when retrying an old failed conversion", async () => {
    const accepted = await upload();
    const job = await claim();
    if (!job) throw new Error("No job");
    await commitImportResult(container, job, {
      kind: "failed",
      reason: "broken",
    });
    await saveNote(container, token, {
      id: accepted.noteId,
      title: "manual",
      html: "<p>my edited text</p>",
    });
    await expect(
      retryImport(container, token, accepted.jobId),
    ).rejects.toMatchObject({ code: "IMPORT_EDITED" });
    const edited = await getNote(container, token, accepted.noteId);
    expect(edited.conversion).toMatchObject({
      kind: "machine",
      state: "failed",
      canRetry: false,
      retryBlocked: "edited",
    });
    expect(edited.html).toContain("my edited text");
  });
  it("replays unaccepted-object cleanup after cancellation and a deletion-before-ack crash", async () => {
    const batch = await beginUpload(container, token, {
      files: [{ name: "orphan.txt", bytes: 3 }],
      useAi: true,
    });
    const row = batch.files[0];
    if (!row || !container.importing) throw new Error("No upload");
    const reservation = await container.unitOfWorkProvider.run(({ imports }) =>
      imports.findReservation(row.id),
    );
    if (!reservation) throw new Error("No reservation");
    await container.importing.storage.put(
      reservation.storageKey,
      stream(new Uint8Array([65, 66, 67])),
      3,
    );
    await cancelImport(container, token, batch.batchId);
    now = new Date(now.getTime() + 70 * 60_000);
    const collect = () =>
      container.unitOfWorkProvider.run(({ imports }) =>
        imports.expireReservations(now),
      );
    expect(await collect()).toContain(reservation.storageKey);
    await container.importing.storage.remove(reservation.storageKey);
    expect(await collect()).toContain(reservation.storageKey);
    await container.importing.storage.remove(reservation.storageKey);
    await container.unitOfWorkProvider.run(({ imports }) =>
      imports.markStorageCleaned(reservation.storageKey),
    );
    expect(await collect()).not.toContain(reservation.storageKey);
    expect((await listImports(container, token)).quotaBytes).toBe(
      IMPORT_LIMITS.quotaBytes,
    );
  });
});
