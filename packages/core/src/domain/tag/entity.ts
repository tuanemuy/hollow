import { BusinessRuleError } from "../error";
import type { NoteOwner } from "../note/entity";

declare const tagNameBrand: unique symbol;
export type TagName = string & { readonly [tagNameBrand]: true };
export function tagName(value: string): TagName {
  const name = value.trim();
  if (!name || [...name].length > 50)
    throw new BusinessRuleError(
      "TAG_NAME",
      "タグ名は1〜50文字で入力してください。",
    );
  return name as TagName;
}
export const tagScopeKey = (scope: NoteOwner) =>
  scope.kind === "personal" ? `p:${scope.accountId}` : `w:${scope.workspaceId}`;
export type Tag = Readonly<{
  id: string;
  scopeKey: string;
  name: string;
  normalizedKey: string;
  meaningVersion: string;
  mutationRevision: number;
}>;
export type TagStamp = Readonly<{ id: string; revision: number }>;
export type TagCounts = Readonly<{
  active: number;
  trashed: number;
  purging: number;
  total: number;
}>;
export type TagSummary = Readonly<{
  id: string;
  name: string;
  key: string;
  normalizationVersion: string;
  revision: number;
}> &
  TagCounts;
export type TagImpact = Readonly<{
  kind: "impact";
  source: TagSummary;
  target: TagSummary | null;
  overlap: number;
  affected: number;
}>;
