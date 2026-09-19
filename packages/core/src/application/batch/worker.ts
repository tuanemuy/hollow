import { BusinessRuleError } from "../../domain/error";
import { CodedError } from "../../lib/error";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { moveNoteInTransaction, sameMoveScope } from "../move/usecases";
import { trashNoteInTransaction } from "../note/trash";
import { changeNoteTagsInTransaction } from "../tag/usecases";
import { canScope } from "../workspace/access";
import { batchChanged, deriveHolding } from "./holding";
import type { BatchAttempt, BatchHeader } from "./ports";
import { batchProcessing } from "./processing";
import { BATCH_HISTORY_MS } from "./usecases";

const failureMessages: Readonly<Record<string, string>> = {
  BATCH_INTERRUPTED:
    "処理が中断しました。現在の影響を確認して再試行してください。",
  BATCH_CHANGED: "対象や確認条件が変わりました。最新の影響を確認してください。",
  MOVE_CHANGED: "移動条件が変わりました。最新の影響を確認してください。",
  MOVE_QUOTA: "移動先の保存容量上限を超えています。",
  MOVE_CONVERSION_ACTIVE: "変換・再生成処理中のため移動できません。",
  TAG_NOT_FOUND:
    "設定したタグが見つかりません。同名の別タグへは置き換えません。",
  TAG_LIMIT: "ノートのタグは最大50個です。",
  TAG_CHANGED: "タグの条件が変わりました。",
  TRASH_CHANGED: "ノートが更新されました。削除の影響を確認してください。",
  TRASH_PROCESSING: "処理中の取り込みの取消確認が必要です。",
};
function failure(error: unknown) {
  const code =
    error instanceof CodedError && error.code in failureMessages
      ? error.code
      : "BATCH_FAILED";
  return {
    code,
    message:
      failureMessages[code] ??
      "処理を完了できませんでした。現在の結果と影響を確認して再試行してください。",
  };
}
async function activePolicy(
  c: HollowUnitOfWorkContext,
  h: BatchHeader,
  a: BatchAttempt,
) {
  const account = await c.accounts.findById(h.actorId);
  const note = await c.notes.findById(a.noteId);
  return (
    account?.status === "verified" &&
    !!note &&
    note.lifecycle.kind === "active" &&
    (await canScope(c, note.owner, h.actorId, "edit")) &&
    (await canScope(c, h.source, h.actorId, "edit")) &&
    (h.operation.kind !== "move" ||
      (await canScope(c, h.operation.destination, h.actorId, "edit")))
  );
}
async function execute(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  a: BatchAttempt,
  h: BatchHeader,
) {
  const now = container.clock.now();
  const note = await c.notes.findById(a.noteId);
  if (!note || !sameMoveScope(note.owner, h.source) || !a.expected)
    throw batchChanged();
  let holdingSequence: number | null = null;
  if (h.operation.kind === "tag" && a.expected.kind === "tag") {
    const change =
      h.operation.change.kind === "create" && h.binding
        ? { kind: "attach" as const, tagId: h.binding }
        : h.operation.change;
    const result = await changeNoteTagsInTransaction(container, c, h.actorId, {
      noteId: note.id,
      expectedScope:
        h.source.kind === "workspace"
          ? { workspaceId: h.source.workspaceId }
          : {},
      change,
    });
    if (h.operation.change.kind === "create" && !h.binding)
      await c.batches.bindTag(h.id, result.tagId);
  } else if (h.operation.kind === "trash" && a.expected.kind === "trash") {
    const processing = await batchProcessing(container, c, note.id);
    if (
      processing.hasRunningJobs !== a.expected.hasRunningJobs ||
      processing.processingFingerprint !== a.expected.processingFingerprint
    )
      throw batchChanged();
    await trashNoteInTransaction(
      container,
      c,
      h.actorId,
      {
        id: note.id,
        version: a.expected.version,
        cancelProcessing: h.operation.cancelProcessing,
      },
      a.id,
    );
  } else if (h.operation.kind === "move" && a.expected.kind === "move") {
    const receipts = await c.batches.receipts(h.id, a.baseSequence);
    for (const r of receipts) {
      const previous = await c.batches.attempt(r.attemptId);
      if (
        previous?.parentId !== h.id ||
        previous.state !== "succeeded" ||
        previous.result?.holdingSequence !== r.sequence
      )
        throw batchChanged();
    }
    const expected = deriveHolding(
      a.expected.move,
      h,
      a.baseSequence,
      receipts,
    );
    await moveNoteInTransaction(c, h.actorId, expected, now);
    if (expected.bundle) {
      const after = await c.moves.bundleState(
        expected.bundle.id,
        expected.source.owner,
        expected.destination.owner,
      );
      if (!after || h.lastSequence >= 500) throw batchChanged();
      holdingSequence = h.lastSequence + 1;
      await c.batches.recordReceipt({
        parentId: h.id,
        sequence: holdingSequence,
        attemptId: a.id,
        bundleId: expected.bundle.id,
        source: expected.source.owner,
        destination: expected.destination.owner,
        before: expected.bundle,
        after,
        createdAt: now,
      });
    }
  } else throw batchChanged();
  if (
    !a.leaseToken ||
    !(await c.batches.finish(
      a.id,
      a.leaseToken,
      { state: "succeeded", result: { noteId: a.noteId, holdingSequence } },
      now,
    ))
  )
    throw batchChanged();
}
export async function processBatchAttempt(
  container: HollowContainer,
  claimed: BatchAttempt,
) {
  try {
    await container.unitOfWorkProvider.run(async (c) => {
      const a = await c.batches.attempt(claimed.id);
      if (
        !a ||
        a.state !== "running" ||
        !claimed.leaseToken ||
        a.leaseToken !== claimed.leaseToken
      )
        return;
      const h = await c.batches.find(a.parentId);
      if (!h) throw batchChanged();
      if (!a.leaseUntil || a.leaseUntil <= container.clock.now())
        throw new BusinessRuleError(
          "BATCH_INTERRUPTED",
          "処理の期限を過ぎました。",
        );
      if (!(await activePolicy(c, h, a))) {
        await c.batches.finish(
          a.id,
          claimed.leaseToken,
          { state: "cancelled" },
          container.clock.now(),
        );
        return;
      }
      await execute(container, c, a, h);
    });
  } catch (error) {
    await container.unitOfWorkProvider.run(async (c) => {
      if (claimed.leaseToken)
        await c.batches.finish(
          claimed.id,
          claimed.leaseToken,
          { state: "failed", failure: failure(error) },
          container.clock.now(),
        );
    });
  }
}
export async function claimBatchAttempt(
  container: HollowContainer,
  leaseMs: number,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const now = container.clock.now();
    await c.batches.recover(now);
    return c.batches.claim(
      now,
      container.idGenerator.next(),
      new Date(now.getTime() + leaseMs),
    );
  });
}
export async function pruneBatches(container: HollowContainer) {
  return container.unitOfWorkProvider.run((c) =>
    c.batches.prune(
      new Date(container.clock.now().getTime() - BATCH_HISTORY_MS),
      20,
    ),
  );
}
