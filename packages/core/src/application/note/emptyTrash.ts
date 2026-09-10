import { EventId } from "@repo/core/domain/common/event";
import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  EmptyAttempt,
  EmptySummary,
  EmptyTarget,
} from "@repo/core/domain/purge/emptyTrash";
import {
  type ScopeSelection,
  sameScope,
  selectedScope,
} from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { canScope, requireScope } from "../workspace/access";
import { beginNotePurge } from "./purge";

const retention = (c: HollowContainer) =>
  new Date(c.clock.now().getTime() - 90 * 86400_000);
const jobView = (s: EmptySummary, now: Date) => ({
  id: s.header.id,
  createdAt: s.header.createdAt.toISOString(),
  updatedAt: s.header.updatedAt.toISOString(),
  generation: s.header.generation,
  cancelRequested: s.header.cancelRequested,
  state: s.state,
  counts: s.counts,
  historical: s.header.createdAt.getTime() < now.getTime() - 90 * 86400_000,
});
export type EmptyTrashView = ReturnType<typeof jobView>;
const attemptView = (a: EmptyAttempt) => ({
  ...a,
  createdAt: a.createdAt.toISOString(),
  updatedAt: a.updatedAt.toISOString(),
});
const targetView = (t: EmptyTarget) => ({
  ordinal: t.ordinal,
  title: t.title,
  noteId: t.noteId,
  state: t.closedState ?? t.latest?.state ?? "queued",
  waiting:
    !t.closedState &&
    (!t.latest || (!t.latest.purgeId && t.latest.state === "queued")),
  latest: t.latest ? attemptView(t.latest) : null,
});
export type EmptyTrashTargetView = ReturnType<typeof targetView>;
async function owned(
  c: HollowUnitOfWorkContext,
  id: string,
  accountId: string,
) {
  const b = await c.emptyTrash.find(id);
  if (!b || b.accountId !== accountId)
    throw new NotFoundError(
      "EMPTY_NOT_FOUND",
      "一括削除の要求が見つかりません。",
    );
  return b;
}
export async function prepareEmptyTrash(
  container: HollowContainer,
  token: string | null,
  input: ScopeSelection = {},
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await requireScope(c, selectedScope(account.id, input), account.id, "edit");
    const now = container.clock.now();
    const b = await c.emptyTrash.prepare(
      container.idGenerator.next(),
      account.id,
      now,
      new Date(now.getTime() + 15 * 60000),
      input.workspaceId,
    );
    return b
      ? {
          kind: "prepared" as const,
          id: b.id,
          total: b.total,
          expiresAt: b.expiresAt.toISOString(),
        }
      : { kind: "empty" as const };
  });
}
export async function discardEmptyTrash(
  container: HollowContainer,
  token: string | null,
  input: { id: string },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await owned(c, input.id, account.id);
    await c.emptyTrash.discard(input.id, container.clock.now());
    return input;
  });
}
export async function confirmEmptyTrash(
  container: HollowContainer,
  token: string | null,
  input: { id: string },
) {
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const b = await owned(c, input.id, account.id);
    const now = container.clock.now();
    await requireScope(
      c,
      selectedScope(account.id, { workspaceId: b.workspaceId ?? undefined }),
      account.id,
      "edit",
    );
    if (b.phase !== "accepted") {
      if (b.phase !== "prepared" || b.expiresAt <= now)
        throw new BusinessRuleError(
          "EMPTY_EXPIRED",
          "確認の有効期限が切れました。対象を読み直してください。削除は開始していません。",
        );
      await c.emptyTrash.accept(b.id, now);
      c.collectEvents([
        {
          id: EventId.create(container.idGenerator.next()),
          type: "EmptyTrashQueued",
          aggregateId: b.id,
          occurredAt: now,
          payload: { parentId: b.id },
        },
      ]);
    }
    return { id: b.id, total: b.total, asynchronous: b.total > 50 };
  });
  container.purging?.wake();
  return result;
}
export async function cancelEmptyTrash(
  container: HollowContainer,
  token: string | null,
  input: { id: string; generation: number },
) {
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const b = await owned(c, input.id, account.id);
    const s = await c.emptyTrash.summary(b.id);
    if (b.phase !== "accepted" || !s)
      throw new BusinessRuleError(
        "EMPTY_NOT_STARTED",
        "まだ一括削除を開始していません。",
      );
    if (b.generation !== input.generation)
      return jobView(s, container.clock.now());
    if (s.state !== "queued" && s.state !== "running")
      throw new BusinessRuleError(
        "EMPTY_ENDED",
        "この処理は取消できません。最新の結果を確認してください。",
      );
    await c.emptyTrash.cancel(b.id, b.generation, container.clock.now());
    const next = await c.emptyTrash.summary(b.id);
    return next
      ? jobView(next, container.clock.now())
      : jobView(s, container.clock.now());
  });
  container.purging?.wake();
  return result;
}
export async function retryEmptyTrash(
  container: HollowContainer,
  token: string | null,
  input: { id: string; generation: number; ordinal?: number | undefined },
) {
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const b = await owned(c, input.id, account.id);
    await requireScope(
      c,
      selectedScope(account.id, { workspaceId: b.workspaceId ?? undefined }),
      account.id,
      "edit",
    );
    const s = await c.emptyTrash.summary(b.id);
    if (b.phase !== "accepted" || !s)
      throw new BusinessRuleError(
        "EMPTY_NOT_STARTED",
        "一括削除の状態を確認してください。",
      );
    if (b.generation !== input.generation)
      return { job: jobView(s, container.clock.now()), retried: 0 };
    const retried = await c.emptyTrash.retry(
      b.id,
      b.generation,
      input.ordinal,
      container.idGenerator.next(),
      container.clock.now(),
    );
    const next = await c.emptyTrash.summary(b.id);
    return { job: jobView(next ?? s, container.clock.now()), retried };
  });
  container.purging?.wake();
  return result;
}
export async function listEmptyTrash(
  container: HollowContainer,
  token: string | null,
  input: {
    scope?: "unfinished" | "completed" | undefined;
    cursor?: { at: string; id: string } | undefined;
    watch?: readonly string[] | undefined;
  } = {},
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const since = retention(container);
    const rows = await c.emptyTrash.page(
      account.id,
      input.scope ?? "unfinished",
      input.cursor
        ? { at: new Date(input.cursor.at), id: input.cursor.id }
        : undefined,
      since,
      51,
    );
    const items = rows.slice(0, 50);
    const last = items.at(-1);
    const observed: EmptyTrashView[] = [];
    for (const id of new Set(input.watch ?? [])) {
      const s = await c.emptyTrash.read(id, account.id, since);
      if (s) observed.push(jobView(s, container.clock.now()));
    }
    return {
      items: items.map((s) => jobView(s, container.clock.now())),
      nextCursor:
        rows.length > 50 && last
          ? { at: last.header.createdAt.toISOString(), id: last.header.id }
          : null,
      summary: await c.emptyTrash.activity(account.id, since),
      observed,
    };
  });
}
export async function getEmptyTrash(
  container: HollowContainer,
  token: string | null,
  input: { id: string; after?: number | undefined },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const b = await owned(c, input.id, account.id);
    if (b.phase !== "accepted")
      return {
        kind: b.phase as "prepared" | "discarded",
        id: b.id,
        total: b.total,
        expiresAt: b.expiresAt.toISOString(),
      };
    const s = await c.emptyTrash.read(b.id, account.id, retention(container));
    if (!s)
      throw new NotFoundError(
        "EMPTY_NOT_FOUND",
        "一括削除が見つからないか、履歴の保存期間を過ぎています。",
      );
    const rows = await c.emptyTrash.children(
      b.id,
      input.after ?? 0,
      retention(container),
      51,
    );
    const items = rows.slice(0, 50);
    return {
      kind: "job" as const,
      job: jobView(s, container.clock.now()),
      items: items.map(targetView),
      nextCursor: rows.length > 50 ? (items.at(-1)?.ordinal ?? null) : null,
    };
  });
}
export async function listEmptyAttempts(
  container: HollowContainer,
  token: string | null,
  input: {
    id: string;
    ordinal: number;
    cursor?: { at: string; id: string } | undefined;
  },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const s = await c.emptyTrash.read(
      input.id,
      account.id,
      retention(container),
    );
    if (!s)
      throw new NotFoundError("EMPTY_NOT_FOUND", "一括削除が見つかりません。");
    const rows = await c.emptyTrash.attempts(
      input.id,
      input.ordinal,
      input.cursor
        ? { at: new Date(input.cursor.at), id: input.cursor.id }
        : undefined,
      retention(container),
      51,
    );
    const items = rows.slice(0, 50);
    const last = items.at(-1);
    return {
      items: items.map(attemptView),
      nextCursor:
        rows.length > 50 && last
          ? { at: last.createdAt.toISOString(), id: last.id }
          : null,
    };
  });
}
export async function admitEmptyTarget(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  input: {
    parentId: string;
    ordinal: number;
    generation: number;
    attemptId: string | null;
  },
) {
  const b = await c.emptyTrash.find(input.parentId);
  const t = await c.emptyTrash.target(input.parentId, input.ordinal);
  if (
    !b ||
    b.phase !== "accepted" ||
    b.generation !== input.generation ||
    !t ||
    t.closedState ||
    t.latest?.purgeId ||
    (t.latest?.id ?? null) !== input.attemptId
  )
    return false;
  const now = container.clock.now();
  const account = await c.accounts.findById(b.accountId);
  const note = t.noteId ? await c.notes.findById(t.noteId) : null;
  const old = t.noteId ? await c.purges.forNote(t.noteId) : null;
  const sameOld =
    old && old.accountId === b.accountId && old.operationId === t.operationId;
  const current =
    note &&
    sameScope(
      note.owner,
      selectedScope(b.accountId, { workspaceId: b.workspaceId ?? undefined }),
    ) &&
    (await canScope(c, note.owner, b.accountId, "edit")) &&
    ((note.lifecycle.kind === "trashed" &&
      note.lifecycle.operationId === t.operationId) ||
      (note.lifecycle.kind === "purging" &&
        sameOld &&
        note.lifecycle.purgeId === old.id));
  const a: EmptyAttempt = {
    id: t.latest?.id ?? container.idGenerator.next(),
    parentId: b.id,
    ordinal: t.ordinal,
    retryOf: t.latest?.retryOf ?? null,
    purgeId: null,
    state: "queued",
    failure: null,
    recoveries: 0,
    recoveryBase: 0,
    createdAt: t.latest?.createdAt ?? now,
    updatedAt: now,
  };
  if (
    b.cancelRequested ||
    account?.status !== "verified" ||
    (!current && !(note === null && sameOld && old.state === "succeeded")) ||
    !t.noteId ||
    !t.operationId
  ) {
    await c.emptyTrash.saveAttempt({ ...a, state: "cancelled" });
    return true;
  }
  const p = await beginNotePurge(
    container,
    c,
    { id: t.noteId, operationId: t.operationId },
    "manual",
    b.accountId,
  );
  const intent = await c.purges.find(p.id);
  if (!intent)
    throw new NotFoundError("PURGE_NOT_FOUND", "回収処理が見つかりません。");
  const bound = {
    ...a,
    purgeId: p.id,
    recoveryBase: intent.recoveries,
    recoveries: 0,
  };
  await c.emptyTrash.saveAttempt(
    intent.state === "failed"
      ? { ...bound, state: "failed", failure: intent.failure }
      : { ...bound, state: intent.state, failure: null },
  );
  return true;
}
export async function sweepEmptyTrash(container: HollowContainer) {
  const pending = await container.unitOfWorkProvider.run((c) =>
    c.emptyTrash.pending(20),
  );
  for (const target of pending) {
    try {
      await container.unitOfWorkProvider.run((c) =>
        admitEmptyTarget(container, c, target),
      );
    } catch (error) {
      container.logger.error("Empty trash admission failed", {
        parentId: target.parentId,
        cause: error,
      });
      await container.unitOfWorkProvider.run(async (c) => {
        const b = await c.emptyTrash.find(target.parentId);
        const t = await c.emptyTrash.target(target.parentId, target.ordinal);
        if (
          !b ||
          b.phase !== "accepted" ||
          b.generation !== target.generation ||
          !t ||
          t.closedState ||
          t.latest?.purgeId ||
          (t.latest?.id ?? null) !== target.attemptId
        )
          return;
        const now = container.clock.now();
        await c.emptyTrash.saveAttempt({
          id: t.latest?.id ?? container.idGenerator.next(),
          parentId: b.id,
          ordinal: t.ordinal,
          retryOf: t.latest?.retryOf ?? null,
          purgeId: null,
          state: "failed",
          failure: "削除の受付を完了できませんでした。再試行してください。",
          recoveryBase: 0,
          recoveries: 0,
          createdAt: t.latest?.createdAt ?? now,
          updatedAt: now,
        });
      });
    }
  }
  await container.unitOfWorkProvider.run(async (c) => {
    await c.emptyTrash.reconcile(50);
    await c.emptyTrash.prune(retention(container), container.clock.now(), 50);
  });
}
