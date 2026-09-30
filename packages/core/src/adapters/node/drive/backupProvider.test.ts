import { EventEmitter } from "node:events";
import { lstatSync, realpathSync } from "node:fs";
import type { ClientRequest, IncomingMessage } from "node:http";
import { createServer, request as nativeRequest } from "node:http";
import type { RequestOptions } from "node:https";
import type { Socket } from "node:net";
import { isAbsolute } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { DRIVE_BACKUP_MARKER, NodeDriveBackupProvider } from "./backupProvider";
import { DriveTransportError, NodeDriveExecution } from "./execution";
import {
  DRIVE_BACKUP_FILE_FIELDS,
  type DriveBackupHttpInput,
  type DriveBackupHttpReply,
  NodeDriveHttp,
  validDriveBackupSession,
} from "./http";

afterEach(() => vi.restoreAllMocks());

describe.skipIf(!process.env.HOLLOW_DRIVE_BACKUP_HTTP_ROOT)(
  "native backup HTTP loopback closure",
  () => {
    let port = 0;
    let count = 0;
    let wire = 0;
    let transportBytes = 0;
    let active = 0;
    let mode: "start" | "query" | "chunk" | "redirect" | "drop" | "hold" =
      "start";
    let received: (() => void) | null = null;
    const sockets = new Set<Socket>();
    const socketClosures: Promise<void>[] = [];
    const server = createServer((req, res) => {
      count++;
      active++;
      wire += Buffer.byteLength(JSON.stringify(req.headers));
      if (count > 32 || active > 1) {
        req.destroy();
        return;
      }
      req.on("data", (bytes) => {
        wire += bytes.length;
        if (wire > 8 * 1024 * 1024) req.destroy();
      });
      res.once("close", () => {
        active--;
      });
      req.on("end", () => {
        received?.();
        if (mode === "hold") return;
        if (mode === "drop") {
          req.socket.destroy();
          return;
        }
        if (mode === "redirect") {
          res.writeHead(307, { Location: "https://example.invalid/forbidden" });
          res.end();
          return;
        }
        if (mode === "start") {
          res.writeHead(200, {
            Location:
              "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=native",
          });
          res.end();
          return;
        }
        if (mode === "query") {
          res.writeHead(308, { Range: "bytes=0-16" });
          res.end();
          return;
        }
        const body = JSON.stringify({
          id: "file",
          parents: ["folder"],
          size: "1024",
          trashed: false,
          appProperties: { hollowBackupTarget: "marker" },
        });
        wire += Buffer.byteLength(body);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        });
        res.end(body);
      });
    });
    server.on("connection", (socket) => {
      sockets.add(socket);
      socketClosures.push(
        new Promise((resolve) =>
          socket.once("close", () => {
            transportBytes += socket.bytesRead + socket.bytesWritten;
            sockets.delete(socket);
            resolve();
          }),
        ),
      );
    });
    beforeAll(async () => {
      const root = process.env.HOLLOW_DRIVE_BACKUP_HTTP_ROOT;
      if (!root || !isAbsolute(root)) throw Error("BACKUP_HTTP_ROOT");
      const stat = lstatSync(root);
      if (
        !stat.isDirectory() ||
        stat.isSymbolicLink() ||
        (stat.mode & 0o777) !== 0o700 ||
        stat.uid !== process.getuid?.() ||
        realpathSync(root) !== root
      )
        throw Error("BACKUP_HTTP_ROOT");
      await new Promise<void>((resolve, reject) => {
        server.once("error", () => reject(Error("BACKUP_HTTP_LISTEN")));
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (!address || typeof address === "string")
        throw Error("BACKUP_HTTP_ADDRESS");
      port = address.port;
    });
    afterAll(async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) =>
          error ? reject(Error("BACKUP_HTTP_CLOSE")) : resolve(),
        ),
      );
      await Promise.all(socketClosures);
      process.stdout.write(
        `FINITE_HTTP_METRICS ${JSON.stringify({ requests: count, bytes: transportBytes, active, sockets: sockets.size, closed: !server.listening })}\n`,
      );
      expect(
        sockets.size === 0 &&
          active === 0 &&
          count <= 32 &&
          transportBytes <= 8 * 1024 * 1024 &&
          wire <= 8 * 1024 * 1024,
      ).toBe(true);
    });
    async function run(endpoint: "start" | "query" | "chunk", abort = false) {
      const execution = new NodeDriveExecution("native-runtime", undefined, {
        operationMs: 1000,
        backupMs: 1000,
        closeMs: 1000,
      });
      const target = {
        kind: "backup" as const,
        id: "native",
        owner: { runtimeGeneration: "native-runtime", token: "native-owner" },
      };
      const http = new NodeDriveHttp(execution, (url, options, response) => {
        const fixed = new URL(url);
        fixed.protocol = "http:";
        fixed.hostname = "127.0.0.1";
        fixed.port = String(port);
        return nativeRequest(
          fixed,
          {
            ...options,
            protocol: "http:",
            hostname: "127.0.0.1",
            host: "127.0.0.1",
            port,
            agent: false,
          },
          response,
        );
      });
      const arrival = new Promise<void>((resolve) => {
        received = resolve;
      });
      let closed = false;
      const result = await execution.withCaller(
        target,
        async () => true,
        async () => {
          const handle = execution.run(target, (signal) =>
            http.backup(
              endpoint === "start"
                ? {
                    endpoint,
                    accessToken: "native-access",
                    signal,
                    folderId: "folder",
                    resourceKey: null,
                    bytes: 1024,
                    body: "{}",
                  }
                : endpoint === "query"
                  ? {
                      endpoint,
                      accessToken: "native-access",
                      signal,
                      session:
                        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=native",
                      bytes: 1024,
                    }
                  : {
                      endpoint,
                      accessToken: "native-access",
                      signal,
                      session:
                        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=native",
                      bytes: 1024,
                      offset: 0,
                      chunk: Buffer.alloc(1024, 37),
                    },
            ),
          );
          const closure = handle.closed.then(
            () => true,
            () => false,
          );
          if (abort) {
            await arrival;
            handle.abort();
          }
          const value = await handle.result;
          closed = await closure;
          return value;
        },
      );
      received = null;
      const proof = execution.closure(target);
      if (proof.kind === "closed") await execution.acknowledge(proof.proof);
      await execution.stop();
      expect(
        closed &&
          proof.kind === "closed" &&
          execution.unacknowledged(1).length === 0 &&
          !execution.hasPendingCallers(),
      ).toBe(true);
      return result;
    }
    it("round-trips start, empty status PUT and a bounded chunk with real socket closure", async () => {
      mode = "start";
      const first = await run("start");
      expect(
        first.kind === "settled" &&
          first.value.kind === "value" &&
          first.value.value.status === 200,
      ).toBe(true);
      mode = "query";
      const second = await run("query");
      expect(
        second.kind === "settled" &&
          second.value.kind === "value" &&
          second.value.value.status === 308 &&
          second.value.value.range === "bytes=0-16",
      ).toBe(true);
      mode = "chunk";
      const third = await run("chunk");
      expect(
        third.kind === "settled" &&
          third.value.kind === "value" &&
          third.value.value.status === 200,
      ).toBe(true);
    });
    it("does not follow a redirect and does not mistake lost ACK for success", async () => {
      const before = count;
      mode = "redirect";
      const redirect = await run("query");
      mode = "drop";
      const dropped = await run("chunk");
      expect(
        count === before + 2 &&
          redirect.kind === "settled" &&
          redirect.value.kind === "failure" &&
          dropped.kind === "settled" &&
          dropped.value.kind === "failure",
      ).toBe(true);
    });
    it("aborts an in-flight native request and waits for actual closure", async () => {
      mode = "hold";
      const value = await run("chunk", true);
      expect(value.kind === "settled" && value.value.kind === "failure").toBe(
        true,
      );
    });
  },
);

const session =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=fixture_upload-id";
const access = () => ({
  signal: new AbortController().signal,
  accessToken: "fixture-token",
});
const file = () => ({
  id: "file-id",
  parents: ["folder-id"],
  size: "1024",
  trashed: false,
  sha256Checksum: "a".repeat(64),
  resourceKey: "fixture-key",
  webViewLink: "https://drive.google.com/file/d/file-id/view?usp=drivesdk",
  appProperties: { [DRIVE_BACKUP_MARKER]: "target-marker" },
});
const start = () => ({
  ...access(),
  fileId: "file-id",
  folderId: "folder-id",
  folderResourceKey: "fixture-key",
  marker: "target-marker",
  name: "日本語.txt",
  bytes: 1024,
});
function fixture(
  status = 200,
  data: unknown = null,
  extra: Partial<DriveBackupHttpReply> = {},
) {
  const reply: DriveBackupHttpReply = {
    status,
    data,
    location: null,
    range: null,
    ...extra,
  };
  const backup = vi.fn(async (_input: DriveBackupHttpInput) => reply);
  return { backup, provider: new NodeDriveBackupProvider({ backup }) };
}

describe("NodeDriveBackupProvider", () => {
  it("requires exactly one allocated ID and does not create a file during allocation", async () => {
    const f = fixture(200, { ids: ["allocated-id"] });
    expect(await f.provider.allocateFileId(access())).toBe("allocated-id");
    expect(f.backup.mock.calls[0]?.[0].endpoint).toBe("generate");
    f.backup.mockResolvedValueOnce({
      status: 200,
      data: { ids: ["a", "b"] },
      location: null,
      range: null,
    });
    await expect(f.provider.allocateFileId(access())).rejects.toMatchObject({
      code: "DRIVE_BACKUP_UNKNOWN",
    });
  });

  it("initiates binary upload with the preallocated ID, original name, marker and selected parent", async () => {
    const f = fixture(200, null, { location: session });
    await expect(f.provider.startResumable(start())).resolves.toEqual({
      kind: "started",
      session,
    });
    const input = f.backup.mock.calls[0]?.[0];
    if (input?.endpoint !== "start")
      throw new Error("Missing start fixture request");
    expect(input.folderId).toBe("folder-id");
    expect(input.resourceKey).toBe("fixture-key");
    expect(input.bytes).toBe(1024);
    expect(JSON.parse(input.body)).toEqual({
      id: "file-id",
      name: "日本語.txt",
      mimeType: "application/octet-stream",
      parents: ["folder-id"],
      appProperties: { [DRIVE_BACKUP_MARKER]: "target-marker" },
    });
    expect(f.backup).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    "https://example.invalid/session",
    `${session}&alt=media`,
    session.replace("www.googleapis.com", "www.googleapis.com:443"),
  ])("keeps an invalid or missing Location unknown without issuing a second request", async (location) => {
    const f = fixture(200, null, { location });
    await expect(f.provider.startResumable(start())).resolves.toEqual({
      kind: "unknown",
    });
    expect(f.backup).toHaveBeenCalledTimes(1);
  });

  it.each([
    [null, 0],
    ["bytes=0-0", 1],
    ["bytes=0-16", 17],
    ["bytes=0-1023", 1024],
  ] as const)("uses only the received Range %s", async (range, offset) => {
    const f = fixture(308, null, { range });
    await expect(
      f.provider.queryReceived({ ...access(), session, bytes: 1024 }),
    ).resolves.toEqual({ kind: "incomplete", offset });
    expect(f.backup.mock.calls[0]?.[0].endpoint).toBe("query");
  });

  it.each([
    "bytes=1-2",
    "bytes=0-01",
    "bytes=0--1",
    "bytes=0-1024",
    "bytes=0-1,3-4",
    "bytes=0-1/1024",
    "bytes=0-9007199254740992",
    " bytes=0-1",
    "BYTES=0-1",
    "bytes=0-1\r\n",
  ])("rejects ambiguous or overflowing Range %s", async (range) => {
    const f = fixture(308, null, { range });
    await expect(
      f.provider.queryReceived({ ...access(), session, bytes: 1024 }),
    ).rejects.toMatchObject({ code: "DRIVE_BACKUP_UNKNOWN" });
  });

  it("does not infer the received offset from a successfully sent chunk", async () => {
    const f = fixture(308, null);
    await expect(
      f.provider.uploadChunk({
        ...access(),
        session,
        bytes: 1024,
        offset: 0,
        chunk: new Uint8Array(1024),
      }),
    ).resolves.toEqual({ kind: "incomplete", offset: 0 });
    expect(f.backup.mock.calls[0]?.[0].endpoint).toBe("chunk");
  });

  it("permits a nonaligned acknowledged start but requires a 256 KiB multiple for a nonfinal chunk", async () => {
    const f = fixture(308, null, { range: "bytes=0-17" });
    await expect(
      f.provider.uploadChunk({
        ...access(),
        session,
        bytes: 1_048_576,
        offset: 17,
        chunk: new Uint8Array(262_144),
      }),
    ).resolves.toEqual({ kind: "incomplete", offset: 18 });
    f.backup.mockClear();
    await expect(
      f.provider.uploadChunk({
        ...access(),
        session,
        bytes: 1_048_576,
        offset: 17,
        chunk: new Uint8Array(1),
      }),
    ).rejects.toMatchObject({ code: "DRIVE_BACKUP_UNAVAILABLE" });
    expect(f.backup).not.toHaveBeenCalled();
  });

  it.each([
    200, 201,
  ])("parses completed %s metadata without treating absent checksum as verification", async (status) => {
    const data = file();
    const f = fixture(status, data);
    await expect(
      f.provider.queryReceived({ ...access(), session, bytes: 1024 }),
    ).resolves.toEqual({
      kind: "complete",
      file: {
        id: "file-id",
        parents: ["folder-id"],
        bytes: 1024,
        sha256: "a".repeat(64),
        trashed: false,
        marker: "target-marker",
        resourceKey: "fixture-key",
        webViewLink: data.webViewLink,
      },
    });
    const { sha256Checksum: _, ...withoutChecksum } = data;
    const noHash = fixture(status, withoutChecksum);
    await expect(
      noHash.provider.queryReceived({ ...access(), session, bytes: 1024 }),
    ).resolves.toMatchObject({ kind: "complete", file: { sha256: null } });
  });

  it("keeps empty completed responses unknown and refuses malformed metadata", async () => {
    await expect(
      fixture(200).provider.queryReceived({
        ...access(),
        session,
        bytes: 1024,
      }),
    ).resolves.toEqual({ kind: "unknown" });
    for (const data of [
      {},
      { ...file(), size: "1e3" },
      { ...file(), sha256Checksum: "broken" },
    ])
      await expect(
        fixture(200, data).provider.queryReceived({
          ...access(),
          session,
          bytes: 1024,
        }),
      ).rejects.toMatchObject({ code: "DRIVE_BACKUP_CHANGED" });
  });

  it("keeps metadata 404 ambiguous while identifying session 404 as expiry", async () => {
    const f = fixture(404);
    await expect(
      f.provider.inspectFile({
        ...access(),
        fileId: "file-id",
        resourceKey: null,
      }),
    ).resolves.toBeNull();
    await expect(
      f.provider.queryReceived({ ...access(), session, bytes: 1024 }),
    ).resolves.toEqual({ kind: "session-expired" });
    await expect(f.provider.startResumable(start())).rejects.toMatchObject({
      code: "DRIVE_BACKUP_FOLDER_UNAVAILABLE",
    });
  });

  it("requires the requested metadata ID and drops unsafe display links without fetching them", async () => {
    const f = fixture(200, {
      ...file(),
      explicitlyTrashed: true,
      webViewLink: "https://example.invalid/private",
    });
    await expect(
      f.provider.inspectFile({
        ...access(),
        fileId: "file-id",
        resourceKey: "fixture-key",
      }),
    ).resolves.toMatchObject({ trashed: true, webViewLink: null });
    await expect(
      f.provider.inspectFile({
        ...access(),
        fileId: "other-id",
        resourceKey: null,
      }),
    ).rejects.toMatchObject({ code: "DRIVE_BACKUP_CHANGED" });
    expect(
      f.backup.mock.calls.every(([input]) => input.endpoint === "inspect"),
    ).toBe(true);
  });

  it.each([
    [403, "storageQuotaExceeded", "DRIVE_BACKUP_QUOTA"],
    [403, "rateLimitExceeded", "DRIVE_BACKUP_RATE_LIMIT"],
    [403, "userRateLimitExceeded", "DRIVE_BACKUP_RATE_LIMIT"],
    [403, "insufficientFilePermissions", "DRIVE_BACKUP_DENIED"],
    [429, "unused", "DRIVE_BACKUP_RATE_LIMIT"],
  ] as const)("classifies %s/%s into a finite failure", async (status, reason, code) => {
    const f = fixture(status, { error: { errors: [{ reason }] } });
    await expect(
      f.provider.queryReceived({ ...access(), session, bytes: 1024 }),
    ).rejects.toMatchObject({ code });
  });

  it("preserves credential rejection and transport delivery/ownership errors", async () => {
    const f = fixture(401);
    await expect(
      f.provider.queryReceived({ ...access(), session, bytes: 1024 }),
    ).rejects.toMatchObject({
      code: "DRIVE_PROVIDER_REJECTED",
      credentialRejection: "access-token",
    });
    const error = new DriveTransportError("DRIVE_UNAVAILABLE", "unknown");
    f.backup.mockRejectedValueOnce(error);
    await expect(f.provider.startResumable(start())).rejects.toBe(error);
  });

  it.each([
    [409, "conflict"],
    [408, "unknown"],
    [500, "unknown"],
    [503, "unknown"],
  ] as const)("keeps resumable %s separate from success", async (status, kind) => {
    const f = fixture(status);
    await expect(f.provider.startResumable(start())).resolves.toEqual({ kind });
    await expect(
      f.provider.queryReceived({ ...access(), session, bytes: 1024 }),
    ).resolves.toEqual({ kind });
  });
});

const invalidSessions = [
  "https://example.invalid/upload/drive/v3/files?uploadType=resumable&upload_id=x",
  session.replace("https:", "http:"),
  session.replace("www.googleapis.com", "www.googleapis.com:443"),
  session.replace("www.googleapis.com", "user@www.googleapis.com"),
  session.replace("/files?", "/a/../files?"),
  session.replace("/files?", "/%66iles?"),
  `${session}#fragment`,
  `${session}&upload_id=second`,
  `${session}&alt=media`,
  session.replace("resumable", "media"),
  session.replace("fixture_upload-id", "%61"),
  session.replace("fixture_upload-id", "x".repeat(4097)),
  `${session}\n`,
];

describe("Drive backup HTTP boundaries without a native request", () => {
  it.each(
    invalidSessions,
  )("refuses an invalid session before request registration", async (value) => {
    expect(validDriveBackupSession(value)).toBe(false);
    const execution = new NodeDriveExecution("fixture");
    const register = vi.spyOn(execution, "register");
    const factory = vi.fn(() => {
      throw new Error("Unexpected fixture HTTP request");
    });
    const http = new NodeDriveHttp(execution, factory);
    await expect(
      http.backup({
        endpoint: "query",
        ...access(),
        session: value,
        bytes: 1024,
      }),
    ).rejects.toMatchObject({ delivery: "not-sent" });
    expect(register).not.toHaveBeenCalled();
    expect(factory).not.toHaveBeenCalled();
    const f = fixture();
    await expect(
      f.provider.queryReceived({ ...access(), session: value, bytes: 1024 }),
    ).rejects.toMatchObject({ delivery: "not-sent" });
    expect(f.backup).not.toHaveBeenCalled();
  });

  it("accepts only the two exact session parameters, in either order", () => {
    expect(validDriveBackupSession(session)).toBe(true);
    expect(
      validDriveBackupSession(
        "https://www.googleapis.com/upload/drive/v3/files?upload_id=x&uploadType=resumable",
      ),
    ).toBe(true);
  });

  it("rejects oversized JSON, oversized chunks and header injection before registration", async () => {
    const execution = new NodeDriveExecution("fixture");
    const register = vi.spyOn(execution, "register");
    const http = new NodeDriveHttp(execution, () => {
      throw new Error("Unexpected fixture HTTP request");
    });
    const inputs: DriveBackupHttpInput[] = [
      {
        endpoint: "start",
        ...access(),
        folderId: "folder-id",
        resourceKey: null,
        bytes: 1024,
        body: "x".repeat(65_537),
      },
      {
        endpoint: "chunk",
        ...access(),
        session,
        bytes: 2_097_152,
        offset: 0,
        chunk: new Uint8Array(1_048_577),
      },
      {
        endpoint: "generate",
        ...access(),
        accessToken: "token\r\nOther: value",
      },
      {
        endpoint: "inspect",
        ...access(),
        fileId: "file-id",
        resourceKey: "key\r\nOther: value",
      },
    ];
    for (const input of inputs)
      await expect(http.backup(input)).rejects.toMatchObject({
        delivery: "not-sent",
      });
    expect(register).not.toHaveBeenCalled();
  });
});

function wireFixture(
  status: number,
  data: string,
  headers: Record<string, string> = {},
  duplicateHeaders: string[] = [],
) {
  const execution = new NodeDriveExecution("fixture");
  const release = vi.fn();
  vi.spyOn(execution, "register").mockReturnValue(release);
  let requestBody: string | Uint8Array | undefined;
  const factory = vi.fn(
    (
      _url: URL,
      _options: RequestOptions,
      reply: (value: IncomingMessage) => void,
    ): ClientRequest => {
      let requestDestroyed = false;
      let responseDestroyed = false;
      const response = Object.assign(new EventEmitter(), {
        statusCode: status,
        headers,
        rawHeaders: [...Object.entries(headers).flat(), ...duplicateHeaders],
        complete: false,
        destroy() {
          if (!responseDestroyed) {
            responseDestroyed = true;
            queueMicrotask(() => response.emit("close"));
          }
          return response;
        },
      });
      const request = Object.assign(new EventEmitter(), {
        end(body?: string | Uint8Array) {
          requestBody = body;
          reply(response as unknown as IncomingMessage);
          if (!responseDestroyed) {
            if (data) response.emit("data", Buffer.from(data));
            if (!responseDestroyed) {
              response.complete = true;
              response.emit("end");
            }
          }
          return request;
        },
        destroy() {
          if (!requestDestroyed) {
            requestDestroyed = true;
            queueMicrotask(() => request.emit("close"));
          }
          return request;
        },
      });
      return request as unknown as ClientRequest;
    },
  );
  return {
    http: new NodeDriveHttp(execution, factory, 1234),
    factory,
    release,
    body: () => requestBody,
  };
}

describe("Drive backup memory-only HTTP exchange", () => {
  it("constructs a bounded binary initiation and accepts its empty response", async () => {
    const f = wireFixture(200, "", { location: session });
    const timer = vi.spyOn(globalThis, "setTimeout");
    const provider = new NodeDriveBackupProvider(f.http);
    await expect(provider.startResumable(start())).resolves.toEqual({
      kind: "started",
      session,
    });
    const call = f.factory.mock.calls[0];
    if (!call) throw new Error("Missing fixture request");
    expect(call[0].origin).toBe("https://www.googleapis.com");
    expect(call[0].pathname).toBe("/upload/drive/v3/files");
    expect(call[0].searchParams.get("fields")).toBe(DRIVE_BACKUP_FILE_FIELDS);
    expect(call[0].searchParams.get("supportsAllDrives")).toBe("true");
    expect(call[1]).toMatchObject({
      method: "POST",
      port: 443,
      agent: false,
      maxHeaderSize: 16_384,
      headers: {
        "X-Upload-Content-Type": "application/octet-stream",
        "X-Upload-Content-Length": "1024",
        "X-Goog-Drive-Resource-Keys": "folder-id/fixture-key",
      },
    });
    expect(typeof f.body()).toBe("string");
    expect(timer.mock.calls.some(([, ms]) => ms === 30_000)).toBe(true);
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("sends an empty status PUT and interprets 308 without following Location", async () => {
    const f = wireFixture(308, "", {
      range: "bytes=0-16",
      location: "https://example.invalid/redirect",
    });
    await expect(
      new NodeDriveBackupProvider(f.http).queryReceived({
        ...access(),
        session,
        bytes: 1024,
      }),
    ).resolves.toEqual({ kind: "incomplete", offset: 17 });
    expect(f.body()).toBe("");
    expect(f.factory.mock.calls[0]?.[1]).toMatchObject({
      method: "PUT",
      headers: { "Content-Length": "0", "Content-Range": "bytes */1024" },
    });
    expect(f.factory).toHaveBeenCalledTimes(1);
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("sends the verified chunk buffer without copying it or inventing an offset", async () => {
    const f = wireFixture(308, "", { range: "bytes=0-16" });
    const chunk = new Uint8Array(262_144);
    await expect(
      new NodeDriveBackupProvider(f.http).uploadChunk({
        ...access(),
        session,
        bytes: 1_048_576,
        offset: 17,
        chunk,
      }),
    ).resolves.toEqual({ kind: "incomplete", offset: 17 });
    expect(f.body()).toBe(chunk);
    expect(f.factory.mock.calls[0]?.[1]).toMatchObject({
      method: "PUT",
      headers: {
        "Content-Length": "262144",
        "Content-Range": "bytes 17-262160/1048576",
        "Content-Type": "application/octet-stream",
      },
    });
  });

  it.each([
    "redirect",
    "duplicate-location",
    "duplicate-range",
    "body-limit",
    "encoding",
    "header-limit",
  ] as const)("rejects %s and releases only after the simulated resources close", async (mode) => {
    const f = wireFixture(
      mode === "redirect" ? 302 : 308,
      mode === "body-limit" ? "x".repeat(65_537) : "",
      mode === "encoding"
        ? { "content-encoding": "gzip" }
        : mode === "header-limit"
          ? { "x-fixture": "x".repeat(16_385) }
          : {},
      mode === "duplicate-location"
        ? ["Location", session, "location", session]
        : mode === "duplicate-range"
          ? ["Range", "bytes=0-1", "range", "bytes=0-2"]
          : [],
    );
    await expect(
      f.http.backup({ endpoint: "query", ...access(), session, bytes: 1024 }),
    ).rejects.toBeInstanceOf(DriveTransportError);
    expect(f.factory).toHaveBeenCalledTimes(1);
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing control result, request limits and timeout distinct", async () => {
    const f = wireFixture(200, "{}", {
      "cache-control": "max-age=60",
      age: "0",
    });
    const timer = vi.spyOn(globalThis, "setTimeout");
    await expect(
      f.http.read({ endpoint: "generate", ...access() }),
    ).resolves.toEqual({
      status: 200,
      data: {},
      cacheControl: "max-age=60",
      age: "0",
    });
    expect(f.factory.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      maxHeaderSize: 8192,
    });
    expect(timer.mock.calls.some(([, ms]) => ms === 1234)).toBe(true);
    await expect(
      f.http.read({ endpoint: "token", ...access(), body: "x".repeat(16_385) }),
    ).rejects.toMatchObject({ delivery: "not-sent" });
    expect(f.factory).toHaveBeenCalledTimes(1);
    const empty = wireFixture(200, "");
    await expect(
      empty.http.read({ endpoint: "generate", ...access() }),
    ).rejects.toBeInstanceOf(DriveTransportError);
    expect(empty.release).toHaveBeenCalledTimes(1);
  });
});
