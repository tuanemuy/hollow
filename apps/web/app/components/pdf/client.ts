import type { PdfRequestInput } from "@repo/core/application/pdf/usecases";
import { z } from "zod";

export const pdfJobSchema = z.strictObject({
  id: z.uuid(),
  commandId: z.uuid(),
  actorId: z.uuid(),
  noteId: z.uuid(),
  title: z.string(),
  state: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
  failure: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  historyExpiresAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  available: z.boolean(),
  version: z.number().int().positive(),
});
export const pdfListSchema = z.strictObject({
  actorId: z.uuid(),
  configured: z.boolean(),
  items: z.array(pdfJobSchema).max(50),
  nextCursor: z.strictObject({ at: z.iso.datetime(), id: z.uuid() }).nullable(),
});
export const pdfActivitySchema = z.strictObject({
  actorId: z.uuid(),
  activeCount: z.number().int().safe().nonnegative(),
  representative: z
    .strictObject({ id: z.uuid(), title: z.string() })
    .nullable(),
  active: z
    .array(
      z.strictObject({ id: z.uuid(), version: z.number().int().positive() }),
    )
    .max(50),
  nextActive: z.uuid().nullable(),
  watched: z
    .array(
      pdfJobSchema.pick({
        id: true,
        commandId: true,
        noteId: true,
        version: true,
        state: true,
        title: true,
      }),
    )
    .max(50),
});
const errorSchema = z.object({
  error: z.object({ kind: z.string(), message: z.string() }),
});
export async function pdfJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const value: unknown = await response.json();
  return { response, value };
}
export async function postPdf(input: PdfRequestInput) {
  try {
    const { noteId, ...body } = input;
    const { response, value } = await pdfJson(`/api/notes/${noteId}/pdf`, body);
    if (response.ok)
      return { kind: "accepted" as const, job: pdfJobSchema.parse(value) };
    const parsed = errorSchema.safeParse(value);
    if (
      parsed.success &&
      [
        "validation",
        "business",
        "unauthorized",
        "forbidden",
        "notFound",
        "conflict",
      ].includes(parsed.data.error.kind)
    )
      return { kind: "rejected" as const, message: parsed.data.error.message };
  } catch {}
  return { kind: "unknown" as const };
}
export async function lookupPdfJob(commandId: string) {
  const { response, value } = await pdfJson(
    `/api/pdf-requests?command=${encodeURIComponent(commandId)}`,
  );
  if (!response.ok) throw Error("pdf-lookup");
  return value === null ? null : pdfJobSchema.parse(value);
}
export async function cancelPdfJob(id: string) {
  const { response, value } = await pdfJson(
    `/api/pdf-requests/${id}/cancel`,
    {},
  );
  if (!response.ok) throw Error("pdf-cancel");
  return pdfJobSchema.parse(value);
}
export async function preparePdfDownload(id: string) {
  const { response, value } = await pdfJson(
    `/api/pdf-requests/${id}/delivery`,
    {},
  );
  if (!response.ok) throw Error("pdf-delivery");
  return z
    .strictObject({
      id: z.uuid(),
      url: z.string(),
      filename: z.string(),
      expiresAt: z.iso.datetime(),
    })
    .parse(value);
}
