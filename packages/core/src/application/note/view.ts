import type { ImportNotice, Original } from "@repo/core/domain/import/entity";
import type { Note } from "@repo/core/domain/note/entity";

export type NoteView = Readonly<{
  scope?: Readonly<{
    workspaceId: string | null;
    name: string;
    canEdit: boolean;
  }>;
  creator?: NonNullable<Note["creator"]>;
  creatorDisplay?:
    | Readonly<{ kind: "label"; label: string }>
    | Readonly<{ kind: "unavailable" | "unknown" }>;
  tags?: readonly Readonly<{ id: string; name: string }>[];
  id: string;
  title: string;
  html: string;
  display: Note["display"];
  version: number;
  createdAt: string;
  updatedAt: string;
  visibility: Note["visibility"];
  status: Original["state"];
  original?: Readonly<{
    id: string;
    name: string;
    bytes: number;
    format: Original["format"];
    coverage: Original["coverage"];
    notices: readonly ImportNotice[];
  }>;
}>;

export function toNoteView(
  note: Note,
  original?: Original | null,
  notices: readonly ImportNotice[] = [],
): NoteView {
  return {
    id: note.id,
    creator: note.creator ?? { kind: "unknown" },
    title: note.title,
    html: note.html,
    display: note.display,
    version: note.version,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    visibility: note.visibility,
    status: original?.state ?? note.status,
    ...(original
      ? {
          original: {
            id: original.id,
            name: original.name,
            bytes: original.bytes,
            format: original.format,
            coverage: original.coverage,
            notices,
          },
        }
      : {}),
  };
}
