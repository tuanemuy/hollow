import { EventId } from "@repo/core/domain/common/event";
import { BusinessRuleError } from "@repo/core/domain/error";
import { IMPORT_LIMITS } from "@repo/core/domain/import/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { selectedScope } from "@repo/core/domain/workspace/entity";
import { isSerializableError } from "@repo/core/lib/error";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import { commitNote } from "../note/commitNote";
import type { ImportFormat } from "../ports/documentExtractor";
import { requireScope } from "../workspace/access";
import { importContext } from "./context";
import { sealIfComplete } from "./sealBundle";
import { withObjectOwner } from "./withObjectOwner";

export async function acceptUpload(
  container: HollowContainer,
  token: string | null,
  id: string,
  body: ReadableStream<Uint8Array>,
) {
  const io = importContext(container);
  const reservation = await container.unitOfWorkProvider.run(
    async (context) => {
      const { accounts, imports } = context;
      const account = await requireAccount(container, accounts, token);
      const row = await imports.findReservation(id);
      if (!row || row.accountId !== account.id)
        throw new NotFoundError(
          "UPLOAD_NOT_FOUND",
          "アップロードが見つかりません。",
        );
      const batch = await imports.findBatch(row.batchId);
      if (batch)
        await requireScope(
          context,
          selectedScope(account.id, {
            workspaceId: batch.workspaceId ?? undefined,
          }),
          account.id,
          "edit",
        );
      if (
        !batch ||
        batch.cancelledAt ||
        row.expiresAt <= container.clock.now() ||
        !(await imports.updateReservation(id, "awaiting", "uploading"))
      )
        throw new BusinessRuleError(
          "UPLOAD_EXPIRED",
          "このアップロードは終了しています。取り込み直してください。",
        );
      return row;
    },
  );
  return withObjectOwner(container, { kind: "import-upload", id }, async () => {
    let result: { noteId: string | null; jobId: string | null };
    try {
      const stored = await io.storage.put(
        reservation.storageKey,
        body,
        reservation.bytes,
      );
      if (reservation.role === "companion") {
        result = await container.unitOfWorkProvider.run(async (c) => {
          const account = await requireAccount(container, c.accounts, token);
          const row = await c.imports.findReservation(id);
          const batch = await c.imports.findBatch(reservation.batchId);
          const bundle = await c.references.bundle(reservation.batchId);
          if (
            row?.state !== "uploading" ||
            batch?.cancelledAt ||
            !batch ||
            bundle?.sealed ||
            row.expiresAt <= container.clock.now()
          )
            throw new BusinessRuleError(
              "UPLOAD_CANCELLED",
              "取り込みは取り消されました。",
            );
          await requireScope(
            c,
            selectedScope(account.id, {
              workspaceId: batch.workspaceId ?? undefined,
            }),
            account.id,
            "edit",
          );
          await c.references.insertCompanion({
            id: row.id,
            bundleId: row.batchId,
            accountId: account.id,
            path: row.sourcePath || row.name,
            storageKey: row.storageKey,
            bytes: stored.bytes,
            sha256: stored.sha256,
          });
          await c.imports.updateReservation(id, "uploading", "accepted");
          await sealIfComplete(c, row.batchId);
          return { noteId: null, jobId: null };
        });
        io.wake();
        container.referencing?.wake();
        return result;
      }
      const bytes = await io.storage.read(
        reservation.storageKey,
        reservation.bytes > IMPORT_LIMITS.fileBytes
          ? 64 * 1024
          : IMPORT_LIMITS.fileBytes,
      );
      let format: ImportFormat;
      let detectionFailure: string | null = null;
      try {
        format = await io.detectFormat(bytes, reservation.name);
      } catch (error) {
        const known: Record<string, ImportFormat> = {
          docx: "docx",
          xlsx: "xlsx",
          pptx: "pptx",
          pdf: "pdf",
          html: "html",
          htm: "html",
          md: "markdown",
          txt: "text",
          png: "image",
          jpg: "image",
          jpeg: "image",
          gif: "image",
          webp: "image",
          wav: "audio",
          mp3: "audio",
          m4a: "audio",
          ogg: "audio",
          flac: "audio",
        };
        const hint =
          known[reservation.name.split(".").at(-1)?.toLowerCase() ?? ""];
        const failure = isSerializableError(error)
          ? error.toSerialized()
          : null;
        if (
          !hint ||
          failure?.kind !== "business" ||
          ![
            "IMPORT_CORRUPT",
            "IMPORT_ENCRYPTED",
            "IMPORT_UNSAFE_XML",
            "IMPORT_INVALID_ENCODING",
            "IMPORT_RESOURCE_LIMIT",
          ].includes(failure.code ?? "")
        )
          throw error;
        format = hint;
        detectionFailure = failure.message;
      }
      if (
        reservation.bytes >
        (format === "audio"
          ? IMPORT_LIMITS.audioBytes
          : IMPORT_LIMITS.fileBytes)
      )
        throw new BusinessRuleError(
          "IMPORT_SIZE",
          "この形式は50 MBまでです。音声は200 MBまで取り込めます。",
        );
      result = await container.unitOfWorkProvider.run(async (context) => {
        const { accounts, imports, jobs, collectEvents, references } = context;
        const account = await requireAccount(container, accounts, token);
        const batch = await imports.findBatch(reservation.batchId);
        const row = await imports.findReservation(id);
        const sourceBundle = await references.bundle(reservation.batchId);
        const now = container.clock.now();
        if (
          !batch ||
          batch.cancelledAt ||
          sourceBundle?.sealed ||
          row?.state !== "uploading" ||
          row.expiresAt <= now
        )
          throw new BusinessRuleError(
            "UPLOAD_CANCELLED",
            "取り込みは取り消されました。",
          );
        const jobId = container.idGenerator.next();
        const owner = await requireScope(
          context,
          selectedScope(account.id, {
            workspaceId: batch.workspaceId ?? undefined,
          }),
          account.id,
          "edit",
        );
        const created = createNote(
          {
            id: container.idGenerator.next(),
            accountId: account.id,
            owner,
            title: Array.from(reservation.name).slice(0, 200).join(""),
            html: "",
            text: "",
          },
          now,
        );
        const note = {
          ...created,
          display: detectionFailure
            ? created.display
            : {
                style: "default" as const,
                source: "automatic" as const,
                initialization: { kind: "conversion" as const, jobId },
              },
        };
        await commitNote(container, context, {
          previous: null,
          note,
          actor: { kind: "system", jobId },
          cause: "import",
        });
        const bundle = await references.bundle(batch.id);
        if (bundle)
          await references.saveSettings({
            noteId: note.id,
            enabled: bundle.enabled,
            activeJobId: null,
            bundleId: bundle.id,
            sourcePath: reservation.sourcePath || reservation.name,
          });
        const originalId = container.idGenerator.next();
        await imports.insertOriginal({
          id: originalId,
          noteId: note.id,
          accountId: account.id,
          name: reservation.name,
          bytes: stored.bytes,
          sha256: stored.sha256,
          storageKey: reservation.storageKey,
          format,
          state: detectionFailure ? "failed" : "processing",
          coverage: "no_text",
          activeJobId: jobId,
          createdAt: now,
        });
        if (detectionFailure)
          await imports.replaceNotices(originalId, [
            {
              code: "IMPORT_FAILURE",
              location: "原本",
              message: detectionFailure,
            },
          ]);
        const jobBase = {
          id: jobId,
          batchId: batch.id,
          originalId,
          accountId: account.id,
          noteId: note.id,
          noteVersion: note.version,
          useAi: batch.useAi,
          createdAt: now,
          updatedAt: now,
          attempt: 0,
          retryOf: null,
          leaseToken: null,
          leaseUntil: null,
        };
        await jobs.insert(
          detectionFailure
            ? { ...jobBase, state: "failed", failure: detectionFailure }
            : { ...jobBase, state: "queued", failure: null },
        );
        await imports.updateReservation(id, "uploading", "accepted");
        await sealIfComplete(context, batch.id);
        collectEvents([
          {
            id: EventId.create(container.idGenerator.next()),
            type: "ImportQueued",
            aggregateId: note.id,
            occurredAt: now,
            payload: { jobId },
          },
        ]);
        return { noteId: note.id, jobId };
      });
    } catch (error) {
      const serialized = isSerializableError(error)
        ? error.toSerialized()
        : null;
      const reason =
        serialized?.kind === "business"
          ? serialized.message
          : "アップロードできませんでした。取り込み直してください。";
      await container.unitOfWorkProvider.run(async (context) => {
        const { imports } = context;
        await imports.updateReservation(id, "uploading", "failed", reason);
        await sealIfComplete(context, reservation.batchId);
      });
      await io.storage.remove(reservation.storageKey);
      await container.unitOfWorkProvider.run((c) =>
        c.imports.markStorageCleaned(reservation.storageKey),
      );
      throw error;
    }
    io.wake();
    container.referencing?.wake();
    return result;
  });
}
