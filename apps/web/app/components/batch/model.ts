import type {
  BatchAcceptInput,
  BatchConfirmation,
  BatchPreviewItem,
  BatchView,
} from "@repo/core/application/batch/ports";
import type {
  BrowseConditions,
  BrowsePage,
} from "@repo/core/application/browse/ports";
import type { BatchOperation } from "@repo/core/domain/batch/entity";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { moveExpectedInput } from "@/components/move/model";
import { extractSerializedError } from "@/presentation/errorResponse";

export type BatchContext = Readonly<{
  actorId: string;
  actorEpoch: number;
  contextKey: string;
  contextEpoch: number;
}>;
export function sameBatchContext(a: BatchContext, b: BatchContext | null) {
  return (
    b !== null &&
    a.actorId === b.actorId &&
    a.actorEpoch === b.actorEpoch &&
    a.contextKey === b.contextKey &&
    a.contextEpoch === b.contextEpoch
  );
}

export function activeBatchWatches(items: readonly BatchView[]) {
  return [
    ...new Map(
      items
        .filter((item) => item.counts.queued + item.counts.running > 0)
        .map((item) => [item.id, item]),
    ).values(),
  ].slice(0, 50);
}
export function batchWatchIds(
  requested: readonly string[],
  watched: readonly BatchView[],
  notified: ReadonlyMap<string, string>,
) {
  return [
    ...new Set([
      ...requested.filter((id) => !notified.has(id)),
      ...watched.map((item) => item.id),
    ]),
  ].slice(0, 50);
}

export type Selection = {
  enabled: boolean;
  ids: readonly string[];
  origin: "visible" | "whole" | "subset";
  wholeIdentity?: string;
};
export const emptySelection = (): Selection => ({
  enabled: false,
  ids: [],
  origin: "visible",
});
export function acceptsSelectionTicket(
  current: { key: string; epoch: number; mounted: boolean },
  incoming: { key: string; epoch: number },
) {
  return (
    current.mounted &&
    current.key === incoming.key &&
    current.epoch === incoming.epoch
  );
}
export function ownsBatchAdmission(
  current: { userId: string | null; actorEpoch: number; mounted: boolean },
  request: { actorId: string; actorEpoch: number } | null,
) {
  return (
    current.mounted &&
    request !== null &&
    current.userId === request.actorId &&
    current.actorEpoch === request.actorEpoch
  );
}
export function selectionFilterKey(
  value: {
    workspaceId?: string | undefined;
    query: string;
    tags: readonly string[];
    month?: string | undefined;
    zone?: string | undefined;
  },
  userId: string | null,
) {
  return JSON.stringify([
    userId,
    value.workspaceId ?? null,
    value.query.trim(),
    [...value.tags].sort(),
    value.month ?? null,
    value.zone ?? null,
  ]);
}
export function selectVisible(
  selection: Selection,
  ids: readonly string[],
): Selection | null {
  const union = [...new Set([...selection.ids, ...ids])];
  if (union.length > 500) return null;
  return {
    enabled: true,
    ids: union,
    origin:
      selection.origin === "whole" && union.length === selection.ids.length
        ? "whole"
        : selection.origin === "subset"
          ? "subset"
          : "visible",
  };
}
export function toggleSelected(
  selection: Selection,
  id: string,
): Selection | null {
  if (selection.ids.includes(id))
    return {
      ...selection,
      ids: selection.ids.filter((value) => value !== id),
      origin: "subset",
    };
  return selectVisible({ ...selection, origin: "subset" }, [id]);
}
export function selectWhole(
  selection: Selection,
  ids: readonly string[],
  identity?: string,
): Selection | null {
  const combined = selectVisible(selection, ids);
  if (!combined) return null;
  const exact = new Set(ids);
  return {
    ...combined,
    origin: combined.ids.every((id) => exact.has(id)) ? "whole" : "subset",
    ...(identity ? { wholeIdentity: identity } : {}),
  };
}
export function wholeSelectionConditions(conditions: BrowseConditions) {
  const { cursor: _cursor, day: _day, ...filter } = conditions;
  return { ...filter, tags: [...filter.tags] };
}
export function displayedIds(page: BrowsePage) {
  return [
    ...new Set(
      (page.conditions.layout === "calendar"
        ? page.calendar.flatMap((day) => day.items)
        : page.items
      ).map((note) => note.id),
    ),
  ];
}
export function batchSource(
  workspaceId: string | null,
  userId: string,
): NoteOwner {
  return workspaceId
    ? { kind: "workspace", workspaceId }
    : { kind: "personal", accountId: userId };
}
export function confirmationInput(
  item: BatchPreviewItem | BatchConfirmation,
): BatchConfirmation {
  if (item.kind === "excluded")
    return { kind: "excluded" as const, noteId: item.noteId };
  const common = {
    kind: "ready" as const,
    noteId: item.noteId,
    title: item.title,
    latestAttemptId: item.latestAttemptId,
    baseSequence: item.baseSequence,
  };
  if (item.expected.kind === "sharing")
    return {
      ...common,
      expected: item.expected,
      consent:
        "consent" in item && item.consent ? item.consent : { kind: "none" },
    };
  return {
    ...common,
    expected:
      item.expected.kind === "move"
        ? { kind: "move", move: moveExpectedInput(item.expected.move) }
        : item.expected,
  };
}
export function acceptanceInput(input: BatchAcceptInput) {
  return { ...input, items: input.items.map(confirmationInput) };
}
export function unknownBatchResult(error: unknown) {
  const { kind } = extractSerializedError(error);
  return kind === "system" || kind === "unknown";
}
export const batchOperationLabel = (operation: BatchOperation) =>
  operation.kind === "sharing"
    ? `公開範囲を${visibilityLabel[operation.visibility]}に変更`
    : operation.kind === "move"
      ? "所属先を移動"
      : operation.kind === "trash"
        ? "ゴミ箱へ移動"
        : operation.change.kind === "create"
          ? `指定したタグ名「${operation.change.name}」の付与設定`
          : `${operation.change.kind === "detach" ? "タグを外す" : "タグを付ける"}（固定 ID: ${operation.change.tagId}）`;
export const batchKindLabel = {
  sharing: "一括公開範囲変更",
  tag: "一括タグ変更",
  move: "一括所属移動",
  trash: "一括ゴミ箱移動",
};
export const visibilityLabel = {
  private: "非公開",
  link: "限定リンク",
  public: "全体公開",
};
export const batchStateLabel = {
  queued: "待機中",
  running: "実行中",
  succeeded: "完了",
  failed: "失敗あり",
  cancelled: "取消あり",
};
