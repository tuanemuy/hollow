import type { TagNormalizerPort } from "@repo/core/application/browse/ports";
import { TAG_NORMALIZATION_VERSION } from "@repo/core/domain/browse/query";
import { BusinessRuleError } from "@repo/core/domain/error";
import { widthFoldKey } from "../unicode/fold";
import { UNICODE_VERSION } from "./unicodeData";

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
    return widthFoldKey(name);
  },
};
