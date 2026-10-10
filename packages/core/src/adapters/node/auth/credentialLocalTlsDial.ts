import {
  createPrivateKey,
  createPublicKey,
  X509Certificate,
} from "node:crypto";
import type { ClientRequest, IncomingMessage } from "node:http";
import { createServer, type RequestOptions } from "node:https";
import type { LookupFunction, Socket } from "node:net";
import type { TLSSocket } from "node:tls";

const brand = Symbol("credential-local-tls-dial");
export interface CredentialLocalTlsDial {
  readonly [brand]: true;
}
export type CredentialLocalTlsLedger = Readonly<{
  requests: number;
  requestClosed: number;
  responseClosed: number;
  clientSockets: number;
  clientSocketClosed: number;
  accepted: number;
  acceptedClosed: number;
  tlsSockets: number;
  tlsSocketClosed: number;
  serverRequests: number;
  serverResponseClosed: number;
  requestBytes: number;
  responseBytes: number;
  listenerClosed: boolean;
  failed: boolean;
}>;
type Entry = {
  port: number;
  ca: Buffer;
  live: boolean;
  lookup: LookupFunction;
  observe(request: ClientRequest): void;
};
const registry = new WeakMap<CredentialLocalTlsDial, Entry>();
const invalid = () => new Error("CREDENTIAL_LOCAL_TLS_BOUNDARY");

export function credentialLocalTlsOptions(
  dial: CredentialLocalTlsDial,
): Pick<
  RequestOptions,
  "port" | "lookup" | "ca" | "servername" | "rejectUnauthorized"
> {
  const entry = registry.get(dial);
  if (!entry?.live) throw invalid();
  return {
    port: entry.port,
    lookup: entry.lookup,
    ca: Buffer.from(entry.ca),
    servername: "openrouter.ai",
    rejectUnauthorized: true,
  };
}
export function observeCredentialLocalTlsRequest(
  dial: CredentialLocalTlsDial,
  request: ClientRequest,
): void {
  const entry = registry.get(dial);
  if (!entry?.live) {
    request.destroy();
    throw invalid();
  }
  entry.observe(request);
}

export async function createCredentialLocalTlsEndpoint(
  input: Readonly<{
    key: Uint8Array;
    certificate: Uint8Array;
    respond(
      request: Readonly<{
        method: string;
        path: string;
        body: Uint8Array;
        authorization: string | undefined;
      }>,
    ): Promise<Readonly<{ body: Uint8Array }>>;
  }>,
) {
  if (
    input.key.byteLength + input.certificate.byteLength > 64 * 1024 ||
    input.key.byteLength === 0 ||
    input.certificate.byteLength === 0
  )
    throw invalid();
  const cert = new X509Certificate(input.certificate);
  const key = createPrivateKey(Buffer.from(input.key));
  if (
    !cert.ca ||
    cert.checkHost("openrouter.ai", {
      wildcards: false,
      partialWildcards: false,
    }) !== "openrouter.ai" ||
    !cert.verify(cert.publicKey) ||
    !cert.publicKey
      .export({ type: "spki", format: "der" })
      .equals(createPublicKey(key).export({ type: "spki", format: "der" }))
  )
    throw invalid();
  const ledger = {
    requests: 0,
    requestClosed: 0,
    responseClosed: 0,
    clientSockets: 0,
    clientSocketClosed: 0,
    accepted: 0,
    acceptedClosed: 0,
    tlsSockets: 0,
    tlsSocketClosed: 0,
    serverRequests: 0,
    serverResponseClosed: 0,
    requestBytes: 0,
    responseBytes: 0,
    listenerClosed: false,
    failed: false,
  };
  const pending = new Set<Promise<void>>();
  const serverPending = new Set<Promise<void>>();
  const handles = new Set<Socket>();
  const requests = new Set<ClientRequest>();
  let stopping = false;
  let entry: Entry | undefined;
  function fail() {
    ledger.failed = true;
    for (const handle of handles) handle.destroy();
    for (const req of requests) req.destroy();
  }
  function observeClose(handle: Socket, closed: () => void, accepted = false) {
    handles.add(handle);
    let finish = () => {};
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    pending.add(done);
    if (accepted) serverPending.add(done);
    handle.once("close", () => {
      closed();
      handles.delete(handle);
      pending.delete(done);
      serverPending.delete(done);
      finish();
    });
    handle.on("error", () => {
      ledger.failed = true;
    });
  }
  const server = createServer(
    {
      key: Buffer.from(input.key),
      cert: Buffer.from(input.certificate),
      minVersion: "TLSv1.2",
    },
    (request, response) => {
      ledger.serverRequests++;
      response.once("close", () => {
        ledger.serverResponseClosed++;
      });
      void (async () => {
        if (
          stopping ||
          ledger.failed ||
          ledger.serverRequests > 2 ||
          request.headers.host !== "openrouter.ai" ||
          request.headers["accept-encoding"] !== "identity" ||
          !["/api/v1/auth/keys", "/api/v1/key"].includes(request.url ?? "")
        )
          throw invalid();
        const chunks: Buffer[] = [];
        let bytes = 0;
        for await (const chunk of request) {
          if (!Buffer.isBuffer(chunk)) throw invalid();
          bytes += chunk.length;
          if (bytes > 4096) throw invalid();
          chunks.push(chunk);
        }
        ledger.requestBytes += bytes;
        const result = await input.respond({
          method: request.method ?? "",
          path: request.url ?? "",
          body: Buffer.concat(chunks, bytes),
          authorization: request.headers.authorization,
        });
        if (
          result.body.byteLength > 64 * 1024 ||
          ledger.requestBytes + ledger.responseBytes + result.body.byteLength >
            256 * 1024
        )
          throw invalid();
        ledger.responseBytes += result.body.byteLength;
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": result.body.byteLength,
          "Content-Encoding": "identity",
          Connection: "close",
        });
        response.end(result.body);
      })().catch(() => {
        fail();
        request.destroy();
        response.destroy();
      });
    },
  );
  server.on("connection", (socket) => {
    ledger.accepted++;
    observeClose(
      socket,
      () => {
        ledger.acceptedClosed++;
      },
      true,
    );
    if (
      stopping ||
      ledger.accepted > 2 ||
      ledger.accepted - ledger.acceptedClosed > 1
    )
      fail();
  });
  server.on("secureConnection", (socket: TLSSocket) => {
    ledger.tlsSockets++;
    observeClose(
      socket,
      () => {
        ledger.tlsSocketClosed++;
      },
      true,
    );
    if (
      socket.servername !== "openrouter.ai" ||
      socket.remoteAddress !== "127.0.0.1" ||
      ledger.tlsSockets > 2 ||
      ledger.tlsSockets - ledger.tlsSocketClosed > 1
    )
      fail();
  });
  server.on("tlsClientError", fail);
  server.on("error", fail);
  server.once("close", () => {
    ledger.listenerClosed = true;
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (
    !address ||
    typeof address === "string" ||
    address.address !== "127.0.0.1" ||
    address.family !== "IPv4" ||
    address.port < 1 ||
    address.port > 65535
  ) {
    server.close();
    fail();
    throw invalid();
  }
  const issued: CredentialLocalTlsDial = { [brand]: true };
  const dial = Object.freeze(issued);
  const lookup: LookupFunction = (hostname, options, callback) => {
    void (async () => {
      await Promise.all([...serverPending]);
      const actual = server.address();
      if (
        hostname !== "openrouter.ai" ||
        stopping ||
        ledger.failed ||
        !entry?.live ||
        !actual ||
        typeof actual === "string" ||
        actual.port !== address.port ||
        actual.address !== address.address ||
        (options.family !== undefined &&
          options.family !== 0 &&
          options.family !== 4)
      )
        throw invalid();
      if (options.all === true)
        callback(null, [{ address: "127.0.0.1", family: 4 }]);
      else callback(null, "127.0.0.1", 4);
    })().catch(() => {
      callback(invalid(), "", 4);
    });
  };
  entry = {
    port: address.port,
    ca: Buffer.from(input.certificate),
    live: true,
    lookup,
    observe(req) {
      ledger.requests++;
      requests.add(req);
      if (ledger.requests > 2 || stopping || ledger.failed) {
        fail();
        throw invalid();
      }
      let finish = () => {};
      const done = new Promise<void>((resolve) => {
        finish = resolve;
      });
      pending.add(done);
      req.once("close", () => {
        ledger.requestClosed++;
        requests.delete(req);
        pending.delete(done);
        finish();
      });
      req.once("response", (response: IncomingMessage) => {
        let finishResponse = () => {};
        const ended = new Promise<void>((resolve) => {
          finishResponse = resolve;
        });
        pending.add(ended);
        response.once("close", () => {
          ledger.responseClosed++;
          pending.delete(ended);
          finishResponse();
        });
      });
      req.once("socket", (socket) => {
        ledger.clientSockets++;
        observeClose(socket, () => {
          ledger.clientSocketClosed++;
        });
        if (
          ledger.clientSockets > 2 ||
          ledger.clientSockets - ledger.clientSocketClosed > 1
        )
          fail();
      });
    },
  };
  registry.set(dial, entry);
  return {
    dial,
    ledger(): CredentialLocalTlsLedger {
      return { ...ledger };
    },
    async settled() {
      await Promise.all([...pending]);
      if (ledger.failed) throw invalid();
    },
    async close() {
      if (stopping) {
        await Promise.all([...pending]);
        if (!ledger.listenerClosed) throw invalid();
        return;
      }
      stopping = true;
      if (entry) entry.live = false;
      const closed = new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      for (const req of requests) req.destroy();
      for (const handle of handles) handle.destroy();
      await Promise.all([...pending]);
      await closed;
      if (!ledger.listenerClosed) throw invalid();
    },
  };
}
