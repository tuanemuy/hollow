import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const scope: {
  onmessage?: (event: { data: unknown }) => void;
  postMessage: ReturnType<typeof vi.fn>;
} = { postMessage: vi.fn() };
beforeAll(async () => {
  vi.stubGlobal("self", scope);
  await import("./htmlEditor.worker");
});
beforeEach(() => scope.postMessage.mockClear());
afterAll(() => vi.unstubAllGlobals());

describe("HTML worker transport boundary", () => {
  it("reports oversized requests explicitly rather than pretending to time out", () => {
    scope.onmessage?.({
      data: {
        id: 1,
        operation: "diagnose",
        source: "a".repeat(800 * 1024 + 1),
      },
    });
    expect(scope.postMessage).toHaveBeenCalledWith({
      id: 1,
      ok: false,
      message: expect.stringContaining("800 KiB"),
    });
  });
  it("applies UTF-8 byte checks after shape validation and recovers for the next small request", () => {
    scope.onmessage?.({
      data: { id: 2, operation: "diagnose", source: "日".repeat(300000) },
    });
    expect(scope.postMessage).toHaveBeenLastCalledWith({
      id: 2,
      ok: false,
      message: expect.stringContaining("800 KB"),
    });
    scope.onmessage?.({
      data: { id: 3, operation: "diagnose", source: "<p>日本語</p>" },
    });
    expect(scope.postMessage).toHaveBeenLastCalledWith({
      id: 3,
      ok: true,
      value: [],
    });
  });
  it("does not reflect malformed envelopes or caller supplied error messages", () => {
    scope.onmessage?.({
      data: { id: "bad", operation: "diagnose", message: "private" },
    });
    expect(scope.postMessage).not.toHaveBeenCalled();
    scope.onmessage?.({
      data: { id: 4, operation: "other", message: "private" },
    });
    expect(scope.postMessage.mock.calls[0]?.[0]).toMatchObject({
      id: 4,
      ok: false,
    });
    expect(JSON.stringify(scope.postMessage.mock.calls)).not.toContain(
      "private",
    );
  });
});
