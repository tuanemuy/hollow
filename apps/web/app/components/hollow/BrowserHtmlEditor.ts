import type {
  HtmlDiagnostic,
  HtmlEditorAnalyzer,
  TextPatch,
  VisualProjection,
  VisualSource,
} from "@repo/core/application/ports/htmlEditor";
import { displayError } from "@/presentation/errorDisplay";

export class HtmlEditorError extends Error {}
export const htmlEditorErrorMessage = (cause: unknown) =>
  cause instanceof HtmlEditorError ? cause.message : displayError(cause);

type Reply = { id: number } & (
  | { ok: true; value: unknown }
  | { ok: false; message: string }
);
export class BrowserHtmlEditor implements HtmlEditorAnalyzer {
  private worker: Worker | undefined;
  private nextId = 0;
  private pending: { reject(error: Error): void; cleanup(): void } | undefined;
  private invoke<T>(
    request: Record<string, unknown>,
    milliseconds: number,
    signal?: AbortSignal,
  ): Promise<T> {
    if (this.pending)
      return Promise.reject(
        new HtmlEditorError("前の解析の完了を待ってください。"),
      );
    if (signal?.aborted)
      return Promise.reject(new HtmlEditorError("解析を取り消しました。"));
    this.worker ??= new Worker(
      new URL("./htmlEditor.worker.ts", import.meta.url),
      { type: "module" },
    );
    const worker = this.worker;
    const id = ++this.nextId;
    return new Promise<T>((resolve, reject) => {
      const fail = (message: string) => {
        this.pending?.cleanup();
        this.worker?.terminate();
        this.worker = undefined;
        reject(new HtmlEditorError(message));
      };
      const timer = window.setTimeout(
        () =>
          fail(
            "HTML 解析の制限時間を超えました。入力は保持しています。再試行または分割してください。",
          ),
        milliseconds,
      );
      const abort = () => fail("解析を取り消しました。入力は保持しています。");
      const cleanup = () => {
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        worker.onmessage = null;
        worker.onerror = null;
        this.pending = undefined;
      };
      this.pending = { reject, cleanup };
      signal?.addEventListener("abort", abort, { once: true });
      worker.onmessage = (event: MessageEvent<Reply>) => {
        const response = event.data;
        if (response.id !== id) return;
        cleanup();
        if (response.ok) resolve(response.value as T);
        else reject(new HtmlEditorError(response.message));
      };
      worker.onerror = () =>
        fail(
          "HTML 解析を開始できません。再試行してください。入力は保持しています。",
        );
      worker.postMessage({ ...request, id });
    });
  }
  diagnose(source: string, signal?: AbortSignal) {
    return this.invoke<readonly HtmlDiagnostic[]>(
      { operation: "diagnose", source },
      1000,
      signal,
    );
  }
  project(source: VisualSource, signal?: AbortSignal) {
    return this.invoke<VisualProjection>(
      { operation: "project", source },
      2000,
      signal,
    );
  }
  patch(
    generation: string,
    patches: readonly TextPatch[],
    signal?: AbortSignal,
  ) {
    return this.invoke<string>(
      { operation: "patch", generation, patches },
      2000,
      signal,
    );
  }
  dispose() {
    const pending = this.pending;
    pending?.cleanup();
    this.worker?.terminate();
    this.worker = undefined;
    pending?.reject(
      new HtmlEditorError("解析を中断しました。入力は保持しています。"),
    );
  }
}
