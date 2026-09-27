import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import { isLlmOperationError } from "@repo/core/application/llm/ports";
import type { DomainEvent } from "@repo/core/domain/common/event";
import { isSerializableError } from "@repo/core/lib/error";
import type { Database } from "./client";
import { LibsqlAccountChallengeRepository } from "./repositories/accountChallengeRepository";
import { LibsqlAccountRepository } from "./repositories/accountRepository";
import { LibsqlAssetRepository } from "./repositories/assetRepository";
import { LibsqlAuthBrowserRepository } from "./repositories/authBrowserRepository";
import { LibsqlAccountAuthenticationRepository } from "./repositories/authenticationRepository";
import { LibsqlBatchRepository } from "./repositories/batchRepository";
import { LibsqlBrowseIndexRepository } from "./repositories/browseIndexRepository";
import { LibsqlDisplayNameRepository } from "./repositories/displayNameRepository";
import { LibsqlEmptyTrashRepository } from "./repositories/emptyTrashRepository";
import { LibsqlExportOperationRepository } from "./repositories/exportRepository";
import { LibsqlGoogleAuthAttemptRepository } from "./repositories/googleAuthAttemptRepository";
import { mapDbError } from "./repositories/helpers";
import { LibsqlImportRepository } from "./repositories/importRepository";
import { LibsqlInvitationRepository } from "./repositories/invitationRepository";
import { LibsqlJobRepository } from "./repositories/jobRepository";
import {
  LibsqlLlmConversionRepository,
  LibsqlLlmDispatchRepository,
  LibsqlLlmQuotaRepository,
} from "./repositories/llmRepository";
import { LibsqlNoteMoveRepository } from "./repositories/noteMoveRepository";
import { LibsqlNoteRepository } from "./repositories/noteRepository";
import { LibsqlObjectOperationRepository } from "./repositories/objectOperationRepository";
import {
  LibsqlOpenRouterAttemptRepository,
  LibsqlOpenRouterConnectionRepository,
  LibsqlOpenRouterModelSettingsRepository,
} from "./repositories/openRouterRepository";
import { LibsqlOpenRouterWaitingRead } from "./repositories/openRouterWaitingRead";
import { LibsqlPdfAnonymousDeliveryRepository } from "./repositories/pdfAnonymousDeliveryRepository";
import { LibsqlPdfAnonymousRequestRepository } from "./repositories/pdfAnonymousRequestRepository";
import { LibsqlPdfArtifactRepository } from "./repositories/pdfArtifactRepository";
import { LibsqlPdfComputationRepository } from "./repositories/pdfComputationRepository";
import { LibsqlPdfDeliveryRepository } from "./repositories/pdfDeliveryRepository";
import { LibsqlPdfDemandRepository } from "./repositories/pdfDemandRepository";
import { LibsqlPdfRequestRepository } from "./repositories/pdfRequestRepository";
import { LibsqlProfileIconRepository } from "./repositories/profileIconRepository";
import { LibsqlPublicDiscoveryRateRepository } from "./repositories/publicDiscoveryRateRepository";
import { LibsqlPublicNoteRepository } from "./repositories/publicNoteRepository";
import { LibsqlPublicProfileRepository } from "./repositories/publicProfileRepository";
import { LibsqlPurgeRepository } from "./repositories/purgeRepository";
import { LibsqlReferenceRepository } from "./repositories/referenceRepository";
import { LibsqlRevisionRepository } from "./repositories/revisionRepository";
import { LibsqlScopeCapacityRepository } from "./repositories/scopeCapacityRepository";
import { LibsqlSharingRepository } from "./repositories/sharingRepository";
import { LibsqlTagRepository } from "./repositories/tagRepository";
import { LibsqlWorkspaceDeletionRepository } from "./repositories/workspaceDeletionRepository";
import { LibsqlWorkspaceIconRepository } from "./repositories/workspaceIconRepository";
import { LibsqlWorkspacePublicationRepository } from "./repositories/workspacePublicationRepository";
import { LibsqlWorkspaceRepository } from "./repositories/workspaceRepository";
import { LibsqlZipArtifactRepository } from "./repositories/zipArtifactRepository";
import { LibsqlZipDeliveryRepository } from "./repositories/zipDeliveryRepository";
import { LibsqlZipPdfRepository } from "./repositories/zipPdfRepository";
import { LibsqlZipRequestRepository } from "./repositories/zipRequestRepository";
import { LibsqlZipSpoolRepository } from "./repositories/zipSpoolRepository";
import { LibsqlZipWorkRepository } from "./repositories/zipWorkRepository";
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
          llmConversions: new LibsqlLlmConversionRepository(transaction),
          llmDispatches: new LibsqlLlmDispatchRepository(transaction),
          llmQuota: new LibsqlLlmQuotaRepository(transaction),
          openRouterConnections: new LibsqlOpenRouterConnectionRepository(
            transaction,
          ),
          openRouterAttempts: new LibsqlOpenRouterAttemptRepository(
            transaction,
          ),
          openRouterModels: new LibsqlOpenRouterModelSettingsRepository(
            transaction,
          ),
          openRouterWaiting: new LibsqlOpenRouterWaitingRead(transaction),
          authentication: new LibsqlAccountAuthenticationRepository(
            transaction,
          ),
          authBrowsers: new LibsqlAuthBrowserRepository(transaction),
          googleAttempts: new LibsqlGoogleAuthAttemptRepository(transaction),
          authChallenges: new LibsqlAccountChallengeRepository(transaction),
          zipPdf: new LibsqlZipPdfRepository(transaction),
          zipRequests: new LibsqlZipRequestRepository(transaction),
          zipWork: new LibsqlZipWorkRepository(transaction),
          zipSpools: new LibsqlZipSpoolRepository(transaction),
          zipArtifacts: new LibsqlZipArtifactRepository(transaction),
          zipDeliveries: new LibsqlZipDeliveryRepository(transaction),
          pdfRequests: new LibsqlPdfRequestRepository(transaction),
          pdfComputations: new LibsqlPdfComputationRepository(transaction),
          pdfArtifacts: new LibsqlPdfArtifactRepository(transaction),
          pdfDeliveries: new LibsqlPdfDeliveryRepository(transaction),
          pdfAnonymousRequests: new LibsqlPdfAnonymousRequestRepository(
            transaction,
          ),
          pdfAnonymousDeliveries: new LibsqlPdfAnonymousDeliveryRepository(
            transaction,
          ),
          pdfDemands: new LibsqlPdfDemandRepository(transaction),
          publicNotes: new LibsqlPublicNoteRepository(transaction),
          publicProfiles: new LibsqlPublicProfileRepository(transaction),
          profileIcons: new LibsqlProfileIconRepository(transaction),
          workspacePublications: new LibsqlWorkspacePublicationRepository(
            transaction,
          ),
          publicDiscoveryRates: new LibsqlPublicDiscoveryRateRepository(
            transaction,
          ),
          exports: new LibsqlExportOperationRepository(transaction),
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
      if (isSerializableError(error) || isLlmOperationError(error)) throw error;
      return mapDbError("Hollow のデータを保存できませんでした。", async () => {
        throw error;
      });
    }
  }
}
