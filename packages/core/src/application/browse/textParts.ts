import { exactTerm, type SearchQuery } from "../../domain/browse/query";
import type { ProjectedText, TextPart } from "./ports";

export function matchedParts(
  text: ProjectedText,
  query: SearchQuery,
): readonly TextPart[] {
  const chars = Array.from(text.display);
  const marked = new Set<number>();
  for (const term of query.terms) {
    let base = 0;
    while (base < text.normalized.length) {
      const offset = exactTerm(text.normalized.slice(base), term);
      if (offset < 0) break;
      const at = base + offset;
      if (
        term.kind === "ascii" &&
        at > 0 &&
        /[a-z0-9]/.test(text.normalized[at - 1] ?? "")
      ) {
        base = at + term.value.length;
        continue;
      }
      const start = Array.from(text.normalized.slice(0, at)).length;
      const end = start + Array.from(term.value).length;
      for (const [ns, ne, ds, de] of text.segments) {
        if (ne <= start || ns >= end) continue;
        const from = ne - ns === de - ds ? ds + Math.max(0, start - ns) : ds;
        const to = ne - ns === de - ds ? ds + Math.min(ne - ns, end - ns) : de;
        for (let i = from; i < to; i++) marked.add(i);
      }
      base = at + term.value.length;
    }
  }
  const parts: { text: string; match: boolean }[] = [];
  chars.forEach((c, i) => {
    const match = marked.has(i);
    const last = parts.at(-1);
    if (last?.match === match) last.text += c;
    else parts.push({ text: c, match });
  });
  return parts;
}
