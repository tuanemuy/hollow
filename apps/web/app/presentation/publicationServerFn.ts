import { createServerFn } from "@tanstack/react-start";
import {
  beginProfileIconSchema,
  handleSchema,
  removeProfileIconSchema,
  saveProfileSchema,
  workspacePublicationSchema,
  workspacePublicationSelector,
} from "./publicationInput";
import { sharingErrorMiddleware } from "./sharingErrorMiddleware";
import { validateInput } from "./validator";

export const getProfileFn = createServerFn({ method: "GET" })
  .middleware([sharingErrorMiddleware])
  .handler(async () => {
    const [{ hollowContext }, { getProfile }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/publication/profile"),
    ]);
    const { container, token } = await hollowContext();
    return getProfile(container, token);
  });
export const saveProfileFn = createServerFn({ method: "POST" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(saveProfileSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { saveProfile }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/publication/profile"),
    ]);
    const { container, token } = await hollowContext(true);
    return saveProfile(container, token, data);
  });
export const checkHandleFn = createServerFn({ method: "GET" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(handleSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { checkHandle }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/publication/profile"),
    ]);
    const { container, token } = await hollowContext();
    return checkHandle(container, token, data.handle);
  });
export const beginProfileIconFn = createServerFn({ method: "POST" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(beginProfileIconSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { beginProfileIcon }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/publication/icons"),
    ]);
    const { container, token } = await hollowContext(true);
    return beginProfileIcon(container, token, data);
  });
export const removeProfileIconFn = createServerFn({ method: "POST" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(removeProfileIconSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { removeProfileIcon }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/publication/icons"),
    ]);
    const { container, token } = await hollowContext(true);
    return removeProfileIcon(container, token, data.profileVersion);
  });
export const getWorkspacePublicationFn = createServerFn({ method: "GET" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(workspacePublicationSelector))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getWorkspacePublication }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/publication/workspace"),
    ]);
    const { container, token } = await hollowContext();
    return getWorkspacePublication(container, token, data.workspaceId);
  });
export const setWorkspacePublicationFn = createServerFn({ method: "POST" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(workspacePublicationSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { setWorkspacePublication }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/publication/workspace"),
    ]);
    const { container, token } = await hollowContext(true);
    return setWorkspacePublication(container, token, data);
  });
