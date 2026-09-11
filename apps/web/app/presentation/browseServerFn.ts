import { createServerFn } from "@tanstack/react-start";
import { browseInputSchema, browseTagInputSchema } from "./browseInput";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";

export const browseNotesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(browseInputSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { browseNotes }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/browse/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return browseNotes(container, token, data);
  });
export const browseTagsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(browseTagInputSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { browseTags }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/browse/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return browseTags(
      container,
      token,
      data.conditions,
      data.tagQuery,
      data.tagCursor,
    );
  });
