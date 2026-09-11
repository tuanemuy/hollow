import type { NoteOwner } from "@repo/core/domain/note/entity";

export type MoveScope = Readonly<{
  owner: NoteOwner;
  name: string;
  membershipRevision: number;
}>;
export type MoveTag = Readonly<{ id: string; key: string; name: string }>;
export type MoveTagMapping = Readonly<{
  source: MoveTag;
  destination: MoveTag | null;
}>;
export type ResourceAmount = Readonly<{ count: number; bytes: number }>;
export type MoveResources = Readonly<{
  originals: ResourceAmount;
  currentAssets: ResourceAmount;
  heldAssets: ResourceAmount;
  graceAssets: ResourceAmount;
  mediaReservations: ResourceAmount;
  referenceReservations: ResourceAmount;
}>;
export type BundleHolding =
  | Readonly<{ kind: "absent" }>
  | Readonly<{
      kind: "present";
      revision: number;
      noteHolds: number;
      admissionHolds: number;
      cleanupHolds: number;
    }>;
export type MoveExpected = Readonly<{
  noteId: string;
  version: number;
  ownershipGeneration: number;
  resourceRevision: number;
  source: MoveScope;
  destination: MoveScope;
  normalizationVersion: "16.0.0";
  tags: readonly MoveTagMapping[];
  resources: MoveResources;
  bundle: Readonly<{
    id: string;
    contentRevision: number;
    bytes: number;
    source: BundleHolding;
    destination: BundleHolding;
  }> | null;
  sourceRelease: number;
  destinationIncrease: number;
}>;
export type MovePerson = Readonly<{ id: string; label: string }>;
export type MoveAudiencePage = Readonly<{
  direction: "gained" | "lost";
  total: number;
  items: readonly MovePerson[];
  next: string | null;
}>;
export type MovePreview = Readonly<{
  expected: MoveExpected;
  sourceCapacity: Readonly<{ used: number; limit: number; after: number }>;
  destinationCapacity: Readonly<{ used: number; limit: number; after: number }>;
  gained: MoveAudiencePage;
  lost: MoveAudiencePage;
  interrupted: Readonly<{ mediaUploads: number; referenceJobs: number }>;
}>;
export interface NoteMoveRepository {
  destinations(
    accountId: string,
    source: NoteOwner,
    after: string | undefined,
  ): Promise<Readonly<{ items: readonly MoveScope[]; next: string | null }>>;
  inspect(
    noteId: string,
    destination: NoteOwner,
    now: Date,
  ): Promise<MoveExpected>;
  audience(
    expected: MoveExpected,
    direction: "gained" | "lost",
    after: string | undefined,
  ): Promise<MoveAudiencePage>;
  interruptions(noteId: string): Promise<MovePreview["interrupted"]>;
  hasConversion(noteId: string): Promise<boolean>;
  apply(expected: MoveExpected, now: Date): Promise<void>;
}
