import { BusinessRuleError } from "@repo/core/domain/error";
import { llmMonth } from "@repo/core/domain/llm/entity";
import { editNote } from "@repo/core/domain/note/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { commitRegeneratedBody as commitNote } from "../regeneration/body";
import { requireNote } from "../workspace/access";

export async function cancelQueuedLlm(
  u: HollowUnitOfWorkContext,
  jobId: string,
  now: Date,
): Promise<boolean> {
  const value = await u.llmConversions.find(jobId);
  if (!value || value.phase !== "queued" || value.owner.state !== "idle")
    return false;
  if (
    !(await u.llmConversions.replace(
      {
        ...value,
        phase: "terminal",
        outcome: { kind: "cancelled" },
        cancelGeneration: value.cancelGeneration + 1,
        updatedAt: now,
        version: value.version + 1,
      },
      value.version,
    ))
  )
    throw new ConflictError("LLM_JOB_CHANGED", "処理が更新されました。");
  await u.llmQuota.releaseUnsent(jobId, now);
  const original = await u.imports.findOriginal(value.source.originalId);
  if (original?.activeJobId === jobId)
    await u.imports.saveOriginal({
      ...original,
      state: value.operation === "regenerate" ? value.sourceState : "cancelled",
      coverage: value.sourceCoverage,
    });
  return true;
}
export async function cancelLlmRegeneration(
  container: HollowContainer,
  token: string | null,
  jobId: string,
) {
  await container.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(container, u.accounts, token);
    const value = await u.llmConversions.find(jobId);
    if (
      !value ||
      value.accountId !== account.id ||
      value.operation !== "regenerate"
    )
      throw new NotFoundError("JOB_NOT_FOUND", "処理が見つかりません。");
    if (value.phase === "terminal" || value.cancelGeneration) return;
    if (await cancelQueuedLlm(u, jobId, container.clock.now())) return;
    if (
      !(await u.llmConversions.replace(
        {
          ...value,
          cancelGeneration: value.cancelGeneration + 1,
          updatedAt: container.clock.now(),
          version: value.version + 1,
        },
        value.version,
      ))
    )
      throw new ConflictError("LLM_JOB_CHANGED", "処理が更新されました。");
  });
  container.llm?.execution.cancel(jobId);
  container.llm?.wake();
  return { ok: true };
}
export async function llmUsage(
  container: HollowContainer,
  token: string | null,
) {
  return container.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(container, u.accounts, token);
    const now = container.clock.now();
    const month = llmMonth(now);
    const usage = await u.llmQuota.usage(account.id, month);
    const limit = container.llm?.monthlyLimit ?? 30;
    const reserved = usage?.reserved ?? 0;
    const consumed = usage?.consumed ?? 0;
    const reset = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    return {
      month,
      reserved,
      consumed,
      limit,
      remaining: Math.max(0, limit - reserved - consumed),
      updatedAt: now.toISOString(),
      warning: consumed > limit * 0.8,
      resetsAt: reset.toISOString(),
    };
  });
}
export async function undoLlmBody(
  container: HollowContainer,
  token: string | null,
  jobId: string,
) {
  async function read(u: HollowUnitOfWorkContext) {
    const account = await requireAccount(container, u.accounts, token);
    const value = await u.llmConversions.find(jobId);
    if (
      !value ||
      value.accountId !== account.id ||
      value.operation !== "regenerate" ||
      value.outcome.kind !== "succeeded" ||
      value.originalRevisionNo === null
    )
      throw new NotFoundError(
        "LLM_UNDO_UNAVAILABLE",
        "取り消せる再生成がありません。",
      );
    const note = await requireNote(
      u,
      await u.notes.findById(value.noteId),
      account.id,
      "edit",
    );
    if (
      note.version !== value.outcome.noteVersion ||
      (await u.llmConversions.activeForNote(note.id))
    )
      throw new ConflictError(
        "LLM_UNDO_CHANGED",
        "再生成後に本文または処理が更新されました。履歴から確認してください。",
      );
    const revision = await u.revisions.find(note.id, value.originalRevisionNo);
    if (!revision)
      throw new BusinessRuleError(
        "LLM_UNDO_UNAVAILABLE",
        "元の本文の保持期限が終了しています。",
      );
    return { value, note, revision, account };
  }
  const source = await container.unitOfWorkProvider.run(read);
  const proposed = editNote(
    source.note,
    source.note.title,
    source.revision.html,
    container.clock.now(),
  );
  const projection = await container.browsing?.projection.project({
    title: proposed.title,
    html: proposed.html,
  });
  await container.unitOfWorkProvider.run(async (u) => {
    const current = await read(u);
    if (
      current.note.version !== source.note.version ||
      current.revision.html !== source.revision.html
    )
      throw new ConflictError(
        "LLM_UNDO_CHANGED",
        "取り消し対象が更新されました。",
      );
    await commitNote(container, u, {
      previous: current.note,
      note: proposed,
      projection,
      actor: { kind: "user", accountId: current.account.id },
      cause: "restore",
      restoredFrom: current.revision.revisionNo,
    });
  });
  return { noteId: proposed.id, version: proposed.version };
}
