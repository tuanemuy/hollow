export const uiTerms = { llm: "AI" } as const;

export const importAiCopy = {
  withoutAi: `${uiTerms.llm}を使わずに取り込む`,
  retryWithAi: `${uiTerms.llm}を使う設定で取り込み直す`,
  disabledFailure: `${uiTerms.llm}なしでは取り込めません。`,
} as const;
