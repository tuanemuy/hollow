import type {
  Companion,
  ReferenceEntry,
  ReferenceJob,
  ReferenceObject,
  ReferenceSettings,
  SourceBundle,
} from "../entity";
export interface ReferenceRepository {
  settings(noteId: string): Promise<ReferenceSettings | null>;
  saveSettings(row: ReferenceSettings): Promise<void>;
  entries(noteId: string): Promise<readonly ReferenceEntry[]>;
  saveEntry(row: ReferenceEntry): Promise<void>;
  clearCurrent(noteId: string): Promise<void>;
  insertJob(row: ReferenceJob): Promise<void>;
  job(id: string): Promise<ReferenceJob | null>;
  activeForNote(noteId: string): Promise<readonly ReferenceJob[]>;
  cancelNote(noteId: string, now: Date): Promise<void>;
  listJobs(accountId: string, since: Date): Promise<readonly ReferenceJob[]>;
  retry(id: string): Promise<ReferenceJob | null>;
  claim(now: Date, token: string, until: Date): Promise<ReferenceJob | null>;
  heartbeat(
    id: string,
    token: string,
    now: Date,
    until: Date,
    completed: number,
  ): Promise<boolean>;
  finish(
    id: string,
    token: string,
    now: Date,
    state: "succeeded" | "failed" | "cancelled",
    failure?: string,
  ): Promise<boolean>;
  cancel(id: string, now: Date): Promise<void>;
  saveObject(row: ReferenceObject): Promise<void>;
  objects(jobId: string): Promise<readonly ReferenceObject[]>;
  abandonedObjects(now: Date): Promise<readonly ReferenceObject[]>;
  usedBytes(accountId: string): Promise<number>;
  insertBundle(row: SourceBundle): Promise<void>;
  bundle(id: string): Promise<SourceBundle | null>;
  sealBundle(id: string): Promise<void>;
  insertCompanion(row: Companion): Promise<void>;
  companions(bundleId: string): Promise<readonly Companion[]>;
  /** Sealed bundles cannot accept new members. All uploads must be terminal and no note may retain the bundle. */
  orphanCompanions(): Promise<readonly Companion[]>;
  removeOrphanCompanion(id: string): Promise<void>;
  pruneJobs(before: Date): Promise<void>;
}
