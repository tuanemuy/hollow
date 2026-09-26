import type { BatchOperation } from "../../domain/batch/entity";
import type { NoteOwner } from "../../domain/note/entity";
import { batchChanged } from "./holding";
import type {
  BatchConfirmation,
  PasswordRemovalConsent,
  SharingConfirmationSnapshot,
} from "./ports";

export function canonicalSharingSnapshot(s: SharingConfirmationSnapshot) {
  return {
    share: {
      noteId: s.share.noteId,
      shareVersion: s.share.shareVersion,
      noteVersion: s.share.noteVersion,
      scope: {
        ownershipGeneration: s.share.scope.ownershipGeneration,
        workspaceId: s.share.scope.workspaceId,
        membershipRevision: s.share.scope.membershipRevision,
        name: s.share.scope.name,
        memberCount: s.share.scope.memberCount,
      },
    },
    visibility: s.visibility,
    hasPassword: s.hasPassword,
    hasLink: s.hasLink,
    body: s.body,
  };
}
export function sharingConsent(
  operation: BatchOperation,
  item: Extract<BatchConfirmation, { kind: "ready" }>,
): PasswordRemovalConsent {
  if (
    operation.kind !== "sharing" ||
    item.expected.kind !== "sharing" ||
    !item.consent
  )
    throw batchChanged();
  const consent = item.consent;
  const required =
    operation.visibility === "public" && item.expected.snapshot.hasPassword;
  if (required) {
    if (
      consent.kind !== "remove-password" ||
      consent.noteId !== item.noteId ||
      consent.shareVersion !== item.expected.snapshot.share.shareVersion
    )
      throw batchChanged();
    return {
      kind: "remove-password",
      noteId: consent.noteId,
      shareVersion: consent.shareVersion,
    };
  }
  if (consent.kind !== "none") throw batchChanged();
  return { kind: "none" };
}
export function canonicalSharingItems(
  operation: BatchOperation,
  items: readonly BatchConfirmation[],
) {
  return items.map((item) => {
    if (item.kind === "excluded")
      return { kind: item.kind, noteId: item.noteId };
    if (
      item.expected.kind !== "sharing" ||
      item.expected.snapshot.share.noteId !== item.noteId
    )
      throw batchChanged();
    return {
      kind: item.kind,
      noteId: item.noteId,
      title: item.title,
      expected: {
        kind: "sharing",
        snapshot: canonicalSharingSnapshot(item.expected.snapshot),
      },
      consent: sharingConsent(operation, item),
      latestAttemptId: item.latestAttemptId,
      baseSequence: item.baseSequence,
    };
  });
}
export function canonicalSharingCommand(
  source: NoteOwner,
  operation: Extract<BatchOperation, { kind: "sharing" }>,
  items: readonly BatchConfirmation[],
) {
  return {
    source:
      source.kind === "personal"
        ? { kind: source.kind, accountId: source.accountId }
        : { kind: source.kind, workspaceId: source.workspaceId },
    operation: { kind: operation.kind, visibility: operation.visibility },
    items: canonicalSharingItems(operation, items),
  };
}
