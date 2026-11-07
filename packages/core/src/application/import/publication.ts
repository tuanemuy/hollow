import { BusinessRuleError } from "@repo/core/domain/error";
import {
  type ImportNotice,
  importVisibility,
} from "@repo/core/domain/import/entity";
import { hasBody, type NoteOwner } from "@repo/core/domain/note/entity";
import type { NoteVisibility } from "@repo/core/domain/sharing/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import {
  changeVisibilityInTransaction,
  requiredSharing,
  shareServices,
} from "../sharing/visibility";

const notices = {
  handle:
    "公開ハンドルが未設定に戻ったため、本文は非公開で保存しました。プロフィールで設定してから公開してください。",
  slug: "公開スラッグが未設定に戻ったため、本文は非公開で保存しました。ワークスペースの設定を確認してください。",
  "sharing-changed":
    "取り込み中に共有設定が変更されたため、アップロード時の公開状態を自動適用していません。現在の共有設定を確認してください。",
  "empty-body":
    "公開できる本文がないため、非公開のまま保存しました。原本と変換結果を確認してください。",
} as const;
type PublicationIssue = keyof typeof notices;

async function prerequisite(u: HollowUnitOfWorkContext, owner: NoteOwner) {
  return owner.kind === "personal"
    ? (await u.publicProfiles.find(owner.accountId))?.handle
      ? null
      : ("handle" as const)
    : (await u.workspaces.find(owner.workspaceId))?.slug
      ? null
      : ("slug" as const);
}

export async function checkImportPublication(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  owner: NoteOwner,
  visibility: NoteVisibility,
) {
  if (visibility === "private") return;
  shareServices(c);
  if (visibility !== "public") return;
  const issue = await prerequisite(u, owner);
  if (issue)
    throw new BusinessRuleError(
      issue === "handle"
        ? "SHARE_PUBLIC_HANDLE_REQUIRED"
        : "SHARE_PUBLIC_SLUG_REQUIRED",
      issue === "handle"
        ? "アップロード前に公開ハンドルを設定してください。"
        : "アップロード前にワークスペースの公開スラッグを設定してください。",
    );
}

export function importPublicationNotice(rows: readonly ImportNotice[]) {
  const notice = rows.find((row) => row.code === "PUBLICATION_SKIPPED");
  if (!notice) return null;
  for (const [key, message] of Object.entries(notices))
    if (notice.location === key) return message;
  return null;
}

/** Runs after the guarded import body write, in its transaction. */
export async function applyImportPublication(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  jobId: string,
) {
  const job = await u.jobs.find(jobId);
  if (!job || (job.state !== "running" && job.state !== "succeeded")) return;
  const batch = await u.imports.findBatch(job.batchId);
  const visibility = importVisibility(batch?.requestedVisibility);
  if (visibility === "private") return;
  const original = await u.imports.findOriginal(job.originalId);
  const note = await u.notes.findById(job.noteId);
  if (
    !original ||
    original.activeJobId !== jobId ||
    !note ||
    note.version !== job.noteVersion + 1
  )
    return;
  const settings = await requiredSharing(u, note.id);
  const issue: PublicationIssue | null =
    settings.version !== 0 ||
    settings.visibility !== "private" ||
    settings.passwordHash !== null ||
    settings.linkGeneration !== 0
      ? "sharing-changed"
      : !hasBody(note.html)
        ? "empty-body"
        : visibility === "public"
          ? await prerequisite(u, note.owner)
          : null;
  if (issue) {
    await u.imports.replaceNotices(original.id, [
      ...(await u.imports.listNotices(original.id)).filter(
        (row) => row.code !== "PUBLICATION_SKIPPED",
      ),
      { code: "PUBLICATION_SKIPPED", location: issue, message: notices[issue] },
    ]);
    return;
  }
  const scope = await u.sharing.scope(note.id);
  if (!scope)
    throw new ConflictError(
      "SHARE_SCOPE_CHANGED",
      "閲覧範囲が変更されました。再確認してください。",
    );
  await changeVisibilityInTransaction(c, u, job.accountId, {
    expected: {
      noteId: note.id,
      noteVersion: note.version,
      shareVersion: settings.version,
      scope,
    },
    operation:
      visibility === "public"
        ? { kind: "visibility", visibility, confirmPasswordRemoval: false }
        : { kind: "visibility", visibility },
    mode: "batch-converge",
  });
}
