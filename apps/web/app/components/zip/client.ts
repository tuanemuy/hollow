import { z } from "zod";

const count = z.number().int().safe().nonnegative();
const generation = z.number().int().safe().positive();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const selection = z.strictObject({
  noteIds: z.array(z.uuid()).min(1).max(500),
  format: z.enum(["html", "markdown"]),
});
export const retryInputSchema = z.strictObject({
  id: z.uuid(),
  generation,
  mode: z.enum(["failed", "assembly"]),
  ordinals: z.array(z.number().int().min(0).max(499)).max(500),
});
export const zipCommandSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("new"),
    input: selection.extend({ commandId: z.uuid(), confirmation: digest }),
  }),
  z.strictObject({
    kind: z.literal("retry"),
    input: retryInputSchema.extend({
      commandId: z.uuid(),
      confirmation: digest,
    }),
  }),
]);
export type ZipCommand = z.infer<typeof zipCommandSchema>;
export const zipJobSchema = z.strictObject({
  id: z.uuid(),
  generation,
  version: generation,
  commandId: z.uuid(),
  actorId: z.uuid(),
  format: z.enum(["html", "markdown"]),
  state: z.enum([
    "queued",
    "running",
    "assembling",
    "stopping",
    "succeeded",
    "partial",
    "failed",
    "cancelled",
  ]),
  failure: z.string().nullable(),
  acceptedAt: z.iso.datetime(),
  historyExpiresAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  publishedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  available: z.boolean(),
  total: count,
  succeeded: count,
  failed: count,
  excluded: count,
  cancelled: count,
});
export type ZipJob = z.infer<typeof zipJobSchema>;
export const zipActive = (job: Pick<ZipJob, "state">) =>
  job.state === "queued" ||
  job.state === "running" ||
  job.state === "assembling" ||
  job.state === "stopping";
export const zipStateLabel = {
  queued: "待機中",
  running: "作成中",
  assembling: "ZIP組立中",
  stopping: "停止・安全確認中",
  succeeded: "完了",
  partial: "一部完了",
  failed: "失敗",
  cancelled: "取消済み",
} as const;
export const zipPreviewSchema = z.strictObject({
  actorId: z.uuid(),
  format: selection.shape.format,
  style: z.literal("saved"),
  selected: count,
  total: count,
  excluded: count,
  confirmation: digest,
  items: z
    .array(
      z.strictObject({
        ordinal: count,
        noteId: z.uuid(),
        title: z.string(),
        identity: digest,
      }),
    )
    .max(50),
  nextOffset: count.nullable(),
});
export const zipRetryPreviewSchema = z.strictObject({
  actorId: z.uuid(),
  id: z.uuid(),
  generation,
  mode: retryInputSchema.shape.mode,
  confirmation: digest,
  total: count,
  reused: count,
  items: z
    .array(
      z.strictObject({
        ordinal: count,
        attemptNumber: generation,
        title: z.string(),
      }),
    )
    .max(50),
  nextOffset: count.nullable(),
});
export const zipListSchema = z.strictObject({
  configured: z.boolean(),
  availableFormats: z.array(selection.shape.format).max(3),
  items: z.array(zipJobSchema).max(50),
  next: z
    .strictObject({
      requestId: z.uuid(),
      generation,
      acceptedAt: z.iso.datetime(),
    })
    .nullable(),
});
export const zipDetailsSchema = z.strictObject({
  job: zipJobSchema,
  items: z
    .array(
      z.strictObject({
        ordinal: count,
        attemptId: z.uuid(),
        attemptNumber: generation,
        origin: z.enum(["attempt", "reused"]),
        state: z.enum([
          "queued",
          "running",
          "succeeded",
          "failed",
          "excluded",
          "cancelled",
        ]),
        failure: z.string().nullable(),
        title: z.string().nullable(),
      }),
    )
    .max(50),
  nextOffset: count.nullable(),
  retryOrdinals: z.array(count).max(500),
  canRetryAssembly: z.boolean(),
});
export const zipActivitySchema = z.strictObject({
  actorId: z.uuid(),
  summary: z.strictObject({
    activeCount: count,
    representative: z
      .strictObject({ id: z.uuid(), title: z.string() })
      .nullable(),
  }),
  active: z
    .array(z.strictObject({ id: z.uuid(), version: generation }))
    .max(50),
  next: z.uuid().nullable(),
  watched: z.array(zipJobSchema).max(50),
});
const errorSchema = z.object({
  error: z.object({
    kind: z.string(),
    message: z.string(),
    code: z.string().optional(),
  }),
});
export class ZipRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}
export function zipNeedsNewRequest(error: unknown) {
  return (
    error instanceof ZipRequestError &&
    (error.code === "ZIP_NOT_FOUND" ||
      error.code === "ZIP_CONTENT_CHANGED" ||
      error.code === "ZIP_SOURCE_CHANGED")
  );
}
export async function zipJson(url: string, input?: unknown) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...(input === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
  });
  const value: unknown = await response.json();
  return { response, value };
}
export async function zipRead<T>(
  url: string,
  schema: z.ZodType<T>,
  input?: unknown,
): Promise<T> {
  const { response, value } = await zipJson(url, input);
  if (!response.ok) {
    const error = errorSchema.safeParse(value);
    throw new ZipRequestError(
      error.success
        ? error.data.error.message
        : "ZIP処理の結果を取得できません。時間を置いて確認してください。",
      error.success ? error.data.error.code : undefined,
    );
  }
  return schema.parse(value);
}
export async function sendZip(command: ZipCommand) {
  try {
    const { response, value } = await zipJson(
      command.kind === "new" ? "/api/zip/requests" : "/api/zip/retry",
      command.input,
    );
    if (response.ok)
      return { kind: "accepted" as const, job: zipJobSchema.parse(value) };
    const error = errorSchema.safeParse(value);
    if (
      error.success &&
      [
        "validation",
        "business",
        "unauthorized",
        "forbidden",
        "notFound",
        "conflict",
      ].includes(error.data.error.kind)
    )
      return { kind: "rejected" as const, message: error.data.error.message };
  } catch {}
  return { kind: "unknown" as const };
}
export async function downloadZip(job: ZipJob) {
  const result = await zipRead(
    `/api/zip/requests/${job.id}/delivery`,
    z.strictObject({
      id: z.uuid(),
      path: z.string(),
      filename: z.string(),
      expiresAt: z.iso.datetime(),
    }),
    { generation: job.generation },
  );
  if (result.path !== `/api/zip/deliveries/${result.id}/file`)
    throw Error("ZIP取得先を確認できません。");
  return result.path;
}
