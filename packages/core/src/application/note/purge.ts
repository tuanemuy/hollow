import { EventId } from "@repo/core/domain/common/event";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { PurgeIntent } from "@repo/core/domain/purge/entity";
import { isSerializableError } from "@repo/core/lib/error";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError, SystemError, SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { importContext } from "../import/context";
import { requireOwnedPersonalNote } from "./getNote";

export type PurgeView = Readonly<{
  id: string;
  noteId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  state: PurgeIntent["state"];
  completed: number;
  total: number;
  failure: string | null;
}>;
async function begin(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  input: { id: string; operationId: string },
  cause: "manual" | "expired",
  accountId?: string,
) {
  const old = await c.purges.forNote(input.id);
  if (
    old &&
    old.operationId === input.operationId &&
    (!accountId || old.accountId === accountId)
  )
    return { id: old.id };
  const note = await c.notes.findById(input.id);
  if (
    !note ||
    note.owner.kind !== "personal" ||
    (accountId && note.owner.accountId !== accountId)
  )
    throw new NotFoundError("NOTE_NOT_FOUND", "ノートが見つかりません。");
  const now = container.clock.now();
  if (
    note.lifecycle.kind !== "trashed" ||
    note.lifecycle.operationId !== input.operationId ||
    (cause === "expired" && now < note.lifecycle.purgeAfter)
  )
    throw new BusinessRuleError(
      "TRASH_CHANGED",
      "ゴミ箱の状態が変わりました。最新の状態を確認してください。",
    );
  const id = container.idGenerator.next();
  await c.jobs.cancelNote(note.id, now);
  await c.references.cancelNote(note.id, now);
  await c.notes.save(
    {
      ...note,
      lifecycle: { kind: "purging", purgeId: id },
      version: note.version + 1,
    },
    note.version,
  );
  await c.purges.begin({
    id,
    noteId: note.id,
    accountId: note.owner.accountId,
    operationId: input.operationId,
    title: note.title,
    cause,
    state: "queued",
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now,
    leaseToken: null,
    leaseUntil: null,
    completed: 0,
    total: 0,
    failure: null,
  });
  c.collectEvents([
    {
      id: EventId.create(container.idGenerator.next()),
      type: "PurgeQueued",
      aggregateId: note.id,
      occurredAt: now,
      payload: { purgeId: id },
    },
  ]);
  return { id };
}
export async function requestNotePurge(
  container: HollowContainer,
  token: string | null,
  input: { id: string; operationId: string },
) {
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const old = await c.purges.forNote(input.id);
    if (!old)
      requireOwnedPersonalNote(await c.notes.findById(input.id), account.id);
    return begin(container, c, input, "manual", account.id);
  });
  container.purging?.wake();
  return result;
}
export async function retryNotePurge(
  container: HollowContainer,
  token: string | null,
  input: { id: string },
) {
  await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const p = await c.purges.find(input.id);
    if (!p || p.accountId !== account.id)
      throw new NotFoundError("PURGE_NOT_FOUND", "削除処理が見つかりません。");
    if (p.state !== "failed")
      throw new BusinessRuleError(
        "PURGE_ENDED",
        "この処理は再試行できません。最新の状態を確認してください。",
      );
    await c.purges.retry(p.id, container.clock.now());
  });
  container.purging?.wake();
  return input;
}
export async function listNotePurges(
  container: HollowContainer,
  token: string | null,
): Promise<{ items: PurgeView[] }> {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const rows = await c.purges.list(
      account.id,
      new Date(container.clock.now().getTime() - 90 * 86400_000),
    );
    return {
      items: rows.map((p) => ({
        id: p.id,
        noteId: p.noteId,
        title: p.title,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        state: p.state,
        completed: p.completed,
        total: p.total,
        failure: p.failure,
      })),
    };
  });
}
export async function sweepNotePurges(container: HollowContainer) {
  const storage = importContext(container).storage;
  if (!storage.recoverOwners || !storage.removeClaimed)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "完全削除に必要なストレージ所有管理が設定されていません。",
    );
  await storage.recoverOwners();
  const due = await container.unitOfWorkProvider.run((c) =>
    c.purges.due(container.clock.now(), 20),
  );
  for (const item of due) {
    try {
      await container.unitOfWorkProvider.run((c) =>
        begin(container, c, item, "expired"),
      );
    } catch (error) {
      container.logger.error("Expired purge preparation failed", {
        noteId: item.id,
        cause: error,
      });
    }
  }
  await container.unitOfWorkProvider.run((c) =>
    c.purges.prune(new Date(container.clock.now().getTime() - 90 * 86400_000)),
  );
  const now = container.clock.now();
  const token = container.tokens.generate();
  const p = await container.unitOfWorkProvider.run((c) =>
    c.purges.claim(now, token, new Date(now.getTime() + 60_000)),
  );
  if (!p) return;
  try {
    await container.unitOfWorkProvider.run((c) => c.purges.capture(p.id));
    const objects = await container.unitOfWorkProvider.run((c) =>
      c.purges.objects(p.id),
    );
    for (const object of objects) {
      if (
        !(await container.unitOfWorkProvider.run((c) =>
          c.purges.readyToDelete(
            p.id,
            token,
            object.key,
            container.clock.now(),
          ),
        ))
      )
        break;
      const removed = await storage.removeClaimed(object.key);
      if (
        !(await container.unitOfWorkProvider.run((c) =>
          c.purges.completeObject(
            p.id,
            token,
            object.key,
            removed.token,
            container.clock.now(),
          ),
        ))
      )
        break;
    }
    const finished = await container.unitOfWorkProvider.run((c) =>
      c.purges.finish(p.id, token, container.clock.now()),
    );
    if (!finished)
      await container.unitOfWorkProvider.run((c) =>
        c.purges.defer(p.id, token, container.clock.now(), null),
      );
  } catch (error) {
    const e = isSerializableError(error) ? error.toSerialized() : null;
    const message =
      e?.kind === "business"
        ? e.message
        : "ファイルを回収できませんでした。容量は解放していません。再試行できます。";
    await container.unitOfWorkProvider.run((c) =>
      c.purges.defer(p.id, token, container.clock.now(), message),
    );
    container.logger.error("Purge cleanup failed", {
      purgeId: p.id,
      cause: error,
    });
  }
}
