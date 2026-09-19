import type { WorkspacePublication } from "../entity";

export interface WorkspacePublicationRepository {
  resolve(slug: string): Promise<Readonly<{
    workspaceId: string;
    settingsVersion: number;
    publicationVersion: number;
  }> | null>;
  find(workspaceId: string): Promise<WorkspacePublication>;
  save(
    publication: WorkspacePublication,
    expectedVersion: number,
  ): Promise<boolean>;
  remove(workspaceId: string): Promise<void>;
}
