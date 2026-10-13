import { isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LlmNoteAction } from "./LlmNoteAction";

const fixture = vi.hoisted(() => ({
  effects: [] as Array<() => undefined | (() => void)>,
  state: {
    view: 0,
    catalog: 1,
    model: 2,
    sttModel: 3,
    sttSeed: 4,
    sttCatalog: 5,
    instruction: 6,
    seed: 7,
    error: 8,
    message: 9,
    uncertain: 10,
    preview: 11,
    previewUncertain: 12,
  },
  setters: Array.from({ length: 13 }, () => vi.fn()),
  refs: [] as Array<{ current: unknown }>,
  uncertain: false,
  view: null as unknown,
  preview: null as unknown,
  previewUncertain: false,
  catalog: null as unknown,
  model: "",
  sttModel: "",
  sttSeed: "",
  sttCatalog: null as unknown,
  cursor: 0,
  revision: 0,
  actor: "alpha",
  mounted: true,
  resolved: undefined as undefined | (() => void),
  unsubscribe: vi.fn(),
  read: vi.fn(),
  post: vi.fn(),
  models: vi.fn(),
  previewRead: vi.fn(),
  previewBegin: vi.fn(),
  previewCancel: vi.fn(),
  router: { state: { location: { href: "/notes/one" } } },
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (value: unknown) => {
    const index = fixture.cursor++;
    return [
      index === fixture.state.view
        ? fixture.view
        : index === fixture.state.catalog
          ? (fixture.catalog ?? value)
          : index === fixture.state.model
            ? fixture.model
            : index === fixture.state.sttModel
              ? fixture.sttModel
              : index === fixture.state.sttSeed
                ? fixture.sttSeed
                : index === fixture.state.sttCatalog
                  ? (fixture.sttCatalog ?? value)
                  : index === fixture.state.uncertain
                    ? fixture.uncertain
                    : index === fixture.state.preview
                      ? fixture.preview
                      : index === fixture.state.previewUncertain
                        ? fixture.previewUncertain
                        : value,
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
  getPdfPreviewFn: fixture.previewRead,
  beginPdfPreviewFn: fixture.previewBegin,
  cancelPdfPreviewFn: fixture.previewCancel,
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
  fixture.preview = null;
  fixture.previewUncertain = false;
  fixture.catalog = null;
  fixture.model = "";
  fixture.sttModel = "";
  fixture.sttSeed = "";
  fixture.sttCatalog = null;
  fixture.previewRead.mockReset();
  fixture.previewBegin.mockReset();
  fixture.previewCancel.mockReset();
  fixture.cursor = fixture.revision = 0;
  fixture.actor = "alpha";
  fixture.mounted = true;
  fixture.router.state.location.href = "/notes/one";
});

describe("PDF preview interaction", () => {
  const pdfView = () => ({
    ...state("succeeded"),
    format: "pdf",
    availability: "pdf-gated",
    modelId: null,
    configured: true,
    linked: true,
    supported: true,
    epoch: 1,
    pdfPreview: null,
  });
  const ready = () => ({
    previewId: "preview",
    noteId: "note",
    noteVersion: 2,
    epoch: 1,
    state: "ready",
    usable: true,
    current: true,
    purpose: "chat-image",
    defaultModelId: "image/default",
    pages: 3,
    cancelRequested: false,
    ownershipUnconfirmed: false,
    expired: false,
  });
  function action(node: ReactNode, label: string): (() => void) | undefined {
    if (Array.isArray(node)) {
      for (const child of node) {
        const result = action(child, label);
        if (result) return result;
      }
    }
    if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node))
      return;
    if (node.type === "button" && node.props.children === label)
      return node.props.onClick;
    return action(node.props.children, label);
  }
  it("does not begin classification or load text models from an initial GET", async () => {
    fixture.view = pdfView();
    fixture.read.mockResolvedValue(pdfView());
    const dispose = mount();
    await settle();
    expect(fixture.previewBegin).not.toHaveBeenCalled();
    expect(fixture.models).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
    dispose();
  });
  it("discovers a live own receipt after reload and seeds only its explicit purpose default", async () => {
    fixture.view = pdfView();
    fixture.read.mockResolvedValue({
      ...pdfView(),
      pdfPreview: { previewId: "preview", commandId: "preview-command" },
    });
    fixture.previewRead.mockResolvedValue(ready());
    const dispose = mount();
    await settle();
    expect(fixture.previewRead).toHaveBeenCalledWith({
      data: { noteId: "note", commandId: "preview-command" },
    });
    expect(fixture.setters[fixture.state.model]).toHaveBeenCalledWith(
      "image/default",
    );
    expect(fixture.setters[fixture.state.preview]).toHaveBeenCalledWith(
      ready(),
    );
    expect(fixture.previewBegin).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
    dispose();
  });
  it("never adopts a late preview purpose after a route change", async () => {
    const delayed = deferred();
    fixture.view = pdfView();
    fixture.read.mockResolvedValue({
      ...pdfView(),
      pdfPreview: { previewId: "preview", commandId: "preview-command" },
    });
    fixture.previewRead.mockReturnValue(delayed.promise);
    const dispose = mount();
    await settle();
    fixture.router.state.location.href = "/notes/two";
    delayed.resolve(ready());
    await settle();
    expect(fixture.setters[fixture.state.preview]).not.toHaveBeenCalled();
    expect(fixture.setters[fixture.state.model]).not.toHaveBeenCalled();
    dispose();
  });
  it.each([
    ["fixed", "person/previous", "image/default", true],
    ["default", null, "image/default", true],
    ["absent", null, null, false],
    ["non-pdf", "person/previous", "image/default", false],
  ])("initial proposal after pending classification: %s", async (kind, previous, defaultModelId, expected) => {
    fixture.view = pdfView();
    fixture.read.mockResolvedValueOnce({ ...pdfView(), processing: true });
    const dispose = mount();
    await settle();
    fixture.setters[fixture.state.model].mockClear();
    fixture.read.mockResolvedValue({
      ...pdfView(),
      format: kind === "non-pdf" ? "text" : "pdf",
      modelId: previous,
      pdfPreview: { previewId: "preview", commandId: "preview-command" },
    });
    fixture.previewRead.mockResolvedValue({ ...ready(), defaultModelId });
    fixture.resolved?.();
    await settle();
    const proposal = previous ?? defaultModelId;
    expect(
      fixture.setters[fixture.state.model].mock.calls.some(
        ([value]) => value === proposal,
      ),
    ).toBe(expected);
    expect(fixture.post).not.toHaveBeenCalled();
    dispose();
  });
  it("issues one explicit begin and prevents a second POST while pending", async () => {
    fixture.view = pdfView();
    const delayed = deferred();
    fixture.previewBegin.mockReturnValue(delayed.promise);
    fixture.read.mockResolvedValue(pdfView());
    fixture.previewRead.mockResolvedValue(null);
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    const click = action(tree, "PDFの用途を確認");
    if (!click) throw Error("FIXTURE_ACTION");
    click();
    click();
    expect(fixture.previewBegin).toHaveBeenCalledTimes(1);
    expect(fixture.post).not.toHaveBeenCalled();
    delayed.resolve({ previewId: "preview", noteId: "note" });
    await settle();
  });
  it("uses only GET when a preview acknowledgement is uncertain", async () => {
    fixture.view = pdfView();
    fixture.previewUncertain = true;
    fixture.read.mockResolvedValue(pdfView());
    fixture.previewRead.mockResolvedValue(null);
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    fixture.refs[5].current = "preview-command";
    const click = action(tree, "用途確認の結果を再読");
    if (!click) throw Error("FIXTURE_ACTION");
    click();
    await settle();
    expect(fixture.previewRead).toHaveBeenCalledWith({
      data: { noteId: "note", commandId: "preview-command" },
    });
    expect(fixture.previewBegin).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
    expect(
      fixture.setters[fixture.state.previewUncertain],
    ).not.toHaveBeenCalledWith(false);
  });
  it("preserves the person's dirty model while reading a changed purpose default", async () => {
    fixture.view = pdfView();
    fixture.preview = ready();
    fixture.model = "person/choice";
    fixture.read.mockResolvedValue({
      ...pdfView(),
      pdfPreview: { previewId: "preview", commandId: "preview-command" },
    });
    fixture.previewRead.mockResolvedValue({
      ...ready(),
      defaultModelId: "changed/default",
    });
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    fixture.refs[2].current = true;
    action(tree, "用途確認の結果を再読")?.();
    await settle();
    expect(fixture.setters[fixture.state.model]).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
  });
  it("cancels a preview without beginning generation or changing its original command", async () => {
    fixture.view = pdfView();
    fixture.preview = ready();
    fixture.read.mockResolvedValue(pdfView());
    fixture.previewRead.mockResolvedValue({
      ...ready(),
      cancelRequested: true,
      usable: false,
    });
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    fixture.refs[5].current = "preview-command";
    action(tree, "用途確認を取り消す")?.();
    await settle();
    expect(fixture.previewCancel).toHaveBeenCalledWith({
      data: { previewId: "preview" },
    });
    expect(fixture.previewRead).toHaveBeenCalledWith({
      data: { noteId: "note", commandId: "preview-command" },
    });
    expect(fixture.previewBegin).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
  });
  it("drops a late purpose catalog after the current actor changes", async () => {
    fixture.view = pdfView();
    fixture.preview = ready();
    const delayed = deferred();
    fixture.models.mockReturnValue(delayed.promise);
    fixture.read.mockResolvedValue(pdfView());
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    action(tree, "モデル一覧を更新")?.();
    fixture.actor = "beta";
    delayed.resolve({
      source: "live",
      models: [{ id: "image/default", name: "default" }],
    });
    await settle();
    expect(fixture.models).toHaveBeenCalledWith({
      data: { kind: "chat-image" },
    });
    expect(fixture.setters[fixture.state.catalog]).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
  });
  it.each([
    "expired",
    "changed",
  ])("disables PDF confirmation after %s preview", (kind) => {
    fixture.view = pdfView();
    fixture.preview = {
      ...ready(),
      usable: false,
      current: kind !== "changed",
      expired: kind === "expired",
    };
    fixture.model = "image/default";
    fixture.catalog = {
      models: [{ id: "image/default", name: "default" }],
      source: "live",
    };
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    function disabled(node: ReactNode): boolean {
      if (Array.isArray(node)) return node.some(disabled);
      if (
        !isValidElement<{
          children?: ReactNode;
          type?: string;
          disabled?: boolean;
        }>(node)
      )
        return false;
      return (
        (node.type === "button" &&
          node.props.type === "submit" &&
          node.props.disabled === true) ||
        disabled(node.props.children)
      );
    }
    expect(disabled(tree)).toBe(true);
    expect(fixture.post).not.toHaveBeenCalled();
  });
});
describe("LLM note resolved current read", () => {
  it.each([
    ["image-gated", true],
    ["pdf-gated", true],
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
    ["pdf", "chat-image"],
  ])("requests only the model purpose appropriate to %s", async (format, kind) => {
    fixture.view = {
      ...state("succeeded"),
      format,
      configured: true,
      linked: true,
      supported: true,
      availability: format === "image" ? "image-gated" : "pdf-gated",
    };
    if (format === "pdf")
      fixture.preview = {
        usable: true,
        purpose: kind,
        state: "ready",
        current: true,
        noteVersion: 2,
        epoch: 1,
        pages: 3,
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
    expect(fixture.setters[fixture.state.message]).not.toHaveBeenCalledWith(
      "操作を受け付けました。",
    );
    expect(fixture.setters[fixture.state.message]).toHaveBeenCalledWith(
      accepted
        ? "受付済みの変換を確認しました。"
        : "受付結果はまだ確認できません。自動再送は行いません。",
    );
    expect(fixture.refs[1].current).toEqual(accepted ? null : command);
    if (accepted) {
      expect(fixture.setters[fixture.state.uncertain]).toHaveBeenCalledWith(
        false,
      );
      expect(fixture.setters[fixture.state.error]).toHaveBeenCalledWith("");
    } else {
      expect(fixture.setters[fixture.state.uncertain]).not.toHaveBeenCalled();
      expect(fixture.setters[fixture.state.error]).not.toHaveBeenCalled();
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
    expect(fixture.setters[fixture.state.uncertain]).not.toHaveBeenCalled();
    expect(fixture.setters[fixture.state.error]).not.toHaveBeenCalled();
    expect(fixture.setters[fixture.state.message]).not.toHaveBeenCalledWith(
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
    expect(fixture.setters[fixture.state.uncertain]).toHaveBeenCalledWith(
      false,
    );
    expect(fixture.setters[fixture.state.error]).not.toHaveBeenCalled();
    expect(fixture.setters[fixture.state.view]).toHaveBeenCalledWith({
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
    expect(fixture.setters[fixture.state.view]).toHaveBeenCalledWith(
      state("failed"),
    );
    expect(fixture.setters[fixture.state.model]).not.toHaveBeenCalled();
    expect(fixture.setters[fixture.state.instruction]).not.toHaveBeenCalled();
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
    expect(fixture.setters[fixture.state.view]).not.toHaveBeenCalled();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    current.resolve(state("failed"));
    await settle();
    expect(fixture.setters[fixture.state.view]).toHaveBeenCalledWith(
      state("failed"),
    );
    expect(fixture.setters[fixture.state.model]).toHaveBeenCalledOnce();
    expect(fixture.setters[fixture.state.model]).toHaveBeenCalledWith(
      "selected-model",
    );
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
    expect(fixture.setters[fixture.state.view]).not.toHaveBeenCalled();
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
    expect(fixture.setters[fixture.state.view]).not.toHaveBeenCalled();
  });
});

describe("audio model and current actor interaction", () => {
  const audioView = () => ({
    ...state("succeeded"),
    format: "audio",
    availability: "audio-gated",
    configured: true,
    linked: true,
    supported: true,
    epoch: 1,
    sttModelId: "selected-stt-model",
  });
  type InteractionProps = {
    children?: ReactNode;
    onClick?: () => void;
    onSubmit?: (event: { preventDefault(): void }) => void;
    type?: string;
    disabled?: boolean;
  };
  function find(
    node: ReactNode,
    type: string,
    label?: string,
  ): InteractionProps | undefined {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = find(child, type, label);
        if (found) return found;
      }
    }
    if (!isValidElement<InteractionProps>(node)) return;
    if (
      node.type === type &&
      (label === undefined || node.props.children === label)
    )
      return node.props;
    return find(node.props.children, type, label);
  }
  beforeEach(() => {
    fixture.read.mockReset();
    fixture.post.mockReset();
    fixture.models.mockReset();
    fixture.view = audioView();
    fixture.model = "selected-model";
    fixture.sttModel = "selected-stt-model";
    fixture.catalog = {
      source: "live",
      models: [{ id: "selected-model", name: "本文用" }],
    };
    fixture.read.mockResolvedValue(audioView());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("seeds the fixed STT and structure models independently without beginning either send", async () => {
    const dispose = mount();
    await settle();
    expect(fixture.setters[fixture.state.model]).toHaveBeenCalledWith(
      "selected-model",
    );
    expect(fixture.setters[fixture.state.sttModel]).toHaveBeenCalledWith(
      "selected-stt-model",
    );
    expect(fixture.setters[fixture.state.sttSeed]).toHaveBeenCalledWith(
      "selected-stt-model",
    );
    expect(fixture.models).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
    dispose();
  });

  it.each([
    "actor",
    "route",
  ] as const)("drops a late STT catalog after %s changes without updating either model", async (change) => {
    const pending = deferred();
    fixture.models.mockReturnValue(pending.promise);
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    const click = find(tree, "button", "音声用モデル一覧を更新")?.onClick;
    if (!click) throw new Error("AUDIO_MODEL_ACTION_REQUIRED");
    click();
    if (change === "actor") fixture.actor = "beta";
    else fixture.router.state.location.href = "/notes/two";
    pending.resolve({
      source: "live",
      models: [{ id: "late-stt", name: "別利用者の一覧" }],
    });
    await settle();
    expect(fixture.models).toHaveBeenCalledExactlyOnceWith({
      data: { kind: "stt-transcription" },
    });
    expect(fixture.setters[fixture.state.sttCatalog]).not.toHaveBeenCalled();
    expect(fixture.setters[fixture.state.catalog]).not.toHaveBeenCalled();
    expect(fixture.setters[fixture.state.sttModel]).not.toHaveBeenCalled();
    expect(fixture.setters[fixture.state.model]).not.toHaveBeenCalled();
    expect(fixture.read).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
  });

  it.each([
    false,
    true,
  ])("submits both audio models once and adopts acceptance only for the current actor (changed=%s)", async (changed) => {
    const pending = deferred();
    const confirm = vi.fn(() => true);
    vi.stubGlobal("window", { confirm });
    fixture.post.mockReturnValue(pending.promise);
    fixture.read.mockResolvedValue({
      ...audioView(),
      receipt: { id: "accepted-audio" },
    });
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    const submit = find(tree, "form")?.onSubmit;
    if (!submit) throw new Error("AUDIO_SUBMIT_ACTION_REQUIRED");
    const event = { preventDefault: vi.fn() };
    submit(event);
    submit(event);
    expect(fixture.post).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(fixture.post).toHaveBeenCalledWith({
      data: {
        noteId: "note",
        noteVersion: 2,
        commandId: expect.any(String),
        expectedEpoch: 1,
        modelId: "selected-model",
        sttModelId: "selected-stt-model",
        instruction: "",
        confirmed: true,
      },
    });
    const originalCommand = fixture.refs[1].current;
    for (const setter of fixture.setters) setter.mockClear();
    if (changed) fixture.actor = "beta";
    pending.resolve({ jobId: "accepted-audio" });
    await settle();
    if (changed) {
      expect(fixture.read).not.toHaveBeenCalled();
      expect(fixture.refs[1].current).toEqual(originalCommand);
      expect(fixture.setters[fixture.state.uncertain]).not.toHaveBeenCalled();
      expect(fixture.setters[fixture.state.sttSeed]).not.toHaveBeenCalled();
      expect(fixture.setters[fixture.state.view]).not.toHaveBeenCalled();
      expect(fixture.setters[fixture.state.message]).not.toHaveBeenCalled();
      expect(fixture.setters[fixture.state.error]).not.toHaveBeenCalled();
    } else {
      expect(fixture.read).toHaveBeenCalledExactlyOnceWith({
        data: { noteId: "note" },
      });
      expect(fixture.refs[1].current).toBeNull();
      expect(fixture.setters[fixture.state.uncertain]).toHaveBeenCalledWith(
        false,
      );
      expect(fixture.setters[fixture.state.sttSeed]).toHaveBeenCalledWith(
        "selected-stt-model",
      );
      expect(fixture.setters[fixture.state.view]).toHaveBeenCalledWith({
        ...audioView(),
        receipt: { id: "accepted-audio" },
      });
      expect(fixture.setters[fixture.state.message]).toHaveBeenCalledWith(
        "受付済みの変換を確認しました。",
      );
    }
    expect(fixture.post).toHaveBeenCalledTimes(1);
    expect(fixture.previewBegin).not.toHaveBeenCalled();
  });

  it("does not submit audio without a selected transcription model even when the structure model is available", () => {
    fixture.sttModel = "";
    const confirm = vi.fn(() => true);
    vi.stubGlobal("window", { confirm });
    const tree = LlmNoteAction({ noteId: "note", noteVersion: 2 });
    const submit = find(tree, "form")?.onSubmit;
    if (!submit) throw new Error("AUDIO_SUBMIT_ACTION_REQUIRED");
    submit({ preventDefault() {} });
    expect(confirm).not.toHaveBeenCalled();
    expect(fixture.post).not.toHaveBeenCalled();
    expect(fixture.read).not.toHaveBeenCalled();
  });
});
