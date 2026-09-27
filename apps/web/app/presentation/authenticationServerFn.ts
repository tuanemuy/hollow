import type { AuthReturn } from "@repo/core/domain/account/authentication";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  authenticationIdSchema,
  authenticationTokenSchema,
  authenticationVersionSchema,
  beginGoogleSchema,
  newPasswordSchema,
} from "./authenticationInput";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";

export const beginGoogleFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(beginGoogleSchema))
  .handler(async ({ data }) => {
    const [
      { hollowContext, authenticationRequest },
      { beginGoogleAuthentication },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/google"),
    ]);
    const { container, token } = await hollowContext(true);
    let returnTo: AuthReturn;
    if (data.destination.kind === "invitation") {
      const [{ invitationCookies }, { getInvitationLanding }] =
        await Promise.all([
          import("./invitationCookies"),
          import("@repo/core/application/workspace/invitations"),
        ]);
      const cookies = invitationCookies(data.destination.expected);
      const view = await getInvitationLanding(container, token, cookies);
      returnTo = {
        kind: "invitation",
        selector: `${view.id}:${view.generation}`,
        continuation: cookies.continuationId,
      };
    } else returnTo = data.destination;
    return beginGoogleAuthentication(
      container,
      authenticationRequest(token),
      data.mode,
      returnTo,
    );
  });

export const googleResultFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(authenticationIdSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, authenticationRequest }, { getGoogleResult }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/account/google"),
      ]);
    const { container, token } = await hollowContext();
    const result = await getGoogleResult(
      container,
      authenticationRequest(token),
      data.id,
    );
    let destination =
      result.returnTo.kind === "methods"
        ? "/settings/login-methods"
        : result.returnTo.kind === "note"
          ? `/notes/${result.returnTo.id}`
          : "/notes";
    if (result.returnTo.kind === "invitation") {
      const [{ invitationCookies }, { getInvitationLanding }] =
        await Promise.all([
          import("./invitationCookies"),
          import("@repo/core/application/workspace/invitations"),
        ]);
      const [id, generation] = result.returnTo.selector.split(":");
      const expected = z
        .object({ id: z.uuid(), generation: authenticationVersionSchema })
        .parse({ id, generation: Number(generation) });
      const cookies = invitationCookies(expected);
      if (cookies.continuationId !== result.returnTo.continuation) {
        const { ConflictError } = await import("@repo/core/application/errors");
        throw new ConflictError(
          "AUTH_CONTEXT_CHANGED",
          "元の招待メールから招待を確認してください。",
        );
      }
      await getInvitationLanding(container, token, cookies);
      destination = `/invitations?invitationId=${expected.id}&invitationGeneration=${expected.generation}`;
    }
    return {
      id: result.id,
      mode: result.mode,
      state: result.state,
      failure: result.failure,
      passwordProof: result.passwordProof,
      destination,
    };
  });

export const passwordGoogleProofFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      authenticationIdSchema.extend({ password: z.string().min(1).max(128) }),
    ),
  )
  .handler(async ({ data }) => {
    const [
      { hollowContext, authenticationRequest, storeSession },
      { proveGoogleWithPassword },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/proof"),
    ]);
    const { container, token } = await hollowContext(true);
    const result = await proveGoogleWithPassword(
      container,
      authenticationRequest(token),
      data.id,
      data.password,
    );
    if (result.session) storeSession(result.session, container.appUrl);
    return { id: result.id };
  });

export const sendGoogleProofFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(authenticationIdSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, authenticationRequest }, { sendGoogleLinkProof }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/account/proof"),
      ]);
    const { container, token } = await hollowContext(true);
    return sendGoogleLinkProof(
      container,
      authenticationRequest(token),
      data.id,
    );
  });

export const confirmGoogleProofFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(z.object({ token: authenticationTokenSchema }).strict()),
  )
  .handler(async ({ data }) => {
    const [
      { hollowContext, authenticationRequest, storeSession },
      { proveGoogleWithMail },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/proof"),
    ]);
    const { container, token } = await hollowContext(true);
    const result = await proveGoogleWithMail(
      container,
      authenticationRequest(token),
      data.token,
    );
    if (result.session) storeSession(result.session, container.appUrl);
    return { id: result.id };
  });

export const loginMethodsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext, authenticationRequest }, { loginMethods }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/account/methods"),
      ]);
    const { container, token } = await hollowContext();
    return loginMethods(container, authenticationRequest(token));
  });

export const changePasswordFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      newPasswordSchema.extend({
        version: authenticationVersionSchema,
        currentPassword: z.string().min(1).max(128),
      }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext, authenticationRequest }, { changePassword }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/account/methods"),
      ]);
    const { container, token } = await hollowContext(true);
    await changePassword(container, authenticationRequest(token), data);
    return { ok: true as const };
  });

export const addPasswordFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(newPasswordSchema.extend({ attemptId: z.uuid() })),
  )
  .handler(async ({ data }) => {
    const [
      { hollowContext, authenticationRequest },
      { addPassword },
      { getCookie, deleteCookie },
      { ForbiddenError },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/methods"),
      import("@tanstack/react-start/server"),
      import("@repo/core/application/errors"),
    ]);
    const { container, token } = await hollowContext(true);
    const value = getCookie("hollow_google_reauth")?.split(".");
    if (
      !value ||
      value.length !== 2 ||
      value[0] !== data.attemptId ||
      !authenticationTokenSchema.safeParse(value[1]).success
    )
      throw new ForbiddenError(
        "AUTH_PROOF_INVALID",
        "Googleで本人確認をやり直してください。",
      );
    await addPassword(container, authenticationRequest(token), {
      ...data,
      proof: value[1] ?? "",
    });
    deleteCookie("hollow_google_reauth", { path: "/" });
    return { ok: true as const };
  });

export const removeLoginMethodFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z
        .object({
          method: z.enum(["google", "password"]),
          version: authenticationVersionSchema,
        })
        .strict(),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext, authenticationRequest }, { removeLoginMethod }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/account/methods"),
      ]);
    const { container, token } = await hollowContext(true);
    await removeLoginMethod(
      container,
      authenticationRequest(token),
      data.method,
      data.version,
    );
    return { ok: true as const };
  });

export const signOutOthersFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext, authenticationRequest }, { signOutOtherSessions }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/account/methods"),
      ]);
    const { container, token } = await hollowContext(true);
    await signOutOtherSessions(container, authenticationRequest(token));
    return { ok: true as const };
  });

export const requestPasswordResetFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(z.object({ email: z.email().max(254) }).strict()),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { requestPasswordReset }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/resetPassword"),
    ]);
    const { container } = await hollowContext(true);
    return requestPasswordReset(container, data.email);
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      newPasswordSchema.extend({ token: authenticationTokenSchema }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { resetPassword }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/resetPassword"),
    ]);
    const { container } = await hollowContext(true);
    await resetPassword(container, data);
    return { ok: true as const };
  });
