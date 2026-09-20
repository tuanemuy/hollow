import type { PdfJobView } from "@repo/core/application/pdf/usecases";

export type PdfActivityState = Readonly<{
  watch: ReadonlyMap<string, number>;
  turn: readonly string[];
}>;
export type PdfActiveRow = Pick<PdfJobView, "id" | "version">;
export type PdfWatchedRow = Pick<
  PdfJobView,
  "id" | "version" | "state" | "title"
>;

export function observeActive(
  state: PdfActivityState,
  rows: readonly PdfActiveRow[],
): PdfActivityState {
  const watch = new Map(state.watch);
  const turn = [...state.turn];
  for (const row of rows) {
    const version = watch.get(row.id);
    if (version === undefined) turn.push(row.id);
    if (version === undefined || row.version > version)
      watch.set(row.id, row.version);
  }
  return { watch, turn };
}

export function nextWatch(state: PdfActivityState): Readonly<{
  state: PdfActivityState;
  requestedIds: readonly string[];
}> {
  const requestedIds = state.turn.slice(0, 50);
  return {
    state: {
      watch: state.watch,
      turn: [...state.turn.slice(requestedIds.length), ...requestedIds],
    },
    requestedIds,
  };
}

export function applyWatched(
  state: PdfActivityState,
  requestedIds: readonly string[],
  rows: readonly PdfWatchedRow[],
): Readonly<{
  state: PdfActivityState;
  notifications: readonly PdfWatchedRow[];
}> {
  const requested = new Set(requestedIds);
  const latest = new Map<string, PdfWatchedRow>();
  for (const row of rows) {
    if (!requested.has(row.id) || !state.watch.has(row.id)) continue;
    const previous = latest.get(row.id);
    if (!previous || row.version > previous.version) latest.set(row.id, row);
  }
  const watch = new Map(state.watch);
  const notifications: PdfWatchedRow[] = [];
  for (const id of requested) {
    const version = watch.get(id);
    if (version === undefined) continue;
    const row = latest.get(id);
    if (!row) {
      watch.delete(id);
    } else if (row.version >= version) {
      if (row.state === "queued" || row.state === "running")
        watch.set(id, row.version);
      else {
        watch.delete(id);
        notifications.push(row);
      }
    }
  }
  return {
    state: { watch, turn: state.turn.filter((id) => watch.has(id)) },
    notifications,
  };
}
