import { Worker } from "node:worker_threads";
import type { WorkspaceIconProcessor } from "@repo/core/application/ports/workspaceIconProcessor";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  ICON_OUTPUT_BYTES,
  ICON_TIMEOUT_MS,
  validateIconInput,
} from "@repo/core/domain/workspace/icon";
import { isSerializableError } from "@repo/core/lib/error";
import { z } from "zod";
import { withParserAdmission } from "./import/documentExtractor";

const resultSchema = z.object({
  data: z
    .instanceof(Uint8Array)
    .refine((b) => b.length > 0 && b.length <= ICON_OUTPUT_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().min(1).max(512),
  height: z.number().int().min(1).max(512),
});
const messages = {
  ICON_SIZE: "アイコンは5 MiB以内の画像を選択してください。",
  ICON_FORMAT: "内容がPNG・JPEG・WebPのいずれかの画像を選択してください。",
  ICON_OUTPUT_SIZE:
    "変換後の画像が上限を超えています。別の画像を選択してください。",
  ICON_CORRUPT:
    "画像が破損しているか内容を確認できません。保存し直して再試行してください。",
  IMPORT_RESOURCE_LIMIT:
    "画像の解像度やフレーム数が処理上限を超えています。小さくして再試行してください。",
  ICON_TIMEOUT:
    "画像処理が制限時間を超えました。小さくして再試行してください。",
} as const;
const failure = (code: keyof typeof messages) =>
  new BusinessRuleError(code, messages[code]);
export class IsolatedWorkspaceIconProcessor implements WorkspaceIconProcessor {
  constructor(private readonly timeoutMs = ICON_TIMEOUT_MS) {}
  async process(input: Parameters<WorkspaceIconProcessor["process"]>[0]) {
    validateIconInput(input.bytes, input.mime);
    const deadline = AbortSignal.timeout(this.timeoutMs);
    const signal = input.signal
      ? AbortSignal.any([input.signal, deadline])
      : deadline;
    try {
      return await withParserAdmission(async () => {
        const data = new Uint8Array(input.bytes);
        const reader = input.body.getReader();
        let length = 0;
        const abortRead = () => {
          void reader.cancel().catch(() => {});
        };
        signal.addEventListener("abort", abortRead, { once: true });
        try {
          if (signal.aborted) throw failure("ICON_TIMEOUT");
          for (;;) {
            const part = await reader.read();
            if (signal.aborted) throw failure("ICON_TIMEOUT");
            if (part.done) break;
            if (length + part.value.length > data.length)
              throw failure("ICON_SIZE");
            data.set(part.value, length);
            length += part.value.length;
          }
          if (length !== data.length) throw failure("ICON_CORRUPT");
        } finally {
          signal.removeEventListener("abort", abortRead);
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
        const worker = new Worker(
          new URL(
            "src/adapters/node/workspaceIconWorker.mjs",
            import.meta.resolve("@repo/core/package.json"),
          ),
          {
            workerData: {
              operation: "inline",
              data,
              bytes: input.bytes,
              mime: input.mime,
            },
            transferList: [data.buffer],
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
        let onAbort = () => {};
        try {
          return await new Promise<z.infer<typeof resultSchema>>(
            (resolve, reject) => {
              onAbort = () => reject(failure("ICON_TIMEOUT"));
              signal.addEventListener("abort", onAbort, { once: true });
              if (signal.aborted) onAbort();
              worker.once("message", (value: unknown) => {
                const result = resultSchema.safeParse(value);
                if (result.success) resolve(result.data);
                else
                  reject(
                    failure(
                      typeof value === "string" &&
                        Object.hasOwn(messages, value)
                        ? (value as keyof typeof messages)
                        : "ICON_CORRUPT",
                    ),
                  );
              });
              worker.once("error", () => reject(failure("ICON_CORRUPT")));
              worker.once("exit", () => reject(failure("ICON_CORRUPT")));
            },
          );
        } finally {
          signal.removeEventListener("abort", onAbort);
          await worker.terminate();
        }
      }, signal);
    } catch (error) {
      if (signal.aborted) throw failure("ICON_TIMEOUT");
      if (isSerializableError(error)) throw error;
      throw failure("ICON_CORRUPT");
    } finally {
      if (!input.body.locked) await input.body.cancel().catch(() => {});
    }
  }
}
