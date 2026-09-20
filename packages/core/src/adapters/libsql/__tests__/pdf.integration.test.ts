import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { requestNotePurge } from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { trashNote } from "@repo/core/application/note/trash";
import {
  PDF_ARTIFACT_LIFETIME_MS,
  PDF_HISTORY_LIFETIME_MS,
  type PdfArtifact,
  type PdfComputation,
  type PdfDelivery,
  type PdfRequest,
} from "@repo/core/domain/pdf/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("durable PDF ownership", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let noteId: string;
  let accountId: string;
  let sessionToken: string;
  const now = new Date("2026-09-20T00:00:00Z");
  const file = { filename: "日本語.pdf", bytes: 5, sha256: "a".repeat(64) };
  beforeEach(async () => {
    base = await createTestContainer();
    const mails: string[] = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    const pending = await signUp(c, {
      email: "pdf@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!link) throw Error("fixture mail");
    const auth = await verifyEmail(
      c,
      new URL(link).searchParams.get("token") ?? "",
      pending.browserToken,
    );
    if (!auth) throw Error("fixture session");
    accountId = auth.user.id;
    sessionToken = auth.token;
    noteId = (
      await saveNote(c, auth.token, { title: "PDF", html: "<p>日本語</p>" })
    ).note.id;
  });
  afterEach(() => base.close());
  function computation(): PdfComputation {
    const id = c.idGenerator.next();
    return {
      id,
      targetNoteId: noteId,
      liveNoteId: noteId,
      sourceIdentity: "snapshot",
      profile: "test-profile",
      state: "queued",
      generation: 1,
      leaseToken: null,
      leaseUntil: null,
      deadlineAt: new Date(now.getTime() + 120000),
      workspaceId: id,
      reservedBytes: 20,
      workspaceRemoved: false,
      nextCleanupAt: now,
      cleanupToken: null,
      cleanupUntil: null,
      createdAt: now,
    };
  }
  function request(computeId: string): PdfRequest {
    return {
      id: c.idGenerator.next(),
      accountId,
      commandId: c.idGenerator.next(),
      inputDigest: "command",
      targetNoteId: noteId,
      liveNoteId: noteId,
      title: "PDF",
      sourceIdentity: "snapshot",
      style: "default",
      computeId,
      artifactId: null,
      state: "queued",
      failure: null,
      retryOf: null,
      createdAt: now,
      historyExpiresAt: new Date(now.getTime() + PDF_HISTORY_LIFETIME_MS),
      updatedAt: now,
      version: 1,
    };
  }
  function artifact(computeId: string): PdfArtifact {
    const id = c.idGenerator.next();
    return {
      id,
      targetNoteId: noteId,
      liveNoteId: noteId,
      computeId,
      sourceIdentity: "snapshot",
      profile: "test-profile",
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
    };
  }
  async function accepted() {
    const compute = computation();
    const r = request(compute.id);
    const a = artifact(compute.id);
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfComputations.begin(compute, 100);
      await u.pdfRequests.insert(r);
      expect(
        (
          await u.pdfComputations.claim(
            now,
            "lease",
            new Date(now.getTime() + 60000),
          )
        )?.id,
      ).toBe(compute.id);
      await u.pdfArtifacts.begin(a, 100);
    });
    return { compute, r, a };
  }
  async function published() {
    const value = await accepted();
    await c.unitOfWorkProvider.run(async (u) => {
      expect(
        await u.pdfArtifacts.publish(value.a.id, 1, "lease", file, now),
      ).toBe(true);
      expect(
        await u.pdfRequests.succeed(value.compute.id, value.a.id, now),
      ).toBe(1);
      expect(
        await u.pdfComputations.closed(value.compute.id, "lease", now),
      ).toBe(true);
    });
    return value;
  }
  function delivery(requestId: string, artifactId: string): PdfDelivery {
    return {
      id: c.idGenerator.next(),
      requestId,
      artifactId,
      accountId,
      state: "ready",
      generation: 1,
      claimToken: null,
      runtimeId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 120000),
      nextCleanupAt: now,
    };
  }
  it("keeps command uniqueness and forbids active/debt detach or deletion", async () => {
    const { compute, r, a } = await accepted();
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfRequests.findCommand(accountId, r.commandId),
      ),
    ).toMatchObject({ id: r.id });
    await expect(
      c.unitOfWorkProvider.run((u) =>
        u.pdfRequests.insert({ ...r, id: c.idGenerator.next() }),
      ),
    ).rejects.toBeDefined();
    for (const query of [
      sql`update pdf_computations set live_note_id=null where id=${compute.id}`,
      sql`delete from pdf_computations where id=${compute.id}`,
      sql`update pdf_artifacts set live_note_id=null where id=${a.id}`,
      sql`delete from pdf_artifacts where id=${a.id}`,
      sql`update pdf_requests set live_note_id=null where id=${r.id}`,
    ])
      await expect(base.db.run(query)).rejects.toBeDefined();
    expect(
      (await base.client.execute("pragma foreign_key_check")).rows,
    ).toHaveLength(0);
  });
  it("summarizes active jobs beyond terminal history and scans all watches in finite pages", async () => {
    const { compute, r } = await accepted();
    const siblings = Array.from({ length: 100 }, () => request(compute.id));
    await c.unitOfWorkProvider.run(async (u) => {
      for (const sibling of siblings) await u.pdfRequests.insert(sibling);
    });
    await c.unitOfWorkProvider.run(async (u) => {
      expect(await u.pdfRequests.summary(accountId, now)).toMatchObject({
        activeCount: 101,
        representative: { title: "PDF" },
      });
      const ids: string[] = [];
      let after: string | null = null;
      for (let page = 0; page < 3; page++) {
        const rows = await u.pdfRequests.activePage(accountId, after, now);
        expect(rows.length).toBeLessThanOrEqual(50);
        ids.push(...rows.map((row) => row.id));
        after = rows.at(-1)?.id ?? null;
      }
      expect(new Set(ids).size).toBe(101);
      expect(ids).toEqual([...ids].sort());
      await u.pdfRequests.cancel(r.id, accountId, now);
      expect(await u.pdfRequests.watched(accountId, [r.id], now)).toMatchObject(
        [{ id: r.id, state: "cancelled" }],
      );
      expect(
        await u.pdfRequests.watched(c.idGenerator.next(), [r.id], now),
      ).toEqual([]);
      expect(await u.pdfRequests.summary(accountId, now)).toMatchObject({
        activeCount: 100,
      });
      await u.pdfRequests.cancelNote(noteId, now);
      expect(await u.pdfRequests.summary(accountId, now)).toEqual({
        activeCount: 0,
        representative: null,
      });
      expect(await u.pdfRequests.activePage(accountId, null, now)).toEqual([]);
      expect(await u.pdfRequests.list(accountId, null, now)).toHaveLength(50);
    });
  });
  it("serializes last demand cancellation against publication and does not revive", async () => {
    const { r, a, compute } = await accepted();
    await c.unitOfWorkProvider.run(async (u) => {
      expect(await u.pdfRequests.cancel(r.id, accountId, now)).toBe(true);
      expect(await u.pdfArtifacts.publish(a.id, 1, "lease", file, now)).toBe(
        false,
      );
      expect(await u.pdfRequests.succeed(compute.id, a.id, now)).toBe(0);
    });
    await expect(
      base.db.run(sql`update pdf_requests set state='queued' where id=${r.id}`),
    ).rejects.toBeDefined();
  });
  it("preserves a valid sibling and rejects stale generations and leases", async () => {
    const { r, a, compute } = await accepted();
    const sibling = request(compute.id);
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfRequests.insert(sibling);
      await u.pdfRequests.cancel(r.id, accountId, now);
      expect(await u.pdfArtifacts.publish(a.id, 2, "lease", file, now)).toBe(
        false,
      );
      expect(await u.pdfArtifacts.publish(a.id, 1, "old", file, now)).toBe(
        false,
      );
      expect(await u.pdfArtifacts.publish(a.id, 1, "lease", file, now)).toBe(
        true,
      );
      expect(await u.pdfRequests.succeed(compute.id, a.id, now)).toBe(1);
      expect(await u.pdfRequests.find(r.id)).toMatchObject({
        state: "cancelled",
      });
      expect(await u.pdfRequests.find(sibling.id)).toMatchObject({
        state: "succeeded",
      });
    });
  });
  it("retains fixed cache lifetime through retrieval and same-content ownership changes", async () => {
    const { a, r } = await published();
    await base.db.run(
      sql`update notes set ownership_generation=ownership_generation+1 where id=${noteId}`,
    );
    await c.unitOfWorkProvider.run(async (u) => {
      expect(
        await u.pdfArtifacts.cached(
          noteId,
          "snapshot",
          "test-profile",
          new Date(now.getTime() + PDF_ARTIFACT_LIFETIME_MS - 1),
        ),
      ).toMatchObject({ id: a.id });
      expect(
        await u.pdfArtifacts.cached(
          noteId,
          "snapshot",
          "test-profile",
          new Date(now.getTime() + PDF_ARTIFACT_LIFETIME_MS),
        ),
      ).toBeNull();
      const d = delivery(r.id, a.id);
      await u.pdfDeliveries.begin(d, now);
      expect(
        await u.pdfDeliveries.claim(d.id, accountId, "reader", "runtime", now),
      ).toMatchObject({ state: "sending" });
      expect(await u.pdfDeliveries.close(d.id, "reader")).toBe(true);
      expect(await u.pdfArtifacts.find(a.id)).toMatchObject({
        publishedAt: now,
        expiresAt: new Date(now.getTime() + PDF_ARTIFACT_LIFETIME_MS),
      });
    });
    await expect(
      base.db.run(
        sql`update pdf_artifacts set published_at=published_at+1,expires_at=expires_at+1 where id=${a.id}`,
      ),
    ).rejects.toBeDefined();
  });
  it("keeps succeeded history attached to a physically removed artifact shell", async () => {
    const { a, r, compute } = await published();
    const later = new Date(now.getTime() + PDF_ARTIFACT_LIFETIME_MS);
    await c.unitOfWorkProvider.run(async (u) => {
      expect(
        await u.pdfComputations.claimCleanup(
          now,
          "workspace",
          new Date(now.getTime() + 1000),
        ),
      ).toMatchObject({ id: compute.id });
      expect(await u.pdfComputations.cleaned(compute.id, "workspace")).toBe(
        true,
      );
      expect(
        await u.pdfArtifacts.claimCleanup(
          later,
          "cleanup",
          new Date(later.getTime() + 1000),
        ),
      ).toMatchObject({ id: a.id });
      expect(await u.pdfArtifacts.cleaned(a.id, "cleanup", "delete")).toBe(
        false,
      );
      if (!a.key) throw Error("fixture key");
      await u.objectOperations.claimDelete(
        a.key,
        "delete",
        null,
        later,
        new Date(later.getTime() + 1000),
      );
      await u.objectOperations.finishDelete(a.key, "delete");
      expect(await u.pdfArtifacts.cleaned(a.id, "cleanup", "delete")).toBe(
        true,
      );
      expect(await u.pdfRequests.find(r.id)).toMatchObject({
        state: "succeeded",
        artifactId: a.id,
      });
      expect(await u.pdfArtifacts.find(a.id)).toMatchObject({
        state: "removed",
        key: null,
        reservedBytes: 0,
      });
      expect(
        await u.pdfRequests.list(
          accountId,
          null,
          new Date(now.getTime() + PDF_HISTORY_LIFETIME_MS),
        ),
      ).toEqual([]);
    });
  });
  it("allows only one active compute and retains its reservation through cleanup debt", async () => {
    const { compute } = await accepted();
    await expect(
      c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.begin(computation(), 100),
      ),
    ).rejects.toMatchObject({ code: "PDF_BUSY" });
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfComputations.closed(compute.id, "lease", now);
      await u.pdfComputations.claimCleanup(
        now,
        "cleanup",
        new Date(now.getTime() + 1000),
      );
      await u.pdfComputations.deferCleanup(compute.id, "cleanup", 40, now);
      expect(await u.pdfComputations.find(compute.id)).toMatchObject({
        state: "closed",
        workspaceRemoved: false,
        reservedBytes: 40,
      });
    });
    await expect(
      c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.begin(computation(), 100),
      ),
    ).rejects.toMatchObject({ code: "PDF_BUSY" });
  });
  it("rejects a second delivery for one request and enforces current actor/read", async () => {
    const { r, a } = await published();
    const d = delivery(r.id, a.id);
    await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.begin(d, now));
    await expect(
      c.unitOfWorkProvider.run((u) =>
        u.pdfDeliveries.begin(delivery(r.id, a.id), now),
      ),
    ).rejects.toMatchObject({ code: "PDF_DELIVERY_BUSY" });
    await c.unitOfWorkProvider.run(async (u) => {
      expect(
        await u.pdfDeliveries.claim(d.id, "other", "reader", "runtime", now),
      ).toBeNull();
      expect(
        await u.pdfDeliveries.claim(
          d.id,
          accountId,
          "reader",
          "runtime",
          new Date(now.getTime() + 120000),
        ),
      ).toBeNull();
      expect(
        await u.pdfDeliveries.claim(d.id, accountId, "reader", "runtime", now),
      ).toMatchObject({ state: "sending" });
      expect(
        await u.pdfDeliveries.claim(d.id, accountId, "second", "runtime", now),
      ).toBeNull();
    });
  });
  it("recovers only after external owners are proven stopped, keeping artifact debt", async () => {
    const { compute, r, a } = await accepted();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfComputations.recover(now);
      expect(await u.pdfRequests.find(r.id)).toMatchObject({
        state: "failed",
        failure: "PDF_INTERRUPTED",
      });
      expect(await u.pdfComputations.find(compute.id)).toMatchObject({
        state: "closed",
        workspaceRemoved: false,
        reservedBytes: 20,
      });
      expect(await u.pdfArtifacts.find(a.id)).toMatchObject({
        state: "writing",
        reservedBytes: 10,
      });
    });
  });
  it("fences PDF physical writers by current demand without binding old ownership generation", async () => {
    const { compute, r, a } = await accepted();
    if (!a.key) throw Error("fixture key");
    const key = a.key;
    await c.unitOfWorkProvider.run(async (u) => {
      await u.objectOperations.beginWrite(
        "pdf-writer",
        "runtime",
        { kind: "pdf-artifact", id: a.id },
        now,
      );
      await u.objectOperations.registerKey("pdf-writer", key, now);
    });
    await base.db.run(
      sql`update notes set ownership_generation=ownership_generation+1 where id=${noteId}`,
    );
    await c.unitOfWorkProvider.run(async (u) => {
      expect(await u.objectOperations.canPublish("pdf-writer", now)).toBe(true);
      await u.pdfRequests.cancel(r.id, accountId, now);
      expect(await u.objectOperations.canPublish("pdf-writer", now)).toBe(
        false,
      );
      expect(
        await u.objectOperations.claimDelete(
          key,
          "delete",
          null,
          now,
          new Date(now.getTime() + 1000),
        ),
      ).toBe(false);
      await u.pdfComputations.closed(compute.id, "lease", now);
      expect(
        await u.pdfComputations.claimCleanup(
          now,
          "cleanup",
          new Date(now.getTime() + 1000),
        ),
      ).toBeNull();
      await u.objectOperations.endWrite("pdf-writer");
      expect(
        await u.pdfComputations.claimCleanup(
          now,
          "cleanup",
          new Date(now.getTime() + 1000),
        ),
      ).toMatchObject({ id: compute.id });
    });
  });
  it("waits for workspace and artifact cleanup before purging and preserves minimal history", async () => {
    const { compute, r, a } = await accepted();
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!note || !a.key) throw Error("fixture note");
    const trashed = await trashNote(c, sessionToken, {
      id: noteId,
      version: note.version,
      cancelProcessing: true,
    });
    const purged = await requestNotePurge(c, sessionToken, {
      id: noteId,
      operationId: trashed.operationId,
    });
    await c.unitOfWorkProvider.run(async (u) => {
      expect(await u.pdfRequests.find(r.id)).toMatchObject({
        state: "cancelled",
      });
      await u.purges.claim(now, "purge", new Date(now.getTime() + 60000));
      expect(await u.purges.finish(purged.id, "purge", now)).toBe(false);
      await u.pdfComputations.closed(compute.id, "lease", now);
      await u.pdfComputations.claimCleanup(
        now,
        "workspace",
        new Date(now.getTime() + 1000),
      );
      await u.pdfComputations.cleaned(compute.id, "workspace");
      const objects = await u.purges.objects(purged.id);
      expect(objects).toHaveLength(1);
      for (const object of objects) {
        expect(object.owner.kind).toBe("pdf-artifact");
        expect(
          await u.purges.readyToDelete(purged.id, "purge", object.key, now),
        ).toBe(true);
        await u.objectOperations.claimDelete(
          object.key,
          "delete",
          null,
          now,
          new Date(now.getTime() + 1000),
        );
        await u.objectOperations.finishDelete(object.key, "delete");
        expect(
          await u.purges.completeObject(
            purged.id,
            "purge",
            object.key,
            "delete",
            now,
          ),
        ).toBe(true);
      }
      expect(await u.purges.finish(purged.id, "purge", now)).toBe(true);
      expect(await u.notes.findById(noteId)).toBeNull();
      expect(await u.pdfRequests.find(r.id)).toMatchObject({
        state: "cancelled",
        liveNoteId: null,
        targetNoteId: noteId,
      });
    });
    expect(
      (await base.client.execute("pragma foreign_key_check")).rows,
    ).toHaveLength(0);
  });
});
