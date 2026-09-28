import { describe, expect, it } from "vitest";
import { llmSourceAvailability } from "./read";

describe("LLM source availability is not content gate success", () => {
  it.each(["text", "html", "markdown"])("keeps %s preparation V1", (format) => {
    expect(llmSourceAvailability(format)).toBe("legacy-text");
  });
  it.each([
    "docx",
    "xlsx",
    "pptx",
  ])("offers only gated Office text for %s", (format) => {
    expect(llmSourceAvailability(format)).toBe("office-text-gated");
  });
  it("distinguishes a gated PDF from missing source", () => {
    expect(llmSourceAvailability("pdf")).toBe("pdf-text-gated");
    expect(llmSourceAvailability(null)).toBe("no-original");
  });
  it.each([
    "audio",
    "doc",
    "xls",
    "ppt",
    "unknown",
  ])("does not introduce unsupported %s", (format) => {
    expect(llmSourceAvailability(format)).toBe("not-provided");
  });
  it("offers a static image gate without claiming successful pixel recognition", () => {
    expect(llmSourceAvailability("image")).toBe("image-gated");
  });
});
