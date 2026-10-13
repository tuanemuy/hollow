import type { ClientRequest, IncomingMessage } from "node:http";
import { type RequestOptions, request } from "node:https";
import type { Socket } from "node:net";
import type { SourceSink } from "@repo/core/application/llm/audioPorts";
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
type BackupAccess = Readonly<{ signal: AbortSignal; accessToken: string }>;
export type DriveBackupHttpInput = BackupAccess &
  (
    | Readonly<{ endpoint: "generate" }>
    | Readonly<{
        endpoint: "inspect";
        fileId: string;
        resourceKey: string | null;
      }>
    | Readonly<{
        endpoint: "start";
        body: string;
        bytes: number;
        folderId: string;
        resourceKey: string | null;
      }>
    | Readonly<{ endpoint: "query"; session: string; bytes: number }>
    | Readonly<{
        endpoint: "chunk";
        session: string;
        bytes: number;
        offset: number;
        chunk: Uint8Array;
      }>
  );
export type DriveBackupHttpReply = Readonly<{
  status: number;
  data: unknown;
  location: string | null;
  range: string | null;
}>;
type ExchangeInput = Readonly<{
  url: URL;
  method: "GET" | "POST" | "PUT";
  signal: AbortSignal;
  headers: Readonly<Record<string, string>>;
  body: string | Uint8Array | undefined;
  limit: number;
  headerLimit: number;
  timeoutMs: number;
  backup: boolean;
  resume: boolean;
  binary?: boolean;
  closeMs?: number;
  sink?: SourceSink;
}>;
export const DRIVE_SOURCE_FILE_FIELDS =
  "id,parents,size,sha256Checksum,trashed,explicitlyTrashed,version,mimeType,capabilities(canDownload)";
export const DRIVE_FILE_FIELDS =
  "id,name,mimeType,trashed,explicitlyTrashed,driveId,parents,capabilities(canAddChildren),resourceKey,shortcutDetails(targetId,targetMimeType,targetResourceKey),appProperties";
export const DRIVE_BACKUP_FILE_FIELDS =
  "id,parents,size,sha256Checksum,trashed,explicitlyTrashed,webViewLink,resourceKey,appProperties";
export const validDriveBackupSession = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 8192 &&
  !/\s/.test(value) &&
  /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?(?:uploadType=resumable&upload_id=[A-Za-z0-9_-]{1,4096}|upload_id=[A-Za-z0-9_-]{1,4096}&uploadType=resumable)$/.test(
    value,
  );
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
  async source(
    input: Readonly<{
      endpoint: "metadata" | "download";
      sink?: SourceSink;
      fileId: string;
      resourceKey: string | null;
      accessToken: string;
      bytes: number;
      signal: AbortSignal;
    }>,
  ) {
    if (
      input.signal.aborted ||
      !validDriveReference(input.fileId) ||
      !finiteHeader(input.accessToken) ||
      /\s/.test(input.accessToken) ||
      !Number.isSafeInteger(input.bytes) ||
      input.bytes < 1 ||
      input.bytes >
        (input.endpoint === "metadata" || input.sink ? 209_715_200 : 52_428_800)
    )
      throw new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
    const url = new URL(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}`,
    );
    url.searchParams.set(
      input.endpoint === "metadata" ? "fields" : "alt",
      input.endpoint === "metadata" ? DRIVE_SOURCE_FILE_FIELDS : "media",
    );
    const headers: Record<string, string> = {
      Accept:
        input.endpoint === "metadata"
          ? "application/json"
          : "application/octet-stream",
      "Accept-Encoding": "identity",
      Authorization: `Bearer ${input.accessToken}`,
    };
    if (input.resourceKey !== null) {
      if (!validDriveReference(input.resourceKey))
        throw new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
      headers["X-Goog-Drive-Resource-Keys"] =
        `${input.fileId}/${input.resourceKey}`;
    }
    return this.exchange({
      url,
      method: "GET",
      body: undefined,
      headers,
      signal: input.signal,
      limit: input.endpoint === "metadata" ? 65_536 : input.bytes,
      headerLimit: 16_384,
      timeoutMs: 30_000,
      backup: false,
      resume: false,
      binary: input.endpoint === "download",
      closeMs: 5000,
      ...(input.sink ? { sink: input.sink } : {}),
    });
  }
  async read(input: Input): Promise<
    Readonly<{
      status: number;
      data: unknown;
      cacheControl: string | null;
      age: string | null;
    }>
  > {
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
    const reply = await this.exchange({
      url,
      signal: input.signal,
      method: input.body === undefined ? "GET" : "POST",
      headers,
      body: input.body,
      limit: input.endpoint === "certificates" ? 262_144 : 65_536,
      headerLimit: 8192,
      timeoutMs: this.timeoutMs,
      backup: false,
      resume: false,
    });
    return {
      status: reply.status,
      data: reply.data,
      cacheControl: reply.cacheControl,
      age: reply.age,
    };
  }
  async backup(input: DriveBackupHttpInput): Promise<DriveBackupHttpReply> {
    const notSent = () =>
      new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
    if (
      input.signal.aborted ||
      !finiteHeader(input.accessToken) ||
      /\s/.test(input.accessToken)
    )
      throw notSent();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Accept-Encoding": "identity",
      Authorization: `Bearer ${input.accessToken}`,
    };
    let url: URL;
    let method: ExchangeInput["method"] = "GET";
    let body: string | Uint8Array | undefined;
    if (input.endpoint === "generate") {
      url = new URL(
        "https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files&fields=ids",
      );
    } else if (input.endpoint === "inspect") {
      if (!validDriveReference(input.fileId) || /\s/.test(input.fileId))
        throw notSent();
      url = new URL(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}`,
      );
      url.searchParams.set("supportsAllDrives", "true");
      url.searchParams.set("fields", DRIVE_BACKUP_FILE_FIELDS);
    } else {
      if (
        !Number.isSafeInteger(input.bytes) ||
        input.bytes < 1 ||
        input.bytes > 209_715_200
      )
        throw notSent();
      if (input.endpoint === "start") {
        if (
          !validDriveReference(input.folderId) ||
          /\s/.test(input.folderId) ||
          Buffer.byteLength(input.body) > 65_536
        )
          throw notSent();
        url = new URL(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
        );
        url.searchParams.set("supportsAllDrives", "true");
        url.searchParams.set("fields", DRIVE_BACKUP_FILE_FIELDS);
        method = "POST";
        body = input.body;
        headers["Content-Type"] = "application/json; charset=UTF-8";
        headers["X-Upload-Content-Type"] = "application/octet-stream";
        headers["X-Upload-Content-Length"] = String(input.bytes);
      } else {
        if (!validDriveBackupSession(input.session)) throw notSent();
        url = new URL(input.session);
        method = "PUT";
        headers["Content-Type"] = "application/octet-stream";
        if (input.endpoint === "query") {
          body = "";
          headers["Content-Range"] = `bytes */${input.bytes}`;
        } else {
          if (
            !Number.isSafeInteger(input.offset) ||
            input.offset < 0 ||
            input.chunk.byteLength < 1 ||
            input.chunk.byteLength > 1_048_576 ||
            input.offset > input.bytes - input.chunk.byteLength ||
            (input.offset + input.chunk.byteLength !== input.bytes &&
              input.chunk.byteLength % 262_144 !== 0)
          )
            throw notSent();
          body = input.chunk;
          headers["Content-Range"] =
            `bytes ${input.offset}-${input.offset + body.byteLength - 1}/${input.bytes}`;
        }
      }
    }
    if (
      (input.endpoint === "start" || input.endpoint === "inspect") &&
      input.resourceKey !== null
    ) {
      if (
        !validDriveReference(input.resourceKey) ||
        /\s/.test(input.resourceKey)
      )
        throw notSent();
      const id = input.endpoint === "start" ? input.folderId : input.fileId;
      headers["X-Goog-Drive-Resource-Keys"] = `${id}/${input.resourceKey}`;
    }
    if (body !== undefined)
      headers["Content-Length"] = String(Buffer.byteLength(body));
    if (
      Buffer.byteLength(
        Object.entries(headers)
          .map(([k, v]) => `${k}: ${v}\r\n`)
          .join(""),
      ) +
        512 >
      16_384
    )
      throw notSent();
    const reply = await this.exchange({
      url,
      method,
      body,
      headers,
      signal: input.signal,
      limit: 65_536,
      headerLimit: 16_384,
      timeoutMs: 30_000,
      backup: true,
      resume: input.endpoint === "query" || input.endpoint === "chunk",
    });
    return {
      status: reply.status,
      data: reply.data,
      location: reply.location,
      range: reply.range,
    };
  }
  private async exchange(input: ExchangeInput) {
    const fail = () => new DriveTransportError();
    const release = this.execution.register(input.signal);
    let response: IncomingMessage | undefined;
    let socket: Socket | undefined;
    const closures: Promise<void>[] = [];
    const chunks: Buffer[] = [];
    let pendingWrite = Promise.resolve();
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
    const limit = input.limit;
    let req: ClientRequest;
    try {
      req = this.factory(
        input.url,
        {
          method: input.method,
          port: 443,
          agent: false,
          maxHeaderSize: input.headerLimit,
          headers: input.headers,
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
          const uniqueResumeHeaders = new Set<string>();
          let duplicateResumeHeader = false;
          if (input.backup) {
            for (let i = 0; i < incoming.rawHeaders.length; i += 2) {
              const name = incoming.rawHeaders[i]?.toLowerCase();
              if (name !== "location" && name !== "range") continue;
              if (uniqueResumeHeaders.has(name)) duplicateResumeHeader = true;
              uniqueResumeHeaders.add(name);
            }
          }
          if (
            done ||
            input.signal.aborted ||
            Buffer.byteLength(incoming.rawHeaders.join("\r\n")) >
              input.headerLimit ||
            duplicateResumeHeader ||
            (encoding !== undefined && encoding !== "identity") ||
            (size !== undefined &&
              (!/^\d+$/.test(size) ||
                Number(size) >
                  (incoming.statusCode === 200
                    ? limit
                    : Math.min(limit, 256 * 1024)))) ||
            !incoming.statusCode ||
            incoming.statusCode < 200 ||
            (incoming.statusCode >= 300 &&
              incoming.statusCode < 400 &&
              !(input.resume && incoming.statusCode === 308))
          ) {
            rejectBody();
            incoming.destroy();
            return;
          }
          incoming.on("data", (chunk: Buffer) => {
            if (done) return;
            if (
              bytes + chunk.length >
              (incoming.statusCode === 200
                ? limit
                : Math.min(limit, 256 * 1024))
            ) {
              rejectBody();
              incoming.destroy();
              return;
            }
            bytes += chunk.length;
            if (input.sink && incoming.statusCode === 200) {
              incoming.pause();
              pendingWrite = pendingWrite.then(async () => {
                if (input.signal.aborted) throw fail();
                await input.sink!.write(chunk);
                if (!done && !input.signal.aborted) incoming.resume();
              });
              void pendingWrite.catch(() => {
                rejectBody();
                incoming.destroy();
              });
            } else chunks.push(chunk);
          });
          incoming.once("end", () => {
            void pendingWrite.then(() => {
              if (!done) {
                done = true;
                resolve();
              }
            }, rejectBody);
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
    const timer = setTimeout(abort, input.timeoutMs);
    try {
      if (input.signal.aborted) abort();
      else req.end(input.body);
      await body;
    } finally {
      clearTimeout(timer);
      response?.destroy();
      req.destroy();
      socket?.destroy();
      const closed = (async () => {
        await requestClosed;
        response?.destroy();
        socket?.destroy();
        await Promise.all(closures);
        input.signal.removeEventListener("abort", abort);
        release();
      })();
      if (input.closeMs === undefined) await closed;
      else {
        let closeTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            closed,
            new Promise<never>((_, no) => {
              closeTimer = setTimeout(() => no(fail()), input.closeMs);
            }),
          ]);
        } finally {
          clearTimeout(closeTimer);
        }
      }
    }
    if (input.signal.aborted || !response) throw fail();
    try {
      const data: unknown =
        input.sink && response.statusCode === 200
          ? null
          : input.binary
            ? Buffer.concat(chunks, bytes)
            : input.backup && bytes === 0
              ? null
              : parseDriveResponseJson(
                  Buffer.concat(chunks, bytes),
                  response.statusCode!,
                );
      return {
        status: response.statusCode!,
        data,
        location:
          typeof response.headers.location === "string"
            ? response.headers.location
            : null,
        range:
          typeof response.headers.range === "string"
            ? response.headers.range
            : null,
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
