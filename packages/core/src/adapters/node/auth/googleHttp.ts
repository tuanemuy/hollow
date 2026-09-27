import type { ClientRequest, IncomingMessage } from "node:http";
import { type RequestOptions, request } from "node:https";
import type { Socket } from "node:net";

export type GoogleRequestFactory = (
  url: URL,
  options: RequestOptions,
  onResponse: (response: IncomingMessage) => void,
) => ClientRequest;

type Endpoint = "token" | "certificates";
const endpoints = {
  token: { url: "https://oauth2.googleapis.com/token", limit: 64 * 1024 },
  certificates: {
    url: "https://www.googleapis.com/oauth2/v1/certs",
    limit: 256 * 1024,
  },
} as const;
const failed = () => Error("Google authentication transport failed");

export class NodeGoogleHttp {
  constructor(private readonly factory: GoogleRequestFactory = request) {}

  async read(
    endpoint: Endpoint,
    body: string | null,
    signal: AbortSignal,
  ): Promise<
    Readonly<{ data: unknown; cacheControl: string | null; age: string | null }>
  > {
    if (signal.aborted) throw failed();
    const target = endpoints[endpoint];
    let response: IncomingMessage | undefined;
    let socket: Socket | undefined;
    const closures: Promise<void>[] = [];
    const chunks: Buffer[] = [];
    let bytes = 0;
    let done = false;
    let succeed: () => void = () => {};
    let reject: () => void = () => {};
    const completed = new Promise<void>((resolve, rejectPromise) => {
      succeed = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      reject = () => {
        if (!done) {
          done = true;
          rejectPromise(failed());
        }
      };
    });
    void completed.catch(() => {});
    const req = this.factory(
      new URL(target.url),
      {
        method: endpoint === "token" ? "POST" : "GET",
        port: 443,
        agent: false,
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "identity",
          ...(body === null
            ? {}
            : {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": String(Buffer.byteLength(body)),
              }),
        },
      },
      (incoming) => {
        response = incoming;
        closures.push(
          new Promise<void>((resolve) => incoming.once("close", resolve)),
        );
        incoming.on("error", reject);
        incoming.once("aborted", reject);
        incoming.once("close", () => {
          if (!incoming.complete) reject();
        });
        const encoding = incoming.headers["content-encoding"];
        if (
          done ||
          signal.aborted ||
          incoming.statusCode !== 200 ||
          (encoding !== undefined && encoding.toLowerCase() !== "identity")
        ) {
          reject();
          incoming.destroy();
          return;
        }
        incoming.on("data", (chunk: Buffer) => {
          if (done) return;
          if (bytes + chunk.byteLength > target.limit) {
            reject();
            incoming.destroy();
            return;
          }
          bytes += chunk.byteLength;
          chunks.push(chunk);
        });
        incoming.once("end", succeed);
      },
    );
    const requestClosed = new Promise<void>((resolve) =>
      req.once("close", resolve),
    );
    req.on("error", reject);
    req.once("close", () => {
      if (!response?.complete) reject();
    });
    req.once("socket", (owned) => {
      socket = owned;
      closures.push(
        new Promise<void>((resolve) => owned.once("close", () => resolve())),
      );
      if (signal.aborted || done) owned.destroy();
    });
    const abort = () => {
      reject();
      response?.destroy();
      req.destroy();
      socket?.destroy();
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      if (signal.aborted) abort();
      else req.end(body ?? undefined);
      await completed;
    } finally {
      response?.destroy();
      req.destroy();
      socket?.destroy();
      await requestClosed;
      response?.destroy();
      socket?.destroy();
      await Promise.all(closures);
      signal.removeEventListener("abort", abort);
    }
    if (signal.aborted || !response) throw failed();
    const cache = response.headers["cache-control"];
    const age = response.headers.age;
    const data: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(chunks, bytes),
      ),
    );
    return {
      data,
      cacheControl: typeof cache === "string" ? cache : null,
      age: typeof age === "string" ? age : null,
    };
  }
}
