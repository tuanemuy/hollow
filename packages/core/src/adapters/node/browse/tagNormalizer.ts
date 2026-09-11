import type { TagNormalizerPort } from "@repo/core/application/browse/ports";
import { TAG_NORMALIZATION_VERSION } from "@repo/core/domain/browse/query";
import { BusinessRuleError } from "@repo/core/domain/error";
import { FOLD_MAPPING, UNICODE_VERSION, WIDTH_MAPPING } from "./unicodeData";

function mapped(text: string, table: Readonly<Record<string, string>>) {
  return Array.from(text, (c) => {
    const key =
      c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0") ?? "";
    const value = table[key];
    return value
      ? value
          .split(" ")
          .map((code) => String.fromCodePoint(Number.parseInt(code, 16)))
          .join("")
      : c;
  }).join("");
}

export function assertTagNormalizerUnicodeVersion(
  version: string | undefined,
): void {
  if (version !== UNICODE_VERSION.split(".").slice(0, 2).join(".")) {
    throw new BusinessRuleError(
      "UNICODE_VERSION",
      "タグ正規化のUnicode版が一致しません。実行環境を確認してください。",
    );
  }
}

export const NodeTagNormalizer: TagNormalizerPort = {
  version: TAG_NORMALIZATION_VERSION,
  key(name) {
    return mapped(
      mapped(name, WIDTH_MAPPING).normalize("NFD"),
      FOLD_MAPPING,
    ).normalize("NFD");
  },
};
