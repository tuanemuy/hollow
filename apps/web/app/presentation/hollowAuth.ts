import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  credentialsSchema,
  resendSchema,
  signUpSchema,
  verificationSchema,
} from "./hollowSchemas";
import { validateInput } from "./validator";

export const signUpFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(signUpSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, storeVerificationBrowser }, { signUp }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/account/signUp"),
      ]);
    const { container } = await hollowContext(true);
    const result = await signUp(container, data);
    if (result.browserToken)
      storeVerificationBrowser(result.browserToken, container.appUrl);
    return { email: result.email };
  });

export const resendVerificationFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(resendSchema))
  .handler(async ({ data }) => {
    const [
      { hollowContext, storeVerificationBrowser },
      { resendVerification },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/signUp"),
    ]);
    const { container } = await hollowContext(true);
    const result = await resendVerification(container, data.email);
    if (result.browserToken)
      storeVerificationBrowser(result.browserToken, container.appUrl);
    return { email: result.email };
  });

export const verifyEmailFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(verificationSchema))
  .handler(async ({ data }) => {
    const [
      { hollowContext, storeSession, VERIFICATION_COOKIE },
      { verifyEmail },
      { getCookie, deleteCookie },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/verifyEmail"),
      import("@tanstack/react-start/server"),
    ]);
    const { container } = await hollowContext(true);
    const session = await verifyEmail(
      container,
      data.token,
      getCookie(VERIFICATION_COOKIE) ?? null,
    );
    if (session) storeSession(session, container.appUrl);
    deleteCookie(VERIFICATION_COOKIE, { path: "/" });
    return { signedIn: session !== null };
  });

export const signInFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(credentialsSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, storeSession }, { signIn }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/signIn"),
    ]);
    const { container, token } = await hollowContext(true);
    const session = await signIn(container, data);
    if (token) {
      const { signOut } = await import(
        "@repo/core/application/account/session"
      );
      await signOut(container, token);
    }
    storeSession(session, container.appUrl);
    return session.user;
  });

export const signOutFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext, removeSession }, { signOut }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/session"),
    ]);
    const { container, token } = await hollowContext(true);
    await signOut(container, token);
    removeSession();
    return { ok: true as const };
  });

export const currentUserFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext }, { currentUser }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/account/session"),
    ]);
    const { container, token } = await hollowContext();
    return currentUser(container, token);
  });
