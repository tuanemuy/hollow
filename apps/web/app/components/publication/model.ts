import type {
  ProfileView,
  SaveProfileInput,
  WorkspacePublicationView,
} from "@repo/core/application/publication/views";
import { profileBio, publicHandle } from "@repo/core/domain/account/profile";
import { displayName } from "@repo/core/domain/sharing/entity";
import { validateIconInput } from "@repo/core/domain/workspace/icon";
import { extractSerializedError } from "../../presentation/errorResponse";

export type PublicationActor = Readonly<{ id: string; epoch: number }>;
export type PublicationActorProps = Readonly<{
  actorId: string;
  actorEpoch: number;
  currentActor: () => PublicationActor | null;
}>;
export type ProfileDraft = Readonly<{
  displayName: string;
  handle: string;
  bio: string;
}>;
export function samePublicationActor(
  actor: PublicationActor | null,
  id: string,
  epoch: number,
) {
  return actor?.id === id && actor.epoch === epoch;
}
export function ownsPublicationOperation(
  mounted: boolean,
  active: object | null,
  token: object,
  actor: PublicationActor | null,
  id: string,
  epoch: number,
) {
  return mounted && active === token && samePublicationActor(actor, id, epoch);
}
export function profileDraft(view: ProfileView): ProfileDraft {
  return {
    displayName: view.displayName ?? "",
    handle: view.handle ?? "",
    bio: view.bio,
  };
}
export function profileIsDirty(draft: ProfileDraft, view: ProfileView) {
  const saved = profileDraft(view);
  return (
    saved.displayName !== draft.displayName ||
    saved.handle !== draft.handle ||
    saved.bio !== draft.bio
  );
}
export function draftAfterProfileResponse(
  draft: ProfileDraft,
  view: ProfileView,
  kind: "save" | "refresh" | "icon",
  initialized = true,
) {
  return kind === "save" || !initialized ? profileDraft(view) : draft;
}
export function selectionAfterWorkspaceResponse(
  selected: boolean,
  view: WorkspacePublicationView,
  kind: "save" | "refresh",
  initialized = true,
) {
  return kind === "save" || !initialized ? view.pagePublic : selected;
}
export function workspaceViewKey(view: WorkspacePublicationView | null) {
  return view
    ? JSON.stringify([
        view.actorId,
        view.workspaceId,
        view.settingsVersion,
        view.publicationVersion,
        view.name,
        view.slug,
        view.pagePublic,
        view.canEdit,
        view.url,
      ])
    : "";
}
export function reconcileWorkspaceLoader(
  previous: WorkspacePublicationView | null,
  next: WorkspacePublicationView,
  selected: boolean,
) {
  if (
    previous &&
    (previous.actorId !== next.actorId ||
      previous.workspaceId !== next.workspaceId ||
      next.settingsVersion < previous.settingsVersion ||
      next.publicationVersion < previous.publicationVersion ||
      workspaceViewKey(previous) === workspaceViewKey(next))
  )
    return null;
  return {
    view: next,
    selected:
      previous && selected !== previous.pagePublic ? selected : next.pagePublic,
  };
}
export function profileIssues(draft: ProfileDraft) {
  const check = (action: () => unknown): string | null => {
    try {
      action();
      return null;
    } catch (cause) {
      return publicationFailure(cause).message;
    }
  };
  return {
    displayName: check(() => displayName(draft.displayName)),
    handle: check(() => publicHandle(draft.handle)),
    bio: check(() => profileBio(draft.bio)),
  };
}
export function needsHandleConfirmation(
  draft: ProfileDraft,
  view: ProfileView,
) {
  return view.handle !== null && publicHandle(draft.handle) !== view.handle;
}
export function saveProfileInput(
  draft: ProfileDraft,
  view: ProfileView,
  confirmed: boolean,
): SaveProfileInput {
  return {
    displayName: draft.displayName,
    handle: publicHandle(draft.handle),
    bio: draft.bio,
    nameVersion: view.nameVersion,
    profileVersion: view.profileVersion,
    confirmHandleChange: confirmed,
  };
}
export function iconInputIssue(file: Readonly<{ size: number; type: string }>) {
  try {
    validateIconInput(file.size, file.type);
    return null;
  } catch (cause) {
    return publicationFailure(cause).message;
  }
}
export function isWorkspaceView(
  view: WorkspacePublicationView,
  actorId: string,
  workspaceId: string,
) {
  return view.actorId === actorId && view.workspaceId === workspaceId;
}
export function publicationFailure(cause: unknown) {
  const error = extractSerializedError(cause);
  const kind =
    error.kind === "unknown" || error.kind === "system"
      ? "unknown"
      : error.kind === "notFound" ||
          error.kind === "forbidden" ||
          error.kind === "unauthorized"
        ? "access"
        : error.kind === "conflict"
          ? "conflict"
          : "rejected";
  return {
    kind,
    message:
      kind === "unknown" ? "応答を確認できませんでした。" : error.message,
  } as const;
}
