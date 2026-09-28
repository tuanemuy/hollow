import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import {
  type LlmDocumentPreparedSource,
  LlmOperationError,
  type LlmPrepareInput,
} from "@repo/core/application/llm/ports";
import { LLM_LIMITS, type LlmFailure } from "@repo/core/domain/llm/entity";
import { z } from "zod";
import {
  documentManifestHash,
  documentSegmentHash,
} from "./documentIdentity.mjs";

const hash = z.string().regex(/^[0-9a-f]{64}$/);
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const range = { ordinal: integer, firstBlock: integer, blockCount: integer };
const schema = z
  .object({
    kind: z.literal("text-blocks"),
    preparationVersion: z.literal(2),
    identity: z
      .object({
        kind: z.literal("prepared-document"),
        preparationVersion: z.literal(2),
        sha256: hash,
      })
      .strict(),
    coverage: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("office-text"),
          format: z.enum(["docx", "xlsx", "pptx"]),
          textComplete: z.literal(true),
          uninterpretedMedia: integer,
          units: z
            .array(
              z
                .object({
                  ...range,
                  kind: z.enum([
                    "body",
                    "header",
                    "footer",
                    "footnote",
                    "endnote",
                    "comment",
                    "sheet",
                    "slide",
                    "speaker-notes",
                  ]),
                })
                .strict(),
            )
            .min(1)
            .max(4096),
        })
        .strict(),
      z
        .object({
          kind: z.literal("pdf-text"),
          pages: z
            .array(
              z
                .object({
                  ...range,
                  class: z.enum(["text-covered", "proven-blank"]),
                })
                .strict(),
            )
            .min(1)
            .max(200),
        })
        .strict(),
    ]),
    segments: z
      .array(
        z
          .object({
            identity: z
              .object({
                kind: z.literal("prepared-segment"),
                sha256: hash,
                ordinal: integer,
              })
              .strict(),
            html: z.string().min(1).max(LLM_LIMITS.segmentBytes),
            firstBlock: integer,
            blockCount: integer.refine((n) => n > 0),
          })
          .strict(),
      )
      .min(1)
      .max(LLM_LIMITS.segments),
    blocks: integer.refine((n) => n > 0),
    notices: z
      .array(
        z
          .object({
            code: z.enum([
              "OFFICE_MEDIA_UNINTERPRETED",
              "OFFICE_HIDDEN_CONTENT_INCLUDED",
            ]),
            unit: integer,
            count: integer.refine((n) => n > 0),
          })
          .strict(),
      )
      .max(200),
    media: z.tuple([]),
  })
  .strict();

type Input = Extract<LlmPrepareInput, { preparationVersion: 2 }>;
const failure = (code: LlmFailure, closed = true) =>
  new LlmOperationError(code, "not-sent", closed);
const workerFailures = new Set<LlmFailure>([
  "LLM_RESOURCE_LIMIT",
  "LLM_SOURCE_INVALID",
  "LLM_DOCUMENT_ENCRYPTED",
  "LLM_DOCUMENT_CORRUPT",
  "LLM_DOCUMENT_UNSUPPORTED",
  "LLM_DOCUMENT_NO_TEXT",
  "LLM_PDF_VISUAL_REQUIRED",
  "LLM_PDF_ORDER_UNPROVEN",
]);
function checked(
  value: unknown,
  input: Input,
): LlmDocumentPreparedSource | undefined {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return;
  const prepared = parsed.data;
  const coverage = prepared.coverage;
  if (
    coverage.kind === "pdf-text"
      ? input.source.format !== "pdf"
      : input.source.format !== coverage.format
  )
    return;
  const units = coverage.kind === "pdf-text" ? coverage.pages : coverage.units;
  let blocks = 0;
  for (const [ordinal, unit] of units.entries()) {
    if (unit.ordinal !== ordinal || unit.firstBlock !== blocks) return;
    if (
      "class" in unit &&
      (unit.class === "proven-blank"
        ? unit.blockCount !== 0
        : unit.blockCount < 1)
    )
      return;
    blocks += unit.blockCount;
  }
  if (blocks !== prepared.blocks) return;
  let media = 0;
  const seen = new Set<string>();
  for (const notice of prepared.notices) {
    const key = `${notice.code}:${notice.unit}`;
    if (notice.unit >= units.length || seen.has(key)) return;
    seen.add(key);
    if (notice.code === "OFFICE_MEDIA_UNINTERPRETED") media += notice.count;
  }
  if (
    coverage.kind === "pdf-text"
      ? prepared.notices.length !== 0
      : media !== coverage.uninterpretedMedia
  )
    return;
  const manifest = documentManifestHash(
    input.source,
    coverage,
    prepared.notices,
    prepared.segments,
  );
  if (manifest !== prepared.identity.sha256) return;
  blocks = 0;
  for (const [ordinal, segment] of prepared.segments.entries()) {
    if (
      segment.identity.ordinal !== ordinal ||
      segment.firstBlock !== blocks ||
      Buffer.byteLength(segment.html) > LLM_LIMITS.segmentBytes ||
      /\[\[hollow-media:/i.test(segment.html) ||
      documentSegmentHash(
        manifest,
        ordinal,
        segment.firstBlock,
        segment.blockCount,
        segment.html,
      ) !== segment.identity.sha256
    )
      return;
    blocks += segment.blockCount;
  }
  return blocks === prepared.blocks ? prepared : undefined;
}

export class NodeLlmDocumentPreparer {
  constructor(private readonly workerPath: string | URL) {}
  async prepare(
    input: Input,
    signal: AbortSignal,
  ): Promise<LlmDocumentPreparedSource> {
    if (signal.aborted) throw failure("LLM_UNAVAILABLE");
    if (input.bytes.byteLength > 50 * 1024 * 1024)
      throw failure("LLM_RESOURCE_LIMIT");
    if (
      input.bytes.byteLength === 0 ||
      input.source.bytes !== input.bytes.byteLength ||
      createHash("sha256").update(input.bytes).digest("hex") !==
        input.source.sha256 ||
      input.promptVersion !== 1
    )
      throw failure("LLM_SOURCE_INVALID");
    let worker: Worker;
    try {
      worker = new Worker(this.workerPath, {
        workerData: input,
        stdout: true,
        stderr: true,
        resourceLimits: {
          maxOldGenerationSizeMb: 256,
          maxYoungGenerationSizeMb: 16,
          stackSizeMb: 4,
        },
      });
    } catch {
      throw failure("LLM_SOURCE_INVALID");
    }
    return new Promise((resolve, reject) => {
      let exited = false;
      let outEnded = false;
      let errEnded = false;
      let settled = false;
      let stopping = false;
      let received = false;
      let result: LlmDocumentPreparedSource | undefined;
      let error: LlmOperationError | undefined;
      const clean = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        worker.removeListener("message", message);
      };
      const finish = () => {
        if (settled || !exited || !outEnded || !errEnded) return;
        settled = true;
        clean();
        if (signal.aborted) reject(failure("LLM_UNAVAILABLE"));
        else if (error) reject(error);
        else if (result) resolve(result);
        else reject(failure("LLM_SOURCE_INVALID"));
      };
      const unknown = () => {
        if (exited) {
          finish();
          return;
        }
        if (settled) return;
        settled = true;
        clean();
        reject(failure("LLM_OWNERSHIP_UNKNOWN", false));
      };
      const stop = () => {
        if (settled || stopping) return;
        stopping = true;
        try {
          void worker.terminate().then(() => {
            if (exited) finish();
            else unknown();
          }, unknown);
        } catch {
          unknown();
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
        if (settled || stopping) return;
        if (received) {
          error = failure("LLM_SOURCE_INVALID");
          stop();
          return;
        }
        received = true;
        if (value && typeof value === "object" && "ok" in value) {
          if (value.ok === true && "value" in value)
            result = checked(value.value, input);
          else if (value.ok === false && "code" in value) {
            const code = [...workerFailures].find(
              (code) => code === value.code,
            );
            if (code) error = failure(code);
          }
        }
        if (!result && !error) error = failure("LLM_SOURCE_INVALID");
        if (error) stop();
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
      worker.once("exit", (code) => {
        exited = true;
        if (code !== 0 && !error) error = failure("LLM_SOURCE_INVALID");
        finish();
      });
      const out = () => {
        outEnded = true;
        finish();
      };
      const err = () => {
        errEnded = true;
        finish();
      };
      worker.stdout.once("end", out);
      worker.stdout.once("close", out);
      worker.stderr.once("end", err);
      worker.stderr.once("close", err);
      worker.stdout.resume();
      worker.stderr.resume();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}
