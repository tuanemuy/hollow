import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDriveHttp } from "./driveHttp.node";

const calls = vi.hoisted(() => ({
  picker: vi.fn(),
  select: vi.fn(),
  exchange: vi.fn(),
  cancel: vi.fn(),
  actor: vi.fn(),
}));
vi.mock("@repo/core/application/integration/drive/picker", () => ({
  launchDrivePicker: calls.picker,
}));
vi.mock("@repo/core/application/integration/drive/folders", () => ({
  beginDriveFolderSelection: calls.select,
}));
vi.mock("@repo/core/application/integration/drive/connection", () => ({
  exchangeDriveAuthorization: calls.exchange,
}));
vi.mock("@repo/core/application/integration/drive/current", () => ({
  readDriveActor: calls.actor,
}));
vi.mock("./authenticationHttp.node", () => ({
  authenticationCookie: (request: Request, name: string) =>
    request.headers
      .get("cookie")
      ?.split("; ")
      .find((v) => v.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null,
}));
vi.mock("@repo/core/application/integration/drive/control", () => ({
  cancelDriveOperation: calls.cancel,
  sameDriveActor: (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b),
}));
const id = "00000000-0000-4000-8000-000000000001";
const initial = { commandId: id, expectedEpoch: 1, expectedSettingsVersion: 2 };
const actor = {
  accountId: id,
  sessionHash: "synthetic-session",
  authVersion: 1,
  browserHash: "synthetic-browser",
  browserEpoch: 1,
};
let c: HollowContainer;
const response = (
  body: string,
  path = "picker",
  origin = "https://app.invalid",
) =>
  new Request(`https://app.invalid/api/integrations/drive/${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: "hollow_auth_browser=synthetic; hollow_session=synthetic",
    },
    body,
  });
const secure = (r: Response | null) =>
  r?.headers.get("cache-control") === "no-store, private" &&
  r.headers.get("pragma") === "no-cache" &&
  r.headers.get("referrer-policy") === "no-referrer" &&
  r.headers.get("x-content-type-options") === "nosniff" &&
  !r.headers.has("access-control-allow-origin");
beforeEach(() => {
  vi.clearAllMocks();
  calls.picker.mockResolvedValue({
    kind: "receipt",
    receipt: { id, commandId: id },
  });
  calls.select.mockResolvedValue({
    accepted: true,
    row: { id, commandId: id },
  });
  calls.actor.mockResolvedValue(actor);
  c = {
    appUrl: "https://app.invalid",
    tokens: { hash: () => "synthetic-state" },
    drive: { runtimeGeneration: "synthetic-runtime" },
    unitOfWorkProvider: {
      run: async (work: (u: unknown) => unknown) =>
        work({
          driveAttempts: {
            findByState: async () => ({ id, version: 1, context: actor }),
          },
        }),
    },
  } as unknown as HollowContainer;
});
describe("unregistered Drive HTTP boundary with in-memory Request only", () => {
  it("uses POST current context and private no-store response without CORS", async () => {
    const handler = createDriveHttp(
      c,
      "https://app.invalid/auth/drive/callback",
    );
    const result = await handler(response(JSON.stringify(initial)));
    expect(
      result?.status === 200 &&
        secure(result) &&
        calls.picker.mock.calls.length === 1 &&
        calls.picker.mock.calls[0]?.[1]?.browserToken === "synthetic",
    ).toBe(true);
    expect(
      (await handler(new Request("https://app.invalid/unrelated"))) === null,
    ).toBe(true);
  });
  it("method origin strict shape and four KiB launch cap reject before application", async () => {
    const handler = createDriveHttp(
      c,
      "https://app.invalid/auth/drive/callback",
    );
    const method = await handler(
      new Request("https://app.invalid/api/integrations/drive/picker"),
    );
    const origin = await handler(
      response(JSON.stringify(initial), "picker", "https://other.invalid"),
    );
    const shape = await handler(
      response(JSON.stringify({ ...initial, token: "synthetic" })),
    );
    const large = await handler(response(" ".repeat(4097)));
    expect(
      method?.status === 405 &&
        origin?.status === 403 &&
        shape?.status === 400 &&
        large?.status === 400 &&
        calls.picker.mock.calls.length === 0,
    ).toBe(true);
  });
  it("select has a separate bounded payload and application errors expose no cause", async () => {
    const handler = createDriveHttp(
      c,
      "https://app.invalid/auth/drive/callback",
    );
    const input = {
      ...initial,
      pickerId: id,
      ticket: "synthetic-ticket",
      fileId: "folder",
      resourceKey: null,
    };
    const good = await handler(response(JSON.stringify(input), "selection"));
    calls.select.mockRejectedValueOnce(Error("synthetic-sensitive-cause"));
    const bad = await handler(response(JSON.stringify(input), "selection"));
    const large = await handler(response(" ".repeat(16385), "selection"));
    expect(
      good?.status === 200 &&
        bad?.status === 400 &&
        large?.status === 400 &&
        secure(bad) &&
        !(await bad?.text())?.includes("synthetic-sensitive-cause") &&
        calls.select.mock.calls.length === 2,
    ).toBe(true);
  });
  it("escaped token output beyond 64KiB is finite rejection not a partial response", async () => {
    calls.picker.mockResolvedValueOnce({
      kind: "issued",
      picker: { accessToken: "x".repeat(65536) },
    });
    const result = await createDriveHttp(
      c,
      "https://app.invalid/auth/drive/callback",
    )(response(JSON.stringify(initial)));
    expect(
      result?.status === 400 &&
        secure(result) &&
        (await result.text()).length < 100 &&
        calls.picker.mock.calls.length === 1,
    ).toBe(true);
  });
  it("callback matches same actor and redirects only a finite receipt ID", async () => {
    const handler = createDriveHttp(
      c,
      "https://app.invalid/auth/drive/callback",
    );
    const result = await handler(
      new Request(
        "https://app.invalid/auth/drive/callback?state=synthetic-state&code=synthetic-code",
        {
          headers: {
            Cookie: "hollow_auth_browser=synthetic; hollow_session=synthetic",
          },
        },
      ),
    );
    expect(
      result?.status === 303 &&
        result.headers.get("location") === `/auth/drive-result?id=${id}` &&
        secure(result) &&
        calls.exchange.mock.calls.length === 1 &&
        calls.exchange.mock.calls[0]?.[3] === "synthetic-runtime" &&
        !(await result.text()).includes("synthetic-code"),
    ).toBe(true);
  });
  it("callback duplicate state or different actor never exchanges and provider denial cancels explicitly", async () => {
    const handler = createDriveHttp(
      c,
      "https://app.invalid/auth/drive/callback",
    );
    const request = (query: string) =>
      new Request(`https://app.invalid/auth/drive/callback?${query}`, {
        headers: {
          Cookie: "hollow_auth_browser=synthetic; hollow_session=synthetic",
        },
      });
    await handler(request("state=a&state=b&code=c"));
    calls.actor.mockResolvedValueOnce({ ...actor, browserEpoch: 2 });
    const hidden = await handler(request("state=a&code=c"));
    const denial = await handler(request("state=a&error=access_denied"));
    expect(
      hidden?.headers.get("location") === "/auth/drive-result" &&
        denial?.headers.get("location") === `/auth/drive-result?id=${id}` &&
        calls.exchange.mock.calls.length === 0 &&
        calls.cancel.mock.calls.length === 1,
    ).toBe(true);
  });
});
