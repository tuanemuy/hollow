import { describe, expect, it } from "vitest";
import { type DriveLlmRequest, driveLlmIntent } from "./driveRequest";

const request: DriveLlmRequest = {
  noteId: "note",
  noteVersion: 7,
  recordId: "record",
  commandId: "command",
  expectedEpoch: 3,
  modelId: "model",
  instruction: "Keep references",
  confirmed: true,
};
describe("Drive LLM command identity", () => {
  it("keeps the selected source intent independent of a newly allocated command", () => {
    expect(driveLlmIntent({ ...request, commandId: "next-command" })).toBe(
      driveLlmIntent(request),
    );
  });
  it.each([
    { recordId: "other-record" },
    { noteVersion: 8 },
    { expectedEpoch: 4 },
    { modelId: "other-model" },
    { instruction: "Different instructions" },
  ])("requires new intent after source, body, credential or recipe changes: %j", (change) => {
    expect(driveLlmIntent({ ...request, ...change })).not.toBe(
      driveLlmIntent(request),
    );
  });
});
