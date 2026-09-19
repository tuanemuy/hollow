export type PublicNoteIdentity = Readonly<{
  noteId: string;
  publicId: string;
  urlGeneration: number;
  accessEpoch: number;
  createdAt: Date;
}>;

export type WorkspacePublication = Readonly<{
  workspaceId: string;
  pagePublic: boolean;
  version: number;
}>;

export function publicNotePath(
  identity: Pick<PublicNoteIdentity, "publicId" | "urlGeneration">,
): string {
  return `/p/${identity.publicId}/${identity.urlGeneration}`;
}
