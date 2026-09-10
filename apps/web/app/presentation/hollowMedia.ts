import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { externalReadingAllowed } from "./externalReading";
import { saveNoteSchema } from "./hollowSchemas";
import { validateInput } from "./validator";

export const createMediaDraftFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(z.object({ noteId: z.string().uuid().optional() })),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { createMediaDraft }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/asset/uploads"),
    ]);
    const { container, token } = await hollowContext(true);
    return createMediaDraft(container, token, data.noteId);
  });
export const beginMediaUploadFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z.object({
        draftId: z.string().uuid(),
        name: z.string().min(1).max(255),
        bytes: z
          .number()
          .int()
          .min(1)
          .max(200 * 1024 * 1024),
      }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { beginMediaUpload }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/asset/uploads"),
    ]);
    const { container, token } = await hollowContext(true);
    return beginMediaUpload(container, token, data);
  });
export const renderNoteFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z.object({
        html: saveNoteSchema.shape.html,
        noteId: z.string().uuid().optional(),
        draftId: z.string().uuid().optional(),
      }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { renderNote }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/asset/references"),
    ]);
    const { container, token } = await hollowContext(true);
    return renderNote(container, token, {
      html: data.html,
      externalReading: externalReadingAllowed(container.appUrl, {
        destination: getRequestHeader("sec-fetch-dest"),
        mode: getRequestHeader("sec-fetch-mode"),
        site: getRequestHeader("sec-fetch-site"),
      }),
      ...(data.noteId ? { noteId: data.noteId } : {}),
      ...(data.draftId ? { draftId: data.draftId } : {}),
    });
  });
