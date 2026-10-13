import type { ClientRequest, IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
import type { Socket } from "node:net";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import { LLM_LIMITS, type LlmFailure } from "@repo/core/domain/llm/entity";
export type LlmRequestFactory = (
  url: URL,
  options: RequestOptions,
  onResponse: (response: IncomingMessage) => void,
) => ClientRequest;
const preflightError = (code: LlmFailure) =>
  new LlmOperationError(code, "not-sent", true);
const responseError = (code: LlmFailure) =>
  new LlmOperationError(code, "possible", true);
const requestResourceAdmission = (bytes: number) =>
  Number.isSafeInteger(bytes) && bytes > 0 && bytes <= LLM_LIMITS.requestBytes;
function httpFailure(status: number | undefined): LlmFailure {
  if (status === 401) return "LLM_CREDENTIAL_INVALID";
  if (status === 402) return "LLM_CREDIT_REQUIRED";
  if (status === 429) return "LLM_RATE_LIMIT";
  if (status === 400 || status === 404 || status === 422)
    return "LLM_MODEL_INCOMPATIBLE";
  return "LLM_UNAVAILABLE";
}

export async function postLlm<T>(
  factory: LlmRequestFactory,
  url: URL,
  body: string,
  credential: string,
  signal: AbortSignal,
  decode: (bytes: Buffer) => T,
  deadlineMs: number = LLM_LIMITS.dispatchMs,
): Promise<T> {
  let req: ClientRequest | undefined;
  let response: IncomingMessage | undefined;
  let socket: Socket | undefined;
  let result: T | undefined;
  let operationError: LlmOperationError | undefined;
  let ownershipUnknown = false;
  let requestClosed: Promise<void> | undefined;
  const closures: Promise<void>[] = [];
  const chunks: Buffer[] = [];
  let bytes = 0;
  let completed = false;
  let resolveRead = () => {};
  let rejectRead = (_code: LlmFailure) => {};
  const read = new Promise<void>((resolve, reject) => {
    resolveRead = () => {
      if (!completed) {
        completed = true;
        resolve();
      }
    };
    rejectRead = (code) => {
      if (!completed) {
        completed = true;
        reject(responseError(code));
      }
    };
  });
  void read.catch(() => {});
  const controller = new AbortController();
  let cancelled = false;
  const abort = () => {
    cancelled = true;
    controller.abort();
    rejectRead("LLM_DELIVERY_UNKNOWN");
    response?.destroy();
    req?.destroy();
    socket?.destroy();
  };
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, deadlineMs);
  try {
    if (signal.aborted) throw preflightError("LLM_UNAVAILABLE");
    if (!requestResourceAdmission(Buffer.byteLength(body)))
      throw preflightError("LLM_RESOURCE_LIMIT");
    req = factory(
      url,
      {
        method: "POST",
        port: 443,
        agent: false,
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "identity",
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(body)),
          Authorization: `Bearer ${credential}`,
        },
      },
      (incoming) => {
        response = incoming;
        closures.push(
          new Promise<void>((resolve) => incoming.once("close", resolve)),
        );
        incoming.on("error", () => rejectRead("LLM_DELIVERY_UNKNOWN"));
        incoming.once("aborted", () => rejectRead("LLM_DELIVERY_UNKNOWN"));
        incoming.once("close", () => {
          if (!incoming.complete) rejectRead("LLM_DELIVERY_UNKNOWN");
        });
        const encoding = incoming.headers["content-encoding"];
        if (
          completed ||
          controller.signal.aborted ||
          incoming.statusCode !== 200 ||
          (encoding !== undefined && encoding.toLowerCase() !== "identity")
        ) {
          rejectRead(
            controller.signal.aborted
              ? "LLM_DELIVERY_UNKNOWN"
              : incoming.statusCode !== 200
                ? httpFailure(incoming.statusCode)
                : "LLM_RESPONSE_INVALID",
          );
          incoming.destroy();
          return;
        }
        incoming.on("data", (chunk: Buffer) => {
          if (completed) return;
          if (bytes + chunk.byteLength > LLM_LIMITS.responseBytes) {
            rejectRead("LLM_RESOURCE_LIMIT");
            incoming.destroy();
            return;
          }
          bytes += chunk.byteLength;
          chunks.push(chunk);
        });
        incoming.once("end", resolveRead);
      },
    );
    requestClosed = new Promise<void>((resolve) => req?.once("close", resolve));
    req.on("error", () => rejectRead("LLM_DELIVERY_UNKNOWN"));
    req.once("close", () => {
      if (!response?.complete) rejectRead("LLM_DELIVERY_UNKNOWN");
    });
    req.once("socket", (owned) => {
      socket = owned;
      closures.push(
        new Promise<void>((resolve) => owned.once("close", () => resolve())),
      );
      if (completed || controller.signal.aborted) owned.destroy();
    });
    if (signal.aborted || controller.signal.aborted) abort();
    else req.end(body);
    await read;
    if (signal.aborted || controller.signal.aborted)
      throw responseError("LLM_DELIVERY_UNKNOWN");
    result = decode(Buffer.concat(chunks, bytes));
  } catch (error) {
    operationError =
      error instanceof LlmOperationError
        ? error
        : req
          ? responseError("LLM_DELIVERY_UNKNOWN")
          : preflightError("LLM_UNAVAILABLE");
  } finally {
    try {
      response?.destroy();
      req?.destroy();
      socket?.destroy();
      if (requestClosed) await requestClosed;
      response?.destroy();
      socket?.destroy();
      await Promise.all(closures);
    } catch {
      ownershipUnknown = true;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      controller.abort();
    }
  }
  if (ownershipUnknown)
    throw new LlmOperationError(
      "LLM_OWNERSHIP_UNKNOWN",
      req ? "possible" : "not-sent",
      false,
    );
  if (operationError) throw operationError;
  if (signal.aborted || cancelled) throw responseError("LLM_DELIVERY_UNKNOWN");
  if (!result) throw responseError("LLM_RESPONSE_INVALID");
  return result;
}
