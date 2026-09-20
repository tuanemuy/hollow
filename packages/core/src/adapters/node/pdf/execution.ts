import type { PdfExecution } from "@repo/core/application/pdf/ports";

export class NodePdfExecution implements PdfExecution {
  private readonly operations = new Map<
    string,
    { controller: AbortController; done: Promise<void> }
  >();
  private stopping = false;
  start(
    id: string,
    deadlineAt: Date,
    work: (signal: AbortSignal) => Promise<void>,
  ) {
    if (this.stopping || this.operations.size) return false;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(0, deadlineAt.getTime() - Date.now()),
    );
    const done = Promise.resolve()
      .then(() => work(controller.signal))
      .finally(() => {
        clearTimeout(timer);
        this.operations.delete(id);
      });
    this.operations.set(id, { controller, done });
    void done.catch(() => {});
    return true;
  }
  active(id: string) {
    return this.operations.has(id);
  }
  cancel(id: string) {
    this.operations.get(id)?.controller.abort();
  }
  async stop() {
    this.stopping = true;
    for (const operation of this.operations.values())
      operation.controller.abort();
    await Promise.allSettled(
      [...this.operations.values()].map((operation) => operation.done),
    );
  }
}
