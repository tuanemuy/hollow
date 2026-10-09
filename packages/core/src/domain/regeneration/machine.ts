import { BusinessRuleError } from "../error";
import type { MachineRegeneration } from "./entity";

export const MACHINE_RECIPE = "machine-html-markdown/v1";
export const MACHINE_DEADLINE_MS = 120_000;
export const MACHINE_HISTORY_MS = 90 * 86_400_000;
export const MACHINE_HISTORY_LIMIT = 100;
export function machineFormat(format: string): format is "html" | "markdown" {
  return format === "html" || format === "markdown";
}
export function machineHeld(value: MachineRegeneration) {
  return (
    value.phase !== "terminal" ||
    value.owner.state === "active" ||
    value.owner.state === "unknown" ||
    value.sourceMemoryBytes !== 0
  );
}
export function sameMachineSource(
  a: MachineRegeneration,
  b: MachineRegeneration,
) {
  return (
    a.id === b.id &&
    a.executorId === b.executorId &&
    a.noteId === b.noteId &&
    a.originalId === b.originalId &&
    a.commandId === b.commandId &&
    a.requestDigest === b.requestDigest &&
    a.noteVersion === b.noteVersion &&
    a.ownershipGeneration === b.ownershipGeneration &&
    a.originalRevisionNo === b.originalRevisionNo &&
    a.previous.state === b.previous.state &&
    a.previous.coverage === b.previous.coverage &&
    a.previous.activeJobId === b.previous.activeJobId &&
    a.deadlineAt.getTime() === b.deadlineAt.getTime() &&
    a.source.sha256 === b.source.sha256 &&
    a.source.bytes === b.source.bytes &&
    a.source.format === b.source.format &&
    a.access.origin === b.access.origin &&
    a.access.bindingId === b.access.bindingId &&
    a.owner.runtimeId === b.owner.runtimeId &&
    a.owner.token === b.owner.token
  );
}
export function machineChanged(): never {
  throw new BusinessRuleError(
    "REGENERATION_SOURCE_CHANGED",
    "原本またはノートが更新されたため、本文を保持して処理を停止しました。",
  );
}
