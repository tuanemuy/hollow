import type { TagImpact, TagStamp, TagSummary } from "../../domain/tag/entity";
import type { ScopeSelection } from "../../domain/workspace/entity";

export type TagReadInput = ScopeSelection &
  (
    | Readonly<{
        purpose: "picker";
        noteId: string;
        query: string;
        cursor?: string | undefined;
      }>
    | Readonly<{
        purpose: "manager";
        query: string;
        unusedOnly: boolean;
        cursor?: string | undefined;
      }>
    | Readonly<{
        purpose: "impact";
        sourceId: string;
        targetId?: string | undefined;
      }>
  );
export type TagReadPage = Readonly<{
  kind: "page";
  purpose: "picker" | "manager";
  scope: Readonly<{ workspaceId: string | null; name: string }>;
  items: readonly TagSummary[];
  selected: readonly Readonly<{ id: string; name: string }>[];
  exact: TagSummary | null;
  unusedTotal: number;
  nextCursor: string | null;
  identity: string;
}>;
export type TagReadResult = TagReadPage | TagImpact;
export interface TagReadPort {
  read(
    sessionHash: string,
    input: TagReadInput,
    signal?: AbortSignal,
  ): Promise<TagReadResult>;
}
export type TagDelta = Readonly<{
  noteId: string;
  expectedScope: ScopeSelection;
  change:
    | { kind: "attach" | "detach"; tagId: string }
    | { kind: "create"; name: string };
}>;
export type TagDeltaResult = Readonly<{
  changed: boolean;
  tags: readonly Readonly<{ id: string; name: string }>[];
}>;
export type TagManagement = Readonly<{
  scope: ScopeSelection;
  action:
    | { kind: "rename"; source: TagStamp; name: string }
    | { kind: "merge"; source: TagStamp; target: TagStamp }
    | { kind: "delete"; source: TagStamp }
    | { kind: "cleanup"; targets: readonly TagStamp[] };
}>;
export type TagManagementResult =
  | Readonly<{ kind: "done"; changed: boolean }>
  | Readonly<{ kind: "merge-required"; impact: TagImpact }>;
