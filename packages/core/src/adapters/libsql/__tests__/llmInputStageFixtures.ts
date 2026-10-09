import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { createNodeLlm } from "@repo/core/adapters/node/llm/config";
import { NodeLlmExecution } from "@repo/core/adapters/node/llm/execution";
import { NodeLlmRuntimeOwnership } from "@repo/core/adapters/node/llm/runtimeOwnership";
import { NodeRegenerationInput } from "@repo/core/adapters/node/regeneration/input";
import { NodeRegenerationMemory } from "@repo/core/adapters/node/regeneration/memory";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  isLlmOperationError,
  type LlmGenerator,
  LlmOperationError,
  type LlmPrepareInput,
  type LlmSourcePreparer,
} from "@repo/core/application/llm/ports";
import { requestLlmRegeneration } from "@repo/core/application/llm/request";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { assetUrl } from "@repo/core/domain/asset/entity";
import type {
  LlmConversion,
  LlmLegacyFormat,
} from "@repo/core/domain/llm/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { expect, vi } from "vitest";
import {
  applyPragmas,
  createLibsqlClient,
  type Database,
  getDatabase,
} from "../client";

type FixtureLabel = "app" | "native";
export type StageSlot = Readonly<{
  noteId: string;
  originalId: string;
  accountId: string;
  token: string;
  bytes: Uint8Array;
  format: LlmLegacyFormat;
  storageKey: string;
  assetId?: string;
  assetUrl?: string;
  marker?: string;
}>;
export type StageFixture = {
  container: HollowContainer;
  now: Date;
  readonly db: Database;
  readonly client: ReturnType<typeof createLibsqlClient>;
  readonly stage: NodeRegenerationInput;
  readonly memory: NodeRegenerationMemory | null;
  readonly execution: NodeLlmExecution;
  readonly ownership: NodeLlmRuntimeOwnership;
  readonly storage: CoordinatedObjectStorage;
  readonly preparer: LlmSourcePreparer;
  readonly slots: Map<number, StageSlot>;
  readonly root: string;
  readonly databaseFile: string;
  readonly objectsDirectory: string;
  readonly generateCalls: number;
  readonly generatedInputs: Parameters<LlmGenerator["generate"]>[0][];
  readonly workerStarts: number;
  readonly workerStartsByOriginal: ReadonlyMap<string, number>;
  readonly activeWorkers: number;
  readonly workerClosureUnknown: boolean;
  advanceMonth(): void;
  guard(): Promise<void>;
  request(slot: number): ReturnType<typeof requestLlmRegeneration>;
  finish(jobId: string): Promise<LlmConversion>;
  close(): Promise<void>;
};
const MiB = 1024 * 1024;
const allocated = new Set<FixtureLabel>();
const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
function fail(reason: string): never {
  throw new Error(`S3_FIXTURE_${reason}`);
}
async function privateDirectory(directory: string): Promise<void> {
  const handle = await open(
    directory,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const info = await handle.stat();
    if (!info.isDirectory() || (info.mode & 0o777) !== 0o700) fail("DIRECTORY");
  } finally {
    await handle.close();
  }
}
async function guardFiles(root: string): Promise<void> {
  await privateDirectory(root);
  let total = 0;
  let originals = 0;
  let material = 0;
  let helpers = 0;
  let temporary = 0;
  const databaseBytes = new Map<string, number>();
  async function visit(directory: string) {
    await privateDirectory(directory);
    for (const name of await readdir(directory)) {
      const file = path.join(directory, name);
      const info = await lstat(file).catch((error: unknown) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT" &&
          /^(app|native)\.db-(wal|shm)$/.test(name)
        )
          return null;
        throw error;
      });
      if (info === null) continue;
      if (info.isSymbolicLink()) fail("SYMLINK");
      if (info.isDirectory()) {
        await visit(file);
        continue;
      }
      if (!info.isFile() || ![0o600, 0o700].includes(info.mode & 0o777))
        fail("FILE_MODE");
      const handle = await open(
        file,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const current = await handle.stat();
        if (
          !current.isFile() ||
          current.dev !== info.dev ||
          current.ino !== info.ino ||
          current.size !== info.size
        )
          fail("FILE_CHANGED");
      } finally {
        await handle.close();
      }
      total += info.size;
      const relative = path.relative(root, file);
      const db = /^(app|native)\.db(?:-(?:wal|shm|journal))?$/.exec(relative);
      if (db?.[1])
        databaseBytes.set(db[1], (databaseBytes.get(db[1]) ?? 0) + info.size);
      else if (/^objects-(app|native)\/[^/.][^/]*$/.test(relative)) {
        if (info.size > MiB) fail("ORIGINAL_FILE_LIMIT");
        originals += info.size;
      } else if (/^(?:helpers?|logs?|results)\//.test(relative))
        helpers += info.size;
      else if (/^(?:NodeTMP|node-tmp|tmp)\//.test(relative))
        temporary += info.size;
      else material += info.size;
    }
  }
  await visit(root);
  if (
    total > 192 * MiB ||
    originals > 8 * MiB ||
    material > 256 * 1024 ||
    helpers > 8 * MiB ||
    temporary > 8 * MiB
  )
    fail("ROOT_LIMIT");
  if ([...databaseBytes.values()].some((bytes) => bytes > 32 * MiB))
    fail("DATABASE_LIMIT");
}
async function writeFresh(file: string, bytes: Uint8Array): Promise<void> {
  if (bytes.byteLength > MiB) fail("ORIGINAL_FILE_LIMIT");
  const handle = await open(file, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}
function fakeTextPreparer(): LlmSourcePreparer {
  return {
    async prepare(input, signal) {
      if (signal.aborted)
        throw new LlmOperationError("LLM_TIMEOUT", "not-sent", true);
      if (input.preparationVersion !== 1) fail("APP_PREPARER_FORMAT");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        input.bytes,
      );
      let html =
        input.source.format === "html"
          ? text
          : `<p>${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`;
      const media: Array<{ placeholder: string; occurrences: number }> = [];
      for (const entry of input.media ?? []) {
        const occurrences = html.split(entry.sourceUrl).length - 1;
        if (occurrences) {
          html = html.replaceAll(entry.sourceUrl, entry.placeholder);
          media.push({ placeholder: entry.placeholder, occurrences });
        }
      }
      return {
        kind: "text-blocks",
        preparationVersion: 1,
        blocks: 1,
        notices: [],
        media,
        segments: [
          {
            identity: {
              kind: "prepared-segment",
              ordinal: 0,
              sha256: sha256(html),
            },
            html,
            firstBlock: 0,
            blockCount: 1,
          },
        ],
      };
    },
  };
}

export async function createStageFixture(
  label: FixtureLabel,
): Promise<StageFixture> {
  if (allocated.has(label)) fail("LABEL_ALREADY_ALLOCATED");
  const requestedRoot = process.env["HOLLOW_LLM_INPUT_STAGE_ROOT"];
  if (
    !requestedRoot ||
    !path.isAbsolute(requestedRoot) ||
    path.normalize(requestedRoot) !== requestedRoot ||
    (await realpath(requestedRoot)) !== requestedRoot
  )
    fail("FRESH_ROOT_REQUIRED");
  const root: string = requestedRoot;
  await guardFiles(root);
  allocated.add(label);
  const databaseFile = path.join(root, `${label}.db`);
  const empty = await open(databaseFile, "wx", 0o600);
  try {
    await empty.sync();
  } finally {
    await empty.close();
  }
  const client = createLibsqlClient({ url: `file:${databaseFile}` });
  try {
    await applyPragmas(client);
    const db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: fileURLToPath(
        new URL("../migrations", import.meta.url),
      ),
    });
    await applyPragmas(client);
    const columns = await client.execute("PRAGMA table_info(llm_conversions)");
    if (
      !columns.rows.some((column) => column["name"] === "source_input_receipt")
    )
      fail("MIGRATION_0043_REQUIRED");
    const pageSize = await client.execute("PRAGMA page_size");
    const pageBytes = Number(pageSize.rows[0]?.["page_size"]);
    if (!Number.isSafeInteger(pageBytes) || pageBytes < 1) fail("PAGE_SIZE");
    await client.execute(
      `PRAGMA max_page_count = ${Math.floor((32 * MiB) / pageBytes)}`,
    );
    await client.execute("PRAGMA journal_size_limit = 8388608");
    let now = new Date("2026-10-06T00:00:00.000Z");
    const clock = { now: () => new Date(now) };
    const base = {
      ...createHollowContainer(db, "http://fixture.invalid", {
        send: async () => {},
      }),
      clock,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    };
    let current: HollowContainer = base;
    const live = new Proxy(base, {
      get: (_target, property) => Reflect.get(current, property),
    });
    const objectsDirectory = path.join(root, `objects-${label}`);
    if ((await realpath(objectsDirectory)) !== objectsDirectory)
      fail("OBJECTS_DIRECTORY_PATH");
    await privateDirectory(objectsDirectory);
    const storage = new CoordinatedObjectStorage(
      objectsDirectory,
      {
        run: (work) => live.unitOfWorkProvider.run(work),
      },
      clock,
    );
    await storage.recoverOwners();
    const workerFile = (name: string) =>
      fileURLToPath(new URL(`../../node/llm/${name}`, import.meta.url));
    const llm = await createNodeLlm(live, {
      storage,
      directory: objectsDirectory,
      workerPath: workerFile("sourceWorker.mjs"),
      documentWorkerPath: workerFile("documentWorker.mjs"),
      imageChildPath: workerFile("imageChild.mjs"),
      pdfPagesChildPath: workerFile("pdfPagesChild.mjs"),
      profiles: {
        inspect: async ({ modelId, kind }) =>
          kind === "chat-image"
            ? {
                modelId,
                kind,
                contextTokens: 100_000,
                outputTokens: 8192,
                supportsMaxTokens: true,
                source: "adopted-default",
                checkedAt: clock.now(),
                budget: {
                  kind: "resource-only",
                  imageTokens: null,
                  contextGuaranteed: false,
                },
              }
            : {
                modelId,
                kind,
                contextTokens: 100_000,
                outputTokens: 8192,
                supportsMaxTokens: true,
                source: "adopted-default",
                checkedAt: clock.now(),
              },
      },
      monthlyLimit: undefined,
      wake: () => {},
    });
    if (
      llm.inputMode !== "leased-local-v2" ||
      !(llm.inputStage instanceof NodeRegenerationInput) ||
      !(llm.execution instanceof NodeLlmExecution) ||
      !(llm.ownership instanceof NodeLlmRuntimeOwnership)
    )
      fail("FACTORY_WIRING");
    const execution = llm.execution;
    const ownership = llm.ownership;
    const slots = new Map<number, StageSlot>();
    let workerStarts = 0;
    let activeWorkers = 0;
    let workerClosureUnknown = false;
    const workerStartsByOriginal = new Map<string, number>();
    const preparer = label === "app" ? fakeTextPreparer() : llm.preparer;
    if (label === "native") {
      const prepare = preparer.prepare.bind(preparer);
      preparer.prepare = async (
        input: LlmPrepareInput,
        signal: AbortSignal,
      ) => {
        const slot = [...slots.entries()].find(
          ([, value]) => value.originalId === input.source.originalId,
        )?.[0];
        if (
          input.preparationVersion !== 1 ||
          slot === undefined ||
          slot < 13 ||
          slot > 18 ||
          activeWorkers !== 0 ||
          workerStarts >= 6 ||
          workerStartsByOriginal.has(input.source.originalId)
        )
          fail("WORKER_BUDGET");
        workerStarts++;
        activeWorkers++;
        workerStartsByOriginal.set(input.source.originalId, 1);
        let ended = false;
        try {
          const result = await prepare(input, signal);
          ended = true;
          return result;
        } catch (error) {
          ended = isLlmOperationError(error) && error.closed;
          if (!ended) workerClosureUnknown = true;
          throw error;
        } finally {
          if (ended) activeWorkers--;
        }
      };
    }
    const memory =
      label === "app"
        ? new NodeRegenerationMemory(preparer, llm.pdfClassifier, llm.pdfPages)
        : null;
    const stage = memory
      ? new NodeRegenerationInput(live, { input: memory, local: llm.source })
      : llm.inputStage;
    if (memory) stage.configureRuntime(ownership.runtimeId, ownership);
    let generateCalls = 0;
    const generatedInputs: Parameters<LlmGenerator["generate"]>[0][] = [];
    current = {
      ...base,
      openRouter: {
        authorization: {
          authorization: async () => "synthetic-authorization",
          exchange: async () => "synthetic-self-credential",
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
      llm: {
        ...llm,
        preparer,
        inputStage: stage,
        generator: {
          async generate(input) {
            generateCalls++;
            generatedInputs.push(input);
            return {
              content: `<p>生成済み</p>${input.kind === "chat-text" ? input.input.html : ""}`,
              finish: "stop",
              inputTokens: 1,
              outputTokens: 1,
            };
          },
        },
      },
    };
    const start = label === "app" ? 1 : 13;
    const end = label === "app" ? 12 : 20;
    const accounts = label === "app" ? 2 : 1;
    const workspaceId = label === "app" ? base.idGenerator.next() : null;
    for (let index = 0; index < accounts; index++) {
      const accountId = base.idGenerator.next();
      const token = `synthetic-${label}-session-${index}`;
      const batchId = base.idGenerator.next();
      await live.unitOfWorkProvider.run(async (u) => {
        await u.accounts.save(
          verifyAccount(
            createAccount(
              accountId,
              `${label}-${index}@fixture.invalid`,
              "synthetic-hash",
              now,
            ),
            now,
          ),
        );
        await u.accounts.saveSession({
          accountId,
          tokenHash: live.tokens.hash(token),
          expiresAt: new Date("2040-01-01T00:00:00.000Z"),
        });
        const connection = await u.openRouterConnections.ensure(accountId, now);
        if (
          !(await u.openRouterConnections.replace(
            {
              ...connection,
              state: "linked",
              credentialEnvelope: "synthetic-self-credential",
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
          fail("SEED_CONNECTION_CAS");
        if (workspaceId) {
          if (index === 0)
            await u.workspaces.create({
              id: workspaceId,
              creatorId: accountId,
              name: "S3 fixture workspace",
              description: "",
              slug: null,
              state: "active",
              createdAt: now,
            });
          else await u.workspaces.join(workspaceId, accountId, "editor", now);
        }
        await u.imports.insertBatch({
          requestedVisibility: "private",
          id: batchId,
          accountId,
          createdAt: now,
          useAi: false,
          cancelledAt: null,
        });
      });
      for (let number = start; number <= end; number++) {
        if (label === "app" && Math.floor((number - 1) / 6) !== index) continue;
        const noteId = base.idGenerator.next();
        const originalId = base.idGenerator.next();
        const jobId = base.idGenerator.next();
        const format =
          number === 14 ? "html" : number === 15 ? "markdown" : "text";
        const media =
          number === 14 || number === 15
            ? {
                assetId: base.idGenerator.next(),
                draftId: base.idGenerator.next(),
                entryId: base.idGenerator.next(),
                bytes: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
              }
            : null;
        const rawSrc = "media/fixture.png";
        const text =
          format === "html"
            ? `<h1>新見出し</h1><p>前<img src="${rawSrc}" alt="図">後</p>`
            : format === "markdown"
              ? `# 新見出し\n\n前 ![図](${rawSrc}) 後`
              : `slot${number} 日本語の原本`;
        const bytes =
          number === 17
            ? Uint8Array.from([0xff])
            : new TextEncoder().encode(text);
        const url = media
          ? assetUrl({
              scope: "notes",
              scopeId: noteId,
              assetId: media.assetId,
            })
          : undefined;
        const previousHtml = `<p>元の本文</p>${url ? `<img src="${url}" alt="既存">` : ""}`;
        const slot: StageSlot = {
          noteId,
          originalId,
          accountId,
          token,
          bytes,
          format,
          storageKey: originalId,
          ...(media && url
            ? {
                assetId: media.assetId,
                assetUrl: url,
                marker: `[[hollow-media:${media.entryId}]]`,
              }
            : {}),
        };
        slots.set(number, slot);
        await guardFiles(root);
        await writeFresh(path.join(objectsDirectory, originalId), bytes);
        if (media)
          await writeFresh(
            path.join(objectsDirectory, media.assetId),
            media.bytes,
          );
        await live.unitOfWorkProvider.run(async (u) => {
          await u.notes.insert(
            createNote(
              {
                id: noteId,
                accountId,
                ...(number === 7 && workspaceId
                  ? { owner: { kind: "workspace" as const, workspaceId } }
                  : {}),
                title: "保持する題名",
                html: previousHtml,
                text: "元の本文",
              },
              now,
            ),
          );
          await u.imports.insertOriginal({
            id: originalId,
            noteId,
            accountId,
            name: `slot-${number}.${format === "markdown" ? "md" : format === "text" ? "txt" : "html"}`,
            bytes: bytes.length,
            storageKey: originalId,
            sha256: sha256(bytes),
            format,
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
          if (media && url) {
            await u.assets.insertDraft({
              id: media.draftId,
              accountId,
              noteId,
              expiresAt: new Date(now.getTime() + 86400_000),
            });
            await u.assets.insert({
              id: media.assetId,
              accountId,
              draftId: media.draftId,
              storageKey: media.assetId,
              bytes: media.bytes.length,
              sha256: sha256(media.bytes),
              mime: "image/png",
              kind: "image",
              createdAt: now,
              unreferencedAt: null,
              committedToNote: true,
              state: "ready",
            });
            await u.assets.replaceCurrentReferences(
              noteId,
              [media.assetId],
              now,
            );
            await u.references.saveEntry({
              id: media.entryId,
              noteId,
              kind: "image",
              url: rawSrc,
              location: "img:src",
              current: true,
              state: "acquired",
              reason: null,
              assetId: media.assetId,
              finalUrl: url,
              bytes: media.bytes.length,
              createdAt: now,
              updatedAt: now,
            });
          }
        });
        await guardFiles(root);
      }
    }
    let closed = false;
    async function guard() {
      await guardFiles(root);
      if (
        workerStarts > 6 ||
        activeWorkers > 1 ||
        slots.size !== end - start + 1
      )
        fail("RESOURCE_COUNTS");
      if (!closed) {
        const count = async (
          table: "accounts" | "notes" | "originals" | "workspaces",
        ) => {
          const result = await client.execute(
            `SELECT count(*) AS n FROM ${table}`,
          );
          return Number(result.rows[0]?.["n"]);
        };
        if (
          (await count("accounts")) > accounts ||
          (await count("notes")) > slots.size ||
          (await count("originals")) > slots.size ||
          (await count("workspaces")) > (label === "app" ? 1 : 0)
        )
          fail("DATABASE_SEED_COUNTS");
      }
    }
    const fixture: StageFixture = {
      get container() {
        return current;
      },
      set container(value) {
        current = value;
      },
      get now() {
        return new Date(now);
      },
      set now(value) {
        now = new Date(value);
      },
      db,
      client,
      stage,
      memory,
      execution,
      ownership,
      storage,
      preparer,
      slots,
      root,
      databaseFile,
      objectsDirectory,
      generatedInputs,
      workerStartsByOriginal,
      get generateCalls() {
        return generateCalls;
      },
      get workerStarts() {
        return workerStarts;
      },
      get activeWorkers() {
        return activeWorkers;
      },
      get workerClosureUnknown() {
        return workerClosureUnknown;
      },
      advanceMonth() {
        const next = new Date(now);
        next.setUTCDate(1);
        next.setUTCMonth(next.getUTCMonth() + 1);
        const lastDay = new Date(
          Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
        ).getUTCDate();
        next.setUTCDate(Math.min(now.getUTCDate(), lastDay));
        now = next;
      },
      guard,
      async request(number) {
        if (closed) fail("CLIENT_CLOSED");
        await guard();
        const slot = slots.get(number);
        if (!slot) fail("SLOT_NOT_ALLOCATED");
        const state = await live.unitOfWorkProvider.run(async (u) => ({
          note: await u.notes.findById(slot.noteId),
          connection: await u.openRouterConnections.find(slot.accountId),
        }));
        if (
          !state.note ||
          !state.connection ||
          state.connection.state !== "linked"
        )
          fail("REQUEST_STATE");
        try {
          return await requestLlmRegeneration(live, slot.token, {
            noteId: slot.noteId,
            noteVersion: state.note.version,
            commandId: live.idGenerator.next(),
            expectedEpoch: state.connection.epoch,
            modelId: "fixture/text",
            instruction: "見出しを整理",
            confirmed: true,
          });
        } finally {
          await guard();
        }
      },
      async finish(jobId) {
        if (closed) fail("CLIENT_CLOSED");
        await guard();
        let value: LlmConversion | null = null;
        await vi.waitFor(
          async () => {
            value = await live.unitOfWorkProvider.run((u) =>
              u.llmConversions.find(jobId),
            );
            expect(value?.phase).toBe("terminal");
            expect(execution.active(jobId)).toBe(false);
          },
          { timeout: 40_000, interval: 25 },
        );
        await guard();
        if (!value) fail("RESULT_MISSING");
        return value;
      },
      async close() {
        if (closed) return;
        await execution.stop();
        await stage.stop();
        if (activeWorkers !== 0 || workerClosureUnknown)
          fail("WORKER_CLOSURE_UNKNOWN");
        await guard();
        const enabled = await client.execute("PRAGMA foreign_keys");
        if (Number(enabled.rows[0]?.["foreign_keys"]) !== 1)
          fail("FOREIGN_KEYS_DISABLED");
        const writers = await client.execute(
          "SELECT count(*) AS n FROM object_writes WHERE active=1",
        );
        if (Number(writers.rows[0]?.["n"]) !== 0) fail("ACTIVE_OBJECT_WRITERS");
        const foreignKeys = await client.execute("PRAGMA foreign_key_check");
        if (foreignKeys.rows.length !== 0) fail("FOREIGN_KEYS");
        const checkpoint = await client.execute(
          "PRAGMA wal_checkpoint(TRUNCATE)",
        );
        if (Number(checkpoint.rows[0]?.["busy"]) !== 0) fail("CHECKPOINT_BUSY");
        client.close();
        if (!client.closed) fail("CLIENT_CLOSURE_UNKNOWN");
        closed = true;
        await guardFiles(root);
      },
    };
    await guard();
    return fixture;
  } catch (error) {
    try {
      client.close();
    } catch (closureError) {
      throw new AggregateError(
        [error, closureError],
        "S3_FIXTURE_INITIALIZATION_CLIENT_CLOSURE_UNKNOWN",
      );
    }
    if (!client.closed)
      throw new AggregateError(
        [error],
        "S3_FIXTURE_INITIALIZATION_CLIENT_CLOSURE_UNKNOWN",
      );
    throw error;
  }
}
