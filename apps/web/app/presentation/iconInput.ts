import { z } from "zod";
export const iconUploadSchema = z.object({
  workspaceId: z.string().uuid(),
  settingsVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  bytes: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 ** 2),
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
});
export const iconSelectorSchema = z
  .object({
    workspaceId: z.string().uuid(),
    iconId: z.string().uuid(),
    invitationId: z.string().uuid().optional(),
    generation: z.coerce
      .number()
      .int()
      .min(1)
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .refine(
    (v) => (v.invitationId === undefined) === (v.generation === undefined),
  );
