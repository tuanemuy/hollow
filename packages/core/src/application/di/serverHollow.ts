import type { Database } from "@repo/core/adapters/libsql/client";
import { LibsqlHollowUnitOfWorkProvider } from "@repo/core/adapters/libsql/hollowUnitOfWork";
import { NodeHtmlSanitizer } from "@repo/core/adapters/node/htmlSanitizer";
import { NodePasswordHasher } from "@repo/core/adapters/node/passwordHasher";
import { NodeTokenGenerator } from "@repo/core/adapters/node/tokenGenerator";
import { SystemClock } from "../ports/clock";
import { UuidV7Generator } from "../ports/idGenerator";
import { ConsoleLogger } from "../ports/logger";
import type { Mailer } from "../ports/mailer";
import type { HollowContainer } from "./hollowTypes";

export function createHollowContainer(
  db: Database,
  appUrl: string,
  mailer: Mailer,
): HollowContainer {
  return {
    unitOfWorkProvider: new LibsqlHollowUnitOfWorkProvider(db),
    clock: SystemClock,
    idGenerator: UuidV7Generator,
    logger: ConsoleLogger,
    passwordHasher: NodePasswordHasher,
    tokens: NodeTokenGenerator,
    htmlSanitizer: NodeHtmlSanitizer,
    appUrl,
    mailer,
  };
}
