import type {
  BROWSE_VERSION,
  BrowseLayout,
  BrowseSort,
  SearchQuery,
} from "../../domain/browse/query";
import type { Original } from "../../domain/import/entity";
import type { NoteOwner } from "../../domain/note/entity";

export type BrowseConditions = Readonly<{
  workspaceId?: string | undefined;
  query: string;
  tags: readonly string[];
  month?: string | undefined;
  zone: string;
  sort: BrowseSort;
  layout: BrowseLayout;
  cursor?: string | undefined;
  day?: string | undefined;
}>;
export type CivilRange = Readonly<{ start: number; end: number }>;
export interface CivilDatePort {
  month(
    month: string,
    zone: string,
  ): Readonly<{
    range: CivilRange;
    days: readonly Readonly<{ date: string; range: CivilRange }>[];
  }>;
  currentMonth(now: Date, zone: string): string;
}
export type BrowseTag = Readonly<{ id: string; name: string; count: number }>;
export type TextPart = Readonly<{ text: string; match: boolean }>;
export type BrowseNote = Readonly<{
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: Original["state"];
  titleParts: readonly TextPart[];
  excerpt: readonly TextPart[];
  thumbnailUrl: string | null;
  mediaLabel: string | null;
  tags: readonly Readonly<{ id: string; name: string }>[];
}>;
export type BrowseScope = Readonly<{
  workspaceId: string | null;
  name: string;
  canEdit: boolean;
  iconId?: string | null | undefined;
}>;
export type BrowsePage = Readonly<{
  items: readonly BrowseNote[];
  nextCursor: string | null;
  scope: BrowseScope;
  usage: Readonly<{ usedBytes: number; limitBytes: number; updatedAt: string }>;
  total: number;
  conditions: BrowseConditions;
  identity: string;
  selectedTags: readonly Readonly<{ id: string; name: string | null }>[];
  calendar: readonly Readonly<{
    date: string;
    count: number;
    items: readonly BrowseNote[];
    nextCursor: string | null;
  }>[];
}>;
export type BrowseRequest =
  | Readonly<{
      sessionHash: string;
      conditions: BrowseConditions;
      kind: "notes";
    }>
  | Readonly<{
      sessionHash: string;
      conditions: BrowseConditions;
      kind: "tags";
      tagQuery: string;
      tagCursor?: string | undefined;
    }>;
export type BrowseResponse =
  | Readonly<{ kind: "notes"; page: BrowsePage }>
  | Readonly<{
      kind: "tags";
      items: readonly BrowseTag[];
      nextCursor: string | null;
    }>;
export interface SearchExecutionPort {
  execute(
    request: BrowseRequest,
    signal?: AbortSignal,
  ): Promise<BrowseResponse>;
  stop(): Promise<void>;
}
export interface BrowseReadSnapshotPort {
  read(request: BrowseRequest): Promise<BrowseResponse>;
}
export type ProjectionSegment = readonly [
  normalizedStart: number,
  normalizedEnd: number,
  displayStart: number,
  displayEnd: number,
];
export type ProjectedText = Readonly<{
  display: string;
  normalized: string;
  segments: readonly ProjectionSegment[];
  words: readonly (readonly [word: string, codePointOffset: number])[];
}>;
export type NoteProjection = Readonly<{
  version: typeof BROWSE_VERSION;
  sourceTitle: string;
  sourceHtml: string;
  title: ProjectedText;
  body: ProjectedText;
  tokens: string;
  leadImage: string | null;
  mediaLabel: string | null;
}>;
export interface NoteProjectionPort {
  project(
    input: Readonly<{ title: string; html: string }>,
    signal?: AbortSignal,
  ): Promise<NoteProjection>;
}
export interface BrowseIndexRepository {
  tagsForNote(
    noteId: string,
    scope: NoteOwner,
  ): Promise<readonly Readonly<{ id: string; name: string }>[]>;
  save(
    noteId: string,
    noteVersion: number,
    projection: NoteProjection,
  ): Promise<void>;
  sourceMatches(noteId: string, title: string, html: string): Promise<boolean>;
  remove(noteId: string): Promise<void>;
  pending(
    limit: number,
    after?: string,
  ): Promise<
    readonly Readonly<{
      id: string;
      version: number;
      title: string;
      html: string;
    }>[]
  >;
}
export interface TagNormalizerPort {
  readonly version: string;
  key(name: string): string;
}
export type AuthorizedBrowse = Readonly<{
  scope: NoteOwner;
  accountId: string;
  query: SearchQuery;
}>;
