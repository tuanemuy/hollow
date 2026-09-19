export type ProfileView = Readonly<{
  actorId: string;
  displayName: string | null;
  nameVersion: number;
  handle: string | null;
  bio: string;
  profileVersion: number;
  url: string | null;
  icon: Readonly<{ id: string; url: string }> | null;
}>;

export type SaveProfileInput = Readonly<{
  displayName: string;
  handle: string | null;
  bio: string;
  nameVersion: number;
  profileVersion: number;
  confirmHandleChange: boolean;
}>;

export type HandleAvailability = Readonly<{
  actorId: string;
  handle: string;
  available: boolean;
  candidates: readonly string[];
}>;

export type WorkspacePublicationView = Readonly<{
  actorId: string;
  workspaceId: string;
  name: string;
  slug: string | null;
  pagePublic: boolean;
  settingsVersion: number;
  publicationVersion: number;
  canEdit: boolean;
  url: string | null;
}>;

export type SetWorkspacePublicationInput = Readonly<{
  workspaceId: string;
  pagePublic: boolean;
  settingsVersion: number;
  publicationVersion: number;
}>;
