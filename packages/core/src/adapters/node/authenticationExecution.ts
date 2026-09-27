import type { AuthenticationExecution } from "@repo/core/application/account/ports";
import { ConflictError } from "@repo/core/application/errors";
import type { PasswordHasher } from "@repo/core/application/ports/passwordHasher";

export class NodeAuthenticationExecution implements AuthenticationExecution {
  private readonly running = new Map<Promise<unknown>, AbortController>();
  private stopped = false;
  async run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.stopped || this.running.size >= 4)
      throw new ConflictError(
        "AUTH_BUSY",
        "認証処理が混み合っています。しばらく待ってやり直してください。",
      );
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("AUTH_DEADLINE")),
      10_000,
    );
    const result = Promise.resolve().then(() => work(controller.signal));
    this.running.set(result, controller);
    try {
      const value = await result;
      if (controller.signal.aborted)
        throw new ConflictError(
          "AUTH_EXCHANGE_UNKNOWN",
          "認証結果を確認できません。新しい認証手続きを開始してください。",
        );
      return value;
    } finally {
      clearTimeout(timer);
      this.running.delete(result);
    }
  }
  async stop() {
    this.stopped = true;
    for (const c of this.running.values()) c.abort(new Error("AUTH_STOPPED"));
    await Promise.allSettled([...this.running.keys()]);
  }
}

export class BoundedAuthenticationPasswordHasher implements PasswordHasher {
  private readonly running = new Set<Promise<unknown>>();
  private stopped = false;
  constructor(private readonly inner: PasswordHasher) {}
  private async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.stopped || this.running.size >= 2)
      throw new ConflictError(
        "AUTH_BUSY",
        "認証処理が混み合っています。しばらく待ってやり直してください。",
      );
    const result = Promise.resolve().then(work);
    this.running.add(result);
    try {
      return await result;
    } finally {
      this.running.delete(result);
    }
  }
  hash(password: string) {
    return this.run(() => this.inner.hash(password));
  }
  verify(password: string, hash: string) {
    return this.run(() => this.inner.verify(password, hash));
  }
  async stop() {
    this.stopped = true;
    await Promise.allSettled([...this.running]);
  }
}
