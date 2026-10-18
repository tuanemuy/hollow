import {
  type BatchOperation,
  selectedNoteIds,
} from "../../domain/batch/entity";
import { EventId } from "../../domain/common/event";
import { BusinessRuleError } from "../../domain/error";
import { hasBody, type NoteOwner } from "../../domain/note/entity";
import { tagName, tagScopeKey } from "../../domain/tag/entity";
import { requireAccount } from "../account/session";
import type { BrowseConditions } from "../browse/ports";
import type { HollowContainer } from "../di/hollowTypes";
import {
  NotFoundError,
  SystemError,
  SystemErrorCode,
  UnauthorizedError,
} from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { movePreviewInTransaction, sameMoveScope } from "../move/usecases";
import { readSharingForActorInTransaction } from "../sharing/visibility";
import { canScope, requireScope } from "../workspace/access";
import { aggregateMoveAmounts, batchChanged } from "./holding";
import type {
  BatchAcceptInput,
  BatchAttempt,
  BatchConfirmation,
  BatchHeader,
  BatchPreviewInput,
  BatchPreviewItem,
  BatchSummary,
  BatchView,
} from "./ports";
import { batchProcessing } from "./processing";
import {
  canonicalSharingCommand,
  canonicalSharingItems,
  canonicalSharingSnapshot,
  sharingConsent,
} from "./sharing";

export const BATCH_HISTORY_MS = 90 * 86400000;
const unavailable = () =>
  new NotFoundError(
    "BATCH_NOT_FOUND",
    "処理が見つからないか、表示期限を過ぎています。",
  );
export function batchOperation(operation: BatchOperation): BatchOperation {
  if (operation.kind === "sharing")
    return { kind: "sharing", visibility: operation.visibility };
  return operation.kind === "tag" && operation.change.kind === "create"
    ? {
        kind: "tag",
        change: { kind: "create", name: tagName(operation.change.name) },
      }
    : operation;
}
export function batchView(s: BatchSummary): BatchView {
  return {
    id: s.header.id,
    kind: s.header.operation.kind,
    state: s.state,
    total: s.header.total,
    excluded: s.header.excluded,
    generation: s.header.generation,
    createdAt: s.header.createdAt.toISOString(),
    updatedAt: s.header.updatedAt.toISOString(),
    counts: s.counts,
  };
}
export async function ownedBatch(
  c: HollowUnitOfWorkContext,
  actorId: string,
  id: string,
  now: Date,
) {
  const s = await c.batches.summary(id);
  if (
    !s ||
    s.header.actorId !== actorId ||
    (s.header.updatedAt.getTime() < now.getTime() - BATCH_HISTORY_MS &&
      s.counts.queued + s.counts.running === 0)
  )
    throw unavailable();
  return s;
}
export async function selectBatchNotes(
  container: HollowContainer,
  token: string | null,
  conditions: Omit<BrowseConditions, "cursor" | "day">,
) {
  if (!token)
    throw new UnauthorizedError("SESSION_REQUIRED", "サインインしてください。");
  if (!container.browsing)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "一覧を読み取れません。再試行してください。",
    );
  const result = await container.browsing.execution.execute({
    kind: "selection",
    sessionHash: container.tokens.hash(token),
    conditions,
  });
  if (result.kind !== "selection")
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "選択結果を確認できません。",
    );
  return result.result;
}
async function validateOperation(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  actorId: string,
  source: NoteOwner,
  operation: BatchOperation,
  binding?: string | null,
) {
  await requireScope(c, source, actorId, "edit");
  if (operation.kind === "sharing" && operation.visibility === "public") {
    if (
      source.kind === "personal" &&
      !(await c.publicProfiles.find(source.accountId))?.handle
    )
      throw new BusinessRuleError(
        "SHARE_PUBLIC_HANDLE_REQUIRED",
        "現在の所有者のプロフィールにハンドルを設定してください。",
      );
    if (
      source.kind === "workspace" &&
      !(await c.workspaces.find(source.workspaceId))?.slug
    )
      throw new BusinessRuleError(
        "SHARE_PUBLIC_SLUG_REQUIRED",
        "現在のワークスペースにスラッグを設定してください。",
      );
  }
  if (operation.kind === "move") {
    await requireScope(c, operation.destination, actorId, "edit");
    if (sameMoveScope(source, operation.destination)) throw batchChanged();
  }
  if (operation.kind === "tag") {
    if (!container.tagging)
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "タグを操作できません。",
      );
    const id =
      binding ??
      (operation.change.kind !== "create" ? operation.change.tagId : null);
    if (id) {
      const tag = await c.tags.find(id);
      if (
        !tag ||
        tag.scopeKey !== tagScopeKey(source) ||
        tag.meaningVersion !== container.tagging.normalizer.version
      )
        throw new BusinessRuleError(
          "TAG_NOT_FOUND",
          "設定したタグは現在利用できません。同名タグへの置き換えは行いません。",
        );
    }
  }
}
async function previewOne(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  actorId: string,
  input: BatchPreviewInput,
  id: string,
  parent: BatchHeader | null,
  latest: BatchAttempt | undefined,
  display = true,
): Promise<BatchPreviewItem> {
  const note = await c.notes.findById(id);
  if (
    !note ||
    note.lifecycle.kind !== "active" ||
    !sameMoveScope(note.owner, input.source) ||
    !(await canScope(c, note.owner, actorId, "edit")) ||
    (parent &&
      (!latest ||
        latest.state !== "failed" ||
        latest.createdAt.getTime() <
          container.clock.now().getTime() - BATCH_HISTORY_MS))
  )
    return { kind: "excluded", noteId: id };
  const common = {
    kind: "ready" as const,
    noteId: id,
    title: note.title,
    latestAttemptId: latest?.id ?? null,
    baseSequence: parent?.lastSequence ?? 0,
  };
  if (input.operation.kind === "sharing") {
    const { settings, scope } = await readSharingForActorInTransaction(
      c,
      actorId,
      id,
    );
    return {
      ...common,
      expected: {
        kind: "sharing",
        snapshot: {
          share: {
            noteId: id,
            shareVersion: settings.version,
            noteVersion: note.version,
            scope,
          },
          visibility: settings.visibility,
          hasPassword: settings.passwordHash !== null,
          hasLink: settings.linkGeneration > 0,
          body: hasBody(note.html) ? "present" : "empty",
        },
      },
      move: null,
    };
  }
  if (input.operation.kind === "move") {
    if (await c.moves.hasConversion(id))
      return { kind: "excluded", noteId: id };
    const expected = await c.moves.inspect(
      id,
      input.operation.destination,
      container.clock.now(),
      (value) => container.tokens.hash(value),
    );
    return {
      ...common,
      expected: { kind: "move", move: expected },
      move: display
        ? await movePreviewInTransaction(c, expected, container.clock.now())
        : null,
    };
  }
  if (input.operation.kind === "trash") {
    const processing = await batchProcessing(container, c, id);
    return {
      ...common,
      expected: { kind: "trash", version: note.version, ...processing },
      move: null,
    };
  }
  return { ...common, expected: { kind: "tag" }, move: null };
}
export async function previewBatch(
  container: HollowContainer,
  token: string | null,
  raw: BatchPreviewInput,
) {
  selectedNoteIds(raw.ids);
  const input = { ...raw, operation: batchOperation(raw.operation) };
  return container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const parent = input.parentId
      ? (await ownedBatch(c, actor.id, input.parentId, container.clock.now()))
          .header
      : null;
    if (
      parent &&
      (!sameMoveScope(parent.source, input.source) ||
        JSON.stringify(parent.operation) !== JSON.stringify(input.operation))
    )
      throw batchChanged();
    await validateOperation(
      container,
      c,
      actor.id,
      input.source,
      input.operation,
      parent?.binding,
    );
    const latest = parent ? await c.batches.children(parent.id, -1, 500) : [];
    const items: BatchPreviewItem[] = [];
    for (const id of input.ids)
      items.push(
        await previewOne(
          container,
          c,
          actor.id,
          input,
          id,
          parent,
          latest.find((a) => a.noteId === id),
        ),
      );
    return {
      items,
      source: input.source,
      operation: input.operation,
      parentId: parent?.id ?? null,
      generation: parent?.generation ?? null,
    };
  });
}
function confirmation(item: BatchPreviewItem): BatchConfirmation {
  if (item.kind === "excluded") return item;
  const { move: _move, ...rest } = item;
  return rest.expected.kind === "sharing"
    ? { ...rest, expected: rest.expected, consent: { kind: "none" } }
    : { ...rest, expected: rest.expected };
}
function compareConfirmation(
  old: BatchConfirmation,
  current: BatchPreviewItem,
) {
  if (old.kind !== current.kind || old.noteId !== current.noteId)
    throw batchChanged();
  if (
    old.kind === "ready" &&
    current.kind === "ready" &&
    (old.title !== current.title ||
      JSON.stringify(
        old.expected.kind === "sharing"
          ? {
              kind: "sharing",
              snapshot: canonicalSharingSnapshot(old.expected.snapshot),
            }
          : old.expected,
      ) !==
        JSON.stringify(
          current.expected.kind === "sharing"
            ? {
                kind: "sharing",
                snapshot: canonicalSharingSnapshot(current.expected.snapshot),
              }
            : current.expected,
        ) ||
      old.latestAttemptId !== current.latestAttemptId ||
      old.baseSequence !== current.baseSequence)
  )
    throw batchChanged();
}
function emit(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  id: string,
  now: Date,
) {
  c.collectEvents([
    {
      id: EventId.create(container.idGenerator.next()),
      aggregateId: id,
      type: "NoteBatchQueued",
      occurredAt: now,
      payload: { parentId: id },
    },
  ]);
}
function newAttempt(
  container: HollowContainer,
  h: BatchHeader,
  item: Extract<BatchConfirmation, { kind: "ready" }>,
  ordinal: number,
  now: Date,
  prior: BatchAttempt | null,
): BatchAttempt {
  if (prior?.attemptNumber === Number.MAX_SAFE_INTEGER) throw batchChanged();
  return {
    id: container.idGenerator.next(),
    parentId: h.id,
    ordinal,
    noteId: item.noteId,
    title: item.title,
    retryOf: prior?.id ?? null,
    generation: prior ? h.generation + 1 : 1,
    attemptNumber: (prior?.attemptNumber ?? 0) + 1,
    expected:
      item.expected.kind === "sharing"
        ? { ...item.expected, consent: sharingConsent(h.operation, item) }
        : item.expected,
    baseSequence: item.baseSequence,
    state: "queued",
    leaseToken: null,
    leaseUntil: null,
    failure: null,
    result: null,
    createdAt: now,
    updatedAt: now,
  };
}
function legacyMoveDigest(
  container: HollowContainer,
  raw: BatchAcceptInput,
  operation: BatchOperation,
) {
  if (operation.kind !== "move") return null;
  let moves = 0;
  for (const item of raw.items) {
    if (item.kind !== "ready") continue;
    if (item.expected.kind !== "move") return null;
    const sharing = item.expected.move.sharing;
    if (
      !sharing ||
      sharing.visibility !== "private" ||
      sharing.version !== 0 ||
      sharing.hasPassword !== false
    )
      return null;
    moves++;
  }
  if (!moves) return null;
  const items = raw.items.map((item) => {
    if (item.kind !== "ready" || item.expected.kind !== "move") return item;
    const { sharing: _sharing, ...move } = item.expected.move;
    return { ...item, expected: { ...item.expected, move } };
  });
  return container.tokens.hash(
    JSON.stringify({ source: raw.source, operation, items }),
  );
}
export async function acceptBatch(
  container: HollowContainer,
  token: string | null,
  raw: BatchAcceptInput,
) {
  selectedNoteIds(raw.items.map((i) => i.noteId));
  const operation = batchOperation(raw.operation);
  const digest = container.tokens.hash(
    JSON.stringify(
      operation.kind === "sharing"
        ? canonicalSharingCommand(raw.source, operation, raw.items)
        : { source: raw.source, operation, items: raw.items },
    ),
  );
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const prior = await c.batches.byRequest(actor.id, raw.requestId);
    if (prior) {
      if (
        prior.digest !== digest &&
        prior.digest !== legacyMoveDigest(container, raw, operation)
      )
        throw batchChanged();
      return { id: prior.id, total: prior.total, excluded: prior.excluded };
    }
    await validateOperation(container, c, actor.id, raw.source, operation);
    const now = container.clock.now();
    const input = {
      ids: raw.items.map((i) => i.noteId),
      source: raw.source,
      operation,
    };
    const ready: Extract<BatchConfirmation, { kind: "ready" }>[] = [];
    for (const item of raw.items) {
      const current = await previewOne(
        container,
        c,
        actor.id,
        input,
        item.noteId,
        null,
        undefined,
        false,
      );
      compareConfirmation(item, current);
      if (item.kind === "ready") ready.push(item);
    }
    if (!ready.length)
      throw new BusinessRuleError(
        "BATCH_EMPTY",
        "現在実行できる対象がありません。処理は作成していません。",
      );
    aggregateMoveAmounts(
      ready.flatMap((i) =>
        i.expected.kind === "move" ? [i.expected.move] : [],
      ),
    );
    let binding: string | null = null;
    if (
      operation.kind === "tag" &&
      operation.change.kind === "create" &&
      container.tagging
    )
      binding =
        (
          await c.tags.findByKey(
            tagScopeKey(raw.source),
            container.tagging.normalizer.key(operation.change.name),
          )
        )?.id ?? null;
    const h: BatchHeader = {
      id: container.idGenerator.next(),
      actorId: actor.id,
      requestId: raw.requestId,
      digest,
      source: raw.source,
      operation,
      binding,
      retryDigest: null,
      total: ready.length,
      excluded: raw.items.length - ready.length,
      generation: 1,
      cancelRequested: false,
      lastSequence: 0,
      prunedThrough: 0,
      createdAt: now,
      updatedAt: now,
    };
    await c.batches.accept(
      h,
      ready.map((i, n) => newAttempt(container, h, i, n, now, null)),
    );
    emit(container, c, h.id, now);
    return { id: h.id, total: h.total, excluded: h.excluded };
  });
  container.batching?.wake();
  return result;
}
export async function retryBatch(
  container: HollowContainer,
  token: string | null,
  input: {
    id: string;
    generation: number;
    items: readonly BatchConfirmation[];
  },
) {
  selectedNoteIds(input.items.map((i) => i.noteId));
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const now = container.clock.now();
    const s = await ownedBatch(c, actor.id, input.id, now);
    const h = s.header;
    const digest = container.tokens.hash(
      JSON.stringify(
        h.operation.kind === "sharing"
          ? {
              id: input.id,
              generation: input.generation,
              items: canonicalSharingItems(h.operation, input.items),
            }
          : input,
      ),
    );
    const children = await c.batches.children(h.id, -1, 500);
    if (h.generation === input.generation + 1 && h.retryDigest === digest)
      return {
        id: h.id,
        total: input.items.filter((i) => i.kind === "ready").length,
      };
    if (
      h.generation !== input.generation ||
      h.generation >= Number.MAX_SAFE_INTEGER ||
      s.counts.running + s.counts.queued > 0 ||
      s.counts.failed === 0
    )
      throw batchChanged();
    await validateOperation(
      container,
      c,
      actor.id,
      h.source,
      h.operation,
      h.binding,
    );
    const attempts: BatchAttempt[] = [];
    for (const item of input.items) {
      const prior = children.find((a) => a.noteId === item.noteId);
      const current = await previewOne(
        container,
        c,
        actor.id,
        { ids: [], source: h.source, operation: h.operation, parentId: h.id },
        item.noteId,
        h,
        prior,
        false,
      );
      compareConfirmation(item, current);
      if (item.kind === "ready" && prior?.state === "failed")
        attempts.push(
          newAttempt(container, h, item, prior.ordinal, now, prior),
        );
    }
    if (!attempts.length) throw batchChanged();
    await c.batches.retry(h, attempts, now, digest);
    emit(container, c, h.id, now);
    return { id: h.id, total: attempts.length };
  });
  container.batching?.wake();
  return result;
}
export async function cancelBatch(
  container: HollowContainer,
  token: string | null,
  input: { id: string; generation: number },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const s = await ownedBatch(c, actor.id, input.id, container.clock.now());
    if (s.header.generation !== input.generation) throw batchChanged();
    if (s.counts.queued + s.counts.running === 0 && !s.header.cancelRequested)
      throw batchChanged();
    await c.batches.cancel(
      s.header.id,
      input.generation,
      container.clock.now(),
    );
    return { id: s.header.id };
  });
}
export async function getBatch(
  container: HollowContainer,
  token: string | null,
  input: { id: string; after?: number | undefined },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const now = container.clock.now();
    const s = await ownedBatch(c, actor.id, input.id, now);
    const rows = await c.batches.children(input.id, input.after ?? -1, 51);
    const items = rows.slice(0, 50).map((a) => ({
      id: a.id,
      noteId: a.noteId,
      ordinal: a.ordinal,
      attemptNumber: a.attemptNumber,
      title:
        a.createdAt.getTime() < now.getTime() - BATCH_HISTORY_MS ? "" : a.title,
      state: a.state,
      outcome:
        a.result?.kind === "sharing"
          ? {
              kind: "sharing" as const,
              visibility: a.result.visibility,
              change: a.result.change,
            }
          : a.result
            ? { kind: "existing" as const }
            : null,
      failure: a.failure,
      retryable:
        a.state === "failed" &&
        a.createdAt.getTime() >= now.getTime() - BATCH_HISTORY_MS,
      updatedAt: a.updatedAt.toISOString(),
    }));
    return {
      parent: batchView(s),
      source: s.header.source,
      operation: s.header.operation,
      binding: s.header.binding,
      items,
      next: rows.length > 50 ? (items.at(-1)?.ordinal ?? null) : null,
    };
  });
}
export async function listBatches(
  container: HollowContainer,
  token: string | null,
  input: {
    scope: "unfinished" | "completed";
    before?: { at: string; id: string } | undefined;
  },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const rows = await c.batches.page(
      actor.id,
      input.scope,
      input.before
        ? { at: new Date(input.before.at), id: input.before.id }
        : undefined,
      new Date(container.clock.now().getTime() - BATCH_HISTORY_MS),
    );
    return {
      items: rows.slice(0, 50).map(batchView),
      next:
        rows.length > 50
          ? {
              at: rows[49]?.header.createdAt.toISOString() ?? "",
              id: rows[49]?.header.id ?? "",
            }
          : null,
    };
  });
}
export async function batchActivity(
  container: HollowContainer,
  token: string | null,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    return c.batches.activity(
      actor.id,
      new Date(container.clock.now().getTime() - BATCH_HISTORY_MS),
    );
  });
}
export async function watchBatches(
  container: HollowContainer,
  token: string | null,
  ids: readonly string[],
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const since = container.clock.now().getTime() - BATCH_HISTORY_MS;
    const items: BatchView[] = [];
    for (const id of ids) {
      const s = await c.batches.summary(id);
      if (
        s?.header.actorId === actor.id &&
        (s.header.updatedAt.getTime() >= since ||
          s.counts.queued + s.counts.running > 0)
      )
        items.push(batchView(s));
    }
    return items;
  });
}

export { confirmation as batchConfirmation };
