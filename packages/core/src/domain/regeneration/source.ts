import { z } from "zod";
import { BusinessRuleError } from "../error";

export const SOURCE_MEMORY_BYTES = 52_428_800;
export const SOURCE_MEMORY_LIMIT = 2 * SOURCE_MEMORY_BYTES;
export const regenerationConsumerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("llm-conversion"), id: z.uuid() }).strict(),
  z.object({ kind: z.literal("pdf-preview"), id: z.uuid() }).strict(),
  z.object({ kind: z.literal("machine-regeneration"), id: z.uuid() }).strict(),
]);
export type RegenerationConsumer = z.infer<typeof regenerationConsumerSchema>;
const inputReceiptBase = {
  consumer: regenerationConsumerSchema,
  runtimeId: z.uuid(),
  token: z.uuid(),
  generation: z.number().int().positive().safe(),
};
export const sourceInputReceiptSchema = z.discriminatedUnion("state", [
  z
    .object({
      ...inputReceiptBase,
      state: z.enum(["active", "unknown"]),
    })
    .strict(),
  z
    .object({
      ...inputReceiptBase,
      state: z.literal("closed"),
      proofId: z.uuid(),
    })
    .strict(),
]);
export type SourceInputReceipt = z.infer<typeof sourceInputReceiptSchema>;
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

export function sourceInputReceipt(value: unknown): SourceInputReceipt | null {
  const parsed = sourceInputReceiptSchema.nullable().safeParse(value);
  if (!parsed.success)
    throw new BusinessRuleError(
      "REGENERATION_SOURCE_INVALID",
      "入力段階の保存状態を確認できません。",
    );
  return parsed.data;
}

export function sourceInputReceiptMatches(
  receipt: SourceInputReceipt | null,
  current: Readonly<{
    consumer: RegenerationConsumer;
    owner: Readonly<{ runtimeId: string | null; token: string | null }>;
    sourceMemoryBytes: SourceMemoryBytes;
  }>,
): boolean {
  return (
    receipt === null ||
    (receipt.consumer.kind === current.consumer.kind &&
      receipt.consumer.id === current.consumer.id &&
      receipt.runtimeId === current.owner.runtimeId &&
      receipt.token === current.owner.token &&
      current.sourceMemoryBytes ===
        (receipt.state === "closed" ? 0 : SOURCE_MEMORY_BYTES))
  );
}
