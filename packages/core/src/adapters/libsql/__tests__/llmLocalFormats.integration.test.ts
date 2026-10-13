import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  openSync,
  writeSync,
} from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { types } from "node:util";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { createNodeLlm } from "@repo/core/adapters/node/llm/config";
import { NodeRegenerationInput } from "@repo/core/adapters/node/regeneration/input";
import { NodeRegenerationMemory } from "@repo/core/adapters/node/regeneration/memory";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { llmAdmissionSource } from "@repo/core/application/llm/admissionSource";
import { cancelLlmRegeneration } from "@repo/core/application/llm/control";
import {
  beginPdfPreview,
  cancelPdfPreview,
  sweepPdfPreviews,
} from "@repo/core/application/llm/pdfPreview";
import {
  type LlmGenerator,
  LlmOperationError,
  type LlmSourcePreparer,
} from "@repo/core/application/llm/ports";
import {
  admitLlm,
  requestLlmRegeneration,
  retryLlmJob,
} from "@repo/core/application/llm/request";
import { sweepLlm } from "@repo/core/application/llm/worker";
import { canScope } from "@repo/core/application/workspace/access";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  LlmConversion,
  LlmSourceFormat,
} from "@repo/core/domain/llm/entity";
import {
  PDF_PAGE_POLICY,
  PDF_PAGE_RENDERER,
  pdfPageManifest,
} from "@repo/core/domain/llm/pdfPreview";
import { createNote } from "@repo/core/domain/note/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";

const MiB = 1024 * 1024;
export const s4Hash = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const fakePreparer: LlmSourcePreparer = {
  async prepare(input) {
    if (input.preparationVersion === 4)
      return {
        kind: "pdf-pages",
        preparationVersion: 4,
        manifest: input.manifest,
      };
    if (input.preparationVersion === 3)
      return {
        kind: "single-raster",
        preparationVersion: 3,
        identity: {
          kind: "prepared-image",
          preparationVersion: 3,
          sha256: s4Hash("image"),
        },
        inputIdentity: {
          kind: "prepared-raster",
          ordinal: 0,
          sha256: s4Hash("image"),
        },
        raster: {
          mimeType: "image/png",
          bytes: Uint8Array.of(1),
          width: 1,
          height: 1,
        },
        coverage: {
          kind: "single-frame",
          codec: "png",
          sourceWidth: 1,
          sourceHeight: 1,
          orientation: 1,
          frames: 1,
          fullPixels: true,
          resized: false,
          cropped: false,
        },
        normalization: "srgb-white-v1",
      };
    const html = "<p>prepared local input</p>";
    const segments = [
      {
        identity: {
          kind: "prepared-segment" as const,
          ordinal: 0,
          sha256: s4Hash(html),
        },
        html,
        firstBlock: 0,
        blockCount: 1,
      },
    ];
    if (input.preparationVersion === 1)
      return {
        kind: "text-blocks",
        preparationVersion: 1,
        blocks: 1,
        segments,
        notices: [],
        media: [],
      };
    return {
      kind: "text-blocks",
      preparationVersion: 2,
      blocks: 1,
      segments,
      notices: [],
      media: [],
      identity: {
        kind: "prepared-document",
        preparationVersion: 2,
        sha256: s4Hash("document"),
      },
      coverage:
        input.source.format === "pdf"
          ? {
              kind: "pdf-text",
              pages: [
                {
                  ordinal: 0,
                  class: "text-covered",
                  firstBlock: 0,
                  blockCount: 1,
                },
              ],
            }
          : {
              kind: "office-text",
              format: input.source.format,
              textComplete: true,
              uninterpretedMedia: 0,
              units: [
                { ordinal: 0, kind: "body", firstBlock: 0, blockCount: 1 },
              ],
            },
    };
  },
};
export type FormatSlot = Readonly<{
  name: string;
  format: LlmSourceFormat;
  bytes: Uint8Array;
  workspace?: boolean;
}>;
type PendingMarker =
  | "classify-begin"
  | "classify-resolve"
  | "classify-reject"
  | "redraw-begin"
  | "redraw-resolve"
  | "redraw-reject"
  | "finish-begin"
  | "finish-resolve"
  | "finish-reject"
  | "case-begin"
  | "case-ended";
function redrawError(error: unknown) {
  const unknown = { errorClass: "unknown", code: null, closed: null } as const;
  if (typeof error !== "object" || error === null || types.isProxy(error))
    return unknown;
  const prototype = Object.getPrototypeOf(error);
  const errorClass =
    prototype === LlmOperationError.prototype
      ? "LlmOperationError"
      : prototype === BusinessRuleError.prototype
        ? "BusinessRuleError"
        : prototype === SystemError.prototype
          ? "SystemError"
          : prototype === TypeError.prototype
            ? "TypeError"
            : prototype === RangeError.prototype
              ? "RangeError"
              : prototype === Error.prototype
                ? "Error"
                : "unknown";
  const data = (key: "code" | "closed"): unknown => {
    const descriptor = Object.getOwnPropertyDescriptor(error, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  };
  const value = data("code");
  const nativeCode = [
    "ENOENT",
    "EEXIST",
    "EACCES",
    "EPERM",
    "ERR_MODULE_NOT_FOUND",
    "SQLITE_ERROR",
    "SQLITE_BUSY",
    "SQLITE_LOCKED",
    "SQLITE_CONSTRAINT",
    "SQLITE_CONSTRAINT_FOREIGNKEY",
    "SQLITE_CANTOPEN",
  ].find((code) => code === value);
  const llmCode =
    errorClass === "LlmOperationError"
      ? [
          "LLM_SOURCE_CHANGED",
          "LLM_SOURCE_INVALID",
          "LLM_OWNERSHIP_UNKNOWN",
          "LLM_CREDENTIAL_INVALID",
          "LLM_TIMEOUT",
          "LLM_UNAVAILABLE",
        ].find((code) => code === value)
      : undefined;
  const businessCode =
    errorClass === "BusinessRuleError" &&
    value === "REGENERATION_SOURCE_INVALID"
      ? "REGENERATION_SOURCE_INVALID"
      : undefined;
  const closed =
    errorClass === "LlmOperationError" ? data("closed") : undefined;
  return {
    errorClass,
    code: llmCode ?? businessCode ?? nativeCode ?? null,
    closed: typeof closed === "boolean" ? closed : null,
  };
}
function pendingWitness(root: string) {
  const file = path.join(root, "records", "pending-case-witness.json");
  let identity: { ino: number; dev: number } | undefined;
  let previousGeneration: number | null = null;
  let previousState: string | null = null;
  let observerFailed = false;
  let stopped = false;
  const snapshot: {
    case: "pending-import";
    markers: PendingMarker[];
    stateChanges: number;
    lastRedrawError: ReturnType<typeof redrawError> | null;
    lastState: {
      phase: LlmConversion["phase"];
      outcome: LlmConversion["outcome"]["kind"];
      owner: LlmConversion["owner"]["state"];
      memory: "released" | "reserved";
      receipt: "absent" | "active" | "unknown" | "closed";
      sameGenerationAsPrevious: boolean | null;
      expectedFinalGeneration: boolean;
      selection: "pending" | "fixed-pages" | "other";
      executionActive: boolean;
    } | null;
  } = {
    case: "pending-import",
    markers: [],
    stateChanges: 0,
    lastState: null,
    lastRedrawError: null,
  };
  const write = (create = false) => {
    const data = Buffer.from(JSON.stringify(snapshot));
    if (data.length > 8192) throw Error("S4_WITNESS_CAP");
    const fd = openSync(
      file,
      constants.O_WRONLY |
        constants.O_NOFOLLOW |
        (create ? constants.O_CREAT | constants.O_EXCL : 0),
      0o600,
    );
    try {
      const info = fstatSync(fd);
      if (
        !info.isFile() ||
        info.nlink !== 1 ||
        (info.mode & 0o777) !== 0o600 ||
        info.uid !== process.getuid?.()
      )
        throw Error("S4_WITNESS_FILE");
      if (create) identity = { ino: info.ino, dev: info.dev };
      if (!identity || identity.ino !== info.ino || identity.dev !== info.dev)
        throw Error("S4_WITNESS_IDENTITY");
      let position = 0;
      while (position < data.length) {
        const count = writeSync(fd, data.subarray(position), position);
        if (count <= 0) throw Error("S4_WITNESS_WRITE");
        position += count;
      }
      ftruncateSync(fd, data.length);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  };
  write(true);
  const mark = (marker: PendingMarker) => {
    if (stopped) return;
    try {
      if (snapshot.markers.length >= 24) throw Error("S4_WITNESS_CAP");
      snapshot.markers.push(marker);
      write();
    } catch {
      observerFailed = true;
    }
  };
  const reject = (method: "classify" | "redraw" | "finish", error: unknown) => {
    if (stopped) return;
    if (method === "redraw") {
      try {
        snapshot.lastRedrawError = redrawError(error);
      } catch {
        observerFailed = true;
      }
    }
    mark(`${method}-reject`);
  };
  return {
    observe<T>(
      method: "classify" | "redraw" | "finish",
      work: () => Promise<T>,
    ): Promise<T> {
      mark(`${method}-begin`);
      let result: Promise<T>;
      try {
        result = work();
      } catch (error) {
        reject(method, error);
        throw error;
      }
      return result.then(
        (value) => {
          mark(`${method}-resolve`);
          return value;
        },
        (error: unknown) => {
          reject(method, error);
          throw error;
        },
      );
    },
    row(value: LlmConversion, executionActive: boolean) {
      if (stopped) return;
      const generation = value.inputReceipt?.generation ?? null;
      const state = {
        phase: value.phase,
        outcome: value.outcome.kind,
        owner: value.owner.state,
        memory:
          value.sourceMemoryBytes === 0
            ? ("released" as const)
            : ("reserved" as const),
        receipt: value.inputReceipt?.state ?? ("absent" as const),
        sameGenerationAsPrevious:
          previousGeneration === null || generation === null
            ? null
            : previousGeneration === generation,
        expectedFinalGeneration: generation === 3,
        selection:
          value.selection === "pdf-pending"
            ? ("pending" as const)
            : value.preparationVersion === 4
              ? ("fixed-pages" as const)
              : ("other" as const),
        executionActive,
      };
      const text = JSON.stringify(state);
      if (text === previousState) return;
      try {
        if (snapshot.stateChanges >= 24) throw Error("S4_WITNESS_CAP");
        snapshot.stateChanges += 1;
        snapshot.lastState = state;
        previousState = text;
        previousGeneration = generation;
        write();
      } catch {
        observerFailed = true;
      }
    },
    start() {
      mark("case-begin");
    },
    stop() {
      mark("case-ended");
      stopped = true;
      if (observerFailed) throw Error("S4_WITNESS_FAILURE");
    },
  };
}
export async function createFormatsFixture(
  label: "app" | "native",
  fixtures: readonly FormatSlot[],
  contractCases = false,
) {
  if (
    contractCases &&
    (label !== "app" || process.env["HOLLOW_S4_GROUP"] !== "app-c")
  )
    throw Error("S4_CONTRACT_SCOPE");
  const requested = process.env["HOLLOW_S4_ROOT"];
  if (
    !requested ||
    !path.isAbsolute(requested) ||
    path.normalize(requested) !== requested ||
    (await realpath(requested)) !== requested
  )
    throw Error("S4_NEW_ROOT");
  const root = requested;
  const objects = path.join(root, `objects-${label}`);
  const directory = await lstat(objects);
  if (
    !directory.isDirectory() ||
    directory.isSymbolicLink() ||
    (directory.mode & 0o777) !== 0o700
  )
    throw Error("S4_OBJECTS");
  const databaseFile = path.join(root, `${label}.db`);
  const empty = await open(databaseFile, "wx", 0o600);
  await empty.sync();
  await empty.close();
  const client = createLibsqlClient({ url: `file:${databaseFile}` });
  let current: HollowContainer;
  let failed = false;
  let closed = false;
  let pendingObservation:
    | { jobId: string; witness: ReturnType<typeof pendingWitness> }
    | undefined;
  const now = new Date("2026-10-06T00:00:00Z");
  let clockOffset = 0;
  const contractCodec = {
    prepareFailure: false,
    prepares: 0,
    redraws: 0,
  };
  const generated: Parameters<LlmGenerator["generate"]>[0][] = [];
  const generations: Array<{ consumer: string; generation: number }> = [];
  const slots = new Map<
    string,
    FormatSlot & { noteId: string; originalId: string }
  >();
  const rootGuard = async () => {
    let total = 0;
    let originalBytes = 0;
    const databaseBytes = new Map<string, number>();
    const visit = async (dir: string): Promise<void> => {
      const info = await lstat(dir);
      if (
        !info.isDirectory() ||
        info.isSymbolicLink() ||
        (info.mode & 0o777) !== 0o700
      )
        throw Error("S4_DIR_MODE");
      for (const name of await readdir(dir)) {
        const file = path.join(dir, name);
        const stat = await lstat(file);
        if (stat.isSymbolicLink()) throw Error("S4_SYMLINK");
        if (stat.isDirectory()) {
          await visit(file);
          continue;
        }
        if (!stat.isFile() || (stat.mode & 0o777) !== 0o600)
          throw Error("S4_FILE_MODE");
        total += stat.size;
        const relative = path.relative(root, file);
        const db =
          /^(app|native|opaque|audit)\.db(?:-(?:wal|shm|journal))?$/.exec(
            relative,
          );
        if (db?.[1])
          databaseBytes.set(db[1], (databaseBytes.get(db[1]) ?? 0) + stat.size);
        if (
          relative.startsWith("objects-") &&
          !relative.includes("/.llm-runtime/")
        )
          originalBytes += stat.size;
      }
    };
    await visit(root);
    if (
      total > 192 * MiB ||
      originalBytes > 8 * MiB ||
      [...databaseBytes].some(
        ([key, n]) => n > (key === "app" || key === "native" ? 32 : 8) * MiB,
      )
    )
      throw Error("S4_CAPACITY");
  };
  try {
    await applyPragmas(client);
    const db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: fileURLToPath(
        new URL("../migrations", import.meta.url),
      ),
    });
    const page = await client.execute("PRAGMA page_size");
    const size = Number(page.rows[0]?.["page_size"]);
    if (!Number.isSafeInteger(size) || size < 1) throw Error("S4_PAGE_SIZE");
    await client.execute(
      `PRAGMA max_page_count = ${Math.floor((32 * MiB) / size)}`,
    );
    await client.execute("PRAGMA journal_size_limit = 8388608");
    const base = {
      ...createHollowContainer(db, "http://fixture.invalid", {
        send: async () => {},
      }),
      clock: { now: () => new Date(now.getTime() + clockOffset) },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    };
    current = base;
    const live = new Proxy(base, {
      get: (_target, key) => Reflect.get(current, key),
    });
    const storage = new CoordinatedObjectStorage(
      objects,
      { run: (work) => live.unitOfWorkProvider.run(work) },
      base.clock,
    );
    await storage.recoverOwners();
    const worker = (name: string) =>
      fileURLToPath(new URL(`../../node/llm/${name}`, import.meta.url));
    const normal = await createNodeLlm(live, {
      storage,
      directory: objects,
      workerPath: worker("sourceWorker.mjs"),
      documentWorkerPath: worker("documentWorker.mjs"),
      imageChildPath: worker("imageChild.mjs"),
      pdfPagesChildPath: worker("pdfPagesChild.mjs"),
      profiles: {
        inspect: async ({ modelId, kind }) =>
          kind === "chat-text"
            ? {
                modelId,
                kind,
                contextTokens: 100_000,
                outputTokens: 8192,
                supportsMaxTokens: true,
                source: "adopted-default",
                checkedAt: now,
              }
            : {
                modelId,
                kind,
                contextTokens: 100_000,
                outputTokens: 8192,
                supportsMaxTokens: true,
                source: "adopted-default",
                checkedAt: now,
                budget: {
                  kind: "resource-only",
                  imageTokens: null,
                  contextGuaranteed: false,
                },
              },
      },
      monthlyLimit: undefined,
      wake: () => {},
    });
    if (
      normal.inputMode !== "leased-local-v2" ||
      !(normal.inputStage instanceof NodeRegenerationInput)
    )
      throw Error("S4_FACTORY");
    const memory =
      label === "app"
        ? new NodeRegenerationMemory(
            contractCases
              ? {
                  prepare: async (input, signal) => {
                    contractCodec.prepares += 1;
                    if (contractCodec.prepareFailure)
                      throw new LlmOperationError(
                        "LLM_SOURCE_INVALID",
                        "not-sent",
                        true,
                      );
                    return fakePreparer.prepare(input, signal);
                  },
                }
              : fakePreparer,
            {
              classify: async ({ source }) =>
                [...slots.entries()].some(
                  ([name, slot]) =>
                    name === "retry-strict" &&
                    slot.originalId === source.originalId,
                )
                  ? {
                      kind: "strict-text",
                      preparationVersion: 2,
                      promptVersion: 1,
                      modelKind: "chat-text",
                      preparedDocumentHash: s4Hash("document"),
                      pages: 1,
                      policy: "strict-text-v1",
                    }
                  : {
                      kind: "pages",
                      preparationVersion: 4,
                      promptVersion: 3,
                      modelKind: "chat-image",
                      reason: "VISUAL_CONTENT",
                      manifest: pdfPageManifest({
                        kind: "pdf-pages",
                        preparationVersion: 4,
                        source,
                        policy: PDF_PAGE_POLICY,
                        renderer: PDF_PAGE_RENDERER,
                        total: 2,
                        pages: [0, 1].map((ordinal) => ({
                          ordinal,
                          width: 1,
                          height: 1,
                          bytes: 1,
                          sha256: s4Hash(`page${ordinal}`),
                        })),
                        sha256: s4Hash("manifest"),
                      }),
                    },
            },
            {
              prepare: async () => {
                throw Error("S4_UNUSED_PREPARE");
              },
              redraw: async () => {
                if (contractCases) contractCodec.redraws += 1;
                return {
                  mimeType: "image/png",
                  width: 1,
                  height: 1,
                  bytes: Uint8Array.of(1),
                };
              },
            },
          )
        : process.env["HOLLOW_S4_GROUP"] === "native-e"
          ? new NodeRegenerationMemory(
              normal.preparer,
              normal.pdfClassifier,
              normal.pdfPages,
            )
          : null;
    const stage = memory
      ? new NodeRegenerationInput(live, { input: memory, local: normal.source })
      : normal.inputStage;
    if (memory)
      stage.configureRuntime(normal.ownership.runtimeId, normal.ownership);
    const generate: LlmGenerator = {
      async generate(input) {
        let matched = false;
        await live.unitOfWorkProvider.run(async (u) => {
          for (const slot of slots.values()) {
            const original = await u.imports.findOriginal(slot.originalId);
            if (!original?.activeJobId) continue;
            const dispatch = (
              await u.llmDispatches.list(original.activeJobId)
            ).find((row) => row.id === input.dispatchId);
            if (!dispatch) continue;
            const row = await u.llmConversions.find(original.activeJobId);
            if (
              !row ||
              row.sourceMemoryBytes !== 0 ||
              row.inputReceipt?.state !== "closed" ||
              dispatch.state !== "intent"
            )
              throw Error("S4_DISPATCH_BEFORE_CLOSED0");
            generations.push({
              consumer: row.jobId,
              generation: row.inputReceipt.generation,
            });
            matched = true;
          }
        });
        if (!matched) throw Error("S4_DISPATCH_MISSING");
        generated.push(input);
        return {
          content: "<p>generated</p>",
          finish: "stop",
          inputTokens: 1,
          outputTokens: 1,
        };
      },
    };
    current = {
      ...base,
      openRouter: {
        authorization: {
          authorization: async () => "synthetic",
          exchange: async () => "synthetic",
          inspectCredential: async () => ({
            expiresAt: null,
            providerUserId: null,
          }),
        },
        catalog: { list: async () => [], fallback: () => [] },
        protector: {
          available: () => true,
          protect: (value) => value,
          reveal: (value) => value,
        },
        execution: {
          run: (work) => work(new AbortController().signal),
          stop: async () => {},
        },
      },
      llm: { ...normal, inputStage: stage, generator: generate },
    };
    const accountId = base.idGenerator.next();
    const token = `synthetic-${label}`;
    const batchId = base.idGenerator.next();
    await live.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(
            accountId,
            `${label}@fixture.invalid`,
            "synthetic",
            now,
          ),
          now,
        ),
      );
      await u.accounts.saveSession({
        accountId,
        tokenHash: live.tokens.hash(token),
        expiresAt: new Date("2040-01-01T00:00:00Z"),
      });
      const connection = await u.openRouterConnections.ensure(accountId, now);
      if (
        !(await u.openRouterConnections.replace(
          {
            ...connection,
            state: "linked",
            credentialEnvelope: "synthetic",
            epoch: 1,
            version: connection.version + 1,
            linkedAt: now,
            everLinkedAt: now,
            keyExpiresAt: null,
            providerUserId: null,
            lastUsedAt: null,
          },
          connection.version,
        ))
      )
        throw Error("S4_CONNECTION_CAS");
      await u.imports.insertBatch({
        requestedVisibility: "private",
        id: batchId,
        accountId,
        createdAt: now,
        useAi: false,
        cancelledAt: null,
      });
    });
    let workspace: { id: string; ownerId: string; ownerToken: string } | null =
      null;
    if (contractCases) {
      const ownerId = base.idGenerator.next();
      const ownerToken = "synthetic-workspace-owner";
      await live.unitOfWorkProvider.run(async (u) => {
        await u.accounts.save(
          verifyAccount(
            createAccount(
              ownerId,
              "workspace-owner@fixture.invalid",
              "synthetic",
              now,
            ),
            now,
          ),
        );
        await u.accounts.saveSession({
          accountId: ownerId,
          tokenHash: live.tokens.hash(ownerToken),
          expiresAt: new Date("2040-01-01T00:00:00Z"),
        });
      });
      const created = await createWorkspace(live, ownerToken, {
        name: "Contract workspace",
        description: "",
      });
      await live.unitOfWorkProvider.run((u) =>
        u.workspaces.join(created.id, accountId, "editor", now),
      );
      workspace = { id: created.id, ownerId, ownerToken };
    }
    if (fixtures.length > (label === "app" ? 12 : 8)) throw Error("S4_SLOTS");
    for (const fixture of fixtures) {
      if (
        !fixture.bytes.length ||
        fixture.bytes.length > MiB ||
        slots.has(fixture.name)
      )
        throw Error("S4_FIXTURE");
      const noteId = base.idGenerator.next();
      const originalId = base.idGenerator.next();
      const jobId = base.idGenerator.next();
      const file = await open(path.join(objects, originalId), "wx", 0o600);
      await file.writeFile(fixture.bytes);
      await file.sync();
      await file.close();
      slots.set(fixture.name, { ...fixture, noteId, originalId });
      await live.unitOfWorkProvider.run(async (u) => {
        await u.notes.insert(
          createNote(
            {
              id: noteId,
              accountId,
              title: "unchanged title",
              html: "<p>old body</p>",
              text: "old body",
              ...(fixture.workspace && workspace
                ? {
                    owner: {
                      kind: "workspace" as const,
                      workspaceId: workspace.id,
                    },
                  }
                : {}),
            },
            now,
          ),
        );
        await u.imports.insertOriginal({
          id: originalId,
          noteId,
          accountId,
          name: `${fixture.name}.${fixture.format}`,
          bytes: fixture.bytes.length,
          storageKey: originalId,
          sha256: s4Hash(fixture.bytes),
          format: fixture.format,
          state: "ready",
          coverage: "complete",
          activeJobId: jobId,
          createdAt: now,
        });
        await u.jobs.insert({
          id: jobId,
          originalId,
          batchId,
          accountId,
          noteId,
          noteVersion: 0,
          useAi: false,
          state: "succeeded",
          leaseToken: null,
          leaseUntil: null,
          failure: null,
          attempt: 1,
          retryOf: null,
          createdAt: now,
          updatedAt: now,
        });
      });
    }
    const result = {
      get container() {
        return current;
      },
      set container(value: HollowContainer) {
        current = value;
      },
      client,
      stage,
      memory,
      storage,
      slots,
      token,
      accountId,
      now,
      root,
      databaseFile,
      generated,
      generations,
      contract: contractCases
        ? {
            codec: contractCodec,
            workspace,
            setTime(value: Date) {
              if (!Number.isFinite(value.getTime()))
                throw Error("S4_CONTRACT_CLOCK");
              clockOffset = value.getTime() - now.getTime();
            },
          }
        : null,
      fail() {
        failed = true;
      },
      async guard() {
        if (failed || closed) throw Error("S4_REUSE_REFUSED");
        await rootGuard();
      },
      observePending(jobId: string) {
        if (label !== "app" || pendingObservation)
          throw Error("S4_WITNESS_SCOPE");
        const witness = pendingWitness(root);
        pendingObservation = { jobId, witness };
        const classify = stage.classify;
        const redraw = stage.redraw;
        const finish = stage.finish;
        stage.classify = function (
          this: NodeRegenerationInput,
          ...args: Parameters<NodeRegenerationInput["classify"]>
        ) {
          return witness.observe("classify", () => classify.apply(this, args));
        };
        stage.redraw = function (
          this: NodeRegenerationInput,
          ...args: Parameters<NodeRegenerationInput["redraw"]>
        ) {
          return witness.observe("redraw", () => redraw.apply(this, args));
        };
        stage.finish = function (
          this: NodeRegenerationInput,
          ...args: Parameters<NodeRegenerationInput["finish"]>
        ) {
          return witness.observe("finish", () => finish.apply(this, args));
        };
        witness.start();
        return () => {
          stage.classify = classify;
          stage.redraw = redraw;
          stage.finish = finish;
          pendingObservation = undefined;
          witness.stop();
        };
      },
      async row(jobId: string): Promise<LlmConversion> {
        const row = await live.unitOfWorkProvider.run((u) =>
          u.llmConversions.find(jobId),
        );
        if (!row) throw Error("S4_ROW");
        if (pendingObservation?.jobId === jobId)
          pendingObservation.witness.row(row, normal.execution.active(jobId));
        return row;
      },
      async request(name: string, previewId?: string) {
        const slot = slots.get(name);
        if (!slot) throw Error("S4_SLOT");
        const note = await live.unitOfWorkProvider.run((u) =>
          u.notes.findById(slot.noteId),
        );
        if (!note) throw Error("S4_NOTE");
        const preview = previewId
          ? await live.unitOfWorkProvider.run((u) =>
              u.llmPdfPreviews.find(previewId),
            )
          : null;
        return requestLlmRegeneration(live, token, {
          noteId: note.id,
          noteVersion: note.version,
          commandId: live.idGenerator.next(),
          expectedEpoch: 1,
          modelId:
            slot.format === "image" ||
            (preview?.state === "ready" &&
              preview.result.modelKind === "chat-image")
              ? "fixture/image"
              : "fixture/text",
          instruction: "",
          confirmed: true,
          ...(previewId ? { previewId } : {}),
        });
      },
      async pending(name: string) {
        const slot = slots.get(name);
        if (!slot || slot.format !== "pdf") throw Error("S4_PDF_SLOT");
        const jobId = live.idGenerator.next();
        const commandId = live.idGenerator.next();
        await live.unitOfWorkProvider.run(async (u) => {
          const note = await u.notes.findById(slot.noteId);
          const original = await u.imports.findOriginal(slot.originalId);
          if (!note || !original) throw Error("S4_PENDING_SOURCE");
          await u.jobs.insert({
            id: jobId,
            originalId: original.id,
            batchId,
            accountId,
            noteId: note.id,
            noteVersion: note.version,
            useAi: true,
            state: "queued",
            leaseToken: null,
            leaseUntil: null,
            failure: null,
            attempt: 0,
            retryOf: null,
            createdAt: now,
            updatedAt: now,
          });
          await admitLlm(live, u, {
            jobId,
            accountId,
            commandId,
            requestDigest: s4Hash(commandId),
            note,
            source: llmAdmissionSource(original, "fixture/text", undefined),
            operation: "import",
            instruction: "",
            epoch: 1,
            retryOf: null,
            pdf: {
              kind: "pending",
              candidates: {
                settingsVersion: 1,
                textModelId: "fixture/text",
                imageModelId: "fixture/image",
              },
            },
          });
        });
        return { jobId };
      },
      async preview(name: string) {
        const slot = slots.get(name);
        if (!slot) throw Error("S4_SLOT");
        const note = await live.unitOfWorkProvider.run((u) =>
          u.notes.findById(slot.noteId),
        );
        if (!note) throw Error("S4_NOTE");
        return beginPdfPreview(live, token, {
          noteId: note.id,
          noteVersion: note.version,
          expectedEpoch: 1,
          commandId: live.idGenerator.next(),
        });
      },
      async predecessorPreview(id: string) {
        const value = await live.unitOfWorkProvider.run((u) =>
          u.llmPdfPreviews.find(id),
        );
        if (
          !value ||
          value.accountId !== accountId ||
          value.access.origin !== "local-original"
        )
          throw Error("S4_PREDECESSOR_PREVIEW");
        return value;
      },
      async wait(jobId: string) {
        await vi.waitFor(
          async () => {
            const row = await result.row(jobId);
            expect(row.phase).toBe("terminal");
            expect(normal.execution.active(jobId)).toBe(false);
          },
          { timeout: label === "app" ? 5000 : 35_000, interval: 20 },
        );
        return result.row(jobId);
      },
      async close() {
        if (closed) return;
        try {
          await normal.execution.stop();
          if (!failed) {
            await stage.stop();
            expect(
              (await client.execute("PRAGMA foreign_key_check")).rows,
            ).toHaveLength(0);
            expect(
              (await client.execute("PRAGMA integrity_check")).rows[0]?.[
                "integrity_check"
              ],
            ).toBe("ok");
            expect(
              (
                await client.execute(
                  "SELECT count(*) as n FROM object_writes WHERE active=1",
                )
              ).rows[0]?.["n"],
            ).toBe(0);
            if (contractCases) expect(memory?.activeInputs()).toBe(0);
            if (label === "native" || contractCases) {
              const checkpoint = await client.execute(
                "PRAGMA main.wal_checkpoint(TRUNCATE)",
              );
              expect(checkpoint.columns).toEqual([
                "busy",
                "log",
                "checkpointed",
              ]);
              expect(checkpoint.rows).toHaveLength(1);
              const row = checkpoint.rows[0];
              expect(row?.length).toBe(3);
              for (const column of ["busy", "log", "checkpointed"] as const) {
                const value = row?.[column];
                expect(typeof value).toBe("number");
                expect(Number.isSafeInteger(value)).toBe(true);
                expect(value).toBe(0);
              }
            }
          }
        } finally {
          client.close();
          closed = true;
        }
        if (!client.closed) throw Error("S4_DB_CLOSE");
        if (failed) return;
        await rootGuard();
      },
    };
    await result.guard();
    return result;
  } catch (error) {
    client.close();
    throw error;
  }
}
export type FormatsFixture = Awaited<ReturnType<typeof createFormatsFixture>>;

export async function lostFinishRecovery(f: FormatsFixture, name: string) {
  const request = await f.request(name);
  const service = f.container.llm;
  if (!service) throw Error("SERVICE");
  const before = f.generated.length;
  const provider = f.container.unitOfWorkProvider;
  const original = provider.run.bind(provider);
  let armed = true;
  let pause = false;
  let waiting = false;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  provider.run = async <T>(
    work: (u: HollowUnitOfWorkContext) => Promise<T>,
  ) => {
    if (pause) {
      pause = false;
      waiting = true;
      await gate;
    }
    let closed = false;
    const value = await original(async (u) => {
      const replace = u.llmConversions.replace.bind(u.llmConversions);
      u.llmConversions.replace = async (next, version) => {
        const ok = await replace(next, version);
        if (
          ok &&
          next.jobId === request.jobId &&
          next.inputReceipt?.state === "closed" &&
          next.sourceMemoryBytes === 0
        )
          closed = true;
        return ok;
      };
      return work(u);
    });
    if (armed && closed) {
      armed = false;
      pause = true;
      throw new SystemError(SystemErrorCode.DatabaseError, "synthetic");
    }
    return value;
  };
  try {
    await sweepLlm(f.container);
    await vi.waitFor(() => expect(waiting).toBe(true), {
      timeout: 5000,
      interval: 10,
    });
    expect(service.execution.active(request.jobId)).toBe(true);
    expect(f.generated).toHaveLength(before);
    if (f.memory)
      expect(
        f.memory.tryReserveBegin({ kind: "llm-conversion", id: request.jobId })
          .kind,
      ).toBe("busy");
    const pins = await f.client.execute({
      sql: "SELECT count(*) AS n FROM object_writes WHERE owner_id=? AND active=1",
      args: [request.jobId],
    });
    expect(Number(pins.rows[0]?.["n"])).toBe(1);
    const row = await f.row(request.jobId);
    expect(row.sourceMemoryBytes).toBe(0);
    expect(row.inputReceipt?.state).toBe("closed");
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.llmDispatches.list(request.jobId),
      ),
    ).toHaveLength(0);
    release();
    expect((await f.wait(request.jobId)).outcome.kind).toBe("succeeded");
    const ended = await f.client.execute({
      sql: "SELECT count(*) AS n FROM object_writes WHERE owner_id=? AND active=1",
      args: [request.jobId],
    });
    expect(Number(ended.rows[0]?.["n"])).toBe(0);
  } finally {
    release();
    provider.run = original;
  }
}

if (process.env["HOLLOW_S4_GROUP"] === "app")
  describe.sequential("S4-A proportional app transactions", () => {
    let f: FormatsFixture;
    let started = 0;
    beforeAll(async () => {
      started = performance.now();
      f = await createFormatsFixture("app", [
        ...["docx", "xlsx", "pptx"].map((format): FormatSlot => {
          if (format !== "docx" && format !== "xlsx" && format !== "pptx")
            throw Error("FORMAT");
          return { name: format, format, bytes: Uint8Array.of(1, 2, 3) };
        }),
        { name: "image", format: "image", bytes: Uint8Array.of(1, 2, 3) },
        { name: "visual", format: "pdf", bytes: Uint8Array.of(1, 2, 3) },
        { name: "pending", format: "pdf", bytes: Uint8Array.of(1, 2, 3) },
        { name: "retry-strict", format: "pdf", bytes: Uint8Array.of(1, 2, 3) },
        { name: "retry-pages", format: "pdf", bytes: Uint8Array.of(1, 2, 3) },
        { name: "retry-pending", format: "pdf", bytes: Uint8Array.of(1, 2, 3) },
        { name: "cancel", format: "docx", bytes: Uint8Array.of(1, 2, 3) },
        { name: "unknown", format: "image", bytes: Uint8Array.of(1, 2, 3) },
        {
          name: "preview-cancel",
          format: "pdf",
          bytes: Uint8Array.of(1, 2, 3),
        },
      ]);
    }, 40_000);
    beforeEach(async () => {
      expect(performance.now() - started).toBeLessThan(180_000);
      await f.guard();
    });
    afterEach(async (context) => {
      if (context.task.result?.state === "fail") f.fail();
      else await f.guard();
    });
    afterAll(async () => {
      if (f) await f.close();
    }, 60_000);
    for (const name of [
      "retry-strict",
      "retry-pages",
      "retry-pending",
    ] as const)
      it(`retries ${name} import within the original parent and creates its own current input ownership`, async () => {
        const generator = f.container.llm?.generator;
        if (!generator || !f.memory) throw Error("S4_RETRY_SERVICE");
        const requested = await f.pending(name);
        const oldJob = await f.container.unitOfWorkProvider.run((u) =>
          u.jobs.find(requested.jobId),
        );
        const generate = vi.spyOn(generator, "generate");
        const prepare = vi.spyOn(f.memory, "prepareWork");
        if (name === "retry-pending")
          prepare.mockRejectedValueOnce(
            new LlmOperationError("LLM_DOCUMENT_CORRUPT", "not-sent", true),
          );
        else
          generate.mockRejectedValueOnce(
            new LlmOperationError("LLM_RATE_LIMIT", "possible", true),
          );
        try {
          await sweepLlm(f.container);
          const failed = await f.wait(requested.jobId);
          expect(failed.outcome.kind).toBe("failed");
          expect(failed.owner.state).toBe("closed");
          expect(failed.sourceMemoryBytes).toBe(0);
          expect(failed.inputReceipt?.state).toBe("closed");
          expect(failed.selection).toBe(
            name === "retry-pending" ? "pdf-pending" : "fixed",
          );
          const beforeCalls = generate.mock.calls.length;
          const retry = await retryLlmJob(
            f.container,
            f.token,
            requested.jobId,
          );
          if (!retry) throw Error("S4_RETRY_RECEIPT");
          expect(
            await retryLlmJob(f.container, f.token, requested.jobId),
          ).toEqual(retry);
          const admitted = await f.row(retry.jobId);
          expect(admitted).toMatchObject({
            operation: "import",
            retryOf: requested.jobId,
            credentialEpoch: failed.credentialEpoch,
            instruction: failed.instruction,
            inputReceipt: null,
            sourceMemoryBytes: 0,
            owner: { state: "idle" },
          });
          expect(admitted.source).toEqual(failed.source);
          if (admitted.selection === "fixed" && failed.selection === "fixed") {
            expect(admitted.pdfProof).toEqual(failed.pdfProof);
            expect(admitted.modelId).toBe(failed.modelId);
            expect(admitted.sourceOwnershipGeneration).toBe(
              failed.sourceOwnershipGeneration,
            );
          } else {
            expect(
              admitted.selection === "pdf-pending" &&
                failed.selection === "pdf-pending" &&
                admitted.candidates,
            ).toEqual(failed.selection === "pdf-pending" && failed.candidates);
          }
          expect(
            await f.container.unitOfWorkProvider.run((u) =>
              u.jobs.find(retry.jobId),
            ),
          ).toMatchObject({
            batchId: oldJob?.batchId,
            retryOf: requested.jobId,
            state: "queued",
          });
          expect(generate.mock.calls.length).toBe(beforeCalls);
          await sweepLlm(f.container);
          const ended = await f.wait(retry.jobId);
          expect(ended.outcome.kind).toBe("succeeded");
          expect(ended.owner.state).toBe("closed");
          expect(ended.inputReceipt).toMatchObject({
            state: "closed",
            consumer: { id: retry.jobId },
          });
          expect(ended.inputReceipt?.consumer.id).not.toBe(
            failed.inputReceipt?.consumer.id,
          );
          expect(ended.sourceMemoryBytes).toBe(0);
          expect(
            (
              await f.container.unitOfWorkProvider.run((u) =>
                u.notes.findById(ended.noteId),
              )
            )?.html,
          ).toContain("generated");
        } finally {
          generate.mockRestore();
          prepare.mockRestore();
        }
      }, 15_000);
    for (const name of ["docx", "xlsx", "pptx", "image"] as const)
      it(`S4-A normal ${name} uses closed0 before dispatch and consumes one logical quota`, async () => {
        const requested = await f.request(name);
        await sweepLlm(f.container);
        const row = await f.wait(requested.jobId);
        expect(row.outcome.kind).toBe("succeeded");
        expect(row.sourceMemoryBytes).toBe(0);
        expect(row.inputReceipt).toMatchObject({
          state: "closed",
          generation: 1,
        });
        expect(
          (
            await f.container.unitOfWorkProvider.run((u) =>
              u.llmQuota.reservation(row.jobId),
            )
          )?.state,
        ).toBe("consumed");
        expect(
          await f.container.unitOfWorkProvider.run((u) =>
            u.llmDispatches.list(row.jobId),
          ),
        ).toHaveLength(1);
        const slot = f.slots.get(name);
        if (!slot) throw Error("SLOT");
        const note = await f.container.unitOfWorkProvider.run((u) =>
          u.notes.findById(slot.noteId),
        );
        expect(note?.title).toBe("unchanged title");
        expect(note?.html).toContain("generated");
      }, 10_000);
    it("S4-A pending import classification closes g before seal and page dispatch", async () => {
      const requested = await f.pending("pending");
      const stopObservation = f.observePending(requested.jobId);
      try {
        await sweepLlm(f.container);
        const row = await f.wait(requested.jobId);
        expect(row.outcome.kind).toBe("succeeded");
        expect(row.inputReceipt).toMatchObject({
          state: "closed",
          generation: 3,
        });
        expect(
          f.generations
            .filter((entry) => entry.consumer === row.jobId)
            .map((entry) => entry.generation),
        ).toEqual([2, 3]);
      } finally {
        stopObservation();
      }
    }, 10_000);
    it("S4-A visual preview closes its consumer and each page redraw gets fresh g before dispatch", async () => {
      const request = await f.preview("visual");
      await sweepPdfPreviews(f.container);
      await vi.waitFor(
        async () =>
          expect(
            (
              await f.container.unitOfWorkProvider.run((u) =>
                u.llmPdfPreviews.find(request.previewId),
              )
            )?.state,
          ).toBe("ready"),
        { timeout: 5000 },
      );
      const preview = await f.container.unitOfWorkProvider.run((u) =>
        u.llmPdfPreviews.find(request.previewId),
      );
      expect(preview?.inputReceipt).toMatchObject({
        state: "closed",
        generation: 1,
        consumer: { kind: "pdf-preview" },
      });
      const requested = await f.request("visual", request.previewId);
      await sweepLlm(f.container);
      const row = await f.wait(requested.jobId);
      expect(row.outcome.kind).toBe("succeeded");
      expect(row.inputReceipt).toMatchObject({
        state: "closed",
        generation: 3,
        consumer: { kind: "llm-conversion" },
      });
      expect(
        await f.container.unitOfWorkProvider.run((u) =>
          u.llmDispatches.list(row.jobId),
        ),
      ).toHaveLength(2);
      expect(
        (
          await f.container.unitOfWorkProvider.run((u) =>
            u.llmQuota.reservation(row.jobId),
          )
        )?.state,
      ).toBe("consumed");
    }, 10_000);
    it("S4-A queued V2 cancellation never reads or dispatches", async () => {
      const requested = await f.request("cancel");
      const source = f.container.llm?.source;
      if (!source) throw Error("SERVICE");
      const reads = vi.spyOn(source, "read");
      try {
        await cancelLlmRegeneration(f.container, f.token, requested.jobId);
        await sweepLlm(f.container);
        expect(reads).not.toHaveBeenCalled();
        expect((await f.row(requested.jobId)).outcome.kind).toBe("cancelled");
        expect(
          (
            await f.container.unitOfWorkProvider.run((u) =>
              u.llmQuota.reservation(requested.jobId),
            )
          )?.state,
        ).toBe("released");
        expect(
          await f.container.unitOfWorkProvider.run((u) =>
            u.llmDispatches.list(requested.jobId),
          ),
        ).toHaveLength(0);
      } finally {
        reads.mockRestore();
      }
    }, 10_000);
    it("S4-A finish response ambiguity retains original pin, derived input and execution until exact saved proof settles", async () => {
      await lostFinishRecovery(f, "unknown");
    }, 10_000);
    it("S4-A unsaved preview claim followed by normal cancel releases only its exact private admission", async () => {
      const request = await f.preview("preview-cancel");
      const provider = f.container.unitOfWorkProvider;
      const original = provider.run.bind(provider);
      let armed = true;
      provider.run = async <T>(
        work: (u: HollowUnitOfWorkContext) => Promise<T>,
      ) =>
        original(async (u) => {
          const claim = u.llmPdfPreviews.claimExact.bind(u.llmPdfPreviews);
          u.llmPdfPreviews.claimExact = async (input) => {
            if (!armed) return claim(input);
            armed = false;
            throw new SystemError(SystemErrorCode.DatabaseError, "synthetic");
          };
          return work(u);
        });
      try {
        expect(await f.stage.claimPreview()).toBeNull();
      } finally {
        provider.run = original;
      }
      await cancelPdfPreview(f.container, f.token, request.previewId);
      expect(await f.stage.resumePreview()).toHaveLength(0);
      const memory = f.memory;
      if (!memory) throw Error("MEMORY");
      const a = memory.reserveBegin({
        kind: "pdf-preview",
        id: request.previewId,
      });
      memory.holdBegin(a);
      expect(
        (
          await f.container.unitOfWorkProvider.run((u) =>
            u.llmPdfPreviews.find(request.previewId),
          )
        )?.state,
      ).toBe("cancelled");
    }, 10_000);
  });

if (process.env["HOLLOW_S4_GROUP"] === "app-c")
  describe.sequential("S4-C exact input and delivery guards", () => {
    let f: FormatsFixture;
    let started = 0;
    const service = () => {
      const value = f.container.llm;
      if (!value || !f.memory || !f.contract)
        throw Error("S4_CONTRACT_SERVICE");
      return value;
    };
    const memory = () => {
      if (!f.memory) throw Error("S4_CONTRACT_MEMORY");
      return f.memory;
    };
    const oldBody = async (name: string) => {
      const slot = f.slots.get(name);
      if (!slot) throw Error("S4_SLOT");
      const note = await f.container.unitOfWorkProvider.run((u) =>
        u.notes.findById(slot.noteId),
      );
      if (!note) throw Error("S4_NOTE");
      expect(note.html).toBe("<p>old body</p>");
      expect(note.title).toBe("unchanged title");
      return note;
    };
    const dispatches = (jobId: string) =>
      f.container.unitOfWorkProvider.run((u) => u.llmDispatches.list(jobId));
    const quota = (jobId: string) =>
      f.container.unitOfWorkProvider.run((u) => u.llmQuota.reservation(jobId));
    const released = async (jobId: string) => {
      expect(memory().activeInputs()).toBe(0);
      expect(service().execution.active(jobId)).toBe(false);
      expect((await f.row(jobId)).sourceMemoryBytes).toBe(0);
      expect(
        (
          await f.client.execute(
            "SELECT count(*) AS n FROM object_writes WHERE active=1",
          )
        ).rows[0]?.["n"],
      ).toBe(0);
    };
    const confirmed = async (name: string) => {
      const request = await f.preview(name);
      await sweepPdfPreviews(f.container);
      await vi.waitFor(
        async () => {
          const preview = await f.container.unitOfWorkProvider.run((u) =>
            u.llmPdfPreviews.find(request.previewId),
          );
          expect(preview?.state).toBe("ready");
          expect(preview?.owner.state).toBe("closed");
          expect(preview?.sourceMemoryBytes).toBe(0);
          expect(preview?.inputReceipt?.state).toBe("closed");
        },
        { timeout: 5000, interval: 20 },
      );
      return f.request(name, request.previewId);
    };
    beforeAll(async () => {
      started = performance.now();
      f = await createFormatsFixture(
        "app",
        [
          { name: "document", format: "docx", bytes: Uint8Array.of(1, 2, 3) },
          { name: "image", format: "image", bytes: Uint8Array.of(1, 2, 3) },
          { name: "visual", format: "pdf", bytes: Uint8Array.of(1, 2, 3) },
          {
            name: "workspace",
            format: "pdf",
            bytes: Uint8Array.of(1, 2, 3),
            workspace: true,
          },
        ],
        true,
      );
    }, 60_000);
    beforeEach(async () => {
      if (performance.now() - started >= 180_000)
        throw Error("S4_APP_DEADLINE");
      await f.guard();
    });
    afterEach(async (context) => {
      if (context.task.result?.state === "fail") f?.fail();
      else await f.guard();
    });
    afterAll(async () => {
      await f?.close();
    }, 60_000);

    for (const [version, name] of [
      [2, "document"],
      [3, "image"],
      [4, "visual"],
    ] as const)
      it(`C01 V${version} initial no-claim returns its admission and unknown replay stays held until exact cancellation`, async () => {
        const requested =
          version === 4 ? await confirmed(name) : await f.request(name);
        const before = await f.row(requested.jobId);
        expect(before.selection).toBe("fixed");
        expect(before.preparationVersion).toBe(version);
        const read = vi.spyOn(service().source, "read");
        const provider = f.container.unitOfWorkProvider;
        const originalRun = provider.run.bind(provider);
        let ambiguous = false;
        let claims = 0;
        provider.run = async <T>(
          work: (u: HollowUnitOfWorkContext) => Promise<T>,
        ) => {
          let rejectedClaim = false;
          const result = await originalRun(async (u) => {
            const originalClaim = u.llmConversions.claimExact;
            u.llmConversions.claimExact = async (input) => {
              if (input.candidate.jobId !== requested.jobId)
                return originalClaim.call(u.llmConversions, input);
              claims += 1;
              rejectedClaim = true;
              return null;
            };
            try {
              return await work(u);
            } finally {
              u.llmConversions.claimExact = originalClaim;
            }
          });
          if (ambiguous && rejectedClaim) {
            ambiguous = false;
            throw new SystemError(SystemErrorCode.DatabaseError, "synthetic");
          }
          return result;
        };
        try {
          expect(await f.stage.claim()).toBeNull();
          expect(claims).toBe(1);
          expect(memory().activeInputs()).toBe(0);
          const available = memory().tryReserveBegin({
            kind: "llm-conversion",
            id: requested.jobId,
          });
          expect(available.kind).toBe("reserved");
          if (available.kind === "reserved")
            memory().holdBegin(available.admission);
          expect(await f.row(requested.jobId)).toEqual(before);
          ambiguous = true;
          expect(await f.stage.claim()).toBeNull();
          expect(claims).toBe(2);
          expect(memory().activeInputs()).toBe(1);
          expect(
            memory().tryReserveBegin({
              kind: "llm-conversion",
              id: requested.jobId,
            }).kind,
          ).toBe("busy");
          expect(await f.stage.resume()).toHaveLength(0);
          expect(claims).toBe(3);
          expect(memory().activeInputs()).toBe(1);
          expect(await f.row(requested.jobId)).toEqual(before);
          await cancelLlmRegeneration(f.container, f.token, requested.jobId);
          const cancelled = await f.row(requested.jobId);
          expect(cancelled.phase).toBe("terminal");
          expect(cancelled.outcome.kind).toBe("cancelled");
          expect(cancelled.version).toBe(before.version + 1);
          expect(cancelled.cancelGeneration).toBe(before.cancelGeneration + 1);
          expect(cancelled.inputReceipt).toEqual(before.inputReceipt);
          expect(cancelled.owner).toEqual(before.owner);
          expect((await quota(requested.jobId))?.state).toBe("released");
          expect(await f.stage.resume()).toHaveLength(0);
          expect(await f.row(requested.jobId)).toEqual(cancelled);
          expect(claims).toBe(3);
          expect(read).not.toHaveBeenCalled();
          expect(await dispatches(requested.jobId)).toHaveLength(0);
          await released(requested.jobId);
          await oldBody(name);
        } finally {
          provider.run = originalRun;
          read.mockRestore();
        }
      }, 40_000);

    for (const stop of ["cancel", "role", "deadline"] as const)
      it(`C02 V4 ${stop} before next begin never reads or dispatches a page`, async () => {
        const name = stop === "role" ? "workspace" : "visual";
        const requested = await confirmed(name);
        const note = await oldBody(name);
        const profiles = service().profiles;
        const inspect = profiles.inspect.bind(profiles);
        let reached = false;
        let release = () => {};
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const profile = vi
          .spyOn(profiles, "inspect")
          .mockImplementation(async (...args) => {
            reached = true;
            await gate;
            return inspect(...args);
          });
        const read = vi.spyOn(service().source, "read");
        const redraw = vi.spyOn(f.stage, "redraw");
        const generated = f.generated.length;
        const codecRedraws = f.contract?.codec.redraws;
        let oldGeneration: number | undefined;
        try {
          await sweepLlm(f.container);
          await vi.waitFor(() => expect(reached).toBe(true), {
            timeout: 5000,
            interval: 20,
          });
          const before = await f.row(requested.jobId);
          expect(before.sourceMemoryBytes).toBe(0);
          expect(before.inputReceipt?.state).toBe("closed");
          oldGeneration = before.inputReceipt?.generation;
          expect(oldGeneration).toBe(1);
          if (stop === "cancel")
            await cancelLlmRegeneration(f.container, f.token, requested.jobId);
          else if (stop === "role") {
            const workspace = f.contract?.workspace;
            if (!workspace || note.owner.kind !== "workspace")
              throw Error("S4_CONTRACT_WORKSPACE");
            await changeWorkspaceMember(f.container, workspace.ownerToken, {
              workspaceId: workspace.id,
              accountId: f.accountId,
              role: "viewer",
              expectedRole: "editor",
              ownerConfirmed: false,
            });
            const lost = await f.container.unitOfWorkProvider.run(
              async (u) => ({
                role: await u.workspaces.role(workspace.id, f.accountId),
                canEdit: await canScope(u, note.owner, f.accountId, "edit"),
                note: await u.notes.findById(note.id),
              }),
            );
            expect(lost.role).toBe("viewer");
            expect(lost.canEdit).toBe(false);
            expect(lost.note?.version).toBe(note.version);
            expect((await f.row(requested.jobId)).cancelGeneration).toBe(
              before.cancelGeneration + 1,
            );
          } else {
            f.contract?.setTime(new Date(before.deadlineAt.getTime() + 1));
          }
          release();
          const ended = await f.wait(requested.jobId);
          expect(ended.outcome).toEqual(
            stop === "deadline"
              ? { kind: "failed", code: "LLM_SOURCE_CHANGED" }
              : { kind: "cancelled" },
          );
          expect(ended.inputReceipt?.generation).toBe(oldGeneration);
          expect(ended.inputReceipt?.state).toBe("closed");
          expect(read).not.toHaveBeenCalled();
          expect(redraw).not.toHaveBeenCalled();
          expect(f.contract?.codec.redraws).toBe(codecRedraws);
          expect(f.generated).toHaveLength(generated);
          expect(await dispatches(requested.jobId)).toHaveLength(0);
          expect((await quota(requested.jobId))?.state).toBe("released");
          expect((await oldBody(name)).version).toBe(note.version);
          await released(requested.jobId);
          if (stop === "role") {
            const workspace = f.contract?.workspace;
            if (!workspace) throw Error("S4_CONTRACT_WORKSPACE");
            await changeWorkspaceMember(f.container, workspace.ownerToken, {
              workspaceId: workspace.id,
              accountId: f.accountId,
              role: "editor",
              expectedRole: "viewer",
              ownerConfirmed: false,
            });
            await sweepLlm(f.container);
            expect(await f.row(requested.jobId)).toEqual(ended);
            expect(f.generated).toHaveLength(generated);
          }
        } finally {
          release();
          f.contract?.setTime(f.now);
          profile.mockRestore();
          read.mockRestore();
          redraw.mockRestore();
        }
      }, 40_000);

    it("C03 partial V4 possible delivery consumes once and preserves the old body", async () => {
      const requested = await confirmed("visual");
      const note = await oldBody("visual");
      const generator = service().generator;
      const generate = generator.generate.bind(generator);
      let calls = 0;
      const spy = vi
        .spyOn(generator, "generate")
        .mockImplementation(async (...args) => {
          const value = await generate(...args);
          calls += 1;
          if (calls === 2) {
            expect(
              (await dispatches(requested.jobId)).map((entry) => entry.state),
            ).toEqual(["response", "intent"]);
            throw new LlmOperationError("LLM_UNAVAILABLE", "possible", true);
          }
          return value;
        });
      try {
        await sweepLlm(f.container);
        const row = await f.wait(requested.jobId);
        expect(row.outcome).toEqual({
          kind: "failed",
          code: "LLM_UNAVAILABLE",
        });
        expect(calls).toBe(2);
        expect((await quota(requested.jobId))?.state).toBe("consumed");
        expect(
          (await dispatches(requested.jobId)).map((value) => value.state),
        ).toEqual(["scrubbed", "unknown"]);
        expect(
          f.generations
            .filter((entry) => entry.consumer === row.jobId)
            .map((entry) => entry.generation),
        ).toEqual([2, 3]);
        expect((await oldBody("visual")).version).toBe(note.version);
        await released(requested.jobId);
      } finally {
        spy.mockRestore();
      }
    }, 40_000);

    it("C04 V2 preparation not-sent failure closes genuine input and releases its reservation", async () => {
      const requested = await f.request("document");
      const note = await oldBody("document");
      const contract = f.contract;
      if (!contract) throw Error("S4_CONTRACT_SERVICE");
      const generated = f.generated.length;
      const prepares = contract.codec.prepares;
      const read = vi.spyOn(service().source, "read");
      contract.codec.prepareFailure = true;
      try {
        await sweepLlm(f.container);
        const row = await f.wait(requested.jobId);
        expect(row.outcome).toEqual({
          kind: "failed",
          code: "LLM_SOURCE_INVALID",
        });
        expect(read).toHaveBeenCalledTimes(1);
        expect(contract.codec.prepares).toBe(prepares + 1);
        expect(row.inputReceipt?.state).toBe("closed");
        expect((await quota(requested.jobId))?.state).toBe("released");
        expect(await dispatches(requested.jobId)).toHaveLength(0);
        expect(f.generated).toHaveLength(generated);
        expect((await oldBody("document")).version).toBe(note.version);
        await released(requested.jobId);
      } finally {
        contract.codec.prepareFailure = false;
        read.mockRestore();
      }
    }, 40_000);

    it("C05 V3 not-sent result after intent refunds once and preserves the old body", async () => {
      const requested = await f.request("image");
      const note = await oldBody("image");
      const generator = service().generator;
      const generate = generator.generate.bind(generator);
      let calls = 0;
      const spy = vi
        .spyOn(generator, "generate")
        .mockImplementation(async (...args) => {
          await generate(...args);
          calls += 1;
          expect((await quota(requested.jobId))?.state).toBe("consumed");
          throw new LlmOperationError("LLM_UNAVAILABLE", "not-sent", true);
        });
      try {
        await sweepLlm(f.container);
        const row = await f.wait(requested.jobId);
        expect(row.outcome).toEqual({
          kind: "failed",
          code: "LLM_UNAVAILABLE",
        });
        expect(calls).toBe(1);
        expect(row.inputReceipt?.state).toBe("closed");
        expect(
          (await dispatches(requested.jobId)).map((value) => value.state),
        ).toEqual(["not-sent"]);
        expect((await quota(requested.jobId))?.state).toBe("released");
        expect((await oldBody("image")).version).toBe(note.version);
        await released(requested.jobId);
      } finally {
        spy.mockRestore();
      }
    }, 40_000);
  });
