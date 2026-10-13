import type { AudioManifest, AudioPlan } from "@repo/core/domain/llm/audio";
import {
  AUDIO_LIMITS,
  transcriptionResponsesComplete,
} from "@repo/core/domain/llm/audio";
import type {
  LlmDispatch,
  LlmFixedConversion,
} from "@repo/core/domain/llm/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { replaceLlm } from "./completion";
import { currentLlmSource } from "./current";
import { type LlmAudioPreparedSource, LlmOperationError } from "./ports";

type AudioConversion = Extract<LlmFixedConversion, { preparationVersion: 5 }>;
const invalid = () =>
  new LlmOperationError("LLM_SOURCE_CHANGED", "possible", true);
const escapeText = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function transcriptSerialization(texts: readonly string[]) {
  const serialized = JSON.stringify(texts);
  if (
    new TextEncoder().encode(serialized).length > AUDIO_LIMITS.transcriptsBytes
  )
    throw new LlmOperationError("LLM_RESOURCE_LIMIT", "possible", true);
  return serialized;
}

export function structureAudioTranscript(
  c: Readonly<{ tokens: Pick<HollowContainer["tokens"], "hash"> }>,
  manifest: AudioManifest,
  rows: readonly LlmDispatch[],
): LlmAudioPreparedSource {
  const stt = rows.filter((row) => row.stage === "transcribe");
  if (!transcriptionResponsesComplete(manifest, stt)) throw invalid();
  const texts = manifest.chunks.map((chunk) => {
    const row = stt.find((r) => r.ordinal === chunk.ordinal);
    if (!row || row.stage !== "transcribe" || row.state !== "response")
      throw invalid();
    return row.response.text;
  });
  if (!texts.some((text) => text.trim()))
    throw new LlmOperationError("LLM_AUDIO_NO_TEXT", "possible", true);
  const serialized = transcriptSerialization(texts);
  const transcriptHash = c.tokens.hash(serialized);
  const htmls: string[] = [];
  let current = "";
  let bytes = 7;
  for (const [ordinal, text] of texts.entries()) {
    const content = `区間 ${ordinal + 1}\n${text.trim() ? text : "認識結果なし"}\n`;
    for (const character of content) {
      const escaped = escapeText(character);
      const size = new TextEncoder().encode(escaped).length;
      if (bytes + size > AUDIO_LIMITS.transcriptBytes) {
        htmls.push(`<p>${current}</p>`);
        current = "";
        bytes = 7;
      }
      current += escaped;
      bytes += size;
    }
  }
  if (current) htmls.push(`<p>${current}</p>`);
  if (!htmls.length || htmls.length > 16)
    throw new LlmOperationError("LLM_RESOURCE_LIMIT", "possible", true);
  return {
    kind: "audio-transcript",
    preparationVersion: 5,
    manifest,
    segments: htmls.map((html, ordinal) => ({
      html,
      identity: {
        kind: "prepared-transcript-segment",
        ordinal,
        sha256: c.tokens.hash(
          JSON.stringify(["transcript/v1", transcriptHash, ordinal, html]),
        ),
        transcriptHash,
      },
    })),
    notices: [
      "音声の全区間を順番に文字起こしし、本文を構成しました。認識結果には誤りや欠落があり得るため、原本を確認してください。",
      ...(texts.some((text) => !text.trim())
        ? ["認識結果が得られなかった区間があります。原本を確認してください。"]
        : []),
    ],
  };
}

export async function prepareAudioConversion(
  c: HollowContainer,
  initial: AudioConversion,
  signal: AbortSignal,
  observe: Readonly<{
    claimed(value: AudioConversion): void;
    dispatch(id: string | null): void;
  }>,
) {
  const services = c.llm;
  const control = c.openRouter;
  if (!services?.audio || services.inputMode !== "leased-local-v2" || !control)
    throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
  const stage = services.inputStage;
  const owner = initial.owner;
  let value = initial;
  const current = async () =>
    c.unitOfWorkProvider.run(async (u) => {
      const checked = await currentLlmSource(u, value, c.clock.now(), stage);
      if (
        checked.current.selection !== "fixed" ||
        checked.current.preparationVersion !== 5
      )
        throw invalid();
      return checked.current;
    });
  const manifest = await stage.prepareAudio(value, signal);
  value = await current();
  observe.claimed(value);
  if (
    value.audioPlan.kind !== "awaiting-manifest" &&
    JSON.stringify(value.audioPlan.manifest) !== JSON.stringify(manifest)
  )
    throw invalid();
  const seal = async (
    plan: Exclude<AudioPlan, { kind: "awaiting-manifest" }>,
  ) => {
    value = await c.unitOfWorkProvider.run(async (u) => {
      const checked = await currentLlmSource(u, value, c.clock.now(), stage);
      const sealed = await u.llmConversions.sealAudio({
        jobId: value.jobId,
        expectedVersion: checked.current.version,
        ownerToken: owner.token!,
        runtimeId: owner.runtimeId!,
        plan,
        now: c.clock.now(),
      });
      if (!sealed) throw invalid();
      return sealed;
    });
    observe.claimed(value);
  };
  if (value.audioPlan.kind === "awaiting-manifest")
    await seal({ kind: "transcribing", manifest });
  const resume = initial.phase === "finalizing";
  if (!resume && value.audioPlan.kind === "transcribing") {
    const model = await services.profiles.inspect(
      { kind: "stt-transcription", modelId: value.audioRecipe.sttModelId },
      signal,
    );
    if (model.kind !== "stt-transcription")
      throw new LlmOperationError("LLM_MODEL_INCOMPATIBLE", "not-sent", true);
    const existing = await c.unitOfWorkProvider.run((u) =>
      u.llmDispatches.list(value.jobId),
    );
    if (existing.length)
      throw new LlmOperationError("LLM_DELIVERY_UNKNOWN", "possible", true);
    for (const identity of manifest.chunks) {
      value = await current();
      observe.claimed(value);
      const chunk = await stage.readAudioChunk(value, identity, signal);
      const id = c.idGenerator.next();
      const credential = await c.unitOfWorkProvider.run(async (u) => {
        const checked = await currentLlmSource(u, value, c.clock.now(), stage);
        await u.llmDispatches.prepare({
          id,
          jobId: value.jobId,
          ordinal: identity.ordinal,
          stage: "transcribe",
          input: identity,
          runtimeId: owner.runtimeId!,
          ownerToken: owner.token!,
          state: "prepared",
          intentAt: null,
          response: null,
        });
        if (
          checked.current.selection !== "fixed" ||
          checked.current.preparationVersion !== 5
        )
          throw invalid();
        await replaceLlm(u, checked.current, {
          ...checked.current,
          phase: "dispatching",
          updatedAt: c.clock.now(),
        });
        if (!(await u.llmDispatches.intent(id, owner.token!, c.clock.now())))
          throw invalid();
        return control.protector.reveal(checked.connection.credentialEnvelope, {
          purpose: "credential",
          accountId: value.accountId,
          epoch: value.credentialEpoch,
        });
      });
      observe.dispatch(id);
      const response = await services.audio.transcriber.transcribe(
        { dispatchId: id, credential, model, input: chunk },
        signal,
      );
      if (signal.aborted)
        throw new LlmOperationError("LLM_TIMEOUT", "possible", true);
      await c.unitOfWorkProvider.run(async (u) => {
        const checked = await currentLlmSource(u, value, c.clock.now(), stage);
        const previous = await u.llmDispatches.list(value.jobId);
        const texts = previous.flatMap((row) =>
          row.stage === "transcribe" && row.state === "response"
            ? [row.response.text]
            : [],
        );
        transcriptSerialization([...texts, response.text]);
        if (!(await u.llmDispatches.response(id, owner.token!, response)))
          throw invalid();
        if (
          checked.current.selection !== "fixed" ||
          checked.current.preparationVersion !== 5
        )
          throw invalid();
        await replaceLlm(u, checked.current, {
          ...checked.current,
          phase: "dispatching",
          updatedAt: c.clock.now(),
        });
      });
      observe.dispatch(null);
    }
  }
  const rows = await c.unitOfWorkProvider.run((u) =>
    u.llmDispatches.list(value.jobId),
  );
  const prepared = structureAudioTranscript(c, manifest, rows);
  value = await current();
  observe.claimed(value);
  const plan = {
    kind: "structuring" as const,
    manifest,
    transcriptHash: prepared.segments[0]!.identity.transcriptHash,
    segments: prepared.segments.map((s) => s.identity),
  };
  if (value.audioPlan.kind === "transcribing") await seal(plan);
  else if (
    value.audioPlan.kind === "awaiting-manifest" ||
    JSON.stringify({ ...value.audioPlan, kind: "structuring" }) !==
      JSON.stringify(plan)
  )
    throw invalid();
  return { value, prepared };
}
