import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  beginOpenRouterSchema,
  openRouterConnectionSchema,
  openRouterIdSchema,
  openRouterVersionSchema,
  openRouterWaitingSchema,
  saveOpenRouterModelsSchema,
} from "./openRouterInput";
import { validateInput } from "./validator";

export const openRouterSettingsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [
      { hollowContext, authenticationRequest },
      { getOpenRouterSettings },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/integration/openRouter/settings"),
    ]);
    const { container, token } = await hollowContext();
    return getOpenRouterSettings(container, authenticationRequest(token));
  });
export const beginOpenRouterFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(beginOpenRouterSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, authenticationRequest }, { beginOpenRouter }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/integration/openRouter/connection"),
      ]);
    const { container, token } = await hollowContext(true);
    return beginOpenRouter(container, authenticationRequest(token), data);
  });
export const openRouterAttemptFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(openRouterIdSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, authenticationRequest }, { getOpenRouterAttempt }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/integration/openRouter/settings"),
      ]);
    const { container, token } = await hollowContext();
    return getOpenRouterAttempt(
      container,
      authenticationRequest(token),
      data.id,
    );
  });
export const retryOpenRouterMetadataFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(openRouterVersionSchema))
  .handler(async ({ data }) => {
    const [
      { hollowContext, authenticationRequest },
      { retryOpenRouterMetadata },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/integration/openRouter/connection"),
    ]);
    const { container, token } = await hollowContext(true);
    return retryOpenRouterMetadata(
      container,
      authenticationRequest(token),
      data.id,
      data.version,
    );
  });
export const cancelOpenRouterFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(openRouterIdSchema))
  .handler(async ({ data }) => {
    const [
      { hollowContext, authenticationRequest },
      { cancelOpenRouterAttempt },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/integration/openRouter/connection"),
    ]);
    const { container, token } = await hollowContext(true);
    await cancelOpenRouterAttempt(
      container,
      authenticationRequest(token),
      data.id,
    );
  });
export const unlinkOpenRouterFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(openRouterConnectionSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, authenticationRequest }, { unlinkOpenRouter }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/integration/openRouter/connection"),
      ]);
    const { container, token } = await hollowContext(true);
    await unlinkOpenRouter(container, authenticationRequest(token), data);
  });
export const checkOpenRouterFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(openRouterConnectionSchema))
  .handler(async ({ data }) => {
    const [
      { hollowContext, authenticationRequest },
      { checkOpenRouterConnection },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/integration/openRouter/connection"),
    ]);
    const { container, token } = await hollowContext(true);
    await checkOpenRouterConnection(
      container,
      authenticationRequest(token),
      data,
    );
  });
export const openRouterModelsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext, authenticationRequest }, { listOpenRouterModels }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/integration/openRouter/settings"),
      ]);
    const { container, token } = await hollowContext();
    return listOpenRouterModels(container, authenticationRequest(token));
  });
export const saveOpenRouterModelsFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(saveOpenRouterModelsSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, authenticationRequest }, { saveOpenRouterModels }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/integration/openRouter/settings"),
      ]);
    const { container, token } = await hollowContext(true);
    await saveOpenRouterModels(container, authenticationRequest(token), data);
  });
export const openRouterWaitingFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(openRouterWaitingSchema))
  .handler(async ({ data }) => {
    const [
      { hollowContext, authenticationRequest },
      { listOpenRouterWaitingNotes },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/integration/openRouter/settings"),
    ]);
    const { container, token } = await hollowContext();
    return listOpenRouterWaitingNotes(
      container,
      authenticationRequest(token),
      data.id,
      data.afterId,
    );
  });
