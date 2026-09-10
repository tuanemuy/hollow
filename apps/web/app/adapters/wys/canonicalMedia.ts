import { parseDocument } from "htmlparser2";

export type WysCanonicalAcknowledgement = Readonly<{
  submitted: string;
  canonical: string;
  draftId: string;
  noteId: string;
}>;

const uuid = /^[a-f0-9-]{36}$/i;

export function mediaSources(html: string): ReadonlySet<string> {
  const result = new Set<string>();
  const queue = [...parseDocument(html).children];
  let count = 0;
  while (queue.length) {
    const node = queue.pop();
    if (!node || ++count > 10000) throw new Error("本文の要素上限です。");
    if ("children" in node) queue.push(...node.children);
    if (
      "attribs" in node &&
      ["img", "video", "source"].includes(node.name) &&
      node.attribs.src
    )
      result.add(node.attribs.src);
  }
  return result;
}

export function acknowledgedMediaAliases(
  acknowledgement: WysCanonicalAcknowledgement,
): ReadonlyMap<string, string> {
  const { submitted, draftId, noteId } = acknowledgement;
  const result = new Map<string, string>();
  if (!uuid.test(draftId) || !uuid.test(noteId)) return result;
  const prefix = `/api/drafts/${draftId}/assets/`;
  if (!submitted.includes(prefix)) return result;
  for (const src of mediaSources(submitted)) {
    if (src.startsWith(prefix) && uuid.test(src.slice(prefix.length)))
      result.set(
        src,
        `/api/notes/${noteId}/assets/${src.slice(prefix.length)}`,
      );
  }
  return result;
}

export function rewriteAcknowledgedMedia(
  html: string,
  aliases: ReadonlyMap<string, string>,
): string {
  if (!aliases.size || !html.includes("/api/drafts/")) return html;
  const queue = [...parseDocument(html, { withStartIndices: true }).children];
  const edits: { start: number; end: number; value: string }[] = [];
  let count = 0;
  while (queue.length) {
    const node = queue.pop();
    if (!node || ++count > 10000) throw new Error("本文の要素上限です。");
    if ("children" in node) queue.push(...node.children);
    if (!("attribs" in node) || !["img", "video", "source"].includes(node.name))
      continue;
    const src = node.attribs.src;
    const target = src ? aliases.get(src) : undefined;
    if (!src || !target || node.startIndex === null) continue;
    const opening = /^<[a-z]+\s(?:[^>"']|"[^"]*"|'[^']*')*>/i.exec(
      html.slice(node.startIndex),
    )?.[0];
    if (!opening) continue;
    const attribute =
      /\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    for (const match of opening.matchAll(attribute)) {
      if (
        match[1]?.toLowerCase() !== "src" ||
        (match[2] ?? match[3] ?? match[4]) !== src
      )
        continue;
      const valueOffset =
        match[0].length - src.length - (match[4] === undefined ? 1 : 0);
      const start = node.startIndex + match.index + valueOffset;
      edits.push({ start, end: start + src.length, value: target });
    }
  }
  let result = html;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
  if (new TextEncoder().encode(result).byteLength > 800 * 1024)
    throw new Error(
      "置換後の完全HTMLが800KiBを超えます。直前の本文を保持しています。",
    );
  return result;
}
