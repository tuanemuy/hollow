import { Worker } from "node:worker_threads";
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
  try {
    return await work();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else activeWorkers--;
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
  worker.stdout.resume();
  worker.stderr.resume();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (code: FailureCode | null, value?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (code) reject(new BusinessRuleError(code, failureMessages[code]));
      else resolve(value);
    };
    const timer = setTimeout(() => finish("IMPORT_TIMEOUT"), timeoutMs);
    worker.once("message", (message: unknown) => {
      const response = responseSchema.safeParse(message);
      if (!response.success) return finish("IMPORT_CORRUPT");
      if (response.data.ok) return finish(null, response.data.value);
      return finish(
        isFailureCode(response.data.code)
          ? response.data.code
          : "IMPORT_CORRUPT",
      );
    });
    worker.once("error", (error) =>
      finish(
        error instanceof Error &&
          "code" in error &&
          error.code === "ERR_WORKER_OUT_OF_MEMORY"
          ? "IMPORT_RESOURCE_LIMIT"
          : "IMPORT_CORRUPT",
      ),
    );
    worker.once("exit", () => finish("IMPORT_CORRUPT"));
  });
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
