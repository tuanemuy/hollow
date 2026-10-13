import { createHash } from "node:crypto";
import type { AudioManifest, AudioPlan } from "@repo/core/domain/llm/audio";
import {
  audioManifest,
  audioResponsesComplete,
  sameAudioInput,
  transcriptionResponsesComplete,
} from "@repo/core/domain/llm/audio";
import type { LlmDispatch } from "@repo/core/domain/llm/entity";
import { describe, expect, it } from "vitest";
import { structureAudioTranscript } from "./audioWorker";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const manifest: AudioManifest = {
  kind: "audio-chunks",
  preparationVersion: 5,
  source: {
    kind: "original",
    originalId: "01900000-0000-7000-8000-000000000001",
    sha256: "a".repeat(64),
    bytes: 444,
    format: "audio",
  },
  recipe: {
    sttModelId: "synthetic/stt",
    pipelineVersion: 1,
    decoderPolicy: "ffmpeg-8.0.1-pcm16-16k-v1",
  },
  sampleRate: 16000,
  channels: 1,
  totalFrames: 200,
  chunks: [0, 1].map((ordinal) => ({
    kind: "prepared-audio-chunk",
    ordinal,
    sha256: String(ordinal + 1).repeat(64),
    startFrame: ordinal * 100,
    frames: 100,
    bytes: 244,
  })),
  sha256: "b".repeat(64),
};
const stt = (
  text: string,
  ordinal: number,
): Extract<LlmDispatch, { stage: "transcribe"; state: "response" }> => ({
  stage: "transcribe",
  jobId: "job",
  id: `stt${ordinal}`,
  ordinal,
  ownerToken: "token",
  runtimeId: "runtime",
  input: manifest.chunks[ordinal]!,
  state: "response",
  intentAt: new Date("2026-10-13T00:00:00Z"),
  response: { kind: "transcript", text, inputTokens: null, outputTokens: null },
});
const c = { tokens: { hash } };
describe("complete audio stage plan", () => {
  it("compares persisted audio identities by meaning while rejecting changed coverage and transcripts", () => {
    const chunk = manifest.chunks[0]!;
    const reordered = {
      bytes: chunk.bytes,
      frames: chunk.frames,
      startFrame: chunk.startFrame,
      sha256: chunk.sha256,
      ordinal: chunk.ordinal,
      kind: chunk.kind,
    };
    expect(sameAudioInput(reordered, chunk)).toBe(true);
    for (const changed of [
      { ...chunk, bytes: chunk.bytes + 2 },
      { ...chunk, frames: chunk.frames + 1 },
      { ...chunk, startFrame: 1 },
      { ...chunk, ordinal: 1 },
      { ...chunk, sha256: "e".repeat(64) },
    ])
      expect(sameAudioInput(changed, chunk)).toBe(false);
    const segment = {
      kind: "prepared-transcript-segment" as const,
      ordinal: 0,
      transcriptHash: "a".repeat(64),
      sha256: "b".repeat(64),
    };
    expect(
      sameAudioInput(
        {
          sha256: segment.sha256,
          transcriptHash: segment.transcriptHash,
          ordinal: 0,
          kind: segment.kind,
        },
        segment,
      ),
    ).toBe(true);
    expect(
      sameAudioInput({ ...segment, transcriptHash: "c".repeat(64) }, segment),
    ).toBe(false);
    expect(sameAudioInput({ ...segment, ordinal: 1 }, segment)).toBe(false);
    expect(
      sameAudioInput({ ...segment, sha256: "c".repeat(64) }, segment),
    ).toBe(false);
    expect(sameAudioInput(chunk, segment)).toBe(false);
  });
  it("bounds the complete serialized transcript before HTML segmentation", () => {
    const larger = audioManifest({
      ...manifest,
      totalFrames: 400,
      chunks: [0, 1, 2, 3].map((ordinal) => ({
        ...manifest.chunks[0]!,
        ordinal,
        startFrame: ordinal * 100,
      })),
    });
    const rows: LlmDispatch[] = larger.chunks.map((chunk) => ({
      ...stt("\u0001".repeat(65536), 0),
      ordinal: chunk.ordinal,
      input: chunk,
    }));
    expect(() => structureAudioTranscript(c, larger, rows)).toThrowError(
      expect.objectContaining({ code: "LLM_RESOURCE_LIMIT" }),
    );
  });
  it("keeps chunk order and escaped text independent of dispatch enumeration", () => {
    const prepared = structureAudioTranscript(c, manifest, [
      stt("後半 <script>悪い</script>", 1),
      stt("前半 & 本文", 0),
    ]);
    expect(prepared.segments.map((s) => s.html).join("")).toBe(
      "<p>区間 1\n前半 &amp; 本文\n区間 2\n後半 &lt;script&gt;悪い&lt;/script&gt;\n</p>",
    );
    expect(prepared.segments[0]?.identity.transcriptHash).toBe(
      hash(JSON.stringify(["前半 & 本文", "後半 <script>悪い</script>"])),
    );
  });
  it("never treats STT-only responses as final body completion", () => {
    const rows = [stt("前半", 0), stt("後半", 1)];
    const prepared = structureAudioTranscript(c, manifest, rows);
    const plan: AudioPlan = {
      kind: "structuring",
      manifest,
      transcriptHash: prepared.segments[0]!.identity.transcriptHash,
      segments: prepared.segments.map((s) => s.identity),
    };
    expect(transcriptionResponsesComplete(manifest, rows)).toBe(true);
    expect(audioResponsesComplete(plan, rows)).toBe(false);
    const structured: LlmDispatch = {
      stage: "structure",
      id: "body",
      jobId: "job",
      ordinal: 0,
      input: prepared.segments[0]!.identity,
      ownerToken: "token",
      runtimeId: "runtime",
      state: "response",
      intentAt: new Date(),
      response: {
        content: "<p>本文</p>",
        finish: "stop",
        inputTokens: null,
        outputTokens: null,
      },
    };
    expect(audioResponsesComplete(plan, [...rows, structured])).toBe(true);
    expect(
      audioResponsesComplete(plan, [...rows, structured, structured]),
    ).toBe(false);
    expect(
      audioResponsesComplete(plan, [
        ...rows,
        {
          ...structured,
          input: { ...structured.input, sha256: "f".repeat(64) },
        },
      ]),
    ).toBe(false);
  });
  it("rejects missing chunk responses and a wholly empty recognition without fabricated silence", () => {
    expect(() =>
      structureAudioTranscript(c, manifest, [stt("text", 0)]),
    ).toThrow();
    expect(() =>
      structureAudioTranscript(c, manifest, [stt("", 0), stt(" ", 1)]),
    ).toThrowError(expect.objectContaining({ code: "LLM_AUDIO_NO_TEXT" }));
    const result = structureAudioTranscript(c, manifest, [
      stt("話", 0),
      stt("", 1),
    ]);
    expect(result.segments[0]?.html).toContain("認識結果なし");
    expect(result.notices).toHaveLength(2);
  });
  it("rejects noncontiguous or truncated frame manifests", () => {
    expect(audioManifest(manifest).totalFrames).toBe(200);
    expect(() => audioManifest({ ...manifest, totalFrames: 201 })).toThrow();
    expect(() =>
      audioManifest({
        ...manifest,
        chunks: manifest.chunks.map((ch) =>
          ch.ordinal === 1 ? { ...ch, startFrame: 101 } : ch,
        ),
      }),
    ).toThrow();
  });
});
