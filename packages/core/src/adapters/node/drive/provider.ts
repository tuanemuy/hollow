import type {
  DriveFolderObservation,
  DriveFolderProvider,
} from "@repo/core/application/integration/drive/ports";
import { z } from "zod";
import { DriveTransportError } from "./execution";
import { type NodeDriveHttp, validDriveReference } from "./http";

const reference = z.string().refine(validDriveReference);
const metadata = z.object({
  id: reference,
  name: z
    .string()
    .min(1)
    .refine((s) => Buffer.byteLength(s) <= 4096),
  mimeType: z.string().max(256),
  trashed: z.boolean(),
  explicitlyTrashed: z.boolean().optional(),
  driveId: reference.optional(),
  parents: z.array(reference).max(100).optional(),
  capabilities: z.object({ canAddChildren: z.boolean().optional() }).optional(),
  resourceKey: reference.optional(),
  shortcutDetails: z
    .object({
      targetId: reference,
      targetMimeType: z.string(),
      targetResourceKey: reference.optional(),
    })
    .optional(),
  appProperties: z.record(z.string().max(256), z.string().max(4096)).optional(),
});
export const DRIVE_FOLDER_MARKER = "hollowFolderOperation";
export class NodeDriveFolderProvider implements DriveFolderProvider {
  constructor(private readonly http: NodeDriveHttp) {}
  async generateFolderId(
    input: Parameters<DriveFolderProvider["generateFolderId"]>[0],
  ) {
    const reply = await this.http.read({ endpoint: "generate", ...input });
    this.requireSuccess(reply.status);
    const parsed = z
      .object({ ids: z.tuple([reference]) })
      .safeParse(reply.data);
    if (!parsed.success) throw new DriveTransportError();
    return parsed.data.ids[0];
  }
  async createFolder(
    input: Parameters<DriveFolderProvider["createFolder"]>[0],
  ) {
    if (
      !validDriveReference(input.fileId) ||
      !validDriveReference(input.marker)
    )
      throw new DriveTransportError("DRIVE_FOLDER_INVALID", "not-sent");
    const reply = await this.http.read({
      endpoint: "create",
      signal: input.signal,
      accessToken: input.accessToken,
      body: JSON.stringify({
        id: input.fileId,
        name: "Hollow",
        mimeType: "application/vnd.google-apps.folder",
        appProperties: { [DRIVE_FOLDER_MARKER]: input.marker },
      }),
    });
    if (reply.status === 409) return { kind: "conflict" as const };
    this.requireSuccess(reply.status);
    const parsed = z.object({ id: reference }).safeParse(reply.data);
    if (!parsed.success || parsed.data.id !== input.fileId)
      throw new DriveTransportError("DRIVE_CREATE_UNKNOWN");
    return { kind: "created" as const };
  }
  async inspectFolder(
    input: Parameters<DriveFolderProvider["inspectFolder"]>[0],
  ): Promise<DriveFolderObservation> {
    let reply: Awaited<ReturnType<NodeDriveHttp["read"]>>;
    try {
      reply = await this.http.read({ endpoint: "inspect", ...input });
    } catch (error) {
      if (
        !(error instanceof DriveTransportError) ||
        error.credentialRejection !== null
      )
        throw error;
      return { kind: "transient", reason: "network" };
    }
    if (reply.status === 401)
      throw new DriveTransportError(
        "DRIVE_PROVIDER_REJECTED",
        "unknown",
        "access-token",
      );
    if (reply.status === 404) return { kind: "unavailable-ambiguous" };
    if (reply.status === 429) return { kind: "transient", reason: "rate" };
    if (reply.status === 403) {
      const reason = z
        .object({
          error: z.object({
            errors: z
              .array(z.object({ reason: z.string() }))
              .max(32)
              .optional(),
          }),
        })
        .safeParse(reply.data);
      if (
        reason.success &&
        reason.data.error.errors?.some((e) =>
          [
            "rateLimitExceeded",
            "userRateLimitExceeded",
            "sharingRateLimitExceeded",
          ].includes(e.reason),
        )
      )
        return { kind: "transient", reason: "rate" };
      return { kind: "access-denied" };
    }
    if (reply.status >= 500) return { kind: "transient", reason: "provider" };
    if (reply.status !== 200) return { kind: "invalid-metadata" };
    const parsed = metadata.safeParse(reply.data);
    if (!parsed.success || parsed.data.id !== input.fileId)
      return { kind: "invalid-metadata" };
    const file = parsed.data;
    if (file.trashed || file.explicitlyTrashed)
      return { kind: "trashed", explicitly: file.explicitlyTrashed === true };
    if (
      file.mimeType === "application/vnd.google-apps.shortcut" &&
      file.shortcutDetails?.targetMimeType ===
        "application/vnd.google-apps.folder"
    )
      return {
        kind: "shortcut",
        targetId: file.shortcutDetails.targetId,
        targetResourceKey: file.shortcutDetails.targetResourceKey ?? null,
      };
    if (file.mimeType !== "application/vnd.google-apps.folder" || !file.parents)
      return { kind: "invalid-metadata" };
    if (file.capabilities?.canAddChildren !== true)
      return file.capabilities?.canAddChildren === false
        ? { kind: "access-denied" }
        : { kind: "invalid-metadata" };
    return {
      kind: "usable",
      folder: { id: file.id, name: file.name, driveId: file.driveId ?? null },
      resourceKey: file.resourceKey ?? input.resourceKey,
      parents: file.parents,
      marker: file.appProperties?.[DRIVE_FOLDER_MARKER] ?? null,
    };
  }
  private requireSuccess(status: number) {
    if (status === 401)
      throw new DriveTransportError(
        "DRIVE_PROVIDER_REJECTED",
        "unknown",
        "access-token",
      );
    if (status === 429) throw new DriveTransportError("DRIVE_RATE_LIMIT");
    if (status < 200 || status >= 300)
      throw new DriveTransportError("DRIVE_PROVIDER_REJECTED");
  }
}
