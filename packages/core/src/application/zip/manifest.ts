import { ZIP_MANIFEST_NAME } from "@repo/core/domain/zip/entity";

const reasons: Readonly<Record<string, string>> = {
  ZIP_NOTE_UNAVAILABLE: "閲覧不可または削除済み",
  ZIP_CONTENT_CHANGED: "内容が変更されたため除外",
  ZIP_SOURCE_CHANGED: "素材を確認できなかったため除外",
  ZIP_CHILD_DEADLINE: "子処理の時間制限",
  EXPORT_EMPTY: "本文なし",
  ZIP_CANCELLED: "取消済み",
};
export function zipManifest(
  failures: readonly Readonly<{ ordinal: number; reason: string }>[],
) {
  const lines = [
    "Hollow export report",
    ...[...failures]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map(
        (item) =>
          `${item.ordinal + 1}\t${reasons[item.reason] ?? "書き出しに失敗"}`,
      ),
  ];
  return {
    name: ZIP_MANIFEST_NAME,
    bytes: new TextEncoder().encode(lines.join("\n") + "\n"),
  };
}
