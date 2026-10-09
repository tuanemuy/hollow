import type { MachineRegeneration } from "@repo/core/domain/regeneration/entity";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { sourceStateInvalid } from "./services";
export async function completeMachine(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  value: MachineRegeneration,
  outcome: "succeeded" | "failed" | "cancelled",
  failure: string | null,
  resultVersion: number | null = null,
  coverage: import("@repo/core/domain/import/entity").Original["coverage"] = value
    .previous.coverage,
) {
  if (
    value.sourceMemoryBytes !== 0 ||
    value.inputReceipt?.state === "active" ||
    value.inputReceipt?.state === "unknown" ||
    value.owner.state === "unknown"
  )
    return sourceStateInvalid();
  const now = c.clock.now();
  const terminal: MachineRegeneration = {
    ...value,
    phase: "terminal",
    outcome,
    failure,
    resultVersion,
    owner:
      value.owner.state === "none"
        ? value.owner
        : { ...value.owner, state: "closed" },
    version: value.version + 1,
    updatedAt: now,
    terminalAt: now,
  };
  if (
    !(await u.machineRegenerations.replace(terminal, value.version)) ||
    !(await u.machineRegenerations.finishJob(terminal, now))
  )
    return sourceStateInvalid();
  const original = await u.imports.findOriginal(value.originalId);
  if (original?.activeJobId === value.id)
    await u.imports.saveOriginal({
      ...original,
      state: outcome === "succeeded" ? "ready" : value.previous.state,
      coverage: outcome === "succeeded" ? coverage : value.previous.coverage,
    });
  return terminal;
}
