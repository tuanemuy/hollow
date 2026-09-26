import { randomBytes } from "node:crypto";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { ConflictError } from "@repo/core/application/errors";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import { unlockShare } from "@repo/core/application/sharing/reading";
import {
  changeSharing,
  getShareLink,
  getSharing,
} from "@repo/core/application/sharing/settings";
import {
  changeVisibilityInTransaction,
  readSharingForActorInTransaction,
  type VisibilityOperation,
} from "@repo/core/application/sharing/visibility";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import type {
  NoteVisibility,
  ShareExpected,
} from "@repo/core/domain/sharing/entity";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeSharePasswordWork } from "../../node/sharePasswordWork";
import { NodeShareTokenProtector } from "../../node/shareSecrets";
import { accounts, sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("transactional batch sharing convergence", () => {
  let base: TestContainer;
  let c: HollowContainer & { sharing: NonNullable<HollowContainer["sharing"]> };
  let directory: string;
  let noteId: string;
  const now = new Date("2026-09-26T00:00:00Z");
  const actor = "00000000-0000-4000-8000-000000000001";
  const editor = "00000000-0000-4000-8000-000000000002";
  const session = "batch-core-fixture-session";
  const browser = "batch-core-fixture-browser";
  const password = "batch core fixture password";
  const operation = (visibility: NoteVisibility): VisibilityOperation =>
    visibility === "public"
      ? { kind: "visibility", visibility, confirmPasswordRemoval: true }
      : { kind: "visibility", visibility };

  beforeEach(async () => {
    base = await createTestContainer();
    directory = await mkdtemp(
      path.join(await realpath(tmpdir()), "hollow-batch-core-"),
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
    await base.db.insert(accounts).values({
      id: actor,
      email: "batch-core@example.test",
      passwordHash: "fixture",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(session),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 86400_000),
    });
    noteId = (
      await saveNote(c, session, {
        title: "Batch core fixture",
        html: "<p>Saved body</p>",
      })
    ).note.id;
    const profile = await getProfile(c, session);
    await saveProfile(c, session, {
      displayName: "",
      handle: "batch-core-fixture",
      bio: "",
      nameVersion: profile.nameVersion,
      profileVersion: profile.profileVersion,
      confirmHandleChange: true,
    });
  });

  afterEach(async () => {
    await c.sharing.passwordWork.stop();
    base.close();
    await rm(directory, { recursive: true, force: true });
  });

  const view = () => getSharing(c, session, noteId);
  const change = async (
    next: Parameters<typeof changeSharing>[2]["operation"],
  ) =>
    changeSharing(c, session, {
      expected: (await view()).expected,
      operation: next,
    });
  const converge = async (
    next: VisibilityOperation,
    expected?: ShareExpected,
    actorId = actor,
  ) => {
    const current = expected ?? (await view()).expected;
    return c.unitOfWorkProvider.run((u) =>
      changeVisibilityInTransaction(c, u, actorId, {
        expected: current,
        operation: next,
        mode: "batch-converge",
      }),
    );
  };
  const state = () =>
    c.unitOfWorkProvider.run(async (u) => ({
      settings: await u.sharing.find(noteId),
      identity: await u.publicNotes.find(noteId),
      grant: await u.sharing.findGrant(noteId, c.tokens.hash(browser)),
      note: await u.notes.findById(noteId),
    }));
  const grantLink = async () => {
    await change({ kind: "password", password });
    await change(operation("link"));
    const link = await getShareLink(c, session, (await view()).expected);
    const token = new URL(link.url).pathname.split("/").at(-1);
    if (!token) throw new Error("Fixture link missing");
    await unlockShare(c, token, browser, password);
    expect((await state()).grant !== null).toBe(true);
  };

  it.each([
    "private",
    "link",
    "public",
  ] as const)("keeps all persisted sharing state for an equal %s batch target", async (visibility) => {
    await grantLink();
    await change(operation("public"));
    if (visibility !== "public") await change(operation(visibility));
    const before = await state();
    const expected = (await view()).expected;
    const result = await converge(operation(visibility), expected);
    expect(result).toEqual({
      kind: "unchanged",
      noteId,
      visibility,
      previousShareVersion: expected.shareVersion,
      shareVersion: expected.shareVersion,
    });
    expect(isDeepStrictEqual(await state(), before)).toBe(true);
  });

  it.each([
    "private",
    "link",
    "public",
  ] as const)("retains the single-command version advance when reapplying %s", async (visibility) => {
    await change(operation(visibility));
    const before = await state();
    const expected = (await view()).expected;
    const after = await change(operation(visibility));
    expect(after.expected.shareVersion).toBe(expected.shareVersion + 1);
    const persisted = await state();
    expect(persisted.settings?.grantEpoch).toBe(
      (before.settings?.grantEpoch ?? 0) + (visibility === "link" ? 0 : 1),
    );
    expect(persisted.settings?.linkGeneration).toBe(
      before.settings?.linkGeneration,
    );
    expect(
      persisted.settings?.tokenEnvelope === before.settings?.tokenEnvelope,
    ).toBe(true);
    expect(isDeepStrictEqual(persisted.identity, before.identity)).toBe(true);
  });

  it("allows closing an empty note but rejects link and public visibility without a saved body", async () => {
    await change(operation("link"));
    await saveNote(c, session, {
      id: noteId,
      version: (await view()).expected.noteVersion,
      title: "Empty body",
      html: "",
    });
    expect(await converge(operation("private"))).toMatchObject({
      kind: "changed",
      visibility: "private",
    });
    const before = await state();
    expect(await converge(operation("private"))).toMatchObject({
      kind: "unchanged",
    });
    for (const visibility of ["link", "public"] as const)
      await expect(converge(operation(visibility))).rejects.toMatchObject({
        code: "SHARE_BODY_REQUIRED",
      });
    expect(isDeepStrictEqual(await state(), before)).toBe(true);
  });

  it("binds password removal consent to the current share confirmation", async () => {
    await change({ kind: "password", password });
    const oldConsent = (await view()).expected;
    const before = await state();
    await expect(
      converge(
        {
          kind: "visibility",
          visibility: "public",
          confirmPasswordRemoval: false,
        },
        oldConsent,
      ),
    ).rejects.toMatchObject({ code: "SHARE_PUBLIC_PASSWORD_CONFIRM" });
    expect(isDeepStrictEqual(await state(), before)).toBe(true);
    await change({
      kind: "password",
      password: "replacement fixture password",
    });
    const changed = await state();
    await expect(
      converge(operation("public"), oldConsent),
    ).rejects.toMatchObject({ code: "SHARE_CONFIRMATION_CHANGED" });
    expect(isDeepStrictEqual(await state(), changed)).toBe(true);
    const current = (await view()).expected;
    expect(await converge(operation("public"), current)).toMatchObject({
      kind: "changed",
      previousShareVersion: current.shareVersion,
      shareVersion: current.shareVersion + 1,
    });
    expect(await view()).toMatchObject({
      visibility: "public",
      hasPassword: false,
    });
  });

  it("rolls back visibility, first token, public identity and revocation when the enclosing transaction fails", async () => {
    const abort = async (next: VisibilityOperation) => {
      const expected = (await view()).expected;
      await expect(
        c.unitOfWorkProvider.run(async (u) => {
          const result = await changeVisibilityInTransaction(c, u, actor, {
            expected,
            operation: next,
            mode: "batch-converge",
          });
          expect(result.kind).toBe("changed");
          throw new ConflictError(
            "FIXTURE_ROLLBACK",
            "batch core fixture rollback",
          );
        }),
      ).rejects.toMatchObject({ code: "FIXTURE_ROLLBACK" });
    };
    const initial = await state();
    await abort(operation("public"));
    expect(isDeepStrictEqual(await state(), initial)).toBe(true);
    await grantLink();
    await change(operation("public"));
    const published = await state();
    await abort(operation("private"));
    expect(isDeepStrictEqual(await state(), published)).toBe(true);
  });

  it("rejects a stale saved-note version before treating an equal target as unchanged", async () => {
    const expected = (await view()).expected;
    await saveNote(c, session, {
      id: noteId,
      version: expected.noteVersion,
      title: "New saved title",
      html: "<p>New saved body</p>",
    });
    const before = await state();
    await expect(
      converge(operation("private"), expected),
    ).rejects.toMatchObject({ code: "SHARE_CONFIRMATION_CHANGED" });
    expect(isDeepStrictEqual(await state(), before)).toBe(true);
  });

  it("rechecks the actor's current verified status inside the transaction", async () => {
    const expected = (await view()).expected;
    await base.db
      .update(accounts)
      .set({ verifiedAt: null })
      .where(eq(accounts.id, actor));
    const before = await state();
    await expect(
      c.unitOfWorkProvider.run((u) =>
        readSharingForActorInTransaction(u, actor, noteId),
      ),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
    await expect(
      converge(operation("private"), expected),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
    expect(isDeepStrictEqual(await state(), before)).toBe(true);
  });

  it("requires current edit permission and rejects an old confirmation after editor-role ABA", async () => {
    const workspace = await createWorkspace(c, session, {
      name: "Batch core workspace",
      description: "",
    });
    const editorSession = "batch-core-editor-session";
    await base.db.insert(accounts).values({
      id: editor,
      email: "batch-core-editor@example.test",
      passwordHash: "fixture",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(editorSession),
      accountId: editor,
      expiresAt: new Date(now.getTime() + 86400_000),
    });
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.join(workspace.id, editor, "editor", now),
    );
    noteId = (
      await saveNote(c, session, {
        workspaceId: workspace.id,
        title: "Workspace note",
        html: "<p>Saved body</p>",
      })
    ).note.id;
    const expected = (await getSharing(c, editorSession, noteId)).expected;
    const role = (next: "viewer" | "editor", previous: "viewer" | "editor") =>
      changeWorkspaceMember(c, session, {
        workspaceId: workspace.id,
        accountId: editor,
        role: next,
        expectedRole: previous,
        ownerConfirmed: false,
      });
    await role("viewer", "editor");
    await expect(
      converge(operation("private"), expected, editor),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await role("editor", "viewer");
    const before = await state();
    await expect(
      converge(operation("private"), expected, editor),
    ).rejects.toMatchObject({ code: "SHARE_CONFIRMATION_CHANGED" });
    expect(isDeepStrictEqual(await state(), before)).toBe(true);
    const current = (await getSharing(c, editorSession, noteId)).expected;
    expect(await converge(operation("link"), current, editor)).toMatchObject({
      kind: "changed",
      visibility: "link",
    });
  });
});
