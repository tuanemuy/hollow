import type { AccountRepository } from "@repo/core/domain/account/ports/accountRepository";
import type { AssetRepository } from "@repo/core/domain/asset/ports/assetRepository";
import type { DomainEvent } from "@repo/core/domain/common/event";
import type { ImportRepository } from "@repo/core/domain/import/ports/importRepository";
import type { JobRepository } from "@repo/core/domain/job/ports/jobRepository";
import type { NoteRepository } from "@repo/core/domain/note/ports/noteRepository";
import type { RevisionRepository } from "@repo/core/domain/note/ports/revisionRepository";
import type { EmptyTrashRepository } from "@repo/core/domain/purge/ports/emptyTrashRepository";
import type {
  ObjectOperationRepository,
  PurgeRepository,
} from "@repo/core/domain/purge/ports/purgeRepository";
import type { ReferenceRepository } from "@repo/core/domain/reference/ports/referenceRepository";
import type { InvitationRepository } from "@repo/core/domain/workspace/ports/invitationRepository";
import type { WorkspaceIconRepository } from "@repo/core/domain/workspace/ports/workspaceIconRepository";
import type {
  ScopeCapacityRepository,
  WorkspaceRepository,
} from "@repo/core/domain/workspace/ports/workspaceRepository";
import type { TagRepository } from "../../domain/tag/ports/tagRepository";
import type { BrowseIndexRepository } from "../browse/ports";
import type { NoteMoveRepository } from "../move/ports";
import type { UnitOfWorkProvider } from "./unitOfWork";

export type HollowUnitOfWorkContext = Readonly<{
  moves: NoteMoveRepository;
  tags: TagRepository;
  browseIndex: BrowseIndexRepository;
  invitations: InvitationRepository;
  workspaceIcons: WorkspaceIconRepository;
  workspaces: WorkspaceRepository;
  capacity: ScopeCapacityRepository;
  accounts: AccountRepository;
  assets: AssetRepository;
  notes: NoteRepository;
  revisions: RevisionRepository;
  imports: ImportRepository;
  jobs: JobRepository;
  references: ReferenceRepository;
  purges: PurgeRepository;
  emptyTrash: EmptyTrashRepository;
  objectOperations: ObjectOperationRepository;
  collectEvents(events: readonly DomainEvent[]): void;
}>;
export type HollowUnitOfWorkProvider =
  UnitOfWorkProvider<HollowUnitOfWorkContext>;
