import type { ExternalRenderSources } from "@repo/core/application/ports/htmlSanitizer";
import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import {
  escapeAttribute,
  noteContentSecurityPolicy,
  noteDefaultStyle,
} from "../components/hollow/editorMedia";
import layoutCss from "../styles/layout.css?raw";
import {
  PRINT_ACTION_LABEL,
  PRINT_FAILURE_MESSAGE,
  PRINT_NOTICE_CLASS,
  PRINT_PDF_HINT,
  READING_PRINT_NOTICE,
} from "./notePrintText";

/**
 * Waits for every image (lazy ones, CSS backgrounds and video posters
 * included) and font, for 15 seconds at most, then opens the browser's print
 * dialog once on arrival and again on each button press. The cap covers the
 * fonts too: `document.fonts.ready` does not settle before the page's load
 * event, which a slow image holds back.
 * The button stays disabled, saying so, while it waits.
 */
export const NOTE_PRINT_SCRIPT =
  'document.addEventListener("DOMContentLoaded",()=>{const bar=document.querySelector("hollow-print-bar");const button=bar&&bar.shadowRoot&&bar.shadowRoot.querySelector("button");const label=button?button.textContent:"";const settle=(image)=>image.complete?null:new Promise((done)=>{image.addEventListener("load",done,{once:true});image.addEventListener("error",done,{once:true})});const pictures=()=>{const urls=new Set();for(const element of document.querySelectorAll("body *"))for(const pseudo of [null,"::before","::after"])for(const match of getComputedStyle(element,pseudo).backgroundImage.matchAll(/url\\("([^"]*)"\\)/g))urls.add(match[1]);for(const video of document.querySelectorAll("video[poster]"))urls.add(video.poster);return [...urls].map((url)=>{const image=new Image();image.src=url;return image})};const run=async()=>{if(button){if(button.disabled)return;button.disabled=true;button.textContent="画像を読み込んでいます…"}try{const images=[...document.images];for(const image of images)image.loading="eager";await Promise.race([Promise.all([...images,...pictures()].map(settle)).then(()=>document.fonts.ready),new Promise((done)=>setTimeout(done,15000))]);print()}finally{if(button){button.disabled=false;button.textContent=label}}};if(button)button.addEventListener("click",()=>{void run()});void run()},{once:true});';
export const NOTE_PRINT_SCRIPT_HASH =
  "sha256-qPOUU3l+/ocf/GVZqoyZmwqaOt0iMXmm0D6wzYsgl7g=";

export const readingPrintNotice = `<p class="${PRINT_NOTICE_CLASS}">${READING_PRINT_NOTICE}</p>`;

/** The fields every reading of a note (app, public, shared) already returns. */
export type NotePrintSource = Readonly<{
  title: string;
  html: string;
  assetUrls: readonly string[];
  externalSources: ExternalRenderSources;
  display: Readonly<{ style: DisplayStyle }>;
}>;

const contentMax = /--content-max:\s*([^;]+);/.exec(layoutCss)?.[1];
if (!contentMax) throw new Error("layout.css must define --content-max");

/** On screen the body keeps the reading column; paper width governs print. */
const screenColumnStyle = `<style>@media screen{body{margin-inline:max(24px,calc((100% - ${contentMax}) / 2))}}</style>`;

/** Values from `spec/design/tokens.md`; the shadow root keeps note CSS out. */
const BAR_STYLE =
  ':host{all:initial!important;display:block!important;margin:0 0 var(--space-6)!important;--color-bg:#fff;--color-surface:#f5f5f7;--color-surface-elevated:#fbfbfd;--color-ink:#1d1d1f;--color-ink-secondary:#6e6e73;--color-hairline:rgba(60,60,67,0.12);--color-accent:oklch(37.1% 0 0);--color-accent-hover:oklch(43.9% 0 0);--font-sans:"Helvetica Neue",Arial,"Hiragino Kaku Gothic ProN","Hiragino Sans",Meiryo,sans-serif;--text-sm:clamp(12px,0.8vw + 10px,13px);--space-2:8px;--space-3:12px;--space-4:16px;--space-6:24px;--radius-md:8px;--opacity-disabled:0.55}div{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2) var(--space-3);padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-hairline);background:var(--color-surface-elevated);color:var(--color-ink);font:var(--text-sm)/1.7 var(--font-sans)}button,a{box-sizing:border-box;display:inline-flex;align-items:center;min-height:44px;padding:9px 18px;border:1px solid var(--color-hairline);border-radius:var(--radius-md);background:var(--color-bg);color:inherit;font:inherit;text-decoration:none;touch-action:manipulation}a:hover{background:var(--color-surface)}button{cursor:pointer;border-color:var(--color-accent);background:var(--color-accent);color:#fff}button:hover{background:var(--color-accent-hover)}button:disabled{cursor:default;opacity:var(--opacity-disabled)}p{margin:0;flex-basis:100%;color:var(--color-ink-secondary)}@media print{:host{display:none!important}}';

const bar = (content: string) =>
  `<hollow-print-bar><template shadowrootmode="open"><style>${BAR_STYLE}</style>${content}</template></hollow-print-bar>`;
const backLink = (backHref: string) =>
  `<a href="${escapeAttribute(backHref)}">ノートに戻る</a>`;

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
  const policy = noteContentSecurityPolicy(
    source.assetUrls,
    origin,
    source.externalSources,
    `'${NOTE_PRINT_SCRIPT_HASH}'`,
  );
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><title>${escapeAttribute(source.title)}</title><script>${NOTE_PRINT_SCRIPT}</script>${noteDefaultStyle(source.display.style)}${screenColumnStyle}`;
  return {
    html: `<!doctype html><html lang="ja"><head>${head}</head><body>${bar(`<div role="toolbar" aria-label="印刷"><button type="button">${PRINT_ACTION_LABEL}</button>${backLink(backHref)}<p>${PRINT_PDF_HINT}</p></div>`)}${source.html}</body></html>`,
    contentSecurityPolicy: `${policy}; frame-ancestors 'none'; sandbox allow-same-origin allow-scripts allow-modals`,
  };
}

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

/**
 * Sends the reader back to the entry page, which already shows why the note
 * cannot be printed. Each entry decides with the same body it offers the
 * print link for.
 */
export const returnToEntry = (backHref: string) =>
  new Response(null, {
    status: 303,
    headers: { ...privateHeaders, Location: backHref },
  });

/** The print view's own toolbar, saying it could not open, with the way back. */
export function notePrintFailure(request: Request, backHref: string) {
  return new Response(
    request.method === "HEAD"
      ? null
      : `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><title>印刷用の表示を開けません — Hollow</title>${screenColumnStyle}</head><body>${bar(`<div><p role="alert">${PRINT_FAILURE_MESSAGE}</p>${backLink(backHref)}</div>`)}</body></html>`,
    {
      status: 500,
      headers: {
        ...privateHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  );
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
      ...privateHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": document.contentSecurityPolicy,
    },
  });
}
