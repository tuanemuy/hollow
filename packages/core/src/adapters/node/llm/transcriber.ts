import { createHash } from "node:crypto";
import { request } from "node:https";
import type { LlmTranscriber } from "@repo/core/application/llm/audioPorts";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import {
  AUDIO_LIMITS,
  type LlmTranscriptResponse,
} from "@repo/core/domain/llm/audio";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import { z } from "zod";
import { type LlmRequestFactory, postLlm } from "./ownedHttp";

const fail = (
  code:
    | "LLM_SOURCE_INVALID"
    | "LLM_RESOURCE_LIMIT"
    | "LLM_MODEL_INCOMPATIBLE"
    | "LLM_CREDENTIAL_INVALID",
) => new LlmOperationError(code, "not-sent", true);
const profile = z
  .object({
    kind: z.literal("stt-transcription"),
    modelId: z.string().min(1).max(255),
    source: z.enum(["live", "adopted-default"]),
    checkedAt: z.date(),
  })
  .strict();
const usage = z.number().int().nonnegative().safe().nullable().optional();
const responseSchema = z.object({
  text: z.string(),
  usage: z
    .object({ input_tokens: usage, output_tokens: usage })
    .nullable()
    .optional(),
  error: z.unknown().optional(),
});
function prepare(value: Parameters<LlmTranscriber["transcribe"]>[0]): string {
  if (!profile.safeParse(value.model).success)
    throw fail("LLM_MODEL_INCOMPATIBLE");
  if (
    !value.credential ||
    value.credential.length > 64 * 1024 ||
    !/^[\x21-\x7e]+$/.test(value.credential)
  )
    throw fail("LLM_CREDENTIAL_INVALID");
  const chunk = value.input;
  const wav = Buffer.from(
    chunk.bytes.buffer,
    chunk.bytes.byteOffset,
    chunk.bytes.byteLength,
  );
  if (
    wav.length < 46 ||
    wav.length > AUDIO_LIMITS.chunkBytes ||
    wav.length !== chunk.identity.bytes
  )
    throw fail("LLM_RESOURCE_LIMIT");
  if (
    chunk.mimeType !== "audio/wav" ||
    chunk.sampleRate !== 16000 ||
    chunk.channels < 1 ||
    chunk.channels > 8 ||
    wav.toString("ascii", 0, 4) !== "RIFF" ||
    wav.readUInt32LE(4) !== wav.length - 8 ||
    wav.toString("ascii", 8, 16) !== "WAVEfmt " ||
    wav.readUInt32LE(16) !== 16 ||
    wav.readUInt16LE(20) !== 1 ||
    wav.readUInt16LE(22) !== chunk.channels ||
    wav.readUInt32LE(24) !== 16000 ||
    wav.readUInt32LE(28) !== 16000 * chunk.channels * 2 ||
    wav.readUInt16LE(32) !== chunk.channels * 2 ||
    wav.readUInt16LE(34) !== 16 ||
    wav.toString("ascii", 36, 40) !== "data" ||
    wav.readUInt32LE(40) !== wav.length - 44 ||
    chunk.identity.frames * chunk.channels * 2 !== wav.length - 44 ||
    createHash("sha256").update(wav).digest("hex") !== chunk.identity.sha256
  )
    throw fail("LLM_SOURCE_INVALID");
  const body = JSON.stringify({
    model: value.model.modelId,
    input_audio: { data: wav.toString("base64"), format: "wav" },
    response_format: "json",
    provider: { data_collection: "deny", zdr: true },
  });
  if (Buffer.byteLength(body) > LLM_LIMITS.requestBytes)
    throw fail("LLM_RESOURCE_LIMIT");
  return body;
}
function decode(bytes: Buffer): LlmTranscriptResponse {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new LlmOperationError("LLM_RESPONSE_INVALID", "possible", true);
  }
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.error != null)
    throw new LlmOperationError("LLM_RESPONSE_INVALID", "possible", true);
  if (Buffer.byteLength(parsed.data.text) > AUDIO_LIMITS.transcriptBytes)
    throw new LlmOperationError("LLM_RESOURCE_LIMIT", "possible", true);
  return {
    kind: "transcript",
    text: parsed.data.text,
    inputTokens: parsed.data.usage?.input_tokens ?? null,
    outputTokens: parsed.data.usage?.output_tokens ?? null,
  };
}
export class NodeLlmTranscriber implements LlmTranscriber {
  constructor(private readonly factory: LlmRequestFactory = request) {}
  async transcribe(
    input: Parameters<LlmTranscriber["transcribe"]>[0],
    signal: AbortSignal,
  ): Promise<LlmTranscriptResponse> {
    if (signal.aborted)
      throw new LlmOperationError("LLM_UNAVAILABLE", "not-sent", true);
    return postLlm(
      this.factory,
      new URL("https://openrouter.ai/api/v1/audio/transcriptions"),
      prepare(input),
      input.credential,
      signal,
      decode,
      60_000,
    );
  }
}
