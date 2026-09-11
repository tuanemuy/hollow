import type { TextPart } from "@repo/core/application/browse/ports";
import { Fragment } from "react";

export function limitTextParts(
  parts: readonly TextPart[],
  limit: number,
): readonly TextPart[] {
  let remaining = limit;
  const result: TextPart[] = [];
  for (const part of parts) {
    if (remaining <= 0) break;
    const chars = Array.from(part.text);
    const text = chars.slice(0, remaining).join("");
    if (text) result.push({ text, match: part.match });
    remaining -= chars.length;
  }
  return result;
}
export function HighlightedText({
  parts,
  excerpt = false,
}: {
  parts: readonly TextPart[];
  excerpt?: boolean;
}) {
  let offset = 0;
  const visible = excerpt ? limitTextParts(parts, 160) : parts;
  return visible
    .filter((part) => part.text.length > 0)
    .map((part) => {
      const key = offset;
      offset += part.text.length;
      return part.match ? (
        <mark key={key}>{part.text}</mark>
      ) : (
        <Fragment key={key}>{part.text}</Fragment>
      );
    });
}
