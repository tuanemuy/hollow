const messages: Readonly<Record<string, string>> = {
  LLM_AUDIO_CORRUPT:
    "音声を最後まで読み取れませんでした。破損していない原本を確認してください。",
  LLM_AUDIO_UNSUPPORTED:
    "この音声の形式・音声トラック・チャンネルは変換に対応していません。",
  LLM_AUDIO_NO_TEXT:
    "文字起こし結果が得られませんでした。原本の音声を確認してください。",
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
    "この処理の文字用契約ではPDFの図や画像を扱えませんでした。原本と旧本文を保持しました。新しく用途を確認し、対応する全頁画像用モデルで再生成できます。",
  LLM_PDF_ORDER_UNPROVEN:
    "この処理の文字用契約では読み順を確認できませんでした。原本と旧本文を保持しました。新しく用途を確認し、対応する全頁画像用モデルで再生成できます。",
  LLM_PDF_PREVIEW_REQUIRED:
    "PDFの用途を確認してからモデルと本文置換を確認してください。",
  LLM_PDF_PREVIEW_CHANGED:
    "用途確認が失効しました。原本と旧本文を保持し、用途を確認し直してください。",
  LLM_PDF_PREVIEW_BUSY:
    "用途確認が実行中または終了未確認です。終了を確認するまで新しい確認を開始しません。",
};

export function llmDocumentMessage(code: string | null): string | null {
  return code && Object.hasOwn(messages, code)
    ? (messages[code] ?? null)
    : null;
}
