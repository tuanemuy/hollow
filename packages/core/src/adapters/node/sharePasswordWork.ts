import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { SharePasswordWork } from "@repo/core/application/ports/shareSecrets";

type Waiter = Readonly<{
  deadline: number;
  timer: ReturnType<typeof setTimeout>;
  resolve: () => void;
  reject: (cause: Error) => void;
}>;

const busy = () =>
  new SystemError(
    SystemErrorCode.SharePasswordBusy,
    "共有パスワードの処理が混み合っています。しばらくしてから再試行してください。",
  );

export class NodeSharePasswordWork implements SharePasswordWork {
  private readonly concurrency: number;
  private readonly queueLimit: number;
  private readonly waitMs: number;
  private running = 0;
  private stopped = false;
  private readonly queue: Waiter[] = [];
  private stopPromise: Promise<void> | undefined;
  private finishStop: (() => void) | undefined;

  constructor(
    options: Readonly<{
      concurrency?: number;
      queueLimit?: number;
      waitMs?: number;
    }> = {},
  ) {
    this.concurrency = options.concurrency ?? 2;
    this.queueLimit = options.queueLimit ?? 8;
    this.waitMs = options.waitMs ?? 3000;
    if (
      !Number.isSafeInteger(this.concurrency) ||
      this.concurrency < 1 ||
      !Number.isSafeInteger(this.queueLimit) ||
      this.queueLimit < 0 ||
      !Number.isSafeInteger(this.waitMs) ||
      this.waitMs < 1 ||
      this.waitMs > 2_147_483_647
    )
      throw new RangeError("Invalid share password work limits");
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    await this.reserve();
    try {
      return await operation();
    } finally {
      this.running--;
      this.drain();
      if (this.stopped && this.running === 0) this.finishStop?.();
    }
  }

  stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    this.stopped = true;
    for (const waiter of this.queue.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(busy());
    }
    this.stopPromise = new Promise<void>((resolve) => {
      if (this.running === 0) resolve();
      else this.finishStop = resolve;
    });
    return this.stopPromise;
  }

  private reserve(): Promise<void> {
    if (this.stopped) return Promise.reject(busy());
    this.drain();
    if (this.running < this.concurrency) {
      this.running++;
      return Promise.resolve();
    }
    if (this.queue.length >= this.queueLimit) return Promise.reject(busy());
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        deadline: performance.now() + this.waitMs,
        timer: setTimeout(() => {
          const index = this.queue.indexOf(waiter);
          if (index === -1) return;
          this.queue.splice(index, 1);
          reject(busy());
        }, this.waitMs),
        resolve,
        reject,
      };
      this.queue.push(waiter);
    });
  }

  private drain() {
    if (this.stopped) return;
    while (this.queue.length > 0) {
      const waiter = this.queue[0];
      if (!waiter) return;
      if (waiter.deadline > performance.now()) {
        if (this.running >= this.concurrency) return;
        this.queue.shift();
        clearTimeout(waiter.timer);
        this.running++;
        waiter.resolve();
      } else {
        this.queue.shift();
        clearTimeout(waiter.timer);
        waiter.reject(busy());
      }
    }
  }
}
