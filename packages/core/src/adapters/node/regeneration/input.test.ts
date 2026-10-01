import {
  type LlmLegacyPreparedSource,
  LlmOperationError,
  type LlmSourcePreparer,
} from "@repo/core/application/llm/ports";
import { describe, expect, it } from "vitest";
import { NodeRegenerationMemory } from "./memory";

const id = (n: number) =>
  `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const receipt = (n = 1) => ({
  consumer: { kind: "machine-regeneration" as const, id: id(n) },
  runtimeId: id(100),
  token: id(n + 100),
  generation: 1,
  state: "active" as const,
});
const source = {
  kind: "original" as const,
  originalId: id(300),
  sha256: "a".repeat(64),
  bytes: 1,
  format: "html" as const,
};
const result: LlmLegacyPreparedSource = {
  kind: "text-blocks",
  preparationVersion: 1,
  segments: [],
  blocks: 0,
  notices: [],
  media: [],
};
function fixture(prepare: LlmSourcePreparer["prepare"] = async () => result) {
  return new NodeRegenerationMemory({ prepare });
}
function bytes(
  memory: NodeRegenerationMemory,
  lease: ReturnType<NodeRegenerationMemory["open"]>,
) {
  memory.startRead(lease);
  memory.adopt(lease, new Uint8Array([1]));
  memory.endRead(lease);
}
describe("owned regeneration input", () => {
  it("limits two reservations without allocating 50MiB and rejects duplicate consumers", () => {
    const m = fixture();
    const a = m.open(receipt());
    m.open(receipt(2));
    expect(() => m.open(receipt(3))).toThrow();
    expect(() => m.open(receipt())).toThrow();
    const proof = m.finish(a, id(501));
    m.consume(proof);
    expect(m.open(receipt(3))).toBeDefined();
  });
  it("keeps identity opaque across leases, proofs and runtimes", () => {
    const m = fixture();
    const a = m.open(receipt());
    expect(() => m.finish({ ...a }, id(501))).toThrow();
    const p = m.finish(a, id(501));
    expect(m.verify({ ...p }, a.receipt)).toBe(false);
    expect(m.verify(p, { ...a.receipt, token: id(9) })).toBe(false);
    expect(m.verify(p, { ...a.receipt, generation: 2 })).toBe(false);
    expect(fixture().verify(p, a.receipt)).toBe(false);
    expect(m.verify(p, a.receipt)).toBe(true);
    m.consume(p);
    expect(m.verify(p, p.receipt)).toBe(false);
  });
  it("blocks overlap and release while source or consumer holds bytes", async () => {
    let done!: (value: LlmLegacyPreparedSource) => void;
    const m = fixture(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    const a = m.open(receipt());
    m.startRead(a);
    expect(() => m.startRead(a)).toThrow();
    expect(() => m.finish(a, id(501))).toThrow();
    m.adopt(a, new Uint8Array([1]));
    m.endRead(a);
    expect(() => m.finish(a, id(501))).toThrow();
    const preparing = m.prepareText(a, source, new AbortController().signal);
    expect(() => m.startRead(a)).toThrow();
    expect(() => m.finish(a, id(501))).toThrow();
    done(result);
    await preparing;
    expect(m.finish(a, id(501))).toBeDefined();
  });
  it("allows sequential reads in one generation only after input ends", async () => {
    const m = fixture();
    const a = m.open(receipt());
    for (let i = 0; i < 2; i++) {
      bytes(m, a);
      await m.prepareText(a, source, new AbortController().signal);
    }
    expect(a.receipt.generation).toBe(1);
    const p = m.finish(a, id(501));
    expect(m.finish(a, id(501))).toBe(p);
    expect(() => m.startRead(a)).toThrow();
  });
  it("closed failure frees references but unknown failure keeps the reservation", async () => {
    const safe = fixture(async () => {
      throw new LlmOperationError("LLM_UNAVAILABLE", "not-sent", true);
    });
    const a = safe.open(receipt());
    bytes(safe, a);
    await expect(
      safe.prepareText(a, source, new AbortController().signal),
    ).rejects.toBeDefined();
    expect(safe.finish(a, id(501))).toBeDefined();
    const unknown = fixture(async () => {
      throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
    });
    const b = unknown.open(receipt());
    bytes(unknown, b);
    await expect(
      unknown.prepareText(b, source, new AbortController().signal),
    ).rejects.toBeDefined();
    expect(() => unknown.finish(b, id(501))).toThrow();
    expect(() => unknown.startRead(b)).toThrow();
  });
  it("retains proof until explicit consumption and rejects invalid receipts", () => {
    const m = fixture();
    const a = m.open(receipt());
    const proof = m.finish(a, id(501));
    expect(m.verify(proof, proof.receipt)).toBe(true);
    expect(m.verify(proof, proof.receipt)).toBe(true);
    expect(() => m.open({ ...receipt(2), state: "unknown" })).toThrow();
    expect(() => m.open({ ...receipt(2), generation: 0 })).toThrow();
    m.consume(proof);
    expect(() => m.consume(proof)).toThrow();
  });
});
