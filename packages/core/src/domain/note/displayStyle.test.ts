import { describe, expect, it } from "vitest";
import {
  automaticDisplay,
  completeDisplay,
  interruptDisplay,
  type NoteDisplay,
} from "./displayStyle";

describe("one-time display initialization", () => {
  const pending: NoteDisplay = {
    style: "default",
    source: "automatic",
    initialization: { kind: "reference", jobId: "first", decorated: true },
  };
  it("finalizes only the recorded first job, not a retry", () => {
    expect(completeDisplay(pending, "reference", "later", true)).toBe(pending);
    expect(completeDisplay(pending, "reference", "first", false)).toEqual(
      automaticDisplay(false),
    );
  });
  it("uses the recorded safe initial result on interruption", () => {
    expect(interruptDisplay(pending)).toEqual(
      automaticDisplay(true, "interrupted"),
    );
    expect(
      interruptDisplay({
        style: "default",
        source: "automatic",
        initialization: { kind: "conversion", jobId: "first" },
      }),
    ).toEqual(automaticDisplay(false, "interrupted"));
  });
  it.each([
    "user",
    "legacy",
    "automatic",
  ] as const)("never reclassifies a completed %s setting", (source) => {
    const selected: NoteDisplay = {
      style: "original",
      source,
      initialization: { kind: "complete", reason: "user" },
    };
    expect(completeDisplay(selected, "reference", "first", false)).toBe(
      selected,
    );
    expect(interruptDisplay(selected)).toBe(selected);
  });
});
