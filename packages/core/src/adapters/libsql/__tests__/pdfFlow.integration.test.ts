import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { NodePdfAnonymousTicketSigner } from "@repo/core/adapters/node/pdf/anonymousTicketSigner";
import { planPdfDocument } from "@repo/core/adapters/node/pdf/document";
import { NodePdfExecution } from "@repo/core/adapters/node/pdf/execution";
import { FilePdfSourceReader } from "@repo/core/adapters/node/pdf/source";
import { NodePdfTransfers } from "@repo/core/adapters/node/pdf/transfers";
import { signOut } from "@repo/core/application/account/session";
import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { saveNote } from "@repo/core/application/note/saveNote";
import { getAnonymousPdfFile } from "@repo/core/application/pdf/anonymousDelivery";
import {
  anonymousPdfStatus,
  prepareAnonymousPdfDelivery,
  requestAnonymousPdf,
} from "@repo/core/application/pdf/anonymousUsecases";
import { getPdfFile } from "@repo/core/application/pdf/delivery";
import type { PdfRenderInput } from "@repo/core/application/pdf/ports";
import {
  cancelPdf,
  listPdf,
  lookupPdf,
  preparePdfDelivery,
  requestPdf,
} from "@repo/core/application/pdf/usecases";
import { sweepPdf } from "@repo/core/application/pdf/worker";
import { BusinessRuleError } from "@repo/core/domain/error";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anonymousPdfFormBinding } from "../../../../../../apps/web/app/presentation/anonymousPdfForm";
import { anonymousPdfHttp } from "../../../../../../apps/web/app/presentation/anonymousPdfHttp.node";
import { pdfHttp } from "../../../../../../apps/web/app/presentation/pdfHttp.node";
import { createTestContainer, type TestContainer } from "./helpers";

describe("authenticated PDF request, worker, retained file and delivery", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let pdf: NonNullable<HollowContainer["pdf"]>;
  let root: string;
  let token: string;
  let noteId: string;
  let actorId: string;
  let now: Date;
  let renders: number;
  let removed: number;
  let failRemove: boolean;
  let renderHook:
    | ((input: PdfRenderInput, signal: AbortSignal) => Promise<void>)
    | null;
  const output = new TextEncoder().encode(
    "%PDF-1.7\nsynthetic service integration payload\n%%EOF\n",
  );
  const digest = createHash("sha256").update(output).digest("hex");
  beforeEach(async () => {
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-pdf-flow-"));
    now = new Date();
    renders = 0;
    removed = 0;
    failRemove = false;
    renderHook = null;
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
    const keys = path.join(root, "ticket-keys");
    await mkdir(keys, { mode: 0o700 });
    await writeFile(path.join(keys, "test.key"), Buffer.alloc(32, 7), {
      mode: 0o600,
    });
    await writeFile(
      path.join(keys, "config.json"),
      JSON.stringify({
        activeKeyId: "test",
        keys: [{ id: "test", path: "test.key" }],
      }),
      { mode: 0o600 },
    );
    c = {
      ...c,
      pdfAnonymousTicketSigner: await NodePdfAnonymousTicketSigner.load(
        path.join(keys, "config.json"),
      ),
    };
    const signup = await signUp(c, {
      email: "pdf-flow@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!link) throw Error("fixture");
    const auth = await verifyEmail(
      c,
      new URL(link).searchParams.get("token") ?? "",
      signup.browserToken,
    );
    if (!auth) throw Error("fixture");
    token = auth.token;
    actorId = auth.user.id;
    noteId = (
      await saveNote(c, token, {
        title: "現在のPDF",
        html: "<p>現在の本文</p>",
      })
    ).note.id;
    const storage = new CoordinatedObjectStorage(
      root,
      c.unitOfWorkProvider,
      c.clock,
    );
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
          if (failRemove) throw Error("injected-remove");
          removed++;
          return true;
        },
        async bytes() {
          return 100;
        },
      },
      supervisor: {
        profile: "synthetic-renderer-v1",
        async recover() {},
        async stop() {},
        async render(input, signal) {
          renders++;
          await renderHook?.(input, signal);
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
            throw Error("unused");
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
    await pdf?.execution.stop();
    await pdf?.transfers.stop();
    base?.close();
    if (root) await rm(root, { recursive: true, force: true });
  });
  const request = () =>
    requestPdf(c, token, { noteId, commandId: c.idGenerator.next() });
  const anonymousAccess = {
    kind: "link" as const,
    token: "a".repeat(43),
    browser: "b".repeat(43),
  };
  async function enableLink() {
    await base.db.run(
      sql`update note_sharing set visibility='link',link_generation=1,token_hash=${c.tokens.hash(anonymousAccess.token)},token_envelope='synthetic-only',grant_epoch=1 where note_id=${noteId}`,
    );
  }
  async function finishAnonymous(ticket: string) {
    await sweepPdf(c);
    await vi.waitFor(
      async () =>
        expect(
          (await anonymousPdfStatus(c, anonymousAccess, ticket)).kind,
        ).toBe("ready"),
      { timeout: 3000, interval: 10 },
    );
    await vi.waitFor(
      async () =>
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
        ).toEqual([]),
      { timeout: 3000, interval: 10 },
    );
  }
  async function enableGrantedLink(lifetime = 30000) {
    await enableLink();
    await base.db.run(
      sql`update note_sharing set password_hash='synthetic-only' where note_id=${noteId}`,
    );
    await base.db.run(
      sql`insert into share_grants(note_id,browser_hash,link_generation,grant_epoch,verified_at,expires_at) values(${noteId},${c.tokens.hash(anonymousAccess.browser)},1,1,${now.getTime()},${now.getTime() + lifetime})`,
    );
  }
  it("clamps anonymous delivery to the frozen grant and never extends it after another unlock", async () => {
    await enableGrantedLink();
    const accepted = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(accepted.ticket);
    const delivery = await prepareAnonymousPdfDelivery(
      c,
      anonymousAccess,
      accepted.ticket,
      true,
    );
    expect(delivery?.expiresAt).toBe(
      new Date(now.getTime() + 30000).toISOString(),
    );
    await base.db.run(
      sql`update share_grants set verified_at=${now.getTime() + 1000},expires_at=${now.getTime() + 600000} where note_id=${noteId}`,
    );
    now = new Date(now.getTime() + 30000);
    const response = await anonymousPdfHttp(
      nativeRequest(`/${accepted.ticket}`),
      c,
    );
    expect(response?.status).toBe(404);
    await sweepPdf(c);
    expect(
      (await base.client.execute("select state from pdf_anonymous_requests"))
        .rows,
    ).toEqual([{ state: "invalidated" }]);
    expect(
      (
        await base.client.execute(
          "select state from pdf_anonymous_deliveries where state!='closed'",
        )
      ).rows,
    ).toEqual([]);
  });
  it.each([
    false,
    true,
  ])("invalidates expired anonymous demand during rendering while account sibling=%s remains independent", async (sibling) => {
    await enableGrantedLink();
    const account = sibling ? await request() : null;
    const accepted = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    renderHook = async () => {
      entered();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    };
    await sweepPdf(c);
    await started;
    now = new Date(now.getTime() + 30000);
    await sweepPdf(c);
    release();
    await vi.waitFor(
      async () =>
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
        ).toEqual([]),
      { timeout: 3000, interval: 10 },
    );
    await expect(
      anonymousPdfStatus(c, anonymousAccess, accepted.ticket),
    ).rejects.toBeDefined();
    expect(
      (await base.client.execute("select state from pdf_anonymous_requests"))
        .rows,
    ).toEqual([{ state: "invalidated" }]);
    if (account) {
      expect(await lookupPdf(c, token, account.commandId)).toMatchObject({
        state: "succeeded",
        available: true,
      });
      expect(
        (await base.client.execute("select state from pdf_artifacts")).rows,
      ).toEqual([{ state: "ready" }]);
    } else {
      expect(
        (await base.client.execute("select state from pdf_artifacts")).rows,
      ).toEqual([{ state: "cleanup" }]);
      expect(
        (
          await base.client.execute(
            "select artifact_id from pdf_anonymous_requests",
          )
        ).rows,
      ).toEqual([{ artifact_id: null }]);
    }
  });
  it("rejects changed content while a prior anonymous computation is active without adding a queue or charging rate", async () => {
    await enableLink();
    await requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next());
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!note) throw Error("fixture");
    await saveNote(c, token, {
      id: noteId,
      version: note.version,
      title: "変更",
      html: "<p>新本文</p>",
    });
    await expect(
      requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next()),
    ).rejects.toMatchObject({ code: "PDF_STOPPING" });
    expect(
      (
        await base.client.execute(
          "select count(*) as count from pdf_computations",
        )
      ).rows,
    ).toEqual([{ count: 1 }]);
    expect(
      (
        await base.client.execute(
          "select count(*) as count from pdf_anonymous_requests",
        )
      ).rows,
    ).toEqual([{ count: 1 }]);
  });
  it("rechecks original authority after storage opens before exposing any PDF bytes", async () => {
    await enableLink();
    const accepted = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(accepted.ticket);
    const delivery = await prepareAnonymousPdfDelivery(
      c,
      anonymousAccess,
      accepted.ticket,
      true,
    );
    if (!delivery) throw Error("fixture");
    const original = pdf.sources;
    c = {
      ...c,
      pdf: {
        ...pdf,
        sources: {
          async *read(source, signal) {
            for await (const chunk of original.read(source, signal)) {
              await base.db.run(
                sql`update note_sharing set visibility='private',grant_epoch=grant_epoch+1 where note_id=${noteId}`,
              );
              yield chunk;
            }
          },
        },
      },
    };
    await expect(
      getAnonymousPdfFile(
        c,
        anonymousAccess,
        accepted.ticket,
        delivery.id,
        new AbortController().signal,
      ),
    ).rejects.toBeDefined();
    await vi.waitFor(() => expect(pdf.transfers.ids()).toEqual([]));
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfAnonymousDeliveries.find(delivery.id),
      ),
    ).toMatchObject({ state: "closed" });
  });
  it("distinguishes a valid expired ticket from revoked, wrong-browser and tampered tickets over HTTP", async () => {
    await enableLink();
    const accepted = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(accepted.ticket);
    now = new Date(now.getTime() + 600000);
    const expired = await anonymousPdfHttp(
      nativeRequest(`/${accepted.ticket}`),
      c,
    );
    expect(expired?.status).toBe(200);
    expect(expired?.headers.has("refresh")).toBe(false);
    expect(await expired?.text()).toContain("期限");
    expect(
      (await anonymousPdfHttp(nativeRequest(`/${accepted.ticket}/receive`), c))
        ?.status,
    ).toBe(410);
    const wrong = new Request(nativeRequest(`/${accepted.ticket}`), {
      headers: { cookie: `hollow_share_browser=${"z".repeat(43)}` },
    });
    expect((await anonymousPdfHttp(wrong, c))?.status).toBe(404);
    const tampered =
      accepted.ticket.slice(0, -1) +
      (accepted.ticket.endsWith("A") ? "B" : "A");
    expect(
      (await anonymousPdfHttp(nativeRequest(`/${tampered}`), c))?.status,
    ).toBe(404);
    await base.db.run(
      sql`update note_sharing set visibility='private',grant_epoch=grant_epoch+1 where note_id=${noteId}`,
    );
    expect(
      (await anonymousPdfHttp(nativeRequest(`/${accepted.ticket}`), c))?.status,
    ).toBe(404);
  });
  it("keeps old signed receipts during key rotation and rejects them after explicit key removal", async () => {
    await enableLink();
    const command = c.idGenerator.next();
    const accepted = await requestAnonymousPdf(c, anonymousAccess, command);
    await finishAnonymous(accepted.ticket);
    const keys = path.join(root, "ticket-keys");
    await writeFile(path.join(keys, "next.key"), Buffer.alloc(32, 9), {
      mode: 0o600,
    });
    const configuration = path.join(keys, "rotation.json");
    await writeFile(
      configuration,
      JSON.stringify({
        activeKeyId: "next",
        keys: [
          { id: "test", path: "test.key" },
          { id: "next", path: "next.key" },
        ],
      }),
      { mode: 0o600 },
    );
    c = {
      ...c,
      pdfAnonymousTicketSigner:
        await NodePdfAnonymousTicketSigner.load(configuration),
    };
    expect(await requestAnonymousPdf(c, anonymousAccess, command)).toEqual(
      accepted,
    );
    expect(
      (await anonymousPdfHttp(nativeRequest(`/${accepted.ticket}`), c))?.status,
    ).toBe(200);
    const next = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    expect(c.pdfAnonymousTicketSigner.verify(next.ticket)?.kid).toBe("next");
    await writeFile(
      configuration,
      JSON.stringify({
        activeKeyId: "next",
        keys: [{ id: "next", path: "next.key" }],
      }),
      { mode: 0o600 },
    );
    c = {
      ...c,
      pdfAnonymousTicketSigner:
        await NodePdfAnonymousTicketSigner.load(configuration),
    };
    expect(
      (await anonymousPdfHttp(nativeRequest(`/${accepted.ticket}`), c))?.status,
    ).toBe(404);
    expect(
      (await anonymousPdfHttp(nativeRequest(`/${next.ticket}`), c))?.status,
    ).toBe(200);
  });
  it("rolls back delivery and automatic marker together on a lost marker CAS", async () => {
    await enableLink();
    const accepted = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(accepted.ticket);
    const original = c.unitOfWorkProvider;
    const failing = {
      ...c,
      unitOfWorkProvider: {
        run: <T>(fn: Parameters<typeof original.run<T>>[0]) =>
          original.run((u) =>
            fn({
              ...u,
              pdfAnonymousRequests: new Proxy(u.pdfAnonymousRequests, {
                get(target, property) {
                  if (property === "consumeAuto") return async () => false;
                  const value = Reflect.get(target, property);
                  return typeof value === "function"
                    ? value.bind(target)
                    : value;
                },
              }),
            }),
          ),
      },
    };
    await expect(
      prepareAnonymousPdfDelivery(
        failing,
        anonymousAccess,
        accepted.ticket,
        true,
      ),
    ).rejects.toMatchObject({ code: "PDF_AUTO_CHANGED" });
    expect(
      (
        await base.client.execute(
          "select count(*) as count from pdf_anonymous_deliveries",
        )
      ).rows,
    ).toEqual([{ count: 0 }]);
    expect(
      (
        await base.client.execute(
          "select auto_delivery_id from pdf_anonymous_requests",
        )
      ).rows,
    ).toEqual([{ auto_delivery_id: null }]);
    expect(
      await prepareAnonymousPdfDelivery(
        c,
        anonymousAccess,
        accepted.ticket,
        true,
      ),
    ).not.toBeNull();
  });
  it("allows only one concurrent automatic receive and keeps later status manual", async () => {
    await enableLink();
    const accepted = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(accepted.ticket);
    const results = await Promise.all([
      anonymousPdfHttp(nativeRequest(`/${accepted.ticket}/receive`), c),
      anonymousPdfHttp(nativeRequest(`/${accepted.ticket}/receive`), c),
    ]);
    expect(results.map((r) => r?.status).sort()).toEqual([200, 303]);
    for (const response of results)
      if (response?.status === 200)
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(output);
    expect(
      (
        await base.client.execute(
          "select count(*) as count from pdf_anonymous_deliveries",
        )
      ).rows,
    ).toEqual([{ count: 1 }]);
    const status = await anonymousPdfHttp(
      nativeRequest(`/${accepted.ticket}`),
      c,
    );
    expect(status?.headers.has("refresh")).toBe(false);
  });
  it("shares existing HTML Markdown browser and global note rate windows without an anonymous-only reset", async () => {
    await enableLink();
    await c.unitOfWorkProvider.run(async (u) => {
      for (let i = 0; i < 5; i++)
        expect(
          await u.exports.reserveDownload(
            noteId,
            c.tokens.hash(anonymousAccess.browser),
            now,
          ),
        ).toBeNull();
    });
    await requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next());
    await expect(
      requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next()),
    ).rejects.toMatchObject({ code: "EXPORT_RATE_LIMIT" });
    for (let i = 0; i < 24; i++)
      await requestAnonymousPdf(
        c,
        { ...anonymousAccess, browser: String(i).padStart(43, "c") },
        c.idGenerator.next(),
      );
    await expect(
      requestAnonymousPdf(
        c,
        { ...anonymousAccess, browser: "e".repeat(43) },
        c.idGenerator.next(),
      ),
    ).rejects.toMatchObject({ code: "EXPORT_RATE_LIMIT" });
    expect(
      (
        await base.client.execute(
          "select count(*) as count from pdf_anonymous_requests",
        )
      ).rows,
    ).toEqual([{ count: 25 }]);
    const command = c.idGenerator.next();
    const rejected = await anonymousPdfHttp(
      nativeRequest(
        "",
        "POST",
        new URLSearchParams({
          command,
          binding: anonymousPdfFormBinding(c, anonymousAccess, command),
        }).toString(),
      ),
      c,
    );
    expect(rejected?.status).toBe(429);
    expect(rejected?.headers.has("refresh")).toBe(false);
    expect(await rejected?.text()).toContain("元の画面でやり直す");
  });
  it("shares one render across account and anonymous demand and replays without rate consumption", async () => {
    await enableLink();
    const command = c.idGenerator.next();
    const a = await requestAnonymousPdf(c, anonymousAccess, command);
    const replay = await requestAnonymousPdf(c, anonymousAccess, command);
    expect(a.ticket === replay.ticket).toBe(true);
    const account = await request();
    await finishAnonymous(a.ticket);
    expect(renders).toBe(1);
    expect((await lookupPdf(c, token, account.commandId))?.state).toBe(
      "succeeded",
    );
    const auto = await prepareAnonymousPdfDelivery(
      c,
      anonymousAccess,
      a.ticket,
      true,
    );
    expect(auto).not.toBeNull();
    expect(
      await prepareAnonymousPdfDelivery(c, anonymousAccess, a.ticket, true),
    ).toBeNull();
    const file = await getAnonymousPdfFile(
      c,
      anonymousAccess,
      a.ticket,
      auto?.id ?? "",
      new AbortController().signal,
    );
    expect(new Uint8Array(await new Response(file.body).arrayBuffer())).toEqual(
      output,
    );
    expect(
      await anonymousPdfStatus(c, anonymousAccess, a.ticket),
    ).toMatchObject({ kind: "ready", automatic: false });
    expect(pdf.transfers.ids()).toEqual([]);
  });
  it("preserves anonymous sibling after account cancellation and cache acceptance charges once", async () => {
    await enableLink();
    const account = await request();
    const a = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await cancelPdf(c, token, account.id);
    await finishAnonymous(a.ticket);
    expect(renders).toBe(1);
    for (let index = 0; index < 5; index++)
      await requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next());
    await expect(
      requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next()),
    ).rejects.toMatchObject({ code: "EXPORT_RATE_LIMIT" });
    expect(renders).toBe(1);
  });
  it("does not consume automatic latch at mixed delivery capacity", async () => {
    await enableLink();
    const account = await request();
    const a = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    const b = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(a.ticket);
    const first = await preparePdfDelivery(c, token, account.id);
    const second = await prepareAnonymousPdfDelivery(
      c,
      anonymousAccess,
      a.ticket,
      true,
    );
    await expect(
      prepareAnonymousPdfDelivery(c, anonymousAccess, b.ticket, true),
    ).rejects.toMatchObject({ code: "PDF_DELIVERY_BUSY" });
    expect(
      await anonymousPdfStatus(c, anonymousAccess, b.ticket),
    ).toMatchObject({ kind: "ready", automatic: true });
    const file = await getPdfFile(
      c,
      token,
      first.id,
      new AbortController().signal,
    );
    await new Response(file.body).arrayBuffer();
    expect(
      await prepareAnonymousPdfDelivery(c, anonymousAccess, b.ticket, true),
    ).not.toBeNull();
    expect(second).not.toBeNull();
  });
  it("rejects original-link revocation even when the same note remains readable to its owner", async () => {
    await enableLink();
    const a = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(a.ticket);
    await base.db.run(
      sql`update note_sharing set visibility='private',grant_epoch=grant_epoch+1 where note_id=${noteId}`,
    );
    await expect(
      anonymousPdfStatus(c, anonymousAccess, a.ticket),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    const account = await request();
    expect(account.state).toBe("succeeded");
    await base.db.run(
      sql`update note_sharing set visibility='link' where note_id=${noteId}`,
    );
    await expect(
      anonymousPdfStatus(c, anonymousAccess, a.ticket),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
  });
  it("expires ticket without extending the artifact and rejects another browser", async () => {
    await enableLink();
    const a = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(a.ticket);
    await expect(
      anonymousPdfStatus(
        c,
        { ...anonymousAccess, browser: "c".repeat(43) },
        a.ticket,
      ),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    now = new Date(now.getTime() + 600001);
    expect(await anonymousPdfStatus(c, anonymousAccess, a.ticket)).toEqual({
      kind: "expired",
    });
    await expect(
      prepareAnonymousPdfDelivery(c, anonymousAccess, a.ticket, false),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
  });
  function nativeRequest(
    suffix: string,
    method = "GET",
    body?: string,
    extra: Record<string, string> = {},
  ) {
    return new Request(`${c.appUrl}/s/${anonymousAccess.token}/pdf${suffix}`, {
      method,
      headers: {
        cookie: `hollow_share_browser=${anonymousAccess.browser}; hollow_session=${token}`,
        origin: c.appUrl,
        "content-type": "application/x-www-form-urlencoded",
        ...extra,
      },
      ...(body === undefined ? {} : { body }),
    });
  }
  it("uses native POST, finite status, automatic once and explicit manual download without account history", async () => {
    await enableLink();
    const command = c.idGenerator.next();
    const body = new URLSearchParams({
      command,
      binding: anonymousPdfFormBinding(c, anonymousAccess, command),
    }).toString();
    const accepted = await anonymousPdfHttp(nativeRequest("", "POST", body), c);
    expect(accepted?.status).toBe(303);
    const location = accepted?.headers.get("location") ?? "";
    const ticket = location.split("/").at(-1) ?? "";
    const pending = await anonymousPdfHttp(nativeRequest(`/${ticket}`), c);
    expect(pending?.headers.get("refresh")?.startsWith("2; url=")).toBe(true);
    await finishAnonymous(ticket);
    const first = await anonymousPdfHttp(
      nativeRequest(`/${ticket}/receive`),
      c,
    );
    expect(first?.status).toBe(200);
    expect(first?.headers.get("content-type")).toBe("application/pdf");
    expect(
      first?.headers.get("content-disposition")?.startsWith("attachment;"),
    ).toBe(true);
    if (!first) throw new Error("fixture response");
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(output);
    const repeated = await anonymousPdfHttp(
      nativeRequest(`/${ticket}/receive`),
      c,
    );
    expect(repeated?.status).toBe(303);
    const manual = await anonymousPdfHttp(nativeRequest(`/${ticket}`), c);
    expect(manual?.headers.has("refresh")).toBe(false);
    if (!manual) throw new Error("fixture response");
    expect((await manual.text()).includes('method="post"')).toBe(true);
    const prepared = await anonymousPdfHttp(
      nativeRequest(`/${ticket}/download`, "POST", ""),
      c,
    );
    expect(prepared?.status).toBe(303);
    if (!prepared) throw new Error("fixture response");
    const downloaded = await anonymousPdfHttp(
      new Request(c.appUrl + prepared.headers.get("location"), {
        headers: { cookie: `hollow_share_browser=${anonymousAccess.browser}` },
      }),
      c,
    );
    expect(downloaded?.status).toBe(200);
    if (!downloaded) throw new Error("fixture response");
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(output);
    expect((await listPdf(c, token)).items).toHaveLength(0);
    const replay = await anonymousPdfHttp(nativeRequest("", "POST", body), c);
    expect(replay?.headers.get("location") === location).toBe(true);
  });
  it("rejects stale nonce forms, strict metadata failures, duplicate cookies, HEAD and Range", async () => {
    await enableLink();
    const command = c.idGenerator.next();
    const body = new URLSearchParams({
      command,
      binding: anonymousPdfFormBinding(c, anonymousAccess, command),
    }).toString();
    expect(
      (
        await anonymousPdfHttp(
          nativeRequest("", "POST", body, {
            cookie: `hollow_share_browser=${"z".repeat(43)}`,
          }),
          c,
        )
      )?.status,
    ).toBe(422);
    expect(
      (
        await anonymousPdfHttp(
          nativeRequest("", "POST", body, { origin: "null" }),
          c,
        )
      )?.status,
    ).toBe(403);
    const good = await anonymousPdfHttp(
      nativeRequest("", "POST", body, {
        origin: "null",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
      }),
      c,
    );
    expect(good?.status).toBe(303);
    const ticket = good?.headers.get("location")?.split("/").at(-1) ?? "";
    expect(
      (await anonymousPdfHttp(nativeRequest(`/${ticket}`, "HEAD"), c))?.status,
    ).toBe(405);
    expect(
      (
        await anonymousPdfHttp(
          nativeRequest(`/${ticket}/receive`, "GET", undefined, {
            range: "bytes=0-1",
          }),
          c,
        )
      )?.status,
    ).toBe(416);
    expect(
      (
        await anonymousPdfHttp(
          nativeRequest(`/${ticket}`, "GET", undefined, {
            cookie: `hollow_share_browser=${anonymousAccess.browser}; hollow_share_browser=${anonymousAccess.browser}`,
          }),
          c,
        )
      )?.status,
    ).toBe(404);
  });
  it("keeps original public tickets across link reissue but invalidates them across private ABA", async () => {
    await enableLink();
    const publicId = c.idGenerator.next();
    await base.db.run(
      sql`insert into note_public_identities(note_id,public_id,url_generation,access_epoch,created_at) values(${noteId},${publicId},1,0,${now.getTime()})`,
    );
    await base.db.run(
      sql`update note_sharing set visibility='public' where note_id=${noteId}`,
    );
    const publicAccess = {
      kind: "public" as const,
      publicId,
      urlGeneration: 1,
      browser: anonymousAccess.browser,
    };
    const a = await requestAnonymousPdf(c, publicAccess, c.idGenerator.next());
    const b = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(b.ticket);
    await base.db.run(
      sql`update note_sharing set token_hash=${c.tokens.hash("d".repeat(43))},link_generation=2,grant_epoch=2 where note_id=${noteId}`,
    );
    expect(await anonymousPdfStatus(c, publicAccess, a.ticket)).toMatchObject({
      kind: "ready",
    });
    await expect(
      anonymousPdfStatus(c, anonymousAccess, b.ticket),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    await base.db.run(
      sql`update note_sharing set visibility='private' where note_id=${noteId}`,
    );
    await base.db.run(
      sql`update note_public_identities set access_epoch=1 where note_id=${noteId}`,
    );
    await base.db.run(
      sql`update note_sharing set visibility='public' where note_id=${noteId}`,
    );
    await expect(
      anonymousPdfStatus(c, publicAccess, a.ticket),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
  });
  it("releases only physically closed readers and retains DB reservation when delivery-close commit fails", async () => {
    await enableLink();
    const account = await request();
    const a = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    const b = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(a.ticket);
    await preparePdfDelivery(c, token, account.id);
    const delivery = await prepareAnonymousPdfDelivery(
      c,
      anonymousAccess,
      a.ticket,
      true,
    );
    if (!delivery) throw Error("fixture delivery");
    const original = c.unitOfWorkProvider;
    let failClose = true;
    c = {
      ...c,
      unitOfWorkProvider: {
        run: (fn) =>
          original.run((u) =>
            fn({
              ...u,
              pdfAnonymousDeliveries: new Proxy(u.pdfAnonymousDeliveries, {
                get(target, key, receiver) {
                  if (key === "close")
                    return async (...args: Parameters<typeof target.close>) => {
                      if (failClose)
                        throw new BusinessRuleError(
                          "INJECTED_CLOSE",
                          "injected close failure",
                        );
                      return target.close(...args);
                    };
                  return Reflect.get(target, key, receiver);
                },
              }),
            }),
          ),
      },
    };
    const file = await getAnonymousPdfFile(
      c,
      anonymousAccess,
      a.ticket,
      delivery.id,
      new AbortController().signal,
    );
    await expect(new Response(file.body).arrayBuffer()).rejects.toBeDefined();
    expect(pdf.transfers.ids()).toEqual([]);
    expect(
      await original.run((u) => u.pdfAnonymousDeliveries.find(delivery.id)),
    ).toMatchObject({ state: "sending" });
    const writers = await base.db.all<{ n: number }>(
      sql`select count(*) n from object_writes where active=1`,
    );
    expect(Number(writers[0]?.n)).toBe(0);
    await expect(
      prepareAnonymousPdfDelivery(c, anonymousAccess, b.ticket, true),
    ).rejects.toMatchObject({ code: "PDF_DELIVERY_BUSY" });
    expect(
      await anonymousPdfStatus(c, anonymousAccess, b.ticket),
    ).toMatchObject({ kind: "ready", automatic: true });
    failClose = false;
    await original.run((u) => u.pdfAnonymousDeliveries.recover(now));
    expect(
      await prepareAnonymousPdfDelivery(c, anonymousAccess, b.ticket, true),
    ).not.toBeNull();
  });
  it("consumes the unused automatic marker for a manual-first intent and rejects its old Refresh receive", async () => {
    await enableLink();
    const accepted = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(accepted.ticket);
    const manual = await anonymousPdfHttp(
      nativeRequest(`/${accepted.ticket}/download`, "POST", ""),
      c,
    );
    expect(manual?.status).toBe(303);
    const stale = await anonymousPdfHttp(
      nativeRequest(`/${accepted.ticket}/receive`),
      c,
    );
    expect(stale?.status).toBe(303);
    expect(stale?.headers.has("content-disposition")).toBe(false);
    const page = await anonymousPdfHttp(
      nativeRequest(`/${accepted.ticket}`),
      c,
    );
    expect(page?.headers.has("refresh")).toBe(false);
    const count = await base.db.all<{ n: number }>(
      sql`select count(*) n from pdf_anonymous_deliveries`,
    );
    expect(Number(count[0]?.n)).toBe(1);
  });
  it("holds the DB reservation through the physical-release to close-commit interval", async () => {
    await enableLink();
    const account = await request();
    const a = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    const b = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(a.ticket);
    await preparePdfDelivery(c, token, account.id);
    const delivery = await prepareAnonymousPdfDelivery(
      c,
      anonymousAccess,
      a.ticket,
      true,
    );
    if (!delivery) throw Error("fixture delivery");
    let reached!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = c.unitOfWorkProvider;
    let consumed = 0;
    c = {
      ...c,
      unitOfWorkProvider: {
        run: (fn) =>
          original.run((u) =>
            fn({
              ...u,
              pdfAnonymousDeliveries: new Proxy(u.pdfAnonymousDeliveries, {
                get(target, key, receiver) {
                  if (key === "close")
                    return async (...args: Parameters<typeof target.close>) => {
                      reached();
                      await gate;
                      return target.close(...args);
                    };
                  return Reflect.get(target, key, receiver);
                },
              }),
              pdfAnonymousRequests: new Proxy(u.pdfAnonymousRequests, {
                get(target, key, receiver) {
                  if (key === "consumeAuto")
                    return async (
                      ...args: Parameters<typeof target.consumeAuto>
                    ) => {
                      consumed++;
                      return target.consumeAuto(...args);
                    };
                  return Reflect.get(target, key, receiver);
                },
              }),
            }),
          ),
      },
    };
    const file = await getAnonymousPdfFile(
      c,
      anonymousAccess,
      a.ticket,
      delivery.id,
      new AbortController().signal,
    );
    const read = new Response(file.body).arrayBuffer();
    await entered;
    let finished = false;
    const later = prepareAnonymousPdfDelivery(
      c,
      anonymousAccess,
      b.ticket,
      true,
    ).then((value) => {
      finished = true;
      return value;
    });
    try {
      expect(pdf.transfers.ids()).toEqual([]);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(finished).toBe(false);
      expect(consumed).toBe(0);
    } finally {
      release();
    }
    expect(new Uint8Array(await read)).toEqual(output);
    expect(await later).not.toBeNull();
    expect(consumed).toBe(1);
  });
  it("serializes the final browser rate slot and does not reset it on a link generation change", async () => {
    await enableLink();
    const first = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await finishAnonymous(first.ticket);
    for (let index = 0; index < 4; index++)
      await requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next());
    const outcomes = await Promise.allSettled([
      requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next()),
      requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next()),
    ]);
    expect(
      outcomes.filter((value) => value.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((value) => value.status === "rejected"),
    ).toHaveLength(1);
    const replacement = { ...anonymousAccess, token: "q".repeat(43) };
    await base.db.run(
      sql`update note_sharing set token_hash=${c.tokens.hash(replacement.token)},link_generation=2,grant_epoch=2 where note_id=${noteId}`,
    );
    await expect(
      requestAnonymousPdf(c, replacement, c.idGenerator.next()),
    ).rejects.toMatchObject({ code: "EXPORT_RATE_LIMIT" });
    now = new Date(now.getTime() + 60001);
    expect(
      Boolean(
        (await requestAnonymousPdf(c, replacement, c.idGenerator.next()))
          .ticket,
      ),
    ).toBe(true);
  });
  async function finish(commandId: string) {
    await sweepPdf(c);
    await vi.waitFor(
      async () => {
        expect((await lookupPdf(c, token, commandId))?.state).toBe("succeeded");
      },
      { timeout: 3000, interval: 10 },
    );
    await vi.waitFor(
      async () => {
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
        ).toEqual([]);
      },
      { timeout: 3000, interval: 10 },
    );
  }
  it("uses one durable command and one computation, publishes real storage bytes and reuses cache", async () => {
    const first = await request();
    expect(
      (await requestPdf(c, token, { noteId, commandId: first.commandId })).id,
    ).toBe(first.id);
    const sibling = await request();
    expect(sibling.id).not.toBe(first.id);
    await finish(first.commandId);
    expect(renders).toBe(1);
    expect(await lookupPdf(c, token, sibling.commandId)).toMatchObject({
      state: "succeeded",
      available: true,
    });
    const delivery = await preparePdfDelivery(c, token, first.id);
    const result = await getPdfFile(
      c,
      token,
      delivery.id,
      new AbortController().signal,
    );
    expect(pdf.transfers.ids()).toEqual([{ kind: "account", id: delivery.id }]);
    expect(
      new Uint8Array(await new Response(result.body).arrayBuffer()),
    ).toEqual(output);
    expect(pdf.transfers.ids()).toEqual([]);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.find(delivery.id)),
    ).toMatchObject({ state: "closed" });
    const cached = await request();
    expect(cached.state).toBe("succeeded");
    expect(cached.expiresAt).toBe(
      (await lookupPdf(c, token, first.commandId))?.expiresAt,
    );
    expect(renders).toBe(1);
  });
  it("keeps account demand after logout while rejecting old-session retrieval", async () => {
    const job = await request();
    await signOut(c, token);
    await sweepPdf(c);
    await vi.waitFor(
      async () => {
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(job.id)),
        ).toMatchObject({ state: "succeeded", accountId: actorId });
      },
      { timeout: 3000, interval: 10 },
    );
    await expect(lookupPdf(c, token, job.commandId)).rejects.toBeDefined();
  });
  it("cancels one sibling without stopping the other and never revives a cancelled request", async () => {
    const first = await request();
    const second = await request();
    expect(await cancelPdf(c, token, first.id)).toMatchObject({
      state: "cancelled",
    });
    await finish(second.commandId);
    expect(await lookupPdf(c, token, first.commandId)).toMatchObject({
      state: "cancelled",
    });
    expect(renders).toBe(1);
  });
  it("does not publish a late generation after its final demand was cancelled", async () => {
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    renderHook = async () => {
      entered();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    };
    const job = await request();
    await sweepPdf(c);
    await started;
    await cancelPdf(c, token, job.id);
    await sweepPdf(c);
    release();
    await vi.waitFor(
      async () => {
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
        ).toEqual([]);
      },
      { timeout: 3000, interval: 10 },
    );
    expect(await lookupPdf(c, token, job.commandId)).toMatchObject({
      state: "cancelled",
      available: false,
    });
    await expect(preparePdfDelivery(c, token, job.id)).rejects.toBeDefined();
  });
  it("rejects changed content after the delivery reader opens and releases only after actual close", async () => {
    const job = await request();
    await finish(job.commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const original = pdf.sources;
    c = {
      ...c,
      pdf: {
        ...pdf,
        sources: {
          async *read(source, signal) {
            for await (const chunk of original.read(source, signal)) {
              const note = await c.unitOfWorkProvider.run((u) =>
                u.notes.findById(noteId),
              );
              if (!note) throw Error("fixture");
              await saveNote(c, token, {
                id: noteId,
                version: note.version,
                title: "変更後",
                html: "<p>変更後</p>",
              });
              yield chunk;
            }
          },
        },
      },
    };
    await expect(
      getPdfFile(c, token, delivery.id, new AbortController().signal),
    ).rejects.toMatchObject({ code: "PDF_CONTENT_CHANGED" });
    await vi.waitFor(() => expect(pdf.transfers.ids()).toEqual([]));
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.find(delivery.id)),
    ).toMatchObject({ state: "closed" });
  });
  it("closes disconnected delivery, rejects replay, and preserves the retained artifact", async () => {
    const job = await request();
    await finish(job.commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const result = await getPdfFile(
      c,
      token,
      delivery.id,
      new AbortController().signal,
    );
    await expect(
      getPdfFile(c, token, delivery.id, new AbortController().signal),
    ).rejects.toBeDefined();
    await result.body.cancel();
    expect(pdf.transfers.ids()).toEqual([]);
    expect(await lookupPdf(c, token, job.commandId)).toMatchObject({
      state: "succeeded",
      available: true,
    });
    expect((await preparePdfDelivery(c, token, job.id)).id).not.toBe(
      delivery.id,
    );
  });
  it("keeps reader slot and storage owner until actual source close, including stop", async () => {
    const job = await request();
    await finish(job.commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const original = pdf.sources;
    let release!: () => void;
    let closing!: () => void;
    const closeGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const closeStarted = new Promise<void>((resolve) => {
      closing = resolve;
    });
    c = {
      ...c,
      pdf: {
        ...pdf,
        sources: {
          async *read(source, signal) {
            try {
              yield* original.read(source, signal);
            } finally {
              closing();
              await closeGate;
            }
          },
        },
      },
    };
    const result = await getPdfFile(
      c,
      token,
      delivery.id,
      new AbortController().signal,
    );
    let cancelled = false;
    let stopped = false;
    const cancel = result.body.cancel().then(() => {
      cancelled = true;
    });
    try {
      await closeStarted;
      expect(pdf.transfers.ids()).toEqual([
        { kind: "account", id: delivery.id },
      ]);
      expect(cancelled).toBe(false);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.pdfDeliveries.find(delivery.id),
        ),
      ).toMatchObject({ state: "sending" });
      const stop = pdf.transfers.stop().then(() => {
        stopped = true;
      });
      await Promise.resolve();
      expect(stopped).toBe(false);
      release();
      await cancel;
      await stop;
      expect(pdf.transfers.ids()).toEqual([]);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.pdfDeliveries.find(delivery.id),
        ),
      ).toMatchObject({ state: "closed" });
    } finally {
      release();
      await cancel;
    }
  });
  it("retains cleanup debt and does not admit a new compute until physical removal", async () => {
    renderHook = async () => {
      throw new BusinessRuleError(
        "PDF_RESOURCE_CAPACITY",
        "synthetic capacity",
      );
    };
    failRemove = true;
    const job = await request();
    await sweepPdf(c);
    await vi.waitFor(async () => {
      expect(await lookupPdf(c, token, job.commandId)).toMatchObject({
        state: "failed",
        failure: "PDF_RESOURCE_CAPACITY",
      });
    });
    await sweepPdf(c);
    expect(removed).toBe(0);
    await expect(request()).rejects.toMatchObject({ code: "PDF_BUSY" });
    failRemove = false;
    now = new Date(now.getTime() + 5001);
    await sweepPdf(c);
    expect(removed).toBeGreaterThan(0);
    renderHook = null;
    expect((await request()).state).toBe("queued");
  });
  it("keeps unknown renderer ownership fenced until explicitly verified boot recovery", async () => {
    await enableLink();
    renderHook = async () => {
      throw new SystemError(
        SystemErrorCode.PdfOwnershipUnknown,
        "synthetic ownership uncertainty",
      );
    };
    const job = await request();
    const sibling = await request();
    const anonymous = await requestAnonymousPdf(
      c,
      anonymousAccess,
      c.idGenerator.next(),
    );
    await sweepPdf(c);
    await vi.waitFor(async () => {
      const rows = await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.unfinished(),
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.state).toBe("stopping");
      const row = rows[0];
      if (!row) throw Error("fixture");
      expect(pdf.execution.active(row.id)).toBe(false);
    });
    await sweepPdf(c);
    expect(removed).toBe(0);
    await expect(request()).rejects.toMatchObject({ code: "PDF_STOPPING" });
    expect(
      await anonymousPdfStatus(c, anonymousAccess, anonymous.ticket),
    ).toMatchObject({ kind: "failed", failure: "PDF_OWNERSHIP_UNKNOWN" });
    await expect(
      requestAnonymousPdf(c, anonymousAccess, c.idGenerator.next()),
    ).rejects.toMatchObject({ code: "PDF_STOPPING" });
    for (const target of [job, sibling]) {
      expect(await lookupPdf(c, token, target.commandId)).toMatchObject({
        state: "failed",
        failure: "PDF_OWNERSHIP_UNKNOWN",
      });
      expect(
        await requestPdf(c, token, { noteId, commandId: target.commandId }),
      ).toMatchObject({
        state: "failed",
        failure: "PDF_OWNERSHIP_UNKNOWN",
      });
      await expect(
        requestPdf(c, token, {
          noteId,
          commandId: c.idGenerator.next(),
          retryOf: target.id,
        }),
      ).rejects.toMatchObject({ code: "PDF_STOPPING" });
    }
    await c.unitOfWorkProvider.run(async (u) => {
      const compute = (await u.pdfComputations.unfinished())[0];
      if (!compute) throw Error("fixture");
      expect(compute.reservedBytes).toBeGreaterThan(0);
      expect(compute.workspaceRemoved).toBe(false);
      expect(
        await u.pdfRequests.succeed(compute.id, c.idGenerator.next(), now),
      ).toBe(0);
    });
    await pdf.supervisor.recover();
    await c.importing?.storage.recoverOwners?.();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfDeliveries.recover(now);
      await u.pdfAnonymousDeliveries.recover(now);
      await u.pdfComputations.recover(now);
    });
    await sweepPdf(c);
    expect(removed).toBeGreaterThan(0);
    expect((await lookupPdf(c, token, job.commandId))?.state).toBe("failed");
    expect(
      await anonymousPdfStatus(c, anonymousAccess, anonymous.ticket),
    ).toMatchObject({ kind: "failed", failure: "PDF_OWNERSHIP_UNKNOWN" });
    renderHook = null;
    expect((await request()).state).toBe("queued");
  });
  it("retries a failed request explicitly with the current saved snapshot and keeps the old result", async () => {
    renderHook = async () => {
      throw new BusinessRuleError(
        "PDF_RESOURCE_CAPACITY",
        "synthetic capacity",
      );
    };
    const job = await request();
    await sweepPdf(c);
    await vi.waitFor(async () => {
      expect((await lookupPdf(c, token, job.commandId))?.state).toBe("failed");
      expect(
        await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
      ).toEqual([]);
    });
    const old = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(job.id),
    );
    if (!old) throw Error("fixture");
    await vi.waitFor(() =>
      expect(old.computeId && pdf.execution.active(old.computeId)).toBe(false),
    );
    await sweepPdf(c);
    const current = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!current) throw Error("fixture");
    await saveNote(c, token, {
      id: noteId,
      version: current.version,
      title: "再試行時の現在タイトル",
      html: "<p>再試行時の保存済み本文</p>",
    });
    renderHook = null;
    const retry = await requestPdf(c, token, {
      noteId,
      commandId: c.idGenerator.next(),
      retryOf: job.id,
    });
    expect(retry.id).not.toBe(job.id);
    expect(retry.title).toBe("再試行時の現在タイトル");
    await finish(retry.commandId);
    const row = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(retry.id),
    );
    expect(row).toMatchObject({
      retryOf: job.id,
      targetNoteId: noteId,
      state: "succeeded",
    });
    expect(row?.sourceIdentity).not.toBe(old.sourceIdentity);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(job.id)),
    ).toEqual(old);
    expect(renders).toBe(2);
  });
  it("keeps 24-hour artifact and 90-day history deadlines fixed", async () => {
    const job = await request();
    await finish(job.commandId);
    const ready = await lookupPdf(c, token, job.commandId);
    if (!ready?.expiresAt) throw Error("fixture");
    now = new Date(Date.parse(ready.expiresAt) - 1);
    expect((await lookupPdf(c, token, job.commandId))?.available).toBe(true);
    now = new Date(ready.expiresAt);
    expect((await lookupPdf(c, token, job.commandId))?.available).toBe(false);
    await expect(preparePdfDelivery(c, token, job.id)).rejects.toMatchObject({
      code: "PDF_EXPIRED",
    });
    await sweepPdf(c);
    const fresh = await request();
    expect(fresh.state).toBe("queued");
    await finish(fresh.commandId);
    expect(
      Date.parse((await lookupPdf(c, token, fresh.commandId))?.expiresAt ?? ""),
    ).toBe(now.getTime() + 86400000);
    expect((await lookupPdf(c, token, job.commandId))?.expiresAt).toBe(
      ready.expiresAt,
    );
    now = new Date(Date.parse(job.historyExpiresAt));
    token = (
      await signIn(c, {
        email: "pdf-flow@example.test",
        password: "test-password-1234",
      })
    ).token;
    expect((await listPdf(c, token)).items.map((item) => item.id)).toEqual([
      fresh.id,
    ]);
    expect(await lookupPdf(c, token, job.commandId)).toBeNull();
    now = new Date(fresh.historyExpiresAt);
    expect((await listPdf(c, token)).items).toEqual([]);
    expect(await lookupPdf(c, token, fresh.commandId)).toBeNull();
  });
  it("bounds authenticated delivery to 120 seconds and the original artifact expiry", async () => {
    const job = await request();
    await finish(job.commandId);
    const ready = await lookupPdf(c, token, job.commandId);
    if (!ready?.expiresAt) throw Error("fixture");
    const first = await preparePdfDelivery(c, token, job.id);
    expect(Date.parse(first.expiresAt) - now.getTime()).toBe(120000);
    const result = await getPdfFile(
      c,
      token,
      first.id,
      new AbortController().signal,
    );
    await result.body.cancel();
    now = new Date(Date.parse(ready.expiresAt) - 30000);
    const nearEnd = await preparePdfDelivery(c, token, job.id);
    expect(nearEnd.expiresAt).toBe(ready.expiresAt);
    expect((await lookupPdf(c, token, job.commandId))?.expiresAt).toBe(
      ready.expiresAt,
    );
    now = new Date(ready.expiresAt);
    await expect(
      getPdfFile(c, token, nearEnd.id, new AbortController().signal),
    ).rejects.toBeDefined();
    await expect(preparePdfDelivery(c, token, job.id)).rejects.toMatchObject({
      code: "PDF_EXPIRED",
    });
  });
  it("aborts an expired sending delivery but waits for actual close before release and reprepare", async () => {
    const job = await request();
    await finish(job.commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const original = pdf.sources;
    let release!: () => void;
    let closing!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      closing = resolve;
    });
    c = {
      ...c,
      pdf: {
        ...pdf,
        sources: {
          async *read(source, signal) {
            try {
              yield* original.read(source, signal);
            } finally {
              closing();
              await gate;
            }
          },
        },
      },
    };
    const result = await getPdfFile(
      c,
      token,
      delivery.id,
      new AbortController().signal,
    );
    now = new Date(delivery.expiresAt);
    await sweepPdf(c);
    await started;
    try {
      expect(pdf.transfers.ids()).toEqual([
        { kind: "account", id: delivery.id },
      ]);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.pdfDeliveries.find(delivery.id),
        ),
      ).toMatchObject({ state: "sending" });
      await expect(preparePdfDelivery(c, token, job.id)).rejects.toMatchObject({
        code: "PDF_DELIVERY_BUSY",
      });
    } finally {
      release();
    }
    await vi.waitFor(() => expect(pdf.transfers.ids()).toEqual([]));
    await expect(new Response(result.body).arrayBuffer()).rejects.toBeDefined();
    const next = await preparePdfDelivery(c, token, job.id);
    expect(next.id).not.toBe(delivery.id);
    expect(Date.parse(next.expiresAt) - now.getTime()).toBe(120000);
  });
  it("uses strict authenticated HTTP, native MIME and disposition, and rejects HEAD/Range", async () => {
    const commandId = c.idGenerator.next();
    const create = (cookie: boolean, origin = "http://localhost:3000") =>
      new Request(`http://localhost:3000/api/notes/${noteId}/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          ...(cookie ? { Cookie: `hollow_session=${token}` } : {}),
        },
        body: JSON.stringify({ commandId }),
      });
    expect((await pdfHttp(create(false), c))?.status).toBe(401);
    expect(
      (await pdfHttp(create(true, "https://other.example"), c))?.status,
    ).toBe(403);
    const accepted = await pdfHttp(create(true), c);
    expect(accepted?.status).toBe(200);
    const job = await lookupPdf(c, token, commandId);
    if (!job) throw Error("fixture");
    const replay = await pdfHttp(create(true), c);
    expect(await replay?.json()).toMatchObject({ id: job.id });
    await finish(commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const headers = { Cookie: `hollow_session=${token}` };
    const url = `http://localhost:3000${delivery.url}`;
    expect(
      (await pdfHttp(new Request(url, { method: "HEAD", headers }), c))?.status,
    ).toBe(405);
    expect(
      (
        await pdfHttp(
          new Request(url, { headers: { ...headers, Range: "bytes=0-4" } }),
          c,
        )
      )?.status,
    ).toBe(416);
    const response = await pdfHttp(new Request(url, { headers }), c);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Type")).toBe("application/pdf");
    expect(response?.headers.get("Content-Disposition")).toContain(
      "attachment;",
    );
    expect(response?.headers.get("Cache-Control")).toContain("no-store");
    if (!response) throw Error("fixture");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(output);
    const watch = new URLSearchParams();
    for (let i = 0; i < 51; i++) watch.append("watch", c.idGenerator.next());
    expect(
      (
        await pdfHttp(
          new Request(`http://localhost:3000/api/pdf-activity?${watch}`, {
            headers,
          }),
          c,
        )
      )?.status,
    ).toBe(422);
  });
  it("rejects empty saved content without admitting a computation", async () => {
    const empty = (await saveNote(c, token, { title: "空のノート", html: "" }))
      .note.id;
    await expect(
      requestPdf(c, token, { noteId: empty, commandId: c.idGenerator.next() }),
    ).rejects.toMatchObject({ code: "PDF_EMPTY" });
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
    ).toEqual([]);
  });
  it("holds two actual readers, rejects duplicate request preparation, and expires ready tickets", async () => {
    const first = await request();
    await finish(first.commandId);
    const second = await request();
    const third = await request();
    const a = await preparePdfDelivery(c, token, first.id);
    const b = await preparePdfDelivery(c, token, second.id);
    await expect(preparePdfDelivery(c, token, first.id)).rejects.toMatchObject({
      code: "PDF_DELIVERY_BUSY",
    });
    await expect(preparePdfDelivery(c, token, third.id)).rejects.toMatchObject({
      code: "PDF_DELIVERY_BUSY",
    });
    const one = await getPdfFile(c, token, a.id, new AbortController().signal);
    const two = await getPdfFile(c, token, b.id, new AbortController().signal);
    expect(pdf.transfers.ids()).toHaveLength(2);
    await one.body.cancel();
    await two.body.cancel();
    expect(pdf.transfers.ids()).toEqual([]);
    const ticket = await preparePdfDelivery(c, token, third.id);
    now = new Date(Date.parse(ticket.expiresAt));
    await expect(
      getPdfFile(c, token, ticket.id, new AbortController().signal),
    ).rejects.toBeDefined();
    await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.expireReady(now));
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.find(ticket.id)),
    ).toMatchObject({ state: "closed", expiresAt: new Date(ticket.expiresAt) });
    await sweepPdf(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.find(ticket.id)),
    ).toBeNull();
  });
});
