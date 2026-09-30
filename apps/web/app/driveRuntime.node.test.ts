import { writeFile } from "node:fs/promises";
import { request, type Server } from "node:http";
import type { Socket } from "node:net";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createNodeShutdown } from "../scripts/nodeShutdown";
import { createDriveRuntime, type DriveRuntime } from "./driveRuntime.node";

const calls = vi.hoisted(() => ({
  picker: vi.fn(),
  select: vi.fn(),
  exchange: vi.fn(),
  cancel: vi.fn(),
  actor: vi.fn(),
  maintain: vi.fn(),
  queue: vi.fn(),
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
vi.mock("@repo/core/application/integration/drive/current", async (load) => ({
  ...(await load<
    typeof import("@repo/core/application/integration/drive/current")
  >()),
  readDriveActor: calls.actor,
}));
vi.mock("@repo/core/application/integration/drive/control", async (load) => ({
  ...(await load<
    typeof import("@repo/core/application/integration/drive/control")
  >()),
  cancelDriveOperation: calls.cancel,
}));
vi.mock("@repo/core/application/integration/drive/runner", () => ({
  maintainDrive: calls.maintain,
  reconcileDriveClosures: async () => 0,
  runDriveQueue: calls.queue,
}));
const id = "00000000-0000-4000-8000-000000000001";
const actor = {
  accountId: id,
  sessionHash: "synthetic-session",
  authVersion: 1,
  browserHash: "synthetic-browser",
  browserEpoch: 1,
};
const initial = { commandId: id, expectedEpoch: 1, expectedSettingsVersion: 2 };
const cookie = `hollow_auth_browser=${"b".repeat(43)}; hollow_session=${"s".repeat(43)}`;
let c: HollowContainer;
let runtime: DriveRuntime | undefined;
let server: Server | undefined;
let listenerClosed = true;
let requests = 0;
let wire = 0;
let serverSockets = 0;
let clientSockets = 0;
let responseClosed = 0;
let observation: Record<string, boolean | number> = {};
const serverEnds: Promise<void>[] = [];
const clientEnds: Promise<void>[] = [];
const pending: Promise<unknown>[] = [];
const releases: (() => void)[] = [];
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  releases.push(resolve);
  return { promise, resolve };
}
async function listening(work: (request: Request) => Promise<Response>) {
  let listeningResolve!: () => void;
  const ready = new Promise<void>((resolve) => {
    listeningResolve = resolve;
  });
  server = serve({ hostname: "127.0.0.1", port: 0, fetch: work }, () =>
    listeningResolve(),
  ) as Server;
  listenerClosed = false;
  server.on("connection", (socket: Socket) => {
    serverSockets++;
    serverEnds.push(
      new Promise<void>((resolve) =>
        socket.once("close", () => {
          serverSockets--;
          resolve();
        }),
      ),
    );
  });
  server.on("request", (_request, response) => {
    response.once("close", () => {
      responseClosed++;
    });
  });
  await ready;
  const address = server.address();
  if (!address || typeof address === "string") throw Error("DRIVE_LISTENER");
  c = { ...c, appUrl: `http://127.0.0.1:${address.port}` };
  return c.appUrl;
}
async function closeListener() {
  if (!server || listenerClosed) return;
  await new Promise<void>((resolve, reject) =>
    server!.close((error) => (error ? reject(error) : resolve())),
  );
  await Promise.all(serverEnds);
  listenerClosed = true;
}
function send(url: string, body?: string, slow = false) {
  requests++;
  if (requests > 10) throw Error("DRIVE_REQUEST_BUDGET");
  let responseEnd = false;
  let responseClose = false;
  let requestClose = false;
  let bytes = 0;
  let resolve!: (value: {
    status: number;
    secure: boolean;
    location: string | null;
    body: unknown;
  }) => void;
  let reject!: (reason: unknown) => void;
  const result = new Promise<{
    status: number;
    secure: boolean;
    location: string | null;
    body: unknown;
  }>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const req = request(
    url,
    {
      method: body === undefined ? "GET" : "POST",
      agent: false,
      headers: {
        Cookie: cookie,
        Connection: "close",
        Origin: new URL(url).origin,
        "Content-Type": "application/json",
      },
    },
    (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        wire += chunk.length;
        if (bytes > 65536) reject(Error("DRIVE_WIRE"));
        else chunks.push(chunk);
      });
      res.once("error", () => reject(Error("DRIVE_RESPONSE")));
      res.once("end", () => {
        responseEnd = true;
        const text = Buffer.concat(chunks).toString();
        resolve({
          status: res.statusCode ?? 0,
          secure:
            res.headers["cache-control"] === "no-store, private" &&
            res.headers.pragma === "no-cache" &&
            res.headers["referrer-policy"] === "no-referrer" &&
            res.headers["x-content-type-options"] === "nosniff" &&
            !res.headers["access-control-allow-origin"],
          location: res.headers.location ?? null,
          body: text ? JSON.parse(text) : null,
        });
      });
      res.once("close", () => {
        responseClose = true;
      });
    },
  );
  const closed = new Promise<void>((resolveClosed) =>
    req.once("close", () => {
      requestClose = true;
      resolveClosed();
    }),
  );
  req.once("error", () => reject(Error("DRIVE_CLIENT")));
  req.once("socket", (socket) => {
    clientSockets++;
    clientEnds.push(
      new Promise<void>((resolveClose) =>
        socket.once("close", () => {
          clientSockets--;
          resolveClose();
        }),
      ),
    );
  });
  wire += (body?.length ?? 0) + 1024;
  if (slow) {
    req.flushHeaders();
    req.write(body);
  } else req.end(body);
  const done = (async () => {
    const value = await result;
    await closed;
    await Promise.all(clientEnds);
    expect(responseEnd && responseClose && requestClose).toBe(true);
    return value;
  })();
  pending.push(done);
  return { done, end: () => req.end() };
}
beforeEach(() => {
  vi.clearAllMocks();
  observation = { stage: 0 };
  calls.maintain.mockResolvedValue(0);
  calls.queue.mockResolvedValue({
    cursor: { controls: null, candidates: null },
  });
  calls.actor.mockResolvedValue(actor);
  calls.picker.mockResolvedValue({
    kind: "receipt",
    receipt: { id, commandId: id },
  });
  calls.select.mockResolvedValue({
    accepted: true,
    row: { id, commandId: id },
  });
  calls.exchange.mockResolvedValue(undefined);
  const execution = new NodeDriveExecution("synthetic-runtime");
  c = {
    appUrl: "https://app.invalid",
    tokens: { hash: () => "synthetic-state" },
    drive: {
      runtimeGeneration: execution.runtimeGeneration,
      execution,
      protector: { available: () => true },
    },
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
afterEach(async (context) => {
  for (const release of releases.splice(0)) release();
  await runtime?.quiesce();
  await Promise.allSettled(pending.splice(0));
  await closeListener();
  await Promise.all(clientEnds);
  const root = process.env.DRIVE_S5A_ROOT;
  const family = /^(R[24578]) /.exec(context.task.name)?.[1];
  if (!root || !root.includes("/p5c1-s5a-") || !family)
    throw Error("DRIVE_ROOT");
  const attempt = process.env.DRIVE_S5A_ROOT_REPLAY === "1" ? "-02" : "";
  await writeFile(
    join(root, `root-resource-${family}${attempt}.json`),
    JSON.stringify({
      observation,
      requests,
      wireBodyAndHeaderEstimate: wire,
      reservation: requests * 128 * 1024,
      listenerClosed,
      serverSockets,
      clientSockets,
      responseClosed,
      pending: 0,
    }),
    { flag: "wx", mode: 0o600 },
  );
  expect(
    listenerClosed &&
      serverSockets === 0 &&
      clientSockets === 0 &&
      responseClosed === requests &&
      wire <= 1280 * 1024,
  ).toBe(true);
  runtime = undefined;
  server = undefined;
  vi.useRealTimers();
});
test("R2 native handler registration preserves current actor and secret response boundaries", async () => {
  const origin = await listening((request) =>
    runtime!.handle(
      request,
      async (current) =>
        (await runtime!.dispatch(current)) ??
        new Response(null, { status: 404 }),
    ),
  );
  runtime = await createDriveRuntime(c, `${origin}/auth/drive/callback`);
  calls.picker.mockResolvedValueOnce({
    kind: "issued",
    picker: { accessToken: "synthetic-access", ticket: "synthetic-ticket" },
  });
  const issued = await send(
    `${origin}/api/integrations/drive/picker`,
    JSON.stringify(initial),
  ).done;
  const repeated = await send(
    `${origin}/api/integrations/drive/picker`,
    JSON.stringify(initial),
  ).done;
  const selected = await send(
    `${origin}/api/integrations/drive/selection`,
    JSON.stringify({
      ...initial,
      pickerId: id,
      ticket: "synthetic-ticket",
      fileId: "folder",
      resourceKey: null,
    }),
  ).done;
  const callback = await send(
    `${origin}/auth/drive/callback?state=synthetic-state&code=synthetic-code`,
  ).done;
  calls.actor.mockResolvedValueOnce({ ...actor, browserEpoch: 2 });
  const foreign = await send(
    `${origin}/auth/drive/callback?state=synthetic-state&code=synthetic-code`,
  ).done;
  observation = {
    stage: 1,
    secure: [issued, repeated, selected, callback, foreign].every(
      (r) => r.secure,
    ),
    issued: issued.status === 200,
    repeated: repeated.status === 200,
    selected: selected.status === 200,
    callback: callback.location === `/auth/drive-result?id=${id}`,
    foreign: foreign.location === "/auth/drive-result",
    exchanges: calls.exchange.mock.calls.length,
  };
  expect(
    [issued, repeated, selected, callback, foreign].every((r) => r.secure) &&
      issued.status === 200 &&
      repeated.status === 200 &&
      selected.status === 200 &&
      callback.location === `/auth/drive-result?id=${id}` &&
      foreign.location === "/auth/drive-result" &&
      calls.exchange.mock.calls.length === 1,
  ).toBe(true);
  expect(
    (
      await runtime.dispatch(
        new Request(`${origin}/api/integrations/drive/picker`),
      )
    )?.status === 405 && calls.picker.mock.calls.length === 2,
  ).toBe(true);
});
test("R4 quiesce starts before listener drain and waits for the received handler", async () => {
  const entered = gate();
  const release = gate();
  calls.exchange.mockImplementation(async () => {
    entered.resolve();
    await release.promise;
  });
  const origin = await listening((request) =>
    runtime!.handle(
      request,
      async (current) =>
        (await runtime!.dispatch(current)) ??
        new Response(null, { status: 404 }),
    ),
  );
  runtime = await createDriveRuntime(c, `${origin}/auth/drive/callback`);
  const receiving = send(
    `${origin}/auth/drive/callback?state=synthetic&code=synthetic`,
  );
  await entered.promise;
  observation.stage = 1;
  let dbClosed = false;
  const drain = createNodeShutdown({
    quiesce: () => runtime!.quiesce(),
    closeListener,
    shutdown: async () => {
      dbClosed = true;
    },
  });
  const stopping = drain();
  pending.push(stopping);
  await Promise.resolve();
  expect(!dbClosed && !server!.listening && !listenerClosed).toBe(true);
  expect(
    (
      await runtime.handle(
        new Request(`${origin}/api/integrations/drive/picker`),
        async () => {
          throw Error("DRIVE_LATE_REQUEST");
        },
      )
    ).status,
  ).toBe(503);
  release.resolve();
  await receiving.done;
  await stopping;
  observation = { stage: 2, dbClosed, listenerClosed };
  expect(dbClosed && listenerClosed).toBe(true);
});
test("R5 partial body cancellation is separate from native socket completion", async () => {
  const entered = gate();
  const origin = await listening((request) => {
    entered.resolve();
    return runtime!.handle(
      request,
      async (current) =>
        (await runtime!.dispatch(current)) ??
        new Response(null, { status: 404 }),
    );
  });
  runtime = await createDriveRuntime(c, `${origin}/auth/drive/callback`);
  const receiving = send(`${origin}/api/integrations/drive/picker`, "{", true);
  await entered.promise;
  observation.stage = 1;
  const stopping = runtime.quiesce();
  pending.push(stopping);
  receiving.end();
  await stopping;
  expect(calls.picker.mock.calls.length === 0).toBe(true);
  const response = await receiving.done;
  expect(response.status === 400 || response.status === 503).toBe(true);
  await closeListener();
  observation = {
    stage: 2,
    cancelledWithoutApplication: calls.picker.mock.calls.length === 0,
    finiteResponse: response.status === 400 || response.status === 503,
  };
  expect(listenerClosed && clientSockets === 0 && serverSockets === 0).toBe(
    true,
  );
});
test("R7 wake coalesces and stop removes the periodic wake without reopening admission", async () => {
  vi.useFakeTimers();
  const entered = gate();
  const release = gate();
  calls.queue.mockImplementationOnce(async () => {
    entered.resolve();
    await release.promise;
    return { cursor: { controls: null, candidates: null } };
  });
  runtime = await createDriveRuntime(
    c,
    "https://app.invalid/auth/drive/callback",
  );
  await entered.promise;
  runtime.wake();
  runtime.wake();
  release.resolve();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(calls.queue.mock.calls.length).toBe(2);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(calls.queue.mock.calls.length).toBe(3);
  const one = runtime.quiesce();
  const two = runtime.quiesce();
  expect(one === two).toBe(true);
  await one;
  observation.stage = 1;
  const count = calls.queue.mock.calls.length;
  runtime.wake();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(
    calls.queue.mock.calls.length === count && vi.getTimerCount() === 0,
  ).toBe(true);
});
test("R8 unconfigured Drive preserves prior authentication OpenRouter and fallback dispatch", async () => {
  const { drive: _drive, ...unconfigured } = c;
  let auth = 0;
  let openrouter = 0;
  let fallback = 0;
  const origin = await listening((request) =>
    runtime!.handle(request, async (current) => {
      const pathname = new URL(current.url).pathname;
      if (pathname === "/auth/synthetic") {
        auth++;
        return Response.json({ branch: 1 });
      }
      if (pathname === "/openrouter/synthetic") {
        openrouter++;
        return Response.json({ branch: 2 });
      }
      const drive = await runtime!.dispatch(current);
      if (drive) return drive;
      fallback++;
      return Response.json({ branch: 3 });
    }),
  );
  runtime = await createDriveRuntime(
    { ...unconfigured, appUrl: origin },
    `${origin}/auth/drive/callback`,
  );
  for (const path of ["/auth/synthetic", "/openrouter/synthetic", "/ordinary"])
    expect((await send(`${origin}${path}`).done).status).toBe(200);
  expect(
    auth === 1 &&
      openrouter === 1 &&
      fallback === 1 &&
      calls.queue.mock.calls.length === 0,
  ).toBe(true);
});
