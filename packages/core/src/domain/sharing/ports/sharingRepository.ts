import type { ShareGrant, ShareScope, ShareSettings } from "../entity";

export type PasswordReservation = Readonly<{
  noteId: string;
  browserHash: string;
  browserRevision: number;
}>;
export type PasswordAdmission =
  | Readonly<{ kind: "allowed"; reservation: PasswordReservation }>
  | Readonly<{ kind: "blocked"; retryAt: Date }>;

export interface SharingRepository {
  find(noteId: string): Promise<ShareSettings | null>;
  findByTokenHash(hash: string): Promise<ShareSettings | null>;
  scope(noteId: string): Promise<ShareScope | null>;
  save(settings: ShareSettings, expectedVersion: number): Promise<boolean>;
  findGrant(noteId: string, browserHash: string): Promise<ShareGrant | null>;
  saveGrant(grant: ShareGrant): Promise<void>;
  reservePassword(
    noteId: string,
    browserHash: string,
    now: Date,
  ): Promise<PasswordAdmission>;
  finishPassword(
    reservation: PasswordReservation,
    valid: boolean,
    now: Date,
  ): Promise<void>;
  prune(now: Date): Promise<void>;
  rotationCandidates(
    after: string | undefined,
    limit: number,
  ): Promise<readonly ShareSettings[]>;
  replaceEnvelope(
    noteId: string,
    generation: number,
    previous: string,
    next: string,
  ): Promise<boolean>;
}
