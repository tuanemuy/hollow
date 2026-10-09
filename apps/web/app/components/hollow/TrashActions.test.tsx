import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { importRecoveryAction, type jobStatus } from "./ImportJobs";
import { NoteTrashDialog } from "./NoteTrashDialog";
import { trashRestoreLabel } from "./TrashList";

describe("trash import recovery actions", () => {
  it("keeps failed retry distinct from a cancelled operation", () => {
    expect(
      importRecoveryAction({ state: "failed", targetAvailable: true }),
    ).toBe("retry");
    expect(
      importRecoveryAction({ state: "cancelled", targetAvailable: true }),
    ).toBe("reimport");
  });
  it.each<keyof typeof jobStatus>([
    "queued",
    "running",
    "succeeded",
    "failed",
    "cancelled",
  ])("does not offer an action for unavailable %s targets", (state) => {
    expect(importRecoveryAction({ state, targetAvailable: false })).toBeNull();
  });
  it.each<keyof typeof jobStatus>([
    "queued",
    "running",
    "succeeded",
  ])("does not offer an action for %s jobs", (state) => {
    expect(importRecoveryAction({ state, targetAvailable: true })).toBeNull();
  });
});
describe("trash retention display", () => {
  it("shows the server's remaining days without deriving new authorization", () => {
    expect(
      trashRestoreLabel({ canRestore: true, remainingDays: 30 }),
    ).toContain("残り 30 日");
    expect(trashRestoreLabel({ canRestore: true, remainingDays: 1 })).toContain(
      "残り 1 日",
    );
  });
  it("marks an expired target unavailable even when a day count is present", () => {
    expect(
      trashRestoreLabel({ canRestore: false, remainingDays: 0 }),
    ).toContain("復元できません");
    expect(
      trashRestoreLabel({ canRestore: false, remainingDays: 1 }),
    ).toContain("復元できません");
  });
});

describe("note trash confirmation", () => {
  it("warns that public pages and share links stop working while retaining the restore period", () => {
    const html = renderToStaticMarkup(
      <NoteTrashDialog
        target={{ id: "note", title: "削除前のノート" }}
        pending={false}
        error=""
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(html).toContain(
      "公開ページや共有リンクからも閲覧できなくなります。",
    );
    expect(html).toContain("保存済みの内容は保持され");
    expect(html).toContain("削除から30日以内なら復元できます。");
    expect(html).toContain("削除前のノート");
  });
});
