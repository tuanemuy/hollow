import { ConflictError } from "@repo/core/application/errors";
import { createServerFn } from "@tanstack/react-start";
import {
  driveBackupActivitySchema,
  driveBackupBulkSchema,
  driveBackupCancelSchema,
  driveBackupDetailSchema,
  driveBackupParentRetrySchema,
  driveBackupParentSchema,
  driveBackupReadSchema,
  driveBackupRequestSchema,
  driveBackupRetargetPreviewSchema,
  driveBackupRetargetSchema,
  driveBackupSelectionSchema,
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
function boundedRetargetDto<T>(value: T): T {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 65536)
    throw new ConflictError(
      "DRIVE_UNAVAILABLE",
      "新しい保存先への受付を確認できません。結果を確認してください。",
    );
  return value;
}
export const previewDriveBackupRetargetFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupRetargetPreviewSchema))
  .handler(async ({ data }) => {
    const { previewDriveBackupRetarget } = await import(
      "@repo/core/application/integration/drive/backup/retarget"
    );
    const { container, request } = await context();
    return boundedRetargetDto(
      await previewDriveBackupRetarget(container, request, data),
    );
  });
export const retargetDriveBackupFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupRetargetSchema))
  .handler(async ({ data }) => {
    const { retargetDriveBackup } = await import(
      "@repo/core/application/integration/drive/backup/retarget"
    );
    const { container, request } = await context(true);
    return boundedRetargetDto(
      await retargetDriveBackup(container, request, data),
    );
  });
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
export const previewDriveBackupFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupSelectionSchema))
  .handler(async ({ data }) => {
    const { previewDriveBackup } = await import(
      "@repo/core/application/integration/drive/backup/bulk"
    );
    const { container, request } = await context();
    return boundedDriveDto(await previewDriveBackup(container, request, data));
  });
export const requestDriveBackupBulkFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupBulkSchema))
  .handler(async ({ data }) => {
    const { requestDriveBackupBulk } = await import(
      "@repo/core/application/integration/drive/backup/bulk"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(
      await requestDriveBackupBulk(container, request, data),
    );
  });
export const cancelDriveBackupParentFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupParentSchema))
  .handler(async ({ data }) => {
    const { cancelDriveBackupParent } = await import(
      "@repo/core/application/integration/drive/backup/bulk"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(
      await cancelDriveBackupParent(container, request, data),
    );
  });
export const retryDriveBackupParentFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupParentRetrySchema))
  .handler(async ({ data }) => {
    const { retryDriveBackupParent } = await import(
      "@repo/core/application/integration/drive/backup/bulk"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(
      await retryDriveBackupParent(container, request, data),
    );
  });
export const driveBackupActivityFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupActivitySchema))
  .handler(async ({ data }) => {
    const { getDriveBackupActivity } = await import(
      "@repo/core/application/integration/drive/backup/activity"
    );
    const { container, request } = await context();
    return boundedDriveDto(
      await getDriveBackupActivity(container, request, data),
    );
  });
export const driveBackupDetailFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBackupDetailSchema))
  .handler(async ({ data }) => {
    const { getDriveBackupDetail } = await import(
      "@repo/core/application/integration/drive/backup/activity"
    );
    const { container, request } = await context();
    return boundedDriveDto(
      await getDriveBackupDetail(container, request, data),
    );
  });
