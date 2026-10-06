import { Worker } from "node:worker_threads";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  DocumentExtractor,
  Extraction,
  ImportFormat,
} from "@repo/core/application/ports/documentExtractor";
import { BusinessRuleError } from "@repo/core/domain/error";
import { z } from "zod";

const formats = z.enum([
  "html",
  "markdown",
  "text",
  "docx",
  "xlsx",
  "pptx",
  "pdf",
  "image",
  "audio",
]);
const extractionSchema = z.object({
  html: z.string().max(800 * 1024),
  coverage: z.enum(["complete", "partial", "no_text"]),
  notices: z
    .array(
      z.object({
        code: z.string().max(80),
        location: z.string().max(1024),
        message: z.string().max(2048),
      }),
    )
    .max(10000),
});
const failureMessages = {
  IMPORT_CORRUPT:
    "ファイルが破損しているか、内容を読み取れません。元のアプリから保存し直してください。",
  IMPORT_ENCRYPTED:
    "暗号化されたファイルです。パスワードを解除して取り込み直してください。",
  IMPORT_UNSUPPORTED:
    "このファイル形式には対応していません。HTML、Markdown、テキスト、Office、PDF、画像、音声を選んでください。",
  IMPORT_UNSAFE_XML:
    "安全に処理できない XML 定義が含まれています。元のアプリから保存し直してください。",
  IMPORT_RESOURCE_LIMIT:
    "処理できるファイルの規模を超えています。分割して取り込み直してください。",
  IMPORT_TIMEOUT:
    "ファイルの解析が制限時間を超えました。分割して取り込み直してください。",
  IMPORT_NETWORK_BLOCKED:
    "ファイル内の外部接続を拒否しました。外部参照を含まない形式で保存し直してください。",
  IMPORT_INVALID_ENCODING:
    "テキストの文字コードを読み取れません。UTF-8 または UTF-16 で保存し直してください。",
} as const;
type FailureCode = keyof typeof failureMessages;
const isFailureCode = (value: string): value is FailureCode =>
  Object.hasOwn(failureMessages, value);
const responseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    value: z.union([formats, extractionSchema]),
  }),
  z.object({ ok: z.literal(false), code: z.string() }),
]);

type Options = { timeoutMs?: number; maxMemoryMb?: number };
type Request =
  | { operation: "detect"; bytes: Uint8Array; filename: string }
  | { operation: "extract"; bytes: Uint8Array; format: ImportFormat };

let activeWorkers = 0;
const waiting: Array<() => void> = [];
class ParserWorkerCloseUnprovenError extends SystemError {
  constructor() {
    super(
      SystemErrorCode.DataIntegrityError,
      "Parser worker closure is unproven",
    );
  }
}
async function run(request: Request, options: Options): Promise<unknown> {
  return withParserAdmission(() => runInWorker(request, options));
}

export async function withParserAdmission<T>(
  work: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const cancelled = () =>
    new BusinessRuleError("IMPORT_TIMEOUT", failureMessages.IMPORT_TIMEOUT);
  if (signal?.aborted) throw cancelled();
  if (activeWorkers >= 2) {
    if (waiting.length >= 8)
      throw new BusinessRuleError(
        "IMPORT_RESOURCE_LIMIT",
        "変換処理が混み合っています。少し待ってから再試行してください。",
      );
    await new Promise<void>((resolve, reject) => {
      const resume = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      const abort = () => {
        const index = waiting.indexOf(resume);
        if (index >= 0) {
          waiting.splice(index, 1);
          reject(cancelled());
        }
      };
      waiting.push(resume);
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
    });
  } else activeWorkers++;
  let retained = false;
  try {
    return await work();
  } catch (error) {
    retained = error instanceof ParserWorkerCloseUnprovenError;
    throw error;
  } finally {
    if (!retained) {
      const next = waiting.shift();
      if (next) next();
      else activeWorkers--;
    }
  }
}

async function runInWorker(
  request: Request,
  options: Options,
): Promise<unknown> {
  if (request.bytes.byteLength > 50 * 1024 * 1024)
    throw new BusinessRuleError(
      "IMPORT_RESOURCE_LIMIT",
      failureMessages.IMPORT_RESOURCE_LIMIT,
    );
  const bytes = Uint8Array.from(request.bytes);
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxMemoryMb = options.maxMemoryMb ?? 256;
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    !Number.isSafeInteger(maxMemoryMb) ||
    maxMemoryMb < 32
  )
    throw new RangeError("Invalid document extractor limits");
  const worker = new Worker(
    new URL(
      "src/adapters/node/import/parserWorker.mjs",
      import.meta.resolve("@repo/core/package.json"),
    ),
    {
      workerData: { ...request, bytes },
      transferList: [bytes.buffer],
      resourceLimits: {
        maxOldGenerationSizeMb: maxMemoryMb,
        maxYoungGenerationSizeMb: Math.min(32, maxMemoryMb / 4),
        stackSizeMb: 4,
      },
      stdout: true,
      stderr: true,
    },
  );
  type Outcome =
    | { kind: "pending" }
    | { kind: "result"; value: unknown }
    | { kind: "failure"; code: FailureCode };
  type Termination =
    | { kind: "not-requested" }
    | { kind: "pending" }
    | { kind: "fulfilled"; code: number }
    | { kind: "failed" };
  let exitCode: number | null = null;
  const stdio = [worker.stdout, worker.stderr].map((stream) => ({
    stream,
    ended: false,
    closed: false,
  }));
  const closed = () =>
    exitCode !== null && stdio.every((value) => value.ended && value.closed);
  try {
    return await new Promise((resolve, reject) => {
      let outcome: Outcome = { kind: "pending" };
      let termination: Termination = { kind: "not-requested" };
      let settled = false;
      const settleClosed = () => {
        if (settled || !closed() || termination.kind === "pending") return;
        settled = true;
        clearTimeout(timer);
        worker.removeListener("message", message);
        worker.removeListener("error", error);
        worker.removeListener("exit", exit);
        for (const observer of observers) {
          observer.state.stream.removeListener("end", observer.end);
          observer.state.stream.removeListener("close", observer.close);
          observer.state.stream.removeListener("error", streamError);
        }
        if (
          outcome.kind === "result" &&
          termination.kind === "fulfilled" &&
          termination.code === exitCode &&
          (exitCode === 0 || exitCode === 1)
        ) {
          resolve(outcome.value);
        } else {
          const code =
            outcome.kind === "failure" ? outcome.code : "IMPORT_CORRUPT";
          reject(new BusinessRuleError(code, failureMessages[code]));
        }
      };
      const terminate = () => {
        if (termination.kind !== "not-requested") return;
        termination = { kind: "pending" };
        const failed = () => {
          termination = { kind: "failed" };
          if (outcome.kind !== "failure")
            outcome = { kind: "failure", code: "IMPORT_CORRUPT" };
          settleClosed();
        };
        try {
          void worker.terminate().then((code) => {
            termination = { kind: "fulfilled", code };
            settleClosed();
          }, failed);
        } catch {
          failed();
        }
      };
      const fail = (code: FailureCode) => {
        if (outcome.kind !== "failure") outcome = { kind: "failure", code };
        terminate();
        settleClosed();
      };
      const timer = setTimeout(() => fail("IMPORT_TIMEOUT"), timeoutMs);
      const message = (value: unknown) => {
        if (outcome.kind !== "pending") return;
        const response = responseSchema.safeParse(value);
        if (!response.success) return fail("IMPORT_CORRUPT");
        if (!response.data.ok)
          return fail(
            isFailureCode(response.data.code)
              ? response.data.code
              : "IMPORT_CORRUPT",
          );
        outcome = { kind: "result", value: response.data.value };
        terminate();
        settleClosed();
      };
      const error = (value: Error) =>
        fail(
          "code" in value && value.code === "ERR_WORKER_OUT_OF_MEMORY"
            ? "IMPORT_RESOURCE_LIMIT"
            : "IMPORT_CORRUPT",
        );
      const streamError = () => fail("IMPORT_CORRUPT");
      const exit = (code: number) => {
        exitCode = code;
        if (outcome.kind === "pending")
          outcome = { kind: "failure", code: "IMPORT_CORRUPT" };
        settleClosed();
      };
      const observers = stdio.map((state) => ({
        state,
        end: () => {
          state.ended = true;
          settleClosed();
        },
        close: () => {
          state.closed = true;
          settleClosed();
        },
      }));
      worker.once("message", message);
      worker.once("error", error);
      worker.once("exit", exit);
      for (const observer of observers) {
        observer.state.stream.once("end", observer.end);
        observer.state.stream.once("close", observer.close);
        observer.state.stream.once("error", streamError);
        observer.state.stream.resume();
      }
    });
  } catch (error) {
    if (closed() && error instanceof BusinessRuleError) throw error;
    throw new ParserWorkerCloseUnprovenError();
  }
}

export class IsolatedDocumentExtractor implements DocumentExtractor {
  constructor(private readonly options: Options = {}) {}

  async extract(input: {
    bytes: Uint8Array;
    format: ImportFormat;
  }): Promise<Extraction> {
    return extractionSchema.parse(
      await run({ operation: "extract", ...input }, this.options),
    );
  }
}

export async function detectFormat(
  bytes: Uint8Array,
  filename: string,
): Promise<ImportFormat> {
  return formats.parse(
    await run(
      { operation: "detect", bytes, filename: filename.slice(0, 1024) },
      {},
    ),
  );
}
