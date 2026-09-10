import type { PurgeView } from "@repo/core/application/note/purge";

export type PurgeHistoryScope = "unfinished" | "completed";
export type PurgeHistoryCursor = Readonly<{ at: string; id: string }>;
export type PurgeHistoryRequest = Readonly<{
  noteId: string;
  operationId: string;
}>;
export type PurgeHistoryPage = Readonly<{
  items: readonly PurgeView[];
  nextCursor: PurgeHistoryCursor | null;
  summary: Readonly<{
    unfinished: number;
    active: number;
    failed: number;
    representative: PurgeView | null;
  }>;
  observed: readonly PurgeView[];
  requests: readonly (PurgeHistoryRequest & {
    readonly purge: PurgeView | null;
  })[];
}>;

export function purgeHistoryIdentity(
  scope: PurgeHistoryScope,
  cursor: PurgeHistoryCursor | null,
): string {
  return JSON.stringify([scope, cursor?.at ?? null, cursor?.id ?? null]);
}

export function acceptsPurgeHistoryRead(
  current: { generation: number; identity: string },
  incoming: { generation: number; identity: string },
): boolean {
  return (
    current.generation === incoming.generation &&
    current.identity === incoming.identity
  );
}

export function purgeHistoryEvidence(
  page: Pick<PurgeHistoryPage, "items" | "observed">,
): readonly PurgeView[] {
  const rows = new Map(page.items.map((item) => [item.id, item]));
  for (const item of page.observed) rows.set(item.id, item);
  return [...rows.values()];
}

export function purgeHistoryWatch(
  items: readonly Pick<PurgeView, "id">[],
): readonly string[] {
  return [...new Set(items.map((item) => item.id))].slice(0, 50);
}

export function unconfirmedPurgeRequests(
  requests: readonly PurgeHistoryRequest[],
  page: PurgeHistoryPage | null,
): readonly PurgeHistoryRequest[] {
  return requests.filter(
    (request) =>
      !page?.requests.some(
        (result) =>
          result.noteId === request.noteId &&
          result.operationId === request.operationId &&
          result.purge !== null,
      ),
  );
}

export function shouldPollPurgeHistory(
  page: PurgeHistoryPage | null,
  requests: readonly PurgeHistoryRequest[],
): boolean {
  return (
    (page?.summary.unfinished ?? 0) > 0 ||
    unconfirmedPurgeRequests(requests, page).length > 0
  );
}
