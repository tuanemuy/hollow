import { z } from "zod";
import { browseInputSchema } from "./browseInput";
import { moveExpectedSchema, moveOwnerSchema } from "./moveInput";

const id = z.uuid();
const integer = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const ids = z
  .array(id)
  .min(1)
  .max(500)
  .refine(
    (a) => new Set(a).size === a.length,
    "同じノートは一度だけ選択してください。",
  );
export const batchOperationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("tag"),
      change: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("attach"), tagId: id }).strict(),
        z.object({ kind: z.literal("detach"), tagId: id }).strict(),
        z
          .object({ kind: z.literal("create"), name: z.string().max(800) })
          .strict(),
      ]),
    })
    .strict(),
  z
    .object({ kind: z.literal("trash"), cancelProcessing: z.boolean() })
    .strict(),
  z.object({ kind: z.literal("move"), destination: moveOwnerSchema }).strict(),
]);
export const batchSelectionSchema = browseInputSchema.refine(
  (c) => c.cursor === undefined && c.day === undefined,
  "全体選択にはページや日付の続きを指定できません。",
);
export const batchPreviewSchema = z
  .object({
    ids: ids.max(50),
    source: moveOwnerSchema,
    operation: batchOperationSchema,
    parentId: id.optional(),
  })
  .strict();
const expected = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("tag") }).strict(),
  z
    .object({
      kind: z.literal("trash"),
      version: integer,
      hasRunningJobs: z.boolean(),
      processingFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z.object({ kind: z.literal("move"), move: moveExpectedSchema }).strict(),
]);
export const batchConfirmationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("excluded"), noteId: id }).strict(),
  z
    .object({
      kind: z.literal("ready"),
      noteId: id,
      title: z.string().max(2000),
      expected,
      latestAttemptId: id.nullable(),
      baseSequence: integer.max(500),
    })
    .strict(),
]);
const items = z
  .array(batchConfirmationSchema)
  .min(1)
  .max(500)
  .refine(
    (a) => new Set(a.map((i) => i.noteId)).size === a.length,
    "同じノートは一度だけ指定してください。",
  );
export const batchAcceptSchema = z
  .object({
    requestId: id,
    source: moveOwnerSchema,
    operation: batchOperationSchema,
    items,
  })
  .strict();
export const batchRetrySchema = z
  .object({ id, generation: integer.min(1), items })
  .strict();
export const batchCancelSchema = z
  .object({ id, generation: integer.min(1) })
  .strict();
export const batchGetSchema = z
  .object({ id, after: integer.max(499).optional() })
  .strict();
export const batchWatchSchema = z
  .object({
    ids: z
      .array(id)
      .max(50)
      .refine(
        (a) => new Set(a).size === a.length,
        "処理IDは重複なく指定してください。",
      ),
  })
  .strict();
export const batchListSchema = z
  .object({
    scope: z.enum(["unfinished", "completed"]),
    before: z.object({ at: z.iso.datetime(), id }).strict().optional(),
  })
  .strict();
