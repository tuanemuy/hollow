import { randomBytes } from "node:crypto";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type {
  BatchAcceptInput,
  BatchConfirmation,
} from "@repo/core/application/batch/ports";
import {
  acceptBatch,
  batchConfirmation,
  getBatch,
  previewBatch,
  retryBatch,
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
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import {
  currentPublicNote,
  readPublicNote,
} from "@repo/core/application/publication/reading";
import {
  readSharedNote,
  unlockShare,
} from "@repo/core/application/sharing/reading";
import {
  changeSharing,
  getShareLink,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { requestWorkspaceDeletion } from "@repo/core/application/workspace/deletion";
import {
  changeWorkspaceMember,
  leaveWorkspace,
} from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import type { NoteVisibility } from "@repo/core/domain/sharing/entity";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeSharePasswordWork } from "../../node/sharePasswordWork";
import { NodeShareTokenProtector } from "../../node/shareSecrets";
import { accounts, sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("batch sharing current policy and readers", () => {
  let base: TestContainer;
  let c: HollowContainer & { sharing: NonNullable<HollowContainer["sharing"]> };
  let directory: string;
  const now = new Date("2026-09-26T08:00:00Z");
  const actor = "00000000-0000-4000-8000-000000000001";
  const editor = "00000000-0000-4000-8000-000000000002";
  const session = "batch-policy-fixture-session";
  const editorSession = "batch-policy-fixture-editor-session";
  const browser = "batch-policy-fixture-browser";
  const password = "batch policy fixture password";
  const personal: NoteOwner = { kind: "personal", accountId: actor };

  beforeEach(async () => {
    base = await createTestContainer();
    directory = await mkdtemp(
      path.join(await realpath(tmpdir()), "hollow-batch-policy-"),
    );
    await writeFile(path.join(directory, "fixture.key"), randomBytes(32), {
      mode: 0o600,
    });
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send() {},
      }),
      clock: { now: () => now },
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory,
          activeKeyId: "fixture",
          keyIds: ["fixture"],
        }),
        passwordWork: new NodeSharePasswordWork(),
      },
    };
    await base.db.insert(accounts).values(
      [actor, editor].map((id, index) => ({
        id,
        email: `batch-policy-${index}@example.test`,
        passwordHash: "fixture",
        createdAt: now,
        verifiedAt: now,
      })),
    );
    await base.db.insert(sessions).values([
      {
        tokenHash: c.tokens.hash(session),
        accountId: actor,
        expiresAt: new Date(now.getTime() + 86400_000),
      },
      {
        tokenHash: c.tokens.hash(editorSession),
        accountId: editor,
        expiresAt: new Date(now.getTime() + 86400_000),
      },
    ]);
  });
  afterEach(async () => {
    await c.sharing.passwordWork.stop();
    base.close();
    await rm(directory, { recursive: true, force: true });
  });
  const note = async (
    source: NoteOwner = personal,
    html = "<p>Policy fixture body</p>",
  ) =>
    (
      await saveNote(c, session, {
        ...(source.kind === "workspace"
          ? { workspaceId: source.workspaceId }
          : {}),
        title: "Policy fixture note",
        html,
      })
    ).note.id;
  const workspace = async () => {
    const ws = await createWorkspace(c, session, {
      name: "Policy fixture workspace",
      description: "",
      slug: "batch-policy-fixture",
    });
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.join(ws.id, editor, "editor", now),
    );
    return { ws, source: { kind: "workspace" as const, workspaceId: ws.id } };
  };
  const prepare = async (
    ids: readonly string[],
    visibility: NoteVisibility,
    source: NoteOwner = personal,
    token = session,
    parentId?: string,
  ): Promise<BatchAcceptInput> => {
    const operation = { kind: "sharing" as const, visibility };
    const preview = await previewBatch(c, token, {
      ids,
      source,
      operation,
      ...(parentId ? { parentId } : {}),
    });
    const items = preview.items.map((item): BatchConfirmation => {
      const confirmation = batchConfirmation(item);
      if (
        visibility !== "public" ||
        confirmation.kind !== "ready" ||
        confirmation.expected.kind !== "sharing" ||
        !confirmation.expected.snapshot.hasPassword
      )
        return confirmation;
      return {
        ...confirmation,
        expected: confirmation.expected,
        consent: {
          kind: "remove-password",
          noteId: confirmation.noteId,
          shareVersion: confirmation.expected.snapshot.share.shareVersion,
        },
      };
    });
    return { requestId: c.idGenerator.next(), source, operation, items };
  };
  const step = async () => {
    const claimed = await claimBatchAttempt(c, 60000);
    if (!claimed) throw new Error("Fixture queued attempt missing");
    await processBatchAttempt(c, claimed);
    return claimed;
  };
  const share = async (
    id: string,
    visibility: NoteVisibility,
    source: NoteOwner = personal,
  ) => {
    const receipt = await acceptBatch(
      c,
      session,
      await prepare([id], visibility, source),
    );
    await step();
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[0]?.state,
    ).toBe("succeeded");
  };
  const settings = (id: string) =>
    c.unitOfWorkProvider.run((u) => u.sharing.find(id));
  const change = async (
    id: string,
    operation: Parameters<typeof changeSharing>[2]["operation"],
  ) =>
    changeSharing(c, session, {
      expected: (await getSharing(c, session, id)).expected,
      operation,
    });
  const link = async (id: string) => {
    const value = await getShareLink(
      c,
      session,
      (await getSharing(c, session, id)).expected,
    );
    const token = new URL(value.url).pathname.split("/").at(-1);
    if (!token) throw new Error("Fixture share link missing");
    return token;
  };
  const move = async (noteId: string, destination: NoteOwner) =>
    moveNote(
      c,
      session,
      (await previewNoteMove(c, session, { noteId, destination })).expected,
    );

  it.each([
    "demotion",
    "leave",
  ] as const)("permanently cancels an editor's queued sharing after %s, even after edit access returns", async (loss) => {
    const { ws, source } = await workspace();
    const id = await note(source);
    const receipt = await acceptBatch(
      c,
      editorSession,
      await prepare([id], "link", source, editorSession),
    );
    const before = await settings(id);
    if (loss === "demotion")
      await changeWorkspaceMember(c, session, {
        workspaceId: ws.id,
        accountId: editor,
        role: "viewer",
        expectedRole: "editor",
        ownerConfirmed: false,
      });
    else await leaveWorkspace(c, editorSession, { workspaceId: ws.id });
    expect(
      (await getBatch(c, editorSession, { id: receipt.id })).items[0]?.state,
    ).toBe("cancelled");
    if (loss === "demotion")
      await changeWorkspaceMember(c, session, {
        workspaceId: ws.id,
        accountId: editor,
        role: "editor",
        expectedRole: "viewer",
        ownerConfirmed: false,
      });
    else
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.join(ws.id, editor, "editor", now),
      );
    expect(await claimBatchAttempt(c, 60000)).toBeNull();
    expect(
      (await getBatch(c, editorSession, { id: receipt.id })).items[0]?.state,
    ).toBe("cancelled");
    expect(isDeepStrictEqual(await settings(id), before)).toBe(true);
    const fresh = await acceptBatch(
      c,
      editorSession,
      await prepare([id], "link", source, editorSession),
    );
    await step();
    expect(
      (await getBatch(c, editorSession, { id: fresh.id })).items[0]?.state,
    ).toBe("succeeded");
  });

  it.each([
    false,
    true,
  ])("rejects old sharing confirmation after moving out of the source (round trip: %s)", async (roundTrip) => {
    const { source } = await workspace();
    const id = await note(source);
    const old = await prepare([id], "link", source);
    const receipt = await acceptBatch(c, session, old);
    await move(id, personal);
    if (roundTrip) await move(id, source);
    const before = await settings(id);
    await expect(
      acceptBatch(c, session, { ...old, requestId: c.idGenerator.next() }),
    ).rejects.toMatchObject({ code: "BATCH_CHANGED" });
    await step();
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[0],
    ).toMatchObject({
      state: "failed",
      failure: {
        code: roundTrip ? "SHARE_CONFIRMATION_CHANGED" : "BATCH_CHANGED",
      },
    });
    expect(isDeepStrictEqual(await settings(id), before)).toBe(true);
  });

  it("cancels queued sharing and immediately closes existing public and token readers when workspace deletion is accepted", async () => {
    const { ws, source } = await workspace();
    const id = await note(source);
    await share(id, "public", source);
    const token = await link(id);
    const identity = await c.unitOfWorkProvider.run((u) =>
      u.publicNotes.find(id),
    );
    if (!identity) throw new Error("Fixture public identity missing");
    const receipt = await acceptBatch(
      c,
      session,
      await prepare([id], "private", source),
    );
    const before = await settings(id);
    await requestWorkspaceDeletion(c, session, {
      workspaceId: ws.id,
      requestId: c.idGenerator.next(),
      confirmation: ws.name,
    });
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[0]?.state,
    ).toBe("cancelled");
    expect(await claimBatchAttempt(c, 60000)).toBeNull();
    await expect(
      c.unitOfWorkProvider.run((u) => currentPublicNote(u, identity)),
    ).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    await expect(readPublicNote(c, identity)).rejects.toMatchObject({
      code: "PUBLIC_NOT_FOUND",
    });
    await expect(readSharedNote(c, token, null)).rejects.toMatchObject({
      code: "SHARE_NOT_FOUND",
    });
    expect(isDeepStrictEqual(await settings(id), before)).toBe(true);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(id)))?.lifecycle
        .kind,
    ).toBe("active");
  });

  it("uses current visibility for public and token readers while preserving the canonical identity and rejecting a pre-private grant", async () => {
    const profile = await getProfile(c, session);
    await saveProfile(c, session, {
      displayName: "",
      handle: "policy-fixture",
      bio: "",
      nameVersion: profile.nameVersion,
      profileVersion: profile.profileVersion,
      confirmHandleChange: true,
    });
    const id = await note();
    await change(id, { kind: "password", password });
    await share(id, "link");
    const token = await link(id);
    await unlockShare(c, token, browser, password);
    expect(await readSharedNote(c, token, browser)).toMatchObject({
      kind: "content",
    });
    await share(id, "public");
    const identity = await c.unitOfWorkProvider.run((u) =>
      u.publicNotes.find(id),
    );
    if (!identity) throw new Error("Fixture public identity missing");
    const published = await readPublicNote(c, identity);
    expect(
      (await c.unitOfWorkProvider.run((u) => currentPublicNote(u, identity)))
        .note.id,
    ).toBe(id);
    expect(await readSharedNote(c, token, null)).toMatchObject({
      kind: "content",
    });
    expect((await link(id)) === token).toBe(true);
    await share(id, "link");
    await expect(
      c.unitOfWorkProvider.run((u) => currentPublicNote(u, identity)),
    ).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    await expect(readPublicNote(c, identity)).rejects.toMatchObject({
      code: "PUBLIC_NOT_FOUND",
    });
    expect(await readSharedNote(c, token, null)).toMatchObject({
      kind: "content",
    });
    await change(id, { kind: "password", password });
    await unlockShare(c, token, browser, password);
    const oldGrant = await c.unitOfWorkProvider.run((u) =>
      u.sharing.findGrant(id, c.tokens.hash(browser)),
    );
    expect(oldGrant !== null).toBe(true);
    await share(id, "private");
    await expect(readPublicNote(c, identity)).rejects.toMatchObject({
      code: "PUBLIC_NOT_FOUND",
    });
    await expect(readSharedNote(c, token, browser)).rejects.toMatchObject({
      code: "SHARE_NOT_FOUND",
    });
    await share(id, "link");
    expect((await link(id)) === token).toBe(true);
    expect(await readSharedNote(c, token, browser)).toEqual({ kind: "gate" });
    expect(
      isDeepStrictEqual(
        await c.unitOfWorkProvider.run((u) =>
          u.sharing.findGrant(id, c.tokens.hash(browser)),
        ),
        oldGrant,
      ),
    ).toBe(true);
    await unlockShare(c, token, browser, password);
    expect(await readSharedNote(c, token, browser)).toMatchObject({
      kind: "content",
    });
    await share(id, "public");
    const republished = await readPublicNote(c, identity);
    expect(republished.path).toBe(published.path);
    expect(republished.publicId).toBe(published.publicId);
    expect(republished.urlGeneration).toBe(published.urlGeneration);
    expect((await link(id)) === token).toBe(true);
    expect(
      (await c.unitOfWorkProvider.run((u) => currentPublicNote(u, identity)))
        .identity.accessEpoch,
    ).toBe(identity.accessEpoch + 1);
  });

  it("retries only the latest failed child using a fresh preview after repairing an empty body", async () => {
    const good = await note();
    const empty = await note(personal, "");
    const ids = [empty, good];
    const receipt = await acceptBatch(c, session, await prepare(ids, "link"));
    await step();
    await step();
    const first = await getBatch(c, session, { id: receipt.id });
    expect(first.items[0]).toMatchObject({
      state: "failed",
      attemptNumber: 1,
      failure: { code: "SHARE_BODY_REQUIRED" },
    });
    expect(first.items[1]?.state).toBe("succeeded");
    const before = await settings(good);
    const stale = await prepare(ids, "link", personal, session, receipt.id);
    expect(stale.items[1]).toEqual({ kind: "excluded", noteId: good });
    await saveNote(c, session, {
      id: empty,
      version: (await getSharing(c, session, empty)).expected.noteVersion,
      title: "Repaired child",
      html: "<p>Now saved</p>",
    });
    await expect(
      retryBatch(c, session, {
        id: receipt.id,
        generation: first.parent.generation,
        items: stale.items,
      }),
    ).rejects.toMatchObject({ code: "BATCH_CHANGED" });
    const fresh = await prepare(ids, "link", personal, session, receipt.id);
    expect(fresh.items[1]).toEqual({ kind: "excluded", noteId: good });
    expect(
      await retryBatch(c, session, {
        id: receipt.id,
        generation: first.parent.generation,
        items: fresh.items,
      }),
    ).toEqual({ id: receipt.id, total: 1 });
    await step();
    const final = await getBatch(c, session, { id: receipt.id });
    expect(final.items[0]).toMatchObject({
      state: "succeeded",
      attemptNumber: 2,
    });
    expect(final.items[0]?.id).not.toBe(first.items[0]?.id);
    expect(final.items[1]).toEqual(first.items[1]);
    expect(isDeepStrictEqual(await settings(good), before)).toBe(true);
    expect(
      (await prepare(ids, "link", personal, session, receipt.id)).items,
    ).toEqual(ids.map((noteId) => ({ kind: "excluded", noteId })));
    expect(await claimBatchAttempt(c, 60000)).toBeNull();
  });
});
