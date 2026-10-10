import { accountEmail } from "@repo/core/domain/account/entity";
import { z } from "zod";

export const accountDeletionSchema = z
  .object({
    email: z
      .string()
      .max(254)
      .transform((value, context) => {
        try {
          return accountEmail(value);
        } catch {
          context.addIssue({
            code: "custom",
            message: "メールアドレスを確認してください。",
          });
          return z.NEVER;
        }
      }),
  })
  .strict();
