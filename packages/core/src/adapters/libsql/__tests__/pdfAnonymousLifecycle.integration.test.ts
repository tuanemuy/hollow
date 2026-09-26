import { createHash } from "node:crypto";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { NodePdfAnonymousTicketSigner } from "@repo/core/adapters/node/pdf/anonymousTicketSigner";
import { planPdfDocument } from "@repo/core/adapters/node/pdf/document";
import { NodePdfExecution } from "@repo/core/adapters/node/pdf/execution";
import { FilePdfSourceReader } from "@repo/core/adapters/node/pdf/source";
import { NodePdfTransfers } from "@repo/core/adapters/node/pdf/transfers";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  moveNote,
  previewNoteMove,
} from "@repo/core/application/move/usecases";
import {
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { restoreNote, trashNote } from "@repo/core/application/note/trash";
import { getAnonymousPdfFile } from "@repo/core/application/pdf/anonymousDelivery";
import {
  anonymousPdfStatus,
  prepareAnonymousPdfDelivery,
  requestAnonymousPdf,
} from "@repo/core/application/pdf/anonymousUsecases";
import { sweepPdf } from "@repo/core/application/pdf/worker";
import {
  getWorkspaceDeletionReceipt,
  requestWorkspaceDeletion,
  sweepWorkspaceDeletions,
} from "@repo/core/application/workspace/deletion";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

function gate() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe("anonymous PDF lifecycle and physical ownership", () => {
  let base: TestContainer | undefined;
  let c: HollowContainer;
  let pdf: NonNullable<HollowContainer["pdf"]> | undefined;
  let storage: CoordinatedObjectStorage;
  let root: string | undefined;
  let token: string;
  let noteId: string;
  let sourceWorkspace: string;
  let now: Date;
  let releases: (() => void)[];
  let streams: ReadableStream<Uint8Array>[];
  let pendingClosures: Promise<void>[];
  const sourceName = "Anonymous PDF source";
  const access = {
    kind: "link" as const,
    token: "a".repeat(43),
    browser: "b".repeat(43),
  };
  const output = Buffer.from(
    "%PDF-1.7\nsynthetic lifecycle bytes only\n%%EOF\n",
  );
  const digest = createHash("sha256").update(output).digest("hex");

  beforeEach(async () => {
    base = undefined;
    pdf = undefined;
    root = undefined;
    releases = [];
    streams = [];
    pendingClosures = [];
    base = await createTestContainer();
    root = await mkdtemp(
      path.join(os.tmpdir(), "hollow-anonymous-pdf-lifecycle-"),
    );
    await chmod(root, 0o700);
    now = new Date();
    const mails: string[] = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(mail) {
          mails.push(mail.text);
        },
      }),
      clock: { now: () => now },
      logger: { info() {}, warn() {}, error() {} },
    };
    await writeFile(path.join(root, "fixture.key"), Buffer.alloc(32, 17), {
      mode: 0o600,
    });
    const keyring = path.join(root, "ring.json");
    await writeFile(
      keyring,
      JSON.stringify({
        activeKeyId: "fixture",
        keys: [{ id: "fixture", path: "fixture.key" }],
      }),
      { mode: 0o600 },
    );
    c = {
      ...c,
      pdfAnonymousTicketSigner:
        await NodePdfAnonymousTicketSigner.load(keyring),
    };
    expect(c.pdfAnonymousTicketSigner.activeKeyId()).toBe("fixture");
    const signup = await signUp(c, {
      email: "anonymous-lifecycle@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const url = mails.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!url) throw Error("fixture verification mail");
    const auth = await verifyEmail(
      c,
      new URL(url).searchParams.get("token") ?? "",
      signup.browserToken,
    );
    if (!auth) throw Error("fixture verification");
    token = auth.token;
    sourceWorkspace = (
      await createWorkspace(c, token, { name: sourceName, description: "" })
    ).id;
    noteId = (
      await saveNote(c, token, {
        workspaceId: sourceWorkspace,
        title: "Lifecycle fixture",
        html: "<p>Unchanged synthetic content</p>",
      })
    ).note.id;
    await base.db.run(
      sql`update note_sharing set visibility='link',link_generation=1,token_hash=${c.tokens.hash(access.token)},token_envelope='synthetic-only',grant_epoch=1 where note_id=${noteId}`,
    );
    storage = new CoordinatedObjectStorage(root, c.unitOfWorkProvider, c.clock);
    await storage.recoverOwners();
    pdf = {
      writer: {
        async plan(input) {
          return planPdfDocument(input);
        },
      },
      sources: new FilePdfSourceReader(root),
      workspace: {
        reservation: () => 10,
        async writePack() {},
        async *readOutput() {
          yield output;
        },
        async remove() {
          return true;
        },
        async bytes() {
          return 100;
        },
      },
      supervisor: {
        profile: "synthetic-anonymous-lifecycle-v1",
        async recover() {},
        async stop() {},
        async render(input, signal) {
          signal.throwIfAborted();
          return {
            workspaceId: input.workspaceId,
            filename: input.plan.filename,
            bytes: output.length,
            sha256: digest,
          };
        },
      },
      execution: new NodePdfExecution(),
      transfers: new NodePdfTransfers(),
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
      ...c,
      pdf,
      importing: {
        storage,
        extractor: {
          async extract() {
            throw Error("unused extraction fixture");
          },
        },
        mediaValidator: { async validate() {} },
        async detectFormat() {
          return "html";
        },
        wake() {},
      },
    };
  });

  afterEach(async () => {
    for (const release of releases) release();
    try {
      await Promise.all(streams.map((body) => body.cancel().catch(() => {})));
      await Promise.all(pendingClosures);
      await pdf?.execution.stop();
      await pdf?.transfers.stop();
    } finally {
      vi.restoreAllMocks();
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
    }
  });

  async function request() {
    const commandId = c.idGenerator.next();
    const accepted = await requestAnonymousPdf(c, access, commandId);
    const claims = c.pdfAnonymousTicketSigner.verify(accepted.ticket);
    if (!claims) throw Error("fixture signed receipt");
    return { ...accepted, commandId, requestId: claims.requestId };
  }
  const row = (id: string) =>
    c.unitOfWorkProvider.run((u) => u.pdfAnonymousRequests.find(id));
  const note = () => c.unitOfWorkProvider.run((u) => u.notes.findById(noteId));
  async function ready() {
    const accepted = await request();
    await sweepPdf(c);
    await vi.waitFor(
      async () =>
        expect(
          await anonymousPdfStatus(c, access, accepted.ticket),
        ).toMatchObject({ kind: "ready" }),
      { timeout: 3000, interval: 10 },
    );
    await vi.waitFor(
      async () => {
        const request = await row(accepted.requestId);
        if (!request?.computeId) throw Error("fixture computation");
        expect(
          await c.unitOfWorkProvider.run((u) =>
            u.pdfComputations.find(request.computeId ?? ""),
          ),
        ).toMatchObject({ state: "closed" });
        expect(pdf?.execution.active(request.computeId)).toBe(false);
      },
      { timeout: 3000, interval: 10 },
    );
    const storedRequest = await row(accepted.requestId);
    if (!storedRequest?.artifactId || !storedRequest.computeId)
      throw Error("fixture artifact");
    const artifact = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.find(storedRequest.artifactId ?? ""),
    );
    if (!artifact || artifact.state !== "ready")
      throw Error("fixture ready artifact");
    return {
      ...accepted,
      request: storedRequest,
      artifact,
      computeId: storedRequest.computeId,
    };
  }
  async function trash() {
    const current = await note();
    if (!current) throw Error("fixture current note");
    return trashNote(c, token, {
      id: noteId,
      version: current.version,
      cancelProcessing: true,
    });
  }
  async function foreignKeys() {
    expect(
      (await base?.client.execute("PRAGMA foreign_key_check"))?.rows,
    ).toEqual([]);
  }

  it("invalidates old anonymous receipts in trash and does not revive them on restore", async () => {
    const accepted = await ready();
    const before = await row(accepted.requestId);
    const trashed = await trash();
    expect(await row(accepted.requestId)).toMatchObject({
      state: "invalidated",
      version: (before?.version ?? 0) + 1,
    });
    await expect(
      anonymousPdfStatus(c, access, accepted.ticket),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    await restoreNote(c, token, {
      id: noteId,
      operationId: trashed.operationId,
    });
    await expect(
      anonymousPdfStatus(c, access, accepted.ticket),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    await expect(
      requestAnonymousPdf(c, access, accepted.commandId),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    await expect(
      prepareAnonymousPdfDelivery(c, access, accepted.ticket, false),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    const fresh = await request();
    expect(fresh.requestId).not.toBe(accepted.requestId);
    expect(await anonymousPdfStatus(c, access, fresh.ticket)).toMatchObject({
      kind: "ready",
    });
    expect(await row(accepted.requestId)).toMatchObject({
      state: "invalidated",
      ticketExpiresAt: before?.ticketExpiresAt,
    });
    await foreignKeys();
  });

  it.each([
    "ready",
    "sending",
  ] as const)("waits for an anonymous %s delivery and physical artifact removal before purge", async (state) => {
    const accepted = await ready();
    await sweepPdf(c);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.find(accepted.computeId),
      ),
    ).toMatchObject({ workspaceRemoved: true });
    const delivery = await prepareAnonymousPdfDelivery(
      c,
      access,
      accepted.ticket,
      true,
    );
    if (!delivery || !pdf) throw Error("fixture delivery");
    const closed = gate();
    const closing = gate();
    releases.push(closed.release);
    let cancellation: Promise<void> | undefined;
    let cancellationDone = false;
    if (state === "sending") {
      const sources = pdf.sources;
      c = {
        ...c,
        pdf: {
          ...pdf,
          sources: {
            async *read(source, signal) {
              try {
                yield* sources.read(source, signal);
              } finally {
                closing.release();
                await closed.promise;
              }
            },
          },
        },
      };
      const file = await getAnonymousPdfFile(
        c,
        access,
        accepted.ticket,
        delivery.id,
        new AbortController().signal,
      );
      streams.push(file.body);
      cancellation = file.body.cancel().then(() => {
        cancellationDone = true;
      });
      pendingClosures.push(cancellation.catch(() => {}));
      await closing.promise;
      expect(pdf.transfers.ids()).toEqual([
        { kind: "anonymous", id: delivery.id },
      ]);
    }
    const trashed = await trash();
    const purge = await requestNotePurge(c, token, {
      id: noteId,
      operationId: trashed.operationId,
    });
    await sweepNotePurges(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.purges.find(purge.id)),
    ).toMatchObject({ state: "queued" });
    expect(await note()).toMatchObject({ lifecycle: { kind: "purging" } });
    expect(await row(accepted.requestId)).toMatchObject({
      state: "invalidated",
      liveNoteId: noteId,
    });
    expect(await storage.read(accepted.artifact.key, output.length)).toEqual(
      output,
    );
    await sweepPdf(c);
    if (state === "sending") {
      now = new Date(+now + 2001);
      await sweepNotePurges(c);
      expect(cancellationDone).toBe(false);
      expect(pdf.transfers.ids()).toEqual([
        { kind: "anonymous", id: delivery.id },
      ]);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.pdfAnonymousDeliveries.find(delivery.id),
        ),
      ).toMatchObject({ state: "sending" });
      expect(await storage.read(accepted.artifact.key, output.length)).toEqual(
        output,
      );
      const active = await base?.db.all(
        sql`select owner_id from object_writes where kind='pdf-anonymous-delivery' and owner_id=${delivery.id} and active=1`,
      );
      expect(active).toHaveLength(1);
      closed.release();
      await cancellation;
      expect(pdf.transfers.ids()).toEqual([]);
    }
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousDeliveries.find(delivery.id),
      ),
    ).toMatchObject({ state: "closed" });
    now = new Date(+now + 5001);
    await sweepPdf(c);
    await sweepNotePurges(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.purges.find(purge.id)),
    ).toMatchObject({ state: "succeeded" });
    expect(await note()).toBeNull();
    expect(await row(accepted.requestId)).toMatchObject({
      state: "invalidated",
      liveNoteId: null,
      targetNoteId: noteId,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfArtifacts.find(accepted.artifact.id),
      ),
    ).toMatchObject({ state: "removed", key: null, liveNoteId: null });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.find(accepted.computeId),
      ),
    ).toMatchObject({
      state: "closed",
      workspaceRemoved: true,
      liveNoteId: null,
    });
    await expect(
      storage.read(accepted.artifact.key, output.length),
    ).rejects.toBeDefined();
    await foreignKeys();
  });

  it("does not detach live references before the artifact removal actually completes", async () => {
    const accepted = await ready();
    await sweepPdf(c);
    const trashed = await trash();
    const purge = await requestNotePurge(c, token, {
      id: noteId,
      operationId: trashed.operationId,
    });
    const removal = gate();
    releases.push(removal.release);
    let removing = false;
    const removeClaimed = storage.removeClaimed.bind(storage);
    vi.spyOn(storage, "removeClaimed").mockImplementation(async (key) => {
      if (key === accepted.artifact.key) {
        removing = true;
        await removal.promise;
      }
      return removeClaimed(key);
    });
    const collecting = sweepNotePurges(c);
    pendingClosures.push(collecting.catch(() => {}));
    try {
      await vi.waitFor(() => expect(removing).toBe(true), {
        timeout: 3000,
        interval: 10,
      });
      expect(
        await c.unitOfWorkProvider.run((u) => u.purges.find(purge.id)),
      ).toMatchObject({ state: "running" });
      expect(await note()).toMatchObject({ lifecycle: { kind: "purging" } });
      expect(await row(accepted.requestId)).toMatchObject({
        liveNoteId: noteId,
      });
      expect(await storage.read(accepted.artifact.key, output.length)).toEqual(
        output,
      );
    } finally {
      removal.release();
      await collecting;
    }
    expect(
      await c.unitOfWorkProvider.run((u) => u.purges.find(purge.id)),
    ).toMatchObject({ state: "succeeded" });
    expect(await note()).toBeNull();
    expect(await row(accepted.requestId)).toMatchObject({ liveNoteId: null });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfArtifacts.find(accepted.artifact.id),
      ),
    ).toMatchObject({ state: "removed", liveNoteId: null });
    await expect(
      storage.read(accepted.artifact.key, output.length),
    ).rejects.toBeDefined();
    await foreignKeys();
  });

  it("does not collect a same-content note or anonymous receipt moved out before workspace deletion", async () => {
    const accepted = await ready();
    const destination = await createWorkspace(c, token, {
      name: "Anonymous PDF destination",
      description: "",
    });
    const preview = await previewNoteMove(c, token, {
      noteId,
      destination: { kind: "workspace", workspaceId: destination.id },
    });
    await moveNote(c, token, preview.expected);
    expect(await anonymousPdfStatus(c, access, accepted.ticket)).toMatchObject({
      kind: "ready",
    });
    const deletion = {
      workspaceId: sourceWorkspace,
      requestId: c.idGenerator.next(),
      confirmation: sourceName,
    };
    await requestWorkspaceDeletion(c, token, deletion);
    await sweepWorkspaceDeletions(c);
    await sweepNotePurges(c);
    await sweepPdf(c);
    expect(await getWorkspaceDeletionReceipt(c, token, deletion)).toMatchObject(
      { state: "succeeded", totalNotes: 0 },
    );
    expect(await note()).toMatchObject({
      owner: { kind: "workspace", workspaceId: destination.id },
      lifecycle: { kind: "active" },
    });
    expect(await row(accepted.requestId)).toMatchObject({
      state: "succeeded",
      liveNoteId: noteId,
      sourceIdentity: accepted.request.sourceIdentity,
      authority: accepted.request.authority,
    });
    expect(await anonymousPdfStatus(c, access, accepted.ticket)).toMatchObject({
      kind: "ready",
    });
    const delivery = await prepareAnonymousPdfDelivery(
      c,
      access,
      accepted.ticket,
      false,
    );
    if (!delivery) throw Error("fixture delivery after move");
    const file = await getAnonymousPdfFile(
      c,
      access,
      accepted.ticket,
      delivery.id,
      new AbortController().signal,
    );
    streams.push(file.body);
    await file.body.cancel();
    expect(await storage.read(accepted.artifact.key, output.length)).toEqual(
      output,
    );
    await foreignKeys();
  });

  it("retains terminal shells for compute/workspace debt then prunes at most 100 per call", async () => {
    const accepted = await request();
    const first = await row(accepted.requestId);
    if (!first || first.state !== "queued" || !first.computeId)
      throw Error("fixture queued request");
    await c.unitOfWorkProvider.run(async (u) => {
      for (let index = 0; index < 100; index++) {
        await u.pdfAnonymousRequests.insert({
          ...first,
          id: c.idGenerator.next(),
          commandId: c.idGenerator.next(),
        });
      }
    });
    const count = async () =>
      (
        await base?.db.all<{ count: number }>(
          sql`select count(*) count from pdf_anonymous_requests`,
        )
      )?.[0]?.count;
    now = new Date(first.ticketExpiresAt);
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfAnonymousRequests.sweep(now);
      await u.pdfAnonymousRequests.sweep(now);
      await u.pdfAnonymousRequests.prune(now);
    });
    expect(await count()).toBe(101);
    expect(await row(first.id)).toMatchObject({ state: "expired" });
    await c.unitOfWorkProvider.run((u) =>
      u.pdfComputations.stop(first.computeId ?? "", now),
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.find(first.computeId ?? ""),
      ),
    ).toMatchObject({ state: "closed", workspaceRemoved: false });
    await c.unitOfWorkProvider.run((u) => u.pdfAnonymousRequests.prune(now));
    expect(await count()).toBe(101);
    await sweepPdf(c);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.find(first.computeId ?? ""),
      ),
    ).toMatchObject({ state: "closed", workspaceRemoved: true });
    expect(await count()).toBe(101);
    await c.unitOfWorkProvider.run((u) => u.pdfAnonymousRequests.prune(now));
    expect(await count()).toBe(1);
    await c.unitOfWorkProvider.run((u) => u.pdfAnonymousRequests.prune(now));
    expect(await count()).toBe(0);
    await foreignKeys();
  });

  it("keeps expired shells while delivery or retained artifact exists and prunes after actual removal", async () => {
    const accepted = await ready();
    const delivery = await prepareAnonymousPdfDelivery(
      c,
      access,
      accepted.ticket,
      false,
    );
    if (!delivery) throw Error("fixture ready delivery");
    await sweepPdf(c);
    now = new Date(accepted.request.ticketExpiresAt);
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfAnonymousRequests.sweep(now);
      await u.pdfAnonymousRequests.prune(now);
    });
    expect(await row(accepted.requestId)).toMatchObject({
      state: "expired",
      artifactId: accepted.artifact.id,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousDeliveries.find(delivery.id),
      ),
    ).toMatchObject({ state: "ready" });
    now = new Date(accepted.artifact.expiresAt);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfArtifacts.claimCleanup(
          now,
          "fixture-cleanup",
          new Date(+now + 60000),
        ),
      ),
    ).toBeNull();
    await c.unitOfWorkProvider.run(async (u) => {
      expect(await u.pdfAnonymousDeliveries.close(delivery.id, null)).toBe(
        true,
      );
      await u.pdfAnonymousRequests.prune(now);
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousDeliveries.find(delivery.id),
      ),
    ).toBeNull();
    expect(await row(accepted.requestId)).toMatchObject({ state: "expired" });
    expect(await storage.read(accepted.artifact.key, output.length)).toEqual(
      output,
    );
    now = new Date(accepted.artifact.expiresAt);
    await sweepPdf(c);
    expect(await row(accepted.requestId)).not.toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfArtifacts.find(accepted.artifact.id),
      ),
    ).toMatchObject({ state: "removed" });
    await expect(
      storage.read(accepted.artifact.key, output.length),
    ).rejects.toBeDefined();
    await c.unitOfWorkProvider.run((u) => u.pdfAnonymousRequests.prune(now));
    expect(await row(accepted.requestId)).toBeNull();
    await foreignKeys();
  });
});
