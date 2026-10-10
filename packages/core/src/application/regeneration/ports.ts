import type { StoredBackupRecord } from "@repo/core/domain/integration/driveBackupRepository";
import type {
  MachineRegeneration,
  SourceAttempt,
  SourceBinding,
} from "@repo/core/domain/regeneration/entity";

export type RegenerationRecordCursor = Readonly<{
  createdAt: Date;
  id: string;
}>;
export interface RegenerationRecordRepository {
  page(
    noteId: string,
    after: RegenerationRecordCursor | null,
  ): Promise<readonly StoredBackupRecord[]>;
  find(noteId: string, recordId: string): Promise<StoredBackupRecord | null>;
}
export interface SourceBindingRepository {
  insert(value: SourceBinding): Promise<void>;
  find(id: string): Promise<SourceBinding | null>;
  replace(value: SourceBinding, expectedVersion: number): Promise<boolean>;
  remove(id: string): Promise<void>;
}
export interface SourceAttemptRepository {
  insert(value: SourceAttempt): Promise<void>;
  find(id: string): Promise<SourceAttempt | null>;
  forBinding(bindingId: string): Promise<readonly SourceAttempt[]>;
  held(): Promise<readonly SourceAttempt[]>;
  claim(value: SourceAttempt, expectedVersion: number): Promise<boolean>;
  replace(value: SourceAttempt, expectedVersion: number): Promise<boolean>;
  removeReleased(bindingId: string): Promise<void>;
}
export interface MachineRegenerationRepository {
  candidate(): Promise<MachineRegeneration | null>;
  claimExact(
    value: MachineRegeneration,
    expectedVersion: number,
    now: Date,
  ): Promise<boolean>;
  activeForNote(noteId: string): Promise<MachineRegeneration | null>;
  owned(runtimeId: string): Promise<readonly MachineRegeneration[]>;
  page(
    executorId: string,
    after: RegenerationRecordCursor | null,
  ): Promise<readonly MachineRegeneration[]>;
  finishJob(value: MachineRegeneration, now: Date): Promise<boolean>;
  prune(before: Date, limit: number): Promise<void>;
  insert(value: MachineRegeneration): Promise<void>;
  find(id: string): Promise<MachineRegeneration | null>;
  command(
    executorId: string,
    commandId: string,
  ): Promise<MachineRegeneration | null>;
  replace(
    value: MachineRegeneration,
    expectedVersion: number,
  ): Promise<boolean>;
  remove(id: string): Promise<void>;
}
