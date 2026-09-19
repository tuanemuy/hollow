import type { IconOutput } from "../../workspace/icon";
import type { ProfileIcon } from "../profile";

export interface ProfileIconRepository {
  create(icon: ProfileIcon): Promise<void>;
  find(id: string): Promise<ProfileIcon | null>;
  processing(id: string, expiresAt: Date): Promise<boolean>;
  writing(id: string, output: IconOutput): Promise<boolean>;
  adopt(
    id: string,
    accountId: string,
    expectedVersion: number,
    now: Date,
  ): Promise<boolean>;
  fence(id: string, now: Date): Promise<void>;
  expire(now: Date): Promise<void>;
  cleanupCandidates(now: Date, limit: number): Promise<readonly ProfileIcon[]>;
  retryCleanup(id: string, next: Date): Promise<void>;
  finishCleanup(id: string, token: string): Promise<boolean>;
}
