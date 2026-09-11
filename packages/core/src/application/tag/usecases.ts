import { BusinessRuleError } from "../../domain/error";
import type { NoteOwner } from "../../domain/note/entity";
import {
  type Tag,
  type TagImpact,
  type TagStamp,
  tagName,
  tagScopeKey,
} from "../../domain/tag/entity";
import { sameScope, selectedScope } from "../../domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import {
  ConflictError,
  NotFoundError,
  SystemError,
  SystemErrorCode,
  UnauthorizedError,
} from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requireNote, requireScope } from "../workspace/access";
import type {
  TagDelta,
  TagDeltaResult,
  TagManagement,
  TagManagementResult,
  TagReadInput,
} from "./ports";

const missing = () =>
  new NotFoundError("TAG_NOT_FOUND", "タグが見つからないか、操作できません。");
const changed = () =>
  new ConflictError(
    "TAG_CHANGED",
    "タグや使用関係が変わりました。最新の影響を確認してください。",
  );
function tagging(container: HollowContainer) {
  if (!container.tagging)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "タグを読み取れません。再試行してください。",
    );
  return container.tagging;
}
async function requireTag(
  c: HollowUnitOfWorkContext,
  id: string,
  scope: NoteOwner,
  version: string,
) {
  const tag = await c.tags.find(id);
  if (
    !tag ||
    tag.scopeKey !== tagScopeKey(scope) ||
    tag.meaningVersion !== version
  )
    throw missing();
  return tag;
}
async function expectedTag(
  c: HollowUnitOfWorkContext,
  stamp: TagStamp,
  scope: NoteOwner,
  version: string,
) {
  const tag = await requireTag(c, stamp.id, scope, version);
  if (tag.mutationRevision !== stamp.revision) throw changed();
  await c.tags.counts(tag.id, tag.scopeKey);
  return tag;
}
async function impact(
  c: HollowUnitOfWorkContext,
  source: Tag,
  target: Tag | null,
): Promise<TagImpact> {
  const summarize = async (tag: Tag) => ({
    id: tag.id,
    name: tag.name,
    key: tag.normalizedKey,
    normalizationVersion: tag.meaningVersion,
    revision: tag.mutationRevision,
    ...(await c.tags.counts(tag.id, tag.scopeKey)),
  });
  const a = await summarize(source);
  const b = target ? await summarize(target) : null;
  const overlap = target ? await c.tags.overlap(source.id, target.id) : 0;
  return {
    kind: "impact",
    source: a,
    target: b,
    overlap,
    affected: a.total + (b?.total ?? 0) - overlap,
  };
}
export async function readTags(
  container: HollowContainer,
  token: string | null,
  input: TagReadInput,
) {
  if (!token)
    throw new UnauthorizedError("SESSION_REQUIRED", "サインインしてください。");
  return tagging(container).read.read(container.tokens.hash(token), input);
}
export async function changeNoteTags(
  container: HollowContainer,
  token: string | null,
  input: TagDelta,
): Promise<TagDeltaResult> {
  const normalizer = tagging(container).normalizer;
  const change =
    input.change.kind === "create"
      ? { ...input.change, name: tagName(input.change.name) }
      : input.change;
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const note = await requireNote(
      c,
      await c.notes.findById(input.noteId),
      account.id,
      "edit",
    );
    if (!sameScope(note.owner, selectedScope(account.id, input.expectedScope)))
      throw changed();
    const selected = await c.tags.selected(note.id);
    if (
      selected.length > 50 ||
      selected.some(
        (t) =>
          t.scopeKey !== tagScopeKey(note.owner) ||
          t.meaningVersion !== normalizer.version,
      )
    )
      throw new BusinessRuleError(
        "TAG_RELATION",
        "タグの関係を確認できません。変更していません。",
      );
    const tag =
      change.kind === "create"
        ? await c.tags.ensure({
            id: container.idGenerator.next(),
            scopeKey: tagScopeKey(note.owner),
            name: change.name,
            normalizedKey: normalizer.key(change.name),
            meaningVersion: normalizer.version,
          })
        : await requireTag(c, change.tagId, note.owner, normalizer.version);
    if (tag.meaningVersion !== normalizer.version) throw changed();
    const didChange =
      change.kind === "detach"
        ? await c.tags.detach(note.id, tag.id)
        : await c.tags.attach(note.id, tag.id);
    return {
      changed: didChange,
      tags: (await c.tags.selected(note.id)).map((t) => ({
        id: t.id,
        name: t.name,
      })),
    };
  });
}
export async function manageTags(
  container: HollowContainer,
  token: string | null,
  input: TagManagement,
): Promise<TagManagementResult> {
  const normalizer = tagging(container).normalizer;
  const action =
    input.action.kind === "rename"
      ? { ...input.action, name: tagName(input.action.name) }
      : input.action;
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const scope = await requireScope(
      c,
      selectedScope(account.id, input.scope),
      account.id,
      "edit",
    );
    if (action.kind === "cleanup") {
      if (
        !action.targets.length ||
        action.targets.length > 50 ||
        new Set(action.targets.map((t) => t.id)).size !== action.targets.length
      )
        throw new BusinessRuleError(
          "TAG_SELECTION",
          "表示された1〜50個のタグを重複なく選択してください。",
        );
      for (const stamp of action.targets) {
        const tag = await expectedTag(c, stamp, scope, normalizer.version);
        if ((await c.tags.counts(tag.id, tag.scopeKey)).total !== 0)
          throw changed();
      }
      for (const stamp of action.targets) await c.tags.delete(stamp.id);
      return { kind: "done", changed: true };
    }
    const source = await expectedTag(
      c,
      action.source,
      scope,
      normalizer.version,
    );
    if (action.kind === "rename") {
      const name = action.name;
      const key = normalizer.key(name);
      const target = await c.tags.findByKey(source.scopeKey, key);
      if (target && target.id !== source.id) {
        if (target.meaningVersion !== normalizer.version) throw changed();
        return {
          kind: "merge-required",
          impact: await impact(c, source, target),
        };
      }
      const didChange = source.name !== name || source.normalizedKey !== key;
      if (didChange)
        await c.tags.rename(source.id, name, key, normalizer.version);
      return { kind: "done", changed: didChange };
    }
    if (action.kind === "merge") {
      const target = await expectedTag(
        c,
        action.target,
        scope,
        normalizer.version,
      );
      if (source.id === target.id) return { kind: "done", changed: false };
      await c.tags.merge(source.id, target.id);
    } else if (action.kind === "delete") await c.tags.delete(source.id);
    return { kind: "done", changed: true };
  });
}
