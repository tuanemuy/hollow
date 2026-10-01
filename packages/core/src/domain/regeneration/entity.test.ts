import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "../error";
import {
  attemptReleased,
  machineRegenerationSchema,
  parseRegeneration,
  regenerationConsumerSchema,
  sourceAttemptSchema,
  sourceBindingSchema,
  sourceHeld,
} from "./entity";
import { SOURCE_MEMORY_BYTES } from "./source";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date("2026-10-01T00:00:00.000Z");
const deadlineAt = new Date("2026-10-01T00:30:00.000Z");
const none = { state: "none", runtimeId: null, token: null };
const active = { state: "active", runtimeId: id(90), token: id(91) };
const closed = { ...active, state: "closed" };
const unknown = { ...active, state: "unknown" };
const binding = {
  id: id(1),
  recordId: id(2),
  executorId: id(3),
  credentialOwnerId: id(4),
  noteId: id(5),
  originalId: id(6),
  subject: "synthetic-subject",
  driveEpoch: 1,
  ownershipGeneration: 1,
  fingerprint: "a".repeat(64),
  consumer: { kind: "llm-conversion", id: id(7) },
  cancelGeneration: 0,
  version: 1,
  createdAt: now,
};
const queued = {
  id: id(8),
  bindingId: binding.id,
  ordinal: 1,
  purpose: "acquire",
  version: 1,
  cancelGeneration: 0,
  deadlineAt,
  credentialVersion: 1,
  createdAt: now,
  updatedAt: now,
  phase: "queued",
  owner: none,
  completion: null,
};
const neverOwned = {
  ...queued,
  phase: "terminal",
  cancelGeneration: 1,
  completion: { kind: "never-owned", outcome: "cancelled" },
};
const completion = {
  kind: "closed",
  proofId: id(9),
  callerEnded: true,
  acknowledged: true,
  outcome: "succeeded",
  failure: null,
  digest: "b".repeat(64),
};
const terminal = {
  ...queued,
  phase: "terminal",
  owner: closed,
  completion,
};
const machine = {
  id: id(10),
  executorId: id(3),
  noteId: id(5),
  originalId: id(6),
  commandId: id(11),
  requestDigest: "c".repeat(64),
  access: { origin: "local-original", bindingId: null },
  sourceMemoryBytes: 0,
  inputReceipt: null,
  source: { sha256: "d".repeat(64), bytes: 1, format: "html" },
  noteVersion: 1,
  ownershipGeneration: 1,
  originalRevisionNo: 1,
  previous: { state: "ready", coverage: "complete", activeJobId: id(12) },
  phase: "queued",
  outcome: "pending",
  failure: null,
  resultVersion: null,
  owner: none,
  cancelGeneration: 0,
  version: 1,
  createdAt: now,
  deadlineAt,
  updatedAt: now,
  terminalAt: null,
};

describe("source binding", () => {
  it("accepts each single consumer and distinct executor/credential owner", () => {
    for (const kind of [
      "llm-conversion",
      "pdf-preview",
      "machine-regeneration",
    ]) {
      const value = { ...binding, consumer: { kind, id: id(7) } };
      expect(parseRegeneration(sourceBindingSchema, value)).toEqual(value);
    }
  });

  it("rejects unknown, absent, invalid or expanded consumers", () => {
    for (const value of [
      null,
      { kind: "import", id: id(7) },
      { kind: "pdf-preview" },
      { kind: "llm-conversion", id: "invalid" },
      { kind: "machine-regeneration", id: id(7), previewId: id(8) },
    ])
      expect(regenerationConsumerSchema.safeParse(value).success).toBe(false);
  });

  it("requires safe positive versions and a nonnegative cancellation generation", () => {
    for (const key of ["driveEpoch", "ownershipGeneration", "version"])
      for (const value of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])
        expect(
          sourceBindingSchema.safeParse({ ...binding, [key]: value }).success,
        ).toBe(false);
    for (const cancelGeneration of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1])
      expect(
        sourceBindingSchema.safeParse({ ...binding, cancelGeneration }).success,
      ).toBe(false);
    expect(
      sourceBindingSchema.safeParse({ ...binding, cancelGeneration: 1 })
        .success,
    ).toBe(true);
  });

  it("rejects invalid identity, fingerprint, date and unmodeled fields", () => {
    for (const patch of [
      { recordId: null },
      { subject: "" },
      { subject: "x".repeat(256) },
      { fingerprint: "a".repeat(63) },
      { fingerprint: "G".repeat(64) },
      { createdAt: new Date(Number.NaN) },
      { fileId: "unmodeled" },
    ])
      expect(() =>
        parseRegeneration(sourceBindingSchema, { ...binding, ...patch }),
      ).toThrow(BusinessRuleError);
  });
});

describe("source attempt ownership and release", () => {
  it("keeps queued never-started work unreleased", () => {
    expect(
      attemptReleased(parseRegeneration(sourceAttemptSchema, queued)),
    ).toBe(false);
    expect(
      sourceAttemptSchema.safeParse({ ...queued, owner: active }).success,
    ).toBe(false);
    expect(
      sourceAttemptSchema.safeParse({ ...queued, completion }).success,
    ).toBe(false);
  });

  it("retains active and unknown owners without a terminal proof", () => {
    for (const owner of [active, unknown]) {
      const value = parseRegeneration(sourceAttemptSchema, {
        ...queued,
        phase: owner.state,
        owner,
      });
      expect(value.owner).toEqual(owner);
      expect(attemptReleased(value)).toBe(false);
    }
  });

  it("rejects mismatched active/unknown phase or an attached completion", () => {
    for (const patch of [
      { phase: "active", owner: unknown },
      { phase: "unknown", owner: active },
      { phase: "active", owner: closed },
      { phase: "unknown", owner: none },
      { phase: "active", owner: active, completion },
    ])
      expect(
        sourceAttemptSchema.safeParse({ ...queued, ...patch }).success,
      ).toBe(false);
  });

  it("releases a fenced never-owned cancellation without inventing an owner proof", () => {
    const value = parseRegeneration(sourceAttemptSchema, neverOwned);
    expect(attemptReleased(value)).toBe(true);
    expect(value.owner).toEqual(none);
  });

  it("rejects unfenced or owned work represented as never-owned cancellation", () => {
    for (const patch of [
      { cancelGeneration: 0 },
      { owner: closed },
      { owner: unknown },
      { completion: { kind: "never-owned", outcome: "succeeded" } },
      { completion: null },
    ])
      expect(
        sourceAttemptSchema.safeParse({ ...neverOwned, ...patch }).success,
      ).toBe(false);
  });

  it("requires both caller end and ACK before releasing a closed owner", () => {
    for (const [callerEnded, acknowledged, released] of [
      [false, false, false],
      [true, false, false],
      [true, true, true],
    ]) {
      const value = parseRegeneration(sourceAttemptSchema, {
        ...terminal,
        completion: { ...completion, callerEnded, acknowledged },
      });
      expect(attemptReleased(value)).toBe(released);
    }
  });

  it("rejects ACK before caller end and missing or mismatched closed-owner proof", () => {
    for (const patch of [
      { completion: { ...completion, callerEnded: false } },
      { completion: { ...completion, proofId: null } },
      { completion: { ...completion, proofId: "invalid" } },
      { owner: unknown },
      { owner: none },
      { owner: { ...closed, runtimeId: null } },
      { owner: { ...closed, token: null } },
    ])
      expect(
        sourceAttemptSchema.safeParse({ ...terminal, ...patch }).success,
      ).toBe(false);
  });

  it("accepts final-check but rejects unknown purposes and unsafe numeric fields", () => {
    expect(
      sourceAttemptSchema.safeParse({ ...queued, purpose: "final-check" })
        .success,
    ).toBe(true);
    expect(
      sourceAttemptSchema.safeParse({ ...queued, purpose: "refresh" }).success,
    ).toBe(false);
    for (const key of ["ordinal", "version", "credentialVersion"])
      for (const value of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])
        expect(
          sourceAttemptSchema.safeParse({ ...queued, [key]: value }).success,
        ).toBe(false);
  });
});

describe("source data-lane holding", () => {
  it("does not hold a lane for queued or cancelled never-owned attempts", () => {
    expect(sourceHeld(parseRegeneration(sourceAttemptSchema, queued))).toBe(
      false,
    );
    expect(sourceHeld(parseRegeneration(sourceAttemptSchema, neverOwned))).toBe(
      false,
    );
  });

  it("holds active and unknown attempts independently of their cancellation fence", () => {
    for (const owner of [active, unknown])
      for (const cancelGeneration of [0, 1])
        expect(
          sourceHeld(
            parseRegeneration(sourceAttemptSchema, {
              ...queued,
              phase: owner.state,
              owner,
              cancelGeneration,
            }),
          ),
        ).toBe(true);
  });

  it("keeps the closed lane through caller-end and DB-ACK windows", () => {
    for (const [callerEnded, acknowledged, held] of [
      [false, false, true],
      [true, false, true],
      [true, true, false],
    ])
      expect(
        sourceHeld(
          parseRegeneration(sourceAttemptSchema, {
            ...terminal,
            completion: { ...completion, callerEnded, acknowledged },
          }),
        ),
      ).toBe(held);
  });

  it("rejects malformed persisted closure instead of treating it as an empty lane", () => {
    for (const patch of [
      { owner: null },
      { completion: null },
      { completion: { ...completion, proofId: null } },
      { completion: { ...completion, callerEnded: false, acknowledged: true } },
    ])
      expect(() =>
        sourceHeld(
          parseRegeneration(sourceAttemptSchema, {
            ...terminal,
            ...patch,
          }),
        ),
      ).toThrow(BusinessRuleError);
  });
});

describe("machine regeneration receipt", () => {
  it("represents HTML/Markdown and explicit local/Drive access without runtime admission", () => {
    for (const format of ["html", "markdown"])
      for (const access of [
        machine.access,
        { origin: "drive-record", bindingId: binding.id },
      ]) {
        const value = {
          ...machine,
          source: { ...machine.source, format },
          access,
        };
        expect(parseRegeneration(machineRegenerationSchema, value)).toEqual(
          value,
        );
      }
  });

  it("requires terminal outcome and a result version exactly for success", () => {
    const succeeded = {
      ...machine,
      phase: "terminal",
      terminalAt: now,
      outcome: "succeeded",
      owner: closed,
      resultVersion: 2,
    };
    expect(machineRegenerationSchema.safeParse(succeeded).success).toBe(true);
    for (const value of [
      { ...machine, phase: "terminal" },
      { ...machine, outcome: "failed" },
      { ...machine, resultVersion: 2 },
      { ...succeeded, resultVersion: null },
      { ...succeeded, resultVersion: 0 },
      { ...succeeded, outcome: "cancelled" },
    ])
      expect(machineRegenerationSchema.safeParse(value).success).toBe(false);
  });

  it("allows released terminal history to redact its binding with no memory", () => {
    for (const owner of [none, closed]) {
      const value = {
        ...machine,
        phase: "terminal",
        terminalAt: now,
        outcome: "cancelled",
        access: { origin: "redacted", bindingId: null },
        owner,
        cancelGeneration: 1,
      };
      expect(parseRegeneration(machineRegenerationSchema, value)).toEqual(
        value,
      );
    }
  });

  it("rejects redaction with pending work, a binding, memory or an unclosed owner", () => {
    const redacted = {
      ...machine,
      phase: "terminal",
      terminalAt: now,
      outcome: "cancelled",
      access: { origin: "redacted", bindingId: null },
      owner: closed,
    };
    for (const patch of [
      { phase: "queued", outcome: "pending" },
      { access: { origin: "redacted", bindingId: binding.id } },
      { sourceMemoryBytes: SOURCE_MEMORY_BYTES },
      { outcome: "unknown" },
      { owner: active },
      { owner: unknown, outcome: "unknown" },
    ])
      expect(
        machineRegenerationSchema.safeParse({ ...redacted, ...patch }).success,
      ).toBe(false);
  });

  it("preserves unknown ownership and its reserved memory without redaction", () => {
    const value = {
      ...machine,
      phase: "terminal",
      terminalAt: now,
      outcome: "unknown",
      owner: unknown,
      sourceMemoryBytes: SOURCE_MEMORY_BYTES,
    };
    expect(parseRegeneration(machineRegenerationSchema, value)).toEqual(value);
    expect(
      machineRegenerationSchema.safeParse({ ...value, outcome: "cancelled" })
        .success,
    ).toBe(false);
  });

  it("requires an owner for a reservation and rejects other memory numbers", () => {
    const preparing = { ...machine, phase: "preparing", owner: active };
    for (const sourceMemoryBytes of [0, SOURCE_MEMORY_BYTES])
      expect(
        machineRegenerationSchema.safeParse({ ...preparing, sourceMemoryBytes })
          .success,
      ).toBe(true);
    expect(
      machineRegenerationSchema.safeParse({
        ...machine,
        sourceMemoryBytes: SOURCE_MEMORY_BYTES,
      }).success,
    ).toBe(false);
    for (const sourceMemoryBytes of [-1, 1, 0.5, SOURCE_MEMORY_BYTES + 1])
      expect(
        machineRegenerationSchema.safeParse({ ...preparing, sourceMemoryBytes })
          .success,
      ).toBe(false);
  });

  it("bounds source bytes/format and all positive receipt counters", () => {
    expect(
      machineRegenerationSchema.safeParse({
        ...machine,
        source: { ...machine.source, bytes: SOURCE_MEMORY_BYTES },
      }).success,
    ).toBe(true);
    for (const bytes of [
      0,
      -1,
      0.5,
      SOURCE_MEMORY_BYTES + 1,
      Number.MAX_SAFE_INTEGER + 1,
    ])
      expect(
        machineRegenerationSchema.safeParse({
          ...machine,
          source: { ...machine.source, bytes },
        }).success,
      ).toBe(false);
    for (const format of ["text", "pdf", "audio", "unknown"])
      expect(
        machineRegenerationSchema.safeParse({
          ...machine,
          source: { ...machine.source, format },
        }).success,
      ).toBe(false);
    expect(
      machineRegenerationSchema.safeParse({ ...machine, noteVersion: 0 })
        .success,
    ).toBe(true);
    for (const noteVersion of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1])
      expect(
        machineRegenerationSchema.safeParse({ ...machine, noteVersion })
          .success,
      ).toBe(false);
    for (const key of ["ownershipGeneration", "originalRevisionNo", "version"])
      for (const value of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])
        expect(
          machineRegenerationSchema.safeParse({ ...machine, [key]: value })
            .success,
        ).toBe(false);
  });

  it("rejects incomplete identities and unknown fields with a finite domain error", () => {
    for (const patch of [
      { commandId: "invalid" },
      { owner: { ...none, token: id(91) } },
      { owner: { ...active, token: null } },
      { access: { origin: "drive-record", bindingId: null } },
      { requestDigest: "f".repeat(63) },
      { previous: { ...machine.previous, activeJobId: null } },
      { cancelGeneration: -1 },
      { deadlineAt: new Date(Number.NaN) },
      { unknown: true },
    ])
      expect(() =>
        parseRegeneration(machineRegenerationSchema, { ...machine, ...patch }),
      ).toThrowError(
        expect.objectContaining({ code: "REGENERATION_STATE_INVALID" }),
      );
  });
});

const machineInput = {
  consumer: { kind: "machine-regeneration", id: machine.id },
  runtimeId: active.runtimeId,
  token: active.token,
  generation: 1,
  state: "active",
};

describe("machine input stage", () => {
  it("requires an explicit nullable receipt on legacy rows", () => {
    expect(machineRegenerationSchema.safeParse(machine).success).toBe(true);
    const { inputReceipt: _receipt, ...missing } = machine;
    expect(machineRegenerationSchema.safeParse(missing).success).toBe(false);
  });

  it("matches active/unknown input to its machine owner without completing the consumer", () => {
    for (const state of ["active", "unknown"]) {
      const value = {
        ...machine,
        phase: "preparing",
        owner: active,
        sourceMemoryBytes: SOURCE_MEMORY_BYTES,
        inputReceipt: { ...machineInput, state },
      };
      expect(parseRegeneration(machineRegenerationSchema, value)).toEqual(
        value,
      );
      expect(
        machineRegenerationSchema.safeParse({ ...value, sourceMemoryBytes: 0 })
          .success,
      ).toBe(false);
    }
  });

  it("permits proved input closure while the consumer remains active", () => {
    const value = {
      ...machine,
      phase: "preparing",
      owner: active,
      inputReceipt: { ...machineInput, state: "closed", proofId: id(95) },
    };
    expect(parseRegeneration(machineRegenerationSchema, value)).toEqual(value);
    expect(
      machineRegenerationSchema.safeParse({
        ...value,
        sourceMemoryBytes: SOURCE_MEMORY_BYTES,
      }).success,
    ).toBe(false);
  });

  it("rejects another consumer namespace, id, runtime or token even with a valid shape", () => {
    const value = {
      ...machine,
      phase: "preparing",
      owner: active,
      sourceMemoryBytes: SOURCE_MEMORY_BYTES,
    };
    for (const patch of [
      { consumer: { kind: "llm-conversion", id: machine.id } },
      { consumer: { kind: "pdf-preview", id: machine.id } },
      { consumer: { kind: "machine-regeneration", id: id(96) } },
      { runtimeId: id(96) },
      { token: id(96) },
      { generation: 0 },
      { generation: Number.MAX_SAFE_INTEGER + 1 },
    ])
      expect(
        machineRegenerationSchema.safeParse({
          ...value,
          inputReceipt: { ...machineInput, ...patch },
        }).success,
      ).toBe(false);
    expect(
      machineRegenerationSchema.safeParse({
        ...machine,
        inputReceipt: { ...machineInput, state: "closed", proofId: id(95) },
      }).success,
    ).toBe(false);
  });

  it("retains unknown input memory even after consumer business cancellation", () => {
    const value = {
      ...machine,
      phase: "terminal",
      terminalAt: now,
      outcome: "cancelled",
      cancelGeneration: 1,
      owner: closed,
      sourceMemoryBytes: SOURCE_MEMORY_BYTES,
      inputReceipt: { ...machineInput, state: "unknown" },
    };
    expect(parseRegeneration(machineRegenerationSchema, value)).toEqual(value);
    expect(
      machineRegenerationSchema.safeParse({ ...value, sourceMemoryBytes: 0 })
        .success,
    ).toBe(false);
  });

  it("does not use input closure alone to permit redaction of a live consumer", () => {
    const inputReceipt = { ...machineInput, state: "closed", proofId: id(95) };
    const live = {
      ...machine,
      phase: "preparing",
      owner: active,
      inputReceipt,
    };
    expect(
      machineRegenerationSchema.safeParse({
        ...live,
        access: { origin: "redacted", bindingId: null },
      }).success,
    ).toBe(false);
    const terminalValue = {
      ...live,
      phase: "terminal",
      terminalAt: now,
      outcome: "cancelled",
      cancelGeneration: 1,
      owner: closed,
      access: { origin: "redacted", bindingId: null },
    };
    expect(parseRegeneration(machineRegenerationSchema, terminalValue)).toEqual(
      terminalValue,
    );
    expect(
      machineRegenerationSchema.safeParse({
        ...terminalValue,
        outcome: "unknown",
      }).success,
    ).toBe(false);
  });
});
