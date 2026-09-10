import type {
  EmptyTrashTargetView,
  EmptyTrashView,
  getEmptyTrash,
  listEmptyAttempts,
  listEmptyTrash,
} from "@repo/core/application/note/emptyTrash";

export type EmptyList = Awaited<ReturnType<typeof listEmptyTrash>>;
export type EmptyDetail = Awaited<ReturnType<typeof getEmptyTrash>>;
export type EmptyJobDetail = Extract<EmptyDetail, { kind: "job" }>;
export type EmptyAttempts = Awaited<ReturnType<typeof listEmptyAttempts>>;
export type EmptyCursor = Readonly<{ at: string; id: string }>;
export type EmptyScope = "unfinished" | "completed";
export type EmptySnapshot = Readonly<{
  id: string;
  total: number;
  expiresAt: string;
}>;
export type EmptyConfirmation =
  | Readonly<{ kind: "idle" | "empty" }>
  | Readonly<{ kind: "prepared"; snapshot: EmptySnapshot }>
  | Readonly<{
      kind: "unknown";
      snapshot: EmptySnapshot;
      operation: "confirm" | "discard";
    }>
  | Readonly<{ kind: "accepted"; id: string }>;

export function resolveEmptyConfirmation(
  previous: Extract<EmptyConfirmation, { kind: "unknown" }>,
  result: EmptyDetail,
): EmptyConfirmation {
  const id = result.kind === "job" ? result.job.id : result.id;
  if (id !== previous.snapshot.id) return previous;
  if (result.kind === "job") return { kind: "accepted", id };
  if (result.kind === "discarded") return { kind: "idle" };
  return {
    kind: "prepared",
    snapshot: { id, total: result.total, expiresAt: result.expiresAt },
  };
}

export function canConfirmEmpty(
  state: EmptyConfirmation,
  checked: boolean,
  now: number,
): boolean {
  return (
    state.kind === "prepared" &&
    state.snapshot.total > 0 &&
    checked &&
    Number.isFinite(now) &&
    Date.parse(state.snapshot.expiresAt) > now
  );
}

export type EmptyReadTicket = Readonly<{
  generation: number;
  identity: string;
}>;
export function emptyReadIdentity(
  ...parts: readonly (string | number | null)[]
): string {
  return JSON.stringify(parts);
}
export function acceptsEmptyRead(
  current: EmptyReadTicket,
  incoming: EmptyReadTicket,
): boolean {
  return (
    current.generation === incoming.generation &&
    current.identity === incoming.identity
  );
}
export function emptyWatch(
  items: readonly Pick<EmptyTrashView, "id">[],
): readonly string[] {
  return [...new Set(items.map((item) => item.id))].slice(0, 50);
}
export function emptyEvidence(
  result: Pick<EmptyList, "items" | "observed">,
): readonly EmptyTrashView[] {
  const items = new Map(result.items.map((item) => [item.id, item]));
  for (const item of result.observed) items.set(item.id, item);
  return [...items.values()];
}
export function emptyNeedsPoll(job: EmptyTrashView): boolean {
  return (
    job.state === "queued" ||
    job.state === "running" ||
    job.counts.retryable > 0
  );
}
export function emptyStateLabel(
  job: Pick<EmptyTrashView, "state" | "cancelRequested" | "counts">,
): string {
  if (
    job.cancelRequested &&
    (job.state === "queued" || job.state === "running")
  )
    return "取消受付済み・開始済みの回収を継続中";
  switch (job.state) {
    case "queued":
      return "一括削除受付済み・未開始分を待機中";
    case "running":
      return "一括削除の処理中";
    case "failed":
      return "一部の回収に失敗・結果を確認してください";
    case "cancelled":
      return job.counts.retryable > 0
        ? "未開始分は取消済み・開始済みの一部は回収待ち"
        : "未開始分の取消が完了";
    case "succeeded":
      return job.counts.cancelled > 0
        ? "処理終了・削除完了と対象外の内訳を確認してください"
        : "一括削除の処理が完了";
  }
}
export function emptyChildLabel(
  state: EmptyTrashTargetView["state"],
  waiting = false,
): string {
  if (waiting) return "未開始";
  switch (state) {
    case "queued":
      return "受付済み・回収待ち";
    case "running":
      return "回収中";
    case "failed":
      return "回収失敗";
    case "cancelled":
      return "取消済み・削除対象外";
    case "succeeded":
      return "完全削除が完了";
  }
}
