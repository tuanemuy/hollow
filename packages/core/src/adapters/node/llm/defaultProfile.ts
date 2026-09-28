import type {
  LlmImageModelProfile,
  LlmTextModelProfile,
} from "@repo/core/application/llm/ports";
import { OPENROUTER_DEFAULT_TEXT } from "@repo/core/domain/integration/openRouter";

export const LLM_DEFAULT_PROFILE_RECORD = {
  version: 1,
  sourceUrl: "https://openrouter.ai/google/gemini-3.5-flash-lite",
  checkedAt: "2026-09-28T04:18:55+09:00",
  modelId: OPENROUTER_DEFAULT_TEXT,
  contextTokens: 1_048_576,
  outputTokens: 65_536,
} as const;

export function adoptedLlmProfile(): LlmTextModelProfile {
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

export const LLM_DEFAULT_IMAGE_PROFILE_RECORD = {
  version: 1,
  sourceUrl: "https://openrouter.ai/google/gemini-3.5-flash-lite",
  checkedAt: "2026-09-28T20:49:00+09:00",
  validUntil: "2026-10-28T20:49:00+09:00",
  modelId: OPENROUTER_DEFAULT_TEXT,
  contextTokens: 1_048_576,
  outputTokens: 65_536,
} as const;

export function adoptedLlmImageProfile(now: Date): LlmImageModelProfile | null {
  const record = LLM_DEFAULT_IMAGE_PROFILE_RECORD;
  if (
    now.getTime() < Date.parse(record.checkedAt) ||
    now.getTime() >= Date.parse(record.validUntil)
  )
    return null;
  return {
    modelId: record.modelId,
    kind: "chat-image",
    contextTokens: record.contextTokens,
    outputTokens: record.outputTokens,
    supportsMaxTokens: true,
    source: "adopted-default",
    checkedAt: new Date(record.checkedAt),
    budget: {
      kind: "resource-only",
      imageTokens: null,
      contextGuaranteed: false,
    },
  };
}
