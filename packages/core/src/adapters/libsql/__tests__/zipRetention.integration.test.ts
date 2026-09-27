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
import { saveNote } from "@repo/core/application/note/saveNote";
import { prepareZipDelivery } from "@repo/core/application/zip/delivery";
import { previewZip } from "@repo/core/application/zip/preview";
import { previewZipRetry, retryZip } from "@repo/core/application/zip/retry";
import {
  getZip,
  getZipDetails,
  lookupZip,
  requestZip,
} from "@repo/core/application/zip/usecases";
import { pumpZip, sweepZip } from "@repo/core/application/zip/worker";
import { BusinessRuleError } from "@repo/core/domain/error";
import { ZIP_ARTIFACT_MS, ZIP_HISTORY_MS } from "@repo/core/domain/zip/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("ZIP retention separates expired requests from accepted work", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let storage: CoordinatedObjectStorage;
  let root: string;
  let session: string;
  let actor: string;
  let noteId: string;
  let now: Date;
  beforeEach(async () => {
    now = new Date();
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-retention-test-"));
    const mail: string[] = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(value) {
          mail.push(value.text);
        },
      }),
      clock: { now: () => now },
      logger: { info() {}, warn() {}, error() {} },
    };
    const pending = await signUp(c, {
      email: "zip-retention@example.test",
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
    actor = auth.user.id;
    noteId = (
      await saveNote(c, session, {
        title: "旧履歴の題名",
        html: "<p>retained bytes</p>",
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
    c = {
      ...c,
      zip,
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
    await zip?.execution.stop();
    await zip?.transfers.stop();
    try {
      expect(
        await base.db.all(sql`select id from object_writes where active=1`),
      ).toEqual([]);
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
    }
  });
  async function at(value: Date) {
    now = value;
    session = c.tokens.generate();
    await c.unitOfWorkProvider.run((u) =>
      u.accounts.saveSession({
        tokenHash: c.tokens.hash(session),
        accountId: actor,
        expiresAt: new Date(now.getTime() + 86400000),
      }),
    );
  }
  async function request(ids = [noteId]) {
    const preview = await previewZip(c, session, {
      noteIds: ids,
      format: "html",
    });
    return requestZip(c, session, {
      noteIds: ids,
      format: "html",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
  }
  async function finish(id: string, generation: number, state: string) {
    await pumpZip(c);
    await vi.waitFor(
      async () =>
        expect((await getZip(c, session, id, generation)).state).toBe(state),
      { timeout: 5000, interval: 10 },
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${id}:${generation}`)).toBe(false),
    );
  }
  async function run(id: string, generation = 1) {
    const value = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: id, generation }),
    );
    if (!value) throw new Error("Missing fixture run");
    return value;
  }
  async function artifact(id: string, generation = 1) {
    const value = await run(id, generation);
    const artifactId = value.artifactId;
    if (!artifactId) throw new Error("Missing fixture artifact id");
    const result = await c.unitOfWorkProvider.run((u) =>
      u.zipArtifacts.find(artifactId),
    );
    if (!result) throw new Error("Missing fixture artifact");
    return result;
  }
  async function partial() {
    const broken = (
      await saveNote(c, session, {
        title: "失敗対象",
        html: "<p>failed once</p>",
      })
    ).note.id;
    c = {
      ...c,
      zip: {
        ...zip,
        documentWriter: {
          async plan(input) {
            if (input.noteId === broken)
              throw new BusinessRuleError(
                "EXPORT_DOCUMENT_INVALID",
                "Synthetic child failure",
              );
            return planExportDocument(input);
          },
        },
      },
    };
    const job = await request([noteId, broken]);
    await finish(job.id, 1, "partial");
    c = { ...c, zip };
    return {
      job,
      oldRun: await run(job.id),
      artifact: await artifact(job.id),
      retry: {
        id: job.id,
        generation: 1,
        mode: "failed" as const,
        ordinals: [1],
      },
    };
  }

  it("rejects a new partial retry at the seven-day boundary without reviving old bytes or changing history", async () => {
    const old = await partial();
    const parent = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.find(old.job.id),
    );
    await at(new Date(old.artifact.expiresAt.getTime() - 1));
    const preview = await previewZipRetry(c, session, old.retry);
    const command = {
      ...old.retry,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    };
    await at(old.artifact.expiresAt);
    await expect(previewZipRetry(c, session, old.retry)).rejects.toMatchObject({
      code: "ZIP_NEW_REQUEST_REQUIRED",
    });
    await expect(retryZip(c, session, command)).rejects.toMatchObject({
      code: "ZIP_NEW_REQUEST_REQUIRED",
    });
    expect(await lookupZip(c, session, command.commandId)).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.find(old.job.id)),
    ).toEqual(parent);
    expect((await run(old.job.id)).finishedAt).toEqual(old.oldRun.finishedAt);
    await sweepZip(c);
    await sweepZip(c);
    expect((await artifact(old.job.id)).state).toBe("removed");
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipSpools.refs(old.oldRun)),
    ).toEqual([]);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBe(0);
    expect((await getZip(c, session, old.job.id)).state).toBe("partial");
    await expect(
      prepareZipDelivery(c, session, old.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
  });

  it("keeps a legitimately accepted retry active across the old artifact expiry and publishes a new seven-day artifact", async () => {
    const old = await partial();
    const parent = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.find(old.job.id),
    );
    const support = await c.unitOfWorkProvider.run((u) =>
      u.zipSpools.refs(old.oldRun),
    );
    const originalSpool = support[0]?.spool;
    if (!originalSpool || originalSpool.state !== "ready")
      throw new Error("Missing retry support");
    const bytes = Buffer.from(await storage.read(originalSpool.key));
    await at(new Date(old.artifact.expiresAt.getTime() - 1000));
    const preview = await previewZipRetry(c, session, old.retry);
    const accepted = await retryZip(c, session, {
      ...old.retry,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    expect(accepted.generation).toBe(2);
    expect(accepted.finishedAt).toBeNull();
    await at(new Date(old.artifact.expiresAt.getTime() + 1000));
    await sweepZip(c);
    await sweepZip(c);
    const activeRefs = await c.unitOfWorkProvider.run((u) =>
      u.zipSpools.refs({ requestId: old.job.id, generation: 2 }),
    );
    expect(activeRefs[0]?.ref.purpose).toBe("active");
    expect(activeRefs[0]?.spool.id).toBe(originalSpool.id);
    expect(Buffer.from(await storage.read(originalSpool.key))).toEqual(bytes);
    await finish(old.job.id, 2, "succeeded");
    const fresh = await artifact(old.job.id, 2);
    expect(fresh.publishedAt).toEqual(now);
    expect(fresh.expiresAt.getTime()).toBe(now.getTime() + ZIP_ARTIFACT_MS);
    expect((await run(old.job.id)).finishedAt).toEqual(old.oldRun.finishedAt);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipRequests.find(old.job.id)))
        ?.historyExpiresAt,
    ).toEqual(parent?.historyExpiresAt);
    expect(
      (await getZipDetails(c, session, old.job.id, 2)).items.map((item) => [
        item.origin,
        item.attemptNumber,
      ]),
    ).toEqual([
      ["reused", 1],
      ["attempt", 2],
    ]);
    await expect(
      prepareZipDelivery(c, session, old.job.id, 2),
    ).resolves.toHaveProperty("id");
  });

  it("hands never-published assembly retry to a new receipt across parent expiry without extending old titles, then physically cleans and prunes", async () => {
    c = {
      ...c,
      zip: {
        ...zip,
        writer: {
          upperBound: NodeZipWriter.upperBound,
          async write() {
            throw new BusinessRuleError(
              "ZIP_WRITE_FAILED",
              "Synthetic assembly failure",
            );
          },
        },
      },
    };
    const old = await request();
    await finish(old.id, 1, "failed");
    c = { ...c, zip };
    const oldRun = await run(old.id);
    expect(oldRun.publishedAt).toBeNull();
    const oldParent = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.find(old.id),
    );
    const refs = await c.unitOfWorkProvider.run((u) =>
      u.zipSpools.refs(oldRun),
    );
    const spool = refs[0]?.spool;
    if (!spool || spool.state !== "ready")
      throw new Error("Missing assembly retry support");
    const supportBytes = Buffer.from(await storage.read(spool.key));
    await at(new Date(oldRun.historyExpiresAt.getTime() - 1000));
    const input = {
      id: old.id,
      generation: 1,
      mode: "assembly" as const,
      ordinals: [],
    };
    const preview = await previewZipRetry(c, session, input);
    const command = {
      ...input,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    };
    const accepted = await retryZip(c, session, command);
    expect(accepted.id).not.toBe(old.id);
    expect(new Date(accepted.historyExpiresAt).getTime()).toBe(
      now.getTime() + ZIP_HISTORY_MS,
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipRequests.attempts({ requestId: accepted.id, generation: 1 }),
      ),
    ).toEqual([]);
    const handed = await c.unitOfWorkProvider.run((u) =>
      u.zipSpools.refs({ requestId: accepted.id, generation: 1 }),
    );
    expect(handed[0]?.spool.id).toBe(spool.id);
    expect(handed[0]?.ref.purpose).toBe("active");
    await at(new Date(oldRun.historyExpiresAt.getTime() + 1000));
    await sweepZip(c);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipRequests.attempts(oldRun)))[0]
        ?.title,
    ).toBe("");
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipRequests.find(old.id)))
        ?.historyExpiresAt,
    ).toEqual(oldParent?.historyExpiresAt);
    expect((await run(old.id)).finishedAt).toEqual(oldRun.finishedAt);
    await expect(getZip(c, session, old.id)).rejects.toMatchObject({
      code: "ZIP_NOT_FOUND",
    });
    expect(await lookupZip(c, session, old.commandId)).toBeNull();
    expect((await lookupZip(c, session, command.commandId))?.id).toBe(
      accepted.id,
    );
    expect((await retryZip(c, session, command)).historyExpiresAt).toBe(
      accepted.historyExpiresAt,
    );
    expect(Buffer.from(await storage.read(spool.key))).toEqual(supportBytes);
    await finish(accepted.id, 1, "succeeded");
    const details = await getZipDetails(c, session, accepted.id, 1);
    expect(details.items).toHaveLength(1);
    expect(details.items[0]).toMatchObject({
      ordinal: 0,
      origin: "reused",
      state: "succeeded",
      title: null,
    });
    expect(details.job.finishedAt).toBe(now.toISOString());
    const fresh = await artifact(accepted.id);
    expect(fresh.state).toBe("ready");
    await at(fresh.expiresAt);
    for (let pass = 0; pass < 4; pass++) await sweepZip(c);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBe(0);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.find(old.id)),
    ).toBeNull();
    expect((await getZip(c, session, accepted.id)).finishedAt).toBe(
      details.job.finishedAt,
    );
    await at(new Date(accepted.historyExpiresAt));
    for (let pass = 0; pass < 4; pass++) await sweepZip(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.find(accepted.id)),
    ).toBeNull();
    expect(
      await base.db.all(
        sql`select id from zip_artifacts union all select id from zip_spools union all select id from zip_assemblies`,
      ),
    ).toEqual([]);
  });
});
