import type { LlmModelProfile } from "@repo/core/application/llm/ports";
import { OPENROUTER_DEFAULT_TEXT } from "@repo/core/domain/integration/openRouter";

export const LLM_DEFAULT_PROFILE_RECORD = {
  version: 1,
  sourceUrl: "https://openrouter.ai/google/gemini-3.5-flash-lite",
  checkedAt: "2026-09-28T04:18:55+09:00",
  modelId: OPENROUTER_DEFAULT_TEXT,
  contextTokens: 1_048_576,
  outputTokens: 65_536,
} as const;

export function adoptedLlmProfile(): LlmModelProfile {
  return {
    modelId: LLM_DEFAULT_PROFILE_RECORD.modelId,
    kind: "chat-text",
    contextTokens: LLM_DEFAULT_PROFILE_RECORD.contextTokens,
    outputTokens: LLM_DEFAULT_PROFILE_RECORD.outputTokens,
    supportsMaxTokens: true,
    source: "adopted-default",
    checkedAt: new Date(LLM_DEFAULT_PROFILE_RECORD.checkedAt),
  };
}
