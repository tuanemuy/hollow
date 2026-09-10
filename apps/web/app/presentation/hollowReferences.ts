import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";

export const readReferencesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(z.object({ noteId: z.uuid() })))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { readReferences }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/reference/read"),
    ]);
    const { container, token } = await hollowContext();
    return readReferences(container, token, data.noteId);
  });

export const listReferenceJobsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext }, { listReferenceJobs }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/reference/read"),
    ]);
    const { container, token } = await hollowContext();
    return listReferenceJobs(container, token);
  });

export const controlReferenceFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z.object({
        noteId: z.uuid(),
        action: z.enum(["on", "off", "retry", "cancel"]),
      }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { controlReference }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/reference/read"),
    ]);
    const { container, token } = await hollowContext(true);
    return controlReference(container, token, data);
  });
