import type {
  AudioChunkIdentity,
  AudioManifest,
  AudioRecipe,
  LlmTranscriptResponse,
} from "@repo/core/domain/llm/audio";
import type { LlmNativeInputOwner } from "./ports";

export type SourceSink = Readonly<{ write(chunk: Uint8Array): Promise<void> }>;
export type AudioChunk = Readonly<{
  identity: AudioChunkIdentity;
  sampleRate: 16000;
  channels: number;
  mimeType: "audio/wav";
  bytes: Uint8Array;
}>;
export interface OwnedAudioPrepared {
  readonly manifest: AudioManifest;
  readChunk(
    identity: AudioChunkIdentity,
    signal: AbortSignal,
  ): Promise<AudioChunk>;
  close(): Promise<void>;
  readonly closed: Promise<void>;
}
export interface LlmAudioPreparer {
  prepare(
    input: Readonly<{
      source: AudioManifest["source"];
      recipe: AudioRecipe;
      native: LlmNativeInputOwner;
      copy(sink: SourceSink, signal: AbortSignal): Promise<void>;
    }>,
    signal: AbortSignal,
  ): Promise<OwnedAudioPrepared>;
}
export type LlmSttModelProfile = Readonly<{
  kind: "stt-transcription";
  modelId: string;
  source: "live" | "adopted-default";
  checkedAt: Date;
}>;
export interface LlmTranscriber {
  transcribe(
    input: Readonly<{
      dispatchId: string;
      credential: string;
      model: LlmSttModelProfile;
      input: AudioChunk;
    }>,
    signal: AbortSignal,
  ): Promise<LlmTranscriptResponse>;
}
export type AudioNativeTools = Readonly<{
  ffmpegPath: string;
  ffprobePath: string;
  pythonPath: string;
}>;
