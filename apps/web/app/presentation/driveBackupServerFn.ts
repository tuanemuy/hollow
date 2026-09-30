import { createServerFn } from "@tanstack/react-start";
import {
  driveBackupCancelSchema,
  driveBackupReadSchema,
  driveBackupRequestSchema,
} from "./driveBackupInput";
import { boundedDriveDto } from "./driveInput";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";

async function context(mutation = false) {
  const { hollowContext, authenticationRequest } = await import(
    "./hollowServer"
  );
  const { container, token } = await hollowContext(mutation);
  return { container, request: authenticationRequest(token) };
}
export const driveBackupFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupReadSchema))
  .handler(async ({ data }) => {
    const { getDriveBackup } = await import(
      "@repo/core/application/integration/drive/backup/read"
    );
    const { container, request } = await context();
    return boundedDriveDto(await getDriveBackup(container, request, data));
  });
export const driveBackupHistoryFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const { getDriveBackupHistory } = await import(
      "@repo/core/application/integration/drive/backup/read"
    );
    const { container, request } = await context();
    return boundedDriveDto(await getDriveBackupHistory(container, request));
  });
export const requestDriveBackupFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupRequestSchema))
  .handler(async ({ data }) => {
    const { requestDriveBackup } = await import(
      "@repo/core/application/integration/drive/backup/request"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(await requestDriveBackup(container, request, data));
  });
export const cancelDriveBackupFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupCancelSchema))
  .handler(async ({ data }) => {
    const { cancelDriveBackup } = await import(
      "@repo/core/application/integration/drive/backup/request"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(await cancelDriveBackup(container, request, data));
  });
