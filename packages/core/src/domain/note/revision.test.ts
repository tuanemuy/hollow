import { describe, expect, it } from "vitest";
import {
  conflictingHumanVersion,
  type HumanMutation,
  type NoteRevision,
  recordHumanMutation,
  requireRetainedWysOrigin,
} from "./revision";

describe("bounded human conflict history", () => {
  it("retains another human across A B A and arbitrarily many system revisions", () => {
    let actors: readonly HumanMutation[] = [];
    actors = recordHumanMutation(actors, "A", 1);
    actors = recordHumanMutation(actors, "B", 2);
    actors = recordHumanMutation(actors, "A", 3);
    const head = { noteId: "N", currentNo: 99, baseFloor: 0, actors };
    expect(conflictingHumanVersion(head, "A", 1)).toBe(2);
    expect(conflictingHumanVersion(head, "A", 2)).toBeNull();
    expect(conflictingHumanVersion(head, "B", 2)).toBe(3);
    expect(conflictingHumanVersion(head, "C", 2)).toBe(3);
    expect(actors).toHaveLength(2);
  });
  it("keeps only the latest two distinct actors without erasing the latest other", () => {
    let actors: readonly HumanMutation[] = [];
    for (const [version, actor] of ["A", "B", "C", "C", "A"].entries())
      actors = recordHumanMutation(actors, actor, version + 1);
    expect(actors).toEqual([
      { accountId: "A", version: 5 },
      { accountId: "C", version: 4 },
    ]);
    expect(
      conflictingHumanVersion(
        { noteId: "N", currentNo: 1, baseFloor: 3, actors },
        "A",
        2,
      ),
    ).toBe("unknown");
    expect(
      conflictingHumanVersion(
        { noteId: "N", currentNo: 1, baseFloor: 3, actors },
        "A",
        4,
      ),
    ).toBeNull();
  });
});

describe("WYS origin is a retained same-note revision, not a current-head lock", () => {
  const revision: NoteRevision = {
    noteId: "note",
    revisionNo: 2,
    capturedNoteVersion: 37,
    title: "origin",
    html: "<p>origin</p>",
    style: "default",
    savedAt: new Date(0),
    actor: { kind: "legacy" },
    cause: "baseline",
    restoredFrom: null,
    originRevisionNo: null,
    resources: [],
  };
  const hint = { revisionNo: 2, capturedNoteVersion: 37 };
  it("allows a retained immutable version even after the current head progresses", () => {
    expect(
      requireRetainedWysOrigin("note", hint, revision, [1, 2, 3, 4], 5),
    ).toBe(2);
  });
  it("refuses this commit pruning the oldest, but accepts the next oldest", () => {
    const retained = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(requireRetainedWysOrigin("note", hint, revision, retained, 21)).toBe(
      2,
    );
    expect(() =>
      requireRetainedWysOrigin(
        "note",
        { ...hint, revisionNo: 1 },
        { ...revision, revisionNo: 1 },
        retained,
        21,
      ),
    ).toThrowError(expect.objectContaining({ code: "WYS_ORIGIN_UNAVAILABLE" }));
  });
  it.each([
    null,
    { ...revision, noteId: "other" },
    { ...revision, capturedNoteVersion: 38 },
    { ...revision, revisionNo: 3 },
  ])("rejects missing/wrong-note/wrong-version hints without borrowing authority", (value) => {
    expect(() =>
      requireRetainedWysOrigin("note", hint, value, [1, 2], 3),
    ).toThrowError(expect.objectContaining({ code: "WYS_ORIGIN_UNAVAILABLE" }));
  });
});
