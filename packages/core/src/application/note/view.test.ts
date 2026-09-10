import type { Original } from "@repo/core/domain/import/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { describe, expect, it } from "vitest";
import { toNoteView } from "./view";

describe("authorized note projection source format", () => {
  it("projects stored import format rather than guessing it from a filename or HTML", () => {
    const now = new Date(0);
    const note = createNote(
      {
        id: "note",
        accountId: "owner",
        title: "note",
        html: "<p>plain</p>",
        text: "plain",
      },
      now,
    );
    const original: Original = {
      id: "original",
      noteId: note.id,
      accountId: "owner",
      name: "misleading.pdf",
      format: "html",
      bytes: 12,
      storageKey: "secret-original-key",
      sha256: "digest",
      state: "ready",
      coverage: "complete",
      activeJobId: "job",
      createdAt: now,
    };
    expect(toNoteView(note, original).original).toEqual({
      id: "original",
      name: "misleading.pdf",
      format: "html",
      bytes: 12,
      coverage: "complete",
      notices: [],
    });
    expect(toNoteView(note).original).toBeUndefined();
  });
});
