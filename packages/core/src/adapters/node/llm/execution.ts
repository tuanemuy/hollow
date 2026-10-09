import { isLlmObjectOwnershipUnprovenError } from "@repo/core/application/llm/ownershipError";
import {
  isLlmOperationError,
  type LlmExecution,
  LlmOperationError,
  type LlmRuntimeOwnership,
} from "@repo/core/application/llm/ports";
import type { Clock } from "@repo/core/application/ports/clock";
import type { SourceInputProof } from "@repo/core/application/regeneration/services";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";

export class NodeLlmExecution implements LlmExecution {
  private readonly operations = new Map<
    string,
    {
      accountId: string;
      controller: AbortController;
      done: Promise<void>;
      unknown: boolean;
      settled: boolean;
    }
  >();
  private stopped = false;
  constructor(
    private readonly ownership: LlmRuntimeOwnership,
    private readonly clock: Clock,
    private readonly verifyMachineClosure?: (
      jobId: string,
      proof: SourceInputProof,
    ) => Promise<boolean>,
  ) {}
  get runtimeId() {
    return this.ownership.runtimeId;
  }
  start(
    jobId: string,
    accountId: string,
    deadlineAt: Date,
    work: (signal: AbortSignal) => Promise<void>,
  ): boolean {
    this.ownership.assertReady();
    if (
      this.stopped ||
      this.operations.has(jobId) ||
      this.operations.size >= LLM_LIMITS.concurrency ||
      [...this.operations.values()].some(
        (operation) => operation.accountId === accountId || operation.unknown,
      )
    )
      return false;
    const controller = new AbortController();
    const remaining = deadlineAt.getTime() - this.clock.now().getTime();
    if (remaining <= 0) controller.abort();
    const timer = setTimeout(() => controller.abort(), Math.max(0, remaining));
    timer.unref();
    const operation = {
      accountId,
      controller,
      done: Promise.resolve(),
      unknown: false,
      settled: false,
    };
    this.operations.set(jobId, operation);
    operation.done = Promise.resolve()
      .then(() => work(controller.signal))
      .catch((error: unknown) => {
        operation.unknown =
          (isLlmOperationError(error) && !error.closed) ||
          (isLlmObjectOwnershipUnprovenError(error) &&
            error.owner.id === jobId);
        throw error;
      })
      .finally(() => {
        operation.settled = true;
        clearTimeout(timer);
        if (!operation.unknown) this.operations.delete(jobId);
      });
    void operation.done.catch(() => {});
    return true;
  }
  active(jobId: string): boolean {
    return this.operations.has(jobId);
  }
  async confirmClosed(
    jobId: string,
    proof: SourceInputProof,
  ): Promise<boolean> {
    const operation = this.operations.get(jobId);
    if (
      !operation ||
      !operation.unknown ||
      !operation.settled ||
      !this.verifyMachineClosure ||
      proof.receipt.consumer.kind !== "machine-regeneration" ||
      proof.receipt.consumer.id !== jobId ||
      proof.receipt.runtimeId !== this.runtimeId
    )
      return false;
    if (
      !(await this.verifyMachineClosure(jobId, proof)) ||
      this.operations.get(jobId) !== operation
    )
      return false;
    this.operations.delete(jobId);
    return true;
  }
  cancel(jobId: string): void {
    this.operations.get(jobId)?.controller.abort();
  }
  async stop(): Promise<void> {
    this.stopped = true;
    const operations = [...this.operations.values()];
    for (const operation of operations) operation.controller.abort();
    await Promise.allSettled(operations.map((operation) => operation.done));
    if (operations.some((operation) => operation.unknown))
      throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false);
  }
}
