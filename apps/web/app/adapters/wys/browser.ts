import { z } from "zod";
import { type PackedPlan, type Plan, unpack } from "./model";

const text = z.string().max(800 * 1024);
const fragment = z.union([
  text,
  z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
]);
const id = z.string().max(32);
const notice = z.object({
  kind: z.string().max(100),
  reason: z.string().max(2000),
});
const packed = z.object({
  source: text,
  doc: z.unknown(),
  opaque: z
    .array(
      z.tuple([
        id,
        z.object({
          id,
          source: fragment,
          kind: z.enum(["inline", "block"]),
          label: z.string().max(1000),
        }),
      ]),
    )
    .max(10000),
  saved: z
    .array(
      z.tuple([
        id,
        z.object({
          tag: z.string().max(1000),
          attrs: z.record(z.string(), text),
          source: fragment,
          depth: z.number().int().min(0).max(128),
        }),
      ]),
    )
    .max(10000),
  losses: z.array(notice).max(100),
  notices: z.array(notice).max(100),
  lossCount: z.number().int().min(0).max(10000),
  noticeCount: z.number().int().min(0).max(10000),
  elapsedMs: z.number().min(0),
});
const reply = z.discriminatedUnion("ok", [
  z.object({ id: z.number().int(), ok: z.literal(true), value: packed }),
  z.object({
    id: z.number().int(),
    ok: z.literal(false),
    message: z.string().max(3000),
  }),
]);

export function decodeWysPlan(value: unknown): Plan {
  const data: PackedPlan = packed.parse(value);
  const pending: { node: unknown; depth: number }[] = [
    { node: data.doc, depth: 0 },
  ];
  let count = 0;
  while (pending.length) {
    const entry = pending.pop();
    if (!entry) break;
    const { node, depth } = entry;
    if (++count > 10000 || depth > 128 || !node || typeof node !== "object")
      throw new Error("WYSIWYGモデルの上限または形式が不正です。");
    if ("content" in node) {
      if (!Array.isArray(node.content))
        throw new Error("WYSIWYG本文の形式が不正です。");
      for (const child of node.content)
        pending.push({ node: child, depth: depth + 1 });
    }
  }
  for (const [, item] of [...data.opaque, ...data.saved]) {
    if (
      typeof item.source !== "string" &&
      (item.source[0] > item.source[1] || item.source[1] > data.source.length)
    )
      throw new Error("保存部分木の範囲が不正です。");
  }
  return unpack(data);
}

export class BrowserWysEditor {
  private sequence = 0;
  private cancel: (() => void) | undefined;
  prepare(source: string, signal?: AbortSignal): Promise<Plan> {
    this.cancel?.();
    if (signal?.aborted)
      return Promise.reject(
        new Error("準備を取り消しました。原文を保持しています。"),
      );
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      let done = false;
      const cleanup = () => {
        done = true;
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
        if (this.sequence === id) this.cancel = undefined;
      };
      const fail = (message: string) => {
        if (done) return;
        cleanup();
        reject(new Error(message));
      };
      const abort = () => fail("準備を取り消しました。原文を保持しています。");
      const timer = window.setTimeout(
        () =>
          fail(
            "WYSIWYG準備の2秒上限です。原文を保持しています。再試行またはHTMLで続けてください。",
          ),
        2000,
      );
      this.cancel = abort;
      signal?.addEventListener("abort", abort, { once: true });
      worker.onerror = () =>
        fail("WYSIWYGの準備を開始できません。原文を保持しています。");
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const input = reply.safeParse(event.data);
        if (!input.success) {
          fail("WYSIWYGの準備結果を確認できません。原文を保持しています。");
          return;
        }
        if (input.data.id !== id || done) return;
        if (!input.data.ok) {
          fail(input.data.message);
          return;
        }
        try {
          const plan = decodeWysPlan(input.data.value);
          cleanup();
          resolve(plan);
        } catch {
          fail(
            "WYSIWYGの準備結果が上限または形式に適合しません。原文を保持しています。",
          );
        }
      };
      worker.postMessage({ id, source });
    });
  }
  dispose() {
    this.cancel?.();
  }
}
