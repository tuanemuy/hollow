import { z } from "zod";
export const driveBackupReadSchema = z
  .object({ noteId: z.uuid(), commandId: z.uuid().optional() })
  .strict();
export const driveBackupRequestSchema = z
  .object({
    noteId: z.uuid(),
    commandId: z.uuid(),
    expectedEpoch: z.number().int().safe().positive(),
    expectedSettingsVersion: z.number().int().safe().positive(),
  })
  .strict();
export const driveBackupCancelSchema = z.object({ jobId: z.uuid() }).strict();
