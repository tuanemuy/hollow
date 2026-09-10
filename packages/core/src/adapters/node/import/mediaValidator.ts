import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Worker } from "node:worker_threads";
import type { MediaValidator } from "@repo/core/application/ports/mediaValidator";
import { BusinessRuleError } from "@repo/core/domain/error";
import { isSerializableError } from "@repo/core/lib/error";
import { withParserAdmission } from "./documentExtractor";

const messages = {
  IMPORT_MEDIA_UNSUPPORTED:
    "この音声の構造は検査に対応していません。通常のM4A・MP3・WAVなどに保存し直してください。",
  IMPORT_CORRUPT:
    "画像・音声が破損しているか、必要なデータが欠けています。元のアプリから保存し直してください。",
  IMPORT_RESOURCE_LIMIT:
    "画像・音声の解析可能な規模を超えています。分割して取り込み直してください。",
  IMPORT_TIMEOUT:
    "画像・音声の検査が制限時間を超えました。分割して取り込み直してください。",
} as const;
type Code = keyof typeof messages;
const failure = (code: Code) => new BusinessRuleError(code, messages[code]);

export class IsolatedMediaValidator implements MediaValidator {
  constructor(private readonly timeoutMs = 30_000) {}

  async validate(input: Parameters<MediaValidator["validate"]>[0]) {
    try {
      await withParserAdmission(async () => {
        if (
          !Number.isSafeInteger(input.bytes) ||
          input.bytes < 1 ||
          input.bytes > (input.format === "audio" ? 200 : 50) * 1024 * 1024
        )
          throw failure("IMPORT_RESOURCE_LIMIT");
        const directory = await mkdtemp(
          path.join(os.tmpdir(), "hollow-media-"),
        );
        const file = path.join(directory, "source");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        let worker: Worker | undefined;
        try {
          let bytes = 0;
          await pipeline(
            Readable.fromWeb(
              input.body as import("node:stream/web").ReadableStream<Uint8Array>,
            ),
            new Transform({
              transform(chunk: Buffer, _encoding, callback) {
                bytes += chunk.length;
                callback(
                  bytes > input.bytes ? failure("IMPORT_CORRUPT") : null,
                  chunk,
                );
              },
            }),
            createWriteStream(file, { flags: "wx", mode: 0o600 }),
            { signal: controller.signal },
          );
          if (bytes !== input.bytes) throw failure("IMPORT_CORRUPT");
          worker = new Worker(
            new URL(
              "src/adapters/node/import/mediaWorker.mjs",
              import.meta.resolve("@repo/core/package.json"),
            ),
            {
              workerData: { file, bytes, format: input.format },
              resourceLimits: {
                maxOldGenerationSizeMb: 256,
                maxYoungGenerationSizeMb: 32,
                stackSizeMb: 4,
              },
              stdout: true,
              stderr: true,
            },
          );
          worker.stdout.resume();
          worker.stderr.resume();
          const active = worker;
          await new Promise<void>((resolve, reject) => {
            const abort = () => reject(failure("IMPORT_TIMEOUT"));
            controller.signal.addEventListener("abort", abort, { once: true });
            if (controller.signal.aborted) abort();
            active.once("message", (value: unknown) => {
              if (value === "ok") resolve();
              else
                reject(
                  failure(
                    value === "IMPORT_RESOURCE_LIMIT" ||
                      value === "IMPORT_MEDIA_UNSUPPORTED"
                      ? value
                      : "IMPORT_CORRUPT",
                  ),
                );
            });
            active.once("error", (error: unknown) =>
              reject(
                failure(
                  error instanceof Error &&
                    "code" in error &&
                    error.code === "ERR_WORKER_OUT_OF_MEMORY"
                    ? "IMPORT_RESOURCE_LIMIT"
                    : "IMPORT_CORRUPT",
                ),
              ),
            );
            active.once("exit", () => reject(failure("IMPORT_CORRUPT")));
          });
        } catch (error) {
          if (controller.signal.aborted) throw failure("IMPORT_TIMEOUT");
          if (isSerializableError(error)) throw error;
          throw failure("IMPORT_CORRUPT");
        } finally {
          clearTimeout(timer);
          if (worker) await worker.terminate();
          await rm(directory, { recursive: true, force: true });
        }
      });
    } finally {
      if (!input.body.locked) await input.body.cancel().catch(() => {});
    }
  }
}
