import type { HandleAvailability } from "@repo/core/application/publication/views";
import { publicHandle } from "@repo/core/domain/account/profile";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHandleAvailability } from "./useHandleAvailability";

const fixture = vi.hoisted(() => ({
  cursor: 0,
  actor: { id: "actor-a", epoch: 1 },
  refs: [] as { current: unknown }[],
  states: [] as unknown[],
  effects: [] as {
    dependencies: readonly unknown[];
    create: () => void | (() => void);
    cleanup: (() => void) | undefined;
    pending: boolean;
  }[],
  writes: vi.fn(),
  check: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useRef: (initial: unknown) => {
    const index = fixture.cursor++;
    fixture.refs[index] ??= { current: initial };
    return fixture.refs[index];
  },
  useState: (initial: unknown) => {
    const index = fixture.cursor++;
    if (!(index in fixture.states)) fixture.states[index] = initial;
    return [
      fixture.states[index],
      (value: unknown) => {
        fixture.states[index] =
          typeof value === "function" ? value(fixture.states[index]) : value;
        fixture.writes(index, fixture.states[index]);
      },
    ];
  },
  useEffect: (
    create: () => void | (() => void),
    dependencies: readonly unknown[],
  ) => {
    const index = fixture.cursor++;
    const previous = fixture.effects[index];
    if (
      previous &&
      previous.dependencies.length === dependencies.length &&
      previous.dependencies.every((value, i) =>
        Object.is(value, dependencies[i]),
      )
    )
      return;
    fixture.effects[index] = {
      dependencies,
      create,
      cleanup: previous?.cleanup,
      pending: true,
    };
  },
}));

function render(input: string, enabled = true, actorEpoch = 1) {
  fixture.cursor = 0;
  let handle: string | null;
  try {
    handle = publicHandle(input);
  } catch {
    handle = null;
  }
  // biome-ignore lint/correctness/useHookAtTopLevel: This deterministic harness supplies React state and effects without a DOM mount.
  const result = useHandleAvailability({
    actorId: "actor-a",
    actorEpoch,
    currentActor: () => fixture.actor,
    input,
    handle,
    enabled,
    checkHandle: fixture.check,
  });
  for (const effect of fixture.effects) {
    if (!effect?.pending) continue;
    effect.cleanup?.();
    effect.cleanup = effect.create() ?? undefined;
    effect.pending = false;
  }
  return result;
}
function dispose() {
  for (const effect of fixture.effects) effect?.cleanup?.();
}
function deferred() {
  let resolve!: (value: HandleAvailability) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<HandleAvailability>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const available = (handle: string): HandleAvailability => ({
  actorId: "actor-a",
  handle,
  available: true,
  candidates: [],
});
async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  fixture.cursor = 0;
  fixture.actor = { id: "actor-a", epoch: 1 };
  fixture.refs = [];
  fixture.states = [];
  fixture.effects = [];
  fixture.check.mockReset();
});
afterEach(() => {
  dispose();
  vi.useRealTimers();
});

describe("profile handle availability reads", () => {
  it("debounces current input and sends only the normalized handle", async () => {
    fixture.check.mockImplementation(async (handle: string) =>
      available(handle),
    );
    render("first-handle");
    await vi.advanceTimersByTimeAsync(299);
    expect(fixture.check).not.toHaveBeenCalled();
    render(" AUTHOR-A ");
    await vi.advanceTimersByTimeAsync(299);
    expect(fixture.check).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fixture.check).toHaveBeenCalledExactlyOnceWith("author-a");
    expect(render(" AUTHOR-A ").availability).toEqual(available("author-a"));
  });
  it.each([
    "",
    "  ",
    "api",
    "settings",
    "ab",
    "日本語",
    "author-",
    "a".repeat(64),
  ])("does not request an empty, reserved or invalid input %s", async (input) => {
    render(input);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fixture.check).not.toHaveBeenCalled();
    expect(render(input).availability).toBeNull();
  });
  it("keeps checking local and adopts all three duplicate alternatives", async () => {
    const read = deferred();
    fixture.check.mockReturnValue(read.promise);
    render("taken-name");
    await vi.advanceTimersByTimeAsync(300);
    expect(render("taken-name").checking).toBe(true);
    const duplicate: HandleAvailability = {
      ...available("taken-name"),
      available: false,
      candidates: ["taken-name-2", "taken-name-3", "taken-name-4"],
    };
    read.resolve(duplicate);
    await settle();
    expect(render("taken-name").availability).toEqual(duplicate);
    expect(render("taken-name").checking).toBe(false);
    render("taken-name-2");
    expect(render("taken-name-2").availability).toBeNull();
  });
  it("discards both late success and failure after input A to B to A", async () => {
    const oldA = deferred();
    const oldB = deferred();
    const latest = deferred();
    fixture.check
      .mockReturnValueOnce(oldA.promise)
      .mockReturnValueOnce(oldB.promise)
      .mockReturnValueOnce(latest.promise);
    render("author-a");
    await vi.advanceTimersByTimeAsync(300);
    render("author-b");
    await vi.advanceTimersByTimeAsync(300);
    render("author-a");
    await vi.advanceTimersByTimeAsync(300);
    const current = {
      ...available("author-a"),
      available: false,
      candidates: ["author-a-2"],
    };
    latest.resolve(current);
    await settle();
    expect(render("author-a").availability).toEqual(current);
    const writes = fixture.writes.mock.calls.length;
    oldA.resolve(available("author-a"));
    oldB.reject(new Error("synthetic stale failure"));
    await settle();
    expect(fixture.writes).toHaveBeenCalledTimes(writes);
    expect(render("author-a").availability).toEqual(current);
    expect(render("author-a").error).toBeNull();
  });
  it("invalidates an in-flight read before the next input render commits", async () => {
    const read = deferred();
    fixture.check.mockReturnValue(read.promise);
    const control = render("author-a");
    await vi.advanceTimersByTimeAsync(300);
    control.invalidate();
    const writes = fixture.writes.mock.calls.length;
    read.resolve(available("author-a"));
    await settle();
    expect(fixture.writes).toHaveBeenCalledTimes(writes);
    expect(render("author-b").availability).toBeNull();
  });
  it.each([
    "actor",
    "epoch",
    "unmount",
  ])("discards a late response after %s change", async (change) => {
    const read = deferred();
    fixture.check.mockReturnValue(read.promise);
    render("author-a");
    await vi.advanceTimersByTimeAsync(300);
    if (change === "actor") fixture.actor = { id: "actor-b", epoch: 2 };
    if (change === "epoch") fixture.actor = { id: "actor-a", epoch: 3 };
    if (change === "unmount") dispose();
    const writes = fixture.writes.mock.calls.length;
    read.resolve(available("author-a"));
    await settle();
    expect(fixture.writes).toHaveBeenCalledTimes(writes);
  });
  it("starts a new read for the current epoch without adopting the old epoch result", async () => {
    const old = deferred();
    const latest = deferred();
    fixture.check
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    render("author-a");
    await vi.advanceTimersByTimeAsync(300);
    fixture.actor = { id: "actor-a", epoch: 3 };
    expect(render("author-a", true, 3).availability).toBeNull();
    await vi.advanceTimersByTimeAsync(300);
    const writes = fixture.writes.mock.calls.length;
    old.resolve(available("author-a"));
    await settle();
    expect(fixture.writes).toHaveBeenCalledTimes(writes);
    const current = {
      ...available("author-a"),
      available: false,
      candidates: ["author-a-2"],
    };
    latest.resolve(current);
    await settle();
    expect(render("author-a", true, 3).availability).toEqual(current);
  });
  it("clears the debounce timer on unmount or disabled form context", async () => {
    render("author-a");
    await vi.advanceTimersByTimeAsync(299);
    render("author-a", false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fixture.check).not.toHaveBeenCalled();
    render("author-b");
    dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fixture.check).not.toHaveBeenCalled();
  });
  it.each([
    "actor",
    "handle",
  ])("rejects a mismatched response %s without showing its alternatives", async (field) => {
    fixture.check.mockResolvedValue({
      ...available("author-a"),
      [field === "actor" ? "actorId" : "handle"]: "foreign-private",
      candidates: ["foreign-private"],
    });
    render("author-a");
    await vi.advanceTimersByTimeAsync(300);
    const result = render("author-a");
    expect(result.availability).toBeNull();
    expect(result.error).toContain("応答が一致しません");
    expect(result.error).not.toContain("foreign-private");
  });
  it("retries a failed check only on the explicit request and keeps input unchanged", async () => {
    fixture.check
      .mockRejectedValueOnce(new Error("synthetic native failure"))
      .mockResolvedValueOnce(available("author-a"));
    render("author-a");
    await vi.advanceTimersByTimeAsync(300);
    const failed = render("author-a");
    expect(failed.error).toBe("応答を確認できませんでした。");
    await vi.advanceTimersByTimeAsync(1000);
    expect(fixture.check).toHaveBeenCalledOnce();
    failed.recheck();
    render("author-a");
    await vi.advanceTimersByTimeAsync(300);
    expect(fixture.check.mock.calls).toEqual([["author-a"], ["author-a"]]);
    expect(render("author-a").availability).toEqual(available("author-a"));
  });
});
