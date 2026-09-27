import type { Database } from "@repo/core/adapters/libsql/client";
import { LibsqlHollowUnitOfWorkProvider } from "@repo/core/adapters/libsql/hollowUnitOfWork";
import { BoundedAuthenticationPasswordHasher } from "@repo/core/adapters/node/authenticationExecution";
import { NodeHtmlSanitizer } from "@repo/core/adapters/node/htmlSanitizer";
import { NodePasswordHasher } from "@repo/core/adapters/node/passwordHasher";
import { NodeTokenGenerator } from "@repo/core/adapters/node/tokenGenerator";
import { BusinessRuleError } from "@repo/core/domain/error";
import { SystemClock } from "../ports/clock";
import { UuidV7Generator } from "../ports/idGenerator";
import { ConsoleLogger } from "../ports/logger";
import type { Mailer } from "../ports/mailer";
import type { HollowContainer } from "./hollowTypes";

export function createHollowContainer(
  db: Database,
  appUrl: string,
  mailer: Mailer,
): HollowContainer &
  Readonly<{ passwordHasher: BoundedAuthenticationPasswordHasher }> {
  return {
    unitOfWorkProvider: new LibsqlHollowUnitOfWorkProvider(db),
    pdfAnonymousTicketSigner: {
      activeKeyId: () => null,
      verify: () => null,
      sign: () => {
        throw new BusinessRuleError(
          "PDF_NOT_CONFIGURED",
          "匿名PDFの署名設定を利用できません。",
        );
      },
    },
    clock: SystemClock,
    idGenerator: UuidV7Generator,
    logger: ConsoleLogger,
    passwordHasher: new BoundedAuthenticationPasswordHasher(NodePasswordHasher),
    tokens: NodeTokenGenerator,
    htmlSanitizer: NodeHtmlSanitizer,
    appUrl,
    mailer,
  };
}
