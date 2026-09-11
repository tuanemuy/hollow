import { BROWSE_SORTS } from "@repo/core/domain/browse/query";
import { z } from "zod";

const id = z.string().min(1).max(64);
const textPart = z.object({ text: z.string().max(800), match: z.boolean() });
export const browseConditionsSchema = z.object({
  workspaceId: id.optional(),
  query: z.string().max(800),
  tags: z.array(id).max(50),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  zone: z.string().min(1).max(128),
  sort: z.enum(BROWSE_SORTS),
  layout: z.enum(["tile", "list", "calendar"]),
  cursor: z.string().max(16384).optional(),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
const requestBase = z.object({
  sessionHash: z.string().min(1).max(256),
  conditions: browseConditionsSchema,
});
export const browseRequestSchema = z.discriminatedUnion("kind", [
  requestBase.extend({ kind: z.literal("notes") }),
  requestBase.extend({
    kind: z.literal("tags"),
    tagQuery: z.string().max(200),
    tagCursor: z.string().max(4096).optional(),
  }),
]);
const note = z.object({
  id,
  title: z.string().max(800),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  status: z.enum(["processing", "ready", "needs_ai", "failed", "cancelled"]),
  titleParts: z.array(textPart).max(401),
  excerpt: z.array(textPart).max(321),
  thumbnailUrl: z.string().max(256).nullable(),
  mediaLabel: z.string().max(20).nullable(),
  tags: z.array(z.object({ id, name: z.string().max(200) })).max(50),
});
export const browseResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("notes"),
    page: z.object({
      items: z.array(note).max(50),
      nextCursor: z.string().max(16384).nullable(),
      scope: z.object({
        workspaceId: id.nullable(),
        name: z.string().max(400),
        canEdit: z.boolean(),
        iconId: id.nullable().optional(),
      }),
      usage: z.object({
        usedBytes: z.number().nonnegative(),
        limitBytes: z.number().nonnegative(),
        updatedAt: z.iso.datetime(),
      }),
      total: z.number().int().nonnegative(),
      conditions: browseConditionsSchema,
      identity: z.string().max(16384),
      selectedTags: z
        .array(z.object({ id, name: z.string().max(200).nullable() }))
        .max(50),
      calendar: z
        .array(
          z.object({
            date: z.string().max(10),
            count: z.number().int().nonnegative(),
            items: z.array(note).max(3),
            nextCursor: z.string().max(16384).nullable(),
          }),
        )
        .max(31),
    }),
  }),
  z.object({
    kind: z.literal("tags"),
    items: z
      .array(
        z.object({
          id,
          name: z.string().max(200),
          count: z.number().int().nonnegative(),
        }),
      )
      .max(50),
    nextCursor: z.string().max(4096).nullable(),
  }),
]);
export const childReplySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("result"), value: browseResponseSchema }),
  z.object({
    kind: z.literal("failure"),
    error: z.object({
      kind: z.enum([
        "business",
        "unauthorized",
        "notFound",
        "forbidden",
        "conflict",
        "system",
      ]),
      code: z.string().max(100),
      message: z.string().max(500),
    }),
  }),
]);
