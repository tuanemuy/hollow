import type { PdfAnonymousStatus } from "@repo/core/application/pdf/anonymousUsecases";

type Links = Readonly<{
  status: string;
  receive: string;
  manual: string;
  origin: string;
}>;
type Page = Readonly<{
  html: string;
  refresh: Readonly<{ seconds: 2; path: string }> | null;
}>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function failureMessage(code: string): string {
  switch (code) {
    case "PDF_CONTENT_CHANGED":
    case "PDF_COPY_CHANGED":
      return "ノートの内容が変わりました。元の画面から現在の内容で作成し直してください。";
    case "PDF_DEADLINE":
      return "PDFの作成が制限時間内に終わりませんでした。元の画面からやり直してください。";
    case "PDF_CANCELLED":
      return "PDFの作成を続けられませんでした。元の画面で現在の状態を確認してください。";
    case "PDF_BUSY":
      return "PDFの作成処理が混み合っています。しばらく待ってから元の画面でやり直してください。";
    default:
      return "PDFを作成できませんでした。元の画面からやり直してください。";
  }
}

function document(heading: string, body: string, origin: string): string {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PDFの取得 — Hollow</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:24px 16px;background:#fafafa;color:#202020;font:16px/1.7 system-ui,sans-serif;overflow-wrap:anywhere}
main{width:100%;max-width:42rem;margin:0 auto}
h1{font-size:1.5rem;line-height:1.4}
p{margin:1rem 0}
.notice{color:#505050;font-size:.9rem}
.actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:20px 0}
form{margin:0;max-width:100%}
a,button{font:inherit;overflow-wrap:anywhere}
a{display:inline-block;padding:10px 0;color:#202020}
button{min-height:44px;max-width:100%;padding:10px 16px;border:1px solid #202020;border-radius:6px;background:#202020;color:#fff;white-space:normal;cursor:pointer}
a:focus-visible,button:focus-visible{outline:3px solid #555;outline-offset:4px}
time{font-variant-numeric:tabular-nums}
</style></head><body><main><h1>${escapeHtml(heading)}</h1>
<p class="notice">公開・共有画面からのPDFは、サインイン中もこのブラウザーでの期限付き取得となり、処理履歴には追加されません。</p>
${body}
<p><a href="${escapeHtml(origin)}">元の画面に戻る</a></p>
</main></body></html>`;
}

export function renderAnonymousPdfPage(
  status: PdfAnonymousStatus,
  links: Links,
  busy = false,
): Page {
  switch (status.kind) {
    case "expired":
      return {
        html: document(
          "取得期限が切れました",
          "<p>このPDF取得の有効期限が切れました。必要な場合は元の画面から作成し直してください。</p>",
          links.origin,
        ),
        refresh: null,
      };
    case "failed":
      return {
        html: document(
          "PDFを作成できませんでした",
          `<p>${escapeHtml(failureMessage(status.failure))}</p>`,
          links.origin,
        ),
        refresh: null,
      };
    case "pending":
      return {
        html: document(
          "PDFを作成しています",
          `<p>${busy ? "取得処理の終了を待っています。" : "作成が終わるまでお待ちください。"}状態を2秒ごとに確認します。</p>
<p>取得期限: <time>${escapeHtml(status.expiresAt)}</time></p>
<p><a href="${escapeHtml(links.status)}">状態を確認する</a></p>`,
          links.origin,
        ),
        refresh: { seconds: 2, path: links.status },
      };
    case "ready": {
      const message = !status.automatic
        ? "自動受取は繰り返しません。ファイルが見つからない場合や再取得したい場合は、下のボタンを押してください。"
        : busy
          ? "取得処理の終了を待っています。状態を2秒ごとに確認し、取得できる状態になったら自動受取へ進みます。"
          : "まもなく自動受取を開始します。始まらない場合は、下のボタンから取得できます。";
      return {
        html: document(
          "PDFの準備ができました",
          `<p>${message}</p>
${busy && !status.automatic ? "<p>ほかの取得処理の終了を待っています。少し待ってからボタンで取得してください。</p>" : ""}
<p>取得期限: <time>${escapeHtml(status.expiresAt)}</time></p>
<div class="actions"><form method="post" action="${escapeHtml(links.manual)}"><button type="submit">PDFを取得する</button></form></div>
<p class="notice">取得の開始は、端末への保存完了を意味しません。ブラウザーのダウンロードをご確認ください。</p>`,
          links.origin,
        ),
        refresh: status.automatic
          ? { seconds: 2, path: busy ? links.status : links.receive }
          : null,
      };
    }
  }
}
