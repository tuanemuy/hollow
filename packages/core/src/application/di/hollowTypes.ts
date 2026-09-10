import type { HollowUnitOfWorkProvider } from "../execution/hollowUnitOfWork";
import type {
  DocumentExtractor,
  ImportFormat,
} from "../ports/documentExtractor";
import type { HtmlSanitizer } from "../ports/htmlSanitizer";
import type { InlineMediaProcessor } from "../ports/inlineMediaProcessor";
import type { Mailer } from "../ports/mailer";
import type { MediaValidator } from "../ports/mediaValidator";
import type { ObjectStorage } from "../ports/objectStorage";
import type { PasswordHasher } from "../ports/passwordHasher";
import type {
  ReferenceProcessor,
  SafeReferenceFetcher,
} from "../ports/referenceProcessor";
import type { TokenGenerator } from "../ports/tokenGenerator";
import type { SharedDeps } from "./types";

export type HollowContainer = SharedDeps &
  Readonly<{
    unitOfWorkProvider: HollowUnitOfWorkProvider;
    passwordHasher: PasswordHasher;
    tokens: TokenGenerator;
    mailer: Mailer;
    htmlSanitizer: HtmlSanitizer;
    appUrl: string;
    inlineMedia?: InlineMediaProcessor;
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
