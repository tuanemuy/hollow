import type { PurgeView } from "@repo/core/application/note/purge";

export type PurgeRequest = Readonly<{
  noteId: string;
  operationId: string;
  title: string;
}> &
  (
    | { readonly kind: "requesting" }
    | { readonly kind: "accepted"; readonly purgeId: string }
    | { readonly kind: "unknown" }
  );

export function reconcilePurgeRequests(
  requests: readonly PurgeRequest[],
  evidence: {
    trash?: readonly { id: string; operationId: string }[];
    purges?: readonly Pick<PurgeView, "noteId" | "operationId">[];
  },
): readonly PurgeRequest[] {
  return requests.filter((request) => {
    if (
      evidence.purges?.some(
        (purge) =>
          purge.noteId === request.noteId &&
          purge.operationId === request.operationId,
      )
    )
      return false;
    return !(
      request.kind === "unknown" &&
      evidence.trash?.some(
        (item) =>
          item.id === request.noteId &&
          item.operationId === request.operationId,
      )
    );
  });
}

export function purgeIsActive(value: Pick<PurgeView, "state">): boolean {
  return value.state === "queued" || value.state === "running";
}

export function purgeNeedsRefresh(value: Pick<PurgeView, "state">): boolean {
  return value.state !== "succeeded";
}

export function purgeStateLabel(value: Pick<PurgeView, "state">): string {
  switch (value.state) {
    case "queued":
      return "削除受付済み・回収待ち";
    case "running":
      return "完全削除の処理中";
    case "failed":
      return "回収に失敗・再試行待ち";
    case "succeeded":
      return "完全削除が完了";
  }
}

export function purgeRequestLabel(value: PurgeRequest): string {
  switch (value.kind) {
    case "requesting":
      return "完全削除を依頼しています。受付の確認を待っています。";
    case "accepted":
      return "完全削除を受け付けました。復元はできません。実際の回収状況を確認しています。";
    case "unknown":
      return "完全削除要求の受付結果を確認できません。状態を読み直すまで操作を停止しています。";
  }
}
