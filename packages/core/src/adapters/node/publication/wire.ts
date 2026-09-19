import { z } from "zod";
export const publicConditionsSchema = z
  .object({
    query: z.string().max(800),
    tags: z.array(z.string().min(1).max(200)).max(50),
    zone: z.string().min(1).max(128),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    cursor: z.string().max(16384).optional(),
  })
  .strict();
export const publicRequestSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("list"),
      scope: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("all") }).strict(),
        z
          .object({
            kind: z.literal("profile"),
            handle: z.string().min(3).max(63),
          })
          .strict(),
        z
          .object({
            kind: z.literal("workspace"),
            slug: z.string().min(3).max(63),
          })
          .strict(),
      ]),
      conditions: publicConditionsSchema,
      viewerSessionHash: z.string().min(1).max(256).optional(),
    })
    .strict(),
  z.object({ kind: z.literal("sitemap-index") }).strict(),
  z
    .object({
      kind: z.literal("sitemap-leaf"),
      catalogue: z.enum(["notes", "profiles", "workspaces"]),
      page: z.number().int().nonnegative().safe(),
    })
    .strict(),
]);
const ownerBase = {
  title: z.string().max(400),
  path: z.string().max(128),
  description: z.string().max(4000),
  iconUrl: z.string().max(256).nullable(),
};
const owner = z.discriminatedUnion("kind", [
  z.object({ ...ownerBase, kind: z.literal("all"), iconUrl: z.null() }),
  z.object({
    ...ownerBase,
    kind: z.literal("profile"),
    handle: z.string().max(63),
  }),
  z.object({
    ...ownerBase,
    kind: z.literal("workspace"),
    slug: z.string().max(63),
  }),
]);
const part = z.object({ text: z.string().max(800), match: z.boolean() });
export const publicResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("list"),
    page: z.object({
      owner,
      viewer: z
        .object({
          kind: z.enum(["owner", "member"]),
          settingsUrl: z.string().max(256),
          workUrl: z.string().max(256),
        })
        .strict()
        .nullable(),
      items: z
        .array(
          z.object({
            path: z.string().max(128),
            title: z.string().max(800),
            updatedAt: z.iso.datetime(),
            author: z.union([
              z.object({
                kind: z.literal("named"),
                displayName: z.string().max(200),
              }),
              z.object({ kind: z.enum(["unset", "deleted", "unknown"]) }),
            ]),
            authorUrl: z.string().max(128).nullable(),
            titleParts: z.array(part).max(401),
            excerpt: z.array(part).max(321),
            thumbnailUrl: z.string().max(256).nullable(),
            tags: z.array(z.string().max(200)).max(50),
          }),
        )
        .max(50),
      total: z.number().int().nonnegative().safe(),
      nextCursor: z.string().max(16384).nullable(),
      tags: z
        .array(
          z.object({
            name: z.string().max(200),
            count: z.number().int().nonnegative(),
          }),
        )
        .max(50),
      conditions: publicConditionsSchema,
    }),
  }),
  z.object({
    kind: z.literal("sitemap-index"),
    paths: z.array(z.string().max(128)).max(50_000),
  }),
  z.object({
    kind: z.literal("sitemap-leaf"),
    entries: z
      .array(
        z.object({
          path: z.string().max(128),
          lastmod: z.iso.datetime().nullable(),
        }),
      )
      .max(500),
  }),
]);
export const publicChildReplySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("result"), value: publicResponseSchema }),
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
