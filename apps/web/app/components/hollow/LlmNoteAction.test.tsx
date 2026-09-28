import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LlmNoteAction } from "./LlmNoteAction";

const fixture = vi.hoisted(() => ({
  effects: [] as Array<() => undefined | (() => void)>,
  setters: Array.from({ length: 8 }, () => vi.fn()),
  refs: [] as Array<{ current: unknown }>,
  uncertain: false,
  view: null as unknown,
  cursor: 0,
  revision: 0,
  actor: "alpha",
  mounted: true,
  resolved: undefined as undefined | (() => void),
  unsubscribe: vi.fn(),
  read: vi.fn(),
  post: vi.fn(),
  models: vi.fn(),
  router: { state: { location: { href: "/notes/one" } } },
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (value: unknown) => {
    const index = fixture.cursor++;
    return [
      index === 0 ? fixture.view : index === 7 ? fixture.uncertain : value,
      fixture.setters[index],
    ];
  },
  useRef: (value: unknown) => {
    const ref = { current: value };
    fixture.refs.push(ref);
    return ref;
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => undefined | (() => void)) => {
    fixture.effects.push(effect);
  },
  useTransition: () => [false, (work: () => void) => work()],
}));
vi.mock("@tanstack/react-router", () => ({
  Link: "a",
  useBlocker: vi.fn(),
  useRouter: () => ({
    ...fixture.router,
    invalidate: vi.fn(),
    subscribe: (_: string, listener: () => void) => {
      fixture.resolved = listener;
      return fixture.unsubscribe;
    },
  }),
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const revision = ++fixture.revision;
    const actor = fixture.actor;
    const href = fixture.router.state.location.href;
    return () =>
      fixture.mounted &&
      revision === fixture.revision &&
      actor === fixture.actor &&
      href === fixture.router.state.location.href;
  },
}));
vi.mock("@/presentation/llmServerFn", () => ({
  getLlmNoteFn: fixture.read,
  requestLlmFn: fixture.post,
  listLlmModelsFn: fixture.models,
  cancelLlmFn: vi.fn(),
  undoLlmFn: vi.fn(),
}));
vi.mock("@/presentation/errorDisplay", () => ({
  displayError: () => "safe failure",
}));
vi.mock("@/presentation/errorResponse", () => ({
  extractSerializedError: () => ({ kind: "unknown" }),
}));
vi.mock("./LlmUsage", () => ({ LlmUsage: "section" }));
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
const state = (outcome: string) => ({
  noteVersion: 2,
  modelId: "selected-model",
  instruction: "kept instruction",
  processing: false,
  receipt: null,
  job: { id: "job", outcome },
});
async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
function mount() {
  LlmNoteAction({ noteId: "note", noteVersion: 2 });
  const disposers = fixture.effects.map((effect) => effect());
  return () => {
    fixture.mounted = false;
    for (const dispose of disposers) dispose?.();
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.effects = [];
  fixture.refs = [];
  fixture.uncertain = false;
  fixture.view = null;
  fixture.cursor = fixture.revision = 0;
  fixture.actor = "alpha";
  fixture.mounted = true;
  fixture.router.state.location.href = "/notes/one";
});
describe("LLM note resolved current read", () => {
  it.each([
    ["image-gated", true],
    ["pdf-text-gated", false],
    ["office-text-gated", false],
    ["no-original", false],
  ])("discloses image input uncertainty only for %s", (availability, expected) => {
    fixture.view = { ...state("succeeded"), availability };
    const paragraphs = (node: ReactNode): string[] => {
      if (Array.isArray(node)) return node.flatMap(paragraphs);
      if (!isValidElement<{ children?: ReactNode }>(node)) return [];
      return [
        ...(node.type === "p" && typeof node.props.children === "string"
          ? [node.props.children]
          : []),
        ...paragraphs(node.props.children),
      ];
    };
    const text = paragraphs(LlmNoteAction({ noteId: "note", noteVersion: 2 }));
    expect(
      text.some(
        (value) =>
          value.includes("画像のトークン数は事前計算していません") &&
          value.includes("サイズ・寸法の制限内でも") &&
          value.includes("モデルの入力上限を超える場合があります"),
      ),
    ).toBe(expected);
    expect(
      text.some((value) => value.includes("認識結果には誤りがあり得る")),
    ).toBe(expected);
    expect(fixture.post).not.toHaveBeenCalled();
  });
  it.each([
    ["image", "chat-image"],
    ["pdf", "chat-text"],
  ])("requests only the model purpose appropriate to %s", async (format, kind) => {
    fixture.view = {
      ...state("succeeded"),
      format,
      configured: true,
      linked: true,
      supported: true,
      availability: format === "image" ? "image-gated" : "pdf-text-gated",
    };
    fixture.models.mockResolvedValue({ source: "live", models: [] });
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    const find = (node: ReactNode): (() => void) | undefined => {
      if (Array.isArray(node)) {
        for (const child of node) {
          const action = find(child);
          if (action) return action;
        }
      }
      if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node))
        return;
      if (node.type === "button" && node.props.children === "モデル一覧を更新")
        return node.props.onClick;
      return find(node.props.children);
    };
    const action = find(tree);
    if (!action) throw Error("SYNTHETIC_ACTION");
    action();
    await settle();
    expect(fixture.models).toHaveBeenCalledWith({ data: { kind } });
    expect(fixture.post).not.toHaveBeenCalled();
  });
  function receiptRead(errorCommand = "self-command") {
    fixture.uncertain = true;
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    const command = { commandId: "self-command" };
    fixture.refs[1].current = command;
    fixture.refs[4].current = errorCommand;
    const find = (node: ReactNode): (() => void) | undefined => {
      if (Array.isArray(node)) {
        for (const child of node) {
          const action = find(child);
          if (action) return action;
        }
      }
      if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node))
        return;
      if (
        node.type === "button" &&
        node.props.children === "同じ受付の結果を再読"
      )
        return node.props.onClick;
      return find(node.props.children);
    };
    const action = find(tree);
    if (!action) throw new Error("receipt action missing");
    action();
    return command;
  }

  it.each([
    false,
    true,
  ])("receipt GET does not turn transport success into acceptance (receipt=%s)", async (accepted) => {
    const value = {
      ...state("cancelled"),
      receipt: accepted ? { id: "self-job" } : null,
    };
    fixture.read.mockResolvedValue(value);
    const command = receiptRead();
    await settle();
    expect(fixture.post).not.toHaveBeenCalled();
    expect(fixture.read).toHaveBeenCalledWith({
      data: { noteId: "note", commandId: "self-command" },
    });
    expect(fixture.setters[6]).not.toHaveBeenCalledWith(
      "操作を受け付けました。",
    );
    expect(fixture.setters[6]).toHaveBeenCalledWith(
      accepted
        ? "受付済みの変換を確認しました。"
        : "受付結果はまだ確認できません。自動再送は行いません。",
    );
    expect(fixture.refs[1].current).toEqual(accepted ? null : command);
    if (accepted) {
      expect(fixture.setters[7]).toHaveBeenCalledWith(false);
      expect(fixture.setters[5]).toHaveBeenCalledWith("");
    } else {
      expect(fixture.setters[7]).not.toHaveBeenCalled();
      expect(fixture.setters[5]).not.toHaveBeenCalled();
    }
  });

  it.each([
    "actor",
    "route",
  ])("rejects a late accepted receipt after %s change without POST", async (change) => {
    const pending = deferred();
    fixture.read.mockReturnValue(pending.promise);
    const command = receiptRead();
    await settle();
    if (change === "actor") fixture.actor = "beta";
    else fixture.router.state.location.href = "/notes/two";
    pending.resolve({ ...state("succeeded"), receipt: { id: "self-job" } });
    await settle();
    expect(fixture.refs[1].current).toEqual(command);
    expect(fixture.setters[7]).not.toHaveBeenCalled();
    expect(fixture.setters[5]).not.toHaveBeenCalled();
    expect(fixture.setters[6]).not.toHaveBeenCalledWith(
      "受付済みの変換を確認しました。",
    );
    expect(fixture.post).not.toHaveBeenCalled();
  });

  it("keeps an unrelated error when a current receipt is confirmed", async () => {
    fixture.read.mockResolvedValue({
      ...state("failed"),
      receipt: { id: "self-job" },
    });
    receiptRead("another-command");
    await settle();
    expect(fixture.setters[7]).toHaveBeenCalledWith(false);
    expect(fixture.setters[5]).not.toHaveBeenCalled();
    expect(fixture.setters[0]).toHaveBeenCalledWith({
      ...state("failed"),
      receipt: { id: "self-job" },
    });
    expect(fixture.post).not.toHaveBeenCalled();
  });

  it("adopts a quota refusal after route reconciliation without POST or draft reset", async () => {
    fixture.read
      .mockResolvedValueOnce(state("succeeded"))
      .mockResolvedValueOnce(state("failed"));
    const dispose = mount();
    await settle();
    for (const setter of fixture.setters) setter.mockClear();
    fixture.revision++;
    fixture.resolved?.();
    await settle();
    expect(fixture.setters[0]).toHaveBeenCalledWith(state("failed"));
    expect(fixture.setters[2]).not.toHaveBeenCalled();
    expect(fixture.setters[3]).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
    dispose();
  });
  it("coalesces initial/resolved races, initializes once and ignores superseded results", async () => {
    const old = deferred();
    const current = deferred();
    fixture.read
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    const dispose = mount();
    for (let i = 0; i < 10; i++) fixture.resolved?.();
    expect(fixture.read).toHaveBeenCalledTimes(1);
    old.resolve(state("succeeded"));
    await settle();
    expect(fixture.setters[0]).not.toHaveBeenCalled();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    current.resolve(state("failed"));
    await settle();
    expect(fixture.setters[0]).toHaveBeenCalledWith(state("failed"));
    expect(fixture.setters[2]).toHaveBeenCalledOnce();
    expect(fixture.setters[2]).toHaveBeenCalledWith("selected-model");
    dispose();
  });
  it.each([
    "actor",
    "route",
    "unmount",
  ])("rejects a late read after %s changes", async (change) => {
    const pending = deferred();
    fixture.read.mockReturnValue(pending.promise);
    const dispose = mount();
    if (change === "actor") fixture.actor = "beta";
    if (change === "route") fixture.router.state.location.href = "/notes/two";
    if (change === "unmount") dispose();
    pending.resolve(state("failed"));
    await settle();
    expect(fixture.setters[0]).not.toHaveBeenCalled();
    if (change !== "unmount") dispose();
    expect(fixture.unsubscribe).toHaveBeenCalledOnce();
  });
  it("drops a queued read on unmount without starting another request", async () => {
    const pending = deferred();
    fixture.read.mockReturnValue(pending.promise);
    const dispose = mount();
    fixture.resolved?.();
    dispose();
    pending.resolve(state("failed"));
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(1);
    expect(fixture.setters[0]).not.toHaveBeenCalled();
  });
});
