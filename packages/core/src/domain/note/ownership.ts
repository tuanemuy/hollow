export type NoteOwnership =
  | Readonly<{ kind: "unbound" }>
  | Readonly<{ kind: "bound"; noteId: string; generation: number }>;
