import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { planPdfDocument } from "@repo/core/adapters/node/pdf/document";
import { NodePdfExecution } from "@repo/core/adapters/node/pdf/execution";
import { FilePdfSourceReader } from "@repo/core/adapters/node/pdf/source";
import { NodePdfTransfers } from "@repo/core/adapters/node/pdf/transfers";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { saveNote } from "@repo/core/application/note/saveNote";
import type { PdfAnonymousTicketClaims } from "@repo/core/application/pdf/anonymousPorts";
import { anonymousPdfStatus } from "@repo/core/application/pdf/anonymousUsecases";
import { sweepPdf } from "@repo/core/application/pdf/worker";
import {
  changeSharing,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anonymousPdfFormBinding } from "../../../../../../apps/web/app/presentation/anonymousPdfForm";
import { anonymousPdfHttp } from "../../../../../../apps/web/app/presentation/anonymousPdfHttp.node";
import { createTestContainer, type TestContainer } from "./helpers";

describe("anonymous PDF expiry and pruned receipt HTTP boundary", () => {
  let base: TestContainer | undefined;
  let c: HollowContainer;
  let pdf: NonNullable<HollowContainer["pdf"]> | undefined;
  let storage: CoordinatedObjectStorage;
  let root: string | undefined;
  let token: string;
  let noteId: string;
  let now: Date;
  const access = {
    kind: "link" as const,
    token: "a".repeat(43),
    browser: "b".repeat(43),
  };
  const entry = `/s/${access.token}`;
  const title = "Private fixture title not for expiry pages";
  const body = "Fixture body not for expiry pages";
  const output = Buffer.from("%PDF-1.7\nsynthetic prune HTTP bytes\n%%EOF\n");
  const digest = createHash("sha256").update(output).digest("hex");

  beforeEach(async () => {
    base = undefined;
    root = undefined;
    pdf = undefined;
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-pdf-prune-http-"));
    now = new Date();
    const mails: string[] = [];
    const issued = new Map<string, PdfAnonymousTicketClaims>();
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(mail) {
          mails.push(mail.text);
        },
      }),
      clock: { now: () => now },
      logger: { info() {}, warn() {}, error() {} },
      // This port accepts only receipts issued by this fixture; it does not test HMAC.
      pdfAnonymousTicketSigner: {
        activeKeyId: () => "fixture",
        sign(claims) {
          const payload = Buffer.from(JSON.stringify(claims)).toString(
            "base64url",
          );
          const ticket = `v1.${payload}.${createHash("sha256").update(payload).digest("base64url")}`;
          issued.set(ticket, { ...claims });
          return ticket;
        },
        verify(ticket) {
          const claims = issued.get(ticket);
          return claims ? { ...claims } : null;
        },
      },
    };
    const signup = await signUp(c, {
      email: "pdf-prune-http@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!link) throw Error("fixture verification mail");
    const auth = await verifyEmail(
      c,
      new URL(link).searchParams.get("token") ?? "",
      signup.browserToken,
    );
    if (!auth) throw Error("fixture verification");
    token = auth.token;
    noteId = (await saveNote(c, token, { title, html: `<p>${body}</p>` })).note
      .id;
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
        profile: "synthetic-prune-http-v1",
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
            throw Error("unused fixture extractor");
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
    try {
      try {
        await pdf?.execution.stop();
      } finally {
        await pdf?.transfers.stop();
      }
    } finally {
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
    }
  });

  function nativeRequest(suffix: string, form?: URLSearchParams) {
    return new Request(`${c.appUrl}${entry}/pdf${suffix}`, {
      method: form ? "POST" : "GET",
      headers: {
        cookie: `hollow_share_browser=${access.browser}`,
        ...(form
          ? {
              origin: new URL(c.appUrl).origin,
              "content-type": "application/x-www-form-urlencoded",
            }
          : {}),
      },
      ...(form ? { body: form.toString() } : {}),
    });
  }
  async function http(suffix: string, form?: URLSearchParams) {
    const response = await anonymousPdfHttp(nativeRequest(suffix, form), c);
    if (!response) throw Error("fixture PDF route unmatched");
    return response;
  }
  async function ready() {
    const command = c.idGenerator.next();
    const accepted = await http(
      "",
      new URLSearchParams({
        command,
        binding: anonymousPdfFormBinding(c, access, command),
      }),
    );
    expect(accepted.status).toBe(303);
    const location = accepted.headers.get("location");
    if (!location?.startsWith(`${entry}/pdf/`))
      throw Error("fixture receipt location");
    const ticket = location.slice(`${entry}/pdf/`.length);
    const claims = c.pdfAnonymousTicketSigner.verify(ticket);
    if (!claims) throw Error("fixture receipt claims");
    await sweepPdf(c);
    await vi.waitFor(
      async () => {
        expect(await anonymousPdfStatus(c, access, ticket)).toMatchObject({
          kind: "ready",
        });
        const request = await c.unitOfWorkProvider.run((u) =>
          u.pdfAnonymousRequests.find(claims.requestId),
        );
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
    const request = await c.unitOfWorkProvider.run((u) =>
      u.pdfAnonymousRequests.find(claims.requestId),
    );
    if (!request?.artifactId || !request.computeId)
      throw Error("fixture ready request");
    const artifact = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.find(request.artifactId ?? ""),
    );
    if (!artifact || artifact.state !== "ready")
      throw Error("fixture artifact");
    return { ticket, claims, request, artifact };
  }
  async function assertNoMetadata(response: Response) {
    expect(response.headers.has("refresh")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const page = await response.text();
    expect(page).not.toContain(title);
    expect(page).not.toContain(body);
    expect(page).not.toMatch(/<script|http-equiv=["']?refresh|<form/i);
    return page;
  }
  async function foreignKeys() {
    expect(
      (await base?.client.execute("PRAGMA foreign_key_check"))?.rows,
    ).toEqual([]);
  }

  it("shows minimal expiry with no Refresh while original read is still valid", async () => {
    const accepted = await ready();
    now = new Date(accepted.claims.expiresAt);
    const status = await http(`/${accepted.ticket}`);
    expect(status.status).toBe(200);
    const page = await assertNoMetadata(status);
    expect(page).toContain("取得期限が切れました");
    expect(page).toContain(`href="${entry}"`);
    expect(page).not.toContain(accepted.ticket);
    const receive = await http(`/${accepted.ticket}/receive`);
    expect(receive.status).toBe(410);
    expect(await assertNoMetadata(receive)).toContain("取得期限が切れました");
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "link", grantEpoch: 1 });
    expect(await storage.read(accepted.artifact.key, output.length)).toEqual(
      output,
    );
    await foreignKeys();
  });

  it("returns HTTP 404 only after normal delivery/workspace/artifact release permits receipt prune", async () => {
    const accepted = await ready();
    const prepared = await http(
      `/${accepted.ticket}/download`,
      new URLSearchParams(),
    );
    expect(prepared.status).toBe(303);
    const deliveryId = prepared.headers.get("location")?.split("/").at(-1);
    if (!deliveryId) throw Error("fixture prepared delivery");
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousDeliveries.find(deliveryId),
      ),
    ).toMatchObject({ state: "ready" });
    now = new Date(accepted.claims.expiresAt);
    await sweepPdf(c);
    expect(pdf?.transfers.ids()).toEqual([]);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.find(accepted.request.computeId ?? ""),
      ),
    ).toMatchObject({ state: "closed", workspaceRemoved: true });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousDeliveries.find(deliveryId),
      ),
    ).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousRequests.find(accepted.claims.requestId),
      ),
    ).toMatchObject({ state: "expired", artifactId: accepted.artifact.id });
    const retained = await http(`/${accepted.ticket}`);
    expect(retained.status).toBe(200);
    expect(await assertNoMetadata(retained)).toContain("取得期限が切れました");
    expect(await storage.read(accepted.artifact.key, output.length)).toEqual(
      output,
    );

    now = new Date(accepted.artifact.expiresAt);
    await sweepPdf(c);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfArtifacts.find(accepted.artifact.id),
      ),
    ).toMatchObject({ state: "removed" });
    await expect(
      storage.read(accepted.artifact.key, output.length),
    ).rejects.toBeDefined();
    await sweepPdf(c);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousRequests.find(accepted.claims.requestId),
      ),
    ).toBeNull();
    expect(c.pdfAnonymousTicketSigner.verify(accepted.ticket)).toEqual(
      accepted.claims,
    );
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "link", grantEpoch: 1 });
    const gone = await http(`/${accepted.ticket}`);
    expect(gone.status).toBe(404);
    const page = await assertNoMetadata(gone);
    expect(page).not.toContain("取得期限が切れました");
    expect(page).not.toContain(`href="${entry}"`);
    await foreignKeys();
  });

  it("prioritizes original-read revocation over simultaneous ticket expiry before any sweep", async () => {
    const accepted = await ready();
    now = new Date(accepted.claims.expiresAt);
    await changeSharing(c, token, {
      expected: (await getSharing(c, token, noteId)).expected,
      operation: { kind: "visibility", visibility: "private" },
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousRequests.find(accepted.claims.requestId),
      ),
    ).toMatchObject({ state: "succeeded" });
    const response = await http(`/${accepted.ticket}`);
    expect(response.status).toBe(404);
    const page = await assertNoMetadata(response);
    expect(page).not.toContain("取得期限が切れました");
    expect(page).not.toContain(`href="${entry}"`);
    expect(await storage.read(accepted.artifact.key, output.length)).toEqual(
      output,
    );
    await foreignKeys();
  });
});
