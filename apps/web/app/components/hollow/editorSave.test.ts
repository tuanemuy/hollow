import { describe, expect, it, vi } from "vitest";
import { createEditorModeRequests } from "./editorModeRequest";
import {
  clearCreationBackup,
  draftKey,
  type EditorDraft,
  editorRecoveryDownload,
  editorSaveCause,
  hasUnseenEditorUpdate,
  oneShotEditorConfirmation,
  readEditorBackup,
  sameDraft,
  settleEditorSave,
  writeEditorBackup,
} from "./editorSave";

const blank = { title: "title", html: "" };
const id = "01a07450-6616-7116-833c-7661497ded79";
const deferred = () => {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

describe("editor history boundary", () => {
  it("consumes confirmed version once, including zero, without authorizing later saves", () => {
    const take = oneShotEditorConfirmation(0);
    expect(take()).toBe(0);
    expect(take()).toBeUndefined();
    expect(take()).toBeUndefined();
    expect(oneShotEditorConfirmation()()).toBeUndefined();
    expect(oneShotEditorConfirmation(42)()).toBe(42);
  });
  it("distinguishes manual, automatic, and title-only saves without client actor metadata", () => {
    const previous = { title: "before", html: "<p>body</p>" };
    expect(
      editorSaveCause({ ...previous, title: "after" }, previous, "autosave"),
    ).toBe("title");
    expect(
      editorSaveCause(
        { ...previous, html: "<p>changed</p>" },
        previous,
        "autosave",
      ),
    ).toBe("autosave");
    expect(
      editorSaveCause(
        { ...previous, title: "after", html: "<p>changed</p>" },
        previous,
        "manual",
      ),
    ).toBe("manual");
    expect(editorSaveCause(previous, undefined, "autosave")).toBe("autosave");
    expect(editorSaveCause(previous, previous, "manual")).toBe("manual");
  });
  it("keeps untrusted title and HTML as recoverable JSON data, never an executable HTML download", () => {
    const draft = {
      title: "../bad\\name\u0000<script>.html",
      html: "<script>alert(1)</script><style>body{color:red}</style>日本語",
    };
    const download = editorRecoveryDownload(draft, "html");
    expect(download.mime).toBe("application/json;charset=utf-8");
    expect(download.filename).toMatch(/\.hollow-backup\.json$/);
    expect(download.filename).not.toMatch(/[\\/<>]/);
    expect(download.filename).not.toContain("\u0000");
    expect(JSON.parse(download.content)).toEqual({
      format: "hollow-unsaved-note",
      title: draft.title,
      html: draft.html,
      mode: "html",
    });
    expect(
      editorRecoveryDownload({ title: "", html: "" }, "wysiwyg").filename,
    ).toBe("無題.hollow-backup.json");
    expect(
      JSON.parse(editorRecoveryDownload(draft, "wysiwyg").content).mode,
    ).toBe("wysiwyg");
    expect(JSON.parse(editorRecoveryDownload(draft, "visual").content)).toEqual(
      { format: "hollow-unsaved-note", ...draft, mode: "visual" },
    );
  });
  it("notifies only unseen newer versions without changing the saved base", () => {
    const base = { version: 3, html: "unsaved local body" };
    expect(hasUnseenEditorUpdate(5, base.version, 3)).toBe(true);
    expect(hasUnseenEditorUpdate(5, base.version, 5)).toBe(false);
    expect(hasUnseenEditorUpdate(4, 5, 3)).toBe(false);
    expect(hasUnseenEditorUpdate(5, 5, 3)).toBe(false);
    expect(base).toEqual({ version: 3, html: "unsaved local body" });
  });
});

function editor() {
  let current: EditorDraft = blank;
  let saved: EditorDraft = blank;
  let created: { id: string; version: number } | undefined;
  let locked = false;
  const calls: { draft: EditorDraft; id?: string; version?: number }[] = [];
  const navigate = vi.fn(async () => {});
  const refresh = vi.fn(async () => {});
  const persist = vi.fn(async (draft: EditorDraft) => {
    calls.push({ draft, ...created });
    return {
      ...draft,
      id: created?.id ?? id,
      version: created ? created.version + 1 : 0,
    };
  });
  const options = {
    read: () => current,
    persist,
    accept(snapshot: EditorDraft, result: Awaited<ReturnType<typeof persist>>) {
      created = { id: result.id, version: result.version };
      saved = result;
      if (sameDraft(current, snapshot)) current = result;
      return result;
    },
    refresh,
    continueSaving: true,
    shouldNavigate: () => true,
    lock(value: boolean) {
      locked = value;
    },
    navigate,
  };
  return {
    options,
    calls,
    navigate,
    persist,
    refresh,
    input(value: EditorDraft) {
      if (!locked) current = value;
    },
    read: () => current,
    saved: () => saved,
    locked: () => locked,
  };
}

describe("editor save handoff", () => {
  it("keeps a created ID and later input when a mode request is cancelled during refresh", async () => {
    const state = editor();
    const requests = createEditorModeRequests();
    const target = requests.begin("visual");
    const moved = vi.fn();
    const wait = deferred();
    state.options.refresh.mockImplementationOnce(() => wait.promise);
    state.input({ title: "first", html: "<p>first</p>" });
    const saving = settleEditorSave({
      ...state.options,
      navigate: async (result) =>
        moved({
          ...result,
          mode: requests.owns(target) ? target.target : "html",
        }),
    });
    await vi.waitFor(() =>
      expect(state.options.refresh).toHaveBeenCalledOnce(),
    );
    requests.begin("html");
    state.input({ title: "latest", html: "<p>second input</p>" });
    wait.release();
    await saving;
    expect(state.calls).toHaveLength(2);
    expect(state.calls[0]?.id).toBeUndefined();
    expect(state.calls[1]?.id).toBe(id);
    expect(state.saved().html).toBe("<p>second input</p>");
    expect(moved).toHaveBeenCalledWith(
      expect.objectContaining({ id, mode: "html" }),
    );
    expect(state.locked()).toBe(false);
  });
  it.each([
    "<p>HTML continued</p>",
    "WYSIWYG continued",
  ])("saves input during refresh to the created note: %s", async (html) => {
    const e = editor();
    const wait = deferred();
    e.refresh.mockImplementationOnce(() => wait.promise);
    const saving = settleEditorSave(e.options);
    await vi.waitFor(() => expect(e.refresh).toHaveBeenCalledOnce());
    e.input({ title: "latest title", html });
    wait.release();
    await saving;
    expect(e.calls).toHaveLength(2);
    expect(e.calls[0]?.id).toBeUndefined();
    expect(e.calls[1]).toMatchObject({
      id,
      version: 0,
      draft: { title: "latest title", html },
    });
    expect(e.read()).toEqual(e.saved());
    expect(e.navigate).toHaveBeenCalledOnce();
    expect(e.locked()).toBe(false);
  });

  it("coalesces more input during subsequent save and refresh without reverting snapshots", async () => {
    const e = editor();
    e.refresh.mockImplementationOnce(async () => {
      e.input({ title: "second", html: "second" });
    });
    e.persist.mockImplementationOnce(async (snapshot) => {
      e.calls.push({ draft: snapshot });
      e.input({ title: "during response", html: "during response" });
      return { ...snapshot, id, version: 0 };
    });
    e.refresh.mockImplementationOnce(async () => {
      e.input({ title: "third", html: "latest" });
    });
    await settleEditorSave(e.options);
    expect(e.calls.map((call) => call.draft.html)).toEqual([
      "",
      "second",
      "latest",
    ]);
    expect(e.calls.slice(1).every((call) => call.id === id)).toBe(true);
    expect(e.saved().html).toBe("latest");
  });

  it("rechecks input applied by the synchronous lock flush", async () => {
    const e = editor();
    let first = true;
    const lock = e.options.lock;
    e.options.lock = (value) => {
      if (value && first) {
        first = false;
        e.input({ title: "flushed", html: "queued" });
      }
      lock(value);
    };
    await settleEditorSave(e.options);
    expect(e.calls).toHaveLength(2);
    expect(e.saved().html).toBe("queued");
    expect(e.navigate).toHaveBeenCalledOnce();
  });

  it("locks only navigation and unlocks after navigation failure", async () => {
    const e = editor();
    e.navigate.mockImplementationOnce(async () => {
      expect(e.locked()).toBe(true);
      e.input({ title: "not accepted while disabled", html: "not accepted" });
      throw new Error("navigation unavailable");
    });
    await expect(settleEditorSave(e.options)).rejects.toThrow(
      "navigation unavailable",
    );
    expect(e.read().html).toBe("");
    expect(e.locked()).toBe(false);
    e.input({ title: "retry", html: "retained" });
    await settleEditorSave(e.options);
    expect(e.calls[1]?.id).toBe(id);
    expect(e.saved().html).toBe("retained");
  });

  it("preserves latest draft and created identity across refresh failure and retry", async () => {
    const e = editor();
    e.refresh.mockImplementationOnce(async () => {
      e.input({ title: "offline", html: "backup" });
      throw new Error("offline");
    });
    await expect(settleEditorSave(e.options)).rejects.toThrow("offline");
    expect(e.read().html).toBe("backup");
    expect(e.navigate).not.toHaveBeenCalled();
    await settleEditorSave(e.options);
    expect(e.calls[1]?.id).toBe(id);
    expect(e.saved().html).toBe("backup");
  });

  it("keeps editing when save removals need acknowledgement", async () => {
    const e = editor();
    e.options.shouldNavigate = () => false;
    await settleEditorSave(e.options);
    expect(e.navigate).not.toHaveBeenCalled();
    expect(e.locked()).toBe(false);
  });

  it("leaves ordinary existing-note autosave cadence unchanged", async () => {
    const e = editor();
    e.options.continueSaving = false;
    e.refresh.mockImplementationOnce(async () => {
      e.input({ title: "typing", html: "unsaved" });
    });
    await settleEditorSave(e.options);
    expect(e.calls).toHaveLength(1);
    expect(e.read().html).toBe("unsaved");
    expect(e.navigate).not.toHaveBeenCalled();
  });
});

describe("creation backup continuity", () => {
  const storage = () => {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    };
  };
  it("reads legacy new-only backups without a destination", () => {
    const s = storage();
    s.setItem(draftKey("A"), JSON.stringify({ title: "old", html: "legacy" }));
    expect(readEditorBackup(s, draftKey("A"))).toEqual({
      draft: { title: "old", html: "legacy" },
      noteId: undefined,
      mode: undefined,
    });
  });
  it("writes the stable backup before new destination and cleans both after success", () => {
    const s = storage();
    const draft = {
      title: "latest",
      html: "continued",
      draftId: "draft",
      importReferences: false,
    };
    writeEditorBackup(s, "A", undefined, id, draft, true, "html");
    expect(readEditorBackup(s, draftKey("A"))?.noteId).toBe(id);
    expect(readEditorBackup(s, draftKey("A", id))?.draft).toEqual(draft);
    expect(readEditorBackup(s, draftKey("A", id))?.mode).toBe("html");
    expect(readEditorBackup(s, draftKey("A"))?.mode).toBe("html");
    expect(readEditorBackup(s, draftKey("B", id))).toBeNull();
    clearCreationBackup(s, "A", id);
    expect(readEditorBackup(s, draftKey("A"))).toBeNull();
    expect(readEditorBackup(s, draftKey("A", id))?.draft).toEqual(draft);
    writeEditorBackup(s, "A", id, id, draft, false);
    expect(readEditorBackup(s, draftKey("A", id))).toBeNull();
  });
  it("does not advertise a destination when stable backup writing fails", () => {
    const s = storage();
    writeEditorBackup(s, "A", undefined, undefined, blank, true);
    const broken = {
      ...s,
      setItem: (key: string, value: string) => {
        if (key === draftKey("A", id)) throw new Error("quota");
        s.setItem(key, value);
      },
    };
    expect(() =>
      writeEditorBackup(broken, "A", undefined, id, blank, true),
    ).toThrow("quota");
    expect(readEditorBackup(s, draftKey("A"))?.noteId).toBeUndefined();
    expect(readEditorBackup(s, draftKey("A"))?.draft).toEqual(blank);
  });
  it("keeps visual recovery distinct from the device preference and cleans both creation keys", () => {
    const s = storage();
    const draft = { title: "latest", html: "<p>visual &amp; 日本語</p>" };
    s.setItem("hollow:editor-mode:A", "html");
    writeEditorBackup(s, "A", undefined, id, draft, true, "visual");
    expect(readEditorBackup(s, draftKey("A"))).toMatchObject({
      noteId: id,
      mode: "visual",
      draft,
    });
    expect(readEditorBackup(s, draftKey("A", id))?.mode).toBe("visual");
    clearCreationBackup(s, "A", id);
    writeEditorBackup(s, "A", id, id, draft, false, "visual");
    expect(readEditorBackup(s, draftKey("A"))).toBeNull();
    expect(readEditorBackup(s, draftKey("A", id))).toBeNull();
    expect(s.getItem("hollow:editor-mode:A")).toBe("html");
  });
  it("does not clear a different new destination or another user's backup", () => {
    const s = storage();
    writeEditorBackup(s, "A", undefined, id, blank, true);
    clearCreationBackup(s, "B", id);
    clearCreationBackup(s, "A", "different");
    expect(readEditorBackup(s, draftKey("A"))?.noteId).toBe(id);
  });
  it("ignores malformed targets rather than navigating arbitrary URLs", () => {
    const s = storage();
    s.setItem(
      draftKey("A"),
      JSON.stringify({
        ...blank,
        noteId: "https://example.com/",
        mode: "visual-or-script",
      }),
    );
    expect(readEditorBackup(s, draftKey("A"))?.noteId).toBeUndefined();
    expect(readEditorBackup(s, draftKey("A"))?.mode).toBeUndefined();
  });
});
