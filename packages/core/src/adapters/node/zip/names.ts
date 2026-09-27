import type { ZipNames } from "@repo/core/application/zip/names";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  ZIP_MANIFEST_NAME,
  ZIP_MAX_TARGETS,
} from "@repo/core/domain/zip/entity";
import { widthFoldKey } from "../unicode/fold";

const MAX_BYTES = 200;
const invalid = () =>
  new BusinessRuleError(
    "ZIP_ENTRY_NAMES",
    "ZIP内のファイル名を割り当てられませんでした。",
  );

function truncate(value: string, bytes: number): string {
  let result = "";
  let length = 0;
  for (const character of value) {
    const size = Buffer.byteLength(character);
    if (length + size > bytes) break;
    result += character;
    length += size;
  }
  return result;
}

function composeName(
  stem: string,
  extension: string,
  suffix: string,
  ordinal: number,
) {
  const budget = MAX_BYTES - Buffer.byteLength(extension + suffix);
  if (budget < 1) throw invalid();
  let value = truncate(stem, budget).replace(/[. ]+$/g, "");
  if (!value || /^[._ ]+$/.test(value))
    value = truncate(`note-${ordinal + 1}`, budget);
  if (
    /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/.test(
      widthFoldKey(value),
    )
  )
    value = truncate(`_${value}`, budget);
  return `${value}${suffix}${extension}`;
}

function prepare(filename: string, ordinal: number) {
  const cleaned = filename
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}\p{Cs}<>:"/\\|?*]/gu, "_")
    .trim()
    .replace(/[. ]+$/g, "");
  const dot = cleaned.lastIndexOf(".");
  const extension = dot > 0 ? cleaned.slice(dot) : "";
  const stem = (dot > 0 ? cleaned.slice(0, dot) : cleaned)
    .trim()
    .replace(/[. ]+$/g, "");
  return {
    ordinal,
    stem,
    extension,
    filename: composeName(stem, extension, "", ordinal),
  };
}

export const NodeZipNames: ZipNames = {
  allocate(entries) {
    if (!Array.isArray(entries) || entries.length > ZIP_MAX_TARGETS)
      throw invalid();
    const ordinals = new Set<number>();
    const prepared = Array.from(entries, (entry) => {
      if (
        !entry ||
        !Number.isInteger(entry.ordinal) ||
        entry.ordinal < 0 ||
        entry.ordinal >= ZIP_MAX_TARGETS ||
        ordinals.has(entry.ordinal) ||
        typeof entry.filename !== "string"
      )
        throw invalid();
      ordinals.add(entry.ordinal);
      return prepare(entry.filename, entry.ordinal);
    });
    prepared.sort((a, b) => a.ordinal - b.ordinal);
    const used = new Set([widthFoldKey(ZIP_MANIFEST_NAME)]);
    const reserved = new Set([
      ...used,
      ...prepared.map((entry) => widthFoldKey(entry.filename)),
    ]);
    return prepared.map((entry) => {
      let filename = entry.filename;
      if (used.has(widthFoldKey(filename))) {
        let suffix = 2;
        do {
          filename = composeName(
            entry.stem,
            entry.extension,
            ` (${suffix})`,
            entry.ordinal,
          );
          suffix++;
        } while (
          reserved.has(widthFoldKey(filename)) ||
          used.has(widthFoldKey(filename))
        );
      }
      used.add(widthFoldKey(filename));
      return { ordinal: entry.ordinal, filename };
    });
  },
};
