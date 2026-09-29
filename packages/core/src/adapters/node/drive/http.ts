import type { ClientRequest, IncomingMessage } from "node:http";
import { type RequestOptions, request } from "node:https";
import type { Socket } from "node:net";
import { DriveTransportError, type NodeDriveExecution } from "./execution";

export type DriveRequestFactory = (
  url: URL,
  options: RequestOptions,
  response: (value: IncomingMessage) => void,
) => ClientRequest;
type Input = Readonly<{
  endpoint: "token" | "certificates" | "generate" | "inspect" | "create";
  signal: AbortSignal;
  body?: string;
  accessToken?: string;
  fileId?: string;
  resourceKey?: string | null;
}>;
export const DRIVE_FILE_FIELDS =
  "id,name,mimeType,trashed,explicitlyTrashed,driveId,parents,capabilities(canAddChildren),resourceKey,shortcutDetails(targetId,targetMimeType,targetResourceKey),appProperties";
const finiteHeader = (value: string) =>
  value.length > 0 &&
  Buffer.byteLength(value) <= 4096 &&
  /^[\x21-\x7e]+$/.test(value);
export const validDriveReference = (value: unknown): value is string =>
  typeof value === "string" &&
  Buffer.byteLength(value) >= 1 &&
  Buffer.byteLength(value) <= 1024 &&
  /^[\x21-\x7e]+$/.test(value) &&
  !/[,/]/.test(value);

/** Reject duplicate keys before JSON.parse can erase their identity. */
export function parseDriveResponseJson(
  bytes: Uint8Array,
  status: number,
): unknown {
  if (bytes.byteLength > 262_144) throw new DriveTransportError();
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DriveTransportError();
  }
  try {
    const stack: { keys: Set<string> | null; key: boolean }[] = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") {
        stack.push({ keys: new Set(), key: true });
        if (stack.length > 32) throw new DriveTransportError();
      } else if (ch === "[") {
        stack.push({ keys: null, key: false });
        if (stack.length > 32) throw new DriveTransportError();
      } else if (ch === "}" || ch === "]") stack.pop();
      else if (ch === ",") {
        const frame = stack.at(-1);
        if (frame?.keys) frame.key = true;
      } else if (ch === ":") {
        const frame = stack.at(-1);
        if (frame) frame.key = false;
      } else if (ch === '"') {
        const start = i;
        for (i++; i < text.length; i++) {
          if (text[i] === "\\") i++;
          else if (text[i] === '"') break;
        }
        if (i >= text.length) throw new DriveTransportError();
        const frame = stack.at(-1);
        if (frame?.keys && frame.key) {
          const name = JSON.parse(text.slice(start, i + 1)) as string;
          if (frame.keys.has(name)) throw new DriveTransportError();
          frame.keys.add(name);
        }
      }
    }
    return JSON.parse(text) as unknown;
  } catch {
    if (status >= 400 && status <= 599) return null;
    throw new DriveTransportError();
  }
}
export class NodeDriveHttp {
  constructor(
    private readonly execution: NodeDriveExecution,
    private readonly factory: DriveRequestFactory = request,
    private readonly timeoutMs = 10_000,
  ) {}
  async read(input: Input): Promise<
    Readonly<{
      status: number;
      data: unknown;
      cacheControl: string | null;
      age: string | null;
    }>
  > {
    const fail = () => new DriveTransportError();
    if (
      input.signal.aborted ||
      (input.body !== undefined && Buffer.byteLength(input.body) > 16_384)
    )
      throw new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
    const url = new URL(
      input.endpoint === "token"
        ? "https://oauth2.googleapis.com/token"
        : input.endpoint === "certificates"
          ? "https://www.googleapis.com/oauth2/v1/certs"
          : input.endpoint === "generate"
            ? "https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files&fields=ids"
            : "https://www.googleapis.com/drive/v3/files",
    );
    if (input.endpoint === "inspect") {
      if (!validDriveReference(input.fileId))
        throw new DriveTransportError("DRIVE_FOLDER_INVALID", "not-sent");
      url.pathname += `/${encodeURIComponent(input.fileId)}`;
      url.searchParams.set("supportsAllDrives", "true");
      url.searchParams.set("fields", DRIVE_FILE_FIELDS);
    } else if (input.endpoint === "create")
      url.searchParams.set("fields", "id");
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Accept-Encoding": "identity",
    };
    if (input.accessToken !== undefined) {
      if (!finiteHeader(input.accessToken))
        throw new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
      headers.Authorization = `Bearer ${input.accessToken}`;
    }
    if (input.resourceKey != null) {
      if (
        !validDriveReference(input.resourceKey) ||
        !validDriveReference(input.fileId)
      )
        throw new DriveTransportError("DRIVE_FOLDER_INVALID", "not-sent");
      headers["X-Goog-Drive-Resource-Keys"] =
        `${input.fileId}/${input.resourceKey}`;
    }
    if (input.body !== undefined) {
      headers["Content-Type"] =
        input.endpoint === "token"
          ? "application/x-www-form-urlencoded"
          : "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(input.body));
    }
    if (
      Buffer.byteLength(
        Object.entries(headers)
          .map(([k, v]) => `${k}: ${v}\r\n`)
          .join(""),
      ) +
        512 >
      8192
    )
      throw new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
    const release = this.execution.register(input.signal);
    let response: IncomingMessage | undefined;
    let socket: Socket | undefined;
    const closures: Promise<void>[] = [];
    const chunks: Buffer[] = [];
    let bytes = 0;
    let done = false;
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const body = new Promise<void>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    body.catch(() => {});
    const rejectBody = () => {
      if (!done) {
        done = true;
        reject(fail());
      }
    };
    const limit = input.endpoint === "certificates" ? 262_144 : 65_536;
    let req: ClientRequest;
    try {
      req = this.factory(
        url,
        {
          method: input.body === undefined ? "GET" : "POST",
          port: 443,
          agent: false,
          maxHeaderSize: 8192,
          headers,
        },
        (incoming) => {
          response = incoming;
          closures.push(
            new Promise<void>((yes) => incoming.once("close", yes)),
          );
          incoming.on("error", rejectBody);
          incoming.once("aborted", rejectBody);
          incoming.once("close", () => {
            if (!incoming.complete) rejectBody();
          });
          const encoding = incoming.headers["content-encoding"];
          const size = incoming.headers["content-length"];
          if (
            done ||
            input.signal.aborted ||
            Buffer.byteLength(incoming.rawHeaders.join("\r\n")) > 8192 ||
            (encoding !== undefined && encoding !== "identity") ||
            (size !== undefined &&
              (!/^\d+$/.test(size) || Number(size) > limit)) ||
            !incoming.statusCode ||
            incoming.statusCode < 200 ||
            (incoming.statusCode >= 300 && incoming.statusCode < 400)
          ) {
            rejectBody();
            incoming.destroy();
            return;
          }
          incoming.on("data", (chunk: Buffer) => {
            if (done) return;
            if (bytes + chunk.length > limit) {
              rejectBody();
              incoming.destroy();
              return;
            }
            bytes += chunk.length;
            chunks.push(chunk);
          });
          incoming.once("end", () => {
            if (!done) {
              done = true;
              resolve();
            }
          });
        },
      );
    } catch {
      // A throwing factory cannot prove it created no native resources.
      throw fail();
    }
    const requestClosed = new Promise<void>((yes) => req.once("close", yes));
    req.on("error", rejectBody);
    req.once("close", () => {
      if (!response?.complete) rejectBody();
    });
    req.once("socket", (owned) => {
      socket = owned;
      closures.push(
        new Promise<void>((yes) => owned.once("close", () => yes())),
      );
      if (input.signal.aborted) owned.destroy();
    });
    const abort = () => {
      rejectBody();
      response?.destroy();
      req.destroy();
      socket?.destroy();
    };
    input.signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, this.timeoutMs);
    try {
      if (input.signal.aborted) abort();
      else req.end(input.body);
      await body;
    } finally {
      clearTimeout(timer);
      response?.destroy();
      req.destroy();
      socket?.destroy();
      await requestClosed;
      response?.destroy();
      socket?.destroy();
      await Promise.all(closures);
      input.signal.removeEventListener("abort", abort);
      release();
    }
    if (input.signal.aborted || !response) throw fail();
    try {
      const data: unknown = parseDriveResponseJson(
        Buffer.concat(chunks, bytes),
        response.statusCode!,
      );
      return {
        status: response.statusCode!,
        data,
        cacheControl:
          typeof response.headers["cache-control"] === "string"
            ? response.headers["cache-control"]
            : null,
        age:
          typeof response.headers.age === "string"
            ? response.headers.age
            : null,
      };
    } catch {
      throw fail();
    }
  }
}
