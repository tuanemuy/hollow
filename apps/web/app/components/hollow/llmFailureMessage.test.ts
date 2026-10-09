import { describe, expect, it } from "vitest";
import { llmFailureMessage, llmJobFailureMessage } from "./llmFailureMessage";

describe("public LLM job failure reasons", () => {
  it("uses the same explanatory reason in detail and history for a typed model/provider refusal", () => {
    expect(llmJobFailureMessage("LLM_RATE_LIMIT")).toBe(
      llmFailureMessage("LLM_RATE_LIMIT"),
    );
    expect(llmJobFailureMessage("LLM_RATE_LIMIT")).toContain("時間をおいて");
    expect(llmJobFailureMessage("LLM_CREDENTIAL_INVALID")).toContain(
      "連携を確認",
    );
  });
  it("keeps unknown raw failure text out of the public reason", () => {
    const message = llmJobFailureMessage(
      "provider secret: token=raw; private stack",
    );
    expect(message).toContain("原本と旧本文は保持");
    expect(message).not.toMatch(/provider|token|raw|stack/);
  });
});
