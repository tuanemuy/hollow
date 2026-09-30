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
]);
export const driveBackupCancelSchema = z.object({ jobId: z.uuid() }).strict();
