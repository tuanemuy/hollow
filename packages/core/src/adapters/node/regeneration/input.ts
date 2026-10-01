import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { currentInput } from "@repo/core/application/regeneration/current";
import {
  beginInput,
  finishInput,
} from "@repo/core/application/regeneration/memory";
import type {
  RegenerationServices,
  SourceInputLease,
  SourceInputProof,
} from "@repo/core/application/regeneration/services";
import { sourceStateInvalid } from "@repo/core/application/regeneration/services";
import { readInput } from "@repo/core/application/regeneration/source";
import type { RegenerationConsumer } from "@repo/core/domain/regeneration/source";

/** Explicit composition for the isolated source stage; no production worker wiring. */
export class NodeRegenerationInput {
  private readonly proofs = new WeakMap<SourceInputLease, SourceInputProof>();
  constructor(
    private readonly container: HollowContainer,
    private readonly services: RegenerationServices,
  ) {}
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
  finish(lease: SourceInputLease) {
    const proof =
      this.proofs.get(lease) ??
      this.services.input.finish(lease, this.container.idGenerator.next());
    this.proofs.set(lease, proof);
    return finishInput(this.container, this.services, proof);
  }
}
