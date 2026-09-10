export function projectText(source: string, prefix = "") {
  if (!source.startsWith(prefix))
    throw new Error("表示前改行の対応が一致しません。");
  let display = "";
  const offsets = [prefix.length];
  for (let index = prefix.length; index < source.length; index++) {
    const value = source[index];
    if (value === "\r") {
      if (source[index + 1] === "\n") index++;
      display += "\n";
    } else display += value;
    offsets.push(index + 1);
  }
  return { display, offsets };
}
export function editedText(source: string, input: string, prefix = "") {
  const normalized = input.replace(/\r\n?/g, "\n");
  return normalized === projectText(source, prefix).display
    ? source
    : prefix + normalized;
}
export function serializeTextChanges(
  source: string,
  texts: readonly { id: string; value: string; start: number; end: number }[],
  values: ReadonlyMap<string, string>,
) {
  let output = "";
  let offset = 0;
  for (const text of texts) {
    if (
      text.start < offset ||
      text.end < text.start ||
      text.end > source.length
    )
      throw new Error("文字の source 範囲が一致しません。");
    const value = values.get(text.id) ?? text.value;
    output += source.slice(offset, text.start);
    output +=
      value === text.value
        ? source.slice(text.start, text.end)
        : value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    offset = text.end;
  }
  return output + source.slice(offset);
}
