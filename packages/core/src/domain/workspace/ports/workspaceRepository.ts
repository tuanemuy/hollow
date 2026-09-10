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
  settingsVersion(id: string): Promise<number>;
  updateSettings(
    id: string,
    expected: number,
    fields: Pick<Workspace, "name" | "description" | "slug">,
  ): Promise<boolean>;
  members(
    id: string,
    after: string | undefined,
    limit: number,
  ): Promise<
    readonly {
      accountId: string;
      email: string;
      role: WorkspaceRole;
      joinedAt: Date | null;
    }[]
  >;
  ownerCount(id: string): Promise<number>;
  join(
    id: string,
    accountId: string,
    role: WorkspaceRole,
    now: Date,
  ): Promise<void>;
  cancelActorJobs(id: string, accountId: string, now: Date): Promise<void>;
  membership(
    workspaceId: string,
    accountId: string,
    role: WorkspaceRole | null,
  ): Promise<void>;
}
export interface ScopeCapacityRepository {
  usedBytes(scope: NoteOwner, now: Date): Promise<number>;
}
