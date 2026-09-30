import { randomBytes } from "node:crypto";
import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer, request } from "node:http";
import type { Socket } from "node:net";
import { join } from "node:path";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { DriveTransportError, NodeDriveExecution } from "./execution";
import { createNodeDrive } from "./factory";

const seam = vi.hoisted(() => ({
  port: 0,
  failProtector: false,
  stop: 0,
  requests: 0,
  fixed: true,
  host: "",
  nativeMatch: false,
  clientSockets: 0,
  clientClosed: [] as Promise<void>[],
  listenerMatches: (): boolean => false,
}));
vi.mock("./http", async (load) => {
  const actual = await load<typeof import("./http")>();
  return {
    ...actual,
    NodeDriveHttp: class extends actual.NodeDriveHttp {
      constructor(execution: NodeDriveExecution) {
        super(execution, (url, options, callback) => {
          seam.fixed &&=
            url.origin === "https://www.googleapis.com" &&
            url.pathname === "/drive/v3/files/synthetic-folder" &&
            url.searchParams.get("supportsAllDrives") === "true";
          seam.requests++;
          if (seam.requests > 1 || !seam.port) throw new DriveTransportError();
          const target = new URL(
            `http://127.0.0.1:${seam.port}${url.pathname}${url.search}`,
          );
          const native = {
            ...options,
            protocol: "http:",
            hostname: "127.0.0.1",
            port: seam.port,
          };
          seam.nativeMatch =
            seam.listenerMatches() &&
            seam.fixed &&
            seam.host === "127.0.0.1" &&
            Number.isInteger(seam.port) &&
            seam.port > 0 &&
            target.protocol === native.protocol &&
            target.hostname === native.hostname &&
            Number(target.port) === native.port &&
            native.socketPath === undefined &&
            native.host === undefined &&
            native.auth === undefined &&
            native.createConnection === undefined;
          if (!seam.nativeMatch) throw new DriveTransportError();
          const req = request(target, native, callback);
          req.once("socket", (socket) => {
            seam.clientSockets++;
            seam.clientClosed.push(
              new Promise<void>((resolve) =>
                socket.once("close", () => {
                  seam.clientSockets--;
                  resolve();
                }),
              ),
            );
          });
          return req;
        });
      }
    },
  };
});
vi.mock("./secretProtector", async (load) => {
  const actual = await load<typeof import("./secretProtector")>();
  return {
    ...actual,
    createDriveSecretProtector: (
      ...args: Parameters<typeof actual.createDriveSecretProtector>
    ) => {
      if (seam.failProtector) throw new DriveTransportError();
      return actual.createDriveSecretProtector(...args);
    },
  };
});

const root = process.env.DRIVE_S5A_ROOT;
if (!root || !root.includes("/p5c1-s5a-") || !root.startsWith("/"))
  throw Error("DRIVE_ROOT");
const configDirectory = join(root, "config");
const runtimeDirectory = join(root, "runtime");
const configFile = join(configDirectory, "drive.json");
const database = join(configDirectory, "database-marker");
const replay = process.env.DRIVE_S5A_FACTORY_REPLAY === "1";
const configuredName = replay ? "collision" : "configured";
const base = {
  clock: { now: () => new Date("2026-09-30T00:00:00.000Z") },
  tokens: { hash: () => "synthetic", generate: () => "synthetic" },
} as unknown as Pick<HollowContainer, "clock" | "tokens">;
const options = (name: string) => ({
  configFile,
  appUrl: "https://app.invalid",
  canonicalDatabasePath: database,
  runtimeDirectory: join(runtimeDirectory, name),
  wake: () => {},
});
const executions: NodeDriveExecution[] = [];
let wire = 0;
let serverClosed = true;
let socketCount = 0;
let received = 0;
let stage = 0;
let valueUsable = false;
let proofClosed = false;
beforeAll(async () => {
  const stat = await lstat(root);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o777) !== 0o700
  )
    throw Error("DRIVE_ROOT");
  if (replay) {
    const expected = [
      "active.key",
      "previous.key",
      "drive.json",
      "keyring.json",
      "database-marker",
    ].sort();
    if (
      JSON.stringify((await readdir(configDirectory)).sort()) !==
      JSON.stringify(expected)
    )
      throw Error("DRIVE_MATERIAL");
    for (const name of expected) {
      const value = await lstat(join(configDirectory, name));
      if (
        !value.isFile() ||
        value.isSymbolicLink() ||
        (value.mode & 0o777) !== 0o600 ||
        value.size < 1 ||
        value.size > 16384 ||
        (name.endsWith(".key") && value.size !== 32)
      )
        throw Error("DRIVE_MATERIAL");
    }
    for (const directory of [configDirectory, runtimeDirectory]) {
      const value = await lstat(directory);
      if (
        !value.isDirectory() ||
        value.isSymbolicLink() ||
        (value.mode & 0o777) !== 0o700
      )
        throw Error("DRIVE_MATERIAL");
    }
    return;
  }
  await mkdir(configDirectory, { mode: 0o700 });
  await mkdir(runtimeDirectory, { mode: 0o700 });
  for (const name of ["active", "previous"]) {
    const key = randomBytes(32);
    try {
      await writeFile(join(configDirectory, `${name}.key`), key, {
        flag: "wx",
        mode: 0o600,
      });
    } finally {
      key.fill(0);
    }
  }
  await writeFile(database, "synthetic-database-marker", {
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(
    join(configDirectory, "keyring.json"),
    JSON.stringify({
      version: 1,
      activeKid: "active",
      keys: ["active", "previous"].map((kid) => ({
        kid,
        keyFile: join(configDirectory, `${kid}.key`),
      })),
    }),
    { flag: "wx", mode: 0o600 },
  );
  await writeFile(
    configFile,
    JSON.stringify({
      version: 1,
      clientId: "synthetic-client",
      clientSecret: "synthetic-secret",
      keyringFile: join(configDirectory, "keyring.json"),
      picker: { appId: "1", apiKey: "synthetic-picker" },
    }),
    { flag: "wx", mode: 0o600 },
  );
});
afterAll(async () => {
  let stopped = false;
  try {
    for (const execution of executions) await execution.stop();
    await Promise.all(seam.clientClosed);
    stopped = true;
  } finally {
    await writeFile(
      join(
        root,
        replay ? "factory-resource-02.json" : "factory-resource-01.json",
      ),
      JSON.stringify({
        stage,
        requests: seam.requests,
        received,
        wireBodyAndHeaderBytes: wire,
        reservation: 128 * 1024,
        nativeMatch: seam.nativeMatch,
        valueUsable,
        proofClosed,
        serverClosed,
        serverSockets: socketCount,
        clientSockets: seam.clientSockets,
        stopped,
      }),
      { flag: "wx", mode: 0o600 },
    );
  }
  expect(
    serverClosed &&
      socketCount === 0 &&
      seam.clientSockets === 0 &&
      wire <= 128 * 1024 &&
      seam.requests === 1,
  ).toBe(true);
});
test("F1 unconfigured factory does not inspect paths or acquire ownership", async () => {
  expect(
    await createNodeDrive(base, {
      appUrl: "not-a-url",
      canonicalDatabasePath: null,
      runtimeDirectory: null,
      wake: () => {},
    }),
  ).toBeNull();
});
test("F2 configured factory owns one generation and a fixed-endpoint metadata request", async () => {
  stage = 1;
  const node = await createNodeDrive(base, options(configuredName));
  if (!node || !(node.services.execution instanceof NodeDriveExecution))
    throw Error("DRIVE_FACTORY");
  const execution = node.services.execution;
  executions.push(execution);
  const sockets = new Map<Socket, Promise<void>>();
  const server = createServer((req, res) => {
    received++;
    wire += Buffer.byteLength(JSON.stringify(req.headers));
    const body = JSON.stringify({
      id: "synthetic-folder",
      name: "Synthetic",
      mimeType: "application/vnd.google-apps.folder",
      trashed: false,
      parents: ["root"],
      capabilities: { canAddChildren: true },
    });
    wire += Buffer.byteLength(body) + 512;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Connection", "close");
    res.end(body);
  });
  server.on("connection", (socket) => {
    socketCount++;
    sockets.set(
      socket,
      new Promise<void>((resolve) =>
        socket.once("close", () => {
          socketCount--;
          resolve();
        }),
      ),
    );
  });
  serverClosed = false;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw Error("DRIVE_LISTENER");
  seam.port = address.port;
  seam.host = address.address;
  seam.listenerMatches = () => {
    const current = server.address();
    return (
      server.listening &&
      current !== null &&
      typeof current !== "string" &&
      current.address === seam.host &&
      current.port === seam.port
    );
  };
  if (!server.listening || seam.host !== "127.0.0.1")
    throw Error("DRIVE_LISTENER");
  stage = 2;
  try {
    const owner = {
      state: "active" as const,
      token: "synthetic-owner",
      runtimeGeneration: execution.runtimeGeneration,
      startedAt: base.clock.now(),
    };
    const target = {
      kind: "control" as const,
      id: "synthetic-operation",
      owner,
    };
    await execution.withCaller(
      target,
      async () => true,
      async () => {
        const handle = execution.run(target, (signal) =>
          node.services.folders.inspectFolder({
            signal,
            accessToken: "synthetic-access",
            fileId: "synthetic-folder",
            resourceKey: null,
          }),
        );
        const result = await handle.result;
        stage = 3;
        valueUsable = result.kind === "value" && result.value.kind === "usable";
        expect(
          result.kind === "value" &&
            result.value.kind === "usable" &&
            seam.fixed &&
            node.callbackUrl === "https://app.invalid/auth/drive/callback" &&
            node.services.runtimeGeneration === execution.runtimeGeneration,
        ).toBe(true);
        await handle.closed;
        stage = 4;
        proofClosed = execution.closure(target).kind === "closed";
        expect(execution.closure(target).kind === "closed").toBe(true);
        const proof = execution.unacknowledged(1)[0];
        if (!proof) throw Error("DRIVE_PROOF");
        await execution.acknowledge(proof);
        stage = 5;
      },
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await Promise.all(sockets.values());
    serverClosed = true;
    seam.port = 0;
    seam.host = "";
  }
});
test("F3 explicit invalid configuration is finite and does not create a runtime", async () => {
  await expect(
    createNodeDrive(base, {
      ...options("invalid"),
      configFile: join(configDirectory, "absent.json"),
    }),
  ).rejects.toMatchObject({ code: "DRIVE_UNAVAILABLE" });
  await expect(lstat(join(runtimeDirectory, "invalid"))).rejects.toMatchObject({
    code: "ENOENT",
  });
});
test("F4 remote memory and callback bounds fail before owner acquisition", async () => {
  for (const canonicalDatabasePath of [
    null,
    ":memory:",
    "libsql://synthetic.invalid",
  ]) {
    await expect(
      createNodeDrive(base, { ...options("invalid"), canonicalDatabasePath }),
    ).rejects.toBeInstanceOf(DriveTransportError);
  }
  await expect(
    createNodeDrive(base, {
      ...options("invalid"),
      appUrl: "http://127.0.0.1:1",
    }),
  ).rejects.toMatchObject({ code: "DRIVE_UNAVAILABLE" });
  await expect(lstat(join(runtimeDirectory, "invalid"))).rejects.toMatchObject({
    code: "ENOENT",
  });
});
test("F5 a live generation cannot be replaced", async () => {
  const before = await readFile(
    join(runtimeDirectory, configuredName, "owner.json"),
  );
  await expect(
    createNodeDrive(base, options(configuredName)),
  ).rejects.toBeInstanceOf(DriveTransportError);
  expect(
    before.equals(
      await readFile(join(runtimeDirectory, configuredName, "owner.json")),
    ),
  ).toBe(true);
});
test("F6 post-acquisition construction failure closes execution without deleting owner record", async () => {
  seam.failProtector = true;
  const stop = vi.spyOn(NodeDriveExecution.prototype, "stop");
  try {
    await expect(
      createNodeDrive(base, options("partial")),
    ).rejects.toBeInstanceOf(DriveTransportError);
    expect(stop).toHaveBeenCalledOnce();
    expect(
      (await lstat(join(runtimeDirectory, "partial", "owner.json"))).isFile(),
    ).toBe(true);
  } finally {
    seam.failProtector = false;
    stop.mockRestore();
  }
});
