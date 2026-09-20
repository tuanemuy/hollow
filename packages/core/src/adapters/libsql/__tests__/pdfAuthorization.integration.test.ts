import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  moveNote,
  previewNoteMove,
} from "@repo/core/application/move/usecases";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  cancelPdf,
  lookupPdf,
  type PdfJobView,
  preparePdfDelivery,
  requestPdf,
} from "@repo/core/application/pdf/usecases";
import { readPublicNote } from "@repo/core/application/publication/reading";
import {
  changeSharing,
  getSharing,
} from "@repo/core/application/sharing/settings";
import {
  beginInvitation,
  copyInvitation,
  issueInvitations,
  joinInvitation,
} from "@repo/core/application/workspace/invitations";
import {
  changeWorkspaceMember,
  leaveWorkspace,
} from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import type { WorkspaceRole } from "@repo/core/domain/workspace/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

type Actor = Readonly<{ id: string; token: string; email: string }>;
const unavailable = (): never => {
  throw Error("PDF authorization test must not perform physical work");
};

describe("PDF current authorization and workspace membership transactions", () => {
  let base: TestContainer | undefined;
  let c: HollowContainer;
  let owner: Actor;
  let member: Actor;
  let workspaceId: string;
  let noteId: string;
  let mails: string[];
  let now: Date;

  beforeEach(async () => {
    base = await createTestContainer();
    now = new Date("2026-09-20T00:00:00Z");
    mails = [];
    const envelopes = new Map<string, { token: string; binding: string }>();
    const protector = {
      protect(token: string, binding: unknown) {
        const envelope = `fixture-${envelopes.size}`;
        envelopes.set(envelope, { token, binding: JSON.stringify(binding) });
        return envelope;
      },
      reveal(envelope: string, binding: unknown) {
        const stored = envelopes.get(envelope);
        if (!stored || stored.binding !== JSON.stringify(binding))
          throw Error("fixture binding");
        return stored.token;
      },
    };
    const pdf: NonNullable<HollowContainer["pdf"]> = {
      writer: { plan: unavailable },
      sources: { read: unavailable },
      workspace: {
        reservation: unavailable,
        writePack: unavailable,
        readOutput: unavailable,
        remove: unavailable,
        bytes: unavailable,
      },
      supervisor: {
        profile: "authorization-test",
        recover: unavailable,
        render: unavailable,
        stop: unavailable,
      },
      execution: {
        start: unavailable,
        active: unavailable,
        cancel: unavailable,
        stop: unavailable,
      },
      transfers: {
        runtimeId: "authorization-test",
        hold: unavailable,
        ids: unavailable,
        release: unavailable,
        cancel: unavailable,
        stop: unavailable,
      },
      capacity: {
        diskBytes: 100000,
        outputBytes: 1000,
        nativeTempBytes: 1000,
        finalCopyBytes: 1000,
        totalMs: 120000,
        renderMs: 30000,
        termGraceMs: 3000,
        leaseMs: 60000,
        cleanupDelayMs: 5000,
      },
      defaultCss: "",
      wake() {},
    };
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(mail) {
          mails.push(mail.text);
        },
      }),
      clock: { now: () => now },
      logger: { info() {}, warn() {}, error() {} },
      pdf,
      importing: {
        storage: {
          putBounded: unavailable,
          put: unavailable,
          read: unavailable,
          stat: unavailable,
          stream: unavailable,
          remove: unavailable,
        },
        extractor: { extract: unavailable },
        mediaValidator: { validate: unavailable },
        detectFormat: unavailable,
        wake() {},
      },
      invitationDelivery: {
        protector,
        mailer: { send: unavailable },
        wake() {},
      },
      sharing: {
        protector: { ...protector, needsRotation: () => false },
        passwordWork: { run: unavailable, stop: unavailable },
      },
    };
    owner = await user("owner@example.test");
    member = await user("member@example.test");
    workspaceId = (
      await createWorkspace(c, owner.token, {
        name: "PDF authorization",
        description: "",
        slug: "pdf-authorization",
      })
    ).id;
    noteId = (
      await saveNote(c, owner.token, {
        workspaceId,
        title: "Saved authorization fixture",
        html: "<p>Saved content only</p>",
      })
    ).note.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    base?.close();
    base = undefined;
  });

  async function user(email: string): Promise<Actor> {
    const signup = await signUp(c, {
      email,
      password: "test-password-1234",
      termsAccepted: true,
    });
    const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!link) throw Error("fixture mail");
    const verified = await verifyEmail(
      c,
      new URL(link).searchParams.get("token") ?? "",
      signup.browserToken,
    );
    if (!verified) throw Error("fixture verification");
    const session = await signIn(c, { email, password: "test-password-1234" });
    return { id: session.user.id, token: session.token, email };
  }

  async function join(role: WorkspaceRole, targetWorkspace = workspaceId) {
    const issued = await issueInvitations(c, owner.token, {
      workspaceId: targetWorkspace,
      emails: [member.email],
      role,
      ownerConfirmed: true,
      requestId: c.idGenerator.next(),
    });
    const id = issued.ids[0];
    if (!id) throw Error("fixture invitation");
    const row = await c.unitOfWorkProvider.run((u) => u.invitations.find(id));
    if (!row) throw Error("fixture invitation row");
    const copied = await copyInvitation(c, owner.token, {
      workspaceId: targetWorkspace,
      id,
      generation: row.generation,
    });
    const browserToken = c.tokens.generate();
    const continuation = await beginInvitation(
      c,
      new URL(copied.url).searchParams.get("token") ?? "",
      browserToken,
    );
    await joinInvitation(c, member.token, {
      continuationId: continuation.id,
      browserToken,
      confirmDifferentEmail: false,
    });
  }

  const request = (actor = member) =>
    requestPdf(c, actor.token, { noteId, commandId: c.idGenerator.next() });
  const change = (expectedRole: WorkspaceRole, role: WorkspaceRole | null) =>
    changeWorkspaceMember(c, owner.token, {
      workspaceId,
      accountId: member.id,
      expectedRole,
      role,
      ownerConfirmed: true,
    });

  async function publicVisibility(visibility: "public" | "private") {
    const view = await getSharing(c, owner.token, noteId);
    await changeSharing(c, owner.token, {
      expected: view.expected,
      operation: {
        kind: "visibility",
        visibility,
        confirmPasswordRemoval: true,
      },
    });
    const identity = await c.unitOfWorkProvider.run((u) =>
      u.publicNotes.find(noteId),
    );
    if (!identity) throw Error("fixture public identity");
    return identity;
  }

  it.each([
    "owner",
    "editor",
    "viewer",
  ] as const)("accepts the current %s and isolates an outsider's command and cancellation", async (role) => {
    await join(role);
    const job = await request();
    expect(job).toMatchObject({ state: "queued", actorId: member.id, noteId });
    const outsider = await user("outsider@example.test");
    await expect(request(outsider)).rejects.toMatchObject({
      code: "PDF_NOT_FOUND",
    });
    expect(await lookupPdf(c, outsider.token, job.commandId)).toBeNull();
    await expect(cancelPdf(c, outsider.token, job.id)).rejects.toMatchObject({
      code: "PDF_NOT_FOUND",
    });
    expect(await cancelPdf(c, member.token, job.id)).toMatchObject({
      state: "cancelled",
    });
  });

  it.each([
    ["owner", "editor"],
    ["owner", "viewer"],
    ["editor", "viewer"],
    ["owner", null],
    ["editor", null],
    ["viewer", null],
  ] as const)("cancels %s → %s before membership changes in the same transaction", async (old, next) => {
    await join(old);
    const job = await request();
    const sibling = await request(owner);
    const real = c.unitOfWorkProvider;
    let checked = false;
    const instrumented: HollowContainer = {
      ...c,
      unitOfWorkProvider: {
        run(operation) {
          return real.run(async (u) => {
            const membership = u.workspaces.membership.bind(u.workspaces);
            vi.spyOn(u.workspaces, "membership").mockImplementation(
              async (...args) => {
                expect(await u.pdfRequests.find(job.id)).toMatchObject({
                  state: "cancelled",
                });
                expect(await u.pdfRequests.find(sibling.id)).toMatchObject({
                  state: "queued",
                });
                expect(await u.workspaces.role(workspaceId, member.id)).toBe(
                  old,
                );
                checked = true;
                return membership(...args);
              },
            );
            return operation(u);
          });
        },
      },
    };
    await changeWorkspaceMember(instrumented, owner.token, {
      workspaceId,
      accountId: member.id,
      expectedRole: old,
      role: next,
      ownerConfirmed: true,
    });
    expect(checked).toBe(true);
    expect(await lookupPdf(c, member.token, job.commandId)).toMatchObject({
      state: "cancelled",
      version: job.version + 1,
    });
    expect(await lookupPdf(c, owner.token, sibling.commandId)).toMatchObject({
      state: "queued",
      version: sibling.version,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.role(workspaceId, member.id),
      ),
    ).toBe(next);
  });

  it.each([
    "owner",
    "editor",
    "viewer",
  ] as const)("cancels a leaving %s without reviving on rejoin", async (role) => {
    await join(role);
    const job = await request();
    const sibling = await request(owner);
    await leaveWorkspace(c, member.token, { workspaceId });
    expect(await lookupPdf(c, member.token, job.commandId)).toMatchObject({
      state: "cancelled",
    });
    now = new Date(+now + 60001);
    await join(role);
    expect(
      await requestPdf(c, member.token, { noteId, commandId: job.commandId }),
    ).toMatchObject({ id: job.id, state: "cancelled" });
    expect(await request()).toMatchObject({ state: "queued" });
    expect(await lookupPdf(c, owner.token, sibling.commandId)).toMatchObject({
      state: "queued",
    });
  });

  it("rolls back cancellation if the membership write fails", async () => {
    await join("editor");
    const job = await request();
    const real = c.unitOfWorkProvider;
    const failure = Error("injected membership write failure");
    const instrumented: HollowContainer = {
      ...c,
      unitOfWorkProvider: {
        run(operation) {
          return real.run(async (u) => {
            vi.spyOn(u.workspaces, "membership").mockImplementation(
              async () => {
                expect(await u.pdfRequests.find(job.id)).toMatchObject({
                  state: "cancelled",
                });
                throw failure;
              },
            );
            return operation(u);
          });
        },
      },
    };
    await expect(
      leaveWorkspace(instrumented, member.token, { workspaceId }),
    ).rejects.toMatchObject({ code: "DATABASE_ERROR" });
    expect(await lookupPdf(c, member.token, job.commandId)).toMatchObject({
      state: "queued",
      version: job.version,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.role(workspaceId, member.id),
      ),
    ).toBe("editor");
  });

  it("does not cancel a same-content note already moved into a still-readable workspace", async () => {
    await join("editor");
    const destination = await createWorkspace(c, owner.token, {
      name: "Destination",
      description: "",
    });
    await join("viewer", destination.id);
    const job = await request();
    const before = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(job.id),
    );
    const preview = await previewNoteMove(c, owner.token, {
      noteId,
      destination: { kind: "workspace", workspaceId: destination.id },
    });
    await moveNote(c, owner.token, preview.expected);
    await change("editor", null);
    expect(await lookupPdf(c, member.token, job.commandId)).toMatchObject({
      state: "queued",
      version: job.version,
    });
    const after = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(job.id),
    );
    expect(after?.sourceIdentity).toBe(before?.sourceIdentity);
    expect(await request()).toMatchObject({ state: "queued" });
    const claim = await c.unitOfWorkProvider.run((u) =>
      u.pdfComputations.claim(now, "fixture-lease", new Date(+now + 60000)),
    );
    expect(claim?.id).toBe(before?.computeId);
  });

  it("keeps an old cancelled command terminal despite independent public read and new demand", async () => {
    await join("viewer");
    const job = await request();
    const sibling = await request(owner);
    const identity = await publicVisibility("public");
    await change("viewer", null);
    expect((await readPublicNote(c, identity)).title).toBe(
      "Saved authorization fixture",
    );
    expect(await lookupPdf(c, member.token, job.commandId)).toMatchObject({
      state: "cancelled",
    });
    expect(
      await requestPdf(c, member.token, { noteId, commandId: job.commandId }),
    ).toMatchObject({ id: job.id, state: "cancelled" });
    await expect(
      preparePdfDelivery(c, member.token, job.id),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    expect(await request()).toMatchObject({ state: "queued" });
    expect(await lookupPdf(c, owner.token, sibling.commandId)).toMatchObject({
      state: "queued",
    });
    await publicVisibility("private");
    await expect(readPublicNote(c, identity)).rejects.toMatchObject({
      code: "PUBLIC_NOT_FOUND",
    });
    await expect(request()).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
  });

  it("does not use link-only visibility as an outsider's application PDF authority", async () => {
    const view = await getSharing(c, owner.token, noteId);
    await changeSharing(c, owner.token, {
      expected: view.expected,
      operation: { kind: "visibility", visibility: "link" },
    });
    await expect(request()).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
    ).toEqual([]);
  });

  async function publishMetadataOnly(job: PdfJobView) {
    await c.unitOfWorkProvider.run(async (u) => {
      const compute = await u.pdfComputations.claim(
        now,
        "fixture-publish",
        new Date(+now + 60000),
      );
      if (!compute) throw Error("fixture computation");
      const id = c.idGenerator.next();
      await u.pdfArtifacts.begin(
        {
          id,
          targetNoteId: noteId,
          liveNoteId: noteId,
          computeId: compute.id,
          sourceIdentity: compute.sourceIdentity,
          profile: compute.profile,
          state: "writing",
          key: `pdf/${id}`,
          file: null,
          publishedAt: null,
          expiresAt: null,
          reservedBytes: 10,
          generation: 1,
          nextCleanupAt: now,
          cleanupToken: null,
          cleanupUntil: null,
          createdAt: now,
        },
        100000,
      );
      // Repository-only ready metadata: no PDF bytes or storage success is claimed.
      expect(
        await u.pdfArtifacts.publish(
          id,
          1,
          "fixture-publish",
          { filename: "fixture.pdf", bytes: 5, sha256: "a".repeat(64) },
          now,
        ),
      ).toBe(true);
      expect(await u.pdfRequests.succeed(compute.id, id, now)).toBe(1);
      expect(
        await u.pdfComputations.closed(compute.id, "fixture-publish", now),
      ).toBe(true);
      expect(await u.pdfRequests.find(job.id)).toMatchObject({
        state: "succeeded",
      });
    });
  }

  it("authorizes a completed request's new ticket by current public read, never another actor, and rejects unpublication", async () => {
    await join("viewer");
    const job = await request();
    await publishMetadataOnly(job);
    const identity = await publicVisibility("public");
    await change("viewer", null);
    expect((await readPublicNote(c, identity)).title).toBe(
      "Saved authorization fixture",
    );
    await expect(
      preparePdfDelivery(c, owner.token, job.id),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    const ticket = await preparePdfDelivery(c, member.token, job.id);
    expect(ticket.url).toBe(`/api/pdf-deliveries/${ticket.id}`);
    await c.unitOfWorkProvider.run((u) =>
      u.pdfDeliveries.close(ticket.id, null),
    );
    await publicVisibility("private");
    await expect(
      preparePdfDelivery(c, member.token, job.id),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    expect(await lookupPdf(c, member.token, job.commandId)).toMatchObject({
      state: "succeeded",
    });
  });

  it("rejects old completed PDF content even when the former member can currently read the public note", async () => {
    await join("viewer");
    const job = await request();
    await publishMetadataOnly(job);
    const identity = await publicVisibility("public");
    await change("viewer", null);
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!note) throw Error("fixture note");
    await saveNote(c, owner.token, {
      id: noteId,
      version: note.version,
      title: "Changed after publication",
      html: "<p>New saved content</p>",
    });
    expect((await readPublicNote(c, identity)).title).toBe(
      "Changed after publication",
    );
    await expect(
      preparePdfDelivery(c, member.token, job.id),
    ).rejects.toMatchObject({ code: "PDF_CONTENT_CHANGED" });
  });
});
