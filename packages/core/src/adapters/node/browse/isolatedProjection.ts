import { Worker } from "node:worker_threads";
import type {
  NoteProjection,
  NoteProjectionPort,
} from "@repo/core/application/browse/ports";
import { BROWSE_VERSION } from "@repo/core/domain/browse/query";
import { BusinessRuleError } from "@repo/core/domain/error";
import { assertHtmlSize } from "@repo/core/domain/note/entity";
import { z } from "zod";
import { withParserAdmission } from "../import/documentExtractor";

const segment = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);
const text = z.object({
  display: z.string().max(819200),
  normalized: z.string().max(2500000),
  segments: z.array(segment).max(1000000),
  words: z
    .array(z.tuple([z.string().max(819200), z.number().int().nonnegative()]))
    .max(500000),
});
const projection = z.object({
  version: z.literal(BROWSE_VERSION),
  sourceTitle: z.string().max(800),
  sourceHtml: z.string().max(819200),
  title: text,
  body: text,
  tokens: z.string().max(24000000),
  leadImage: z.string().max(256).nullable(),
  mediaLabel: z.string().max(20).nullable(),
});
export class IsolatedNoteProjection implements NoteProjectionPort {
  constructor(private readonly workerPath: string) {}
  async project(
    input: Readonly<{ title: string; html: string }>,
    signal?: AbortSignal,
  ): Promise<NoteProjection> {
    assertHtmlSize(input.html);
    const timeout = AbortSignal.timeout(3000);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    return withParserAdmission(async () => {
      if (combined.aborted)
        throw new BusinessRuleError(
          "PROJECTION_TIMEOUT",
          "本文の準備に時間がかかっています。入力を保持して再試行してください。",
        );
      const worker = new Worker(this.workerPath, {
        workerData: input,
        stdout: true,
        stderr: true,
        resourceLimits: { maxOldGenerationSizeMb: 256, stackSizeMb: 4 },
      });
      worker.stdout.resume();
      worker.stderr.resume();
      let result: NoteProjection | Error = new BusinessRuleError(
        "PROJECTION_FAILED",
        "本文の準備に失敗しました。入力を保持して再試行してください。",
      );
      return new Promise<NoteProjection>((resolve, reject) => {
        const abort = () => {
          result = new BusinessRuleError(
            "PROJECTION_TIMEOUT",
            "本文の準備に時間がかかっています。入力を保持して再試行してください。",
          );
          void worker.terminate();
        };
        combined.addEventListener("abort", abort, { once: true });
        worker.on("message", (message) => {
          const parsed = z
            .discriminatedUnion("kind", [
              z.object({ kind: z.literal("result"), value: projection }),
              z.object({
                kind: z.literal("failure"),
                error: z.object({
                  code: z.string().max(100),
                  message: z.string().max(500),
                }),
              }),
            ])
            .safeParse(message);
          if (parsed.success)
            result =
              parsed.data.kind === "result"
                ? parsed.data.value
                : new BusinessRuleError(
                    parsed.data.error.code,
                    parsed.data.error.message,
                  );
        });
        worker.once("error", () => {
          result = new BusinessRuleError(
            "PROJECTION_FAILED",
            "本文を準備できませんでした。再試行してください。",
          );
        });
        worker.once("exit", (code) => {
          combined.removeEventListener("abort", abort);
          if (code !== 0 || combined.aborted || result instanceof Error)
            reject(
              result instanceof Error
                ? result
                : new BusinessRuleError(
                    "PROJECTION_TIMEOUT",
                    "本文の準備を中止しました。",
                  ),
            );
          else resolve(result);
        });
      });
    }, combined);
  }
}
