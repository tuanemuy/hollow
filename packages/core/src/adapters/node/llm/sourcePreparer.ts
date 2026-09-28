import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import {
  type LlmDocumentPreparedSource,
  type LlmLegacyPreparedSource,
  LlmOperationError,
  type LlmPreparedSource,
  type LlmPrepareInput,
  type LlmSourceMedia,
  type LlmSourcePreparer,
} from "@repo/core/application/llm/ports";
import { LLM_LIMITS, type LlmFailure } from "@repo/core/domain/llm/entity";
import { z } from "zod";
import { NodeLlmDocumentPreparer } from "./documentPreparer";

const placeholderPattern =
  /^\[\[hollow-media:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]\]$/;
const mediaSchema = z
  .array(
    z
      .object({
        sourceUrl: z.string().min(1).max(2048),
        placeholder: z.string().regex(placeholderPattern),
      })
      .strict(),
  )
  .max(200);

const sourceSchema = z
  .object({
    segments: z
      .array(
        z
          .object({
            identity: z
              .object({
                kind: z.literal("prepared-segment"),
                sha256: z.string().regex(/^[0-9a-f]{64}$/),
                ordinal: z.number().int().min(0).max(15),
              })
              .strict(),
            html: z.string().min(1).max(LLM_LIMITS.segmentBytes),
            firstBlock: z.number().int().nonnegative(),
            blockCount: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(LLM_LIMITS.segments),
    blocks: z.number().int().positive(),
    media: z
      .array(
        z
          .object({
            placeholder: z.string().regex(placeholderPattern),
            occurrences: z.number().int().min(1).max(200),
          })
          .strict(),
      )
      .max(200),
    notices: z
      .array(
        z.enum([
          "能動要素・スタイルは本文準備から除外しました。",
          "画像・音声・動画の内容は解釈していません。",
        ]),
      )
      .max(2),
  })
  .strict();

function checked(
  value: unknown,
  media: readonly LlmSourceMedia[],
): LlmLegacyPreparedSource | undefined {
  const parsed = sourceSchema.safeParse(value);
  if (!parsed.success) return;
  let blocks = 0;
  for (const [ordinal, segment] of parsed.data.segments.entries()) {
    if (
      segment.identity.ordinal !== ordinal ||
      segment.firstBlock !== blocks ||
      Buffer.byteLength(segment.html) > LLM_LIMITS.segmentBytes ||
      createHash("sha256").update(segment.html).digest("hex") !==
        segment.identity.sha256
    )
      return;
    blocks += segment.blockCount;
  }
  if (blocks !== parsed.data.blocks) return;
  const allowed = new Set(media.map((entry) => entry.placeholder));
  const seen = new Map<string, number>();
  let total = 0;
  for (const segment of parsed.data.segments) {
    const tokens = segment.html.match(/\[\[hollow-media:[^\]]*\]\]/g) ?? [];
    if (
      (segment.html.match(/\[\[hollow-media:/gi)?.length ?? 0) !== tokens.length
    )
      return;
    for (const token of tokens) {
      if (!allowed.has(token)) return;
      seen.set(token, (seen.get(token) ?? 0) + 1);
      if (++total > 200) return;
    }
  }
  if (seen.size !== parsed.data.media.length) return;
  for (const entry of parsed.data.media) {
    if (seen.get(entry.placeholder) !== entry.occurrences) return;
    seen.delete(entry.placeholder);
  }
  return seen.size === 0
    ? { ...parsed.data, kind: "text-blocks", preparationVersion: 1 }
    : undefined;
}
const failure = (code: LlmFailure, closed = true) =>
  new LlmOperationError(code, "not-sent", closed);

export class NodeLlmSourcePreparer implements LlmSourcePreparer {
  private readonly document: NodeLlmDocumentPreparer;
  constructor(
    private readonly workerPath: string | URL,
    documentWorkerPath: string | URL = new URL(
      "./documentWorker.mjs",
      import.meta.url,
    ),
  ) {
    this.document = new NodeLlmDocumentPreparer(documentWorkerPath);
  }

  prepare(
    input: Extract<LlmPrepareInput, { preparationVersion: 1 }>,
    signal: AbortSignal,
  ): Promise<LlmLegacyPreparedSource>;
  prepare(
    input: Extract<LlmPrepareInput, { preparationVersion: 2 }>,
    signal: AbortSignal,
  ): Promise<LlmDocumentPreparedSource>;
  prepare(
    input: LlmPrepareInput,
    signal: AbortSignal,
  ): Promise<LlmPreparedSource>;
  async prepare(
    input: Parameters<LlmSourcePreparer["prepare"]>[0],
    signal: AbortSignal,
  ): Promise<LlmPreparedSource> {
    if (input.preparationVersion === 2)
      return this.document.prepare(input, signal);
    if (signal.aborted) throw failure("LLM_UNAVAILABLE");
    if (input.bytes.byteLength > 50 * 1024 * 1024)
      throw failure("LLM_RESOURCE_LIMIT");
    if ((input.media?.length ?? 0) > 200) throw failure("LLM_RESOURCE_LIMIT");
    const parsedMedia = mediaSchema.safeParse(input.media ?? []);
    if (!parsedMedia.success) throw failure("LLM_SOURCE_INVALID");
    const media = parsedMedia.data;
    if (
      new Set(media.map((entry) => entry.sourceUrl)).size !== media.length ||
      new Set(media.map((entry) => entry.placeholder)).size !== media.length ||
      media.some(
        (entry) =>
          Buffer.byteLength(entry.sourceUrl) > 2048 ||
          /\[\[hollow-media:/i.test(entry.sourceUrl),
      )
    )
      throw failure("LLM_SOURCE_INVALID");
    let worker: Worker;
    try {
      worker = new Worker(this.workerPath, {
        workerData: { bytes: input.bytes, format: input.source.format, media },
        stdout: true,
        stderr: true,
        resourceLimits: {
          maxOldGenerationSizeMb: 128,
          maxYoungGenerationSizeMb: 16,
          stackSizeMb: 4,
        },
      });
    } catch {
      throw failure("LLM_SOURCE_INVALID");
    }
    worker.stdout.resume();
    worker.stderr.resume();
    return new Promise((resolve, reject) => {
      let exited = false;
      let stopping = false;
      let settled = false;
      let result: LlmPreparedSource | undefined;
      let error: LlmOperationError | undefined;
      const clean = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        worker.removeListener("message", message);
      };
      const finish = () => {
        if (settled || !exited) return;
        settled = true;
        clean();
        if (signal.aborted) reject(failure("LLM_UNAVAILABLE"));
        else if (error) reject(error);
        else if (result) resolve(result);
        else reject(failure("LLM_SOURCE_INVALID"));
      };
      const unproven = () => {
        if (exited) return finish();
        if (settled) return;
        settled = true;
        clean();
        reject(failure("LLM_OWNERSHIP_UNKNOWN", false));
      };
      const stop = () => {
        if (stopping || settled) return;
        stopping = true;
        try {
          void worker.terminate().then(
            () => (exited ? finish() : unproven()),
            () => (exited ? finish() : unproven()),
          );
        } catch {
          unproven();
        }
      };
      const abort = () => {
        error = failure("LLM_UNAVAILABLE");
        stop();
      };
      const timer = setTimeout(() => {
        error = failure("LLM_TIMEOUT");
        stop();
      }, LLM_LIMITS.prepareMs);
      const message = (value: unknown) => {
        if (stopping || settled) return;
        if (value && typeof value === "object" && "ok" in value) {
          if (value.ok === true && "value" in value)
            result = checked(
              value.value,
              input.source.format === "text" ? [] : media,
            );
          else if (
            value.ok === false &&
            "code" in value &&
            value.code === "LLM_RESOURCE_LIMIT"
          )
            error = failure("LLM_RESOURCE_LIMIT");
        }
        if (!result && !error) error = failure("LLM_SOURCE_INVALID");
        stop();
      };
      worker.on("message", message);
      worker.on("error", (cause: Error) => {
        error = failure(
          "code" in cause && cause.code === "ERR_WORKER_OUT_OF_MEMORY"
            ? "LLM_RESOURCE_LIMIT"
            : "LLM_SOURCE_INVALID",
        );
        stop();
      });
      worker.once("exit", () => {
        exited = true;
        finish();
      });
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}
