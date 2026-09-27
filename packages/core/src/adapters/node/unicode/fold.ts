import { FOLD_MAPPING, WIDTH_MAPPING } from "./unicodeData";

function mapped(text: string, table: Readonly<Record<string, string>>) {
  return Array.from(text, (character) => {
    const key =
      character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0") ??
      "";
    const value = table[key];
    return value
      ? value
          .split(" ")
          .map((code) => String.fromCodePoint(Number.parseInt(code, 16)))
          .join("")
      : character;
  }).join("");
}

export function widthFoldKey(value: string): string {
  return mapped(
    mapped(value, WIDTH_MAPPING).normalize("NFD"),
    FOLD_MAPPING,
  ).normalize("NFD");
}
