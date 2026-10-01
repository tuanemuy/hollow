import type { AccountRepository } from "@repo/core/domain/account/ports/accountRepository";
import type {
  AccountChallengeRepository,
  GoogleAuthAttemptRepository,
} from "@repo/core/domain/account/ports/authAttemptRepository";
import type {
  AccountAuthenticationRepository,
  AuthBrowserRepository,
} from "@repo/core/domain/account/ports/authenticationRepository";
import type { DisplayNameRepository } from "@repo/core/domain/account/ports/displayNameRepository";
import type { ProfileIconRepository } from "@repo/core/domain/account/ports/profileIconRepository";
import type { PublicProfileRepository } from "@repo/core/domain/account/ports/publicProfileRepository";
import type { AssetRepository } from "@repo/core/domain/asset/ports/assetRepository";
import type { DomainEvent } from "@repo/core/domain/common/event";
import type { ImportRepository } from "@repo/core/domain/import/ports/importRepository";
import type {
  DriveBackupJobRepository,
  DriveBackupRecordRepository,
  DriveBackupRequestRepository,
  DriveBackupTargetRepository,
  DriveBackupTransferRepository,
} from "@repo/core/domain/integration/driveBackupRepository";
import type {
  DriveAttemptRepository,
  DriveConnectionRepository,
  DriveControlRepository,
} from "@repo/core/domain/integration/driveRepository";
import type {
  OpenRouterAttemptRepository,
  OpenRouterConnectionRepository,
  OpenRouterModelSettingsRepository,
} from "@repo/core/domain/integration/openRouterRepository";
import type { JobRepository } from "@repo/core/domain/job/ports/jobRepository";
import type { PdfPreviewRepository } from "@repo/core/domain/llm/pdfPreview";
import type {
  LlmConversionRepository,
  LlmDispatchRepository,
  LlmQuotaRepository,
} from "@repo/core/domain/llm/repositories";
import type { NoteRepository } from "@repo/core/domain/note/ports/noteRepository";
import type { RevisionRepository } from "@repo/core/domain/note/ports/revisionRepository";
import type { PublicNoteRepository } from "@repo/core/domain/publication/ports/publicNoteRepository";
import type { WorkspacePublicationRepository } from "@repo/core/domain/publication/ports/workspacePublicationRepository";
import type { EmptyTrashRepository } from "@repo/core/domain/purge/ports/emptyTrashRepository";
import type {
  ObjectOperationRepository,
  PurgeRepository,
} from "@repo/core/domain/purge/ports/purgeRepository";
import type { ReferenceRepository } from "@repo/core/domain/reference/ports/referenceRepository";
import type { SharingRepository } from "@repo/core/domain/sharing/ports/sharingRepository";
import type { InvitationRepository } from "@repo/core/domain/workspace/ports/invitationRepository";
import type { WorkspaceDeletionRepository } from "@repo/core/domain/workspace/ports/workspaceDeletionRepository";
import type { WorkspaceIconRepository } from "@repo/core/domain/workspace/ports/workspaceIconRepository";
import type {
  ScopeCapacityRepository,
  WorkspaceRepository,
} from "@repo/core/domain/workspace/ports/workspaceRepository";
import type { TagRepository } from "../../domain/tag/ports/tagRepository";
import type { BatchRepository } from "../batch/ports";
import type { BrowseIndexRepository } from "../browse/ports";
import type { ExportOperationRepository } from "../export/ports";
import type { OpenRouterWaitingReadPort } from "../integration/openRouter/ports";
import type { NoteMoveRepository } from "../move/ports";
import type {
  PdfAnonymousDeliveryRepository,
  PdfAnonymousRequestRepository,
} from "../pdf/anonymousPorts";
import type { PdfDemandRepository } from "../pdf/demandPorts";
import type {
  PdfArtifactRepository,
  PdfComputationRepository,
  PdfDeliveryRepository,
  PdfRequestRepository,
} from "../pdf/ports";
import type { PublicDiscoveryRateRepository } from "../publication/ports";
import type {
  MachineRegenerationRepository,
  RegenerationRecordRepository,
  SourceAttemptRepository,
  SourceBindingRepository,
} from "../regeneration/ports";
import type { ZipPdfRepository } from "../zip/pdfPorts";
import type {
  ZipArtifactRepository,
  ZipDeliveryRepository,
  ZipRequestRepository,
  ZipSpoolRepository,
  ZipWorkRepository,
} from "../zip/ports";
import type { UnitOfWorkProvider } from "./unitOfWork";

export type HollowUnitOfWorkContext = Readonly<{
  regenerationBindings: SourceBindingRepository;
  regenerationAttempts: SourceAttemptRepository;
  machineRegenerations: MachineRegenerationRepository;
  regenerationRecords: RegenerationRecordRepository;
  driveBackupRequests: DriveBackupRequestRepository;
  driveBackupJobs: DriveBackupJobRepository;
  driveBackupTargets: DriveBackupTargetRepository;
  driveBackupTransfers: DriveBackupTransferRepository;
  driveBackupRecords: DriveBackupRecordRepository;
  driveConnections: DriveConnectionRepository;
  driveAttempts: DriveAttemptRepository;
  driveControls: DriveControlRepository;
  llmConversions: LlmConversionRepository;
  llmDispatches: LlmDispatchRepository;
  llmQuota: LlmQuotaRepository;
  llmPdfPreviews: PdfPreviewRepository;
  openRouterConnections: OpenRouterConnectionRepository;
  openRouterAttempts: OpenRouterAttemptRepository;
  openRouterModels: OpenRouterModelSettingsRepository;
  openRouterWaiting: OpenRouterWaitingReadPort;
  authentication: AccountAuthenticationRepository;
  authBrowsers: AuthBrowserRepository;
  googleAttempts: GoogleAuthAttemptRepository;
  authChallenges: AccountChallengeRepository;
  zipPdf: ZipPdfRepository;
  zipRequests: ZipRequestRepository;
  zipWork: ZipWorkRepository;
  zipSpools: ZipSpoolRepository;
  zipArtifacts: ZipArtifactRepository;
  zipDeliveries: ZipDeliveryRepository;
  pdfRequests: PdfRequestRepository;
  pdfComputations: PdfComputationRepository;
  pdfArtifacts: PdfArtifactRepository;
  pdfDeliveries: PdfDeliveryRepository;
  pdfAnonymousRequests: PdfAnonymousRequestRepository;
  pdfAnonymousDeliveries: PdfAnonymousDeliveryRepository;
  pdfDemands: PdfDemandRepository;
  publicNotes: PublicNoteRepository;
  publicProfiles: PublicProfileRepository;
  profileIcons: ProfileIconRepository;
  workspacePublications: WorkspacePublicationRepository;
  publicDiscoveryRates: PublicDiscoveryRateRepository;
  exports: ExportOperationRepository;
  sharing: SharingRepository;
  displayNames: DisplayNameRepository;
  batches: BatchRepository;
  moves: NoteMoveRepository;
  tags: TagRepository;
  browseIndex: BrowseIndexRepository;
  invitations: InvitationRepository;
  workspaceIcons: WorkspaceIconRepository;
  workspaceDeletions: WorkspaceDeletionRepository;
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
  /** Synchronous abort/wake notification only; the committed fence remains authoritative. */
  afterCommit(notify: () => undefined): void;
}>;
export type HollowUnitOfWorkProvider =
  UnitOfWorkProvider<HollowUnitOfWorkContext>;
