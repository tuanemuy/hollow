import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { saveNote } from "@repo/core/application/note/saveNote";
import type { PdfAnonymousRequest } from "@repo/core/domain/pdf/anonymous";
import type { PdfComputation } from "@repo/core/domain/pdf/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("anonymous PDF durable demand", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let noteId: string;
  const now = new Date("2026-09-20T00:00:00Z");
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
      email: "anonymous-pdf@example.test",
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
    noteId = (
      await saveNote(c, auth.token, { title: "PDF", html: "<p>日本語</p>" })
    ).note.id;
    await base.db.run(
      sql`update note_sharing set visibility='link',link_generation=1,token_hash=${"a".repeat(64)},token_envelope='synthetic-only',grant_epoch=1 where note_id=${noteId}`,
    );
  });
  afterEach(() => base.close());

  async function accepted(grant = false) {
    const id = c.idGenerator.next();
    const compute: PdfComputation = {
      id,
      targetNoteId: noteId,
      liveNoteId: noteId,
      sourceIdentity: "snapshot",
      profile: "test",
      state: "queued",
      generation: 1,
      leaseToken: null,
      leaseUntil: null,
      deadlineAt: new Date(now.getTime() + 120000),
      workspaceId: id,
      reservedBytes: 10,
      workspaceRemoved: false,
      nextCleanupAt: now,
      cleanupToken: null,
      cleanupUntil: null,
      createdAt: now,
    };
    const request: PdfAnonymousRequest = {
      id: c.idGenerator.next(),
      browserHash: "b".repeat(64),
      commandId: c.idGenerator.next(),
      inputDigest: "digest",
      targetNoteId: noteId,
      liveNoteId: noteId,
      sourceIdentity: "snapshot",
      profile: "test",
      computeId: id,
      artifactId: null,
      authority: {
        kind: "link",
        tokenHash: "a".repeat(64),
        linkGeneration: 1,
        grantEpoch: 1,
        proof: grant
          ? {
              kind: "grant",
              verifiedAt: now,
              expiresAt: new Date(now.getTime() + 30000),
            }
          : { kind: "none" },
      },
      createdAt: now,
      updatedAt: now,
      ticketExpiresAt: new Date(now.getTime() + 600000),
      ticketGeneration: 1,
      ticketKid: "test",
      autoDeliveryId: null,
      version: 1,
      state: "queued",
      failure: null,
    };
    if (grant) {
      await base.db.run(
        sql`update note_sharing set password_hash='synthetic-only' where note_id=${noteId}`,
      );
      await base.db.run(
        sql`insert into share_grants(note_id,browser_hash,link_generation,grant_epoch,verified_at,expires_at) values(${noteId},${request.browserHash},1,1,${now.getTime()},${now.getTime() + 30000})`,
      );
    }
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfComputations.begin(compute, 100);
      await u.pdfAnonymousRequests.insert(request);
    });
    return { compute, request };
  }

  it("claims anonymous-only demand and preserves fixed command and identity", async () => {
    const { compute, request } = await accepted();
    await c.unitOfWorkProvider.run(async (u) => {
      expect(await u.pdfDemands.find(compute.id, now)).toMatchObject({
        kind: "anonymous",
        request: { id: request.id },
      });
      expect(
        await u.pdfComputations.claim(
          now,
          "lease",
          new Date(now.getTime() + 60000),
        ),
      ).toMatchObject({ id: compute.id });
      expect(
        await u.pdfAnonymousRequests.findCommand(
          request.browserHash,
          request.commandId,
        ),
      ).toMatchObject({ id: request.id });
    });
    await expect(
      base.db.run(
        sql`update pdf_anonymous_requests set grant_epoch=2 where id=${request.id}`,
      ),
    ).rejects.toBeDefined();
    await expect(
      base.db.run(
        sql`update pdf_anonymous_requests set live_note_id=null where id=${request.id}`,
      ),
    ).rejects.toBeDefined();
    await expect(
      base.db.run(
        sql`delete from pdf_anonymous_requests where id=${request.id}`,
      ),
    ).rejects.toBeDefined();
  });

  it("does not extend original grant when the same browser unlocks again", async () => {
    const { compute } = await accepted(true);
    await base.db.run(
      sql`update share_grants set verified_at=${now.getTime() + 20000},expires_at=${now.getTime() + 600000} where note_id=${noteId}`,
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfDemands.find(compute.id, new Date(now.getTime() + 30001)),
      ),
    ).toBeNull();
  });

  it("prioritizes original read loss over simultaneous ticket expiry and refuses revival", async () => {
    const { request, compute } = await accepted();
    await base.db.run(
      sql`update note_sharing set visibility='private',grant_epoch=2 where note_id=${noteId}`,
    );
    const later = new Date(now.getTime() + 600001);
    await c.unitOfWorkProvider.run((u) => u.pdfAnonymousRequests.sweep(later));
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousRequests.find(request.id),
      ),
    ).toMatchObject({ state: "invalidated" });
    await base.db.run(
      sql`update note_sharing set visibility='link' where note_id=${noteId}`,
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfDemands.find(compute.id, later),
      ),
    ).toBeNull();
    await expect(
      base.db.run(
        sql`update pdf_anonymous_requests set state='queued' where id=${request.id}`,
      ),
    ).rejects.toBeDefined();
  });

  it("keeps simple expiry distinct from revocation", async () => {
    const { request } = await accepted();
    await c.unitOfWorkProvider.run((u) =>
      u.pdfAnonymousRequests.sweep(new Date(now.getTime() + 600001)),
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousRequests.find(request.id),
      ),
    ).toMatchObject({ state: "expired" });
    expect(
      (await base.client.execute("pragma foreign_key_check")).rows,
    ).toHaveLength(0);
  });
});
