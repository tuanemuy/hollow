import { z } from "zod";
export const driveBackupReadSchema = z
  .object({ noteId: z.uuid(), commandId: z.uuid().optional() })
  .strict();
const requestFields = {
  noteId: z.uuid(),
  commandId: z.uuid(),
  expectedEpoch: z.number().int().safe().positive(),
  expectedSettingsVersion: z.number().int().safe().positive(),
};
export const driveBackupRequestSchema = z.union([
  z
    .object({ ...requestFields, kind: z.literal("initial").optional() })
    .strict(),
  z
    .object({
      ...requestFields,
      kind: z.literal("retry"),
      priorTransferId: z.uuid(),
      priorVersion: z.number().int().safe().positive(),
    })
    .strict(),
  z
    .object({
      ...requestFields,
      kind: z.enum(["retry", "redo"]),
      priorJobId: z.uuid(),
      priorJobVersion: z.number().int().safe().positive(),
    })
    .strict(),
]);
export const driveBackupCancelSchema = z.object({ jobId: z.uuid() }).strict();
const positive = z.number().int().safe().positive();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const ids = z
  .array(z.uuid())
  .max(500)
  .refine((value) => new Set(value).size === value.length);
export const driveBackupSelectionSchema = z
  .object({ noteIds: ids.min(1), workspaceId: z.uuid().nullable() })
  .strict();
export const driveBackupBulkSchema = driveBackupSelectionSchema
  .extend({ commandId: z.uuid(), expectedDigest: digest })
  .strict();
export const driveBackupParentSchema = z
  .object({ requestId: z.uuid(), expectedGeneration: positive })
  .strict();
export const driveBackupParentRetrySchema = driveBackupParentSchema
  .extend({ commandId: z.uuid() })
  .strict();
export const driveBackupActivitySchema = z
  .object({
    cursor: z
      .object({ id: z.uuid(), createdAt: z.iso.datetime(), digest })
      .strict()
      .optional(),
    watch: z
      .array(z.uuid())
      .max(50)
      .refine((value) => new Set(value).size === value.length)
      .optional(),
    watchAfter: z.number().int().min(0).max(50).optional(),
    commandId: z.uuid().optional(),
  })
  .strict();
export const driveBackupDetailSchema = z
  .object({
    requestId: z.uuid(),
    generation: positive,
    after: z.number().int().min(0).max(500).optional(),
  })
  .strict();
