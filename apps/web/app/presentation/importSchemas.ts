import { z } from "zod";
export const uploadBatchSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        role: z.enum(["note", "companion"]).optional(),
        path: z.string().min(1).max(1024).optional(),
        bytes: z
          .number()
          .int()
          .positive()
          .max(200 * 1024 * 1024),
      }),
    )
    .min(1)
    .max(100),
  useAi: z.boolean(),
  importReferences: z.boolean().optional(),
});
export const importIdSchema = z.object({ id: z.uuid() });
