import {
  isLlmOperationError,
  type LlmSourcePreparer,
} from "@repo/core/application/llm/ports";
import type {
  ActiveInputReceipt,
  RegenerationInput,
  SourceInputLease,
  SourceInputProof,
} from "@repo/core/application/regeneration/services";
import { sourceStateInvalid } from "@repo/core/application/regeneration/services";
import type {
  LlmLegacyFormat,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";
import {
  SOURCE_MEMORY_BYTES,
  SOURCE_MEMORY_LIMIT,
  type SourceInputReceipt,
  sourceInputReceiptSchema,
} from "@repo/core/domain/regeneration/source";

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
  constructor(private readonly preparer: LlmSourcePreparer) {}
  open(receipt: ActiveInputReceipt): SourceInputLease {
    const parsed = sourceInputReceiptSchema.parse(receipt);
    if (
      parsed.state !== "active" ||
      this.entries.size * SOURCE_MEMORY_BYTES >= SOURCE_MEMORY_LIMIT ||
      [...this.entries.values()].some(
        (e) =>
          e.lease.receipt.consumer.kind === receipt.consumer.kind &&
          e.lease.receipt.consumer.id === receipt.consumer.id,
      )
    )
      return sourceStateInvalid();
    const lease = Object.freeze({
      receipt: Object.freeze({
        ...parsed,
        consumer: Object.freeze({ ...parsed.consumer }),
      }),
    });
    this.entries.set(lease, {
      lease,
      bytes: null,
      busy: false,
      reading: false,
      unknown: false,
      proof: null,
    });
    return lease;
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
  ) {
    const entry = this.entry(lease);
    if (!entry.bytes) return sourceStateInvalid();
    entry.busy = true;
    try {
      const result = await this.preparer.prepare(
        { bytes: entry.bytes, source, preparationVersion: 1, promptVersion: 1 },
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
