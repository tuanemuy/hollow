import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { planExportDocument } from "@repo/core/adapters/node/exportDocument/plan";
import { FileExportSourceReader } from "@repo/core/adapters/node/exportSourceReader";
import { NodeZipDiskAdmission } from "@repo/core/adapters/node/zip/disk";
import {
  NodeZipExecution,
  NodeZipTransfers,
} from "@repo/core/adapters/node/zip/lifetimes";
import { NodeZipNames } from "@repo/core/adapters/node/zip/names";
import { NodeZipSourceReader } from "@repo/core/adapters/node/zip/sources";
import { NodeZipWriter } from "@repo/core/adapters/node/zip/writer";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { SystemErrorCode } from "@repo/core/application/errors";
import { saveNote } from "@repo/core/application/note/saveNote";
import type {
  ReferenceProcessor,
  SafeReferenceFetcher,
} from "@repo/core/application/ports/referenceProcessor";
import {
  getZipFile,
  prepareZipDelivery,
} from "@repo/core/application/zip/delivery";
import { previewZip } from "@repo/core/application/zip/preview";
import { previewZipRetry, retryZip } from "@repo/core/application/zip/retry";
import {
  getZip,
  lookupZip,
  requestZip,
} from "@repo/core/application/zip/usecases";
import { pumpZip } from "@repo/core/application/zip/worker";
import { BusinessRuleError } from "@repo/core/domain/error";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

const remote = "https://zip-inspection.example.test/image.png";
const processor: ReferenceProcessor = {
  hasDecoration: () => false,
  prepare(html) {
    return {
      html,
      candidates: html.includes(remote)
        ? [{ url: remote, kind: "image", location: "img@src" }]
        : [],
      notices: [],
    };
  },
  styles: () => [],
  rewrite(html) {
    return this.prepare(html);
  },
  decodeCss() {
    throw new Error("Unexpected CSS decoding");
  },
  decodeDataUri() {
    throw new Error("Unexpected inline media");
  },
  encodeDataUri() {
    throw new Error("Unexpected inline media");
  },
};

describe("ZIP requires a determinate external inspection", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let storage: CoordinatedObjectStorage;
  let root: string;
  let session: string;
  let remoteNote: string;
  let plainNote: string;
  let reason: string | null;
  let assemblyOnly: string | null;
  const bodies: ReadableStream<Uint8Array>[] = [];
  const fetch = vi.fn(async (): Promise<never> => {
    throw new Error("External network is outside this fixture");
  });

  beforeEach(async () => {
    reason = null;
    assemblyOnly = null;
    fetch.mockClear();
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-inspection-test-"));
    const mail: string[] = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(value) {
          mail.push(value.text);
        },
      }),
      logger: { info() {}, warn() {}, error() {} },
    };
    const pending = await signUp(c, {
      email: "zip-inspection@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const url = mail.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!url) throw new Error("Missing fixture mail");
    const auth = await verifyEmail(
      c,
      new URL(url).searchParams.get("token") ?? "",
      pending.browserToken,
    );
    if (!auth) throw new Error("Missing fixture actor");
    session = auth.token;
    remoteNote = (
      await saveNote(c, session, {
        title: "外部画像を参照する本文",
        html: `<p>外部参照</p><img src="${remote}">`,
      })
    ).note.id;
    plainNote = (
      await saveNote(c, session, {
        title: "参照なしの兄弟",
        html: "<p>独立した本文</p>",
      })
    ).note.id;
    storage = new CoordinatedObjectStorage(root, c.unitOfWorkProvider, c.clock);
    await storage.recoverOwners();
    zip = {
      writer: NodeZipWriter,
      names: NodeZipNames,
      documentWriter: {
        async plan(input) {
          return planExportDocument(input);
        },
      },
      sources: new NodeZipSourceReader(
        storage,
        new FileExportSourceReader(root),
      ),
      execution: new NodeZipExecution(c.clock),
      transfers: new NodeZipTransfers(c.clock),
      disk: new NodeZipDiskAdmission(root, 6 * 1024 ** 3),
      capacity: {
        diskBytes: 4 * 1024 ** 3,
        protectedDiskBytes: 6 * 1024 ** 3,
        totalMs: 1_800_000,
        childMs: 120_000,
        assemblyMs: 120_000,
        deliveryMs: 600_000,
        leaseMs: 60_000,
        cleanupMs: 30_000,
      },
      defaultCss: "",
      wake() {},
    };
    const inspectMany: SafeReferenceFetcher["inspectMany"] = async (
      urls,
      options,
    ) => {
      options?.signal?.throwIfAborted();
      let currentReason = reason;
      if (assemblyOnly) {
        const attempts = await c.unitOfWorkProvider.run((u) =>
          u.zipRequests.attempts({
            requestId: assemblyOnly ?? "",
            generation: 1,
          }),
        );
        currentReason =
          attempts.length > 0 &&
          attempts.every((item) => item.state === "succeeded")
            ? "REFERENCE_TIMEOUT"
            : null;
      }
      return urls.map((value) => ({
        url: value,
        allowed: currentReason === null,
        reason: currentReason,
      }));
    };
    c = {
      ...c,
      zip,
      referencing: {
        processor,
        fetcher: {
          inspectMany,
          async inspect(value, options) {
            const result = (await inspectMany([value], options))[0];
            if (!result) throw new Error("Missing fixture inspection");
            return result;
          },
          fetch,
        },
        wake() {},
      },
      importing: {
        storage,
        extractor: {
          async extract() {
            throw new Error("Unused extractor");
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
    await Promise.allSettled(bodies.splice(0).map((body) => body.cancel()));
    await zip?.execution.stop();
    await zip?.transfers.stop();
    try {
      expect(fetch).not.toHaveBeenCalled();
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
      expect(
        await base.db.all(sql`select id from object_writes where active=1`),
      ).toEqual([]);
    } finally {
      base.close();
      await rm(root, { recursive: true, force: true });
    }
  });
  async function request(noteIds = [remoteNote]) {
    const preview = await previewZip(c, session, { noteIds, format: "html" });
    return requestZip(c, session, {
      noteIds,
      format: "html",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
  }
  async function finish(id: string, state: string) {
    await pumpZip(c);
    await vi.waitFor(
      async () => expect((await getZip(c, session, id)).state).toBe(state),
      { timeout: 5000, interval: 10 },
    );
    await vi.waitFor(() => expect(zip.execution.active(`${id}:1`)).toBe(false));
  }
  async function run(id: string) {
    const value = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: id, generation: 1 }),
    );
    if (!value) throw new Error("Missing fixture run");
    return value;
  }
  async function artifact(id: string) {
    const value = await c.unitOfWorkProvider.run((u) =>
      u.zipArtifacts.find(id),
    );
    if (!value) throw new Error("Missing fixture artifact");
    return value;
  }
  async function ready() {
    const job = await request();
    await finish(job.id, "succeeded");
    const row = await run(job.id);
    if (!row.artifactId) throw new Error("Missing fixture artifact id");
    const value = await artifact(row.artifactId);
    if (value.state !== "ready") throw new Error("Missing ready artifact");
    return { job, artifact: value };
  }

  it("preserves all artifact fields through temporary DNS and timeout failures at prepare and get, then delivers after recovery", async () => {
    const prior = await ready();
    const ticket = await prepareZipDelivery(c, session, prior.job.id, 1);
    for (const failure of ["REFERENCE_DNS", "REFERENCE_TIMEOUT"]) {
      reason = failure;
      await expect(
        prepareZipDelivery(c, session, prior.job.id, 1),
      ).rejects.toMatchObject({ code: SystemErrorCode.ExternalApiError });
      await expect(
        getZipFile(c, session, ticket.id, new AbortController().signal),
      ).rejects.toMatchObject({ code: SystemErrorCode.ExternalApiError });
      expect(await artifact(prior.artifact.id)).toEqual(prior.artifact);
      expect(
        (await c.unitOfWorkProvider.run((u) => u.zipDeliveries.find(ticket.id)))
          ?.state,
      ).toBe("ready");
      expect(zip.transfers.ids()).toEqual([]);
    }
    reason = null;
    const response = await getZipFile(
      c,
      session,
      ticket.id,
      new AbortController().signal,
    );
    bodies.push(response.body);
    expect(
      Buffer.from(await new Response(response.body).arrayBuffer()),
    ).toEqual(Buffer.from(await storage.read(prior.artifact.key)));
    expect(await artifact(prior.artifact.id)).toEqual(prior.artifact);
  });

  it("retires a confirmed PRIVATE projection change and does not revive it when the source becomes allowed", async () => {
    const prior = await ready();
    reason = "REFERENCE_PRIVATE";
    await expect(
      prepareZipDelivery(c, session, prior.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    expect((await artifact(prior.artifact.id)).state).toBe("cleanup");
    reason = null;
    await expect(
      prepareZipDelivery(c, session, prior.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
  });

  it("fails only an indeterminate generation child and retains its successful independent sibling", async () => {
    reason = "REFERENCE_DNS";
    const job = await request([remoteNote, plainNote]);
    await finish(job.id, "partial");
    const row = await run(job.id);
    const attempts = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.attempts(row),
    );
    expect(
      attempts.map((item) => [item.ordinal, item.state, item.failure]),
    ).toEqual([
      [0, "failed", SystemErrorCode.ExternalApiError],
      [1, "succeeded", null],
    ]);
    expect(row.exclusions).toEqual([]);
    const refs = await c.unitOfWorkProvider.run((u) => u.zipSpools.refs(row));
    expect(refs).toHaveLength(1);
    expect(refs[0]?.ref.ordinal).toBe(1);
    expect(refs[0]?.spool.state).toBe("ready");
  });

  it("fails assembly on an indeterminate inspection without excluding or retiring the successful child spool", async () => {
    const job = await request();
    assemblyOnly = job.id;
    await finish(job.id, "failed");
    const row = await run(job.id);
    expect(row.failure).toBe(SystemErrorCode.ExternalApiError);
    expect(row.exclusions).toEqual([]);
    expect(row.artifactId).toBeNull();
    const attempts = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.attempts(row),
    );
    expect(attempts.map((item) => item.state)).toEqual(["succeeded"]);
    const refs = await c.unitOfWorkProvider.run((u) => u.zipSpools.refs(row));
    expect(refs).toHaveLength(1);
    expect(refs[0]?.ref.purpose).toBe("retry");
    const spool = refs[0]?.spool;
    if (!spool || spool.state !== "ready")
      throw new Error("Missing retry spool");
    expect((await storage.read(spool.key)).byteLength).toBe(spool.result.bytes);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBeGreaterThanOrEqual(spool.result.bytes);
  });

  it("rejects a temporarily indeterminate failed-child retry without creating a run or new refs", async () => {
    c = {
      ...c,
      zip: {
        ...zip,
        documentWriter: {
          async plan(input) {
            if (input.noteId === plainNote)
              throw new BusinessRuleError(
                "EXPORT_DOCUMENT_INVALID",
                "Synthetic child failure",
              );
            return planExportDocument(input);
          },
        },
      },
    };
    const job = await request([remoteNote, plainNote]);
    await finish(job.id, "partial");
    c = { ...c, zip };
    const row = await run(job.id);
    const refs = await c.unitOfWorkProvider.run((u) => u.zipSpools.refs(row));
    const input = {
      id: job.id,
      generation: 1,
      mode: "failed" as const,
      ordinals: [1],
    };
    const preview = await previewZipRetry(c, session, input);
    const command = {
      ...input,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    };
    reason = "REFERENCE_TIMEOUT";
    await expect(previewZipRetry(c, session, input)).rejects.toMatchObject({
      code: SystemErrorCode.ExternalApiError,
    });
    await expect(retryZip(c, session, command)).rejects.toMatchObject({
      code: SystemErrorCode.ExternalApiError,
    });
    expect(await run(job.id)).toEqual(row);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipSpools.refs(row)),
    ).toEqual(refs);
    const next = { requestId: job.id, generation: 2 };
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.findRun(next)),
    ).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipSpools.refs(next)),
    ).toEqual([]);
    expect(await lookupZip(c, session, command.commandId)).toBeNull();
  });
});
