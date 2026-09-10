import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  invitationGenerationSchema,
  invitationIssueSchema,
  invitationResendSchema,
  workspaceLeaveSchema,
  workspaceMemberChangeSchema,
  workspaceSettingsReadSchema,
  workspaceSettingsUpdateSchema,
} from "./invitationInput";
import { validateInput } from "./validator";

export const loadWorkspaceSettingsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceLeaveSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getWorkspaceSettings }, { listInvitations }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/workspace/membership"),
        import("@repo/core/application/workspace/invitations"),
      ]);
    const { container, token } = await hollowContext();
    const initial = await getWorkspaceSettings(container, token, data);
    const invitations =
      initial.role === "owner"
        ? await listInvitations(container, token, data)
        : null;
    return { initial, invitations };
  });

export const getWorkspaceSettingsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceSettingsReadSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getWorkspaceSettings }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/membership"),
    ]);
    const { container, token } = await hollowContext();
    return getWorkspaceSettings(container, token, {
      workspaceId: data.workspaceId,
      ...(data.cursor ? { cursor: data.cursor } : {}),
    });
  });
export const updateWorkspaceSettingsFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceSettingsUpdateSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { updateWorkspaceSettings }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/membership"),
    ]);
    const { container, token } = await hollowContext(true);
    return updateWorkspaceSettings(container, token, {
      workspaceId: data.workspaceId,
      settingsVersion: data.settingsVersion,
      name: data.name,
      description: data.description,
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
    });
  });
export const changeWorkspaceMemberFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceMemberChangeSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { changeWorkspaceMember }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/membership"),
    ]);
    const { container, token } = await hollowContext(true);
    return changeWorkspaceMember(container, token, data);
  });
export const leaveWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceLeaveSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { leaveWorkspace }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/membership"),
    ]);
    const { container, token } = await hollowContext(true);
    return leaveWorkspace(container, token, data);
  });
export const listInvitationsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(workspaceSettingsReadSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listInvitations }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/invitations"),
    ]);
    const { container, token } = await hollowContext();
    return listInvitations(container, token, {
      workspaceId: data.workspaceId,
      ...(data.cursor ? { cursor: data.cursor } : {}),
    });
  });
export const issueInvitationsFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(invitationIssueSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { issueInvitations }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/invitations"),
    ]);
    const { container, token } = await hollowContext(true);
    return issueInvitations(container, token, data);
  });
export const resendInvitationFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(invitationResendSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { resendInvitation }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/invitations"),
    ]);
    const { container, token } = await hollowContext(true);
    return resendInvitation(container, token, data);
  });
export const cancelInvitationFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(invitationGenerationSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { cancelInvitation }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/invitations"),
    ]);
    const { container, token } = await hollowContext(true);
    return cancelInvitation(container, token, data);
  });
export const copyInvitationFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(invitationGenerationSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { copyInvitation }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/invitations"),
    ]);
    const { container, token } = await hollowContext(true);
    return copyInvitation(container, token, data);
  });
