import { createServerFn } from "@tanstack/react-start";
import {
  boundedDriveDto,
  driveAutoSettingSchema,
  driveBeginSchema,
  driveCancelSchema,
  driveContinueSchema,
  driveDisconnectSchema,
  driveInitialSchema,
  driveLookupSchema,
} from "./driveInput";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";

async function context(mutation = false) {
  const { hollowContext, authenticationRequest } = await import(
    "./hollowServer"
  );
  const { container, token } = await hollowContext(mutation);
  return { container, request: authenticationRequest(token) };
}
export const driveSettingsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const { getDriveSettings } = await import(
      "@repo/core/application/integration/drive/read"
    );
    const { container, request } = await context();
    return boundedDriveDto(await getDriveSettings(container, request));
  });
export const setDriveAutoBackupFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveAutoSettingSchema))
  .handler(async ({ data }) => {
    const { setDriveAutoBackup } = await import(
      "@repo/core/application/integration/drive/autoSetting"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(await setDriveAutoBackup(container, request, data));
  });
export const driveReceiptFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveLookupSchema))
  .handler(async ({ data }) => {
    const { getDriveReceipt } = await import(
      "@repo/core/application/integration/drive/read"
    );
    const { container, request } = await context();
    return boundedDriveDto(await getDriveReceipt(container, request, data));
  });
export const driveHistoryFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const { getDriveHistory } = await import(
      "@repo/core/application/integration/drive/read"
    );
    const { container, request } = await context();
    return boundedDriveDto(await getDriveHistory(container, request));
  });
export const beginDriveFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveBeginSchema))
  .handler(async ({ data }) => {
    const { beginDriveAuthorization } = await import(
      "@repo/core/application/integration/drive/connection"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(
      await beginDriveAuthorization(container, request, data),
    );
  });
export const createDriveFolderFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveInitialSchema))
  .handler(async ({ data }) => {
    const { beginDriveFolderCreation } = await import(
      "@repo/core/application/integration/drive/folders"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(
      await beginDriveFolderCreation(container, request, data),
    );
  });
export const continueDriveFolderFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveContinueSchema))
  .handler(async ({ data }) => {
    const { continueDriveFolder } = await import(
      "@repo/core/application/integration/drive/folders"
    );
    const { driveServices } = await import(
      "@repo/core/application/integration/drive/current"
    );
    const { container, request } = await context(true);
    const { id, sends, ...input } = data;
    return boundedDriveDto(
      await continueDriveFolder(
        container,
        request,
        id,
        sends === undefined ? input : { ...input, sends },
        driveServices(container).runtimeGeneration,
      ),
    );
  });
export const cancelDriveFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveCancelSchema))
  .handler(async ({ data }) => {
    const { cancelDriveOperation } = await import(
      "@repo/core/application/integration/drive/control"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(
      await cancelDriveOperation(container, request, data),
    );
  });
export const unlinkDriveFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveDisconnectSchema))
  .handler(async ({ data }) => {
    const { disconnectDrive } = await import(
      "@repo/core/application/integration/drive/control"
    );
    const { container, request } = await context(true);
    return boundedDriveDto(await disconnectDrive(container, request, data));
  });
