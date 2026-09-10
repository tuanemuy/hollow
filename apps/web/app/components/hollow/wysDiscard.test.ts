import { describe, expect, it, vi } from "vitest";
import { prepare } from "@/adapters/wys/model";
import { WysSession } from "@/adapters/wys/session";
import { createEditorModeRequests } from "./editorModeRequest";
import { discardedWysRecovery, prepareDiscardedWys } from "./wysDiscard";
import type { WysRecovery } from "./wysRecovery";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("explicit WYS discard preparation", () => {
  const recovery: WysRecovery = {
    version: 1,
    converted: false,
    originSaved: false,
    origin: { noteId: "note", revisionNo: 1, capturedNoteVersion: 0 },
  };
  const baseline = { noteId: "note", source: "<p>saved</p>", recovery };

  it("retains the existing clean canonical preparation without creating an origin", () => {
    expect(
      discardedWysRecovery({ html: baseline.source }, "note", baseline),
    ).toBe(recovery);
  });

  it("prefers saved metadata over a previously prepared baseline", () => {
    const saved = { ...recovery, converted: true, originSaved: true };
    expect(
      discardedWysRecovery(
        { html: baseline.source, wys: saved },
        "note",
        baseline,
      ),
    ).toBe(saved);
  });

  it("does not borrow a baseline from another source, note, or transformed backup", () => {
    expect(
      discardedWysRecovery({ html: "<p>different</p>" }, "note", baseline),
    ).toBeUndefined();
    expect(
      discardedWysRecovery({ html: baseline.source }, "other", baseline),
    ).toBeUndefined();
    expect(
      discardedWysRecovery({ html: baseline.source }, "note", {
        ...baseline,
        recovery: { ...recovery, converted: true },
      }),
    ).toBeUndefined();
    expect(
      discardedWysRecovery({ html: baseline.source }, "note", undefined),
    ).toBeUndefined();
  });

  it("rebuilds the exact saved source with fresh undo and permits subsequent edits", async () => {
    const html = '<p class="keep">保存済み\r\n本文</p><aside>保持</aside>';
    const analyzer = {
      prepare: vi.fn(async () => prepare(html)),
      dispose: vi.fn(),
    };
    const result = await prepareDiscardedWys(
      html,
      new AbortController().signal,
      analyzer,
      () => true,
    );
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") throw Error("missing prepared plan");
    const session = new WysSession(result.plan);
    expect(session.html).toBe(html);
    expect(session.epoch.steps).toBe(0);
    expect(session.history("undo", () => {})).toBe(false);
    expect(session.admit(session.state.tr.insertText("次", 1)).kind).toBe(
      "accepted",
    );
    expect(session.html).toContain("次保存済み");
    expect(session.html).toContain("<aside>保持</aside>");
    expect(analyzer.dispose).toHaveBeenCalledOnce();
  });

  it.each([
    "success",
    "failure",
  ] as const)("ignores an old %s after a later mode selection", async (outcome) => {
    const requests = createEditorModeRequests();
    const request = requests.begin("wysiwyg");
    const pending = deferred<ReturnType<typeof prepare>>();
    const analyzer = {
      prepare: vi.fn(() => pending.promise),
      dispose: vi.fn(),
    };
    const result = prepareDiscardedWys(
      "<p>old</p>",
      request.signal,
      analyzer,
      () => requests.owns(request),
    );
    requests.begin("html");
    if (outcome === "success") pending.resolve(prepare("<p>old</p>"));
    else pending.reject(Error("old failure"));
    expect(await result).toEqual({ kind: "superseded" });
    expect(analyzer.dispose).toHaveBeenCalledOnce();
  });

  it("invalidates a reset on cancellation/unmount without invalidating a later reset", async () => {
    const requests = createEditorModeRequests();
    const old = requests.begin("wysiwyg");
    requests.cancel();
    const current = requests.begin("wysiwyg");
    const analyzer = {
      prepare: vi.fn(async () => prepare("<p>saved</p>")),
      dispose: vi.fn(),
    };
    expect(
      await prepareDiscardedWys("<p>saved</p>", old.signal, analyzer, () =>
        requests.owns(old),
      ),
    ).toEqual({ kind: "superseded" });
    expect(
      (
        await prepareDiscardedWys(
          "<p>saved</p>",
          current.signal,
          analyzer,
          () => requests.owns(current),
        )
      ).kind,
    ).toBe("ready");
  });

  it("reports preparation failure and allows retry of the unchanged complete HTML", async () => {
    const html = "<p>saved</p>";
    const analyzer = {
      prepare: vi
        .fn<() => Promise<ReturnType<typeof prepare>>>()
        .mockRejectedValueOnce(Error("deadline"))
        .mockResolvedValueOnce(prepare(html)),
      dispose: vi.fn(),
    };
    const signal = new AbortController().signal;
    expect(
      await prepareDiscardedWys(html, signal, analyzer, () => true),
    ).toEqual({ kind: "failed", reason: "deadline" });
    expect(
      (await prepareDiscardedWys(html, signal, analyzer, () => true)).kind,
    ).toBe("ready");
    expect(analyzer.dispose).toHaveBeenCalledTimes(2);
  });

  it("does not accept a plan for different source or normalize the saved source", async () => {
    const analyzer = {
      prepare: vi.fn(async () => prepare("<p>line\nline</p>")),
      dispose: vi.fn(),
    };
    const result = await prepareDiscardedWys(
      "<p>line\r\nline</p>",
      new AbortController().signal,
      analyzer,
      () => true,
    );
    expect(result.kind).toBe("failed");
    expect(analyzer.dispose).toHaveBeenCalledOnce();
  });
});
