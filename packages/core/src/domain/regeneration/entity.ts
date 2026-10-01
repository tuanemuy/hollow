import { z } from "zod";
import { BusinessRuleError } from "../error";
import { SOURCE_MEMORY_BYTES, sourceAccessSchema } from "./source";

const id = z.uuid();
const positive = z.number().int().positive().safe();
const generation = z.number().int().nonnegative().safe();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const owner = z.discriminatedUnion("state", [
  z
    .object({ state: z.literal("none"), runtimeId: z.null(), token: z.null() })
    .strict(),
  z
    .object({
      state: z.enum(["active", "unknown", "closed"]),
      runtimeId: id,
      token: id,
    })
    .strict(),
]);
export const regenerationConsumerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("llm-conversion"), id }).strict(),
  z.object({ kind: z.literal("pdf-preview"), id }).strict(),
  z.object({ kind: z.literal("machine-regeneration"), id }).strict(),
]);
export type RegenerationConsumer = z.infer<typeof regenerationConsumerSchema>;
export const sourceBindingSchema = z
  .object({
    id,
    recordId: id,
    executorId: id,
    credentialOwnerId: id,
    noteId: id,
    originalId: id,
    subject: z.string().min(1).max(255),
    driveEpoch: positive,
    ownershipGeneration: positive,
    fingerprint: hash,
    consumer: regenerationConsumerSchema,
    cancelGeneration: generation,
    version: positive,
    createdAt: z.date(),
  })
  .strict();
export type SourceBinding = z.infer<typeof sourceBindingSchema>;
const attemptBase = {
  id,
  bindingId: id,
  ordinal: positive,
  purpose: z.enum(["acquire", "final-check"]),
  version: positive,
  cancelGeneration: generation,
  deadlineAt: z.date(),
  credentialVersion: positive,
  createdAt: z.date(),
  updatedAt: z.date(),
};
export const sourceAttemptSchema = z.discriminatedUnion("phase", [
  z
    .object({
      ...attemptBase,
      phase: z.literal("queued"),
      owner: owner.options[0],
      completion: z.null(),
    })
    .strict(),
  z
    .object({
      ...attemptBase,
      phase: z.enum(["active", "unknown"]),
      owner: owner.options[1],
      completion: z.null(),
    })
    .strict()
    .refine((v) => v.owner.state === v.phase),
  z
    .object({
      ...attemptBase,
      phase: z.literal("terminal"),
      owner,
      completion: z.discriminatedUnion("kind", [
        z
          .object({
            kind: z.literal("never-owned"),
            outcome: z.literal("cancelled"),
          })
          .strict(),
        z
          .object({
            kind: z.literal("closed"),
            proofId: id,
            callerEnded: z.boolean(),
            acknowledged: z.boolean(),
            outcome: z.enum(["succeeded", "failed", "cancelled"]),
            failure: z.string().min(1).max(80).nullable(),
            digest: hash.nullable(),
          })
          .strict(),
      ]),
    })
    .strict()
    .refine((v) =>
      v.completion.kind === "never-owned"
        ? v.owner.state === "none" && v.cancelGeneration > 0
        : v.owner.state === "closed" &&
          (!v.completion.acknowledged || v.completion.callerEnded),
    ),
]);
export type SourceAttempt = z.infer<typeof sourceAttemptSchema>;
export const machineRegenerationSchema = z
  .object({
    id,
    executorId: id,
    noteId: id,
    originalId: id,
    commandId: id,
    requestDigest: hash,
    access: sourceAccessSchema,
    sourceMemoryBytes: z.union([z.literal(0), z.literal(SOURCE_MEMORY_BYTES)]),
    source: z
      .object({
        sha256: hash,
        bytes: positive.max(SOURCE_MEMORY_BYTES),
        format: z.enum(["html", "markdown"]),
      })
      .strict(),
    noteVersion: generation,
    ownershipGeneration: positive,
    originalRevisionNo: positive,
    previous: z
      .object({
        state: z.enum([
          "processing",
          "ready",
          "needs_ai",
          "failed",
          "cancelled",
        ]),
        coverage: z.enum(["complete", "partial", "no_text"]),
        activeJobId: id,
      })
      .strict(),
    phase: z.enum([
      "queued",
      "acquiring",
      "preparing",
      "final-check",
      "terminal",
    ]),
    outcome: z.enum(["pending", "succeeded", "failed", "cancelled", "unknown"]),
    failure: z.string().min(1).max(80).nullable(),
    resultVersion: positive.nullable(),
    owner,
    cancelGeneration: generation,
    version: positive,
    createdAt: z.date(),
    deadlineAt: z.date(),
    updatedAt: z.date(),
    terminalAt: z.date().nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      (v.phase === "terminal") !== (v.outcome !== "pending") ||
      (v.phase === "terminal") !== (v.terminalAt !== null) ||
      (v.outcome === "succeeded") !== (v.resultVersion !== null) ||
      (v.access.origin === "redacted" &&
        (v.phase !== "terminal" ||
          v.outcome === "unknown" ||
          v.sourceMemoryBytes !== 0 ||
          !["none", "closed"].includes(v.owner.state))) ||
      (v.sourceMemoryBytes !== 0 && v.owner.state === "none") ||
      (v.owner.state === "unknown" && v.outcome !== "unknown")
    )
      ctx.addIssue({ code: "custom", message: "Invalid regeneration state" });
  });
export type MachineRegeneration = z.infer<typeof machineRegenerationSchema>;
export function parseRegeneration<S extends z.ZodType>(
  schema: S,
  value: unknown,
): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new BusinessRuleError(
      "REGENERATION_STATE_INVALID",
      "再生成の保存状態を確認できません。",
    );
  return parsed.data;
}
export function attemptReleased(value: SourceAttempt): boolean {
  return (
    value.phase === "terminal" &&
    (value.completion.kind === "never-owned" ||
      (value.completion.callerEnded && value.completion.acknowledged))
  );
}
