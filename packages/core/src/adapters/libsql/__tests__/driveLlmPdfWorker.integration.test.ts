import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { NodeRegenerationInput } from "@repo/core/adapters/node/regeneration/input";
import { NodeRegenerationMemory } from "@repo/core/adapters/node/regeneration/memory";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { requestDriveLlmRegeneration } from "@repo/core/application/llm/driveRequest";
import type { LlmPdfPagesPreparer } from "@repo/core/application/llm/pdfClassificationPorts";
import { beginPdfPreview } from "@repo/core/application/llm/pdfPreview";
import {
  type LlmGenerateInput,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import { sweepLlm } from "@repo/core/application/llm/worker";
import { regenerationServices } from "@repo/core/application/regeneration/services";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  PDF_PAGE_POLICY,
  PDF_PAGE_RENDERER,
  type PdfPageManifest,
  type PdfPreview,
} from "@repo/core/domain/llm/pdfPreview";
import { attemptReleased } from "@repo/core/domain/regeneration/entity";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import { afterEach, expect, it } from "vitest";
import { driveFormatsFixture, formatsNow } from "./driveLlmFormatsFixtures";

let fixture: Awaited<ReturnType<typeof driveFormatsFixture>> | undefined;
afterEach(async (context) => {
  if (fixture) {
    await fixture.close(context.task.result?.state !== "fail");
    fixture = undefined;
  }
});

it.each([
  "success",
  "initial-missing",
  "final-missing",
] as const)("%s keeps Drive PDF ownership and accounts only for actual page sends", async (mode) => {
  const f = await driveFormatsFixture("pdf");
  fixture = f;
  const original = f.c.llm;
  const drive = f.c.drive;
  if (
    original.inputMode !== "leased-local-v2" ||
    original.sourceMode !== "drive" ||
    !drive
  )
    throw Error("DRIVE_PDF_WORKER_RUNTIME");
  const before = await f.snapshot();
  await f.base.uow.run(async (u) => {
    const connection = await u.driveConnections.find(f.recorderId);
    if (!connection || connection.state !== "linked")
      throw Error("DRIVE_PDF_WORKER_CREDENTIAL");
    expect(
      await u.driveConnections.replace(
        {
          ...connection,
          credentialVersion: connection.credentialVersion + 1,
          version: connection.version + 1,
          credential: {
            ...connection.credential,
            envelope: JSON.stringify({
              version: 1,
              accessToken: "synthetic-access",
              refreshToken: "synthetic-refresh",
            }),
          },
        },
        connection.version,
        "refresh",
      ),
    ).toBe(true);
  });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const pageHash = createHash("sha256").update(png).digest("hex");
  const preview = await beginPdfPreview(f.c, f.token, {
    noteId: f.row.noteId,
    noteVersion: 0,
    expectedEpoch: 2,
    commandId: f.c.idGenerator.next(),
    recordId: f.recordId,
  });
  const manifest = await f.base.uow.run(async (u) => {
    const queued = await u.llmPdfPreviews.find(preview.previewId);
    if (!queued || queued.state !== "queued")
      throw Error("DRIVE_PDF_WORKER_PREVIEW");
    const running: PdfPreview & { state: "running" } = {
      ...queued,
      state: "running",
      owner: {
        state: "active",
        runtimeId: f.c.idGenerator.next(),
        token: f.c.idGenerator.next(),
      },
      version: queued.version + 1,
      updatedAt: formatsNow,
    };
    expect(await u.llmPdfPreviews.replace(running, queued.version)).toBe(true);
    const manifest: PdfPageManifest = {
      kind: "pdf-pages" as const,
      preparationVersion: 4 as const,
      source: queued.source,
      policy: PDF_PAGE_POLICY,
      renderer: PDF_PAGE_RENDERER,
      total: 2,
      sha256: "c".repeat(64),
      pages: [0, 1].map((ordinal) => ({
        ordinal,
        width: 1,
        height: 1,
        bytes: png.length,
        sha256: pageHash,
      })),
    };
    const ready: PdfPreview & { state: "ready" } = {
      ...running,
      state: "ready",
      result: {
        kind: "pages",
        preparationVersion: 4,
        promptVersion: 3,
        modelKind: "chat-image",
        reason: "VISUAL_CONTENT",
        manifest,
      },
      owner: { ...running.owner, state: "closed" },
      version: running.version + 1,
      updatedAt: formatsNow,
    };
    expect(await u.llmPdfPreviews.replace(ready, running.version)).toBe(true);
    return manifest;
  });
  const redrawn: number[] = [];
  const nativeClosed: number[] = [];
  const reads: string[] = [];
  const wires: LlmGenerateInput[] = [];
  const unused = async (): Promise<never> => {
    throw Error("DRIVE_PDF_WORKER_UNUSED_PORT");
  };
  const pages: LlmPdfPagesPreparer = {
    prepare: unused,
    async redraw(input, signal) {
      expect(input.manifest).toEqual(manifest);
      expect(input.bytes.byteLength).toBe(manifest.source.bytes);
      expect(signal.aborted).toBe(false);
      const owner = input.native;
      if (!owner) throw Error("DRIVE_PDF_WORKER_NATIVE_OWNER");
      const birth = await owner.reserve();
      const child = spawn(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `process.stdout.write(Buffer.from('${png.toString("base64")}','base64'))`,
        ],
        { env: {}, stdio: ["ignore", "pipe", "ignore"], signal },
      );
      const chunks: Buffer[] = [];
      if (!child.stdout) throw Error("DRIVE_PDF_WORKER_NATIVE_STDOUT");
      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      let spawnError: Error | null = null;
      child.once("error", (error) => {
        spawnError = error;
      });
      const closed = new Promise<number | null>((resolve) => {
        child.once("close", (code) => resolve(code));
      });
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      try {
        if (!child.pid) throw Error("DRIVE_PDF_WORKER_NATIVE_PID");
        await owner.register(birth, child.pid);
        const code = await closed;
        await owner.closed(birth);
        nativeClosed.push(input.page.ordinal);
        if (spawnError || code !== 0)
          throw new LlmOperationError("LLM_SOURCE_INVALID", "not-sent", true);
        const bytes = Buffer.concat(chunks);
        expect(bytes).toEqual(png);
        redrawn.push(input.page.ordinal);
        return { mimeType: "image/png", bytes, width: 1, height: 1 };
      } finally {
        clearTimeout(timer);
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
          await closed;
        }
      }
    },
  };
  const memory = new NodeRegenerationMemory(
    original.preparer,
    original.pdfClassifier,
    pages,
  );
  const stage = new NodeRegenerationInput(
    f.c,
    regenerationServices(
      memory,
      { read: unused },
      {
        async read(input) {
          await input.checkCurrent();
          expect(input.record.id).toBe(f.recordId);
          reads.push("acquire");
          if (mode === "initial-missing")
            throw new BusinessRuleError(
              "REGENERATION_SOURCE_INVALID",
              "Synthetic metadata 404: source is missing",
            );
          return new Uint8Array(input.record.bytes);
        },
        async inspect(input) {
          await input.checkCurrent();
          expect(input.record.id).toBe(f.recordId);
          reads.push("final-check");
          if (mode === "final-missing")
            throw new BusinessRuleError(
              "REGENERATION_SOURCE_INVALID",
              "Synthetic metadata 404: source is missing",
            );
        },
      },
      drive,
    ),
  );
  stage.configureRuntime(original.ownership.runtimeId, original.ownership);
  const c: HollowContainer = {
    ...f.c,
    llm: {
      ...original,
      inputStage: stage,
      pdfPages: pages,
      storage: new CoordinatedObjectStorage(
        path.join(path.dirname(f.base.filename), "owned-objects"),
        f.base.uow,
        f.c.clock,
      ),
      profiles: {
        inspect: async () => ({
          modelId: "fixture/image",
          kind: "chat-image",
          contextTokens: 8192,
          outputTokens: 1024,
          supportsMaxTokens: true,
          source: "adopted-default",
          checkedAt: formatsNow,
          budget: {
            kind: "resource-only",
            imageTokens: null,
            contextGuaranteed: false,
          },
        }),
      },
      generator: {
        async generate(input) {
          if (input.kind !== "chat-image" || input.promptVersion !== 3)
            throw Error("DRIVE_PDF_WORKER_WIRE");
          const ordinal = input.input.ordinal;
          expect(redrawn).toEqual(
            Array.from({ length: ordinal + 1 }, (_, i) => i),
          );
          expect(nativeClosed).toEqual(redrawn);
          expect(input.input.bytes).toEqual(png);
          expect(Object.keys(input.input).sort()).toEqual([
            "bytes",
            "height",
            "kind",
            "mimeType",
            "ordinal",
            "pages",
            "width",
          ]);
          await f.base.uow.run(async (u) => {
            const dispatch = await u.llmDispatches.find(input.dispatchId);
            if (!dispatch) throw Error("DRIVE_PDF_WORKER_DISPATCH");
            const value = await u.llmConversions.find(dispatch.jobId);
            if (!value || value.access.origin !== "drive-record")
              throw Error("DRIVE_PDF_WORKER_CURRENT");
            expect(value.sourceMemoryBytes).toBe(SOURCE_MEMORY_BYTES);
            expect(value.inputReceipt?.state).toBe("active");
            expect(stage.lease(value)?.receipt).toEqual(value.inputReceipt);
            expect(
              (await u.regenerationBindings.find(value.access.bindingId))
                ?.recordId,
            ).toBe(f.recordId);
            expect(dispatch.state).toBe("intent");
            expect(dispatch.input.ordinal).toBe(ordinal);
            expect(await u.notes.findById(f.row.noteId)).toEqual(before.note);
            expect(await u.revisions.head(f.row.noteId)).toEqual(before.head);
          });
          wires.push(input);
          return {
            content: `<p>ページ${ordinal + 1} 日本語</p>`,
            finish: "stop",
            inputTokens: 1,
            outputTokens: 1,
          };
        },
      },
    },
    openRouter: {
      ...f.c.openRouter,
      protector: {
        ...f.c.openRouter.protector,
        reveal: () => "synthetic-private-key",
      },
    },
  };
  const admitted = await requestDriveLlmRegeneration(c, f.token, {
    ...f.input,
    modelId: "fixture/image",
    pdfPreviewId: preview.previewId,
  });
  await sweepLlm(c);
  await expect
    .poll(() => original.execution.active(admitted.jobId), {
      timeout: 10000,
      interval: 10,
    })
    .toBe(false);
  await original.execution.stop();
  const sent = mode !== "initial-missing";
  expect(
    wires.map((wire) =>
      wire.input.kind === "pdf-page" ? wire.input.ordinal : -1,
    ),
  ).toEqual(sent ? [0, 1] : []);
  expect(reads).toEqual(
    sent ? ["acquire", "acquire", "final-check"] : ["acquire"],
  );
  await f.base.uow.run(async (u) => {
    const value = await u.llmConversions.find(admitted.jobId);
    if (!value || value.access.origin !== "drive-record")
      throw Error("DRIVE_PDF_WORKER_RESULT");
    expect(value.phase).toBe("terminal");
    expect(value.outcome).toEqual(
      mode === "success"
        ? { kind: "succeeded", noteVersion: 1 }
        : { kind: "failed", code: "LLM_SOURCE_CHANGED" },
    );
    expect(value.owner.state).toBe("closed");
    expect(value.sourceMemoryBytes).toBe(0);
    expect(value.inputReceipt?.state).toBe("closed");
    const attempts = await u.regenerationAttempts.forBinding(
      value.access.bindingId,
    );
    expect(attempts.map((attempt) => attempt.purpose)).toEqual(
      sent ? ["acquire", "acquire", "final-check"] : ["acquire"],
    );
    if (mode !== "success")
      expect(attempts.at(-1)).toMatchObject({
        phase: "terminal",
        owner: { state: "closed" },
        completion: {
          kind: "closed",
          outcome: "failed",
          callerEnded: true,
          acknowledged: true,
        },
      });
    expect(attempts.every(attemptReleased)).toBe(true);
    const dispatches = await u.llmDispatches.list(value.jobId);
    expect(dispatches.map((dispatch) => dispatch.state)).toEqual(
      sent ? ["scrubbed", "scrubbed"] : [],
    );
    expect(dispatches.every((dispatch) => dispatch.response === null)).toBe(
      true,
    );
    if (mode === "success") {
      expect((await u.notes.findById(f.row.noteId))?.html).toBe(
        "<p>ページ1 日本語</p>\n<p>ページ2 日本語</p>",
      );
      expect((await u.revisions.head(f.row.noteId))?.currentNo).toBe(
        (before.head?.currentNo ?? 0) + 1,
      );
    } else {
      expect(await u.notes.findById(f.row.noteId)).toEqual(before.note);
      expect(await u.revisions.head(f.row.noteId)).toEqual(before.head);
      expect(await u.revisions.list(f.row.noteId)).toEqual(before.revisions);
    }
    expect((await u.imports.findOriginal(f.row.originalId))?.state).toBe(
      "ready",
    );
    expect((await u.llmQuota.reservation(value.jobId))?.state).toBe(
      sent ? "consumed" : "released",
    );
    expect(await u.llmQuota.usage(f.row.accountId, "2026-10")).toMatchObject({
      reserved: 0,
      consumed: sent ? 1 : 0,
    });
    expect(
      (await u.openRouterConnections.find(f.row.accountId))?.lastUsedAt,
    ).toEqual(sent ? formatsNow : before.executorConnection?.lastUsedAt);
  });
  expect(
    (
      await f.base.client.execute(
        "SELECT count(*) AS n FROM llm_quota_reservations",
      )
    ).rows[0]?.n,
  ).toBe(1);
  expect(memory.activeInputs()).toBe(0);
  await stage.stop();
});
