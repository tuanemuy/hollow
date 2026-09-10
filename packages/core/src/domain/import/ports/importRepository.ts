import type {
  ImportBatch,
  ImportNotice,
  Original,
  UploadReservation,
} from "../entity";
export interface ImportRepository {
  insertBatch(batch: ImportBatch): Promise<void>;
  findBatch(id: string): Promise<ImportBatch | null>;
  listBatches(accountId: string, since: Date): Promise<readonly ImportBatch[]>;
  cancelBatch(id: string, now: Date): Promise<void>;
  insertReservation(reservation: UploadReservation): Promise<void>;
  findReservation(id: string): Promise<UploadReservation | null>;
  listReservations(batchId: string): Promise<readonly UploadReservation[]>;
  updateReservation(
    id: string,
    expectedState: UploadReservation["state"],
    state: UploadReservation["state"],
    failure?: string,
  ): Promise<boolean>;
  reservedAndUsedBytes(accountId: string, now: Date): Promise<number>;
  insertOriginal(original: Original): Promise<void>;
  findOriginal(id: string): Promise<Original | null>;
  findByNote(noteId: string): Promise<Original | null>;
  saveOriginal(original: Original): Promise<void>;
  replaceNotices(
    originalId: string,
    notices: readonly ImportNotice[],
  ): Promise<void>;
  listNotices(originalId: string): Promise<readonly ImportNotice[]>;
  expireReservations(now: Date): Promise<readonly string[]>;
  markStorageCleaned(storageKey: string): Promise<void>;
  pruneHistory(before: Date): Promise<void>;
}
