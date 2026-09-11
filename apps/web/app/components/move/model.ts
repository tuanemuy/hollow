import type { MoveExpected } from "@repo/core/application/move/ports";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { extractSerializedError } from "@/presentation/errorResponse";

export function moveScopeKey(owner: NoteOwner): string {
  return owner.kind === "personal"
    ? `personal:${owner.accountId}`
    : `workspace:${owner.workspaceId}`;
}

export function moveSourceMatches(
  expected: MoveExpected,
  note: { id: string; version: number; workspaceId: string | null },
): boolean {
  return (
    expected.noteId === note.id &&
    expected.version === note.version &&
    (expected.source.owner.kind === "personal"
      ? note.workspaceId === null
      : expected.source.owner.workspaceId === note.workspaceId)
  );
}

export function moveExpectedInput(expected: MoveExpected) {
  return {
    ...expected,
    tags: expected.tags.map((mapping) => ({ ...mapping })),
  };
}

export function moveFailure(error: unknown) {
  const serialized = extractSerializedError(error);
  if (
    serialized.kind === "unauthorized" ||
    serialized.kind === "forbidden" ||
    serialized.kind === "notFound"
  )
    return "access" as const;
  if (serialized.code === "MOVE_CHANGED") return "changed" as const;
  if (serialized.code === "MOVE_QUOTA") return "quota" as const;
  if (serialized.code === "MOVE_CONVERSION_ACTIVE")
    return "conversion" as const;
  if (serialized.kind === "system" || serialized.kind === "unknown")
    return "unknown" as const;
  return "rejected" as const;
}

export function acceptsMoveResponse(
  current: { context: string; request: symbol | null; mounted: boolean },
  incoming: { context: string; request: symbol },
) {
  return (
    current.mounted &&
    current.context === incoming.context &&
    current.request === incoming.request
  );
}

export const moveBytes = (bytes: number) =>
  `${bytes.toLocaleString("ja-JP")} bytes`;
