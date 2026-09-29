import type {
  DriveConnection,
  DriveContext,
} from "@repo/core/domain/integration/drive";

export function driveCurrentMatches(
  input: Readonly<{
    expected: DriveContext;
    current: DriveContext | null;
    expectedEpoch: number;
    expectedSettingsVersion: number;
    connection: DriveConnection | null;
  }>,
): boolean {
  const { expected, current, connection } = input;
  return (
    current !== null &&
    connection !== null &&
    expected.accountId === current.accountId &&
    current.accountId === connection.accountId &&
    expected.sessionHash === current.sessionHash &&
    expected.authVersion === current.authVersion &&
    expected.browserHash === current.browserHash &&
    expected.browserEpoch === current.browserEpoch &&
    input.expectedEpoch === connection.epoch &&
    input.expectedSettingsVersion === connection.settingsVersion
  );
}
