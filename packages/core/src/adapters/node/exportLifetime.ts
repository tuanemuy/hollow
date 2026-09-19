import type { ExportLifetime } from "@repo/core/application/export/ports";
import { BusinessRuleError } from "@repo/core/domain/error";

type Operation = {
  controller: AbortController;
  timer: ReturnType<typeof setTimeout>;
  task: Promise<unknown> | null;
};
const stopped = () =>
  new BusinessRuleError(
    "EXPORT_BUSY",
    "書き出しを開始できません。しばらくしてやり直してください。",
  );
export class NodeExportLifetime implements ExportLifetime {
  private stopped = false;
  private readonly operations = new Map<string, Operation>();
  start(id: string, remainingMs: number) {
    if (this.stopped || this.operations.size >= 2 || this.operations.has(id))
      throw stopped();
    if (
      !Number.isFinite(remainingMs) ||
      remainingMs <= 0 ||
      remainingMs > 120000
    )
      throw stopped();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      this.release(id);
    }, remainingMs);
    timer.unref();
    this.operations.set(id, { controller, timer, task: null });
  }
  ids() {
    return [...this.operations.keys()];
  }
  generation<T>(id: string, work: (signal: AbortSignal) => Promise<T>) {
    return this.run(id, work, true);
  }
  delivery<T>(id: string, work: (signal: AbortSignal) => Promise<T>) {
    return this.run(id, work, false);
  }
  private async run<T>(
    id: string,
    work: (signal: AbortSignal) => Promise<T>,
    generation: boolean,
  ) {
    const operation = this.operations.get(id);
    if (
      !operation ||
      operation.task ||
      operation.controller.signal.aborted ||
      this.stopped
    )
      throw stopped();
    const signal = generation
      ? AbortSignal.any([
          operation.controller.signal,
          AbortSignal.timeout(30000),
        ])
      : operation.controller.signal;
    const task = work(signal);
    operation.task = task;
    try {
      return await task;
    } finally {
      operation.task = null;
    }
  }
  cancel(id: string) {
    this.operations.get(id)?.controller.abort();
  }
  release(id: string) {
    const operation = this.operations.get(id);
    if (!operation) return;
    if (operation.task) {
      operation.controller.abort();
      void operation.task
        .finally(() => {
          if (!operation.task) this.release(id);
        })
        .catch(() => {});
      return;
    }
    clearTimeout(operation.timer);
    this.operations.delete(id);
  }
  async stop() {
    this.stopped = true;
    for (const operation of this.operations.values())
      operation.controller.abort();
    await Promise.allSettled(
      [...this.operations.values()].map((operation) => operation.task),
    );
    for (const id of this.operations.keys()) this.release(id);
  }
}
