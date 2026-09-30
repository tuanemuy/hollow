import type { BackupActivityCursor } from "@repo/core/application/integration/drive/backup/activity";

export type ActivityScope = Readonly<{ id: string; epoch: number }>;
type ServerActor = Readonly<{
  accountId: string;
  authVersion: number;
  browserEpoch: number;
}>;
export type ActivityRow = Readonly<{
  id: string;
  parentId?: string;
  requestedId?: string;
  generation: number;
  active: number;
  state: "processing" | "succeeded" | "failed" | "cancelled";
  title: string;
}>;
export type ActivityPage = Readonly<{
  actor: ServerActor;
  active: number;
  rows: readonly ActivityRow[];
  watched: readonly ActivityRow[];
  next: BackupActivityCursor | null;
  watchNext: number | null;
}>;
export type ActivityNotice = Readonly<{
  key: string;
  title: string;
  state: Exclude<ActivityRow["state"], "processing">;
}>;
export type ActivityModel = Readonly<{
  scope: ActivityScope | null;
  actor: ServerActor | null;
  active: number;
  cursor: BackupActivityCursor | null;
  watches: readonly string[];
  batch: readonly string[];
  batchSeen: ReadonlySet<string>;
  watchAfter: number;
  parents: ReadonlyMap<string, ActivityRow>;
  generations: ReadonlyMap<string, number>;
  announced: ReadonlySet<string>;
  notices: readonly ActivityNotice[];
}>;

export function sameActivityScope(
  left: ActivityScope | null,
  right: ActivityScope | null,
): boolean {
  return left?.id === right?.id && left?.epoch === right?.epoch;
}

export function emptyActivity(scope: ActivityScope | null): ActivityModel {
  return {
    scope,
    actor: null,
    active: 0,
    cursor: null,
    watches: [],
    batch: [],
    batchSeen: new Set(),
    watchAfter: 0,
    parents: new Map(),
    generations: new Map(),
    announced: new Set(),
    notices: [],
  };
}

export function watchActivity(model: ActivityModel, id: string): ActivityModel {
  return model.watches.includes(id)
    ? model
    : { ...model, watches: [...model.watches, id] };
}

export function prepareActivity(model: ActivityModel): ActivityModel {
  return model.batch.length
    ? model
    : { ...model, batch: model.watches.slice(0, 50), watchAfter: 0 };
}

export function activityInput(model: ActivityModel) {
  return {
    ...(model.cursor ? { cursor: model.cursor } : {}),
    watch: [...model.batch],
    watchAfter: model.watchAfter,
  };
}

export function receiveActivity(
  model: ActivityModel,
  page: ActivityPage,
  current: ActivityScope | null,
): ActivityModel {
  if (
    !current ||
    !sameActivityScope(model.scope, current) ||
    page.actor.accountId !== current.id
  )
    return model;
  if (
    model.actor &&
    (page.actor.authVersion < model.actor.authVersion ||
      page.actor.browserEpoch < model.actor.browserEpoch)
  )
    return model;
  if (
    model.actor &&
    (page.actor.authVersion !== model.actor.authVersion ||
      page.actor.browserEpoch !== model.actor.browserEpoch)
  )
    return { ...emptyActivity(current), actor: page.actor };

  const parents = new Map(model.parents);
  const generations = new Map(model.generations);
  const announced = new Set(model.announced);
  const notices = [...model.notices];
  const watches = new Set(model.watches);
  const batchSeen = new Set(model.batchSeen);
  for (const row of page.watched) batchSeen.add(row.requestedId ?? row.id);
  for (const row of [...page.rows, ...page.watched]) {
    const parentId = row.parentId ?? row.id;
    const watchId = row.requestedId ?? row.id;
    if (row.generation < (generations.get(parentId) ?? 0)) continue;
    const previous = parents.get(parentId);
    if (row.state === "processing" || row.active > 0) {
      generations.set(parentId, row.generation);
      parents.set(parentId, row);
      watches.add(watchId);
      continue;
    }
    if (previous !== undefined || model.watches.includes(watchId)) {
      generations.set(parentId, row.generation);
      const key = JSON.stringify([parentId, row.generation, row.state]);
      if (!announced.has(key)) {
        announced.add(key);
        notices.push({ key, title: row.title, state: row.state });
      }
    }
    parents.delete(parentId);
    watches.delete(watchId);
  }
  if (page.watchNext === null) {
    for (const id of model.batch) {
      if (!batchSeen.has(id)) {
        watches.delete(id);
        for (const [parentId, row] of parents) {
          if ((row.requestedId ?? row.id) === id) parents.delete(parentId);
        }
      }
    }
  }
  const continuing = page.watchNext !== null;
  return {
    ...model,
    actor: page.actor,
    active: page.active,
    cursor: page.next,
    watches: continuing
      ? [...watches]
      : [
          ...[...watches].filter((id) => !model.batch.includes(id)),
          ...model.batch.filter((id) => watches.has(id)),
        ],
    batch: continuing ? model.batch : [],
    batchSeen: continuing ? batchSeen : new Set(),
    watchAfter: page.watchNext ?? 0,
    parents,
    generations,
    announced,
    notices,
  };
}

export type ActivityReadTicket = Readonly<{ serial: number; revision: number }>;
export type ActivityReadGate = Readonly<{
  serial: number;
  revision: number;
  flight: ActivityReadTicket | null;
  queued: boolean;
}>;
export function emptyActivityReadGate(): ActivityReadGate {
  return { serial: 0, revision: 0, flight: null, queued: false };
}
export function invalidateActivityRead(
  gate: ActivityReadGate,
): ActivityReadGate {
  return { ...gate, revision: gate.revision + 1, queued: false };
}
export function beginActivityRead(gate: ActivityReadGate, fresh = false) {
  const revision = gate.revision + (fresh ? 1 : 0);
  if (gate.flight)
    return {
      gate: { ...gate, revision, queued: true },
      ticket: null,
    };
  const ticket = { serial: gate.serial + 1, revision };
  return {
    gate: {
      ...gate,
      serial: ticket.serial,
      revision,
      flight: ticket,
      queued: false,
    },
    ticket,
  };
}
export function activityReadCurrent(
  gate: ActivityReadGate,
  ticket: ActivityReadTicket,
): boolean {
  return (
    gate.flight?.serial === ticket.serial && gate.revision === ticket.revision
  );
}
export function finishActivityRead(
  gate: ActivityReadGate,
  ticket: ActivityReadTicket,
) {
  if (gate.flight?.serial !== ticket.serial) return { gate, repeat: false };
  return {
    gate: { ...gate, flight: null, queued: false },
    repeat: gate.queued,
  };
}
