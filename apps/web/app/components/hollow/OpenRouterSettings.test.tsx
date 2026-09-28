import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenRouterSettings } from "./OpenRouterSettings";

const fixture = vi.hoisted(() => ({
  states: [] as unknown[],
  setters: Array.from({ length: 5 }, () => vi.fn()),
  cursor: 0,
  pending: false,
  saving: false,
  valid: true,
  save: vi.fn(),
  start: vi.fn((work: () => void) => work()),
  action: undefined as undefined | ((previous: string) => Promise<string>),
  write: vi.fn(),
  read: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: () => {
    const index = fixture.cursor++;
    return [fixture.states[index], fixture.setters[index]];
  },
  useEffect: () => {},
  useCallback: (callback: unknown) => callback,
  useTransition: () => [fixture.pending, fixture.start],
  useActionState: (action: (previous: string) => Promise<string>) => {
    fixture.action = action;
    return ["", fixture.save, fixture.saving];
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: "a",
  useBlocker: vi.fn(),
  useRouter: () => ({ invalidate: fixture.invalidate }),
}));
vi.mock("./Shell", () => ({ Shell: "main" }));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => () => fixture.valid,
}));
vi.mock("@/presentation/hollowAuth", () => ({
  bootstrapAuthenticationFn: vi.fn(),
}));
vi.mock("@/presentation/errorDisplay", () => ({
  displayError: () => "保存結果を確認できません",
}));
vi.mock("@/presentation/openRouterServerFn", () => ({
  beginOpenRouterFn: vi.fn(),
  checkOpenRouterFn: vi.fn(),
  openRouterModelsFn: vi.fn(),
  openRouterSettingsFn: fixture.read,
  saveOpenRouterModelsFn: fixture.write,
  unlinkOpenRouterFn: vi.fn(),
}));

type Props = {
  children?: ReactNode;
  action?: unknown;
  onSubmit?: (event: { preventDefault(): void }) => void;
  value?: string;
  disabled?: boolean;
};
function elements(node: ReactNode, type: string): Props[] {
  if (Array.isArray(node))
    return node.flatMap((child) => elements(child, type));
  if (!isValidElement<Props>(node)) return [];
  return [
    ...(node.type === type ? [node.props] : []),
    ...elements(node.props.children, type),
  ];
}
const defaults = {
  text: "default-text",
  image: "default-image",
  audio: "default-audio",
};
const settings = {
  configured: true,
  state: "linked",
  epoch: 1,
  version: 1,
  models: {
    version: 4,
    text: { kind: "chat-text", modelId: defaults.text },
    image: { kind: "chat-image", modelId: defaults.image },
    audio: { kind: "stt-transcription", modelId: defaults.audio },
  },
};
function page() {
  fixture.cursor = 0;
  return OpenRouterSettings({
    email: "local@example.test",
    returnTo: { kind: "settings" },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.pending = fixture.saving = false;
  fixture.valid = true;
  fixture.states = [
    settings,
    { models: [], defaults: settings.models },
    "",
    "old success",
    { ...defaults },
  ];
  fixture.write.mockResolvedValue(undefined);
  fixture.read.mockResolvedValue(settings);
});

describe("OpenRouter controlled model form", () => {
  it.each([
    "loading",
    "linked",
    "unconfigured",
  ])("discloses image input uncertainty separately from quality while %s", (state) => {
    fixture.states[0] =
      state === "loading"
        ? null
        : { ...settings, configured: state !== "unconfigured" };
    const paragraphs = elements(page(), "p").map((node) =>
      typeof node.children === "string" ? node.children : "",
    );
    expect(
      paragraphs.some(
        (text) =>
          text.includes("画像のトークン数は事前計算していません") &&
          text.includes("サイズ・寸法の制限内でも") &&
          text.includes("モデルの入力上限を超える場合があります"),
      ),
    ).toBe(true);
    expect(
      paragraphs.some((text) =>
        text.includes("認識品質を保証するものではありません"),
      ),
    ).toBe(true);
    expect(fixture.write).not.toHaveBeenCalled();
  });
  it.each([
    "text",
    "image",
    "audio",
  ] as const)("submits %s through a transition without a host form action/reset", (field) => {
    fixture.states[4] = { ...defaults, [field]: "custom" };
    const tree = page();
    const form = elements(tree, "form")[0];
    const event = { preventDefault: vi.fn() };
    expect(form.action).toBeUndefined();
    form.onSubmit?.(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(fixture.start).toHaveBeenCalledOnce();
    expect(fixture.save).toHaveBeenCalledOnce();
    expect(elements(tree, "select").map((select) => select.value)).toEqual(
      ["text", "image", "audio"].map((key) =>
        key === field ? "custom" : defaults[key as keyof typeof defaults],
      ),
    );
  });
  it.each([
    "clean",
    "pending",
    "saving",
  ])("does not dispatch a %s form", (state) => {
    if (state !== "clean") fixture.states[4] = { ...defaults, text: "custom" };
    fixture.pending = state === "pending";
    fixture.saving = state === "saving";
    const event = { preventDefault: vi.fn() };
    elements(page(), "form")[0].onSubmit?.(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(fixture.save).not.toHaveBeenCalled();
  });
  it("keeps the submitted draft and clears old success when the acknowledgement fails", async () => {
    fixture.states[4] = { ...defaults, text: "custom" };
    fixture.write.mockRejectedValueOnce(new Error("synthetic failure"));
    page();
    expect(await fixture.action?.("")).toBe("保存結果を確認できません");
    expect(fixture.setters[2]).toHaveBeenCalledWith("");
    expect(fixture.setters[3]).toHaveBeenCalledWith("");
    expect(fixture.setters[4]).not.toHaveBeenCalled();
    expect(fixture.read).not.toHaveBeenCalled();
    expect(fixture.write).toHaveBeenCalledOnce();
  });
  it("does not apply a late successful response after the operation ticket expires", async () => {
    fixture.states[4] = { ...defaults, text: "custom" };
    fixture.write.mockImplementationOnce(async () => {
      fixture.valid = false;
    });
    page();
    await fixture.action?.("");
    expect(fixture.read).not.toHaveBeenCalled();
    expect(fixture.setters[0]).not.toHaveBeenCalled();
    expect(fixture.setters[4]).not.toHaveBeenCalled();
    expect(fixture.invalidate).not.toHaveBeenCalled();
  });
});
