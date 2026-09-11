import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  applyPragmas,
  createLibsqlClient,
  getDatabase,
} from "@repo/core/adapters/libsql/client";
import { createBrowseBackfillRunner } from "@repo/core/adapters/node/browse/backfillRunner";
import { IsolatedNoteProjection } from "@repo/core/adapters/node/browse/isolatedProjection";
import { NodeSearchExecution } from "@repo/core/adapters/node/browse/searchExecution";
import {
  assertTagNormalizerUnicodeVersion,
  NodeTagNormalizer,
} from "@repo/core/adapters/node/browse/tagNormalizer";
import { NodeTagRead } from "@repo/core/adapters/node/browse/tagRead";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { createImportRunner } from "@repo/core/adapters/node/importRunner";
import { IsolatedInlineMediaProcessor } from "@repo/core/adapters/node/inlineMediaProcessor";
import { LocalInvitationMailer } from "@repo/core/adapters/node/invitationMailer";
import { createInvitationRunner } from "@repo/core/adapters/node/invitationRunner";
import { LocalMailbox } from "@repo/core/adapters/node/localMailbox";
import { createPurgeRunner } from "@repo/core/adapters/node/purgeRunner";
import { NodeReferenceProcessor } from "@repo/core/adapters/node/reference/referenceProcessor";
import { NodeSafeReferenceFetcher } from "@repo/core/adapters/node/reference/safeFetcher";
import { createReferenceRunner } from "@repo/core/adapters/node/referenceRunner";
import { NodeTokenProtector } from "@repo/core/adapters/node/tokenProtector";
import { IsolatedWorkspaceIconProcessor } from "@repo/core/adapters/node/workspaceIconProcessor";
import { createWorkspaceIconRunner } from "@repo/core/adapters/node/workspaceIconRunner";
import { installContainerStore } from "@repo/core/application/di/containerStore";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  createNodeRequestContainer,
  createNodeWorkerContainer,
  readNodeRequestServerConfig,
  readNodeServerEnv,
} from "@repo/core/application/di/serverNode";
import type { RequestContainer } from "@repo/core/application/di/types";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { ConsoleLogger } from "@repo/core/application/ports/logger";
import type { Mailer } from "@repo/core/application/ports/mailer";
import {
  NoopRelayTrigger,
  type RelayTrigger,
} from "@repo/core/application/ports/relayTrigger";
import { importHttp } from "@/presentation/importHttp.node";
import { mediaHttp } from "@/presentation/mediaHttp.node";
import { guardResourceRequest } from "@/presentation/resourceRequestGuard.node";
import { serveStaticAsset } from "@/presentation/staticAssets.node";
import { workspaceIconHttp } from "@/presentation/workspaceIconHttp.node";
import { createNodeWorkerRunner } from "@/worker/node/runner";

// SSR and RSC are separate module graphs in the same process; pin the
// ALS on `globalThis` (and on `import.meta.hot.data` for HMR) so both
// resolve the same store.
const ALS_SYMBOL: unique symbol = Symbol.for(
  "@tanstack-start-template/request-als",
) as never;
type AlsHotData = { als?: AsyncLocalStorage<RequestContainer> };
type AlsGlobalSlot = { [ALS_SYMBOL]?: AsyncLocalStorage<RequestContainer> };
const alsHotData: AlsHotData = (import.meta.hot?.data ?? {}) as AlsHotData;
const alsGlobal = globalThis as unknown as AlsGlobalSlot;
const storage =
  alsGlobal[ALS_SYMBOL] ??
  alsHotData.als ??
  new AsyncLocalStorage<RequestContainer>();
alsGlobal[ALS_SYMBOL] = storage;
if (import.meta.hot) {
  (import.meta.hot.data as AlsHotData).als = storage;
}
installContainerStore({ getStore: () => storage.getStore() });

/**
 * Boots node-runtime resources (env → libSQL → worker runner → request
 * factory) and returns a fetch handler plus a shutdown hook.
 */
export type NodeServerBoot = Readonly<{
  fetch: (request: Request) => Promise<Response>;
  port: number;
  hostname: string;
  shutdown: () => Promise<void>;
}>;

export async function boot(): Promise<NodeServerBoot> {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
  const env = readNodeServerEnv();
  const logger = ConsoleLogger;

  // libSQL's embedded driver fails to open a `file:` URL whose parent
  // directory does not exist; pre-create it so a fresh clone boots.
  if (env.DATABASE_URL.startsWith("file:")) {
    const filePath = env.DATABASE_URL.slice("file:".length);
    const parent = path.dirname(path.resolve(process.cwd(), filePath));
    fs.mkdirSync(parent, { recursive: true });
  }

  const client = createLibsqlClient({
    url: env.DATABASE_URL,
    ...(env.DATABASE_AUTH_TOKEN !== undefined
      ? { authToken: env.DATABASE_AUTH_TOKEN }
      : {}),
    ...(env.DATABASE_ENCRYPTION_KEY !== undefined
      ? { encryptionKey: env.DATABASE_ENCRYPTION_KEY }
      : {}),
  });
  const isMemory = env.DATABASE_URL === ":memory:";
  await applyPragmas(client, isMemory ? { wal: false } : {});
  const db = getDatabase(client);
  const mailer: Mailer =
    process.env.HOLLOW_MAIL_MODE === "local"
      ? new LocalMailbox(
          path.resolve(process.env.HOLLOW_MAILBOX_DIR ?? "data/mailbox"),
        )
      : {
          async send() {
            throw new SystemError(
              SystemErrorCode.ExternalApiError,
              "メール送信アダプターが設定されていません。",
            );
          },
        };
  let importRunner: ReturnType<typeof createImportRunner> | undefined;
  let referenceRunner: ReturnType<typeof createReferenceRunner> | undefined;
  let purgeRunner: ReturnType<typeof createPurgeRunner> | undefined;
  let invitationRunner: ReturnType<typeof createInvitationRunner> | undefined;
  let iconRunner: ReturnType<typeof createWorkspaceIconRunner> | undefined;
  let importRelay: RelayTrigger = NoopRelayTrigger;
  const baseHollow = createHollowContainer(db, env.APP_URL, mailer);
  assertTagNormalizerUnicodeVersion(process.versions.unicode);
  const browseDirectory = path.resolve("dist/server/browse");
  const searchExecution = new NodeSearchExecution({
    childPath: path.join(browseDirectory, "searchSupervisor.mjs"),
    workerPath: path.join(browseDirectory, "searchQuery.mjs"),
    databaseUrl: env.DATABASE_URL.startsWith("file:")
      ? `file:${path.resolve(env.DATABASE_URL.slice(5))}`
      : env.DATABASE_URL,
  });
  const hollow = {
    ...baseHollow,
    tagging: {
      normalizer: NodeTagNormalizer,
      read: new NodeTagRead(searchExecution),
    },
    browsing: {
      projection: new IsolatedNoteProjection(
        path.join(browseDirectory, "noteProjection.mjs"),
      ),
      execution: searchExecution,
    },
    invitationDelivery: {
      protector: await NodeTokenProtector.load(
        process.env.HOLLOW_INVITATION_KEY_FILE,
      ),
      mailer: new LocalInvitationMailer(
        process.env.HOLLOW_MAIL_MODE === "local"
          ? path.resolve(process.env.HOLLOW_MAILBOX_DIR ?? "data/mailbox")
          : undefined,
      ),
      wake: () => {
        invitationRunner?.wake();
        importRelay.kick();
      },
    },
    purging: { wake: () => purgeRunner?.wake() },
    inlineMedia: new IsolatedInlineMediaProcessor(),
    workspaceIcon: {
      processor: new IsolatedWorkspaceIconProcessor(),
      wake: () => iconRunner?.wake(),
    },
    referencing: {
      processor: new NodeReferenceProcessor(),
      fetcher: new NodeSafeReferenceFetcher(),
      wake: () => {
        referenceRunner?.wake();
        importRelay.kick();
      },
    },
    importing: {
      storage: new CoordinatedObjectStorage(
        path.resolve(process.env.HOLLOW_STORAGE_DIR ?? "data/originals"),
        baseHollow.unitOfWorkProvider,
        baseHollow.clock,
      ),
      extractor: new IsolatedDocumentExtractor(),
      mediaValidator: new IsolatedMediaValidator(),
      detectFormat,
      wake: () => {
        importRunner?.wake();
        importRelay.kick();
      },
    },
  };
  await hollow.importing.storage.recoverOwners();
  importRunner = createImportRunner(hollow);
  referenceRunner = createReferenceRunner(hollow);
  purgeRunner = createPurgeRunner(hollow);
  invitationRunner = createInvitationRunner(hollow);
  iconRunner = createWorkspaceIconRunner(hollow);
  const browseRunner = createBrowseBackfillRunner(hollow);

  const workerContainer = createNodeWorkerContainer(db);

  const runner = createNodeWorkerRunner({
    container: workerContainer,
    logger,
    manageSignals: false,
    // Replace with the application's domain-event subscriber.
    consumerHandler: async () => {
      importRunner?.wake();
      referenceRunner?.wake();
      purgeRunner?.wake();
      invitationRunner?.wake();
    },
    cleanup: async () => {
      client.close();
    },
  });
  runner.start();
  importRelay = runner.relayTrigger;

  const config = readNodeRequestServerConfig(env, {
    db,
    relayTrigger: runner.relayTrigger,
  });

  // `@tanstack/react-start/server-entry` only resolves once the framework
  // bundle is ready; defer the import to the first request.
  const entryPromise = import("@tanstack/react-start/server-entry").then(
    (m) => m.default,
  );

  const fetch = async (request: Request): Promise<Response> => {
    const guarded = await guardResourceRequest(
      request,
      import.meta.env.PROD
        ? path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            "../client",
          )
        : undefined,
    );
    if (guarded) return guarded;
    const media = await mediaHttp(request, hollow);
    if (media) return media;
    const icon = await workspaceIconHttp(request, hollow);
    if (icon) return icon;
    const imported = await importHttp(request, hollow);
    if (imported) return imported;
    if (import.meta.env.PROD) {
      const asset = await serveStaticAsset(
        request,
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client"),
      );
      if (asset) return asset;
    }
    const container = { ...createNodeRequestContainer(config), hollow };
    const entry = await entryPromise;
    return storage.run(container, async () => entry.fetch(request));
  };

  const port = Number.parseInt(env.PORT ?? "3000", 10);
  const hostname = env.HOSTNAME ?? "0.0.0.0";

  let shuttingDown: Promise<void> | null = null;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown !== null) return shuttingDown;
    shuttingDown = (async () => {
      await searchExecution.stop();
      await browseRunner.stop();
      try {
        await importRunner?.stop();
        await referenceRunner?.stop();
        await purgeRunner?.stop();
        await invitationRunner?.stop();
        await iconRunner?.stop();
        await runner.stop();
      } catch (cause) {
        logger.error("[server.node] worker runner stop threw", { cause });
      }
    })();
    return shuttingDown;
  };

  return { fetch, port, hostname, shutdown };
}

const defaultExport = {
  async fetch(request: Request): Promise<Response> {
    const booted = await getOrStartBoot();
    return booted.fetch(request);
  },
};

// Boot lazily so importing this module for type resolution (e.g. inside
// the vite plugin's server-entry probe) does not trigger DB I/O.
let bootPromise: Promise<NodeServerBoot> | null = null;
function getOrStartBoot(): Promise<NodeServerBoot> {
  if (bootPromise === null) {
    bootPromise = boot();
    const onSignal = (signal: NodeJS.Signals) => {
      ConsoleLogger.info(`[server.node] received ${signal}, shutting down`);
      void bootPromise?.then((b) => b.shutdown());
    };
    process.once("SIGTERM", () => onSignal("SIGTERM"));
    process.once("SIGINT", () => onSignal("SIGINT"));
  }
  return bootPromise;
}

export default defaultExport;
