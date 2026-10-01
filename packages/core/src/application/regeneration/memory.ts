import { attemptReleased } from "@repo/core/domain/regeneration/entity";
import {
  type RegenerationConsumer,
  SOURCE_MEMORY_BYTES,
} from "@repo/core/domain/regeneration/source";
import type { HollowContainer } from "../di/hollowTypes";
import { currentInput, inputConsumer } from "./current";
import type {
  RegenerationServices,
  SourceInputLease,
  SourceInputProof,
} from "./services";
import { sourceStateInvalid } from "./services";

export async function beginInput(
  c: HollowContainer,
  services: RegenerationServices,
  consumer: RegenerationConsumer,
): Promise<SourceInputLease> {
  const receipt = await c.unitOfWorkProvider.run(async (u) => {
    const row = await currentInput(c, u, consumer);
    if (
      row.memory !== 0 ||
      (row.receipt && row.receipt.state !== "closed") ||
      row.owner.state !== "active"
    )
      return sourceStateInvalid();
    const generation = (row.receipt?.generation ?? 0) + 1;
    if (!Number.isSafeInteger(generation)) return sourceStateInvalid();
    const receipt = {
      consumer,
      runtimeId: row.owner.runtimeId,
      token: row.owner.token,
      generation,
      state: "active" as const,
    };
    if (!(await row.write(receipt, SOURCE_MEMORY_BYTES)))
      return sourceStateInvalid();
    return receipt;
  });
  return services.input.open(receipt);
}

export async function finishInput(
  c: HollowContainer,
  services: RegenerationServices,
  proof: SourceInputProof,
) {
  await c.unitOfWorkProvider.run(async (u) => {
    const row = await inputConsumer(u, proof.receipt.consumer, c.clock.now());
    if (
      !row.receipt ||
      !services.input.verify(proof, row.receipt) ||
      row.owner.state === "unknown"
    )
      return sourceStateInvalid();
    if (
      row.access.origin === "drive-record" &&
      !(await u.regenerationAttempts.forBinding(row.access.bindingId)).every(
        attemptReleased,
      )
    )
      return sourceStateInvalid();
    if (row.receipt.state === "closed") {
      if (row.memory !== 0 || row.receipt.proofId !== proof.receipt.proofId)
        return sourceStateInvalid();
      return;
    }
    if (
      row.memory !== SOURCE_MEMORY_BYTES ||
      !(await row.write(proof.receipt, 0))
    )
      return sourceStateInvalid();
  });
  services.input.consume(proof);
}

export async function markInputUnknown(
  c: HollowContainer,
  services: RegenerationServices,
  lease: SourceInputLease,
) {
  services.input.unknown(lease);
  await c.unitOfWorkProvider.run(async (u) => {
    const row = await inputConsumer(u, lease.receipt.consumer, c.clock.now());
    const receipt = row.receipt;
    if (
      !receipt ||
      receipt.state === "closed" ||
      receipt.runtimeId !== lease.receipt.runtimeId ||
      receipt.token !== lease.receipt.token ||
      receipt.generation !== lease.receipt.generation
    )
      return sourceStateInvalid();
    if (
      receipt.state === "active" &&
      !(await row.write({ ...receipt, state: "unknown" }, SOURCE_MEMORY_BYTES))
    )
      return sourceStateInvalid();
  });
}
