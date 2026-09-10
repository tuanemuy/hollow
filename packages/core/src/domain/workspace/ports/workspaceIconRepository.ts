import type { IconOutput, WorkspaceIcon } from "../icon";

export interface WorkspaceIconRepository {
  create(icon: WorkspaceIcon): Promise<void>;
  find(id: string): Promise<WorkspaceIcon | null>;
  processing(id: string, expiresAt: Date): Promise<boolean>;
  writing(id: string, output: IconOutput): Promise<boolean>;
  adopt(
    id: string,
    workspaceId: string,
    expectedVersion: number,
    now: Date,
  ): Promise<boolean>;
  fence(id: string, now: Date): Promise<void>;
  invalidateActor(
    workspaceId: string,
    actorId: string,
    now: Date,
  ): Promise<void>;
  expire(now: Date): Promise<void>;
  cleanupCandidates(
    now: Date,
    limit: number,
  ): Promise<readonly WorkspaceIcon[]>;
  retryCleanup(id: string, next: Date): Promise<void>;
  finishCleanup(id: string, token: string): Promise<boolean>;
}
