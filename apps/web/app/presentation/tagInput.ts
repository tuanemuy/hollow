import { z } from "zod";

const id = z.uuid();
const scope = z.object({ workspaceId: id.optional() }).strict();
const query = z
  .string()
  .max(800)
  .refine(
    (value) => Array.from(value).length <= 200,
    "検索は200文字以内にしてください。",
  );
const page = {
  workspaceId: id.optional(),
  query,
  cursor: z.string().min(1).max(16384).optional(),
};
export const tagReadInputSchema = z.discriminatedUnion("purpose", [
  z.object({ ...page, purpose: z.literal("picker"), noteId: id }).strict(),
  z
    .object({ ...page, purpose: z.literal("manager"), unusedOnly: z.boolean() })
    .strict(),
  z
    .object({
      workspaceId: id.optional(),
      purpose: z.literal("impact"),
      sourceId: id,
      targetId: id.optional(),
    })
    .strict(),
]);
const stamp = z
  .object({
    id,
    revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export const tagDeltaSchema = z
  .object({
    noteId: id,
    expectedScope: scope,
    change: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("attach"), tagId: id }).strict(),
      z.object({ kind: z.literal("detach"), tagId: id }).strict(),
      z
        .object({ kind: z.literal("create"), name: z.string().max(800) })
        .strict(),
    ]),
  })
  .strict();
export const tagManagementSchema = z
  .object({
    scope,
    action: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("rename"),
          source: stamp,
          name: z.string().max(800),
        })
        .strict(),
      z
        .object({ kind: z.literal("merge"), source: stamp, target: stamp })
        .strict(),
      z.object({ kind: z.literal("delete"), source: stamp }).strict(),
      z
        .object({
          kind: z.literal("cleanup"),
          targets: z.array(stamp).min(1).max(50),
        })
        .strict(),
    ]),
  })
  .strict();
export const tagRouteSchema = z
  .object({
    workspaceId: id.optional(),
    query: query.optional(),
    unusedOnly: z.boolean().optional(),
    cursor: z.string().min(1).max(16384).optional(),
  })
  .strict();
