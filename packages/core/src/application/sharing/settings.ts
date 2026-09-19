import { BusinessRuleError } from "@repo/core/domain/error";
import {
  assertSharePassword,
  type ShareExpected,
  type ShareOperation,
  type ShareSettings,
} from "@repo/core/domain/sharing/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, SystemError, SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { canScope, requireNote } from "../workspace/access";

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
  const row = await u.sharing.find(noteId);
  if (!row)
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "Note sharing is missing",
    );
  return row;
}
async function settingsSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  session: string | null,
  noteId: string,
  edit = false,
) {
  const actor = await requireAccount(c, u.accounts, session);
  const note = await requireNote(
    u,
    await u.notes.findById(noteId),
    actor.id,
    edit ? "edit" : "read",
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
export async function getSharing(
  c: HollowContainer,
  session: string | null,
  noteId: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const { actor, note, settings, scope } = await settingsSnapshot(
      c,
      u,
      session,
      noteId,
    );
    return {
      actorId: actor.id,
      title: note.title,
      expected: {
        noteId,
        shareVersion: settings.version,
        noteVersion: note.version,
        scope,
      } satisfies ShareExpected,
      visibility: settings.visibility,
      hasPassword: settings.passwordHash !== null,
      hasLink: settings.linkGeneration > 0,
      canEdit: await canScope(u, note.owner, actor.id, "edit"),
      author: await u.displayNames.author(
        note.creator?.kind === "account" ? note.creator.accountId : null,
      ),
      ownDisplayName: (await u.displayNames.find(actor.id)).displayName,
    };
  });
}
export type SharingView = Awaited<ReturnType<typeof getSharing>>;
async function checked(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  session: string | null,
  expected: ShareExpected,
) {
  const snapshot = await settingsSnapshot(c, u, session, expected.noteId, true);
  if (
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
  return snapshot;
}
export async function changeSharing(
  c: HollowContainer,
  session: string | null,
  input: Readonly<{ expected: ShareExpected; operation: ShareOperation }>,
) {
  const { operation, expected } = input;
  let passwordHash: string | undefined;
  if (operation.kind === "password") {
    assertSharePassword(operation.password);
    await c.unitOfWorkProvider.run((u) => checked(c, u, session, expected));
    passwordHash = await shareServices(c).passwordWork.run(() =>
      c.passwordHasher.hash(operation.password),
    );
  }
  await c.unitOfWorkProvider.run(async (u) => {
    const { note, settings } = await checked(c, u, session, expected);
    let next: ShareSettings = { ...settings, version: settings.version + 1 };
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
    if (operation.kind === "visibility") {
      if (operation.visibility === "link" && !note.html.trim())
        throw new BusinessRuleError(
          "SHARE_BODY_REQUIRED",
          "保存済みの本文ができてから限定公開にしてください。",
        );
      next = {
        ...next,
        visibility: operation.visibility,
        ...(operation.visibility === "link" && settings.linkGeneration === 0
          ? issue()
          : {}),
        grantEpoch:
          settings.grantEpoch + (operation.visibility === "private" ? 1 : 0),
      };
    } else if (operation.kind === "regenerate") {
      if (settings.linkGeneration === 0)
        throw new BusinessRuleError(
          "SHARE_LINK_MISSING",
          "限定リンクはまだ発行されていません。",
        );
      next = { ...next, ...issue(), grantEpoch: settings.grantEpoch + 1 };
    } else if (operation.kind === "password") {
      if (settings.visibility === "public")
        throw new BusinessRuleError(
          "SHARE_PUBLIC_PASSWORD",
          "公開ノートにはパスワードを設定できません。",
        );
      if (!passwordHash)
        throw new SystemError(
          SystemErrorCode.DataIntegrityError,
          "Password hash missing",
        );
      next = {
        ...next,
        ...(settings.linkGeneration === 0 ? issue() : {}),
        passwordHash,
        grantEpoch: settings.grantEpoch + 1,
      };
    } else
      next = {
        ...next,
        passwordHash: null,
        grantEpoch: settings.grantEpoch + 1,
      };
    if (!(await u.sharing.save(next, settings.version)))
      throw new ConflictError(
        "SHARE_CONFLICT",
        "共有設定が更新されました。再確認してください。",
      );
  });
  return getSharing(c, session, expected.noteId);
}
export async function getShareLink(
  c: HollowContainer,
  session: string | null,
  expected: ShareExpected,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const { settings } = await checked(c, u, session, expected);
    if (settings.visibility !== "link" || !settings.tokenEnvelope)
      throw new BusinessRuleError(
        "SHARE_LINK_HIDDEN",
        "非公開の限定リンクは表示できません。",
      );
    const token = shareServices(c).protector.reveal(settings.tokenEnvelope, {
      noteId: settings.noteId,
      generation: settings.linkGeneration,
    });
    return { url: new URL(`/s/${token}`, c.appUrl).href };
  });
}
export async function rotateShareEnvelopes(c: HollowContainer, after?: string) {
  const protector = shareServices(c).protector;
  return c.unitOfWorkProvider.run(async (u) => {
    const rows = await u.sharing.rotationCandidates(after, 50);
    let rewritten = 0;
    for (const row of rows) {
      if (!row.tokenEnvelope || !protector.needsRotation(row.tokenEnvelope))
        continue;
      const binding = { noteId: row.noteId, generation: row.linkGeneration };
      const next = protector.protect(
        protector.reveal(row.tokenEnvelope, binding),
        binding,
      );
      if (
        await u.sharing.replaceEnvelope(
          row.noteId,
          row.linkGeneration,
          row.tokenEnvelope,
          next,
        )
      )
        rewritten++;
    }
    return { rewritten, next: rows.length === 50 ? rows.at(-1)?.noteId : null };
  });
}
