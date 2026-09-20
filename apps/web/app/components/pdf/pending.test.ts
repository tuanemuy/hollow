import { afterEach, describe, expect, it, vi } from "vitest";

const actor = "00000000-0000-4000-8000-000000000001";
const note = "00000000-0000-4000-8000-000000000002";
const command = "00000000-0000-4000-8000-000000000003";
const other = "00000000-0000-4000-8000-000000000004";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("PDF pending request persistence", () => {
  it("does not claim a new command is saved when storage rejects it", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => {
        throw Error("disabled");
      },
    });
    const store = await import("./pending");
    expect(store.writePdfPending(actor, note, command, null)).toEqual({
      commandId: null,
      storageFailed: true,
    });
  });
  it("retains an existing unknown command and refuses to replace it", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () =>
        JSON.stringify([{ actorId: actor, noteId: note, commandId: command }]),
      setItem: () => {
        throw Error("disabled");
      },
    });
    const store = await import("./pending");
    expect(store.writePdfPending(actor, note, other, command).commandId).toBe(
      command,
    );
    expect(store.writePdfPending(actor, note, command, command)).toEqual({
      commandId: command,
      storageFailed: true,
    });
    expect(store.writePdfPending(actor, note, null, other).commandId).toBe(
      command,
    );
  });
  it("persists before admission and removes only the confirmed command", async () => {
    let value: string | null = null;
    vi.stubGlobal("sessionStorage", {
      getItem: () => value,
      setItem: (_key: string, next: string) => {
        value = next;
      },
    });
    const store = await import("./pending");
    expect(store.writePdfPending(actor, note, command, null)).toEqual({
      commandId: command,
      storageFailed: false,
    });
    expect(JSON.parse(value ?? "[]")).toEqual([
      { actorId: actor, noteId: note, commandId: command },
    ]);
    expect(store.writePdfPending(actor, note, null, other).commandId).toBe(
      command,
    );
    expect(
      store.writePdfPending(actor, note, null, command).commandId,
    ).toBeNull();
  });
});
