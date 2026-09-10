import { BusinessRuleError } from "@repo/core/domain/error";
import {
  restoreLifecycle,
  trashLifecycle,
} from "@repo/core/domain/note/lifecycle";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requireOwnedPersonalNote, requirePersonalNote } from "./getNote";

export type TrashNoteView = Readonly<{
  id: string;
  title: string;
  trashedAt: string;
  purgeAfter: string;
  operationId: string;
  remainingDays: number;
  canRestore: boolean;
}>;
async function hasProcessing(c: HollowUnitOfWorkContext, id: string) {
  return (
    (await c.jobs.activeForNote(id)).length > 0 ||
    (await c.references.activeForNote(id)).length > 0
  );
}
export async function getTrashIntent(
  container: HollowContainer,
  token: string | null,
  id: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const note = requirePersonalNote(await c.notes.findById(id), account.id);
    return {
      id,
      title: note.title,
      version: note.version,
      hasRunningJobs: await hasProcessing(c, id),
    };
  });
}
export async function trashNote(
  container: HollowContainer,
  token: string | null,
  input: Readonly<{ id: string; version: number; cancelProcessing: boolean }>,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const note = requirePersonalNote(
      await c.notes.findById(input.id),
      account.id,
    );
    if (note.version !== input.version)
      throw new ConflictError(
        "TRASH_CHANGED",
        "ノートが更新されました。削除をもう一度確認してください。",
      );
    if ((await hasProcessing(c, note.id)) && !input.cancelProcessing)
      throw new BusinessRuleError(
        "TRASH_PROCESSING",
        "処理中の取り込みを取り消します。削除をもう一度確認してください。",
      );
    const now = container.clock.now();
    const lifecycle = trashLifecycle(now, container.idGenerator.next());
    for (const job of await c.jobs.cancelNote(note.id, now)) {
      const original = await c.imports.findOriginal(job.originalId);
      if (original?.activeJobId === job.id)
        await c.imports.saveOriginal({ ...original, state: "cancelled" });
    }
    await c.references.cancelNote(note.id, now);
    const settings = await c.references.settings(note.id);
    if (settings?.activeJobId)
      await c.references.saveSettings({ ...settings, activeJobId: null });
    await c.notes.save(
      {
        ...note,
        lifecycle,
        version: note.version + 1,
        display:
          note.display.initialization.kind === "complete"
            ? note.display
            : {
                ...note.display,
                initialization: { kind: "complete", reason: "interrupted" },
              },
      },
      note.version,
    );
    return {
      id: note.id,
      operationId: lifecycle.operationId,
      purgeAfter: lifecycle.purgeAfter.toISOString(),
    };
  });
}
export async function restoreNote(
  container: HollowContainer,
  token: string | null,
  input: Readonly<{ id: string; operationId: string }>,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const note = requireOwnedPersonalNote(
      await c.notes.findById(input.id),
      account.id,
    );
    const lifecycle = restoreLifecycle(
      note.lifecycle,
      input.operationId,
      container.clock.now(),
    );
    await c.notes.save(
      { ...note, lifecycle, version: note.version + 1 },
      note.version,
    );
    return { id: note.id };
  });
}
export type TrashCursor = Readonly<{ at: Date; id: string }>;
export async function listTrash(
  container: HollowContainer,
  token: string | null,
  before?: TrashCursor,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const now = container.clock.now();
    const rows = await c.notes.listTrashed(account.id, before, 51);
    const items: TrashNoteView[] = rows.slice(0, 50).flatMap((note) => {
      const state = note.lifecycle;
      return state.kind === "trashed"
        ? [
            {
              id: note.id,
              title: note.title,
              trashedAt: state.trashedAt.toISOString(),
              purgeAfter: state.purgeAfter.toISOString(),
              operationId: state.operationId,
              remainingDays: Math.max(
                0,
                Math.ceil(
                  (state.purgeAfter.getTime() - now.getTime()) / 86400_000,
                ),
              ),
              canRestore: now < state.purgeAfter,
            },
          ]
        : [];
    });
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        rows.length > 50 && last
          ? JSON.stringify({ at: last.trashedAt, id: last.id })
          : null,
    };
  });
}
