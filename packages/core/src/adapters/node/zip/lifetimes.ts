import { randomUUID } from "node:crypto";
import type { Clock } from "@repo/core/application/ports/clock";
import { ObjectOwnershipUnprovenError } from "@repo/core/application/ports/objectOwnership";
import { ZipExecutionUnprovenError } from "@repo/core/application/zip/executionError";
import type {
  ZipExecution,
  ZipTransfers,
} from "@repo/core/application/zip/ports";
import { BusinessRuleError } from "@repo/core/domain/error";

export class NodeZipExecution implements ZipExecution {
  readonly runtimeId = randomUUID();
  private readonly operations = new Map<
    string,
    {
      controller: AbortController;
      done: Promise<void>;
      unknown: ObjectOwnershipUnprovenError | ZipExecutionUnprovenError | null;
    }
  >();
  private stopped = false;
  constructor(private readonly clock: Clock) {}
  async waitForPoll(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const aborted = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", aborted);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", aborted);
        resolve();
      }, 2000);
      signal.addEventListener("abort", aborted, { once: true });
    });
  }
  start(
    id: string,
    deadlineAt: Date,
    work: (signal: AbortSignal) => Promise<void>,
  ) {
    if (this.stopped || this.operations.size) return false;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(0, deadlineAt.getTime() - this.clock.now().getTime()),
    );
    timer.unref();
    const operation: {
      controller: AbortController;
      done: Promise<void>;
      unknown: ObjectOwnershipUnprovenError | ZipExecutionUnprovenError | null;
    } = { controller, done: Promise.resolve(), unknown: null };
    operation.done = Promise.resolve()
      .then(() => work(controller.signal))
      .catch((error: unknown) => {
        if (
          error instanceof ObjectOwnershipUnprovenError ||
          error instanceof ZipExecutionUnprovenError
        )
          operation.unknown = error;
        throw error;
      })
      .finally(() => {
        clearTimeout(timer);
        if (!operation.unknown) this.operations.delete(id);
      });
    this.operations.set(id, operation);
    void operation.done.catch(() => {});
    return true;
  }
  active(id: string) {
    return this.operations.has(id);
  }
  cancel(id: string) {
    this.operations.get(id)?.controller.abort();
  }
  async within<T>(
    deadlineAt: Date,
    parent: AbortSignal,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const signal = AbortSignal.any([parent, controller.signal]);
    const remaining = deadlineAt.getTime() - this.clock.now().getTime();
    if (remaining <= 0) controller.abort();
    const timer = setTimeout(() => controller.abort(), Math.max(0, remaining));
    timer.unref();
    try {
      if (signal.aborted)
        throw new BusinessRuleError(
          "ZIP_STAGE_DEADLINE",
          "ZIP処理の時間制限に達しました。",
        );
      const result = await work(signal);
      if (signal.aborted || this.clock.now() >= deadlineAt)
        throw new BusinessRuleError(
          "ZIP_STAGE_DEADLINE",
          "ZIP処理の時間制限に達しました。",
        );
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
  async stop() {
    this.stopped = true;
    const operations = [...this.operations.values()];
    for (const operation of operations) operation.controller.abort();
    await Promise.allSettled(operations.map((operation) => operation.done));
    const unknown = operations.find((operation) => operation.unknown)?.unknown;
    if (unknown) throw unknown;
  }
}

export class NodeZipTransfers implements ZipTransfers {
  readonly runtimeId = randomUUID();
  private readonly operations = new Map<
    string,
    {
      controller: AbortController;
      timer: ReturnType<typeof setTimeout>;
      closed: Promise<void>;
      resolve: () => void;
      reject: (error: unknown) => void;
      unknown: ObjectOwnershipUnprovenError | null;
    }
  >();
  private stopped = false;
  constructor(private readonly clock: Clock) {}
  hold(id: string, expiresAt: Date) {
    if (
      this.stopped ||
      this.operations.size >= 2 ||
      this.operations.has(id) ||
      [...this.operations.values()].some((operation) => operation.unknown)
    )
      throw new BusinessRuleError(
        "ZIP_DELIVERY_BUSY",
        "ZIP取得の終了確認を待っています。",
      );
    const remaining = expiresAt.getTime() - this.clock.now().getTime();
    if (remaining <= 0)
      throw new BusinessRuleError("ZIP_EXPIRED", "ZIP取得の期限が切れました。");
    const controller = new AbortController();
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const closed = new Promise<void>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    void closed.catch(() => {});
    const timer = setTimeout(() => controller.abort(), remaining);
    timer.unref();
    this.operations.set(id, {
      controller,
      timer,
      closed,
      resolve,
      reject,
      unknown: null,
    });
    return controller.signal;
  }
  ids() {
    return [...this.operations.keys()];
  }
  cancel(id: string) {
    this.operations.get(id)?.controller.abort();
  }
  release(id: string) {
    const operation = this.operations.get(id);
    if (!operation || operation.unknown) return;
    clearTimeout(operation.timer);
    this.operations.delete(id);
    operation.resolve();
  }
  retain(id: string, error: ObjectOwnershipUnprovenError) {
    const operation = this.operations.get(id);
    if (
      !operation ||
      error.owner.kind !== "zip-delivery" ||
      error.owner.id !== id
    )
      throw error;
    operation.unknown = error;
    operation.controller.abort();
    clearTimeout(operation.timer);
    operation.reject(error);
  }
  async stop() {
    this.stopped = true;
    const operations = [...this.operations.values()];
    for (const operation of operations) operation.controller.abort();
    await Promise.all(operations.map((operation) => operation.closed));
  }
}
