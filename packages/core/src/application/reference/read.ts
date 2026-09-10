import { interruptDisplay } from "@repo/core/domain/note/displayStyle";
import { editNote } from "@repo/core/domain/note/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import { commitNote } from "../note/commitNote";
import { requirePersonalNote } from "../note/getNote";
import { inspectDependencies } from "./dependencies";
import { scheduleReferences } from "./schedule";
export async function readReferences(
  container: HollowContainer,
  token: string | null,
  noteId: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    requirePersonalNote(await c.notes.findById(noteId), account.id);
    const settings = await c.references.settings(noteId);
    const entries = await c.references.entries(noteId);
    const job = settings?.activeJobId
      ? await c.references.job(settings.activeJobId)
      : null;
    return {
      enabled: settings?.enabled ?? true,
      entries: entries.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      job: job
        ? {
            id: job.id,
            state: job.state,
            total: job.total,
            completed: job.completed,
            cancelRequested: job.cancelRequested,
            failure: job.failure,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
          }
        : null,
    };
  });
}
export async function listReferenceJobs(
  container: HollowContainer,
  token: string | null,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    return Promise.all(
      (
        await c.references.listJobs(
          account.id,
          new Date(container.clock.now().getTime() - 90 * 86400_000),
        )
      ).map(async (j) => {
        const target = await c.notes.findById(j.noteId);
        return {
          id: j.id,
          noteId: j.noteId,
          targetAvailable:
            target?.lifecycle.kind === "active" &&
            target.owner.kind === "personal" &&
            target.owner.accountId === account.id,
          state: j.state,
          total: j.total,
          completed: j.completed,
          cancelRequested: j.cancelRequested,
          failure: j.failure,
          createdAt: j.createdAt.toISOString(),
        };
      }),
    );
  });
}
export async function controlReference(
  container: HollowContainer,
  token: string | null,
  input: { noteId: string; action: "on" | "off" | "retry" | "cancel" },
) {
  const snapshot = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    return requirePersonalNote(
      await c.notes.findById(input.noteId),
      account.id,
    );
  });
  const prepared = container.referencing?.processor.prepare(snapshot.html);
  const inspections =
    prepared && input.action !== "cancel"
      ? await inspectDependencies(container, prepared)
      : new Map<string, string>();
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    let note = requirePersonalNote(
      await c.notes.findById(input.noteId),
      account.id,
    );
    if (note.version !== snapshot.version)
      throw new NotFoundError(
        "REFERENCE_CHANGED",
        "本文が更新されました。再読み込みしてください。",
      );
    const settings = await c.references.settings(note.id);
    if (input.action === "cancel") {
      if (settings?.activeJobId) {
        const job = await c.references.job(settings.activeJobId);
        await c.references.cancel(settings.activeJobId, container.clock.now());
        if (
          job?.state === "queued" &&
          note.display.initialization.kind === "reference" &&
          note.display.initialization.jobId === job.id
        ) {
          const display = interruptDisplay(note.display);
          const updated =
            display.style !== note.display.style
              ? editNote(
                  { ...note, display },
                  note.title,
                  note.html,
                  container.clock.now(),
                )
              : { ...note, display };
          await commitNote(container, c, {
            previous: note,
            note: updated,
            actor: { kind: "system", jobId: job.id },
            cause: "style",
          });
        }
        if (job?.state === "queued")
          for (const entry of await c.references.entries(note.id))
            if (entry.current && entry.state === "unattempted")
              await c.references.saveEntry({
                ...entry,
                state: "cancelled",
                reason: "開始前に取り消しました。再試行できます。",
                updatedAt: container.clock.now(),
              });
      }
      return;
    }
    const current = settings?.activeJobId
      ? await c.references.job(settings.activeJobId)
      : null;
    if (input.action === "retry" && current) {
      const existing = await c.references.retry(current.id);
      if (existing) return existing.id;
    }
    if (prepared) {
      if (note.display.initialization.kind === "reference") {
        const display = interruptDisplay(note.display);
        const updated =
          display.style !== note.display.style
            ? editNote(
                { ...note, display },
                note.title,
                note.html,
                container.clock.now(),
              )
            : { ...note, display };
        await commitNote(container, c, {
          previous: note,
          note: updated,
          actor: { kind: "system" },
          cause: "style",
        });
        note = updated;
      }
      return (
        await scheduleReferences(
          container,
          c,
          note,
          prepared,
          input.action !== "off",
          input.action === "retry" ? (current?.id ?? null) : null,
          inspections,
        )
      )?.id;
    }
    return undefined;
  });
  container.referencing?.wake();
  return result;
}
