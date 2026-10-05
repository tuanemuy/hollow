import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { isSystemError, SystemErrorCode } from "@repo/core/application/errors";
import { currentLlmSource } from "@repo/core/application/llm/current";
import {
  candidateOutcome,
  leasedText,
  sameInputReceipt,
  sameInputSource,
  terminateCandidate,
} from "@repo/core/application/llm/inputStage";
import {
  isLlmOperationError,
  type LlmInputClaim,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import {
  currentInput,
  inputConsumer,
} from "@repo/core/application/regeneration/current";
import {
  beginInput,
  finishInput,
} from "@repo/core/application/regeneration/memory";
import type {
  ActiveInputReceipt,
  RegenerationServices,
  SourceInputAdmission,
  SourceInputLease,
  SourceInputProof,
} from "@repo/core/application/regeneration/services";
import { sourceStateInvalid } from "@repo/core/application/regeneration/services";
import { readInput } from "@repo/core/application/regeneration/source";
import type { LlmConversion } from "@repo/core/domain/llm/entity";
import type { RegenerationConsumer } from "@repo/core/domain/regeneration/source";
import { NodeRegenerationMemory } from "./memory";

export class NodeRegenerationInput {
  private readonly proofs = new WeakMap<SourceInputLease, SourceInputProof>();
  private readonly leases = new Map<string, SourceInputLease>();
  private readonly leaseSources = new Map<string, LlmConversion>();
  private readonly pending = new Map<
    string,
    {
      candidate: LlmConversion;
      admission: SourceInputAdmission;
      receipt: ActiveInputReceipt;
      fenced?: LlmConversion | undefined;
      recoverable: boolean;
    }
  >();
  private stopped = false;
  constructor(
    private readonly container: HollowContainer,
    private readonly services: RegenerationServices,
  ) {}
  private memory() {
    if (!(this.services.input instanceof NodeRegenerationMemory))
      return sourceStateInvalid();
    return this.services.input;
  }
  lease(value: LlmConversion) {
    const lease = this.leases.get(value.jobId);
    const source = this.leaseSources.get(value.jobId);
    return lease &&
      source &&
      sameInputSource(source, value) &&
      this.services.input.owns(lease) &&
      sameInputReceipt(lease.receipt, value.inputReceipt)
      ? lease
      : null;
  }
  async claim(): Promise<LlmInputClaim | null> {
    if (this.stopped) return null;
    const candidate = await this.container.unitOfWorkProvider.run((u) =>
      u.llmConversions.claimCandidate(this.container.clock.now()),
    );
    if (!candidate) return null;
    const terminated = await this.container.unitOfWorkProvider.run(
      async (u) => {
        const current = await u.llmConversions.find(candidate.jobId);
        if (!current || current.version !== candidate.version) return false;
        return terminateCandidate(this.container, u, current);
      },
    );
    if (terminated) return null;
    const runtimeId = this.runtimeId;
    const ownerToken = this.container.idGenerator.next();
    if (!leasedText(candidate)) {
      const value = await this.container.unitOfWorkProvider.run(async (u) => {
        const current = await u.llmConversions.find(candidate.jobId);
        if (
          !current ||
          current.version !== candidate.version ||
          (await terminateCandidate(this.container, u, current))
        )
          return null;
        return u.llmConversions.claimExact({
          candidate,
          runtimeId,
          ownerToken,
          receipt: null,
          now: this.container.clock.now(),
        });
      });
      return value ? { value, lease: null } : null;
    }
    const memory = this.memory();
    const reserved = memory.tryReserveBegin({
      kind: "llm-conversion",
      id: candidate.jobId,
    });
    if (reserved.kind === "busy") return null;
    const receipt: ActiveInputReceipt = {
      consumer: reserved.admission.consumer,
      runtimeId,
      token: ownerToken,
      generation: (candidate.inputReceipt?.generation ?? 0) + 1,
      state: "active",
    };
    try {
      memory.bindBegin(reserved.admission, receipt);
    } catch (error) {
      memory.holdBegin(reserved.admission);
      throw error;
    }
    const intent: {
      candidate: LlmConversion;
      admission: SourceInputAdmission;
      receipt: ActiveInputReceipt;
      fenced?: LlmConversion | undefined;
      recoverable: boolean;
    } = {
      candidate,
      admission: reserved.admission,
      receipt,
      recoverable: true,
    };
    this.pending.set(candidate.jobId, intent);
    try {
      const committed = await memory.claimTransaction(
        intent.admission,
        this.container.unitOfWorkProvider,
        async (u) => {
          const current = await u.llmConversions.find(candidate.jobId);
          if (!current || current.version !== candidate.version)
            return { kind: "no-claim" };
          if (await terminateCandidate(this.container, u, current)) {
            intent.fenced =
              (await u.llmConversions.find(current.jobId)) ?? undefined;
            return { kind: "fenced" };
          }
          const value = await u.llmConversions.claimExact({
            candidate,
            runtimeId,
            ownerToken,
            receipt,
            now: this.container.clock.now(),
          });
          return value ? { kind: "claimed", value } : { kind: "no-claim" };
        },
      );
      this.pending.delete(candidate.jobId);
      if (committed.result.kind !== "claimed" || !committed.lease) return null;
      this.leases.set(candidate.jobId, committed.lease);
      this.leaseSources.set(candidate.jobId, committed.result.value);
      return { value: committed.result.value, lease: committed.lease };
    } catch (error) {
      if (
        !isSystemError(error) ||
        error.code !== SystemErrorCode.DatabaseError
      ) {
        intent.recoverable = false;
        throw error;
      }
      return null;
    }
  }
  private runtimeIdValue: string | null = null;
  configureRuntime(runtimeId: string) {
    if (this.runtimeIdValue !== null) return sourceStateInvalid();
    this.runtimeIdValue = runtimeId;
  }
  private get runtimeId() {
    if (this.runtimeIdValue === null) return sourceStateInvalid();
    return this.runtimeIdValue;
  }
  async resume(): Promise<readonly LlmInputClaim[]> {
    const resumed: LlmInputClaim[] = [];
    for (const intent of this.pending.values()) {
      if (!intent.recoverable) continue;
      try {
        const committed = await this.memory().claimTransaction(
          intent.admission,
          this.container.unitOfWorkProvider,
          async (u) => {
            const current = await u.llmConversions.find(intent.candidate.jobId);
            if (!current || !sameInputSource(current, intent.candidate))
              return { kind: "no-claim" };
            if (
              intent.fenced &&
              JSON.stringify(current) === JSON.stringify(intent.fenced) &&
              current.version > intent.candidate.version
            )
              return { kind: "fenced" };
            if (
              sameInputReceipt(current.inputReceipt, intent.receipt) &&
              current.sourceMemoryBytes === 52_428_800 &&
              current.owner.state === "active" &&
              current.owner.runtimeId === intent.receipt.runtimeId &&
              current.owner.token === intent.receipt.token
            )
              return { kind: "claimed", value: current };
            if (
              current.sourceMemoryBytes !== 0 ||
              !sameInputReceipt(
                current.inputReceipt,
                intent.candidate.inputReceipt,
              )
            )
              return { kind: "no-claim" };
            const outcome = await candidateOutcome(this.container, u, current);
            if (outcome) {
              if (await terminateCandidate(this.container, u, current)) {
                intent.fenced =
                  (await u.llmConversions.find(current.jobId)) ?? undefined;
                return { kind: "fenced" };
              }
              return { kind: "no-claim" };
            }
            if (current.version !== intent.candidate.version)
              return { kind: "no-claim" };
            const value = await u.llmConversions.claimExact({
              candidate: intent.candidate,
              runtimeId: intent.receipt.runtimeId,
              ownerToken: intent.receipt.token,
              receipt: intent.receipt,
              now: this.container.clock.now(),
            });
            return value ? { kind: "claimed", value } : { kind: "no-claim" };
          },
        );
        if (committed.result.kind === "no-claim") continue;
        this.pending.delete(intent.candidate.jobId);
        if (committed.result.kind === "claimed" && committed.lease) {
          this.leases.set(intent.candidate.jobId, committed.lease);
          this.leaseSources.set(intent.candidate.jobId, committed.result.value);
          resumed.push({
            value: committed.result.value,
            lease: committed.lease,
          });
        }
      } catch (error) {
        if (
          !isSystemError(error) ||
          error.code !== SystemErrorCode.DatabaseError
        ) {
          intent.recoverable = false;
          throw error;
        }
      }
    }
    return resumed;
  }
  async prepare(value: LlmConversion, signal: AbortSignal) {
    const lease = this.lease(value);
    if (!lease || value.selection !== "fixed" || value.preparationVersion !== 1)
      return sourceStateInvalid();
    try {
      await this.read(lease, signal);
      const checked = await this.container.unitOfWorkProvider.run((u) =>
        currentLlmSource(u, value, this.container.clock.now(), this),
      );
      if (signal.aborted)
        throw new LlmOperationError("LLM_TIMEOUT", "not-sent", true);
      const prepared = await this.services.input.prepareText(
        lease,
        value.source,
        signal,
        checked.media.map(({ sourceUrl, placeholder }) => ({
          sourceUrl,
          placeholder,
        })),
      );
      await this.finish(lease);
      return prepared;
    } catch (error) {
      if (this.services.input.owns(lease)) {
        this.services.input.discard(lease);
        await this.finish(lease);
      }
      if (isLlmOperationError(error)) throw error;
      throw new LlmOperationError(
        "LLM_SOURCE_CHANGED",
        "not-sent",
        !this.leases.has(value.jobId),
      );
    }
  }
  discard(value: LlmConversion) {
    const lease = this.lease(value);
    if (!lease) return sourceStateInvalid();
    this.services.input.discard(lease);
  }
  async stop() {
    this.stopped = true;
    await this.resume();
    if (this.pending.size || this.leases.size)
      throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
  }
  begin(consumer: RegenerationConsumer) {
    return beginInput(this.container, this.services, consumer);
  }
  read(lease: SourceInputLease, signal: AbortSignal) {
    return readInput(this.container, this.services, lease, signal);
  }
  async prepareText(lease: SourceInputLease, signal: AbortSignal) {
    const input = await this.container.unitOfWorkProvider.run((u) =>
      currentInput(this.container, u, lease.receipt.consumer),
    );
    const format = input.source.format;
    if (format !== "text" && format !== "html" && format !== "markdown")
      return sourceStateInvalid();
    return this.services.input.prepareText(
      lease,
      {
        ...input.source,
        kind: "original",
        originalId: input.originalId,
        format,
      },
      signal,
    );
  }
  finalCheck(lease: SourceInputLease, signal: AbortSignal) {
    return readInput(
      this.container,
      this.services,
      lease,
      signal,
      "final-check",
    );
  }
  async finish(value: SourceInputLease | LlmConversion) {
    const lease = "receipt" in value ? value : this.leases.get(value.jobId);
    if (!lease) return sourceStateInvalid();
    const proof =
      this.proofs.get(lease) ??
      this.services.input.finish(lease, this.container.idGenerator.next());
    this.proofs.set(lease, proof);
    try {
      await finishInput(this.container, this.services, proof);
    } catch (error) {
      if (!isSystemError(error) || error.code !== SystemErrorCode.DatabaseError)
        throw error;
      const saved = await this.container.unitOfWorkProvider.run((u) =>
        inputConsumer(u, proof.receipt.consumer, this.container.clock.now()),
      );
      if (
        saved.owner.state === "unknown" ||
        saved.memory !== 0 ||
        !saved.receipt ||
        !this.services.input.verify(proof, saved.receipt) ||
        !sameInputReceipt(saved.receipt, proof.receipt)
      )
        throw error;
      this.services.input.consume(proof);
    }
    if (lease.receipt.consumer.kind === "llm-conversion") {
      this.leases.delete(lease.receipt.consumer.id);
      this.leaseSources.delete(lease.receipt.consumer.id);
    }
  }
}
