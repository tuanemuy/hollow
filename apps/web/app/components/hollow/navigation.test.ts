import { describe, expect, it } from "vitest";
import { safeNoteDestination } from "./navigation";

describe("safeNoteDestination", () => {
  it.each([
    undefined,
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/notes/../../signin",
    "/notes-other",
    "javascript:alert(1)",
  ])("rejects an out-of-scope return URL: %s", (value) => {
    expect(safeNoteDestination(value)).toBe("/notes");
  });
  it.each([
    "/notes",
    "/notes/new",
    "/notes/a/edit?mode=html",
    "/notes/a#section",
  ])("preserves a note destination: %s", (value) => {
    expect(safeNoteDestination(value)).toBe(value);
  });
});
