import { z } from "zod";

export const purgeRequestSchema = z.object({
  id: z.string().uuid(),
  operationId: z.string().uuid(),
});
export const purgeRetrySchema = z.object({ id: z.string().uuid() });
export const purgeListSchema = z
  .object({
    scope: z.enum(["unfinished", "completed"]).optional(),
    cursor: z
      .object({ at: z.iso.datetime(), id: z.uuid() })
      .strict()
      .optional(),
    watch: z.array(z.uuid()).max(50).optional(),
    requests: z
      .array(z.object({ noteId: z.uuid(), operationId: z.uuid() }).strict())
      .max(10)
      .optional(),
  })
  .strict();

export const emailSchema = z
  .string()
  .trim()
  .email("メールアドレスを確認してください。")
  .max(254);
export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const signUpSchema = credentialsSchema.extend({
  termsAccepted: z.boolean(),
});
export const resendSchema = z.object({ email: emailSchema });
export const verificationSchema = z.object({
  token: z.string().min(1).max(256),
});
export const getNoteSchema = z.object({ id: z.string().uuid() });
export const revisionNoteSchema = z.object({ noteId: z.uuid() });
export const revisionIdentitySchema = revisionNoteSchema.extend({
  revisionNo: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export const restoreRevisionSchema = revisionIdentitySchema.extend({
  expectedVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
export const setDisplayStyleSchema = getNoteSchema.extend({
  style: z.enum(["default", "original"]),
});
export const saveNoteSchema = z
  .object({
    wysOrigin: z
      .object({
        revisionNo: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        capturedNoteVersion: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
      })
      .optional(),
    cause: z.enum(["manual", "autosave", "title"]).optional(),
    confirmedVersion: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    id: z.string().uuid().optional(),
    draftId: z.string().uuid().optional(),
    importReferences: z.boolean().optional(),
    version: z.number().int().nonnegative().optional(),
    title: z
      .string()
      .refine(
        (value) => Array.from(value).length <= 200,
        "タイトルは200文字以内で入力してください。",
      ),
    html: z
      .string()
      .refine(
        (value) => new TextEncoder().encode(value).byteLength <= 800 * 1024,
        "本文は800 KB以内に分割してください。",
      ),
  })
  .refine((value) => !value.wysOrigin || value.id !== undefined, {
    path: ["wysOrigin"],
    message: "変換前の版は既存ノートでのみ指定できます。",
  });
