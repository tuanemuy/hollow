import type {
  NoteProjectionPort,
  SearchExecutionPort,
  TagNormalizerPort,
} from "../browse/ports";
import type { HollowUnitOfWorkProvider } from "../execution/hollowUnitOfWork";
import type {
  DocumentExtractor,
  ImportFormat,
} from "../ports/documentExtractor";
import type { HtmlSanitizer } from "../ports/htmlSanitizer";
import type { InlineMediaProcessor } from "../ports/inlineMediaProcessor";
import type { InvitationMailer } from "../ports/invitationMailer";
import type { Mailer } from "../ports/mailer";
import type { MediaValidator } from "../ports/mediaValidator";
import type { ObjectStorage } from "../ports/objectStorage";
import type { PasswordHasher } from "../ports/passwordHasher";
import type {
  ReferenceProcessor,
  SafeReferenceFetcher,
} from "../ports/referenceProcessor";
import type {
  SharePasswordWork,
  ShareTokenProtector,
} from "../ports/shareSecrets";
import type { TokenGenerator } from "../ports/tokenGenerator";
import type { TokenProtector } from "../ports/tokenProtector";
import type { WorkspaceIconProcessor } from "../ports/workspaceIconProcessor";
import type { TagReadPort } from "../tag/ports";
import type { SharedDeps } from "./types";

export type HollowContainer = SharedDeps &
  Readonly<{
    unitOfWorkProvider: HollowUnitOfWorkProvider;
    sharing?: Readonly<{
      protector: ShareTokenProtector;
      passwordWork: SharePasswordWork;
    }>;
    tagging?: Readonly<{ normalizer: TagNormalizerPort; read: TagReadPort }>;
    browsing?: Readonly<{
      projection: NoteProjectionPort;
      execution: SearchExecutionPort;
    }>;
    passwordHasher: PasswordHasher;
    tokens: TokenGenerator;
    mailer: Mailer;
    invitationDelivery?: Readonly<{
      protector: TokenProtector;
      mailer: InvitationMailer;
      wake(): void;
    }>;
    htmlSanitizer: HtmlSanitizer;
    appUrl: string;
    inlineMedia?: InlineMediaProcessor;
    workspaceIcon?: Readonly<{
      processor: WorkspaceIconProcessor;
      wake(): void;
    }>;
    purging?: Readonly<{ wake(): void }>;
    batching?: Readonly<{ wake(): void }>;
    referencing?: Readonly<{
      processor: ReferenceProcessor;
      fetcher: SafeReferenceFetcher;
      wake(): void;
    }>;
    importing?: Readonly<{
      storage: ObjectStorage;
      extractor: DocumentExtractor;
      mediaValidator: MediaValidator;
      detectFormat(bytes: Uint8Array, filename: string): Promise<ImportFormat>;
      wake(): void;
    }>;
  }>;
