import { BusinessRuleError } from "@repo/core/domain/error";
import {
  restoreLifecycle,
  trashLifecycle,
} from "@repo/core/domain/note/lifecycle";
import {
  type ScopeSelection,
  selectedScope,
} from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import {
  requireNote,
  requireScope,
  scopeUsage,
  scopeView,
} from "../workspace/access";

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
    (await c.references.activeForNote(id)).length > 0 ||
    (await c.pdfComputations.active(id)) !== null
  );
}
export async function getTrashIntent(
  container: HollowContainer,
  token: string | null,
  id: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const note = await requireNote(
      c,
      await c.notes.findById(id),
      account.id,
      "edit",
    );
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
    return trashNoteInTransaction(container, c, account.id, input);
  });
}
export async function trashNoteInTransaction(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  accountId: string,
  input: Readonly<{ id: string; version: number; cancelProcessing: boolean }>,
  batchAttemptId?: string,
) {
  const note = await requireNote(
    c,
    await c.notes.findById(input.id),
    accountId,
    "edit",
  );
  if (note.version !== input.version)
    throw new ConflictError(
      "TRASH_CHANGED",
      "ノートが更新されました。削除をもう一度確認してください。",
    );
  if ((await hasProcessing(c, note.id)) && !input.cancelProcessing)
    throw new BusinessRuleError(
      "TRASH_PROCESSING",
      "処理中のジョブを取り消します。削除をもう一度確認してください。",
    );
  const now = container.clock.now();
  const lifecycle = trashLifecycle(now, container.idGenerator.next());
  await c.batches.cancelNote(note.id, now, batchAttemptId);
  await c.pdfRequests.cancelNote(note.id, now);
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
}
export async function restoreNote(
  container: HollowContainer,
  token: string | null,
  input: Readonly<{ id: string; operationId: string }>,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const note = await requireNote(
      c,
      await c.notes.findById(input.id),
      account.id,
      "edit",
      true,
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
export type TrashCursor = Readonly<{
  at: Date;
  id: string;
  workspaceId?: string | null;
}>;
export async function listTrash(
  container: HollowContainer,
  token: string | null,
  before?: TrashCursor,
  input: ScopeSelection = {},
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const now = container.clock.now();
    const scope = await requireScope(
      c,
      selectedScope(account.id, input),
      account.id,
      "edit",
    );
    if (before && (before.workspaceId ?? null) !== (input.workspaceId ?? null))
      throw new BusinessRuleError(
        "SCOPE_CURSOR",
        "スペースが変わりました。最初のページから開いてください。",
      );
    const rows = await c.notes.listTrashed(scope, before, 51);
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
      scope: await scopeView(c, scope, account.id),
      usage: await scopeUsage(c, scope, now),
      nextCursor:
        rows.length > 50 && last
          ? JSON.stringify({
              at: last.trashedAt,
              id: last.id,
              workspaceId: input.workspaceId ?? null,
            })
          : null,
    };
  });
}
