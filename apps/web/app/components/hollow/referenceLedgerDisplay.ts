import type { ReferenceReaderEntry } from "@repo/core/application/reference/view";

const states = {
  acquired: "取得済み",
  unattempted: "未試行",
  failed: "取得失敗",
  limited: "制限で未適用",
  external: "取得対象外の依存",
  cancelled: "取消済み",
} as const;
const kinds = {
  image: "画像",
  video: "動画",
  stylesheet: "CSS",
  background: "背景画像",
  font: "フォント",
} as const;

export function referenceLedgerDisplay(
  entries: readonly ReferenceReaderEntry[],
) {
  const current = entries.filter((entry) => entry.current);
  return {
    summary: `現在 ${current.length} 件 · 取得済み ${current.filter((entry) => entry.state === "acquired").length} 件 · 未取得 ${current.filter((entry) => ["failed", "unattempted", "limited", "cancelled"].includes(entry.state)).length} 件 · 外部依存 ${current.filter((entry) => entry.state === "external").length} 件`,
    rows: entries.map((entry) => ({
      status: `${entry.kind === "stylesheet" && !entry.current && entry.state === "limited" ? "安全化・CSS除去" : kinds[entry.kind]} · ${states[entry.state]}${entry.current ? "" : " · 過去の参照"}${entry.bytes ? ` · ${(entry.bytes / 1024).toFixed(1)} KB` : ""}`,
      source:
        entry.source.kind === "data"
          ? `data URI（${entry.source.mediaType}）`
          : entry.source.url,
      reason: entry.reason,
    })),
  };
}
