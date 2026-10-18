import type { ExternalRenderSources } from "@repo/core/application/ports/htmlSanitizer";
import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import {
  escapeAttribute,
  NO_EXTERNAL_SOURCES,
  noteContentSecurityPolicy,
  noteDefaultStyle,
} from "../components/hollow/editorMedia";

/**
 * Waits for every image (lazy ones included) and font, then opens the
 * browser's print dialog once on arrival and again on each button press.
 */
export const NOTE_PRINT_SCRIPT =
  'document.addEventListener("DOMContentLoaded",()=>{const bar=document.querySelector("hollow-print-bar");const button=bar&&bar.shadowRoot&&bar.shadowRoot.querySelector("button");let busy=false;const settle=(image)=>image.complete?null:new Promise((done)=>{image.addEventListener("load",done,{once:true});image.addEventListener("error",done,{once:true})});const run=async()=>{if(busy)return;busy=true;try{const images=[...document.images];for(const image of images)image.loading="eager";await Promise.race([Promise.all(images.map(settle)),new Promise((done)=>setTimeout(done,15000))]);await document.fonts.ready;print()}finally{busy=false}};if(button)button.addEventListener("click",()=>{void run()});void run()},{once:true});';
export const NOTE_PRINT_SCRIPT_HASH =
  "sha256-qDNDODDK/PrFnlKFBiSk+VT79hyrDlX9s6WXf9w7rs8=";

export const PRINT_PDF_HINT =
  "印刷の送信先で「PDF に保存」を選ぶと PDF として保存できます。";

/** Shown instead of a reading page when that page itself is printed. */
export const READING_PRINT_NOTICE =
  "このページは印刷用ではありません。印刷用の表示を開いてから印刷してください。";
export const readingPrintNotice = `<p class="hollow-print-notice">${READING_PRINT_NOTICE}</p>`;

export type NotePrintSource = Readonly<{
  title: string;
  html: string;
  assetUrls: readonly string[];
  externalSources: ExternalRenderSources;
  displayStyle: DisplayStyle;
}>;

/** Values from `spec/design/tokens.md`; the shadow root keeps note CSS out. */
const BAR_STYLE =
  ':host{all:initial!important;display:block!important;margin:0 0 var(--space-6)!important;--color-bg:#fff;--color-surface:#f5f5f7;--color-surface-elevated:#fbfbfd;--color-ink:#1d1d1f;--color-ink-secondary:#6e6e73;--color-hairline:rgba(60,60,67,0.12);--color-accent:oklch(37.1% 0 0);--color-accent-hover:oklch(43.9% 0 0);--font-sans:"Helvetica Neue",Arial,"Hiragino Kaku Gothic ProN","Hiragino Sans",Meiryo,sans-serif;--text-sm:clamp(12px,0.8vw + 10px,13px);--space-2:8px;--space-3:12px;--space-4:16px;--space-6:24px;--radius-sm:8px}div{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2) var(--space-3);padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-hairline);background:var(--color-surface-elevated);color:var(--color-ink);font:var(--text-sm)/1.7 var(--font-sans)}button,a{box-sizing:border-box;display:inline-flex;align-items:center;min-height:44px;padding:9px 18px;border:1px solid var(--color-hairline);border-radius:var(--radius-sm);background:var(--color-bg);color:inherit;font:inherit;text-decoration:none;touch-action:manipulation}a:hover{background:var(--color-surface)}button{cursor:pointer;border-color:var(--color-accent);background:var(--color-accent);color:#fff}button:hover{background:var(--color-accent-hover)}p{margin:0;flex-basis:100%;color:var(--color-ink-secondary)}@media print{:host{display:none!important}}';

/** On screen the body keeps the reading column; paper width governs print. */
const SCREEN_COLUMN_STYLE =
  "<style>@media screen{body{margin-inline:max(24px,calc((100% - 680px) / 2))}}</style>";

const bar = (backHref: string, printable: boolean) =>
  `<hollow-print-bar><template shadowrootmode="open"><style>${BAR_STYLE}</style><div>${printable ? '<button type="button">印刷する</button>' : ""}<a href="${escapeAttribute(backHref)}">ノートに戻る</a><p>${printable ? PRINT_PDF_HINT : "本文が空のため印刷できません。変換または本文の保存が終わってからやり直してください。"}</p></div></template></hollow-print-bar>`;

/**
 * The print view is the note body itself as the top-level document, not the
 * reading page's iframe: Chromium prints an iframe as a slice of the parent
 * page, pushing it past a blank first page and cutting lines at page edges.
 */
export function notePrintDocument(
  source: NotePrintSource,
  origin: string,
  backHref: string,
): { html: string; contentSecurityPolicy: string } {
  const printable = source.html.trim() !== "";
  const policy = printable
    ? noteContentSecurityPolicy(
        source.assetUrls,
        origin,
        source.externalSources,
        `'${NOTE_PRINT_SCRIPT_HASH}'`,
      )
    : noteContentSecurityPolicy([], origin, NO_EXTERNAL_SOURCES, "'none'");
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><title>${escapeAttribute(source.title)}</title>${printable ? `<script>${NOTE_PRINT_SCRIPT}</script>${noteDefaultStyle(source.displayStyle)}${SCREEN_COLUMN_STYLE}` : ""}`;
  return {
    html: `<!doctype html><html lang="ja"><head>${head}</head><body>${bar(backHref, printable)}${printable ? source.html : ""}</body></html>`,
    contentSecurityPolicy: `${policy}; frame-ancestors 'none'; sandbox allow-same-origin allow-scripts allow-modals`,
  };
}

export function notePrintResponse(
  request: Request,
  source: NotePrintSource,
  origin: string,
  backHref: string,
): Response {
  const document = notePrintDocument(source, origin, backHref);
  return new Response(request.method === "HEAD" ? null : document.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": document.contentSecurityPolicy,
    },
  });
}
