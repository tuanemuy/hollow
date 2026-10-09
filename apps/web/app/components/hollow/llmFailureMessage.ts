import type { LlmFailure } from "@repo/core/domain/llm/entity";
import { llmDocumentMessage } from "./llmDocumentMessage";

const messages: Partial<Record<LlmFailure, string>> = {
  LLM_MONTHLY_LIMIT: "今月の変換回数の上限に達しました。",
  LLM_UNAVAILABLE: "変換サービスを利用できません。",
  LLM_UNCONFIGURED: "OpenRouterの連携が必要です。",
  LLM_MODEL_UNAVAILABLE: "選んだモデルを利用できません。",
  LLM_MODEL_INCOMPATIBLE: "選んだモデルはこの原本に対応していません。",
  LLM_CREDENTIAL_INVALID: "OpenRouterの連携を確認してください。",
  LLM_RATE_LIMIT:
    "サービスの利用が集中しています。時間をおいて確認してください。",
  LLM_CREDIT_REQUIRED: "サービスの利用残高を確認してください。",
  LLM_RESOURCE_LIMIT: "原本が変換処理の上限を超えています。",
  LLM_SOURCE_CHANGED: "変換中に原本が変更されました。",
  LLM_SOURCE_INVALID: "原本を読み取れませんでした。",
  LLM_TIMEOUT: "変換が制限時間内に完了しませんでした。",
  LLM_RESPONSE_INVALID: "サービスの生成結果を確認できませんでした。",
  LLM_RESPONSE_INCOMPLETE: "サービスの生成結果が不完全でした。",
  LLM_DELIVERY_UNKNOWN: "送信の結果を確認できません。自動で再送しません。",
  LLM_OWNERSHIP_UNKNOWN:
    "実処理の終了を確認できません。終了を確認するまで再送しません。",
};

export function llmFailureMessage(code: LlmFailure): string {
  return (
    llmDocumentMessage(code) ??
    `${messages[code] ?? "本文を生成できませんでした。"}原本と旧本文は保持されています。処理履歴を確認してください。`
  );
}
