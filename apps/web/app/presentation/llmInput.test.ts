import { describe, expect, it } from "vitest";
import { llmModelKindInput } from "./llmInput";

describe("LLM model purpose transport boundary", () => {
  it.each([
    "chat-text",
    "chat-image",
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
