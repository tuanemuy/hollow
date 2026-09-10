import type { Asset, MediaDraft, MediaUpload } from "../entity";

export interface AssetRepository {
  insertDraft(draft: MediaDraft): Promise<void>;
  findDraft(id: string): Promise<MediaDraft | null>;
  bindDraft(id: string, noteId: string): Promise<void>;
  insertUpload(upload: MediaUpload): Promise<void>;
  findUpload(id: string): Promise<MediaUpload | null>;
  transitionUpload(
    id: string,
    from: MediaUpload["state"],
    to: MediaUpload["state"],
  ): Promise<boolean>;
  markUploadCleaned(id: string): Promise<void>;
  insert(asset: Asset): Promise<void>;
  find(id: string): Promise<Asset | null>;
  isReferenced(noteId: string, assetId: string): Promise<boolean>;
  referenceIds(noteId: string, version: number): Promise<readonly string[]>;
  pinRevision(
    noteId: string,
    version: number,
    assetIds: readonly string[],
  ): Promise<void>;
  removeRevisionPins(
    noteId: string,
    versions: readonly number[],
    now: Date,
  ): Promise<void>;
  /** Version 0 is the current body. Positive versions are immutable retention pins. */
  replaceCurrentReferences(
    noteId: string,
    assetIds: readonly string[],
    now: Date,
  ): Promise<void>;
  reservedAndUsedBytes(accountId: string, now: Date): Promise<number>;
  /** Marks unreachable objects deleting before storage I/O; retries survive crash. */
  collectGarbage(
    now: Date,
  ): Promise<{ assets: readonly Asset[]; uploads: readonly MediaUpload[] }>;
  finishDelete(id: string): Promise<void>;
}
