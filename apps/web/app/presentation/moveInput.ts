import { z } from "zod";

const id = z.uuid();
const revision = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const amount = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const moveOwnerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("personal"), accountId: id }).strict(),
  z.object({ kind: z.literal("workspace"), workspaceId: id }).strict(),
]);
const scope = z
  .object({
    owner: moveOwnerSchema,
    name: z.string().min(1).max(400),
    membershipRevision: amount,
  })
  .strict();
const tag = z
  .object({
    id,
    key: z.string().min(1).max(2000),
    name: z.string().min(1).max(200),
  })
  .strict();
const resource = z.object({ count: amount, bytes: amount }).strict();
const holding = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("absent") }).strict(),
  z
    .object({
      kind: z.literal("present"),
      revision,
      noteHolds: amount,
      admissionHolds: amount,
      cleanupHolds: amount,
    })
    .strict(),
]);
export const moveExpectedSchema = z
  .object({
    noteId: id,
    version: amount,
    ownershipGeneration: revision,
    resourceRevision: revision,
    source: scope,
    destination: scope,
    normalizationVersion: z.literal("16.0.0"),
    tags: z
      .array(z.object({ source: tag, destination: tag.nullable() }).strict())
      .max(50),
    resources: z
      .object({
        originals: resource,
        currentAssets: resource,
        heldAssets: resource,
        graceAssets: resource,
        mediaReservations: resource,
        referenceReservations: resource,
      })
      .strict(),
    bundle: z
      .object({
        id,
        contentRevision: revision,
        bytes: amount,
        source: holding,
        destination: holding,
      })
      .strict()
      .nullable(),
    sourceRelease: amount,
    destinationIncrease: amount,
    sharing: z
      .object({
        version: amount,
        visibility: z.enum(["private", "link", "public"]),
        hasPassword: z.boolean(),
      })
      .strict(),
  })
  .strict();
export const moveDestinationsSchema = z
  .object({ noteId: id, after: id.optional() })
  .strict();
export const movePreviewSchema = z
  .object({ noteId: id, destination: moveOwnerSchema })
  .strict();
export const moveAudienceSchema = z
  .object({
    expected: moveExpectedSchema,
    direction: z.enum(["gained", "lost"]),
    after: id.optional(),
  })
  .strict();
