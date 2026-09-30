export type DriveBackupSourceIdentity = Readonly<{
  storageKey: string;
  bytes: number;
  sha256: string;
}>;

export interface DriveBackupSourceHandle {
  readonly bytes: number;
  prepare(): Promise<void>;
  readRange(offset: number, length: number): Promise<Uint8Array>;
  readonly closed: Promise<void>;
  close(): Promise<void>;
}

export interface DriveBackupSource {
  open(
    input: DriveBackupSourceIdentity,
    signal: AbortSignal,
  ): Promise<DriveBackupSourceHandle>;
}

export type DriveBackupFile = Readonly<{
  id: string;
  parents: readonly string[];
  marker: string | null;
  bytes: number;
  sha256: string | null;
  trashed: boolean;
  webViewLink: string | null;
  resourceKey: string | null;
}>;

export type DriveBackupReceived =
  | Readonly<{ kind: "incomplete"; offset: number }>
  | Readonly<{ kind: "complete"; file: DriveBackupFile }>
  | Readonly<{ kind: "session-expired" | "conflict" | "unknown" }>;

export type DriveBackupAccess = Readonly<{
  accessToken: string;
  signal: AbortSignal;
}>;

export interface DriveBackupProvider {
  allocateFileId(input: DriveBackupAccess): Promise<string>;
  startResumable(
    input: DriveBackupAccess &
      Readonly<{
        fileId: string;
        folderId: string;
        folderResourceKey: string | null;
        marker: string;
        name: string;
        bytes: number;
      }>,
  ): Promise<
    | Readonly<{ kind: "started"; session: string }>
    | Readonly<{ kind: "conflict" | "unknown" }>
  >;
  queryReceived(
    input: DriveBackupAccess & Readonly<{ session: string; bytes: number }>,
  ): Promise<DriveBackupReceived>;
  uploadChunk(
    input: DriveBackupAccess &
      Readonly<{
        session: string;
        bytes: number;
        offset: number;
        chunk: Uint8Array;
      }>,
  ): Promise<DriveBackupReceived>;
  inspectFile(
    input: DriveBackupAccess &
      Readonly<{ fileId: string; resourceKey: string | null }>,
  ): Promise<DriveBackupFile | null>;
}
