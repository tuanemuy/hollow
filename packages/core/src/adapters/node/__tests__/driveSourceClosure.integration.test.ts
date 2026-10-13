import { randomUUID } from "node:crypto";
import { createServer, request } from "node:http";
import type { Socket } from "node:net";
import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import { NodeDriveHttp } from "@repo/core/adapters/node/drive/http";
import type { DriveExecutionTarget } from "@repo/core/application/integration/drive/ports";
import { expect, it, vi } from "vitest";

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

it.each([
  "abort",
  "reject",
  "normal",
  "deadline",
] as const)("waits for an owned pending source copy before closure: %s", async (mode) => {
  const entered = gate();
  const releaseWrite = gate();
  const sockets = new Set<Socket>();
  const socketClosures: Promise<void>[] = [];
  const bytes = Buffer.from("0123456789");
  const server = createServer((req, res) => {
    expect(req.url).toBe("/drive/v3/files/owned-file?alt=media");
    res.setHeader("Connection", "close");
    res.writeHead(200, { "Content-Length": bytes.length });
    res.end(bytes);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socketClosures.push(
      new Promise<void>((yes) =>
        socket.once("close", () => {
          sockets.delete(socket);
          yes();
        }),
      ),
    );
  });
  await new Promise<void>((yes) => server.listen(0, "127.0.0.1", yes));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("SOURCE_FIXTURE_ADDRESS");
  const execution = new NodeDriveExecution(
    randomUUID(),
    undefined,
    mode === "deadline"
      ? { operationMs: 60, closeMs: 60 }
      : { operationMs: 2000, closeMs: 2000 },
  );
  const target: DriveExecutionTarget = {
    kind: "source",
    id: randomUUID(),
    owner: {
      runtimeGeneration: execution.runtimeGeneration,
      token: randomUUID(),
    },
  };
  const http = new NodeDriveHttp(execution, (url, options, response) => {
    expect(url.origin).toBe("https://www.googleapis.com");
    return request(
      new URL(url.pathname + url.search, `http://127.0.0.1:${address.port}`),
      { ...options, port: address.port, agent: false },
      response,
    );
  });
  let writeEnded = false;
  let copyClosed = false;
  let handle!: ReturnType<NodeDriveExecution["run"]>;
  const caller = execution.withCaller(
    target,
    async () => true,
    async () => {
      handle = execution.run(target, (signal) =>
        http.source({
          endpoint: "download",
          fileId: "owned-file",
          resourceKey: null,
          accessToken: "owned-access",
          bytes: bytes.length,
          signal,
          sink: {
            async write(chunk) {
              expect(Buffer.from(chunk)).toEqual(bytes);
              entered.resolve();
              try {
                await releaseWrite.promise;
                if (mode === "reject") throw Error("OWNED_SINK_FAILURE");
              } finally {
                writeEnded = true;
              }
            },
          },
        }),
      );
      handle.closed.then(
        () => {
          copyClosed = true;
        },
        () => {},
      );
      const result = await handle.result;
      await handle.closed;
      return result;
    },
  );
  caller.catch(() => {});
  try {
    await entered.promise;
    if (mode === "abort") handle.abort();
    if (mode === "deadline") {
      await expect(caller).rejects.toMatchObject({ code: "DRIVE_UNAVAILABLE" });
      expect(await handle.result).toMatchObject({
        kind: "failure",
        delivery: "unknown",
      });
    } else {
      await new Promise<void>((yes) => setTimeout(yes, 30));
    }
    expect(writeEnded).toBe(false);
    expect(copyClosed).toBe(false);
    expect(execution.closure(target)).toEqual({ kind: "held" });
    releaseWrite.resolve();
    if (mode !== "deadline") {
      const outcome = await caller;
      expect(outcome).toMatchObject({
        kind: "settled",
        value: { kind: mode === "normal" ? "value" : "failure" },
      });
      expect(copyClosed).toBe(true);
    }
    await vi.waitFor(() =>
      expect(execution.closure(target).kind).toBe("closed"),
    );
    expect(writeEnded).toBe(true);
    const closure = execution.closure(target);
    if (closure.kind !== "closed") throw Error("SOURCE_PROOF_REQUIRED");
    expect(closure.proof).toMatchObject({ target, source: "local-close" });
    await execution.acknowledge(closure.proof);
    await execution.confirmSourceAcknowledged(closure.proof);
    expect(execution.caller(target)).toBe("untracked");
  } finally {
    releaseWrite.resolve();
    await caller.catch(() => {});
    await execution.stop();
    await new Promise<void>((yes, no) =>
      server.close((error) => (error ? no(error) : yes())),
    );
    await Promise.all(socketClosures);
    expect(sockets.size).toBe(0);
  }
});
