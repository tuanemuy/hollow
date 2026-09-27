import { type FileHandle, mkdtemp, open, readdir, rm } from "node:fs/promises";
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
import { ObjectOwnershipUnprovenError } from "@repo/core/application/ports/objectOwnership";
import { previewZip } from "@repo/core/application/zip/preview";
import {
  cancelZip,
  getZip,
  requestZip,
} from "@repo/core/application/zip/usecases";
import { pumpZip, sweepZip } from "@repo/core/application/zip/worker";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return { ...real, open: vi.fn(real.open) };
});

type Stage = "child" | "assembly";
describe("ZIP owned native writes retain DB ownership until proven close", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let root: string;
  let session: string;
  let noteId: string;
  let now: Date;
  let unknown: boolean;
  let handles: {
    handle: FileHandle;
    close: () => Promise<void>;
    file: string;
  }[];
  let releases: (() => void)[];
  const gate = () => {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    releases.push(release);
    return { promise, release };
  };
  beforeEach(async () => {
    handles = [];
    releases = [];
    unknown = false;
    now = new Date();
    base = await createTestContainer();
    root = await mkdtemp(
      path.join(os.tmpdir(), "hollow-zip-write-owner-test-"),
    );
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
      email: "zip-write-owner@example.test",
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
    if (!auth) throw new Error("Missing fixture account");
    session = auth.token;
    noteId = (
      await saveNote(c, session, {
        title: "ZIP所有",
        html: "<p>小さい合成本文</p>",
      })
    ).note.id;
    const storage = new CoordinatedObjectStorage(
      root,
      c.unitOfWorkProvider,
      c.clock,
    );
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
    for (const release of releases) release();
    const stopped = await Promise.allSettled([
      zip?.execution.stop(),
      zip?.transfers.stop(),
    ]);
    vi.restoreAllMocks();
    for (const entry of handles)
      if (entry.handle.fd !== -1) await entry.close();
    try {
      expect(handles.every((entry) => entry.handle.fd === -1)).toBe(true);
      if (unknown)
        expect(stopped[0]).toMatchObject({
          status: "rejected",
          reason: { code: "ZIP_OWNERSHIP_UNKNOWN" },
        });
      else {
        expect(stopped.every((result) => result.status === "fulfilled")).toBe(
          true,
        );
        expect(await owners()).toEqual([]);
      }
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
    }
  });
  const owners = () =>
    base.db.all<{ kind: string; owner_id: string }>(
      sql`select kind,owner_id from object_writes where active=1`,
    );
  const reserved = () => c.unitOfWorkProvider.run((u) => u.zipWork.reserved());
  const run = (id: string) =>
    c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: id, generation: 1 }),
    );
  async function request() {
    const preview = await previewZip(c, session, {
      noteIds: [noteId],
      format: "html",
    });
    const job = await requestZip(c, session, {
      noteIds: [noteId],
      format: "html",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    await pumpZip(c);
    return job;
  }
  async function observe(stage: Stage, adjust: (handle: FileHandle) => void) {
    const real =
      await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await real.open(...args);
      const file = String(args[0]);
      if (
        path.dirname(file) === root &&
        file.includes(stage === "child" ? "_zip_spool.part-" : "_zip.part-")
      ) {
        handles.push({ handle, close: handle.close.bind(handle), file });
        adjust(handle);
      }
      return handle;
    });
  }
  async function held(stage: Stage, id: string) {
    const owned = await owners();
    expect(owned).toHaveLength(1);
    expect(owned[0]?.kind).toBe(
      stage === "child" ? "zip-spool" : "zip-assembly",
    );
    expect(zip.execution.active(`${id}:1`)).toBe(true);
    expect((await reserved()).bytes).toBeGreaterThan(0);
    expect(handles).toHaveLength(1);
    expect(handles[0]?.handle.fd).toBeGreaterThanOrEqual(0);
    expect(await readdir(root)).toContain(
      path.basename(handles[0]?.file ?? ""),
    );
    expect((await run(id))?.artifactId).toBeNull();
    return owned;
  }

  it.each([
    "child",
    "assembly",
  ] as const)("retains %s owner and reservation through cancel until real FD close", async (stage) => {
    const closing = gate();
    const allow = gate();
    await observe(stage, (handle) => {
      const close = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        closing.release();
        await allow.promise;
        await close();
      });
    });
    const job = await request();
    await closing.promise;
    const owned = await held(stage, job.id);
    const bytes = await reserved();
    await cancelZip(c, session, job.id);
    expect((await run(job.id))?.state).toBe("stopping");
    await sweepZip(c);
    expect(await owners()).toEqual(owned);
    expect(await reserved()).toEqual(bytes);
    expect(handles[0]?.handle.fd).toBeGreaterThanOrEqual(0);
    allow.release();
    await vi.waitFor(
      () => expect(zip.execution.active(`${job.id}:1`)).toBe(false),
      { timeout: 5000 },
    );
    expect((await getZip(c, session, job.id)).state).toBe("cancelled");
    expect(handles[0]?.handle.fd).toBe(-1);
    expect(await owners()).toEqual([]);
    await sweepZip(c);
    expect((await reserved()).bytes).toBe(0);
  });

  it.each([
    "child",
    "assembly",
  ] as const)("keeps %s close rejection as unknown with active owner, stopping run and debt", async (stage) => {
    await observe(stage, (handle) => {
      vi.spyOn(handle, "close").mockRejectedValue(
        new Error("Synthetic native close failure"),
      );
    });
    unknown = true;
    const job = await request();
    await vi.waitFor(
      async () =>
        expect((await run(job.id))?.failure).toBe("ZIP_OWNERSHIP_UNKNOWN"),
      { timeout: 5000 },
    );
    const owned = await held(stage, job.id);
    const bytes = await reserved();
    expect((await run(job.id))?.state).toBe("stopping");
    await sweepZip(c);
    expect(await held(stage, job.id)).toEqual(owned);
    expect(await reserved()).toEqual(bytes);
    await expect(zip.execution.stop()).rejects.toBeInstanceOf(
      ObjectOwnershipUnprovenError,
    );
    expect(zip.execution.active(`${job.id}:1`)).toBe(true);
    expect(await owners()).toEqual(owned);
    expect((await run(job.id))?.state).toBe("stopping");
  });

  it.each([
    "child",
    "assembly",
  ] as const)("recovers ordinary %s write failure only after real close", async (stage) => {
    await observe(stage, (handle) => {
      vi.spyOn(handle, "write").mockRejectedValue(
        new Error("Synthetic write failure"),
      );
    });
    const job = await request();
    await vi.waitFor(
      () => expect(zip.execution.active(`${job.id}:1`)).toBe(false),
      { timeout: 5000 },
    );
    expect((await getZip(c, session, job.id)).state).toBe("failed");
    expect((await run(job.id))?.failure).not.toBe("ZIP_OWNERSHIP_UNKNOWN");
    expect(handles).toHaveLength(1);
    expect(handles[0]?.handle.fd).toBe(-1);
    expect(await owners()).toEqual([]);
    expect((await readdir(root)).some((name) => name.includes(".part-"))).toBe(
      false,
    );
    await sweepZip(c);
    if (stage === "child") expect((await reserved()).bytes).toBe(0);
    else {
      expect(
        await base.db.all(
          sql`select id from zip_assemblies where storage_key is not null or reserved_bytes!=0`,
        ),
      ).toEqual([]);
      const refs = await c.unitOfWorkProvider.run((u) =>
        u.zipSpools.refs({ requestId: job.id, generation: 1 }),
      );
      expect(refs).toHaveLength(1);
      expect(refs[0]?.spool.state).toBe("ready");
      expect((await reserved()).bytes).toBeGreaterThan(0);
    }
  });
});
