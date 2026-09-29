import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import type { DriveInitialInput } from "./control";
import { driveChanged, driveServices } from "./current";
import { beginDrivePicker, runDriveControl } from "./folders";
import { getDriveReceipt } from "./read";

export async function launchDrivePicker(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveInitialInput,
) {
  const service = driveServices(c);
  const admitted = await beginDrivePicker(c, request, input);
  const result =
    admitted.accepted && admitted.row.phase === "queued"
      ? await runDriveControl(c, admitted.row.id, service.runtimeGeneration)
      : null;
  const receipt = await getDriveReceipt(c, request, {
    by: "id",
    kind: "control",
    id: admitted.row.id,
  });
  if (!receipt) throw driveChanged();
  if (
    !result?.picker ||
    !receipt.current ||
    receipt.phase !== "awaiting-selection"
  )
    return { kind: "receipt" as const, receipt };
  return {
    kind: "issued" as const,
    receipt,
    picker: {
      ...result.picker,
      appId: service.picker.appId,
      apiKey: service.picker.apiKey,
    },
  };
}
