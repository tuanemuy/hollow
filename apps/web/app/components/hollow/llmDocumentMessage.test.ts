import { describe, expect, it } from "vitest";
import { llmDocumentMessage } from "./llmDocumentMessage";

describe("finite document failure explanations", () => {
  it.each([
    "LLM_DOCUMENT_ENCRYPTED",
    "LLM_DOCUMENT_CORRUPT",
    "LLM_DOCUMENT_UNSUPPORTED",
    "LLM_DOCUMENT_NO_TEXT",
    "LLM_PDF_VISUAL_REQUIRED",
    "LLM_PDF_ORDER_UNPROVEN",
  ])("explains %s while preserving source and prior body", (code) => {
    const message = llmDocumentMessage(code);
    expect(message?.includes("原本と旧本文を保持")).toBe(true);
    expect(message?.includes("自動")).toBe(false);
  });
  it.each([
    null,
    "constructor",
    "__proto__",
    "unknown-parser-error",
    "LLM_DELIVERY_UNKNOWN",
    "LLM_MONTHLY_LIMIT",
  ])("does not project an unrelated code %s as document failure", (code) => {
    expect(llmDocumentMessage(code)).toBeNull();
  });
});
