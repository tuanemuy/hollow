import { z } from "zod";

export const requestWorkspaceDeletionSchema = z
  .object({
    workspaceId: z.uuid(),
    requestId: z.uuid(),
    confirmation: z.string().min(1).max(200),
  })
  .strict();
export const workspaceDeletionReceiptSchema = z
  .object({ requestId: z.uuid() })
  .strict();
export const workspaceDeletionHistorySchema = z
  .object({
    before: z
      .object({ at: z.iso.datetime(), requestId: z.uuid() })
      .strict()
      .optional(),
  })
  .strict();
