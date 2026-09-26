import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  ShareExpected,
  ShareOperation,
} from "@repo/core/domain/sharing/entity";
import type { HollowContainer } from "../di/hollowTypes";
import {
  ConflictError,
  SystemError,
  SystemErrorCode,
  UnauthorizedError,
} from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requireNote } from "../workspace/access";

export function shareServices(c: HollowContainer) {
  if (!c.sharing)
    throw new BusinessRuleError(
      "SHARE_KEY_UNAVAILABLE",
      "共有リンクの鍵を利用できません。管理者に確認してください。",
    );
  return c.sharing;
}

export async function requiredSharing(
  u: HollowUnitOfWorkContext,
  noteId: string,
) {
  const settings = await u.sharing.find(noteId);
  if (!settings)
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "Note sharing is missing",
    );
  return settings;
}

export async function readSharingForActorInTransaction(
  u: HollowUnitOfWorkContext,
  actorId: string,
  noteId: string,
) {
  const actor = await u.accounts.findById(actorId);
  if (!actor || actor.status !== "verified")
    throw new UnauthorizedError("SESSION_REQUIRED", "サインインしてください。");
  const note = await requireNote(
    u,
    await u.notes.findById(noteId),
    actor.id,
    "edit",
  );
  const settings = await requiredSharing(u, noteId);
  const scope = await u.sharing.scope(noteId);
  if (!scope)
    throw new ConflictError(
      "SHARE_SCOPE_CHANGED",
      "閲覧範囲が変更されました。再確認してください。",
    );
  return { actor, note, settings, scope };
}

export type SharingEditSnapshot = Awaited<
  ReturnType<typeof readSharingForActorInTransaction>
>;
export function assertSharingExpected(
  snapshot: Pick<SharingEditSnapshot, "note" | "settings" | "scope">,
  expected: ShareExpected,
) {
  if (
    snapshot.note.id !== expected.noteId ||
    snapshot.settings.version !== expected.shareVersion ||
    snapshot.note.version !== expected.noteVersion ||
    snapshot.scope.ownershipGeneration !== expected.scope.ownershipGeneration ||
    snapshot.scope.workspaceId !== expected.scope.workspaceId ||
    snapshot.scope.membershipRevision !== expected.scope.membershipRevision ||
    snapshot.scope.name !== expected.scope.name ||
    snapshot.scope.memberCount !== expected.scope.memberCount
  )
    throw new ConflictError(
      "SHARE_CONFIRMATION_CHANGED",
      "ノートまたは閲覧範囲が変更されました。最新の設定を確認してください。",
    );
}

export type VisibilityOperation = Extract<
  ShareOperation,
  { kind: "visibility" }
>;
export type VisibilityResult = Readonly<{
  kind: "changed" | "unchanged";
  noteId: string;
  visibility: VisibilityOperation["visibility"];
  previousShareVersion: number;
  shareVersion: number;
}>;

export async function changeVisibilityInTransaction(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  actorId: string,
  input: Readonly<{
    expected: ShareExpected;
    operation: VisibilityOperation;
    mode: "single-reapply" | "batch-converge";
  }>,
): Promise<VisibilityResult> {
  const snapshot = await readSharingForActorInTransaction(
    u,
    actorId,
    input.expected.noteId,
  );
  assertSharingExpected(snapshot, input.expected);
  const { note, settings } = snapshot;
  const { operation } = input;
  if (operation.visibility !== "private" && !note.html.trim())
    throw new BusinessRuleError(
      "SHARE_BODY_REQUIRED",
      "保存済みの本文ができてから公開範囲を広げてください。",
    );
  if (operation.visibility === "public") {
    if (settings.passwordHash && !operation.confirmPasswordRemoval)
      throw new BusinessRuleError(
        "SHARE_PUBLIC_PASSWORD_CONFIRM",
        "パスワードを解除し、誰でも閲覧できる公開ノートにすることを確認してください。",
      );
    if (
      note.owner.kind === "personal" &&
      !(await u.publicProfiles.find(note.owner.accountId))?.handle
    )
      throw new BusinessRuleError(
        "SHARE_PUBLIC_HANDLE_REQUIRED",
        "現在の所有者のプロフィールにハンドルを設定してください。",
      );
    if (
      note.owner.kind === "workspace" &&
      !(await u.workspaces.find(note.owner.workspaceId))?.slug
    )
      throw new BusinessRuleError(
        "SHARE_PUBLIC_SLUG_REQUIRED",
        "現在のワークスペースにスラッグを設定してください。",
      );
  }
  const identity = await u.publicNotes.find(note.id);
  if (settings.visibility === "public" && !identity)
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "Public note identity is missing",
    );
  const result = {
    noteId: note.id,
    visibility: operation.visibility,
    previousShareVersion: settings.version,
  };
  if (
    input.mode === "batch-converge" &&
    operation.visibility === settings.visibility
  )
    return { ...result, kind: "unchanged", shareVersion: settings.version };
  if (operation.visibility === "public" && !identity)
    await u.publicNotes.create({
      noteId: note.id,
      publicId: c.idGenerator.next(),
      urlGeneration: 1,
      accessEpoch: 0,
      createdAt: c.clock.now(),
    });
  if (settings.visibility === "public" && operation.visibility !== "public") {
    if (
      !identity ||
      !(await u.publicNotes.revoke(note.id, identity.accessEpoch))
    )
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "Public note identity is missing",
      );
  }
  const issue = () => {
    const token = c.tokens.generate();
    const generation = settings.linkGeneration + 1;
    return {
      linkGeneration: generation,
      tokenHash: c.tokens.hash(token),
      tokenEnvelope: shareServices(c).protector.protect(token, {
        noteId: note.id,
        generation,
      }),
    };
  };
  const next = {
    ...settings,
    version: settings.version + 1,
    visibility: operation.visibility,
    ...(operation.visibility !== "private" && settings.linkGeneration === 0
      ? issue()
      : {}),
    grantEpoch: settings.grantEpoch + (operation.visibility !== "link" ? 1 : 0),
    ...(operation.visibility === "public" ? { passwordHash: null } : {}),
  };
  if (!(await u.sharing.save(next, settings.version)))
    throw new ConflictError(
      "SHARE_CONFLICT",
      "共有設定が更新されました。再確認してください。",
    );
  return { ...result, kind: "changed", shareVersion: next.version };
}
