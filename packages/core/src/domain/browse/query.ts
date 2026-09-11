import { BusinessRuleError } from "../error";

export const BROWSE_VERSION = "html5-nfkc-lower-ucd16-v1";
export const TAG_NORMALIZATION_VERSION = "width-nfd-fullcf-nfd-16.0.0";
export const BROWSE_PAGE_SIZE = 50;
export const BROWSE_SORTS = [
  "updated-desc",
  "updated-asc",
  "created-desc",
  "created-asc",
  "title-asc",
  "title-desc",
  "relevance",
] as const;
export type BrowseSort = (typeof BROWSE_SORTS)[number];
export type BrowseLayout = "tile" | "list" | "calendar";
export type SearchTerm = Readonly<{ kind: "ascii" | "text"; value: string }>;
export type SearchQuery = Readonly<{
  raw: string;
  normalized: string;
  terms: readonly SearchTerm[];
}>;

export function searchQuery(value: string): SearchQuery {
  const raw = value.trim();
  if ([...raw].length > 200 || (raw && [...raw].length < 2))
    throw new BusinessRuleError(
      "SEARCH_LENGTH",
      "検索語は2〜200文字で入力してください。",
    );
  const normalized = raw.normalize("NFKC").toLowerCase();
  const pieces =
    normalized.match(/[a-z0-9]+|[^\p{P}\p{Z}\p{C}\p{S}a-z0-9]+/gu) ?? [];
  const terms: SearchTerm[] = [...new Set(pieces)].map((value) => ({
    kind: /^[a-z0-9]+$/.test(value) ? "ascii" : "text",
    value,
  }));
  if (terms.length > 16)
    throw new BusinessRuleError(
      "SEARCH_TERMS",
      "検索語は16語以内にしてください。",
    );
  if (raw && !terms.length)
    throw new BusinessRuleError(
      "SEARCH_TERMS",
      "文字または数字を含む検索語を入力してください。",
    );
  return { raw, normalized, terms };
}

export function searchToken(value: string) {
  return `x${Array.from(value, (c) => c.codePointAt(0)?.toString(16)).join("z")}`;
}
export function searchTokens(value: string): string {
  const tokens = new Set<string>();
  for (const word of value.match(/[a-z0-9]+/g) ?? []) tokens.add(`a${word}`);
  const chars = Array.from(value);
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c !== undefined) tokens.add(searchToken(c));
    const next = chars[i + 1];
    if (c !== undefined && next !== undefined)
      tokens.add(searchToken(c + next));
  }
  return [...tokens].join(" ");
}
export function searchMatch(query: SearchQuery): string {
  return query.terms
    .map((term) => {
      if (term.kind === "ascii") return `a${term.value}*`;
      const chars = Array.from(term.value);
      return chars.length === 1
        ? searchToken(term.value)
        : chars
            .slice(0, -1)
            .map((c, i) => searchToken(c + chars[i + 1]))
            .join(" AND ");
    })
    .join(" AND ");
}
export function exactTerm(value: string, term: SearchTerm): number {
  let offset = value.indexOf(term.value);
  while (offset >= 0) {
    if (
      term.kind === "text" ||
      offset === 0 ||
      !/[a-z0-9]/.test(value[offset - 1] ?? "")
    )
      return offset;
    offset = value.indexOf(term.value, offset + 1);
  }
  return -1;
}
