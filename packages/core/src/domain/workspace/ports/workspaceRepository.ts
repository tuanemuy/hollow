import type { NoteOwner } from "../../note/entity";
import type { Workspace, WorkspaceRole } from "../entity";

export interface WorkspaceRepository {
  find(id: string): Promise<Workspace | null>;
  role(id: string, accountId: string): Promise<WorkspaceRole | null>;
  list(
    accountId: string,
    after: string | undefined,
    limit: number,
  ): Promise<readonly (Workspace & { role: WorkspaceRole })[]>;
  countCreated(accountId: string): Promise<number>;
  slugExists(slug: string): Promise<boolean>;
  create(workspace: Workspace): Promise<void>;
  membership(
    workspaceId: string,
    accountId: string,
    role: WorkspaceRole | null,
  ): Promise<void>;
}
export interface ScopeCapacityRepository {
  usedBytes(scope: NoteOwner, now: Date): Promise<number>;
}
