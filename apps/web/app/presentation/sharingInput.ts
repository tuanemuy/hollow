import { z } from "zod";
export const shareNoteSchema = z.object({ noteId: z.uuid() }).strict();
export const shareExpectedSchema = z
  .object({
    noteId: z.uuid(),
    shareVersion: z.number().int().nonnegative().safe(),
    noteVersion: z.number().int().nonnegative().safe(),
    scope: z
      .object({
        ownershipGeneration: z.number().int().nonnegative().safe(),
        workspaceId: z.uuid().nullable(),
        membershipRevision: z.number().int().nonnegative().safe(),
        name: z.string().max(400),
        memberCount: z.number().int().nonnegative().safe(),
      })
      .strict(),
  })
  .strict();
export const shareCommandSchema = z
  .object({
    expected: shareExpectedSchema,
    operation: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("visibility"),
          visibility: z.enum(["private", "link"]),
        })
        .strict(),
      z.object({ kind: z.literal("regenerate") }).strict(),
      z
        .object({ kind: z.literal("password"), password: z.string().max(1024) })
        .strict(),
      z.object({ kind: z.literal("remove-password") }).strict(),
    ]),
  })
  .strict();
export const shareLinkSchema = z
  .object({ expected: shareExpectedSchema })
  .strict();
export const displayNameSchema = z
  .object({
    value: z.string().max(1024),
    expectedVersion: z.number().int().nonnegative().safe(),
  })
  .strict();
export const profileSearchSchema = z.object({
  noteId: z.uuid().optional(),
  resume: z.literal("sharing").optional(),
});
