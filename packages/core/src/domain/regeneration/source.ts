import { z } from "zod";
import { BusinessRuleError } from "../error";

export const SOURCE_MEMORY_BYTES = 52_428_800;
export const SOURCE_MEMORY_LIMIT = 2 * SOURCE_MEMORY_BYTES;
export const sourceAccessSchema = z.discriminatedUnion("origin", [
  z
    .object({ origin: z.literal("local-original"), bindingId: z.null() })
    .strict(),
  z.object({ origin: z.literal("drive-record"), bindingId: z.uuid() }).strict(),
  z.object({ origin: z.literal("redacted"), bindingId: z.null() }).strict(),
]);
export type SourceAccess = z.infer<typeof sourceAccessSchema>;
export type ExecutableSourceAccess = Exclude<
  SourceAccess,
  { origin: "redacted" }
>;
export type SourceMemoryBytes = 0 | typeof SOURCE_MEMORY_BYTES;
export const localOriginalSource: SourceAccess = {
  origin: "local-original",
  bindingId: null,
};
export function sourceAccess(value: unknown): SourceAccess {
  const parsed = sourceAccessSchema.safeParse(value);
  if (!parsed.success)
    throw new BusinessRuleError(
      "REGENERATION_SOURCE_INVALID",
      "取得元の保存状態を確認できません。",
    );
  return parsed.data;
}
export function sourceMemoryBytes(value: unknown): SourceMemoryBytes {
  if (value !== 0 && value !== SOURCE_MEMORY_BYTES)
    throw new BusinessRuleError(
      "REGENERATION_SOURCE_INVALID",
      "取得元の保存状態を確認できません。",
    );
  return value;
}
