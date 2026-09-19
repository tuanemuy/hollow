import type { ExportFormat } from "@repo/core/application/export/document";

const clean = (value: string) =>
  value
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}<>:"/\\|?*]/gu, "_")
    .trim()
    .replace(/[. ]+$/g, "");

export function exportFilename(
  title: string,
  noteId: string,
  format: ExportFormat,
): string {
  let stem = clean(title);
  if (!stem || /^[._ ]+$/.test(stem)) stem = clean(noteId) || "note";
  if (/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(stem))
    stem = `_${stem}`;
  let limited = "";
  for (const character of stem) {
    if (Buffer.byteLength(limited + character) > 180) break;
    limited += character;
  }
  return `${limited.replace(/[. ]+$/g, "") || "note"}.${format === "html" ? "html" : "md"}`;
}
