import { ConflictError } from "@repo/core/application/errors";
import {
  type OpenRouterControlExecution,
  OpenRouterProviderError,
} from "@repo/core/application/integration/openRouter/ports";

export class NodeOpenRouterExecution implements OpenRouterControlExecution {
  private readonly running = new Map<Promise<unknown>, AbortController>();
  private stopped = false;
  async run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.stopped || this.running.size >= 4)
      throw new ConflictError(
        "OPENROUTER_BUSY",
        "連携処理が混み合っています。しばらく待ってからやり直してください。",
      );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const result = Promise.resolve().then(() => work(controller.signal));
    this.running.set(result, controller);
    try {
      const value = await result;
      if (controller.signal.aborted)
        throw new OpenRouterProviderError("OPENROUTER_UNAVAILABLE");
      return value;
    } finally {
      clearTimeout(timer);
      this.running.delete(result);
    }
  }
  async stop() {
    this.stopped = true;
    for (const controller of this.running.values()) controller.abort();
    await Promise.allSettled([...this.running.keys()]);
  }
}
