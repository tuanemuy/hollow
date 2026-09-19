import { createServerFn } from "@tanstack/react-start";
import { sharingErrorMiddleware } from "./sharingErrorMiddleware";
import {
  displayNameSchema,
  shareCommandSchema,
  shareLinkSchema,
  shareNoteSchema,
} from "./sharingInput";
import { validateInput } from "./validator";
export const getSharingFn = createServerFn({ method: "GET" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(shareNoteSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getSharing }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/sharing/settings"),
    ]);
    const { container, token } = await hollowContext();
    return getSharing(container, token, data.noteId);
  });
export const changeSharingFn = createServerFn({ method: "POST" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(shareCommandSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { changeSharing }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/sharing/settings"),
    ]);
    const { container, token } = await hollowContext(true);
    return changeSharing(container, token, data);
  });
export const getShareLinkFn = createServerFn({ method: "GET" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(shareLinkSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getShareLink }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/sharing/settings"),
    ]);
    const { container, token } = await hollowContext();
    return getShareLink(container, token, data.expected);
  });
export const getDisplayNameFn = createServerFn({ method: "GET" })
  .middleware([sharingErrorMiddleware])
  .handler(async () => {
    const [{ hollowContext }, { getDisplayName }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/displayName"),
    ]);
    const { container, token } = await hollowContext();
    return getDisplayName(container, token);
  });
export const setDisplayNameFn = createServerFn({ method: "POST" })
  .middleware([sharingErrorMiddleware])
  .inputValidator(validateInput(displayNameSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { setDisplayName }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/displayName"),
    ]);
    const { container, token } = await hollowContext(true);
    return setDisplayName(container, token, data);
  });
