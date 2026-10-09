import type { ReferenceReaderEntry } from "@repo/core/application/reference/view";
import { escapeAttribute } from "../components/hollow/editorMedia";
import { referenceLedgerDisplay } from "../components/hollow/referenceLedgerDisplay";

export function referenceLedgerHtml(entries: readonly ReferenceReaderEntry[]) {
  const display = referenceLedgerDisplay(entries);
  return `<section id="reference-ledger" aria-label="参照リソースの記録"><h2>参照リソース</h2><p>${escapeAttribute(display.summary)}</p><p>取得済みの内容と取得結果の記録です。背景画像・フォントは外部依存として残ります。CSSを取得できなかった場合や除去した場合は、装飾が異なることがあります。</p>${display.rows.length ? `<ul>${display.rows.map((row) => `<li><p>${escapeAttribute(row.status)}</p><p>${escapeAttribute(row.source)}</p>${row.reason ? `<p>${escapeAttribute(row.reason)}</p>` : ""}</li>`).join("")}</ul>` : "<p>参照リソースはありません。</p>"}</section>`;
}
