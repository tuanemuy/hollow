import { z } from "zod";

const version = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const epoch = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const modelId = z.string().min(1).max(255);

export const openRouterIdSchema = z.object({ id: z.uuid() });
export const openRouterVersionSchema = openRouterIdSchema.extend({
  version,
  confirmedAdmissionSequence: epoch.optional(),
});
export const openRouterConnectionSchema = z.object({ epoch, version });
export const beginOpenRouterSchema = z.object({
  expectedEpoch: epoch,
  expectedVersion: version,
  confirmedReconnect: z.boolean(),
  confirmedAdmissionSequence: epoch.optional(),
  returnTo: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("settings") }),
    z.object({ kind: z.literal("upload"), workspaceId: z.uuid().nullable() }),
  ]),
});
export const saveOpenRouterModelsSchema = z.object({
  expectedEpoch: epoch,
  expectedVersion: version,
  text: z.object({ kind: z.literal("chat-text"), modelId }),
  image: z.object({ kind: z.literal("chat-image"), modelId }),
  audio: z.object({ kind: z.literal("stt-transcription"), modelId }),
});
export const openRouterWaitingSchema = openRouterIdSchema.extend({
  afterId: z.uuid().optional(),
});
