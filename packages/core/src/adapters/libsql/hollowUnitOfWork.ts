import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import type { DomainEvent } from "@repo/core/domain/common/event";
import { isSerializableError } from "@repo/core/lib/error";
import type { Database } from "./client";
import { LibsqlAccountRepository } from "./repositories/accountRepository";
import { LibsqlAssetRepository } from "./repositories/assetRepository";
import { LibsqlBatchRepository } from "./repositories/batchRepository";
import { LibsqlBrowseIndexRepository } from "./repositories/browseIndexRepository";
import { LibsqlDisplayNameRepository } from "./repositories/displayNameRepository";
import { LibsqlEmptyTrashRepository } from "./repositories/emptyTrashRepository";
import { mapDbError } from "./repositories/helpers";
import { LibsqlImportRepository } from "./repositories/importRepository";
import { LibsqlInvitationRepository } from "./repositories/invitationRepository";
import { LibsqlJobRepository } from "./repositories/jobRepository";
import { LibsqlNoteMoveRepository } from "./repositories/noteMoveRepository";
import { LibsqlNoteRepository } from "./repositories/noteRepository";
import { LibsqlObjectOperationRepository } from "./repositories/objectOperationRepository";
import { LibsqlPurgeRepository } from "./repositories/purgeRepository";
import { LibsqlReferenceRepository } from "./repositories/referenceRepository";
import { LibsqlRevisionRepository } from "./repositories/revisionRepository";
import { LibsqlScopeCapacityRepository } from "./repositories/scopeCapacityRepository";
import { LibsqlSharingRepository } from "./repositories/sharingRepository";
import { LibsqlTagRepository } from "./repositories/tagRepository";
import { LibsqlWorkspaceDeletionRepository } from "./repositories/workspaceDeletionRepository";
import { LibsqlWorkspaceIconRepository } from "./repositories/workspaceIconRepository";
import { LibsqlWorkspaceRepository } from "./repositories/workspaceRepository";
import { outboxEvents } from "./schema";

export type HollowTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export class LibsqlHollowUnitOfWorkProvider
  implements HollowUnitOfWorkProvider
{
  constructor(private readonly db: Database) {}
  async run<T>(
    fn: (context: HollowUnitOfWorkContext) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.db.transaction(async (transaction) => {
        const events: DomainEvent[] = [];
        const result = await fn({
          sharing: new LibsqlSharingRepository(transaction),
          displayNames: new LibsqlDisplayNameRepository(transaction),
          batches: new LibsqlBatchRepository(transaction),
          moves: new LibsqlNoteMoveRepository(transaction),
          tags: new LibsqlTagRepository(transaction),
          browseIndex: new LibsqlBrowseIndexRepository(transaction),
          invitations: new LibsqlInvitationRepository(transaction),
          workspaceIcons: new LibsqlWorkspaceIconRepository(transaction),
          workspaces: new LibsqlWorkspaceRepository(transaction),
          workspaceDeletions: new LibsqlWorkspaceDeletionRepository(
            transaction,
          ),
          capacity: new LibsqlScopeCapacityRepository(transaction),
          accounts: new LibsqlAccountRepository(transaction),
          assets: new LibsqlAssetRepository(transaction),
          notes: new LibsqlNoteRepository(transaction),
          imports: new LibsqlImportRepository(transaction),
          jobs: new LibsqlJobRepository(transaction),
          references: new LibsqlReferenceRepository(transaction),
          revisions: new LibsqlRevisionRepository(transaction),
          purges: new LibsqlPurgeRepository(transaction),
          emptyTrash: new LibsqlEmptyTrashRepository(transaction),
          objectOperations: new LibsqlObjectOperationRepository(transaction),
          collectEvents: (drafts) => events.push(...drafts),
        });
        if (events.length)
          await transaction.insert(outboxEvents).values(
            events.map((event) => ({
              id: event.id,
              eventType: event.type,
              aggregateId: event.aggregateId,
              payload: event.payload,
              occurredAt: event.occurredAt,
              createdAt: event.occurredAt,
            })),
          );
        return result;
      });
    } catch (error) {
      if (isSerializableError(error)) throw error;
      return mapDbError("Hollow のデータを保存できませんでした。", async () => {
        throw error;
      });
    }
  }
}
