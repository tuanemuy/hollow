import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Worker } from "node:worker_threads";
import type { InlineMediaProcessor } from "@repo/core/application/ports/inlineMediaProcessor";
import { BusinessRuleError } from "@repo/core/domain/error";
import { isSerializableError } from "@repo/core/lib/error";
import { z } from "zod";
import { withParserAdmission } from "./import/documentExtractor";

const resultSchema = z.object({
  mime: z.enum([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
  ]),
  kind: z.enum(["image", "video"]),
  sanitizedSvg: z.instanceof(Uint8Array).optional(),
  removed: z.array(z.string()).max(100),
});
const messages = {
  MEDIA_CORRUPT:
    "メディアが破損しているか、必要なデータが欠けています。元のアプリで保存し直してください。",
  MEDIA_UNSUPPORTED:
    "対応していないメディア形式または動画構造です。PNG・JPEG・GIF・WebP・SVG・MP4・WebMを選択してください。",
  MEDIA_UNSAFE_SVG:
    "SVGのXML定義または実体参照が安全ではありません。実体参照なしで保存し直してください。",
  MEDIA_SIZE: "画像は20 MB、動画は200 MB以内にしてください。",
  MEDIA_RESOURCE_LIMIT:
    "メディアの解析可能な規模を超えています。サイズ・解像度を小さくしてください。",
  MEDIA_TIMEOUT:
    "メディアの検査が制限時間を超えました。小さくして再試行してください。",
} as const;
const failure = (code: keyof typeof messages) =>
  new BusinessRuleError(code, messages[code]);
export class IsolatedInlineMediaProcessor implements InlineMediaProcessor {
  constructor(private readonly timeoutMs = 30_000) {}
  async inspect(input: Parameters<InlineMediaProcessor["inspect"]>[0]) {
    try {
      return await withParserAdmission(async () => {
        if (
          !Number.isSafeInteger(input.bytes) ||
          input.bytes < 1 ||
          input.bytes > 200 * 1024 * 1024
        )
          throw failure("MEDIA_SIZE");
        const directory = await mkdtemp(
          path.join(os.tmpdir(), "hollow-inline-"),
        );
        const file = path.join(directory, "input");
        const controller = new AbortController();
        const abort = () => controller.abort();
        input.signal?.addEventListener("abort", abort, { once: true });
        if (input.signal?.aborted) abort();
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
                  bytes > input.bytes ? failure("MEDIA_CORRUPT") : null,
                  chunk,
                );
              },
            }),
            createWriteStream(file, { flags: "wx", mode: 0o600 }),
            { signal: controller.signal },
          );
          if (bytes !== input.bytes) throw failure("MEDIA_CORRUPT");
          worker = new Worker(
            new URL(
              "src/adapters/node/inlineMediaWorker.mjs",
              import.meta.resolve("@repo/core/package.json"),
            ),
            {
              workerData: { operation: "inline", file, bytes },
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
          const result = await new Promise<z.infer<typeof resultSchema>>(
            (resolve, reject) => {
              controller.signal.addEventListener(
                "abort",
                () => reject(failure("MEDIA_TIMEOUT")),
                { once: true },
              );
              if (controller.signal.aborted) reject(failure("MEDIA_TIMEOUT"));
              active.once("message", (value: unknown) => {
                const parsed = resultSchema.safeParse(value);
                if (parsed.success) resolve(parsed.data);
                else
                  reject(
                    failure(
                      typeof value === "string" && value in messages
                        ? (value as keyof typeof messages)
                        : "MEDIA_CORRUPT",
                    ),
                  );
              });
              active.once("error", (error: Error) =>
                reject(
                  failure(
                    "code" in error && error.code === "ERR_WORKER_OUT_OF_MEMORY"
                      ? "MEDIA_RESOURCE_LIMIT"
                      : "MEDIA_CORRUPT",
                  ),
                ),
              );
              active.once("exit", () => reject(failure("MEDIA_CORRUPT")));
            },
          );
          return {
            mime: result.mime,
            kind: result.kind,
            removed: result.removed,
            ...(result.sanitizedSvg
              ? { sanitizedSvg: result.sanitizedSvg }
              : {}),
          };
        } catch (error) {
          if (controller.signal.aborted) throw failure("MEDIA_TIMEOUT");
          if (isSerializableError(error)) throw error;
          throw failure("MEDIA_CORRUPT");
        } finally {
          clearTimeout(timer);
          input.signal?.removeEventListener("abort", abort);
          if (worker) await worker.terminate();
          await rm(directory, { recursive: true, force: true });
        }
      }, input.signal);
    } finally {
      if (!input.body.locked) await input.body.cancel().catch(() => {});
    }
  }
}
