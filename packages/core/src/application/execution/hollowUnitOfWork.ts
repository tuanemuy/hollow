import type { AccountRepository } from "@repo/core/domain/account/ports/accountRepository";
import type { AssetRepository } from "@repo/core/domain/asset/ports/assetRepository";
import type { DomainEvent } from "@repo/core/domain/common/event";
import type { ImportRepository } from "@repo/core/domain/import/ports/importRepository";
import type { JobRepository } from "@repo/core/domain/job/ports/jobRepository";
import type { NoteRepository } from "@repo/core/domain/note/ports/noteRepository";
import type { RevisionRepository } from "@repo/core/domain/note/ports/revisionRepository";
import type { ReferenceRepository } from "@repo/core/domain/reference/ports/referenceRepository";
import type { UnitOfWorkProvider } from "./unitOfWork";

export type HollowUnitOfWorkContext = Readonly<{
  accounts: AccountRepository;
  assets: AssetRepository;
  notes: NoteRepository;
  revisions: RevisionRepository;
  imports: ImportRepository;
  jobs: JobRepository;
  references: ReferenceRepository;
  collectEvents(events: readonly DomainEvent[]): void;
}>;
export type HollowUnitOfWorkProvider =
  UnitOfWorkProvider<HollowUnitOfWorkContext>;
