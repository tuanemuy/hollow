import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { importIdSchema, uploadBatchSchema } from "./importSchemas";
import { validateInput } from "./validator";
export const beginUploadFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(uploadBatchSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { beginUpload }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/import/beginUpload"),
    ]);
    const { container, token } = await hollowContext(true);
    return beginUpload(container, token, {
      ...(data.workspaceId ? { workspaceId: data.workspaceId } : {}),
      useAi: data.useAi,
      ...(data.requestedVisibility !== undefined
        ? { requestedVisibility: data.requestedVisibility }
        : {}),
      ...(data.importReferences !== undefined
        ? { importReferences: data.importReferences }
        : {}),
      files: data.files.map((file) => ({
        name: file.name,
        bytes: file.bytes,
        ...(file.role ? { role: file.role } : {}),
        ...(file.path !== undefined ? { path: file.path } : {}),
      })),
    });
  });
export const listImportsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(z.object({ workspaceId: z.uuid().optional() }).optional()),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listImports }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/import/readImports"),
    ]);
    const { container, token } = await hollowContext();
    return listImports(container, token, data);
  });
export const cancelImportFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(importIdSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { cancelImport }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/import/controlJobs"),
    ]);
    const { container, token } = await hollowContext(true);
    return cancelImport(container, token, data.id);
  });
export const retryImportFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(importIdSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { retryImport }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/import/controlJobs"),
    ]);
    const { container, token } = await hollowContext(true);
    return retryImport(container, token, data.id);
  });

export const sealUploadFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(importIdSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { sealUpload }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/import/sealBundle"),
    ]);
    const { container, token } = await hollowContext(true);
    return sealUpload(container, token, data.id);
  });

export const reimportNoteFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(z.object({ noteId: z.string().uuid() })))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { reimportNote }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/import/controlJobs"),
    ]);
    const { container, token } = await hollowContext(true);
    return reimportNote(container, token, data.noteId);
  });
