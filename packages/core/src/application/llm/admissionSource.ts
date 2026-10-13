import { BusinessRuleError } from "@repo/core/domain/error";
import type { Original } from "@repo/core/domain/import/entity";
import { type AudioRecipe, audioRecipe } from "@repo/core/domain/llm/audio";
export type LlmAdmissionSource =
  | Readonly<{
      kind: "audio";
      original: Original & { format: "audio" };
      modelId: string;
      recipe: AudioRecipe;
    }>
  | Readonly<{
      kind: "non-audio";
      original: Original & { format: Exclude<Original["format"], "audio"> };
      modelId: string;
      recipe?: never;
    }>;
export function llmAdmissionSource(
  original: Original,
  modelId: string,
  sttModelId: string | undefined,
): LlmAdmissionSource {
  if (original.format === "audio")
    return {
      kind: "audio",
      original: { ...original, format: "audio" },
      modelId,
      recipe: audioRecipe({
        sttModelId,
        pipelineVersion: 1,
        decoderPolicy: "ffmpeg-8.0.1-pcm16-16k-v1",
      }),
    };
  if (sttModelId !== undefined)
    throw new BusinessRuleError(
      "LLM_MODEL_INCOMPATIBLE",
      "この原本には音声用モデルを指定できません。",
    );
  return {
    kind: "non-audio",
    original: { ...original, format: original.format },
    modelId,
  };
}
