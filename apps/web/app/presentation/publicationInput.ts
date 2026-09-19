import { z } from "zod";

const version = z.number().int().nonnegative().safe();
export const saveProfileSchema = z
  .object({
    displayName: z.string().max(1024),
    handle: z.string().max(128).nullable(),
    bio: z.string().max(2400),
    nameVersion: version,
    profileVersion: version,
    confirmHandleChange: z.boolean(),
  })
  .strict();
export const handleSchema = z.object({ handle: z.string().max(128) }).strict();
export const beginProfileIconSchema = z
  .object({
    profileVersion: version,
    bytes: z
      .number()
      .int()
      .positive()
      .max(5 * 1024 * 1024),
    mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  })
  .strict();
export const removeProfileIconSchema = z
  .object({ profileVersion: version })
  .strict();
export const workspacePublicationSelector = z
  .object({ workspaceId: z.uuid() })
  .strict();
export const workspacePublicationSchema = z
  .object({
    workspaceId: z.uuid(),
    pagePublic: z.boolean(),
    settingsVersion: version,
    publicationVersion: version,
  })
  .strict();
export const profileViewSchema = z
  .object({
    actorId: z.uuid(),
    displayName: z.string().nullable(),
    nameVersion: version,
    handle: z.string().nullable(),
    bio: z.string(),
    profileVersion: version,
    url: z.string().nullable(),
    icon: z.object({ id: z.uuid(), url: z.string() }).nullable(),
  })
  .strict();
