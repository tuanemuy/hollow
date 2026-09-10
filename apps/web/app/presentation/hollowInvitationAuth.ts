import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { invitationSelectionSchema } from "./invitationInput";
import { validateInput } from "./validator";
export const beginInvitationFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })),
  )
  .handler(async ({ data }) => {
    const [
      { hollowContext },
      { beginInvitation, getInvitationLanding },
      { getCookie, setCookie, setResponseHeader },
    ] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/workspace/invitations"),
      import("@tanstack/react-start/server"),
    ]);
    const { container, token } = await hollowContext();
    setResponseHeader("Referrer-Policy", "no-referrer");
    const previous = getCookie("hollow_invitation_browser");
    const browserToken =
      previous && /^[A-Za-z0-9_-]{43}$/.test(previous)
        ? previous
        : container.tokens.generate();
    const continuation = await beginInvitation(
      container,
      data.token,
      browserToken,
      getCookie("hollow_invitation_continuation"),
    );
    for (const [name, value] of [
      ["hollow_invitation_browser", browserToken],
      ["hollow_invitation_continuation", continuation.id],
    ])
      setCookie(name, value, {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(container.appUrl).protocol === "https:",
        path: "/",
        expires: continuation.expiresAt,
      });
    return getInvitationLanding(container, token, {
      continuationId: continuation.id,
      browserToken,
    });
  });
export const getInvitationLandingFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z.object({ expected: invitationSelectionSchema.optional() }).default({}),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { invitationCookies }, { getInvitationLanding }] =
      await Promise.all([
        import("./hollowServer"),
        import("./invitationCookies"),
        import("@repo/core/application/workspace/invitations"),
      ]);
    const { container, token } = await hollowContext();
    return getInvitationLanding(
      container,
      token,
      invitationCookies(data.expected),
    );
  });
export const joinInvitationFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z.object({
        confirmDifferentEmail: z.boolean(),
        expected: invitationSelectionSchema,
      }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { invitationCookies }, { joinInvitation }] =
      await Promise.all([
        import("./hollowServer"),
        import("./invitationCookies"),
        import("@repo/core/application/workspace/invitations"),
      ]);
    const { container, token } = await hollowContext(true);
    return joinInvitation(container, token, {
      ...invitationCookies(data.expected),
      ...data,
    });
  });
export const declineInvitationFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(z.object({ expected: invitationSelectionSchema })),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { invitationCookies }, { declineInvitation }] =
      await Promise.all([
        import("./hollowServer"),
        import("./invitationCookies"),
        import("@repo/core/application/workspace/invitations"),
      ]);
    const { container, token } = await hollowContext(true);
    await declineInvitation(container, token, invitationCookies(data.expected));
    return { ok: true };
  });
