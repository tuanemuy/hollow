import { machineRegenerationSchema } from "@repo/core/domain/regeneration/entity";
import {
  machineFormat,
  machineHeld,
  sameMachineSource,
} from "@repo/core/domain/regeneration/machine";
import { describe, expect, it } from "vitest";

const id = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-06T00:00:00Z");
const queued = () =>
  machineRegenerationSchema.parse({
    id,
    executorId: id,
    noteId: id,
    originalId: id,
    commandId: id,
    requestDigest: "a".repeat(64),
    access: { origin: "local-original", bindingId: null },
    sourceMemoryBytes: 0,
    inputReceipt: null,
    source: { sha256: "b".repeat(64), bytes: 8, format: "html" },
    noteVersion: 0,
    ownershipGeneration: 1,
    originalRevisionNo: 1,
    previous: { state: "ready", coverage: "complete", activeJobId: id },
    phase: "queued",
    outcome: "pending",
    failure: null,
    resultVersion: null,
    owner: { state: "none", runtimeId: null, token: null },
    cancelGeneration: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deadlineAt: new Date(now.getTime() + 120000),
    terminalAt: null,
  });
describe("machine regeneration contract", () => {
  it("admits only HTML and Markdown", () => {
    expect(
      ["html", "markdown", "text", "pdf", "audio"].filter(machineFormat),
    ).toEqual(["html", "markdown"]);
  });
  it("binds source revision rather than mutable operation progress", () => {
    const value = queued();
    expect(
      sameMachineSource(value, { ...value, version: 2, phase: "preparing" }),
    ).toBe(true);
    expect(sameMachineSource(value, { ...value, noteVersion: 1 })).toBe(false);
    expect(
      sameMachineSource(value, {
        ...value,
        source: { ...value.source, sha256: "c".repeat(64) },
      }),
    ).toBe(false);
  });
  it("keeps unknown completion held", () => {
    const value = queued();
    expect(
      machineHeld({
        ...value,
        phase: "terminal",
        outcome: "unknown",
        terminalAt: now,
        owner: { state: "unknown", runtimeId: id, token: id },
      }),
    ).toBe(true);
  });
  it("cannot encode success without a captured resulting note version", () => {
    const value = queued();
    expect(
      machineRegenerationSchema.safeParse({
        ...value,
        phase: "terminal",
        outcome: "succeeded",
        terminalAt: now,
      }).success,
    ).toBe(false);
  });
});
