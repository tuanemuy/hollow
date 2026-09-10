import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  purgeListSchema,
  purgeRequestSchema,
  purgeRetrySchema,
} from "./hollowSchemas";
import { validateInput } from "./validator";

export const requestNotePurgeFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(purgeRequestSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { requestNotePurge }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/purge"),
    ]);
    const { container, token } = await hollowContext(true);
    return requestNotePurge(container, token, data);
  });

export const retryNotePurgeFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(purgeRetrySchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { retryNotePurge }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/purge"),
    ]);
    const { container, token } = await hollowContext(true);
    return retryNotePurge(container, token, data);
  });

export const listNotePurgesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(purgeListSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listNotePurges }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/purge"),
    ]);
    const { container, token } = await hollowContext();
    return listNotePurges(container, token, data);
  });
