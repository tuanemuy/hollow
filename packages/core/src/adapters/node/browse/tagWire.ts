import { z } from "zod";

const id = z.string().min(1).max(64);
const scope = { workspaceId: id.optional() };
const page = {
  ...scope,
  query: z.string().max(800),
  cursor: z.string().max(16384).optional(),
};
export const tagReadInputSchema = z.discriminatedUnion("purpose", [
  z.object({ ...page, purpose: z.literal("picker"), noteId: id }).strict(),
  z
    .object({ ...page, purpose: z.literal("manager"), unusedOnly: z.boolean() })
    .strict(),
  z
    .object({
      ...scope,
      purpose: z.literal("impact"),
      sourceId: id,
      targetId: id.optional(),
    })
    .strict(),
]);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const summary = z.object({
  id,
  name: z.string().max(200),
  key: z.string().max(2400),
  normalizationVersion: z.string().max(100),
  revision: count.positive(),
  active: count,
  trashed: count,
  purging: count,
  total: count,
});
const impact = z.object({
  kind: z.literal("impact"),
  source: summary,
  target: summary.nullable(),
  overlap: count,
  affected: count,
});
export const tagReadResultSchema = z.discriminatedUnion("kind", [
  impact,
  z.object({
    kind: z.literal("page"),
    purpose: z.enum(["picker", "manager"]),
    scope: z.object({ workspaceId: id.nullable(), name: z.string().max(400) }),
    items: z.array(summary).max(50),
    selected: z.array(z.object({ id, name: z.string().max(200) })).max(50),
    exact: summary.nullable(),
    unusedTotal: count,
    nextCursor: z.string().max(16384).nullable(),
    identity: z.string().max(4096),
  }),
]);
