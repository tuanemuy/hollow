const brand = Symbol.for("hollow.drive-backup-object-ownership-error.v1");

export class DriveBackupOwnershipUnprovenError extends Error {
  readonly [brand] = true;
  readonly code = "DRIVE_BACKUP_OWNERSHIP_UNKNOWN";
  readonly owner: Readonly<{ kind: "drive-backup"; id: string }>;

  constructor(transferId: string) {
    super(
      "バックアップの実終了を確認できません。所有状態を確認するまで原本を保全します。",
    );
    this.name = "DriveBackupOwnershipUnprovenError";
    this.owner = { kind: "drive-backup", id: transferId };
  }
}

export function isDriveBackupOwnershipUnprovenError(
  error: unknown,
): error is DriveBackupOwnershipUnprovenError {
  return (
    error instanceof Error &&
    brand in error &&
    error[brand] === true &&
    "code" in error &&
    error.code === "DRIVE_BACKUP_OWNERSHIP_UNKNOWN" &&
    "owner" in error &&
    typeof error.owner === "object" &&
    error.owner !== null &&
    "kind" in error.owner &&
    error.owner.kind === "drive-backup" &&
    "id" in error.owner &&
    typeof error.owner.id === "string" &&
    error.owner.id.length > 0
  );
}
