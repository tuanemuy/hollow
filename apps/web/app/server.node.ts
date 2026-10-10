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
import { readNodeGoogleAuthentication } from "@repo/core/adapters/node/auth/config";
import { acquireCredentialRuntime } from "@repo/core/adapters/node/auth/credentialRuntimeOwnership";
import { createAuthenticationRunner } from "@repo/core/adapters/node/auth/runner";
import { createBatchRunner } from "@repo/core/adapters/node/batchRunner";
import { createBrowseBackfillRunner } from "@repo/core/adapters/node/browse/backfillRunner";
import { IsolatedNoteProjection } from "@repo/core/adapters/node/browse/isolatedProjection";
import { NodeSearchExecution } from "@repo/core/adapters/node/browse/searchExecution";
import {
  assertTagNormalizerUnicodeVersion,
  NodeTagNormalizer,
} from "@repo/core/adapters/node/browse/tagNormalizer";
import { NodeTagRead } from "@repo/core/adapters/node/browse/tagRead";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { createNodeDrive } from "@repo/core/adapters/node/drive/factory";
import { IsolatedExportDocumentWriter } from "@repo/core/adapters/node/exportDocument/writer";
import { NodeExportLifetime } from "@repo/core/adapters/node/exportLifetime";
import { createExportRunner } from "@repo/core/adapters/node/exportRunner";
import { FileExportSourceReader } from "@repo/core/adapters/node/exportSourceReader";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { createImportRunner } from "@repo/core/adapters/node/importRunner";
import { IsolatedInlineMediaProcessor } from "@repo/core/adapters/node/inlineMediaProcessor";
import { LocalInvitationMailer } from "@repo/core/adapters/node/invitationMailer";
import { createInvitationRunner } from "@repo/core/adapters/node/invitationRunner";
import {
  createNodeLlm,
  type NodeLlmOptions,
} from "@repo/core/adapters/node/llm/config";
import { createLlmRunner } from "@repo/core/adapters/node/llm/runner";
import { LocalMailbox } from "@repo/core/adapters/node/localMailbox";
import { loadNodeSmtpConfig } from "@repo/core/adapters/node/mail/config";
import { NodeSmtpInvitationMailer } from "@repo/core/adapters/node/mail/smtpInvitationMailer";
import { NodeSmtpMailer } from "@repo/core/adapters/node/mail/smtpMailer";
import { readNodeOpenRouter } from "@repo/core/adapters/node/openrouter/config";
import { createOpenRouterRunner } from "@repo/core/adapters/node/openrouter/runner";
import { NodePdfAnonymousTicketSigner } from "@repo/core/adapters/node/pdf/anonymousTicketSigner";
import { prepareNodePdf } from "@repo/core/adapters/node/pdf/config";
import { IsolatedPdfDocumentWriter } from "@repo/core/adapters/node/pdf/documentWriter";
import { NodePdfExecution } from "@repo/core/adapters/node/pdf/execution";
import { createPdfRunner } from "@repo/core/adapters/node/pdf/runner";
import { FilePdfSourceReader } from "@repo/core/adapters/node/pdf/source";
import { NodePdfTransfers } from "@repo/core/adapters/node/pdf/transfers";
import { FilePdfWorkspace } from "@repo/core/adapters/node/pdf/workspace";
import { NodePublicDiscoveryExecution } from "@repo/core/adapters/node/publication/execution";
import { createPurgeRunner } from "@repo/core/adapters/node/purgeRunner";
import { NodeReferenceProcessor } from "@repo/core/adapters/node/reference/referenceProcessor";
import { NodeSafeReferenceFetcher } from "@repo/core/adapters/node/reference/safeFetcher";
import { createReferenceRunner } from "@repo/core/adapters/node/referenceRunner";
import {
  createNodeMachine,
  createNodeRegeneration,
} from "@repo/core/adapters/node/regeneration/config";
import { createMachineRunner } from "@repo/core/adapters/node/regeneration/runner";
import { NodeSharePasswordWork } from "@repo/core/adapters/node/sharePasswordWork";
import { createSharePruner } from "@repo/core/adapters/node/sharePruner";
import { NodeShareTokenProtector } from "@repo/core/adapters/node/shareSecrets";
import { NodeTokenProtector } from "@repo/core/adapters/node/tokenProtector";
import { IsolatedWorkspaceIconProcessor } from "@repo/core/adapters/node/workspaceIconProcessor";
import { createWorkspaceIconRunner } from "@repo/core/adapters/node/workspaceIconRunner";
import {
  assertZipBootConfiguration,
  assertZipPdfBootConfiguration,
  readNodeZipConfiguration,
} from "@repo/core/adapters/node/zip/config";
import { NodeZipDiskAdmission } from "@repo/core/adapters/node/zip/disk";
import { IsolatedZipDocumentWriter } from "@repo/core/adapters/node/zip/documentWriter";
import {
  NodeZipExecution,
  NodeZipTransfers,
} from "@repo/core/adapters/node/zip/lifetimes";
import { NodeZipNames } from "@repo/core/adapters/node/zip/names";
import { createZipRunner } from "@repo/core/adapters/node/zip/runner";
import { NodeZipSourceReader } from "@repo/core/adapters/node/zip/sources";
import { NodeZipWriter } from "@repo/core/adapters/node/zip/writer";
import type { GoogleAuthentication } from "@repo/core/application/account/ports";
import { installContainerStore } from "@repo/core/application/di/containerStore";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  createNodeRequestContainer,
  createNodeWorkerContainer,
  readNodeRequestServerConfig,
  readNodeServerEnv,
} from "@repo/core/application/di/serverNode";
import type { RequestContainer } from "@repo/core/application/di/types";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { sweepExports } from "@repo/core/application/export/usecases";
import type { OpenRouterServices } from "@repo/core/application/integration/openRouter/ports";
import type { LlmServices } from "@repo/core/application/llm/services";
import { recoverLlm } from "@repo/core/application/llm/worker";
import { sweepPdf } from "@repo/core/application/pdf/worker";
import type { InvitationMailer } from "@repo/core/application/ports/invitationMailer";
import { ConsoleLogger } from "@repo/core/application/ports/logger";
import type { Mailer } from "@repo/core/application/ports/mailer";
import type { SafeReferenceFetcher } from "@repo/core/application/ports/referenceProcessor";
import {
  NoopRelayTrigger,
  type RelayTrigger,
} from "@repo/core/application/ports/relayTrigger";
import { recoverMachine } from "@repo/core/application/regeneration/worker";
import { DEFAULT_DOCUMENT_CSS } from "@repo/core/lib/defaultDocumentStyle";
import { anonymousPdfHttp } from "@/presentation/anonymousPdfHttp.node";
import {
  authenticationHttp,
  fenceAuthenticationRequest,
} from "@/presentation/authenticationHttp.node";
import { exportHttp } from "@/presentation/exportHttp.node";
import { importHttp } from "@/presentation/importHttp.node";
import { mediaHttp } from "@/presentation/mediaHttp.node";
import { openRouterHttp } from "@/presentation/openRouterHttp.node";
import { pdfHttp } from "@/presentation/pdfHttp.node";
import { profileIconHttp } from "@/presentation/profileIconHttp.node";
import { publicationHttp } from "@/presentation/publicationHttp.node";
import { publicDiscoveryHttp } from "@/presentation/publicDiscoveryHttp.node";
import { guardResourceRequest } from "@/presentation/resourceRequestGuard.node";
import { sharingHttp } from "@/presentation/sharingHttp.node";
import { serveStaticAsset } from "@/presentation/staticAssets.node";
import { workspaceIconHttp } from "@/presentation/workspaceIconHttp.node";
import { zipHttp } from "@/presentation/zipHttp.node";
import { createNodeWorkerRunner } from "@/worker/node/runner";
import { createDriveRuntime, type DriveRuntime } from "./driveRuntime.node";
import {
  createDriveDocumentContext,
  driveDocumentResponse,
} from "./presentation/driveDocument.node";

export { NodeDriveBackupSource } from "@repo/core/adapters/node/drive/backupSource";
export { createNodeLlm } from "@repo/core/adapters/node/llm/config";

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
  quiesce: () => Promise<void>;
  shutdown: () => Promise<void>;
}>;

export type NodeServerDependencies = Readonly<{
  referenceFetcher?: SafeReferenceFetcher;
  driveFactory?: typeof createNodeDrive;
  mailer?: Mailer;
  invitationMailer?: InvitationMailer;
  authenticationFactory?: (
    base: HollowContainer,
  ) => Promise<GoogleAuthentication | undefined>;
  openRouterFactory?: (
    base: HollowContainer,
  ) => Promise<OpenRouterServices | undefined>;
  llmFactory?: (
    base: HollowContainer,
    options: NodeLlmOptions,
  ) => Promise<LlmServices>;
}>;

export async function boot(
  dependencies: NodeServerDependencies = {},
): Promise<NodeServerBoot> {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
  const env = readNodeServerEnv();
  const logger = ConsoleLogger;
  const storageDirectory = path.resolve(
    process.env.HOLLOW_STORAGE_DIR ?? "data/originals",
  );
  const pdfDirectory = path.resolve("dist/server/pdf");
  const pdfConfiguration = await prepareNodePdf(
    storageDirectory,
    process.env.HOLLOW_PDF_CONFIG,
    pdfDirectory,
  );

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
  const smtpConfig =
    process.env.HOLLOW_MAIL_MODE === "smtp" &&
    (!dependencies.mailer || !dependencies.invitationMailer)
      ? await loadNodeSmtpConfig(process.env.HOLLOW_SMTP_CONFIG ?? "")
      : undefined;
  const smtpMailer =
    !dependencies.mailer && smtpConfig
      ? new NodeSmtpMailer(smtpConfig)
      : undefined;
  const smtpInvitationMailer =
    !dependencies.invitationMailer && smtpConfig
      ? new NodeSmtpInvitationMailer(smtpConfig)
      : undefined;
  const mailer: Mailer =
    dependencies.mailer ??
    smtpMailer ??
    (process.env.HOLLOW_MAIL_MODE === "local"
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
        });
  let importRunner: ReturnType<typeof createImportRunner> | undefined;
  let referenceRunner: ReturnType<typeof createReferenceRunner> | undefined;
  let purgeRunner: ReturnType<typeof createPurgeRunner> | undefined;
  let invitationRunner: ReturnType<typeof createInvitationRunner> | undefined;
  let iconRunner: ReturnType<typeof createWorkspaceIconRunner> | undefined;
  let batchRunner: ReturnType<typeof createBatchRunner> | undefined;
  let exportRunner: ReturnType<typeof createExportRunner> | undefined;
  let pdfRunner: ReturnType<typeof createPdfRunner> | undefined;
  let zipRunner: ReturnType<typeof createZipRunner> | undefined;
  let machineRunner: ReturnType<typeof createMachineRunner> | undefined;
  let llmRunner: ReturnType<typeof createLlmRunner> | undefined;
  const exportDiskBytes = Number(
    process.env.HOLLOW_EXPORT_DISK_BYTES ?? 2 * 1024 * 1024 * 1024,
  );
  if (!Number.isSafeInteger(exportDiskBytes) || exportDiskBytes < 1)
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "書き出し一時領域の設定値が不正です。",
    );
  let importRelay: RelayTrigger = NoopRelayTrigger;
  const baseHollow = createHollowContainer(db, env.APP_URL, mailer);
  const canonicalCredentialDatabasePath =
    (process.env.HOLLOW_GOOGLE_CONFIG ||
      process.env.HOLLOW_OPENROUTER_CONFIG) &&
    env.DATABASE_URL.startsWith("file:")
      ? await fs.promises.realpath(path.resolve(env.DATABASE_URL.slice(5)))
      : null;
  const googleAuthentication = dependencies.authenticationFactory
    ? await dependencies.authenticationFactory(baseHollow)
    : await readNodeGoogleAuthentication(
        process.env.HOLLOW_GOOGLE_CONFIG,
        env.APP_URL,
        baseHollow,
        canonicalCredentialDatabasePath
          ? () =>
              acquireCredentialRuntime(
                path.join(
                  path.dirname(canonicalCredentialDatabasePath),
                  ".credential-runtime",
                  "google",
                ),
                canonicalCredentialDatabasePath,
                "google",
                db,
                baseHollow.unitOfWorkProvider,
              )
          : null,
      );
  const zipConfiguration = await readNodeZipConfiguration(
    process.env.HOLLOW_ZIP_CONFIG,
    exportDiskBytes + (pdfConfiguration?.capacity.diskBytes ?? 4 * 1024 ** 3),
  );
  const objectStorage = new CoordinatedObjectStorage(
    storageDirectory,
    baseHollow.unitOfWorkProvider,
    baseHollow.clock,
  );
  const regeneration = await createNodeRegeneration(baseHollow, {
    storage: objectStorage,
    directory: storageDirectory,
    workerPath: path.resolve("dist/server/llm/sourceWorker.mjs"),
    documentWorkerPath: path.resolve("dist/server/llm/documentWorker.mjs"),
    imageChildPath: path.resolve("dist/server/llm/imageChild.mjs"),
    pdfPagesChildPath: path.resolve("dist/server/llm/pdfPagesChild.mjs"),
  });
  const machine = createNodeMachine(regeneration, () => machineRunner?.wake());
  let driveRuntime: DriveRuntime | undefined;
  const driveConfigFile = process.env.HOLLOW_DRIVE_CONFIG_FILE;
  const canonicalDatabasePath =
    (driveConfigFile !== undefined || dependencies.driveFactory) &&
    env.DATABASE_URL.startsWith("file:")
      ? await fs.promises.realpath(path.resolve(env.DATABASE_URL.slice(5)))
      : null;
  const nodeDrive = await (dependencies.driveFactory ?? createNodeDrive)(
    baseHollow,
    {
      ...(driveConfigFile !== undefined ? { configFile: driveConfigFile } : {}),
      appUrl: env.APP_URL,
      canonicalDatabasePath,
      storage: objectStorage,
      runtimeDirectory: canonicalDatabasePath
        ? path.join(path.dirname(canonicalDatabasePath), ".drive-runtime")
        : null,
      wake: () => driveRuntime?.wake(),
    },
  );
  const productionOpenRouter = dependencies.openRouterFactory
    ? undefined
    : await readNodeOpenRouter(
        process.env.HOLLOW_OPENROUTER_CONFIG,
        env.APP_URL,
        baseHollow.clock,
        canonicalCredentialDatabasePath
          ? () =>
              acquireCredentialRuntime(
                path.join(
                  path.dirname(canonicalCredentialDatabasePath),
                  ".credential-runtime",
                  "openrouter",
                ),
                canonicalCredentialDatabasePath,
                "openrouter",
                db,
                baseHollow.unitOfWorkProvider,
              )
          : null,
      );
  const openRouter = dependencies.openRouterFactory
    ? await dependencies.openRouterFactory(baseHollow)
    : productionOpenRouter;
  await assertZipBootConfiguration(db, zipConfiguration !== null);
  await assertZipPdfBootConfiguration(db, pdfConfiguration !== null);
  const llm = await (dependencies.llmFactory ?? createNodeLlm)(baseHollow, {
    shared: regeneration,
    ...(nodeDrive?.source
      ? { source: { provider: nodeDrive.source, drive: nodeDrive.services } }
      : {}),
    storage: objectStorage,
    directory: storageDirectory,
    workerPath: path.resolve("dist/server/llm/sourceWorker.mjs"),
    documentWorkerPath: path.resolve("dist/server/llm/documentWorker.mjs"),
    imageChildPath: path.resolve("dist/server/llm/imageChild.mjs"),
    pdfPagesChildPath: path.resolve("dist/server/llm/pdfPagesChild.mjs"),
    profiles: productionOpenRouter?.profiles,
    monthlyLimit: process.env.HOLLOW_LLM_MONTHLY_LIMIT,
    wake: () => llmRunner?.wake(),
  });
  assertTagNormalizerUnicodeVersion(process.versions.unicode);
  const browseDirectory = path.resolve("dist/server/browse");
  const searchExecution = new NodeSearchExecution({
    childPath: path.join(browseDirectory, "searchSupervisor.mjs"),
    workerPath: path.join(browseDirectory, "searchQuery.mjs"),
    databaseUrl: env.DATABASE_URL.startsWith("file:")
      ? `file:${path.resolve(env.DATABASE_URL.slice(5))}`
      : env.DATABASE_URL,
  });
  const publicDiscovery = new NodePublicDiscoveryExecution({
    childPath: path.join(browseDirectory, "searchSupervisor.mjs"),
    workerPath: path.join(browseDirectory, "publicQuery.mjs"),
    databaseUrl: env.DATABASE_URL.startsWith("file:")
      ? `file:${path.resolve(env.DATABASE_URL.slice(5))}`
      : env.DATABASE_URL,
  });
  const beforeDrive = {
    ...baseHollow,
    llm,
    machine,
    ...(googleAuthentication ? { googleAuthentication } : {}),
    ...(openRouter ? { openRouter } : {}),
    ...(zipConfiguration
      ? {
          zip: {
            writer: NodeZipWriter,
            names: NodeZipNames,
            documentWriter: new IsolatedZipDocumentWriter(
              path.resolve("dist/server/export/document.mjs"),
            ),
            sources: new NodeZipSourceReader(
              objectStorage,
              new FileExportSourceReader(storageDirectory),
            ),
            execution: new NodeZipExecution(baseHollow.clock),
            transfers: new NodeZipTransfers(baseHollow.clock),
            disk: new NodeZipDiskAdmission(
              storageDirectory,
              zipConfiguration.protectedDiskBytes,
            ),
            capacity: zipConfiguration,
            defaultCss: DEFAULT_DOCUMENT_CSS,
            wake: () => zipRunner?.wake(),
          },
        }
      : {}),
    ...(pdfConfiguration
      ? {
          pdf: {
            writer: new IsolatedPdfDocumentWriter(
              path.join(pdfDirectory, "documentWorker.mjs"),
            ),
            sources: new FilePdfSourceReader(storageDirectory),
            workspace: new FilePdfWorkspace(
              pdfConfiguration.root,
              pdfConfiguration.fonts,
            ),
            supervisor: pdfConfiguration.supervisor,
            execution: new NodePdfExecution(),
            transfers: new NodePdfTransfers(),
            capacity: pdfConfiguration.capacity,
            defaultCss: DEFAULT_DOCUMENT_CSS,
            wake: () => pdfRunner?.wake(),
          },
        }
      : {}),
    publicDiscovery,
    pdfAnonymousTicketSigner: await NodePdfAnonymousTicketSigner.load(
      process.env.HOLLOW_PDF_TICKET_KEYRING,
    ),
    exporting: {
      writer: new IsolatedExportDocumentWriter(
        path.resolve("dist/server/export/document.mjs"),
      ),
      sources: new FileExportSourceReader(
        path.resolve(process.env.HOLLOW_STORAGE_DIR ?? "data/originals"),
      ),
      lifetime: new NodeExportLifetime(),
      diskLimit: exportDiskBytes,
      defaultCss: DEFAULT_DOCUMENT_CSS,
      wake: () => exportRunner?.wake(),
    },
    sharing: {
      protector: await NodeShareTokenProtector.load({
        directory: process.env.HOLLOW_SHARE_KEY_DIR ?? "",
        activeKeyId: process.env.HOLLOW_SHARE_ACTIVE_KEY_ID ?? "",
        keyIds: (process.env.HOLLOW_SHARE_KEY_IDS ?? "")
          .split(",")
          .filter(Boolean),
      }),
      passwordWork: new NodeSharePasswordWork(),
    },
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
      mailer:
        dependencies.invitationMailer ??
        smtpInvitationMailer ??
        new LocalInvitationMailer(
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
    batching: {
      wake: () => {
        batchRunner?.wake();
        importRelay.kick();
      },
    },
    inlineMedia: new IsolatedInlineMediaProcessor(),
    workspaceIcon: {
      processor: new IsolatedWorkspaceIconProcessor(),
      wake: () => iconRunner?.wake(),
    },
    referencing: {
      processor: new NodeReferenceProcessor(),
      fetcher: dependencies.referenceFetcher ?? new NodeSafeReferenceFetcher(),
      wake: () => {
        referenceRunner?.wake();
        importRelay.kick();
      },
    },
    importing: {
      storage: objectStorage,
      extractor: new IsolatedDocumentExtractor(),
      mediaValidator: new IsolatedMediaValidator(),
      detectFormat,
      wake: () => {
        importRunner?.wake();
        importRelay.kick();
      },
    },
  };
  await beforeDrive.importing.storage.recoverOwners();
  await recoverMachine(beforeDrive);
  await recoverLlm(beforeDrive);
  if (beforeDrive.pdf)
    await beforeDrive.unitOfWorkProvider.run(async (u) => {
      await u.pdfDeliveries.recover(beforeDrive.clock.now());
      await u.pdfAnonymousDeliveries.recover(beforeDrive.clock.now());
      await u.pdfComputations.recover(beforeDrive.clock.now());
    });
  if (beforeDrive.zip)
    await beforeDrive.unitOfWorkProvider.run(async (u) => {
      await u.zipPdf.recover(beforeDrive.clock.now());
      await u.zipDeliveries.recover(beforeDrive.clock.now());
      await u.zipWork.recover(beforeDrive.clock.now());
    });
  await beforeDrive.unitOfWorkProvider.run((u) =>
    u.exports.recover(beforeDrive.clock.now()),
  );
  const hollow = {
    ...beforeDrive,
    ...(nodeDrive ? { drive: nodeDrive.services } : {}),
    ...(nodeDrive?.source
      ? {
          machine: createNodeMachine(
            regeneration,
            () => machineRunner?.wake(),
            { provider: nodeDrive.source, drive: nodeDrive.services },
          ),
        }
      : {}),
  };
  driveRuntime = await createDriveRuntime(
    hollow,
    nodeDrive?.callbackUrl ?? new URL("/auth/drive/callback", env.APP_URL).href,
  );
  exportRunner = createExportRunner(hollow);
  if (hollow.pdf) pdfRunner = createPdfRunner(hollow);
  if (hollow.zip) zipRunner = createZipRunner(hollow);
  machineRunner = createMachineRunner(hollow);
  llmRunner = createLlmRunner(hollow);
  importRunner = createImportRunner(hollow);
  referenceRunner = createReferenceRunner(hollow);
  purgeRunner = createPurgeRunner(hollow);
  invitationRunner = createInvitationRunner(hollow);
  iconRunner = createWorkspaceIconRunner(hollow);
  batchRunner = createBatchRunner(hollow);
  const browseRunner = createBrowseBackfillRunner(hollow);
  const sharePruner = createSharePruner(hollow);

  const workerContainer = createNodeWorkerContainer(db);

  const runner = createNodeWorkerRunner({
    container: workerContainer,
    logger,
    manageSignals: false,
    // Replace with the application's domain-event subscriber.
    consumerHandler: async () => {
      machineRunner?.wake();
      llmRunner?.wake();
      importRunner?.wake();
      referenceRunner?.wake();
      purgeRunner?.wake();
      invitationRunner?.wake();
      batchRunner?.wake();
    },
    cleanup: async () => {
      client.close();
    },
  });
  runner.start();
  const authenticationRunner = createAuthenticationRunner(hollow);
  const openRouterRunner = createOpenRouterRunner(hollow);
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

  let accepting = true;
  const fetch = async (incoming: Request): Promise<Response> => {
    if (!accepting)
      return new Response(null, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    return driveRuntime.handle(incoming, async (incoming) => {
      const guarded = await guardResourceRequest(
        incoming,
        import.meta.env.PROD
          ? path.resolve(
              path.dirname(fileURLToPath(import.meta.url)),
              "../client",
            )
          : undefined,
      );
      if (guarded) return guarded;
      const request = await fenceAuthenticationRequest(incoming, hollow);
      const authentication = await authenticationHttp(request, hollow);
      if (authentication) return authentication;
      const openRouterResponse = await openRouterHttp(request, hollow);
      if (openRouterResponse) return openRouterResponse;
      const driveResponse = await driveRuntime.dispatch(request);
      if (driveResponse) return driveResponse;
      const pdfResponse = await pdfHttp(request, hollow);
      if (pdfResponse) return pdfResponse;
      const zipResponse = await zipHttp(request, hollow);
      if (zipResponse) return zipResponse;
      const anonymousPdfResponse = await anonymousPdfHttp(request, hollow);
      if (anonymousPdfResponse) return anonymousPdfResponse;
      const exported = await exportHttp(request, hollow);
      if (exported) return exported;
      const shared = await sharingHttp(request, hollow);
      if (shared) return shared;
      const published = await publicationHttp(request, hollow);
      if (published) return published;
      const profileIcon = await profileIconHttp(request, hollow);
      if (profileIcon) return profileIcon;
      const discovery = await publicDiscoveryHttp(request, hollow);
      if (discovery) return discovery;
      const media = await mediaHttp(request, hollow);
      if (media) return media;
      const icon = await workspaceIconHttp(request, hollow);
      if (icon) return icon;
      const imported = await importHttp(request, hollow);
      if (imported) return imported;
      if (import.meta.env.PROD) {
        const asset = await serveStaticAsset(
          request,
          path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            "../client",
          ),
        );
        if (asset) return asset;
      }
      const container = { ...createNodeRequestContainer(config), hollow };
      const entry = await entryPromise;
      const documentContext = createDriveDocumentContext(request);
      return storage.run(container, async () =>
        driveDocumentResponse(
          await entry.fetch(
            request,
            documentContext ? { context: documentContext } : undefined,
          ),
          documentContext,
        ),
      );
    });
  };

  const port = Number.parseInt(env.PORT ?? "3000", 10);
  const hostname = env.HOSTNAME ?? "0.0.0.0";

  let quiescing: Promise<void> | null = null;
  let shuttingDown: Promise<void> | null = null;
  const quiesce = (): Promise<void> => {
    accepting = false;
    quiescing ??= Promise.allSettled([
      machineRunner?.stop(),
      llmRunner?.stop(),
      driveRuntime.quiesce(),
    ]).then((results) => {
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
    });
    return quiescing;
  };
  const shutdown = (): Promise<void> => {
    if (shuttingDown !== null) return shuttingDown;
    accepting = false;
    shuttingDown = (async () => {
      await quiesce();
      await driveRuntime.stop();
      await authenticationRunner.stop();
      await openRouterRunner.stop();
      await Promise.all([
        googleAuthentication?.execution.stop(),
        openRouter?.execution.stop(),
        baseHollow.passwordHasher.stop(),
        smtpMailer?.stop(),
      ]);
      await zipRunner?.stop();
      await pdfRunner?.stop();
      await hollow.pdf?.transfers.stop();
      await hollow.pdf?.execution.stop();
      await hollow.pdf?.supervisor.stop();
      await sweepPdf(hollow);
      await hollow.exporting.lifetime.stop();
      await exportRunner?.stop();
      await hollow.unitOfWorkProvider.run((u) =>
        u.exports.recover(hollow.clock.now()),
      );
      await sweepExports(hollow);
      await hollow.sharing.passwordWork.stop();
      await sharePruner.stop();
      await searchExecution.stop();
      await publicDiscovery.stop();
      await browseRunner.stop();
      await batchRunner?.stop();
      try {
        await importRunner?.stop();
        await referenceRunner?.stop();
        await purgeRunner?.stop();
        await invitationRunner?.stop();
        await smtpInvitationMailer?.stop();
        await iconRunner?.stop();
        await runner.stop();
      } catch (cause) {
        logger.error("[server.node] worker runner stop threw", { cause });
      }
    })();
    return shuttingDown;
  };

  return { fetch, port, hostname, quiesce, shutdown };
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
