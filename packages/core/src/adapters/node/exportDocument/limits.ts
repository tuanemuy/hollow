import type {
  ExportDocumentInput,
  ExportDocumentPlan,
} from "@repo/core/application/export/document";
import { EXPORT_DOCUMENT_PROFILE } from "@repo/core/application/export/document";
import { BusinessRuleError } from "@repo/core/domain/error";
import { z } from "zod";

export const PROFILE = EXPORT_DOCUMENT_PROFILE;
const HTML_BYTES = 800 * 1024;
export function outputBounds(input: ExportDocumentInput) {
  const source =
    Buffer.byteLength(input.html) +
    Buffer.byteLength(input.defaultCss) +
    Buffer.byteLength(input.title) +
    Buffer.byteLength(input.appUrl) +
    1;
  return {
    text: 32 * source * source + 4096,
    segments: 4 * source + 2 * input.media.length + 1,
  };
}
export const failureMessages = {
  EXPORT_DOCUMENT_LIMIT:
    "文書の解析可能な規模を超えました。本文を分割して再実行してください。",
  EXPORT_DOCUMENT_INVALID:
    "文書を安全に書き出せませんでした。内容を確認して再実行してください。",
  EXPORT_DOCUMENT_TIMEOUT:
    "書き出しが制限時間を超えました。内容を確認して再実行してください。",
  EXPORT_DOCUMENT_CANCELLED: "書き出しを取り消しました。",
  EXPORT_MEDIA_UNAVAILABLE:
    "安全を確認できない画像があります。画像を挿入し直して再実行してください。",
} as const;
export type FailureCode = keyof typeof failureMessages;
export const failure = (code: FailureCode) =>
  new BusinessRuleError(code, failureMessages[code]);
export const isFailureCode = (value: unknown): value is FailureCode =>
  typeof value === "string" && Object.hasOwn(failureMessages, value);

const urls = z.array(z.string().max(8192)).max(200);
export const inputSchema = z.strictObject({
  noteId: z.string().min(1).max(256),
  title: z.string().max(8192),
  html: z.string().max(800 * 1024),
  style: z.enum(["default", "original"]),
  defaultCss: z.string().max(512 * 1024),
  appUrl: z.string().max(8192),
  format: z.enum(["html", "markdown"]),
  media: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(256),
        url: z
          .string()
          .min(1)
          .max(800 * 1024),
        mime: z
          .string()
          .regex(/^[a-z0-9][a-z0-9_.+-]*\/[a-z0-9][a-z0-9_.+-]*$/i)
          .max(128),
        bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      }),
    )
    .max(HTML_BYTES),
  external: z.strictObject({
    images: urls,
    media: urls,
    backgrounds: urls,
    fonts: urls,
  }),
});

export function checkInput(value: unknown): ExportDocumentInput {
  const parsed = inputSchema.safeParse(value);
  if (!parsed.success) throw failure("EXPORT_DOCUMENT_LIMIT");
  const input = parsed.data;
  try {
    const app = new URL(input.appUrl);
    if (
      !["http:", "https:"].includes(app.protocol) ||
      app.username ||
      app.password
    )
      throw failure("EXPORT_DOCUMENT_INVALID");
  } catch {
    throw failure("EXPORT_DOCUMENT_INVALID");
  }
  if (
    Buffer.byteLength(input.html) > 800 * 1024 ||
    Buffer.byteLength(input.defaultCss) > 512 * 1024
  )
    throw failure("EXPORT_DOCUMENT_LIMIT");
  let bytes = 0;
  const ids = new Set<string>();
  const mediaUrls = new Set<string>();
  for (const media of input.media) {
    bytes += Buffer.byteLength(media.url);
    if (ids.has(media.id) || mediaUrls.has(media.url))
      throw failure("EXPORT_DOCUMENT_INVALID");
    ids.add(media.id);
    mediaUrls.add(media.url);
  }
  for (const values of Object.values(input.external))
    for (const url of values) bytes += Buffer.byteLength(url);
  const sourceBytes =
    Buffer.byteLength(input.html) + Buffer.byteLength(input.defaultCss) + 1;
  if (bytes > 6 * sourceBytes + 4 * 200 * 8192)
    throw failure("EXPORT_DOCUMENT_LIMIT");
  return input;
}

export function plannedBytes(
  plan: Pick<ExportDocumentPlan, "segments">,
  input: ExportDocumentInput,
): number {
  const media = new Map(input.media.map((slot) => [slot.id, slot]));
  const bounds = outputBounds(input);
  let total = 0;
  let text = 0;
  for (const segment of plan.segments) {
    if (segment.kind === "text") {
      const bytes = Buffer.byteLength(segment.value);
      text += bytes;
      total += bytes;
    } else {
      const slot = media.get(segment.id);
      if (!slot) throw failure("EXPORT_DOCUMENT_INVALID");
      total +=
        Buffer.byteLength(`data:${slot.mime};base64,`) +
        4 * Math.ceil(slot.bytes / 3);
    }
    if (!Number.isSafeInteger(total) || text > bounds.text)
      throw failure("EXPORT_DOCUMENT_LIMIT");
  }
  if (plan.segments.length > bounds.segments)
    throw failure("EXPORT_DOCUMENT_LIMIT");
  return total;
}

export const planSchema = z.strictObject({
  profile: z.literal(PROFILE),
  filename: z.string().min(1).max(256),
  mime: z.enum(["text/html; charset=utf-8", "text/markdown; charset=utf-8"]),
  maxBytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  notices: z.array(z.string().max(2048)).max(100),
  segments: z.array(
    z.discriminatedUnion("kind", [
      z.strictObject({
        kind: z.literal("text"),
        value: z.string(),
      }),
      z.strictObject({
        kind: z.literal("media"),
        id: z.string().min(1).max(256),
      }),
    ]),
  ),
});
