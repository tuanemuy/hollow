import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NodeTagNormalizer } from "@repo/core/adapters/node/browse/tagNormalizer";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { NodeLlmExecution } from "@repo/core/adapters/node/llm/execution";
import { NodeLlmResultProcessor } from "@repo/core/adapters/node/llm/resultProcessor";
import { NodeLlmSourceReader } from "@repo/core/adapters/node/llm/sourceReader";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { ConflictError } from "@repo/core/application/errors";
import {
  cancelLlmRegeneration,
  llmUsage,
  undoLlmBody,
} from "@repo/core/application/llm/control";
import type { LlmGenerator } from "@repo/core/application/llm/ports";
import { requestLlmRegeneration } from "@repo/core/application/llm/request";
import { sweepLlm } from "@repo/core/application/llm/worker";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import {
  changeSharing,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { changeNoteTags } from "@repo/core/application/tag/usecases";
import {
  beginInvitation,
  copyInvitation,
  issueInvitations,
  joinInvitation,
} from "@repo/core/application/workspace/invitations";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { createNote, type NoteOwner } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

type Actor = Readonly<{ id: string; token: string }>;
const now = new Date("2026-09-28T00:00:00Z");
const originalBody = "<p>元の本文</p>";
const generatedBody = "<p>生成された本文</p>";
let base: TestContainer;
let c: HollowContainer;
let root: string;
let execution: NodeLlmExecution;
let actor: Actor;
let other: Actor;
let workspaceOwner: Actor;
let noteId: string;
let generate: ReturnType<typeof vi.fn<LlmGenerator["generate"]>>;
const releases: Array<() => void> = [];
const hash = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");

async function addActor(): Promise<Actor> {
  const id = base.idGenerator.next();
  const token = `synthetic-session-${id}`;
  await c.unitOfWorkProvider.run(async (u) => {
    await u.accounts.save(
      verifyAccount(
        createAccount(id, `${id}@fixture.invalid`, "synthetic", now),
        now,
      ),
    );
    await u.accounts.saveSession({
      accountId: id,
      tokenHash: c.tokens.hash(token),
      expiresAt: new Date(now.getTime() + 86400000),
    });
    const connection = await u.openRouterConnections.ensure(id, now);
    await u.openRouterConnections.replace(
      {
        ...connection,
        state: "linked",
        credentialEnvelope: "synthetic",
        epoch: 1,
        version: 2,
        linkedAt: now,
        everLinkedAt: now,
        keyExpiresAt: null,
        providerUserId: null,
        lastUsedAt: null,
      },
      1,
    );
  });
  return { id, token };
}

async function addNote(
  person: Actor,
  owner: NoteOwner = { kind: "personal", accountId: person.id },
) {
  const id = base.idGenerator.next();
  const originalId = base.idGenerator.next();
  const jobId = base.idGenerator.next();
  const batchId = base.idGenerator.next();
  const bytes = Buffer.from("自己原本の本文");
  await new FileObjectStorage(root).put(
    originalId,
    new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
    bytes.length,
  );
  await c.unitOfWorkProvider.run(async (u) => {
    const note = createNote(
      {
        id,
        accountId: person.id,
        owner,
        title: "現在の題名",
        html: originalBody,
        text: "元の本文",
      },
      now,
    );
    await u.notes.insert({
      ...note,
      display: {
        style: "original",
        source: "user",
        initialization: { kind: "complete", reason: "user" },
      },
    });
    await u.imports.insertBatch({
      id: batchId,
      accountId: person.id,
      ...(owner.kind === "workspace" ? { workspaceId: owner.workspaceId } : {}),
      createdAt: now,
      useAi: false,
      cancelledAt: null,
    });
    await u.imports.insertOriginal({
      id: originalId,
      noteId: id,
      accountId: person.id,
      name: "fixture.txt",
      bytes: bytes.length,
      storageKey: originalId,
      sha256: hash(bytes),
      format: "text",
      state: "ready",
      coverage: "complete",
      activeJobId: jobId,
      createdAt: now,
    });
    await u.jobs.insert({
      id: jobId,
      originalId,
      batchId,
      accountId: person.id,
      noteId: id,
      noteVersion: 0,
      useAi: false,
      state: "succeeded",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
      attempt: 1,
      retryOf: null,
      createdAt: now,
      updatedAt: now,
    });
  });
  return id;
}

beforeEach(async () => {
  base = await createTestContainer();
  root = await mkdtemp(path.join(tmpdir(), "hollow-llm-identity-test-"));
  const initial = createHollowContainer(base.db, "http://localhost:3100", {
    send: async () => {},
  });
  const clock = { now: () => now };
  const ownership = {
    runtimeId: base.idGenerator.next(),
    predecessors: () => [],
    assertReady: () => {},
    acknowledge: async () => {},
  };
  execution = new NodeLlmExecution(ownership, clock);
  const storage = new CoordinatedObjectStorage(
    root,
    initial.unitOfWorkProvider,
    clock,
  );
  await storage.recoverOwners();
  generate = vi.fn(async () => ({
    content: generatedBody,
    finish: "stop" as const,
    inputTokens: 1,
    outputTokens: 2,
  }));
  c = {
    ...initial,
    clock,
    invitationDelivery: {
      protector: { protect: (value) => value, reveal: (value) => value },
      mailer: { send: async () => {} },
      wake() {},
    },
    sharing: {
      protector: {
        protect: (value) => value,
        reveal: (value) => value,
        needsRotation: () => false,
      },
      passwordWork: { run: (work) => work(), stop: async () => {} },
    },
    tagging: {
      normalizer: NodeTagNormalizer,
      read: {
        async read() {
          throw new Error("unused tag reader");
        },
      },
    },
    openRouter: {
      authorization: {
        authorization: async () => "",
        exchange: async () => "synthetic",
        inspectCredential: async () => ({
          expiresAt: null,
          providerUserId: null,
        }),
      },
      catalog: { list: async () => [], fallback: () => [] },
      protector: {
        available: () => true,
        protect: (value) => value,
        reveal: (value) => value,
      },
      execution: {
        run: (work) => work(new AbortController().signal),
        stop: async () => {},
      },
    },
    llm: {
      configured: true,
      storage,
      source: new NodeLlmSourceReader(storage),
      preparer: {
        prepare: async () => ({
          kind: "text-blocks",
          preparationVersion: 1,
          segments: [
            {
              identity: {
                kind: "prepared-segment",
                sha256: hash(originalBody),
                ordinal: 0,
              },
              html: originalBody,
              firstBlock: 0,
              blockCount: 1,
            },
          ],
          blocks: 1,
          notices: [],
          media: [],
        }),
      },
      profiles: {
        inspect: async (modelId) => ({
          modelId,
          kind: "chat-text",
          contextTokens: 100000,
          outputTokens: 8192,
          supportsMaxTokens: true,
          source: "live",
          checkedAt: now,
        }),
      },
      generator: { generate: (...args) => generate(...args) },
      result: new NodeLlmResultProcessor(),
      execution,
      ownership,
      monthlyLimit: 30,
      wake: () => {},
    },
  };
  actor = await addActor();
  other = await addActor();
  workspaceOwner = await addActor();
  noteId = await addNote(actor);
});

afterEach(async () => {
  for (const release of releases.splice(0)) release();
  try {
    await execution.stop();
    expect((await base.db.all(sql`pragma foreign_key_check`)).length).toBe(0);
    expect(
      (await base.db.all(sql`select 1 from object_writes where active=1`))
        .length,
    ).toBe(0);
  } finally {
    base.close();
    await rm(root, { recursive: true, force: true });
  }
});

async function note(id = noteId) {
  const value = await c.unitOfWorkProvider.run((u) => u.notes.findById(id));
  if (!value) throw new Error("self note missing");
  return value;
}
async function request(id = noteId, person = actor) {
  return requestLlmRegeneration(c, person.token, {
    noteId: id,
    noteVersion: (await note(id)).version,
    commandId: base.idGenerator.next(),
    expectedEpoch: 1,
    modelId: "fixture/text",
    instruction: "整理",
    confirmed: true,
  });
}
const state = (id: string) =>
  c.unitOfWorkProvider.run((u) => u.llmConversions.find(id));
async function finished(id: string) {
  await vi.waitFor(async () =>
    expect((await state(id))?.phase).toBe("terminal"),
  );
  await vi.waitFor(() => expect(execution.active(id)).toBe(false));
  return state(id);
}
async function succeed(id = noteId, person = actor) {
  const job = await request(id, person);
  await sweepLlm(c);
  expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
  return job;
}
function heldGenerator() {
  let release = () => {};
  let started = false;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  releases.push(release);
  generate.mockImplementation(async () => {
    started = true;
    await promise;
    return {
      content: generatedBody,
      finish: "stop",
      inputTokens: 1,
      outputTokens: 2,
    };
  });
  return { release, started: () => started };
}
async function workspace() {
  const value = await createWorkspace(c, workspaceOwner.token, {
    name: "自己共有",
    description: "",
  });
  await c.unitOfWorkProvider.run(async (u) => {
    await u.workspaces.membership(value.id, actor.id, "editor");
    await u.workspaces.membership(value.id, other.id, "editor");
  });
  return value.id;
}

const revisions = () =>
  c.unitOfWorkProvider.run((u) => u.revisions.list(noteId));
const removeMember = (container: HollowContainer, workspaceId: string) =>
  changeWorkspaceMember(container, workspaceOwner.token, {
    workspaceId,
    accountId: actor.id,
    role: null,
    expectedRole: "editor",
    ownerConfirmed: false,
  });

describe("LLM identity fences and revision caller integration", () => {
  it("rejects the old response after removal and invitation rejoin, but permits a new request", async () => {
    const workspaceId = await workspace();
    const id = await addNote(actor, { kind: "workspace", workspaceId });
    const held = heldGenerator();
    const old = await request(id);
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    await removeMember(c, workspaceId);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.role(workspaceId, actor.id),
      ),
    ).toBeNull();
    await expect(request(id)).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await sweepLlm(c);
    const issued = await issueInvitations(c, workspaceOwner.token, {
      workspaceId,
      emails: [`${actor.id}@fixture.invalid`],
      role: "editor",
      ownerConfirmed: false,
      requestId: base.idGenerator.next(),
    });
    const invitationId = issued.ids[0];
    if (!invitationId) throw new Error("self invitation missing");
    const invitation = await c.unitOfWorkProvider.run((u) =>
      u.invitations.find(invitationId),
    );
    if (!invitation) throw new Error("self invitation missing");
    const link = await copyInvitation(c, workspaceOwner.token, {
      workspaceId,
      id: invitationId,
      generation: invitation.generation,
    });
    const raw = new URL(link.url).searchParams.get("token");
    if (!raw) throw new Error("self invitation unavailable");
    const browserToken = "synthetic-identity-browser";
    const continuation = await beginInvitation(c, raw, browserToken);
    await joinInvitation(c, actor.token, {
      continuationId: continuation.id,
      browserToken,
      confirmDifferentEmail: false,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.role(workspaceId, actor.id),
      ),
    ).toBe("editor");
    expect((await state(old.jobId))?.cancelGeneration).toBe(1);
    held.release();
    expect((await finished(old.jobId))?.outcome.kind).toBe("cancelled");
    expect(await note(id)).toMatchObject({ html: originalBody, version: 0 });
    const next = await succeed(id);
    expect(next.jobId === old.jobId).toBe(false);
    expect((await state(old.jobId))?.outcome.kind).toBe("cancelled");
    expect(await note(id)).toMatchObject({ html: generatedBody, version: 1 });
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 2,
      reserved: 0,
    });
  });

  it("rolls back membership and cancellation together and leaves unrelated actor and scope unchanged", async () => {
    const workspaceId = await workspace();
    const target = await request(
      await addNote(actor, { kind: "workspace", workspaceId }),
    );
    const sibling = await request(
      await addNote(other, { kind: "workspace", workspaceId }),
      other,
    );
    const personal = await request();
    const before = await Promise.all([
      state(target.jobId),
      state(sibling.jobId),
      state(personal.jobId),
    ]);
    const jobs = await c.unitOfWorkProvider.run(async (u) =>
      Promise.all(
        [target, sibling, personal].map((job) => u.jobs.find(job.jobId)),
      ),
    );
    let hookCalled = false;
    const failing: HollowContainer = {
      ...c,
      unitOfWorkProvider: {
        run: (work) =>
          c.unitOfWorkProvider.run(async (u) => {
            const original = u.llmConversions.cancelScopeActor.bind(
              u.llmConversions,
            );
            const spy = vi
              .spyOn(u.llmConversions, "cancelScopeActor")
              .mockImplementation(async (...args) => {
                await original(...args);
                hookCalled = true;
                throw new ConflictError(
                  "SELF_CANCELLATION_FAULT",
                  "Synthetic rollback",
                );
              });
            try {
              return await work(u);
            } finally {
              spy.mockRestore();
            }
          }),
      },
    };
    await expect(removeMember(failing, workspaceId)).rejects.toMatchObject({
      code: "SELF_CANCELLATION_FAULT",
    });
    expect(hookCalled).toBe(true);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.role(workspaceId, actor.id),
      ),
    ).toBe("editor");
    expect(
      await Promise.all([
        state(target.jobId),
        state(sibling.jobId),
        state(personal.jobId),
      ]),
    ).toEqual(before);
    expect(
      await c.unitOfWorkProvider.run(async (u) =>
        Promise.all(
          [target, sibling, personal].map((job) => u.jobs.find(job.jobId)),
        ),
      ),
    ).toEqual(jobs);
    await removeMember(c, workspaceId);
    expect((await state(target.jobId))?.cancelGeneration).toBe(1);
    expect(await state(sibling.jobId)).toEqual(before[1]);
    expect(await state(personal.jobId)).toEqual(before[2]);
    await cancelLlmRegeneration(c, actor.token, target.jobId);
    await cancelLlmRegeneration(c, other.token, sibling.jobId);
    await cancelLlmRegeneration(c, actor.token, personal.jobId);
  });

  it("generation and body undo preserve current title, style, tags, public and shared identity", async () => {
    const profile = await getProfile(c, actor.token);
    await saveProfile(c, actor.token, {
      displayName: "自己利用者",
      handle: "identity-fixture",
      bio: "",
      nameVersion: profile.nameVersion,
      profileVersion: profile.profileVersion,
      confirmHandleChange: false,
    });
    await changeNoteTags(c, actor.token, {
      noteId,
      expectedScope: {},
      change: { kind: "create", name: "前のタグ" },
    });
    await changeSharing(c, actor.token, {
      expected: (await getSharing(c, actor.token, noteId)).expected,
      operation: {
        kind: "visibility",
        visibility: "public",
        confirmPasswordRemoval: false,
      },
    });
    const before = await note();
    const identity = await c.unitOfWorkProvider.run((u) =>
      u.publicNotes.find(noteId),
    );
    const sharing = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    const oldTags = await c.unitOfWorkProvider.run((u) =>
      u.tags.selected(noteId),
    );
    const job = await succeed();
    expect((await note()).title).toBe(before.title);
    expect((await note()).display).toEqual(before.display);
    expect(
      await c.unitOfWorkProvider.run((u) => u.tags.selected(noteId)),
    ).toEqual(oldTags);
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toEqual(identity);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)))
        ?.tokenHash === sharing?.tokenHash,
    ).toBe(true);
    await changeNoteTags(c, actor.token, {
      noteId,
      expectedScope: {},
      change: { kind: "create", name: "生成後のタグ" },
    });
    await changeSharing(c, actor.token, {
      expected: (await getSharing(c, actor.token, noteId)).expected,
      operation: { kind: "visibility", visibility: "link" },
    });
    const current = await note();
    const currentTags = await c.unitOfWorkProvider.run((u) =>
      u.tags.selected(noteId),
    );
    const currentIdentity = await c.unitOfWorkProvider.run((u) =>
      u.publicNotes.find(noteId),
    );
    const currentSharing = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    await undoLlmBody(c, actor.token, job.jobId);
    const restored = await note();
    expect(restored).toMatchObject({
      html: originalBody,
      title: current.title,
      display: current.display,
      visibility: "link",
      owner: current.owner,
      creator: current.creator,
    });
    expect(
      await c.unitOfWorkProvider.run((u) => u.tags.selected(noteId)),
    ).toEqual(currentTags);
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toEqual(currentIdentity);
    const restoredSharing = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    expect(
      JSON.stringify(restoredSharing) === JSON.stringify(currentSharing),
    ).toBe(true);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });

  it("identical generated content adds no revision, including identical body undo", async () => {
    await saveNote(c, actor.token, {
      id: noteId,
      version: 0,
      title: (await note()).title,
      html: originalBody,
    });
    const before = await revisions();
    generate.mockResolvedValue({
      content: originalBody,
      finish: "stop",
      inputTokens: 1,
      outputTokens: 2,
    });
    const job = await succeed();
    expect(await revisions()).toEqual(before);
    expect((await note()).html).toBe(originalBody);
    await undoLlmBody(c, actor.token, job.jobId);
    expect(await revisions()).toEqual(before);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });

  it("the LLM commit and undo each prune to twenty revisions including current", async () => {
    for (let index = 0; index < 19; index++) {
      const current = await note();
      await saveNote(c, actor.token, {
        id: noteId,
        version: current.version,
        title: current.title,
        html: `<p>自己版${index}</p>`,
      });
    }
    expect((await revisions()).length).toBe(20);
    const before = await note();
    const job = await succeed();
    expect(
      (await revisions())
        .map((revision) => revision.revisionNo)
        .sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 20 }, (_, index) => index + 2));
    await undoLlmBody(c, actor.token, job.jobId);
    const retained = await revisions();
    expect(
      retained.map((revision) => revision.revisionNo).sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 20 }, (_, index) => index + 3));
    expect(
      retained.find((revision) => revision.revisionNo === 22),
    ).toMatchObject({ html: before.html, cause: "restore", restoredFrom: 20 });
    expect((await note()).html).toBe(before.html);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });
});
