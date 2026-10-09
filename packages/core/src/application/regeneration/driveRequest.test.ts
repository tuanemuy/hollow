import { describe, expect, it } from "vitest";
import { type DriveMachineRequest, driveMachineIntent } from "./driveRequest";

const request: DriveMachineRequest = {
  noteId: "00000000-0000-4000-8000-000000000001",
  noteVersion: 3,
  recordId: "00000000-0000-4000-8000-000000000002",
  commandId: "00000000-0000-4000-8000-000000000003",
  confirmed: true,
};
describe("Drive machine request intent", () => {
  it("binds the selected record and confirmed note revision", () => {
    const digest = driveMachineIntent(request);
    expect(
      driveMachineIntent({ ...request, recordId: request.noteId }),
    ).not.toBe(digest);
    expect(driveMachineIntent({ ...request, noteVersion: 4 })).not.toBe(digest);
  });
  it("keeps operation progress and generated job identity outside the request content", () => {
    expect(
      driveMachineIntent({ ...request, commandId: request.recordId }),
    ).toBe(driveMachineIntent(request));
  });
  it("uses a distinct Drive machine recipe from a local machine request", () => {
    expect(driveMachineIntent(request)).not.toBe(
      JSON.stringify(["machine-html-markdown/v1", request.noteId]),
    );
  });
});
