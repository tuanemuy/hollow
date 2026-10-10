import type { ClientRequest, IncomingMessage } from "node:http";
import { type RequestOptions, request } from "node:https";
import type { Socket } from "node:net";
import { OpenRouterProviderError } from "@repo/core/application/integration/openRouter/ports";
import {
  type CredentialLocalTlsDial,
  credentialLocalTlsOptions,
  observeCredentialLocalTlsRequest,
} from "../auth/credentialLocalTlsDial";
import { nativeCredentialTransport } from "../auth/credentialRuntimeOwnership";

export type OpenRouterRequestFactory = (
  url: URL,
  options: RequestOptions,
  onResponse: (response: IncomingMessage) => void,
) => ClientRequest;

type ControlRequest =
  | Readonly<{ kind: "exchange"; body: string }>
  | Readonly<{ kind: "metadata"; credential: string }>
  | Readonly<{ kind: "models"; offset: number; remainingBytes: number }>;

const unavailable = () => new OpenRouterProviderError("OPENROUTER_UNAVAILABLE");

export class NodeOpenRouterHttp {
  readonly credentialTransport;
  constructor(
    private readonly factory: OpenRouterRequestFactory = request,
    private readonly localDial?: CredentialLocalTlsDial,
  ) {
    if (localDial && factory !== request) throw unavailable();
    this.credentialTransport = nativeCredentialTransport(factory);
  }

  async read(
    input: ControlRequest,
    signal: AbortSignal,
  ): Promise<Readonly<{ data: unknown; bytes: number }>> {
    if (signal.aborted) throw unavailable();
    const url = new URL(
      input.kind === "exchange"
        ? "https://openrouter.ai/api/v1/auth/keys"
        : input.kind === "metadata"
          ? "https://openrouter.ai/api/v1/key"
          : "https://openrouter.ai/api/v1/models",
    );
    if (input.kind === "models") {
      if (
        !Number.isSafeInteger(input.offset) ||
        input.offset < 0 ||
        input.offset > 5000 ||
        !Number.isSafeInteger(input.remainingBytes) ||
        input.remainingBytes <= 0 ||
        input.remainingBytes > 8 * 1024 * 1024
      )
        throw unavailable();
      url.searchParams.set("output_modalities", "all");
      url.searchParams.set("offset", String(input.offset));
      url.searchParams.set("limit", "500");
    }
    const limit =
      input.kind === "models"
        ? Math.min(2 * 1024 * 1024, input.remainingBytes)
        : 64 * 1024;
    const body = input.kind === "exchange" ? input.body : null;
    let response: IncomingMessage | undefined;
    let socket: Socket | undefined;
    const closures: Promise<void>[] = [];
    const chunks: Buffer[] = [];
    let bytes = 0;
    let done = false;
    let succeed = () => {};
    let reject = (_error: OpenRouterProviderError = unavailable()) => {};
    const completed = new Promise<void>((resolve, rejectPromise) => {
      succeed = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      reject = (error = unavailable()) => {
        if (!done) {
          done = true;
          rejectPromise(error);
        }
      };
    });
    void completed.catch(() => {});
    const dialOptions = this.localDial
      ? credentialLocalTlsOptions(this.localDial)
      : undefined;
    const release = this.credentialTransport?.register(signal);
    const req = this.factory(
      url,
      {
        method: input.kind === "exchange" ? "POST" : "GET",
        port: 443,
        ...dialOptions,
        agent: false,
        headers: {
          ...(this.localDial ? { Host: "openrouter.ai" } : {}),
          Accept: "application/json",
          "Accept-Encoding": "identity",
          ...(body === null
            ? {}
            : {
                "Content-Type": "application/json",
                "Content-Length": String(Buffer.byteLength(body)),
              }),
          ...(input.kind === "metadata"
            ? { Authorization: `Bearer ${input.credential}` }
            : {}),
        },
      },
      (incoming) => {
        response = incoming;
        closures.push(
          new Promise<void>((resolve) => incoming.once("close", resolve)),
        );
        incoming.on("error", () => reject());
        incoming.once("aborted", () => reject());
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
          const code =
            !signal.aborted &&
            incoming.statusCode === 401 &&
            input.kind === "metadata"
              ? "OPENROUTER_CREDENTIAL_INVALID"
              : !signal.aborted &&
                  input.kind === "exchange" &&
                  [400, 401, 403].includes(incoming.statusCode ?? 0)
                ? "OPENROUTER_PROVIDER_REJECTED"
                : "OPENROUTER_UNAVAILABLE";
          reject(new OpenRouterProviderError(code));
          incoming.destroy();
          return;
        }
        incoming.on("data", (chunk: Buffer) => {
          if (done) return;
          if (bytes + chunk.byteLength > limit) {
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
    if (this.localDial) observeCredentialLocalTlsRequest(this.localDial, req);
    const requestClosed = new Promise<void>((resolve) =>
      req.once("close", resolve),
    );
    req.on("error", () => reject());
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
      release?.();
    }
    if (signal.aborted || !response) throw unavailable();
    const data: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(chunks, bytes),
      ),
    );
    return { data, bytes };
  }
}
