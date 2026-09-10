import { assetUrl, parseAssetUrl } from "@repo/core/domain/asset/entity";
import { EventId } from "@repo/core/domain/common/event";
import type { Note } from "@repo/core/domain/note/entity";
import type { RevisionResource } from "@repo/core/domain/note/revision";
import {
  REFERENCE_LIMITS,
  type ReferenceEntry,
  type ReferenceJob,
} from "@repo/core/domain/reference/entity";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { ReferenceDocument } from "../ports/referenceProcessor";
import {
  type DependencyInspections,
  isDependency,
  syncDependencies,
} from "./dependencies";

export async function scheduleReferences(
  container: HollowContainer,
  context: HollowUnitOfWorkContext,
  note: Note,
  accountId: string,
  document: ReferenceDocument,
  enabled?: boolean,
  retryOf: string | null = null,
  inspections: DependencyInspections = new Map(),
  restored?: readonly RevisionResource[],
) {
  if (!container.referencing) return null;
  const now = container.clock.now();
  const previous = await context.references.settings(note.id);
  const on = enabled ?? previous?.enabled ?? true;
  if (previous?.activeJobId)
    await context.references.cancel(previous.activeJobId, now);
  const old = await context.references.entries(note.id);
  await context.references.clearCurrent(note.id);
  const unique = new Map(
    document.candidates.map((c) => [`${c.kind}\0${c.url}`, c]),
  );
  const availableStyles = container.referencing.processor.styles(document.html);
  const resolved: {
    candidate: ReferenceDocument["candidates"][number];
    prior: ReferenceEntry | undefined;
    acquired: boolean;
  }[] = [];
  const identities = new Set<string>();
  const restoredIds = new Map<RevisionResource, string>();
  let pending = 0;
  for (const candidate of unique.values()) {
    if (isDependency(candidate)) continue;
    const service = parseAssetUrl(candidate.url);
    let prior = old.find(
      (e) =>
        e.kind === candidate.kind &&
        (e.url === candidate.url ||
          (e.finalUrl?.startsWith("data:") && e.finalUrl === candidate.url) ||
          (e.assetId &&
            candidate.url ===
              assetUrl({
                scope: "notes",
                scopeId: note.id,
                assetId: e.assetId,
              }))),
    );
    if (restored) {
      const resource = restored.find(
        (r) =>
          r.kind === candidate.kind &&
          (r.url === candidate.url ||
            (r.finalUrl?.startsWith("data:") && r.finalUrl === candidate.url) ||
            (r.assetId &&
              candidate.url ===
                assetUrl({
                  scope: "notes",
                  scopeId: note.id,
                  assetId: r.assetId,
                }))),
      );
      prior = undefined;
      if (resource) {
        const id = restoredIds.get(resource) ?? container.idGenerator.next();
        restoredIds.set(resource, id);
        prior = {
          ...resource,
          id,
          noteId: note.id,
          location: candidate.location,
          current: false,
          state: "acquired",
          reason: null,
          createdAt: now,
          updatedAt: now,
        };
      }
    }
    if (
      service &&
      (!prior ||
        service.scope !== "notes" ||
        service.scopeId !== note.id ||
        !(await context.assets.isReferenced(note.id, service.assetId)))
    )
      continue;
    const acquired =
      prior?.state === "acquired" &&
      (candidate.kind !== "stylesheet" ||
        availableStyles.some(
          (style) =>
            style.url === candidate.url &&
            (style.materialized || Boolean(style.css.trim())),
        )) &&
      (!prior.assetId ||
        (await context.assets.isReferenced(note.id, prior.assetId)));
    const identity = prior?.id ?? `${candidate.kind}\0${candidate.url}`;
    if (identities.has(identity)) continue;
    identities.add(identity);
    resolved.push({ candidate, prior, acquired });
  }
  let remaining = Math.max(
    0,
    REFERENCE_LIMITS.count - resolved.filter((item) => item.acquired).length,
  );
  for (const { candidate, prior, acquired } of resolved) {
    const limited = !acquired && remaining-- <= 0;
    const entry: ReferenceEntry = {
      id: prior?.id ?? container.idGenerator.next(),
      noteId: note.id,
      kind: candidate.kind,
      url: prior?.url ?? candidate.url,
      location: candidate.location,
      current: true,
      state: acquired ? "acquired" : limited ? "limited" : "unattempted",
      reason: acquired
        ? (prior?.reason ?? null)
        : limited
          ? "現在の参照対象は200件までです。"
          : on
            ? null
            : "参照の取り込みはオフです。",
      assetId: acquired ? (prior?.assetId ?? null) : null,
      finalUrl: acquired ? (prior?.finalUrl ?? null) : null,
      bytes: acquired ? (prior?.bytes ?? 0) : 0,
      createdAt: prior?.createdAt ?? now,
      updatedAt: now,
    };
    await context.references.saveEntry(entry);
    if (!acquired && !limited && (on || candidate.url.startsWith("data:")))
      pending++;
  }
  await syncDependencies(
    container,
    context,
    note.id,
    container.referencing.processor.prepare(document.html).candidates,
    inspections,
    old,
  );
  for (const notice of document.notices) {
    if (
      old.some(
        (entry) =>
          !entry.current &&
          entry.state === "limited" &&
          entry.url === (notice.source ?? "") &&
          entry.location === notice.location &&
          entry.reason === notice.message,
      )
    )
      continue;
    await context.references.saveEntry({
      id: container.idGenerator.next(),
      noteId: note.id,
      kind: "stylesheet",
      url: notice.source ?? "",
      location: notice.location,
      current: false,
      state: "limited",
      reason: notice.message,
      assetId: null,
      finalUrl: null,
      bytes: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  let job: ReferenceJob | null = null;
  if (pending) {
    job = {
      id: container.idGenerator.next(),
      noteId: note.id,
      accountId,
      noteVersion: note.version,
      createdAt: now,
      updatedAt: now,
      attempt: 0,
      retryOf,
      total: pending,
      completed: 0,
      cancelRequested: false,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    };
    await context.references.insertJob(job);
    context.collectEvents([
      {
        id: EventId.create(container.idGenerator.next()),
        type: "ReferenceQueued",
        aggregateId: note.id,
        occurredAt: now,
        payload: { jobId: job.id },
      },
    ]);
  }
  await context.references.saveSettings({
    noteId: note.id,
    enabled: on,
    activeJobId: job?.id ?? null,
    bundleId: previous?.bundleId ?? null,
    sourcePath: previous?.sourcePath ?? null,
  });
  return job;
}
