import { describe, expect, it } from "vitest";
import {
  llmModelKindInput,
  llmPdfPreviewBeginInput,
  llmPdfPreviewCancelInput,
  llmPdfPreviewReadInput,
  llmRegenerateInput,
} from "./llmInput";

describe("LLM model purpose transport boundary", () => {
  it.each([
    "chat-text",
    "chat-image",
    "stt-transcription",
  ])("accepts finite %s without authorizing a source", (kind) => {
    expect(llmModelKindInput.safeParse({ kind }).success).toBe(true);
  });
  it.each([
    null,
    {},
    { kind: "audio" },
    { kind: "chat-image", noteId: "untrusted" },
    { kind: ["chat-image"] },
  ])("rejects malformed or extra purpose fields", (value) => {
    expect(llmModelKindInput.safeParse(value).success).toBe(false);
  });
});
describe("PDF preview transport", () => {
  const id = "01900000-0000-7000-8000-000000000001";
  const begin = { noteId: id, commandId: id, noteVersion: 1, expectedEpoch: 0 };
  it("accepts finite begin and GET locators but no caller chosen classification", () => {
    expect(llmPdfPreviewBeginInput.safeParse(begin).success).toBe(true);
    expect(
      llmPdfPreviewReadInput.safeParse({ noteId: id, commandId: id }).success,
    ).toBe(true);
    expect(llmPdfPreviewCancelInput.safeParse({ previewId: id }).success).toBe(
      true,
    );
    expect(
      llmPdfPreviewBeginInput.safeParse({ ...begin, purpose: "chat-image" })
        .success,
    ).toBe(false);
    expect(
      llmPdfPreviewReadInput.safeParse({
        noteId: id,
        commandId: id,
        start: true,
      }).success,
    ).toBe(false);
  });
  it("rejects malformed receipt and supports the existing confirmation with optional preview", () => {
    expect(
      llmPdfPreviewCancelInput.safeParse({ previewId: "invalid" }).success,
    ).toBe(false);
    const request = {
      ...begin,
      modelId: "fixture/model",
      instruction: "",
      confirmed: true,
    };
    expect(llmRegenerateInput.safeParse(request).success).toBe(true);
    expect(
      llmRegenerateInput.safeParse({ ...request, previewId: id }).success,
    ).toBe(true);
    expect(
      llmRegenerateInput.safeParse({ ...request, previewId: "invalid" })
        .success,
    ).toBe(false);
  });
});
