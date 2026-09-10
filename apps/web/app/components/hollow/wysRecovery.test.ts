import { describe, expect, it } from "vitest";
import {
  draftKey,
  editorRecoveryDownload,
  readEditorBackup,
  writeEditorBackup,
} from "./editorSave";
import {
  acknowledgeWysRecovery,
  confirmWysRecoveryOrigin,
  readWysRecovery,
  shouldWarnWys,
  type WysRecovery,
  wysAfterSourceEdit,
  wysRestoreTarget,
  wysWarningKey,
} from "./wysRecovery";

const noteId = "10000000-0000-4000-8000-000000000001";
const storage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
};
describe("WYS latest HTML recovery and optional origin hint", () => {
  const wys: WysRecovery = {
    version: 1,
    converted: true,
    originSaved: false,
    origin: { noteId, revisionNo: 3, capturedNoteVersion: 2 },
  };
  it("separates a fresh pending baseline from the previously saved restore target", () => {
    const saved = { revisionNo: 1, available: true };
    expect(wysRestoreTarget({ ...wys, converted: false }, saved, true)).toEqual(
      { ...saved, pending: false },
    );
    expect(wysRestoreTarget(wys, saved, true)).toEqual({
      revisionNo: 3,
      available: true,
      pending: true,
    });
    expect(
      wysRestoreTarget({ ...wys, originSaved: true }, saved, false),
    ).toEqual({ revisionNo: 3, available: false, pending: false });
    expect(
      wysRestoreTarget(
        { ...wys, converted: false },
        { revisionNo: 1, available: false },
        true,
      ),
    ).toEqual({ revisionNo: 1, available: false, pending: false });
    expect(wysRestoreTarget(undefined, null, undefined)).toBeNull();
  });
  it("does not mark a fresh preparation committed by title-only or another saved origin", () => {
    expect(
      acknowledgeWysRecovery({ ...wys, converted: false }, 1).originSaved,
    ).toBe(false);
    expect(
      acknowledgeWysRecovery({ ...wys, converted: false }, 3).originSaved,
    ).toBe(false);
    expect(acknowledgeWysRecovery(wys, 1).originSaved).toBe(false);
    expect(acknowledgeWysRecovery(wys, 3).originSaved).toBe(true);
  });
  it("retains uncommitted transformed recovery independently of source mode", () => {
    expect(wysAfterSourceEdit("old", "new HTML", wys)).toBe(wys);
    const invalid = { ...wys, invalidOrigin: true as const };
    expect(wysAfterSourceEdit("old", "new HTML", invalid)).toBe(invalid);
    expect(
      wysAfterSourceEdit("old", "new HTML", { ...wys, originSaved: true }),
    ).toBeUndefined();
    const prepared = { ...wys, converted: false };
    expect(wysAfterSourceEdit("old", "new HTML", prepared)).toBeUndefined();
    expect(wysAfterSourceEdit("old", "old", prepared)).toBe(prepared);
  });
  it("reconfirms a restored saved flag against this note, current saved target and held version", () => {
    const saved = { ...wys, originSaved: true };
    const held = [{ revisionNo: 3, capturedNoteVersion: 2 }];
    expect(
      confirmWysRecoveryOrigin(
        saved,
        noteId,
        { revisionNo: 3, available: true },
        held,
      ),
    ).toEqual({ recovery: saved, available: true });
    expect(
      confirmWysRecoveryOrigin(saved, noteId, null, held).recovery.originSaved,
    ).toBe(false);
    expect(
      confirmWysRecoveryOrigin(
        saved,
        "20000000-0000-4000-8000-000000000001",
        { revisionNo: 3, available: true },
        held,
      ).recovery,
    ).toMatchObject({ originSaved: false, invalidOrigin: true });
    expect(
      confirmWysRecoveryOrigin(saved, noteId, null, []).recovery,
    ).toMatchObject({ originSaved: false, invalidOrigin: true });
    expect(
      confirmWysRecoveryOrigin(
        saved,
        noteId,
        { revisionNo: 3, available: false },
        [],
      ),
    ).toEqual({ recovery: saved, available: false });
    expect(
      confirmWysRecoveryOrigin(wys, noteId, null, [
        { revisionNo: 3, capturedNoteVersion: 9 },
      ]).recovery.invalidOrigin,
    ).toBe(true);
    expect(
      confirmWysRecoveryOrigin(
        saved,
        noteId,
        { revisionNo: 3, available: true },
        [{ revisionNo: 3, capturedNoteVersion: 9 }],
      ).recovery,
    ).toMatchObject({ originSaved: false, invalidOrigin: true });
  });
  it("keeps the complete latest HTML and original hint together across new/stable bridge", () => {
    const s = storage();
    const draft = {
      title: "最新",
      html: "<p>編集済み</p><aside>保持</aside>",
      wys,
    };
    writeEditorBackup(s, "A", undefined, noteId, draft, true, "wysiwyg");
    expect(readEditorBackup(s, draftKey("A", noteId))).toEqual({
      draft,
      noteId: undefined,
      mode: "wysiwyg",
    });
    expect(readEditorBackup(s, draftKey("A"))?.noteId).toBe(noteId);
    expect(readEditorBackup(s, draftKey("B"))).toBeNull();
  });
  it("retains HTML when origin hints are malformed, instead of treating converted backup as fresh canonical", () => {
    const s = storage();
    for (const invalid of [
      "bad",
      null,
      { version: 8 },
      {
        version: 1,
        converted: true,
        origin: { noteId: "other", revisionNo: 0 },
      },
    ]) {
      s.setItem(
        "backup",
        JSON.stringify({ title: "最新", html: "<p>回収</p>", wys: invalid }),
      );
      const result = readEditorBackup(s, "backup");
      expect(result?.draft.html).toBe("<p>回収</p>");
      expect(result?.draft.wys).toMatchObject({
        converted: true,
        invalidOrigin: true,
      });
    }
  });
  it("keeps old no-mode/new-only backups and four-key download compatible", () => {
    const s = storage();
    s.setItem("backup", JSON.stringify({ title: "旧", html: "<p>旧</p>" }));
    expect(readEditorBackup(s, "backup")).toEqual({
      draft: { title: "旧", html: "<p>旧</p>" },
      noteId: undefined,
      mode: undefined,
    });
    expect(
      Object.keys(
        JSON.parse(
          editorRecoveryDownload(
            { title: "新", html: "<p>新</p>", wys },
            "wysiwyg",
          ).content,
        ),
      ),
    ).toEqual(["format", "title", "html", "mode"]);
  });
  it("only understands a bounded, typed hint, never claims it is server-authorized", () => {
    expect(readWysRecovery(wys)).toEqual(wys);
    expect(
      readWysRecovery({
        ...wys,
        origin: { ...wys.origin, revisionNo: Number.MAX_SAFE_INTEGER + 1 },
      })?.invalidOrigin,
    ).toBe(true);
  });
  it("separates user-device warning preferences and fails to warning on storage errors", () => {
    const s = storage();
    expect(shouldWarnWys(s, "A")).toBe(true);
    s.setItem(wysWarningKey("A"), "hidden-v1");
    expect(shouldWarnWys(s, "A")).toBe(false);
    expect(shouldWarnWys(s, "B")).toBe(true);
    s.removeItem(wysWarningKey("A"));
    expect(shouldWarnWys(s, "A")).toBe(true);
    expect(
      shouldWarnWys(
        {
          getItem() {
            throw new Error("denied");
          },
        },
        "A",
      ),
    ).toBe(true);
  });
});
