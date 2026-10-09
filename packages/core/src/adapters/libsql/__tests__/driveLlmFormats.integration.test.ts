import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { currentLlmSource } from "@repo/core/application/llm/current";
import { requestDriveLlmRegeneration } from "@repo/core/application/llm/driveRequest";
import {
  beginPdfPreview,
  cancelPdfPreview,
  readyPdfPreview,
} from "@repo/core/application/llm/pdfPreview";
import { getLlmNote } from "@repo/core/application/llm/read";
import { afterEach, describe, expect, it } from "vitest";
import { driveFormatsFixture, formatsNow } from "./driveLlmFormatsFixtures";
import { regenerationId } from "./regenerationFixtures";

describe("Drive fixed non-audio LLM admission and PDF source receipts", () => {
  let fixture: Awaited<ReturnType<typeof driveFormatsFixture>> | undefined;
  afterEach(async (context) => {
    if (fixture) {
      await fixture.close(context.task.result?.state !== "fail");
      fixture = undefined;
    }
  });
  it("claims a queued Drive PDF preview only with its owned active input receipt", async () => {
    const f = await driveFormatsFixture("pdf");
    fixture = f;
    const before = await f.snapshot();
    const admitted = await beginPdfPreview(f.c, f.token, {
      noteId: f.row.noteId,
      noteVersion: 0,
      expectedEpoch: 2,
      commandId: f.c.idGenerator.next(),
      recordId: f.recordId,
    });
    await f.base.uow.run(async (u) => {
      const value = await u.llmPdfPreviews.find(admitted.previewId);
      if (!value || value.access.origin !== "drive-record")
        throw Error("DRIVE_PREVIEW");
      expect(value.state).toBe("queued");
      expect(await u.llmPdfPreviews.claimCandidate(formatsNow)).toEqual(value);
      const runtimeId = f.c.idGenerator.next();
      const ownerToken = f.c.idGenerator.next();
      expect(
        await u.llmPdfPreviews.claimExact({
          candidate: value,
          now: formatsNow,
          runtimeId,
          ownerToken,
          receipt: null,
        }),
      ).toBeNull();
      expect(await u.llmPdfPreviews.find(value.id)).toEqual(value);
      const receipt = {
        consumer: { kind: "pdf-preview" as const, id: value.id },
        runtimeId,
        token: ownerToken,
        generation: 1,
        state: "active" as const,
      };
      await expect(
        u.llmPdfPreviews.claimExact({
          candidate: value,
          now: formatsNow,
          runtimeId,
          ownerToken,
          receipt: {
            ...receipt,
            consumer: { kind: "llm-conversion", id: value.id },
          },
        }),
      ).rejects.toThrow();
      expect(await u.llmPdfPreviews.find(value.id)).toEqual(value);
      const claimed = await u.llmPdfPreviews.claimExact({
        candidate: value,
        now: formatsNow,
        runtimeId,
        ownerToken,
        receipt,
      });
      expect(claimed).toMatchObject({
        state: "running",
        access: value.access,
        source: value.source,
        inputReceipt: receipt,
        sourceMemoryBytes: 52_428_800,
        owner: { state: "active", runtimeId, token: ownerToken },
      });
    });
    const after = await f.snapshot();
    expect(after.note).toEqual(before.note);
    expect(after.head).toEqual(before.head);
    expect(after.revisions).toEqual(before.revisions);
    expect(after.quota).toEqual(before.quota);
  });
  it.each([
    ["text", 1, 1],
    ["image", 3, 2],
    ["docx", 2, 1],
    ["xlsx", 2, 1],
    ["pptx", 2, 1],
  ] as const)("admits %s with its fixed recipe and one executor quota reservation", async (format, preparationVersion, promptVersion) => {
    const f = await driveFormatsFixture(format);
    fixture = f;
    const before = await f.snapshot();
    const admitted = await requestDriveLlmRegeneration(f.c, f.token, f.input);
    expect(await requestDriveLlmRegeneration(f.c, f.token, f.input)).toEqual(
      admitted,
    );
    const after = await f.snapshot();
    expect(after.note).toEqual(before.note);
    expect(after.head).toEqual(before.head);
    expect(after.revisions).toEqual(before.revisions);
    await f.base.uow.run(async (u) => {
      const value = await u.llmConversions.find(admitted.jobId);
      if (
        !value ||
        value.selection !== "fixed" ||
        value.access.origin !== "drive-record"
      )
        throw Error("FIXED_DRIVE_RECEIPT");
      expect(await u.llmConversions.claimCandidate(formatsNow)).toEqual(value);
      expect(value.source.format).toBe(format);
      expect(value.preparationVersion).toBe(preparationVersion);
      expect(value.promptVersion).toBe(promptVersion);
      expect(value.pdfProof).toBeNull();
      expect(value.accountId).toBe(f.row.accountId);
      expect(value.credentialEpoch).toBe(2);
      const binding = await u.regenerationBindings.find(value.access.bindingId);
      expect(binding?.consumer).toEqual({
        kind: "llm-conversion",
        id: admitted.jobId,
      });
      expect(binding?.executorId).toBe(f.row.accountId);
      expect(binding?.credentialOwnerId).toBe(f.recorderId);
      expect(binding?.driveEpoch).toBe(1);
      expect(binding?.recordId).toBe(f.recordId);
      expect((await u.jobs.find(admitted.jobId))?.originalId).toBe(
        f.row.originalId,
      );
      expect((await u.llmQuota.reservation(admitted.jobId))?.state).toBe(
        "reserved",
      );
      await currentLlmSource(u, value, formatsNow);
      const runtimeId = f.c.idGenerator.next();
      const ownerToken = f.c.idGenerator.next();
      expect(
        await u.llmConversions.claimExact({
          candidate: value,
          now: formatsNow,
          runtimeId,
          ownerToken,
          receipt: null,
        }),
      ).toBeNull();
      expect(await u.llmConversions.find(value.jobId)).toEqual(value);
      const receipt = {
        consumer: { kind: "llm-conversion" as const, id: value.jobId },
        runtimeId,
        token: ownerToken,
        generation: 1,
        state: "active" as const,
      };
      const claimed = await u.llmConversions.claimExact({
        candidate: value,
        now: formatsNow,
        runtimeId,
        ownerToken,
        receipt,
      });
      expect(claimed?.sourceMemoryBytes).toBe(52_428_800);
      expect(claimed?.inputReceipt).toEqual(receipt);
      expect(claimed?.access).toEqual(value.access);
      expect(claimed?.owner.state).toBe("active");
    });
    expect(
      (
        await f.base.client.execute(
          "SELECT count(*) AS n FROM llm_quota_reservations",
        )
      ).rows[0]?.n,
    ).toBe(1);
  });

  it.each([
    "local-to-drive",
    "drive-to-local",
  ] as const)("rejects %s PDF receipt reuse without writing an admission", async (direction) => {
    const f = await driveFormatsFixture("pdf");
    fixture = f;
    const preview = await f.preview(direction === "drive-to-local");
    const before = await f.snapshot(preview.id);
    await expect(
      f.base.uow.run((u) =>
        readyPdfPreview(
          u,
          f.row.accountId,
          {
            previewId: preview.id,
            noteId: f.row.noteId,
            noteVersion: 0,
            expectedEpoch: 2,
            ...(direction === "local-to-drive" ? { recordId: f.recordId } : {}),
          },
          formatsNow,
        ),
      ),
    ).rejects.toMatchObject({ code: "LLM_PDF_PREVIEW_CHANGED" });
    expect(await f.snapshot(preview.id)).toEqual(before);
    if (direction === "local-to-drive") {
      await expect(
        requestDriveLlmRegeneration(f.c, f.token, {
          ...f.input,
          pdfPreviewId: preview.id,
        }),
      ).rejects.toMatchObject({ code: "LLM_PDF_PREVIEW_CHANGED" });
      expect(await f.snapshot(preview.id)).toEqual(before);
    }
  });

  it.each([
    false,
    true,
  ])("consumes a ready Drive PDF (visual=%s) and captures its fixed proof and new binding in one UoW", async (visual) => {
    const f = await driveFormatsFixture("pdf");
    fixture = f;
    const preview = await f.preview(true, visual);
    if (preview.access.origin !== "drive-record")
      throw Error("PDF_DRIVE_BINDING");
    const before = await f.snapshot(preview.id);
    const input = {
      ...f.input,
      modelId: visual ? "fixture/image" : "fixture/text",
      pdfPreviewId: preview.id,
    };
    const admitted = await requestDriveLlmRegeneration(f.c, f.token, input);
    expect(await requestDriveLlmRegeneration(f.c, f.token, input)).toEqual(
      admitted,
    );
    await f.base.uow.run(async (u) => {
      const value = await u.llmConversions.find(admitted.jobId);
      if (
        !value ||
        value.selection !== "fixed" ||
        value.access.origin !== "drive-record"
      )
        throw Error("PDF_FIXED_BINDING");
      expect(value.source.format).toBe("pdf");
      expect(value.preparationVersion).toBe(visual ? 4 : 2);
      expect(value.promptVersion).toBe(visual ? 3 : 1);
      expect(value.pdfProof).toEqual(preview.result);
      expect(value.sourceOwnershipGeneration).toBe(preview.ownershipGeneration);
      expect(value.access.bindingId).not.toBe(preview.access.bindingId);
      const binding = await u.regenerationBindings.find(value.access.bindingId);
      expect(binding?.consumer).toEqual({
        kind: "llm-conversion",
        id: admitted.jobId,
      });
      expect(binding?.recordId).toBe(f.recordId);
      const consumed = await u.llmPdfPreviews.find(preview.id);
      expect(consumed?.state).toBe("consumed");
      if (consumed?.state !== "consumed") throw Error("PDF_NOT_CONSUMED");
      expect(consumed.jobId).toBe(admitted.jobId);
      expect((await u.llmQuota.reservation(admitted.jobId))?.state).toBe(
        "reserved",
      );
      await currentLlmSource(u, value, formatsNow);
    });
    const after = await f.snapshot(preview.id);
    expect(after.note).toEqual(before.note);
    expect(after.head).toEqual(before.head);
    expect(after.revisions).toEqual(before.revisions);
    expect(
      (
        await f.base.client.execute(
          "SELECT count(*) AS n FROM llm_quota_reservations",
        )
      ).rows[0]?.n,
    ).toBe(1);
  });

  it("rolls new binding, job, quota and original back when the preview consume CAS fails", async () => {
    const f = await driveFormatsFixture("pdf");
    fixture = f;
    const preview = await f.preview(true);
    const before = await f.snapshot(preview.id);
    const failing: HollowContainer = {
      ...f.c,
      unitOfWorkProvider: {
        run: (work) =>
          f.base.uow.run((u) =>
            work({
              ...u,
              llmPdfPreviews: new Proxy(u.llmPdfPreviews, {
                get(target, key) {
                  if (key === "consume") return async () => false;
                  const value = Reflect.get(target, key);
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
      requestDriveLlmRegeneration(failing, f.token, {
        ...f.input,
        pdfPreviewId: preview.id,
      }),
    ).rejects.toMatchObject({ code: "LLM_PDF_PREVIEW_CHANGED" });
    expect(await f.snapshot(preview.id)).toEqual(before);
  });

  it.each([
    false,
    true,
  ])("projects only the matching existing PDF receipt on revisit (Drive=%s)", async (drive) => {
    const f = await driveFormatsFixture("pdf");
    fixture = f;
    const preview = await f.preview(drive);
    const before = await f.snapshot(preview.id);
    const local = await getLlmNote(f.c, f.token, { noteId: f.row.noteId });
    const matched = await getLlmNote(f.c, f.token, {
      noteId: f.row.noteId,
      recordId: f.recordId,
    });
    const other = await getLlmNote(f.c, f.token, {
      noteId: f.row.noteId,
      recordId: regenerationId(9999),
    });
    const safe = { commandId: preview.commandId, previewId: preview.id };
    expect(local.pdfPreview).toEqual(drive ? null : safe);
    expect(matched.pdfPreview).toEqual(drive ? safe : null);
    expect(other.pdfPreview).toBeNull();
    expect(await f.snapshot(preview.id)).toEqual(before);
  });

  it.each([
    "viewer",
    "removed",
    "relink",
    "epoch",
  ] as const)("does not expose an existing Drive PDF receipt after %s", async (change) => {
    const f = await driveFormatsFixture("pdf");
    fixture = f;
    const preview = await f.preview(true);
    if (change === "viewer" || change === "removed")
      await f.base.uow.run((u) =>
        u.workspaces.membership(
          f.workspaceId,
          f.row.accountId,
          change === "viewer" ? "viewer" : null,
        ),
      );
    if (change === "relink")
      await f.base.uow.run(async (u) => {
        const connection = await u.driveConnections.find(f.recorderId);
        if (!connection || connection.state !== "linked")
          throw Error("REVISIT_DRIVE");
        expect(
          await u.driveConnections.replace(
            {
              ...connection,
              epoch: connection.epoch + 1,
              credentialVersion: connection.credentialVersion + 1,
              settingsVersion: connection.settingsVersion + 1,
              version: connection.version + 1,
              folder: null,
              autoBackup: false,
              lastUsedAt: null,
              updatedAt: formatsNow,
            },
            connection.version,
            "adopt",
          ),
        ).toBe(true);
      });
    if (change === "epoch")
      await f.base.uow.run(async (u) => {
        const connection = await u.openRouterConnections.find(f.row.accountId);
        if (!connection || connection.state !== "linked")
          throw Error("REVISIT_OPENROUTER");
        expect(
          await u.openRouterConnections.replace(
            {
              ...connection,
              epoch: connection.epoch + 1,
              version: connection.version + 1,
              updatedAt: formatsNow,
            },
            connection.version,
          ),
        ).toBe(true);
      });
    const before = await f.snapshot(preview.id);
    const read = getLlmNote(f.c, f.token, {
      noteId: f.row.noteId,
      recordId: f.recordId,
    });
    if (change === "viewer" || change === "removed")
      await expect(read).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    else expect((await read).pdfPreview).toBeNull();
    expect(await f.snapshot(preview.id)).toEqual(before);
    expect(before.note?.html).toBe("<p>source</p>");
    expect(before.note?.version).toBe(0);
  });

  it.each([
    "cancel-binding",
    "relink",
    "epoch",
    "viewer",
    "removed",
  ] as const)("rejects the same accepted Drive command after %s with its prior receipt unchanged", async (change) => {
    const f = await driveFormatsFixture("text");
    fixture = f;
    const admitted = await requestDriveLlmRegeneration(f.c, f.token, f.input);
    const value = await f.base.uow.run((u) =>
      u.llmConversions.find(admitted.jobId),
    );
    if (!value || value.access.origin !== "drive-record")
      throw Error("REPLAY_DRIVE");
    const bindingId = value.access.bindingId;
    if (change === "cancel-binding")
      await f.base.uow.run(async (u) => {
        const binding = await u.regenerationBindings.find(bindingId);
        if (!binding) throw Error("REPLAY_BINDING");
        expect(
          await u.regenerationBindings.replace(
            {
              ...binding,
              cancelGeneration: binding.cancelGeneration + 1,
              version: binding.version + 1,
            },
            binding.version,
          ),
        ).toBe(true);
      });
    if (change === "relink")
      await f.base.uow.run(async (u) => {
        const connection = await u.driveConnections.find(f.recorderId);
        if (!connection || connection.state !== "linked")
          throw Error("REPLAY_RECORDER");
        expect(
          await u.driveConnections.replace(
            {
              ...connection,
              epoch: connection.epoch + 1,
              credentialVersion: connection.credentialVersion + 1,
              settingsVersion: connection.settingsVersion + 1,
              version: connection.version + 1,
              folder: null,
              autoBackup: false,
              lastUsedAt: null,
              updatedAt: formatsNow,
            },
            connection.version,
            "adopt",
          ),
        ).toBe(true);
      });
    if (change === "epoch")
      await f.base.uow.run(async (u) => {
        const connection = await u.openRouterConnections.find(f.row.accountId);
        if (!connection || connection.state !== "linked")
          throw Error("REPLAY_EXECUTOR");
        expect(
          await u.openRouterConnections.replace(
            {
              ...connection,
              epoch: connection.epoch + 1,
              version: connection.version + 1,
              updatedAt: formatsNow,
            },
            connection.version,
          ),
        ).toBe(true);
      });
    if (change === "viewer" || change === "removed")
      await f.base.uow.run((u) =>
        u.workspaces.membership(
          f.workspaceId,
          f.row.accountId,
          change === "viewer" ? "viewer" : null,
        ),
      );
    const before = await f.snapshot();
    const prior = await f.base.uow.run(async (u) => ({
      value: await u.llmConversions.find(admitted.jobId),
      binding: await u.regenerationBindings.find(bindingId),
      job: await u.jobs.find(admitted.jobId),
      quota: await u.llmQuota.reservation(admitted.jobId),
    }));
    await expect(
      requestDriveLlmRegeneration(f.c, f.token, f.input),
    ).rejects.toMatchObject({
      code:
        change === "viewer" || change === "removed"
          ? "NOTE_NOT_FOUND"
          : "REGENERATION_SOURCE_INVALID",
    });
    expect(await f.snapshot()).toEqual(before);
    expect(
      await f.base.uow.run(async (u) => ({
        value: await u.llmConversions.find(admitted.jobId),
        binding: await u.regenerationBindings.find(bindingId),
        job: await u.jobs.find(admitted.jobId),
        quota: await u.llmQuota.reservation(admitted.jobId),
      })),
    ).toEqual(prior);
    expect(before.note?.html).toBe("<p>source</p>");
    expect(before.note?.version).toBe(0);
  });

  it.each([
    "cancel",
    "relink",
    "viewer",
    "removed",
    "record",
  ] as const)("rejects a ready Drive PDF after %s without further DB writes", async (change) => {
    const f = await driveFormatsFixture("pdf");
    fixture = f;
    const preview = await f.preview(true);
    if (change === "cancel") await cancelPdfPreview(f.c, f.token, preview.id);
    if (change === "relink")
      await f.base.uow.run(async (u) => {
        const drive = await u.driveConnections.find(f.recorderId);
        if (!drive || drive.state !== "linked") throw Error("PDF_RELINK_DRIVE");
        expect(
          await u.driveConnections.replace(
            {
              ...drive,
              epoch: drive.epoch + 1,
              credentialVersion: drive.credentialVersion + 1,
              settingsVersion: drive.settingsVersion + 1,
              version: drive.version + 1,
              autoBackup: false,
              folder: null,
              lastUsedAt: null,
              updatedAt: formatsNow,
            },
            drive.version,
            "adopt",
          ),
        ).toBe(true);
      });
    if (change === "viewer" || change === "removed")
      await f.base.uow.run((u) =>
        u.workspaces.membership(
          f.workspaceId,
          f.row.accountId,
          change === "viewer" ? "viewer" : null,
        ),
      );
    const before = await f.snapshot(preview.id);
    await expect(
      f.base.uow.run((u) =>
        readyPdfPreview(
          u,
          f.row.accountId,
          {
            previewId: preview.id,
            noteId: f.row.noteId,
            noteVersion: 0,
            expectedEpoch: 2,
            recordId: change === "record" ? regenerationId(9999) : f.recordId,
          },
          formatsNow,
        ),
      ),
    ).rejects.toMatchObject({
      code:
        change === "viewer" || change === "removed"
          ? "NOTE_NOT_FOUND"
          : "LLM_PDF_PREVIEW_CHANGED",
    });
    expect(await f.snapshot(preview.id)).toEqual(before);
    await expect(
      requestDriveLlmRegeneration(f.c, f.token, {
        ...f.input,
        pdfPreviewId: preview.id,
        ...(change === "record" ? { recordId: regenerationId(9999) } : {}),
      }),
    ).rejects.toMatchObject({
      code:
        change === "viewer" || change === "removed"
          ? "NOTE_NOT_FOUND"
          : change === "record"
            ? "REGENERATION_SOURCE_INVALID"
            : "LLM_PDF_PREVIEW_CHANGED",
    });
    expect(await f.snapshot(preview.id)).toEqual(before);
  });
});
