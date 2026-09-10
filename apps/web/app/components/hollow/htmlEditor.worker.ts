import {
  diagnoseHtml,
  HtmlVisualSession,
} from "@repo/core/adapters/html/editorAnalysis";
import { z } from "zod";

const text = z.string().max(800 * 1024);
const request = z.discriminatedUnion("operation", [
  z.object({
    id: z.number().int(),
    operation: z.literal("diagnose"),
    source: text,
  }),
  z.object({
    id: z.number().int(),
    operation: z.literal("project"),
    source: z.object({
      generation: z.string().max(100),
      canonical: text,
      rendered: z.string().max(2 * 1024 * 1024),
      document: z.string().max(3 * 1024 * 1024),
    }),
  }),
  z.object({
    id: z.number().int(),
    operation: z.literal("patch"),
    generation: z.string().max(100),
    patches: z
      .array(z.object({ id: z.string().max(32), before: text, after: text }))
      .max(10000),
  }),
]);
let session: HtmlVisualSession | undefined;
self.onmessage = (event: MessageEvent<unknown>) => {
  const input = request.safeParse(event.data);
  if (!input.success) {
    const envelope = z.object({ id: z.number().int() }).safeParse(event.data);
    if (envelope.success)
      self.postMessage({
        id: envelope.data.id,
        ok: false,
        message:
          "HTML 入力または解析要求の上限を超えています。本文は 800 KiB 以下に分割してください。入力は保持しています。",
      });
    return;
  }
  const data = input.data;
  try {
    let value: unknown;
    switch (data.operation) {
      case "diagnose":
        value = diagnoseHtml(data.source);
        break;
      case "project":
        session = new HtmlVisualSession(data.source);
        value = session.projection;
        break;
      case "patch":
        if (!session)
          throw new Error("編集解析を再開してください。入力は保持しています。");
        value = session.patch(data.generation, data.patches);
        break;
    }
    self.postMessage({ id: data.id, ok: true, value });
  } catch (error) {
    self.postMessage({
      id: data.id,
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "HTML を解析できません。入力は保持しています。",
    });
  }
};
