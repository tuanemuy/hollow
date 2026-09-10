import { EventId } from "@repo/core/domain/common/event";
import { BusinessRuleError } from "@repo/core/domain/error";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import { commitNote } from "../note/commitNote";
import { requirePersonalNote } from "../note/getNote";
import { importContext } from "./context";

export async function cancelImport(
  container: HollowContainer,
  token: string | null,
  batchId: string,
) {
  await container.unitOfWorkProvider.run(async (context) => {
    const { accounts, imports, jobs, references, notes } = context;
    const account = await requireAccount(container, accounts, token);
    const batch = await imports.findBatch(batchId);
    if (!batch || batch.accountId !== account.id)
      throw new NotFoundError("IMPORT_NOT_FOUND", "取り込みが見つかりません。");
    const now = container.clock.now();
    await imports.cancelBatch(batchId, now);
    await references.sealBundle(batchId);
    for (const row of await imports.listReservations(batchId))
      if (row.state === "awaiting" || row.state === "uploading")
        await imports.updateReservation(row.id, row.state, "cancelled");
    for (const job of await jobs.cancelQueued(batchId, now)) {
      const note = await notes.findById(job.noteId);
      if (
        note?.owner.kind === "personal" &&
        note.lifecycle.kind === "active" &&
        note.owner.accountId === account.id
      )
        await commitNote(container, context, {
          previous: note,
          note: {
            ...note,
            display: completeDisplay(note.display, "conversion", job.id, false),
          },
          actor: { kind: "system", jobId: job.id },
          cause: "import",
        });
      const original = await imports.findOriginal(job.originalId);
      if (original && original.activeJobId === job.id)
        await imports.saveOriginal({ ...original, state: "cancelled" });
    }
  });
  return { ok: true };
}

export async function retryImport(
  container: HollowContainer,
  token: string | null,
  jobId: string,
) {
  return restartImport(container, token, { kind: "retry", jobId });
}

export async function reimportNote(
  container: HollowContainer,
  token: string | null,
  noteId: string,
) {
  return restartImport(container, token, { kind: "reimport", noteId });
}

async function restartImport(
  container: HollowContainer,
  token: string | null,
  input:
    | { kind: "retry"; jobId: string }
    | { kind: "reimport"; noteId: string },
) {
  const result = await container.unitOfWorkProvider.run(
    async ({ accounts, imports, jobs, notes, revisions, collectEvents }) => {
      const account = await requireAccount(container, accounts, token);
      const source =
        input.kind === "reimport"
          ? await imports.findByNote(input.noteId)
          : null;
      const old = await jobs.find(
        input.kind === "retry" ? input.jobId : (source?.activeJobId ?? ""),
      );
      if (!old || old.accountId !== account.id)
        throw new NotFoundError("JOB_NOT_FOUND", "ジョブが見つかりません。");
      const note = requirePersonalNote(
        await notes.findById(old.noteId),
        account.id,
      );
      if (
        input.kind === "reimport" &&
        old.retryOf &&
        (old.state === "queued" || old.state === "running")
      ) {
        const previous = await jobs.find(old.retryOf);
        if (
          previous?.state === "cancelled" &&
          previous.noteId === note.id &&
          previous.accountId === account.id
        )
          return { jobId: old.id, noteId: note.id };
      }
      if (old.state !== (input.kind === "retry" ? "failed" : "cancelled"))
        throw new BusinessRuleError(
          "JOB_NOT_RETRYABLE",
          "このジョブは再試行できません。要AI連携の場合は連携後に作り直してください。",
        );
      const original = await imports.findOriginal(old.originalId);
      const existing = await jobs.findRetry(old.id);
      if (existing && original?.activeJobId === existing.id)
        return { jobId: existing.id, noteId: existing.noteId };
      if (
        !original ||
        !note ||
        note.owner.kind !== "personal" ||
        note.owner.accountId !== account.id ||
        original.activeJobId !== old.id
      )
        throw new NotFoundError("IMPORT_NOT_FOUND", "対象が見つかりません。");
      const now = container.clock.now();
      const id = container.idGenerator.next();
      const head = await revisions.head(note.id);
      const revision = head
        ? await revisions.find(note.id, head.currentNo)
        : null;
      if (
        (revision
          ? revision.capturedNoteVersion > old.noteVersion
          : note.version !== old.noteVersion) ||
        original.state === "ready"
      )
        throw new BusinessRuleError(
          "IMPORT_EDITED",
          "取り込み後に本文が編集されています。再試行では上書きできません。原本を新しいノートとして取り込んでください。",
        );
      await jobs.insert({
        ...old,
        id,
        noteVersion: note.version,
        createdAt: now,
        updatedAt: now,
        attempt: 0,
        retryOf: old.id,
        state: "queued",
        leaseToken: null,
        leaseUntil: null,
        failure: null,
      });
      await imports.saveOriginal({
        ...original,
        activeJobId: id,
        state: "processing",
      });
      collectEvents([
        {
          id: EventId.create(container.idGenerator.next()),
          type: "ImportQueued",
          aggregateId: note.id,
          occurredAt: now,
          payload: { jobId: id },
        },
      ]);
      return { jobId: id, noteId: note.id };
    },
  );
  importContext(container).wake();
  return result;
}
