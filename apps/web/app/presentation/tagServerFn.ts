import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  tagDeltaSchema,
  tagManagementSchema,
  tagReadInputSchema,
} from "./tagInput";
import { validateInput } from "./validator";

export const readTagsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(tagReadInputSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { readTags }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/tag/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return readTags(container, token, data);
  });
export const changeNoteTagsFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(tagDeltaSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { changeNoteTags }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/tag/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return changeNoteTags(container, token, data);
  });
export const manageTagsFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(tagManagementSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { manageTags }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/tag/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return manageTags(container, token, data);
  });
