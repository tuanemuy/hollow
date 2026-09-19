import { getContainer } from "@repo/core/application/di/containerStore";
import { SystemErrorCode } from "@repo/core/application/errors";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import {
  AppServerError,
  httpStatusFor,
  isAppServerError,
  redactForClient,
  serializeError,
} from "./errorResponse";

export const sharingErrorMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (isRedirect(error) || isNotFound(error)) throw error;
    const raw = isAppServerError(error)
      ? error.serialized
      : serializeError(error);
    if (raw.kind === "system" || raw.kind === "unknown") {
      try {
        const { logger } = await getContainer();
        logger.error("Sharing function failed", {
          kind: raw.kind,
          code: raw.code,
        });
      } catch {
        console.error("Sharing function failed (logger unavailable)");
      }
    }
    const busy =
      raw.code === SystemErrorCode.SharePasswordBusy ||
      raw.code === SystemErrorCode.ShareSnapshotChanged;
    setResponseStatus(busy ? 503 : httpStatusFor(raw));
    throw new AppServerError(redactForClient(raw));
  }
});
