import { BusinessRuleError } from "@repo/core/domain/error";
import type { ExportDocumentPlan } from "./document";
import type { ExportSource, ExportSourceReader } from "./source";

export function exportStream(
  plan: ExportDocumentPlan,
  sources: readonly ExportSource[],
  reader: ExportSourceReader,
  signal: AbortSignal,
) {
  const media = new Map(sources.map((source) => [source.id, source]));
  let index = 0;
  let offset = 0;
  let current: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const encoder = new TextEncoder();
  const stopped = () =>
    new BusinessRuleError("EXPORT_CANCELLED", "書き出しを中止しました。");
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          if (signal.aborted) throw stopped();
          while (index < plan.segments.length) {
            const segment = plan.segments[index];
            if (!segment) throw stopped();
            if (segment.kind === "text") {
              let end = Math.min(segment.value.length, offset + 16000);
              if (
                end < segment.value.length &&
                /[\uD800-\uDBFF]/.test(segment.value[end - 1] ?? "")
              )
                end--;
              const chunk = segment.value.slice(offset, end);
              offset = end;
              if (offset === segment.value.length) {
                offset = 0;
                index++;
              }
              if (chunk) {
                controller.enqueue(encoder.encode(chunk));
                return;
              }
            } else {
              if (!current) {
                const source = media.get(segment.id);
                if (!source)
                  throw new BusinessRuleError(
                    "EXPORT_MEDIA_UNAVAILABLE",
                    "出力メディアが利用できません。",
                  );
                current = (await reader.open(source, signal)).getReader();
              }
              const next = await current.read();
              if (!next.done) {
                controller.enqueue(next.value);
                return;
              }
              current.releaseLock();
              current = null;
              index++;
            }
          }
          controller.close();
        } catch (error) {
          await current?.cancel();
          current = null;
          controller.error(error);
        }
      },
      async cancel() {
        await current?.cancel();
        current = null;
      },
    },
    { highWaterMark: 1 },
  );
}
