import { BusinessRuleError } from "@repo/core/domain/error";
import { editNote } from "@repo/core/domain/note/entity";
import { machineHeld } from "@repo/core/domain/regeneration/machine";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { scheduleReferences } from "../reference/schedule";
import { requireNote } from "../workspace/access";
import {
  authorizeUndoResources,
  commitRegeneratedBody,
  prepareUndoBody,
} from "./body";
import { completeMachine } from "./completion";
import { requestMachineRegeneration } from "./request";
import { sourceStateInvalid } from "./services";
export async function cancelQueuedMachine(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  id: string,
) {
  const value = await u.machineRegenerations.find(id);
  if (!value || value.phase === "terminal") return false;
  if (value.owner.state === "none") {
    await completeMachine(
      c,
      u,
      { ...value, cancelGeneration: value.cancelGeneration + 1 },
      "cancelled",
      null,
    );
  } else if (
    value.cancelGeneration === 0 &&
    !(await u.machineRegenerations.replace(
      {
        ...value,
        cancelGeneration: 1,
        version: value.version + 1,
        updatedAt: c.clock.now(),
      },
      value.version,
    ))
  )
    return sourceStateInvalid();
  return true;
}
export async function cancelMachineRegeneration(
  c: HollowContainer,
  token: string | null,
  id: string,
) {
  await c.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(c, u.accounts, token);
    const value = await u.machineRegenerations.find(id);
    if (!value || value.executorId !== account.id)
      throw new NotFoundError("JOB_NOT_FOUND", "処理が見つかりません。");
    await requireNote(
      u,
      await u.notes.findById(value.noteId),
      account.id,
      "edit",
    );
    await cancelQueuedMachine(c, u, id);
  });
  c.machine?.execution.cancel(id);
  c.machine?.wake();
  return { ok: true };
}
export async function retryMachineJob(
  c: HollowContainer,
  token: string | null,
  id: string,
) {
  const value = await c.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(c, u.accounts, token);
    const value = await u.machineRegenerations.find(id);
    if (!value) return null;
    if (value.executorId !== account.id)
      throw new NotFoundError("JOB_NOT_FOUND", "処理が見つかりません。");
    await requireNote(
      u,
      await u.notes.findById(value.noteId),
      account.id,
      "edit",
    );
    if (machineHeld(value) || !["failed", "cancelled"].includes(value.outcome))
      throw new BusinessRuleError(
        "REGENERATION_NOT_RETRYABLE",
        "終了を確認できた失敗または取消だけ再試行できます。",
      );
    if (value.access.origin === "drive-record")
      throw new BusinessRuleError(
        "REGENERATION_RECONFIRM_SOURCE",
        "取得元を選び直し、置き換えを確認してから開始してください。",
      );
    return value;
  });
  return value
    ? requestMachineRegeneration(c, token, {
        noteId: value.noteId,
        commandId: c.idGenerator.next(),
      })
    : null;
}
export async function undoMachineBody(
  c: HollowContainer,
  token: string | null,
  id: string,
) {
  const snapshot = await c.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(c, u.accounts, token);
    const value = await u.machineRegenerations.find(id);
    if (
      !value ||
      value.executorId !== account.id ||
      value.outcome !== "succeeded" ||
      machineHeld(value)
    )
      throw new NotFoundError(
        "REGENERATION_NOT_FOUND",
        "再生成の履歴が見つかりません。",
      );
    const note = await requireNote(
      u,
      await u.notes.findById(value.noteId),
      account.id,
      "edit",
    );
    const revision = await u.revisions.find(note.id, value.originalRevisionNo);
    if (
      !revision ||
      note.version !== value.resultVersion ||
      (await u.jobs.activeForNote(note.id)).length ||
      (await u.machineRegenerations.activeForNote(note.id)) ||
      (await u.llmConversions.activeForNote(note.id))
    )
      throw new BusinessRuleError(
        "REGENERATION_UNDO_CHANGED",
        "本文が更新されたため戻せません。履歴から内容を確認してください。",
      );
    return { value, note, revision, account };
  });
  const prepared = await prepareUndoBody(c, snapshot.note, snapshot.revision);
  return c.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(c, u.accounts, token);
    const note = await requireNote(
      u,
      await u.notes.findById(snapshot.note.id),
      account.id,
      "edit",
    );
    const value = await u.machineRegenerations.find(id);
    const revision = await u.revisions.find(
      note.id,
      snapshot.revision.revisionNo,
    );
    if (
      account.id !== snapshot.account.id ||
      !value ||
      value.version !== snapshot.value.version ||
      note.version !== snapshot.note.version ||
      !revision ||
      revision.html !== snapshot.revision.html ||
      (await u.jobs.activeForNote(note.id)).length ||
      (await u.machineRegenerations.activeForNote(note.id)) ||
      (await u.llmConversions.activeForNote(note.id))
    )
      return sourceStateInvalid();
    await authorizeUndoResources(
      c,
      u,
      account.id,
      revision,
      prepared.snapshot.html,
    );
    const updated = editNote(
      note,
      note.title,
      prepared.snapshot.html,
      c.clock.now(),
    );
    await commitRegeneratedBody(c, u, {
      previous: note,
      note: updated,
      actor: { kind: "user", accountId: account.id },
      cause: "restore",
      restoredFrom: revision.revisionNo,
      projection: prepared.body.projection,
      afterCurrent: async () => {
        if (prepared.body.document)
          await scheduleReferences(
            c,
            u,
            updated,
            account.id,
            prepared.body.document,
            undefined,
            null,
            prepared.body.inspections,
            prepared.snapshot.resources,
          );
      },
    });
    return { noteId: note.id, version: updated.version };
  });
}
