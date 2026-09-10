import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BrowserWysEditor, decodeWysPlan } from "./browser";
import { pack, prepare, serialize } from "./model";

it("validates worker source ranges without changing raw or opaque contents", () => {
  const plan = prepare('<p data-k="x">A\r\nB</p><aside>保持</aside>');
  const value = pack(plan);
  const parsed = decodeWysPlan(value);
  expect(serialize(parsed, parsed.doc)).toBe(plan.source);
  expect(() =>
    decodeWysPlan({
      ...value,
      saved: [["s0", { tag: "p", attrs: {}, source: [0, 999999], depth: 0 }]],
    }),
  ).toThrow();
});
it("rejects over-deep worker models before provider decoding", () => {
  let doc: unknown = { type: "paragraph" };
  for (let i = 0; i < 130; i++) doc = { type: "blockquote", content: [doc] };
  expect(() => decodeWysPlan({ ...pack(prepare("<p>A</p>")), doc })).toThrow();
});

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: (() => void) | null = null;
  requests: { id: number; source: string }[] = [];
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(input: { id: number; source: string }) {
    this.requests.push(input);
  }
  reply(source: string) {
    this.onmessage?.({
      data: {
        id: this.requests.at(-1)?.id,
        ok: true,
        value: pack(prepare(source)),
      },
    } as MessageEvent<unknown>);
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("Worker", FakeWorker);
  FakeWorker.instances = [];
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("terminates at the actual deadline and retains input for a fresh retry", async () => {
  const analyzer = new BrowserWysEditor();
  const first = analyzer.prepare("<p>保持</p>").catch((error) => error);
  const worker = FakeWorker.instances[0];
  await vi.advanceTimersByTimeAsync(1999);
  expect(worker.terminate).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(await first).toBeInstanceOf(Error);
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(worker.onmessage).toBeNull();
  const retry = analyzer.prepare("<p>保持</p>");
  FakeWorker.instances[1].reply("<p>保持</p>");
  expect((await retry).source).toBe("<p>保持</p>");
  expect(vi.getTimerCount()).toBe(0);
});
it("replaces only preparation ownership, ignores late completion and releases every worker", async () => {
  const analyzer = new BrowserWysEditor();
  const first = analyzer.prepare("<p>旧</p>").catch((error) => error);
  const stale = FakeWorker.instances[0].onmessage;
  const second = analyzer.prepare("<p>最新</p>");
  expect(await first).toBeInstanceOf(Error);
  stale?.({
    data: { id: 1, ok: true, value: pack(prepare("<p>旧</p>")) },
  } as MessageEvent<unknown>);
  FakeWorker.instances[1].reply("<p>最新</p>");
  expect((await second).source).toBe("<p>最新</p>");
  expect(
    FakeWorker.instances.every(
      (worker) => worker.terminate.mock.calls.length === 1,
    ),
  ).toBe(true);
});
it("does not initialize on prior abort; cancellation removes listener and does not change supplied source", async () => {
  const analyzer = new BrowserWysEditor();
  const signal = new AbortController();
  signal.abort();
  await expect(analyzer.prepare("raw", signal.signal)).rejects.toThrow(
    "取り消し",
  );
  expect(FakeWorker.instances).toHaveLength(0);
  const controller = new AbortController();
  const pending = analyzer
    .prepare("raw", controller.signal)
    .catch((error) => error);
  controller.abort();
  expect(await pending).toBeInstanceOf(Error);
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
