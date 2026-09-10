import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { iconUploadSchema } from "./iconInput";
import { validateInput } from "./validator";
export const beginWorkspaceIconFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(iconUploadSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { beginWorkspaceIcon }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/icons"),
    ]);
    const { container, token } = await hollowContext(true);
    return beginWorkspaceIcon(container, token, data);
  });
