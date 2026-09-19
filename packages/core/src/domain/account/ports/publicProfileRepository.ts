import type { PublicProfile } from "../profile";

export interface PublicProfileRepository {
  find(accountId: string): Promise<PublicProfile | null>;
  findByHandle(handle: string): Promise<PublicProfile | null>;
  handleExists(handle: string, exceptAccountId: string): Promise<boolean>;
  hasPublicNotes(accountId: string): Promise<boolean>;
  ensure(accountId: string): Promise<void>;
  save(profile: PublicProfile, expectedVersion: number): Promise<boolean>;
}
