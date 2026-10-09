import { z } from "zod";
export const llmModelKindInput = z
  .object({ kind: z.enum(["chat-text", "chat-image"]) })
  .strict();

export const llmNoteInput = z.object({
  recordId: z.uuid().optional(),
  noteId: z.uuid(),
  commandId: z.uuid().optional(),
});
export const llmJobInput = z.object({ jobId: z.uuid() });
export const llmPdfPreviewBeginInput = z
  .object({
    recordId: z.uuid().optional(),
    noteId: z.uuid(),
    commandId: z.uuid(),
    noteVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    expectedEpoch: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export const llmPdfPreviewReadInput = z
  .object({ noteId: z.uuid(), commandId: z.uuid() })
  .strict();
export const llmPdfPreviewCancelInput = z
  .object({ previewId: z.uuid() })
  .strict();
export const llmRegenerateInput = z.object({
  noteId: z.uuid(),
  noteVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  commandId: z.uuid(),
  expectedEpoch: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  modelId: z.string().min(1).max(255),
  instruction: z
    .string()
    .max(8192)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 8192,
      "追加指示は UTF-8 で 8 KiB 以下にしてください。",
    ),
  confirmed: z.literal(true),
  retryOf: z.uuid().optional(),
  previewId: z.uuid().optional(),
});
