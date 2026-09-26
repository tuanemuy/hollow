import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type { PdfAnonymousAccess } from "@repo/core/application/pdf/anonymousSnapshot";

const escapeAttribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export function anonymousPdfFormBinding(
  c: HollowContainer,
  access: PdfAnonymousAccess,
  commandId: string,
) {
  return c.tokens.hash(
    JSON.stringify(
      access.kind === "public"
        ? [
            "anonymous-pdf-form-v1",
            commandId,
            "public",
            access.publicId,
            access.urlGeneration,
            access.browser,
          ]
        : [
            "anonymous-pdf-form-v1",
            commandId,
            "link",
            c.tokens.hash(access.token),
            access.browser,
          ],
    ),
  );
}

export function anonymousPdfForm(
  c: HollowContainer,
  access: PdfAnonymousAccess,
  entry: string,
) {
  if (!c.pdf || !c.pdfAnonymousTicketSigner.activeKeyId())
    return "<p>この環境では匿名PDFを利用できません。HTMLまたはMarkdownで取得できます。</p>";
  const commandId = c.idGenerator.next();
  const binding = anonymousPdfFormBinding(c, access, commandId);
  return `<form method="post" action="${escapeAttribute(entry)}/pdf"><input type="hidden" name="command" value="${escapeAttribute(commandId)}"><input type="hidden" name="binding" value="${escapeAttribute(binding)}"><button type="submit">PDF をダウンロード</button></form><p>PDFはこのブラウザーでの期限付き取得です。サインイン中でも、この公開・共有画面からの処理は本人の履歴には追加されません。</p>`;
}
