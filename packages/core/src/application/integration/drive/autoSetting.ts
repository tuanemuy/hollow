import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import { driveActor, driveChanged } from "./current";

export async function setDriveAutoBackup(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{
    expectedEpoch: number;
    expectedSettingsVersion: number;
    enabled: boolean;
  }>,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const row = await u.driveConnections.find(actor.accountId);
    if (
      !row ||
      row.epoch !== input.expectedEpoch ||
      row.settingsVersion !== input.expectedSettingsVersion ||
      (input.enabled &&
        (row.state !== "linked" ||
          !row.folder ||
          !c.drive?.backup ||
          !c.drive.protector.available() ||
          !c.importing?.storage.withOwner))
    )
      throw driveChanged();
    if (row.autoBackup === input.enabled) return { changed: false };
    if (row.state === "unlinked") throw driveChanged();
    if (
      !(await u.driveConnections.replace(
        {
          ...row,
          autoBackup: input.enabled,
          settingsVersion: row.settingsVersion + 1,
          version: row.version + 1,
          updatedAt: c.clock.now(),
        },
        row.version,
        "auto-setting",
      ))
    )
      throw driveChanged();
    return { changed: true };
  });
}
