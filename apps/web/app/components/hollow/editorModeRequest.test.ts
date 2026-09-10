import { describe, expect, it, vi } from "vitest";
import { createEditorModeRequests } from "./editorModeRequest";

describe("editor mode request ownership", () => {
  it("replaces a pending request even when selecting the displayed mode", () => {
    const owner = createEditorModeRequests();
    const visual = owner.begin("visual");
    const keepWys = owner.begin("wysiwyg");
    expect(owner.owns(visual)).toBe(false);
    expect(visual.signal.aborted).toBe(true);
    expect(owner.owns(keepWys)).toBe(true);
  });

  it("distinguishes visual A from visual B across another mode", () => {
    const owner = createEditorModeRequests();
    const first = owner.begin("visual");
    const html = owner.begin("html");
    const last = owner.begin("visual");
    expect(owner.owns(first)).toBe(false);
    expect(owner.owns(html)).toBe(false);
    expect(owner.owns(last)).toBe(true);
    expect(last.signal.aborted).toBe(false);
  });

  it.each([
    "cancel",
    "composition",
    "upload",
    "discard",
    "history",
    "unmount",
  ])("invalidates ownership for %s without implicitly queuing a mode", () => {
    const owner = createEditorModeRequests();
    const ticket = owner.begin("visual");
    const aborted = vi.fn();
    ticket.signal.addEventListener("abort", aborted);
    owner.cancel();
    owner.cancel();
    expect(owner.owns(ticket)).toBe(false);
    expect(aborted).toHaveBeenCalledTimes(1);
    expect(owner.owns(owner.begin("html"))).toBe(true);
  });

  it.each([
    "resolve",
    "reject",
  ])("ignores an obsolete %s while releasing only its own resource", async (outcome) => {
    const owner = createEditorModeRequests();
    const first = owner.begin("visual");
    let release!: () => void;
    const pending = new Promise<void>((resolve, reject) => {
      release = () =>
        outcome === "resolve" ? resolve() : reject(new Error("old"));
    });
    const commit = vi.fn();
    const error = vi.fn();
    const dispose = vi.fn();
    const work = (async () => {
      try {
        await pending;
        if (owner.owns(first)) commit();
      } catch {
        if (owner.owns(first)) error();
      } finally {
        dispose();
      }
    })();
    const last = owner.begin("html");
    release();
    await work;
    expect(commit).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(owner.owns(last)).toBe(true);
  });
});
