import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import {
  isLlmOperationError,
  type LlmSourceMedia,
  type LlmSourcePreparer,
} from "@repo/core/application/llm/ports";
import type {
  ActiveInputReceipt,
  RegenerationInput,
  SourceInputAdmission,
  SourceInputLease,
  SourceInputProof,
} from "@repo/core/application/regeneration/services";
import { sourceStateInvalid } from "@repo/core/application/regeneration/services";
import type {
  LlmConversion,
  LlmLegacyFormat,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";
import {
  type RegenerationConsumer,
  regenerationConsumerSchema,
  SOURCE_MEMORY_BYTES,
  SOURCE_MEMORY_LIMIT,
  type SourceInputReceipt,
  sourceInputReceiptSchema,
} from "@repo/core/domain/regeneration/source";

export type InputClaimCommit =
  | Readonly<{ kind: "claimed"; value: LlmConversion }>
  | Readonly<{ kind: "no-claim" }>
  | Readonly<{ kind: "fenced" }>;

type Admission =
  | { state: "reserved" }
  | { state: "bound" | "unknown"; receipt: ActiveInputReceipt };

type Entry = {
  lease: SourceInputLease;
  bytes: Uint8Array | null;
  busy: boolean;
  reading: boolean;
  unknown: boolean;
  proof: SourceInputProof | null;
};
export class NodeRegenerationMemory implements RegenerationInput {
  private readonly entries = new Map<SourceInputLease, Entry>();
  private readonly admissions = new Map<SourceInputAdmission, Admission>();
  constructor(private readonly preparer: LlmSourcePreparer) {}
  tryReserveBegin(consumer: RegenerationConsumer) {
    const parsed = regenerationConsumerSchema.parse(consumer);
    const same = (other: RegenerationConsumer) =>
      other.kind === parsed.kind && other.id === parsed.id;
    if (
      (this.entries.size + this.admissions.size) * SOURCE_MEMORY_BYTES >=
        SOURCE_MEMORY_LIMIT ||
      [...this.entries.keys()].some((lease) => same(lease.receipt.consumer)) ||
      [...this.admissions.keys()].some((admission) => same(admission.consumer))
    )
      return { kind: "busy" as const };
    return { kind: "reserved" as const, admission: this.reserveBegin(parsed) };
  }
  reserveBegin(consumer: RegenerationConsumer): SourceInputAdmission {
    const parsed = regenerationConsumerSchema.parse(consumer);
    const same = (other: RegenerationConsumer) =>
      other.kind === parsed.kind && other.id === parsed.id;
    if (
      (this.entries.size + this.admissions.size) * SOURCE_MEMORY_BYTES >=
        SOURCE_MEMORY_LIMIT ||
      [...this.entries.keys()].some((lease) => same(lease.receipt.consumer)) ||
      [...this.admissions.keys()].some((admission) => same(admission.consumer))
    )
      return sourceStateInvalid();
    const admission = Object.freeze({ consumer: Object.freeze(parsed) });
    this.admissions.set(admission, { state: "reserved" });
    return admission;
  }
  bindBegin(admission: SourceInputAdmission, receipt: ActiveInputReceipt) {
    const entry = this.admissions.get(admission);
    const parsed = sourceInputReceiptSchema.parse(receipt);
    if (
      !entry ||
      entry.state === "unknown" ||
      parsed.state !== "active" ||
      parsed.consumer.kind !== admission.consumer.kind ||
      parsed.consumer.id !== admission.consumer.id
    )
      return sourceStateInvalid();
    if (entry.state === "bound") {
      if (
        entry.receipt.runtimeId !== parsed.runtimeId ||
        entry.receipt.token !== parsed.token ||
        entry.receipt.generation !== parsed.generation
      )
        return sourceStateInvalid();
      return;
    }
    this.admissions.set(admission, {
      state: "bound",
      receipt: Object.freeze({ ...parsed, consumer: admission.consumer }),
    });
  }
  commitBegin(admission: SourceInputAdmission): SourceInputLease {
    const entry = this.admissions.get(admission);
    if (!entry || entry.state !== "bound") return sourceStateInvalid();
    const lease = Object.freeze({ receipt: entry.receipt });
    this.entries.set(lease, {
      lease,
      bytes: null,
      busy: false,
      reading: false,
      unknown: false,
      proof: null,
    });
    this.admissions.delete(admission);
    return lease;
  }
  holdBegin(admission: SourceInputAdmission) {
    const entry = this.admissions.get(admission);
    if (entry?.state === "reserved") this.admissions.delete(admission);
    else if (entry?.state === "bound")
      this.admissions.set(admission, {
        state: "unknown",
        receipt: entry.receipt,
      });
  }
  owns(lease: SourceInputLease) {
    const entry = this.entries.get(lease);
    return !!entry && !entry.proof && !entry.unknown;
  }
  discard(lease: SourceInputLease) {
    this.entry(lease).bytes = null;
  }
  async claimTransaction(
    admission: SourceInputAdmission,
    provider: HollowUnitOfWorkProvider,
    work: (u: HollowUnitOfWorkContext) => Promise<InputClaimCommit>,
  ) {
    const prior = this.admissions.get(admission);
    if (!prior || prior.state === "reserved") return sourceStateInvalid();
    try {
      const result = await provider.run(work);
      if (result.kind === "no-claim") {
        if (prior.state === "unknown") return { result, lease: null };
        return { result, lease: this.settleClaim(admission, "first-no-claim") };
      }
      return { result, lease: this.settleClaim(admission, result.kind) };
    } catch (error) {
      this.holdBegin(admission);
      throw error;
    }
  }
  private settleClaim(
    admission: SourceInputAdmission,
    result: "claimed" | "first-no-claim" | "fenced",
  ) {
    const entry = this.admissions.get(admission);
    if (!entry || entry.state === "reserved") return sourceStateInvalid();
    if (result === "first-no-claim") {
      if (entry.state !== "bound") return sourceStateInvalid();
      this.admissions.delete(admission);
      return null;
    }
    if (result === "fenced") {
      this.admissions.delete(admission);
      return null;
    }
    this.admissions.set(admission, { state: "bound", receipt: entry.receipt });
    return this.commitBegin(admission);
  }
  private entry(lease: SourceInputLease) {
    const entry = this.entries.get(lease);
    if (!entry || entry.proof || entry.unknown || entry.busy || entry.reading)
      return sourceStateInvalid();
    return entry;
  }
  startRead(lease: SourceInputLease) {
    const entry = this.entry(lease);
    if (entry.bytes) return sourceStateInvalid();
    entry.reading = true;
  }
  endRead(lease: SourceInputLease) {
    const entry = this.entries.get(lease);
    if (!entry || !entry.reading) return sourceStateInvalid();
    entry.reading = false;
  }
  adopt(lease: SourceInputLease, bytes: Uint8Array) {
    const entry = this.entries.get(lease);
    if (
      !entry ||
      !entry.reading ||
      entry.busy ||
      entry.unknown ||
      entry.proof ||
      entry.bytes ||
      bytes.byteLength < 1 ||
      bytes.byteLength > SOURCE_MEMORY_BYTES
    )
      return sourceStateInvalid();
    entry.bytes = bytes;
  }
  async prepareText(
    lease: SourceInputLease,
    source: LlmSourceIdentity<LlmLegacyFormat>,
    signal: AbortSignal,
    media?: readonly LlmSourceMedia[],
  ) {
    const entry = this.entry(lease);
    if (!entry.bytes) return sourceStateInvalid();
    entry.busy = true;
    try {
      const result = await this.preparer.prepare(
        {
          bytes: entry.bytes,
          source,
          preparationVersion: 1,
          promptVersion: 1,
          ...(media === undefined ? {} : { media }),
        },
        signal,
      );
      if (result.preparationVersion !== 1 || signal.aborted)
        return sourceStateInvalid();
      entry.bytes = null;
      return result;
    } catch (error) {
      if (isLlmOperationError(error) && error.closed) entry.bytes = null;
      else entry.unknown = true;
      throw error;
    } finally {
      entry.busy = false;
    }
  }
  finish(lease: SourceInputLease, proofId: string): SourceInputProof {
    const prior = this.entries.get(lease);
    if (prior?.proof) {
      if (prior.proof.receipt.proofId !== proofId) return sourceStateInvalid();
      return prior.proof;
    }
    const entry = this.entry(lease);
    if (entry.bytes) return sourceStateInvalid();
    const receipt = sourceInputReceiptSchema.parse({
      ...lease.receipt,
      state: "closed",
      proofId,
    });
    if (receipt.state !== "closed") return sourceStateInvalid();
    const proof = Object.freeze({ receipt: Object.freeze(receipt) });
    entry.proof = proof;
    return proof;
  }
  verify(proof: SourceInputProof, receipt: SourceInputReceipt): boolean {
    return [...this.entries.values()].some(
      (e) =>
        e.proof === proof &&
        !e.busy &&
        !e.reading &&
        !e.bytes &&
        !e.unknown &&
        receipt.consumer.kind === proof.receipt.consumer.kind &&
        receipt.consumer.id === proof.receipt.consumer.id &&
        receipt.runtimeId === proof.receipt.runtimeId &&
        receipt.token === proof.receipt.token &&
        receipt.generation === proof.receipt.generation &&
        (receipt.state !== "closed" ||
          receipt.proofId === proof.receipt.proofId),
    );
  }
  consume(proof: SourceInputProof) {
    const entry = [...this.entries.values()].find((e) => e.proof === proof);
    if (!entry || !this.verify(proof, proof.receipt))
      return sourceStateInvalid();
    this.entries.delete(entry.lease);
  }
  unknown(lease: SourceInputLease) {
    const entry = this.entries.get(lease);
    if (!entry || entry.proof) return sourceStateInvalid();
    entry.unknown = true;
  }
}
