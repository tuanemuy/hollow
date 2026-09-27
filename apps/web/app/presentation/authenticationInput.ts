import { z } from "zod";
import { invitationSelectionSchema } from "./invitationInput";

export const authenticationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/);
export const authenticationIdSchema = z.object({ id: z.uuid() }).strict();
export const authenticationVersionSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
export const newPasswordSchema = z
  .object({
    password: z.string().min(12).max(128),
    confirmation: z.string().min(12).max(128),
  })
  .strict();
export const beginGoogleSchema = z
  .object({
    mode: z.enum(["login", "link", "reauth"]),
    destination: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("notes") }).strict(),
      z.object({ kind: z.literal("methods") }).strict(),
      z.object({ kind: z.literal("note"), id: z.uuid() }).strict(),
      z
        .object({
          kind: z.literal("invitation"),
          expected: invitationSelectionSchema,
        })
        .strict(),
    ]),
  })
  .strict();
