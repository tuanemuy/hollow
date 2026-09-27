import { beforeEach, describe, expect, it, vi } from "vitest";
import { LlmUsage } from "./LlmUsage";

const fixture = vi.hoisted(() => ({
  effect: undefined as undefined | (() => () => void),
  resolved: undefined as undefined | (() => void),
  unsubscribe: vi.fn(),
  setUsage: vi.fn(),
  setError: vi.fn(),
  read: vi.fn(),
  cursor: 0,
  revision: 0,
  actor: "alpha",
  router: { state: { location: { href: "/notes/one" } } },
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: () => [
    null,
    fixture.cursor++ === 0 ? fixture.setUsage : fixture.setError,
  ],
  useEffect: (effect: () => () => void) => {
    fixture.effect = effect;
  },
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    ...fixture.router,
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
      revision === fixture.revision &&
      actor === fixture.actor &&
      href === fixture.router.state.location.href;
  },
}));
vi.mock("@/presentation/llmServerFn", () => ({ llmUsageFn: fixture.read }));
vi.mock("@/presentation/errorDisplay", () => ({
  displayError: () => "safe failure",
}));
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function settle() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}
function mount() {
  LlmUsage({ refreshKey: "terminal" });
  return fixture.effect?.() ?? (() => {});
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.cursor = fixture.revision = 0;
  fixture.actor = "alpha";
  fixture.router.state.location.href = "/notes/one";
});
describe("LLM usage current read", () => {
  it("rereads after same-route invalidation instead of retaining a discarded reservation snapshot", async () => {
    const old = deferred();
    const latest = deferred();
    fixture.read
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const dispose = mount();
    fixture.revision++;
    fixture.resolved?.();
    old.resolve({ consumed: 1, reserved: 1 });
    await settle();
    expect(fixture.setUsage).not.toHaveBeenCalled();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    latest.resolve({ consumed: 2, reserved: 0 });
    await settle();
    expect(fixture.setUsage).toHaveBeenCalledWith({ consumed: 2, reserved: 0 });
    dispose();
  });
  it("coalesces resolved events into one pending read", async () => {
    const old = deferred();
    const latest = deferred();
    fixture.read
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const dispose = mount();
    for (let i = 0; i < 10; i++) fixture.resolved?.();
    expect(fixture.read).toHaveBeenCalledTimes(1);
    old.resolve({});
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    latest.resolve({});
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    dispose();
  });
  it.each([
    "actor",
    "route",
    "unmount",
  ])("rejects late results after %s change", async (change) => {
    const value = deferred();
    fixture.read.mockReturnValue(value.promise);
    const dispose = mount();
    if (change === "actor") fixture.actor = "beta";
    if (change === "route") fixture.router.state.location.href = "/notes/two";
    if (change === "unmount") dispose();
    value.resolve({ consumed: 2 });
    await settle();
    expect(fixture.setUsage).not.toHaveBeenCalled();
    if (change !== "unmount") dispose();
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("does not restart queued reads after unmount", async () => {
    const value = deferred();
    fixture.read.mockReturnValue(value.promise);
    const dispose = mount();
    fixture.resolved?.();
    dispose();
    value.reject(new Error("synthetic"));
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(1);
    expect(fixture.setError).not.toHaveBeenCalled();
  });
});
