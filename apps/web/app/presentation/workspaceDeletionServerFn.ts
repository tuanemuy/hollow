import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";
import {
  requestWorkspaceDeletionSchema,
  workspaceDeletionHistorySchema,
  workspaceDeletionReceiptSchema,
} from "./workspaceDeletionInput";

export const requestWorkspaceDeletionFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(requestWorkspaceDeletionSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { requestWorkspaceDeletion }] = await Promise.all(
      [
        import("./hollowServer"),
        import("@repo/core/application/workspace/deletion"),
      ],
    );
    const { container, token } = await hollowContext(true);
    return requestWorkspaceDeletion(container, token, data);
  });
export const workspaceDeletionReceiptFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceDeletionReceiptSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getWorkspaceDeletionReceipt }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/workspace/deletion"),
      ]);
    const { container, token } = await hollowContext();
    return getWorkspaceDeletionReceipt(container, token, data);
  });
export const workspaceDeletionHistoryFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceDeletionHistorySchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listWorkspaceDeletionReceipts }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/workspace/deletion"),
      ]);
    const { container, token } = await hollowContext();
    return listWorkspaceDeletionReceipts(
      container,
      token,
      data.before ? { before: data.before } : {},
    );
  });
