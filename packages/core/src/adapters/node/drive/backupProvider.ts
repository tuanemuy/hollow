import type {
  DriveBackupFile,
  DriveBackupProvider,
  DriveBackupReceived,
} from "@repo/core/application/integration/drive/backup/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveBackupFailure } from "@repo/core/domain/integration/driveBackup";
import { z } from "zod";
import { DriveTransportError } from "./execution";
import {
  type DriveBackupHttpReply,
  type NodeDriveHttp,
  validDriveBackupSession,
  validDriveReference,
} from "./http";

export const DRIVE_BACKUP_MARKER = "hollowBackupTarget";
const reference = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[A-Za-z0-9_-]+$/)
  .refine((value) => !/\s/.test(value));
const validResourceKey = (value: unknown): value is string =>
  validDriveReference(value) && !/\s/.test(value);
const validMarker = (value: string) =>
  /^[A-Za-z0-9_-]{1,100}$/.test(value) && !/\s/.test(value);
const metadata = z.object({
  id: reference,
  parents: z.array(reference).max(100),
  size: z
    .string()
    .regex(/^(0|[1-9][0-9]{0,15})$/)
    .refine((value) => !/\s/.test(value))
    .transform(Number)
    .refine(Number.isSafeInteger),
  sha256Checksum: z
    .string()
    .length(64)
    .regex(/^[A-Fa-f0-9]{64}$/)
    .optional(),
  trashed: z.boolean(),
  explicitlyTrashed: z.boolean().optional(),
  webViewLink: z.string().max(4096).optional(),
  resourceKey: z.string().refine(validResourceKey).optional(),
  appProperties: z.record(z.string().max(256), z.string().max(4096)).optional(),
});
const reasons = z.object({
  error: z.object({
    errors: z
      .array(z.object({ reason: z.string().max(256) }))
      .max(32)
      .optional(),
  }),
});
const failure = (code: DriveBackupFailure) =>
  new BusinessRuleError(
    code,
    code === "DRIVE_BACKUP_QUOTA"
      ? "Driveの保存容量を確認してください。"
      : code === "DRIVE_BACKUP_RATE_LIMIT"
        ? "Driveが混み合っています。時間をおいて再試行してください。"
        : code === "DRIVE_BACKUP_DENIED"
          ? "Driveの保存先へのアクセス権限を確認してください。"
          : code === "DRIVE_BACKUP_CHANGED"
            ? "Drive上のバックアップ内容を確認できません。"
            : code === "DRIVE_BACKUP_FOLDER_UNAVAILABLE"
              ? "Driveの保存先を確認してください。"
              : "Driveのバックアップ処理を確認できません。",
  );
const validBytes = (value: number) =>
  Number.isSafeInteger(value) && value > 0 && value <= 209_715_200;

function requireAccess(reply: DriveBackupHttpReply) {
  if (reply.status === 401)
    throw new DriveTransportError(
      "DRIVE_PROVIDER_REJECTED",
      "unknown",
      "access-token",
    );
  if (reply.status === 429) throw failure("DRIVE_BACKUP_RATE_LIMIT");
  if (reply.status === 403) {
    const parsed = reasons.safeParse(reply.data);
    const codes = parsed.success
      ? (parsed.data.error.errors?.map((value) => value.reason) ?? [])
      : [];
    if (codes.includes("storageQuotaExceeded"))
      throw failure("DRIVE_BACKUP_QUOTA");
    if (
      codes.some((code) =>
        [
          "rateLimitExceeded",
          "userRateLimitExceeded",
          "sharingRateLimitExceeded",
        ].includes(code),
      )
    )
      throw failure("DRIVE_BACKUP_RATE_LIMIT");
    throw failure("DRIVE_BACKUP_DENIED");
  }
}

function parseFile(data: unknown): DriveBackupFile {
  const parsed = metadata.safeParse(data);
  if (!parsed.success) throw failure("DRIVE_BACKUP_CHANGED");
  const file = parsed.data;
  let webViewLink: string | null = null;
  if (file.webViewLink !== undefined) {
    const prefix = `https://drive.google.com/file/d/${file.id}/view`;
    if (
      file.webViewLink === prefix ||
      file.webViewLink === `${prefix}?usp=drivesdk` ||
      file.webViewLink === `${prefix}?usp=sharing`
    )
      webViewLink = file.webViewLink;
  }
  const marker = file.appProperties?.[DRIVE_BACKUP_MARKER] ?? null;
  if (marker !== null && !validMarker(marker))
    throw failure("DRIVE_BACKUP_CHANGED");
  return {
    id: file.id,
    parents: file.parents,
    marker,
    bytes: file.size,
    sha256: file.sha256Checksum?.toLowerCase() ?? null,
    trashed: file.trashed || file.explicitlyTrashed === true,
    webViewLink,
    resourceKey: file.resourceKey ?? null,
  };
}

function received(
  reply: DriveBackupHttpReply,
  bytes: number,
): DriveBackupReceived {
  requireAccess(reply);
  if (reply.status === 404) return { kind: "session-expired" };
  if (reply.status === 409) return { kind: "conflict" };
  if (reply.status === 408 || reply.status >= 500) return { kind: "unknown" };
  if (reply.status === 308) {
    if (reply.range === null) return { kind: "incomplete", offset: 0 };
    const match = /^bytes=0-(0|[1-9][0-9]{0,8})$/.exec(reply.range);
    if (!match || match[0] !== reply.range)
      throw failure("DRIVE_BACKUP_UNKNOWN");
    const offset = Number(match[1]) + 1;
    if (!Number.isSafeInteger(offset) || offset > bytes)
      throw failure("DRIVE_BACKUP_UNKNOWN");
    return { kind: "incomplete", offset };
  }
  if (reply.status === 200 || reply.status === 201)
    return reply.data === null
      ? { kind: "unknown" }
      : { kind: "complete", file: parseFile(reply.data) };
  throw failure("DRIVE_BACKUP_UNAVAILABLE");
}

export class NodeDriveBackupProvider implements DriveBackupProvider {
  constructor(private readonly http: Pick<NodeDriveHttp, "backup">) {}

  async allocateFileId(
    input: Parameters<DriveBackupProvider["allocateFileId"]>[0],
  ): Promise<string> {
    const reply = await this.http.backup({ endpoint: "generate", ...input });
    requireAccess(reply);
    if (reply.status !== 200) throw failure("DRIVE_BACKUP_UNAVAILABLE");
    const parsed = z
      .object({ ids: z.tuple([reference]) })
      .safeParse(reply.data);
    if (!parsed.success) throw failure("DRIVE_BACKUP_UNKNOWN");
    return parsed.data.ids[0];
  }

  async startResumable(
    input: Parameters<DriveBackupProvider["startResumable"]>[0],
  ): ReturnType<DriveBackupProvider["startResumable"]> {
    if (
      !reference.safeParse(input.fileId).success ||
      !reference.safeParse(input.folderId).success ||
      !validMarker(input.marker) ||
      input.name.length < 1 ||
      input.name.length > 255 ||
      [...input.name].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) ||
      !validBytes(input.bytes) ||
      (input.folderResourceKey !== null &&
        !validResourceKey(input.folderResourceKey))
    )
      throw failure("DRIVE_BACKUP_UNAVAILABLE");
    const reply = await this.http.backup({
      endpoint: "start",
      signal: input.signal,
      accessToken: input.accessToken,
      folderId: input.folderId,
      resourceKey: input.folderResourceKey,
      bytes: input.bytes,
      body: JSON.stringify({
        id: input.fileId,
        name: input.name,
        mimeType: "application/octet-stream",
        parents: [input.folderId],
        appProperties: { [DRIVE_BACKUP_MARKER]: input.marker },
      }),
    });
    requireAccess(reply);
    if (reply.status === 409) return { kind: "conflict" };
    if (reply.status === 404) throw failure("DRIVE_BACKUP_FOLDER_UNAVAILABLE");
    if (reply.status === 408 || reply.status >= 500) return { kind: "unknown" };
    if (reply.status !== 200) throw failure("DRIVE_BACKUP_UNAVAILABLE");
    if (reply.data !== null || !validDriveBackupSession(reply.location))
      return { kind: "unknown" };
    return { kind: "started", session: reply.location };
  }

  async queryReceived(
    input: Parameters<DriveBackupProvider["queryReceived"]>[0],
  ): Promise<DriveBackupReceived> {
    this.requireSession(input.session, input.bytes);
    return received(
      await this.http.backup({ endpoint: "query", ...input }),
      input.bytes,
    );
  }

  async uploadChunk(
    input: Parameters<DriveBackupProvider["uploadChunk"]>[0],
  ): Promise<DriveBackupReceived> {
    this.requireSession(input.session, input.bytes);
    if (
      !Number.isSafeInteger(input.offset) ||
      input.offset < 0 ||
      input.chunk.byteLength < 1 ||
      input.chunk.byteLength > 1_048_576 ||
      input.offset > input.bytes - input.chunk.byteLength ||
      (input.offset + input.chunk.byteLength !== input.bytes &&
        input.chunk.byteLength % 262_144 !== 0)
    )
      throw failure("DRIVE_BACKUP_UNAVAILABLE");
    return received(
      await this.http.backup({ endpoint: "chunk", ...input }),
      input.bytes,
    );
  }

  async inspectFile(
    input: Parameters<DriveBackupProvider["inspectFile"]>[0],
  ): Promise<DriveBackupFile | null> {
    if (
      !reference.safeParse(input.fileId).success ||
      (input.resourceKey !== null && !validResourceKey(input.resourceKey))
    )
      throw failure("DRIVE_BACKUP_UNAVAILABLE");
    const reply = await this.http.backup({ endpoint: "inspect", ...input });
    requireAccess(reply);
    if (reply.status === 404) return null;
    if (reply.status !== 200) throw failure("DRIVE_BACKUP_UNAVAILABLE");
    const file = parseFile(reply.data);
    if (file.id !== input.fileId) throw failure("DRIVE_BACKUP_CHANGED");
    return file;
  }

  private requireSession(session: string, bytes: number) {
    if (!validDriveBackupSession(session) || !validBytes(bytes))
      throw new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
  }
}
