const messages: Readonly<Record<string, string>> = {
  LLM_IMAGE_CORRUPT:
    "画像全体を確認できませんでした。原本と旧本文を保持しました。",
  LLM_IMAGE_UNSUPPORTED:
    "この画像構造は対応範囲外です。静止JPEG・PNG・WebP・GIFのみ対応し、原本と旧本文を保持しました。",
  LLM_IMAGE_MULTIFRAME:
    "アニメーションや複数画像は対応していません。先頭だけを変換せず、原本と旧本文を保持しました。",
  LLM_DOCUMENT_ENCRYPTED:
    "暗号化された原本には対応していません。原本と旧本文を保持しました。",
  LLM_DOCUMENT_CORRUPT:
    "原本の構造を確認できませんでした。原本と旧本文を保持しました。",
  LLM_DOCUMENT_UNSUPPORTED:
    "文字・構造を漏れなく確認できない文書です。一部分だけを変換せず、原本と旧本文を保持しました。",
  LLM_DOCUMENT_NO_TEXT:
    "変換できる文字がありません。原本と旧本文を保持しました。",
  LLM_PDF_VISUAL_REQUIRED:
    "画像や図などを含むPDFの視覚変換はまだ提供していません。原本と旧本文を保持しました。",
  LLM_PDF_ORDER_UNPROVEN:
    "PDFの文字の読み順を確認できませんでした。単純な左揃え一段組のみ対応しています。原本と旧本文を保持しました。",
};

export function llmDocumentMessage(code: string | null): string | null {
  return code && Object.hasOwn(messages, code)
    ? (messages[code] ?? null)
    : null;
}
