import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";
import {
  scopedNotesSchema,
  scopeSearchSchema,
  workspaceCreateSchema,
  workspaceListSchema,
  workspaceSlugSchema,
} from "./workspaceInput";

export const createWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceCreateSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { createWorkspace }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/usecases"),
    ]);
    const { container, token } = await hollowContext(true);
    return createWorkspace(container, token, {
      name: data.name,
      description: data.description,
      ...(data.slug ? { slug: data.slug } : {}),
    });
  });
export const listWorkspacesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceListSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listWorkspaces }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return listWorkspaces(
      container,
      token,
      data.cursor ? { cursor: data.cursor } : {},
    );
  });
export const checkWorkspaceSlugFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceSlugSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { checkWorkspaceSlug }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return checkWorkspaceSlug(container, token, data);
  });
export const listScopedNotesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(scopedNotesSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listScopedNotes }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return listScopedNotes(container, token, {
      ...(data.workspaceId ? { workspaceId: data.workspaceId } : {}),
      ...(data.cursor ? { cursor: data.cursor } : {}),
    });
  });

export const getScopeUsageFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(scopeSearchSchema.strict()))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getScopeUsage }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return getScopeUsage(
      container,
      token,
      data.workspaceId ? { workspaceId: data.workspaceId } : {},
    );
  });
