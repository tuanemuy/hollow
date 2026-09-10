import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  emptyActionSchema,
  emptyAttemptSchema,
  emptyDetailSchema,
  emptyIdSchema,
  emptyListSchema,
} from "./hollowSchemas";
import { validateInput } from "./validator";

export const prepareEmptyTrashFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext }, { prepareEmptyTrash }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/emptyTrash"),
    ]);
    const { container, token } = await hollowContext(true);
    return prepareEmptyTrash(container, token);
  });

export const discardEmptyTrashFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(emptyIdSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { discardEmptyTrash }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/emptyTrash"),
    ]);
    const { container, token } = await hollowContext(true);
    return discardEmptyTrash(container, token, data);
  });

export const confirmEmptyTrashFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(emptyIdSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { confirmEmptyTrash }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/emptyTrash"),
    ]);
    const { container, token } = await hollowContext(true);
    return confirmEmptyTrash(container, token, data);
  });

export const cancelEmptyTrashFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(emptyActionSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { cancelEmptyTrash }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/emptyTrash"),
    ]);
    const { container, token } = await hollowContext(true);
    return cancelEmptyTrash(container, token, data);
  });

export const retryEmptyTrashFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(emptyActionSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { retryEmptyTrash }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/emptyTrash"),
    ]);
    const { container, token } = await hollowContext(true);
    return retryEmptyTrash(container, token, data);
  });

export const listEmptyTrashFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(emptyListSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listEmptyTrash }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/emptyTrash"),
    ]);
    const { container, token } = await hollowContext();
    return listEmptyTrash(container, token, data);
  });

export const getEmptyTrashFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(emptyDetailSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getEmptyTrash }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/emptyTrash"),
    ]);
    const { container, token } = await hollowContext();
    return getEmptyTrash(container, token, data);
  });

export const listEmptyAttemptsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(emptyAttemptSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listEmptyAttempts }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/emptyTrash"),
    ]);
    const { container, token } = await hollowContext();
    return listEmptyAttempts(container, token, data);
  });
