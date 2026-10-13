import { z } from "zod";
import { BusinessRuleError } from "../error";
import type { LlmDispatch } from "./entity";

export const AUDIO_LIMITS = {
  sourceBytes: 200 * 1024 * 1024,
  chunkBytes: 8 * 1024 * 1024,
  chunkSeconds: 120,
  chunks: 512,
  pcmBytes: 2 * 1024 * 1024 * 1024,
  manifestBytes: 128 * 1024,
  transcriptBytes: 64 * 1024,
  transcriptsBytes: 1024 * 1024,
  nativeMs: 120_000,
  nativeMemoryBytes: 512 * 1024 * 1024,
} as const;
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const positive = z.number().int().positive().safe();
export const audioRecipeSchema = z
  .object({
    sttModelId: z.string().min(1).max(255),
    pipelineVersion: z.literal(1),
    decoderPolicy: z.literal("ffmpeg-8.0.1-pcm16-16k-v1"),
  })
  .strict();
export type AudioRecipe = Readonly<z.infer<typeof audioRecipeSchema>>;
export const audioChunkIdentitySchema = z
  .object({
    kind: z.literal("prepared-audio-chunk"),
    ordinal: z
      .number()
      .int()
      .min(0)
      .max(AUDIO_LIMITS.chunks - 1),
    sha256: hash,
    startFrame: z.number().int().nonnegative().safe(),
    frames: positive,
    bytes: z.number().int().min(46).max(AUDIO_LIMITS.chunkBytes),
  })
  .strict();
export type AudioChunkIdentity = Readonly<
  z.infer<typeof audioChunkIdentitySchema>
>;
export const audioManifestSchema = z
  .object({
    kind: z.literal("audio-chunks"),
    preparationVersion: z.literal(5),
    source: z
      .object({
        kind: z.literal("original"),
        originalId: z.uuid(),
        sha256: hash,
        bytes: positive.max(AUDIO_LIMITS.sourceBytes),
        format: z.literal("audio"),
      })
      .strict(),
    recipe: audioRecipeSchema,
    sampleRate: z.literal(16000),
    channels: z.number().int().min(1).max(8),
    totalFrames: positive,
    chunks: z.array(audioChunkIdentitySchema).min(1).max(AUDIO_LIMITS.chunks),
    sha256: hash,
  })
  .strict();
export type AudioManifest = Readonly<
  Omit<z.infer<typeof audioManifestSchema>, "chunks"> & {
    chunks: readonly AudioChunkIdentity[];
  }
>;
export const transcriptSegmentIdentitySchema = z
  .object({
    kind: z.literal("prepared-transcript-segment"),
    ordinal: z.number().int().min(0).max(15),
    sha256: hash,
    transcriptHash: hash,
  })
  .strict();
export type TranscriptSegmentIdentity = Readonly<
  z.infer<typeof transcriptSegmentIdentitySchema>
>;
export type AudioPlan =
  | Readonly<{ kind: "awaiting-manifest" }>
  | Readonly<{ kind: "transcribing"; manifest: AudioManifest }>
  | Readonly<{
      kind: "structuring" | "responses-complete";
      manifest: AudioManifest;
      transcriptHash: string;
      segments: readonly TranscriptSegmentIdentity[];
    }>;
const planSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("awaiting-manifest") }).strict(),
  z
    .object({ kind: z.literal("transcribing"), manifest: audioManifestSchema })
    .strict(),
  z
    .object({
      kind: z.enum(["structuring", "responses-complete"]),
      manifest: audioManifestSchema,
      transcriptHash: hash,
      segments: z.array(transcriptSegmentIdentitySchema).min(1).max(16),
    })
    .strict(),
]);
const invalid = () =>
  new BusinessRuleError(
    "LLM_AUDIO_PLAN_INVALID",
    "音声の変換状態を確認できませんでした。",
  );
export function audioManifest(value: unknown): AudioManifest {
  const parsed = audioManifestSchema.safeParse(value);
  if (!parsed.success) throw invalid();
  const m = parsed.data;
  let frame = 0;
  for (const [ordinal, chunk] of m.chunks.entries()) {
    if (
      chunk.ordinal !== ordinal ||
      chunk.startFrame !== frame ||
      chunk.frames > AUDIO_LIMITS.chunkSeconds * m.sampleRate ||
      chunk.bytes !== 44 + chunk.frames * m.channels * 2
    )
      throw invalid();
    frame += chunk.frames;
  }
  if (
    frame !== m.totalFrames ||
    frame * m.channels * 2 > AUDIO_LIMITS.pcmBytes ||
    new TextEncoder().encode(JSON.stringify(m)).byteLength >
      AUDIO_LIMITS.manifestBytes
  )
    throw invalid();
  return m;
}
export function audioRecipe(value: unknown): AudioRecipe {
  const parsed = audioRecipeSchema.safeParse(value);
  if (!parsed.success) throw invalid();
  return parsed.data;
}
export function audioPlan(value: unknown): AudioPlan {
  const parsed = planSchema.safeParse(value);
  if (!parsed.success) throw invalid();
  const p = parsed.data;
  if (p.kind === "awaiting-manifest") return p;
  audioManifest(p.manifest);
  if (p.kind === "structuring" || p.kind === "responses-complete") {
    if (
      p.segments.some(
        (s, i) => s.ordinal !== i || s.transcriptHash !== p.transcriptHash,
      )
    )
      throw invalid();
  }
  return p;
}
export type LlmTranscriptResponse = Readonly<{
  kind: "transcript";
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
}>;
export function sameAudioInput(
  left: LlmDispatch["input"],
  right: AudioChunkIdentity | TranscriptSegmentIdentity,
): boolean {
  if (left.ordinal !== right.ordinal || left.sha256 !== right.sha256)
    return false;
  return right.kind === "prepared-audio-chunk"
    ? left.kind === "prepared-audio-chunk" &&
        left.startFrame === right.startFrame &&
        left.frames === right.frames &&
        left.bytes === right.bytes
    : left.kind === "prepared-transcript-segment" &&
        left.transcriptHash === right.transcriptHash;
}
function matches(
  rows: readonly LlmDispatch[],
  required: readonly Readonly<{
    stage: "transcribe" | "structure";
    identity: AudioChunkIdentity | TranscriptSegmentIdentity;
  }>[],
) {
  return (
    rows.length === required.length &&
    required.every(({ stage, identity }) => {
      const matching = rows.filter(
        (row) =>
          (row.stage ?? "structure") === stage &&
          row.ordinal === identity.ordinal,
      );
      return (
        matching.length === 1 &&
        matching[0]?.state === "response" &&
        sameAudioInput(matching[0].input, identity)
      );
    })
  );
}
export function transcriptionResponsesComplete(
  manifest: AudioManifest,
  rows: readonly LlmDispatch[],
): boolean {
  return matches(
    rows,
    manifest.chunks.map((identity) => ({ stage: "transcribe", identity })),
  );
}
export function audioResponsesComplete(
  plan: AudioPlan,
  rows: readonly LlmDispatch[],
): boolean {
  if (plan.kind !== "structuring" && plan.kind !== "responses-complete")
    return false;
  return matches(rows, [
    ...plan.manifest.chunks.map((identity) => ({
      stage: "transcribe" as const,
      identity,
    })),
    ...plan.segments.map((identity) => ({
      stage: "structure" as const,
      identity,
    })),
  ]);
}
