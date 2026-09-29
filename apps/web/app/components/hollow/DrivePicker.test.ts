import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDrivePickerController,
  type PickerLocator,
  type PickerNotice,
  type PickerSdk,
} from "./DrivePicker";

const now = Date.parse("2026-09-29T00:00:00.000Z");
const commandId = "00000000-0000-4000-8000-000000000021";
const operationId = "00000000-0000-4000-8000-000000000022";
const selectionCommand = "00000000-0000-4000-8000-000000000023";
const selectionId = "00000000-0000-4000-8000-000000000024";
const initial = { commandId, expectedEpoch: 1, expectedSettingsVersion: 2 };
function payload() {
  return {
    kind: "issued",
    receipt: { id: operationId, commandId },
    picker: {
      accessToken: "synthetic-access",
      ticket: "synthetic-ticket",
      appId: "123",
      apiKey: "synthetic-api-key",
      pickerExpiresAt: new Date(now + 300000).toISOString(),
      accessExpiresAt: new Date(now + 3600000).toISOString(),
    },
  };
}
function response(value: unknown) {
  return new Response(JSON.stringify({ ok: true, value }), { status: 200 });
}
function setup() {
  const notices: PickerNotice[] = [];
  const receipts: PickerLocator[] = [];
  const captured: Parameters<PickerSdk>[0][] = [];
  const views = [vi.fn(), vi.fn()];
  let current = true;
  let clock = now;
  const transport = vi.fn(
    async (_url: RequestInfo | URL, _options?: RequestInit) =>
      response(payload()),
  );
  const sdk = vi.fn<PickerSdk>(async (input) => {
    captured.push(input);
    return { dispose: views[captured.length - 1] ?? vi.fn() };
  });
  const controller = createDrivePickerController({
    current: () => current,
    now: () => clock,
    notice: (value) => notices.push(value),
    receipt: (value) => receipts.push(value),
    fetch: transport,
    sdk,
  });
  return {
    controller,
    transport,
    sdk,
    notices,
    receipts,
    views,
    captured,
    changeActor: () => {
      current = false;
    },
    clock: (value: number) => {
      clock = value;
    },
  };
}
async function settle() {
  for (let i = 0; i < 16; i++) await Promise.resolve();
}
function select(fixture: ReturnType<typeof setup>, index = 0) {
  const input = fixture.captured[index];
  if (!input) throw Error("DRIVE_TEST_SDK");
  return input.selected;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("crypto", { randomUUID: () => selectionCommand });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Drive Picker injected controller contract without DOM, Google SDK or network", () => {
  it("keeps issued secrets out of notices and receipts while separating both expirations", async () => {
    const x = setup();
    await x.controller.open(initial);
    expect(x.sdk.mock.calls.length).toBe(1);
    expect(x.captured[0]?.accessToken === payload().picker.accessToken).toBe(
      true,
    );
    expect(x.notices).toEqual([
      { kind: "opening" },
      {
        kind: "open",
        pickerExpiresAt: payload().picker.pickerExpiresAt,
        accessExpiresAt: payload().picker.accessExpiresAt,
      },
    ]);
    expect(x.receipts).toEqual([
      { kind: "control", id: operationId, commandId },
    ]);
    const publicValues = JSON.stringify([x.notices, x.receipts]);
    expect(
      publicValues.includes(payload().picker.accessToken) ||
        publicValues.includes(payload().picker.ticket),
    ).toBe(false);
    expect(Object.keys(x.controller).sort()).toEqual(["dispose", "open"]);
    x.controller.dispose();
  });
  it("submits a selected reference exactly once using same-origin no-store POST", async () => {
    const x = setup();
    await x.controller.open(initial);
    x.transport.mockResolvedValueOnce(
      response({ row: { id: selectionId, commandId: selectionCommand } }),
    );
    select(x)({ id: "synthetic-folder", resourceKey: null });
    select(x)({ id: "second-folder", resourceKey: null });
    await settle();
    expect(x.transport.mock.calls.length).toBe(2);
    const [url, options] = x.transport.mock.calls[1] ?? [];
    expect(url).toBe("/api/integrations/drive/selection");
    expect(options?.method).toBe("POST");
    expect(options?.credentials).toBe("same-origin");
    expect(options?.cache).toBe("no-store");
    expect(options?.redirect).toBe("error");
    const body = typeof options?.body === "string" ? options.body : "";
    expect(new TextEncoder().encode(body).byteLength <= 16384).toBe(true);
    const parsed: unknown = JSON.parse(body);
    expect(
      typeof parsed === "object" &&
        parsed !== null &&
        "ticket" in parsed &&
        parsed.ticket === payload().picker.ticket,
    ).toBe(true);
    expect(x.receipts.at(-1)).toEqual({
      kind: "control",
      id: selectionId,
      commandId: selectionCommand,
    });
    expect(x.notices.at(-1)).toEqual({ kind: "closed" });
    x.controller.dispose();
  });
  it("forgets selection capability on dispose and rejects later SDK callbacks", async () => {
    const x = setup();
    await x.controller.open(initial);
    x.controller.dispose();
    select(x)({ id: "synthetic-folder", resourceKey: null });
    await settle();
    expect(x.views[0]).toHaveBeenCalledOnce();
    expect(x.transport.mock.calls.length).toBe(1);
    expect(x.receipts).toHaveLength(1);
  });
  it("closes at the earlier access expiry without claiming provider revocation", async () => {
    const x = setup();
    const issued = payload();
    issued.picker.accessExpiresAt = new Date(now + 500).toISOString();
    x.transport.mockResolvedValueOnce(response(issued));
    await x.controller.open(initial);
    x.clock(now + 500);
    await vi.advanceTimersByTimeAsync(500);
    select(x)({ id: "synthetic-folder", resourceKey: null });
    expect(x.notices.at(-1)).toEqual({ kind: "closed" });
    expect(x.views[0]).toHaveBeenCalledOnce();
    expect(x.transport.mock.calls.length).toBe(1);
  });
  it("treats an existing command receipt as read recovery without token or SDK reissue", async () => {
    const x = setup();
    x.transport.mockResolvedValueOnce(
      response({ kind: "receipt", receipt: { id: operationId, commandId } }),
    );
    await x.controller.open(initial);
    expect(x.sdk.mock.calls.length).toBe(0);
    expect(x.transport.mock.calls.length).toBe(1);
    expect(x.notices.at(-1)).toEqual({ kind: "unknown" });
    expect(x.receipts).toEqual([
      { kind: "control", id: operationId, commandId },
    ]);
    x.controller.dispose();
  });
  it("rejects an oversized UTF8 selection before any selection POST", async () => {
    const x = setup();
    await x.controller.open(initial);
    select(x)({ id: "あ".repeat(342), resourceKey: null });
    await settle();
    expect(x.transport.mock.calls.length).toBe(1);
    expect(x.notices.at(-1)).toEqual({ kind: "failed" });
    expect(x.views[0]).toHaveBeenCalledOnce();
  });
  it("drops a late launch response after the actor changes", async () => {
    const x = setup();
    let resolve!: (value: Response) => void;
    x.transport.mockReturnValueOnce(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    const opening = x.controller.open(initial);
    x.changeActor();
    resolve(response(payload()));
    await opening;
    expect(x.sdk.mock.calls.length).toBe(0);
    expect(x.receipts).toHaveLength(0);
    expect(x.notices).toEqual([{ kind: "opening" }]);
    x.controller.dispose();
  });
  it("keeps a new view alive when a disposed generation's selection settles late", async () => {
    const x = setup();
    await x.controller.open(initial);
    let resolve!: (value: Response) => void;
    x.transport.mockReturnValueOnce(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    select(x)({ id: "synthetic-folder", resourceKey: null });
    x.controller.dispose();
    const next = payload();
    next.receipt.commandId = selectionCommand;
    x.transport.mockResolvedValueOnce(response(next));
    await x.controller.open({ ...initial, commandId: selectionCommand });
    const count = x.notices.length;
    resolve(
      response({ row: { id: selectionId, commandId: selectionCommand } }),
    );
    await settle();
    expect(x.views[0]).toHaveBeenCalledOnce();
    expect(x.views[1]).not.toHaveBeenCalled();
    expect(x.notices).toHaveLength(count);
    x.controller.dispose();
    expect(x.views[1]).toHaveBeenCalledOnce();
  });
  it("turns SDK failure into a finite notice and does not automatically repeat the launch", async () => {
    const x = setup();
    x.sdk.mockRejectedValueOnce(Error("synthetic"));
    await x.controller.open(initial);
    await settle();
    expect(x.notices).toEqual([{ kind: "opening" }, { kind: "unknown" }]);
    expect(x.transport.mock.calls.length).toBe(1);
    expect(x.sdk.mock.calls.length).toBe(1);
    x.controller.dispose();
  });
});
