/** Label of every entry point to the print view and of its print button. */
export const PRINT_ACTION_LABEL = "印刷する";

export const PRINT_PDF_HINT =
  "印刷の送信先で「PDF に保存」を選ぶと PDF として保存できます。";

export const PRINT_FAILURE_MESSAGE =
  "印刷用の表示を開けませんでした。時間をおいて、もう一度お試しください。";

/** Class that `layout.css` keeps hidden on screen and alone on paper. */
export const PRINT_NOTICE_CLASS = "hollow-print-notice";

/** Printed instead of a reading page when that page itself is printed. */
export const READING_PRINT_NOTICE = `このページは印刷用ではありません。画面の「${PRINT_ACTION_LABEL}」から開く印刷用の表示で印刷してください。`;
