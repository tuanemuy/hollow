import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, open, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectNote } from "@repo/core/adapters/node/browse/projection";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  createNodeMachine,
  createNodeRegeneration,
} from "@repo/core/adapters/node/regeneration/config";
import type { NoteProjectionPort } from "@repo/core/application/browse/ports";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { currentMachine } from "@repo/core/application/regeneration/current";
import type { MachineRuntimeOwnership } from "@repo/core/application/regeneration/services";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { createNote } from "@repo/core/domain/note/entity";
import type { MachineRegeneration } from "@repo/core/domain/regeneration/entity";
import { machineHeld } from "@repo/core/domain/regeneration/machine";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";

const token = "machine-fixture-session";
export const now = new Date("2026-10-06T00:00:00Z");
export async function machineFixture(native: boolean, finalFence = false) {
  const requested = process.env["HOLLOW_REGENERATION_TEST_ROOT"];
  if (
    !requested ||
    !path.isAbsolute(requested) ||
    (await realpath(requested)) !== requested
  )
    throw Error("S5_ROOT_BINDING");
  const root = await mkdtemp(
    path.join(
      requested,
      native
        ? "machine-native-"
        : finalFence
          ? "machine-fence-"
          : "machine-app-",
    ),
  );
  const objects = path.join(root, "objects");
  await Promise.all(
    ["objects", "records", "tmp"].map((name) =>
      mkdir(path.join(root, name), { mode: 0o700 }),
    ),
  );

  const directory = await lstat(objects);
  if (
    !directory.isDirectory() ||
    directory.isSymbolicLink() ||
    (directory.mode & 0o777) !== 0o700
  )
    throw Error("S5_OBJECTS_BINDING");
  const dbfile = path.join(root, native ? "native.db" : "app.db");
  const fd = await open(dbfile, "wx", 0o600);
  await fd.sync();
  await fd.close();
  let client = createLibsqlClient({ url: `file:${dbfile}` });
  let failed = false;
  let closed = false;
  try {
    await applyPragmas(client);
    const db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: fileURLToPath(
        new URL("../migrations", import.meta.url),
      ),
    });
    await client.execute("PRAGMA max_page_count=8192");
    await client.execute("PRAGMA journal_size_limit=8388608");
    const clock = { value: now };
    const base = {
      ...createHollowContainer(db, "http://machine.fixture.invalid", {
        send: async () => {},
      }),
      clock: { now: () => clock.value },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    };
    const storage = new CoordinatedObjectStorage(
      objects,
      base.unitOfWorkProvider,
      base.clock,
    );
    await storage.recoverOwners();
    const worker = (name: string) =>
      fileURLToPath(new URL(`../../node/llm/${name}`, import.meta.url));
    const shared = await createNodeRegeneration(base, {
      storage,
      directory: objects,
      workerPath: worker("sourceWorker.mjs"),
      documentWorkerPath: worker("documentWorker.mjs"),
      imageChildPath: worker("imageChild.mjs"),
      pdfPagesChildPath: worker("pdfPagesChild.mjs"),
      ...(native
        ? {}
        : {
            extractor: {
              extract: async ({ bytes }: { bytes: Uint8Array }) => ({
                html: new TextDecoder().decode(bytes),
                coverage: "complete" as const,
                notices: [],
              }),
            },
          }),
    });
    const input = shared.input;
    const machine = createNodeMachine(shared, () => {});
    const faults = { finishReply: false, sanitize: false };
    const provider = {
      async run<T>(
        work: (u: HollowUnitOfWorkContext) => Promise<T>,
      ): Promise<T> {
        let changed = false;
        const result = await base.unitOfWorkProvider.run((u) =>
          work({
            ...u,
            machineRegenerations: {
              insert: (v) => u.machineRegenerations.insert(v),
              find: (id) => u.machineRegenerations.find(id),
              command: (id, cmd) => u.machineRegenerations.command(id, cmd),
              remove: (id) => u.machineRegenerations.remove(id),
              candidate: () => u.machineRegenerations.candidate(),
              claimExact: (v, n, t) =>
                u.machineRegenerations.claimExact(v, n, t),
              activeForNote: (id) => u.machineRegenerations.activeForNote(id),
              owned: (id) => u.machineRegenerations.owned(id),
              page: (id, after) => u.machineRegenerations.page(id, after),
              finishJob: (v, t) => u.machineRegenerations.finishJob(v, t),
              prune: (t, n) => u.machineRegenerations.prune(t, n),
              async replace(v, n) {
                const saved = await u.machineRegenerations.replace(v, n);
                if (
                  saved &&
                  v.inputReceipt?.state === "closed" &&
                  v.sourceMemoryBytes === 0 &&
                  v.phase !== "terminal"
                )
                  changed = true;
                return saved;
              },
            },
          }),
        );
        if (changed && faults.finishReply) {
          faults.finishReply = false;
          throw new SystemError(
            SystemErrorCode.DatabaseError,
            "S5_FINISH_RESPONSE_UNKNOWN",
          );
        }
        return result;
      },
    };
    let projectionGate: {
      enter(): void;
      resume: Promise<void>;
    } | null = null;
    const projection: NoteProjectionPort = {
      async project(value) {
        const gate = projectionGate;
        if (gate) {
          projectionGate = null;
          gate.enter();
          await gate.resume;
        }
        return projectNote(value);
      },
    };
    let c: HollowContainer = {
      ...base,
      unitOfWorkProvider: provider,
      machine,
      ...(finalFence
        ? {
            browsing: {
              projection,
              execution: {
                execute: async () => {
                  throw Error("S5_SEARCH_UNUSED");
                },
                stop: async () => {},
              },
            },
          }
        : {}),
      htmlSanitizer: {
        sanitize: (html) => {
          if (faults.sanitize)
            throw new BusinessRuleError(
              "S5_SANITIZE_FAILURE",
              "Safety preparation failed",
            );
          return base.htmlSanitizer.sanitize(html);
        },
        assetUrls: (html) => base.htmlSanitizer.assetUrls(html),
        rewriteAssets: (html, urls) =>
          base.htmlSanitizer.rewriteAssets(html, urls),
        render: (html, assets, external) =>
          base.htmlSanitizer.render(html, assets, external),
      },
      importing: {
        storage,
        extractor: shared.extractor,
        detectFormat: async () => "html",
        mediaValidator: { validate: async () => {} },
        wake: () => {},
      },
    };
    const accountId = c.idGenerator.next();
    const batchId = c.idGenerator.next();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(accountId, "machine@fixture.invalid", "synthetic", now),
          now,
        ),
      );
      await u.accounts.saveSession({
        accountId,
        tokenHash: c.tokens.hash(token),
        expiresAt: new Date("2040-01-01T00:00:00Z"),
      });
      await u.imports.insertBatch({
        id: batchId,
        accountId,
        createdAt: now,
        useAi: false,
        cancelledAt: null,
      });
    });
    return {
      get c() {
        return c;
      },
      input,
      sourceServices: { input, local: shared.local },
      token,
      get client() {
        return client;
      },
      accountId,
      root,
      faults,
      setNow: (value: Date) => {
        clock.value = value;
      },
      pauseProjection() {
        if (!finalFence || projectionGate) throw Error("S5_PROJECTION_GATE");
        let enter!: () => void;
        let release!: () => void;
        const entered = new Promise<void>((resolve) => {
          enter = resolve;
        });
        const resume = new Promise<void>((resolve) => {
          release = resolve;
        });
        projectionGate = { enter, resume };
        return { entered, release };
      },
      async fenceWorkspace() {
        const ownerId = c.idGenerator.next();
        const workspaceId = c.idGenerator.next();
        const ownerToken = "machine-fixture-owner-session";
        await c.unitOfWorkProvider.run(async (u) => {
          await u.accounts.save(
            verifyAccount(
              createAccount(ownerId, "owner@fixture.invalid", "synthetic", now),
              now,
            ),
          );
          await u.accounts.saveSession({
            accountId: ownerId,
            tokenHash: c.tokens.hash(ownerToken),
            expiresAt: new Date("2040-01-01T00:00:00Z"),
          });
          await u.workspaces.create({
            id: workspaceId,
            creatorId: ownerId,
            name: "Fence workspace",
            description: "",
            slug: null,
            createdAt: now,
            state: "active",
          });
          await u.workspaces.join(workspaceId, ownerId, "owner", now);
          await u.workspaces.join(workspaceId, accountId, "editor", now);
        });
        return { workspaceId, ownerToken };
      },
      async seed(
        format: "html" | "markdown",
        text: string,
        workspaceId?: string,
      ) {
        const noteId = c.idGenerator.next();
        const originalId = c.idGenerator.next();
        const jobId = c.idGenerator.next();
        const bytes = Buffer.from(text);
        const file = await open(path.join(objects, originalId), "wx", 0o600);
        await file.writeFile(bytes);
        await file.sync();
        await file.close();
        await c.unitOfWorkProvider.run(async (u) => {
          await u.notes.insert(
            createNote(
              {
                id: noteId,
                accountId,
                ...(workspaceId
                  ? { owner: { kind: "workspace" as const, workspaceId } }
                  : {}),
                title: "kept title",
                html: "<p>previous body</p>",
                text: "previous body",
              },
              now,
            ),
          );
          await u.imports.insertOriginal({
            id: originalId,
            noteId,
            accountId,
            name: `input.${format}`,
            bytes: bytes.length,
            storageKey: originalId,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            format,
            state: "ready",
            coverage: "complete",
            activeJobId: jobId,
            createdAt: now,
          });
          await u.jobs.insert({
            id: jobId,
            batchId,
            originalId,
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
        return noteId;
      },
      async claimUnused(id: string) {
        const value = await c.unitOfWorkProvider.run((u) =>
          u.machineRegenerations.find(id),
        );
        if (!value || value.phase !== "queued")
          throw Error("S5_UNUSED_CANDIDATE");
        const consumer = { kind: "machine-regeneration" as const, id };
        const admission = input.reserveBegin(consumer);
        const owner = {
          state: "active" as const,
          runtimeId: machine.ownership.runtimeId,
          token: c.idGenerator.next(),
        };
        const receipt = {
          consumer,
          runtimeId: owner.runtimeId,
          token: owner.token,
          generation: (value.inputReceipt?.generation ?? 0) + 1,
          state: "active" as const,
        };
        input.bindBegin(admission, receipt);
        const claimed: MachineRegeneration = {
          ...value,
          phase: "acquiring" as const,
          owner,
          inputReceipt: receipt,
          sourceMemoryBytes: SOURCE_MEMORY_BYTES,
          version: value.version + 1,
          updatedAt: c.clock.now(),
        };
        const result = await input.claimTransaction(
          admission,
          c.unitOfWorkProvider,
          async (u) => {
            await currentMachine(c, u, value);
            if (
              !(await u.machineRegenerations.claimExact(
                claimed,
                value.version,
                c.clock.now(),
              ))
            )
              return { kind: "no-claim" };
            return { kind: "claimed", value: claimed };
          },
        );
        if (result.result.kind !== "claimed" || !result.lease)
          throw Error("S5_UNUSED_CLAIM");
        return { value: result.result.value, lease: result.lease };
      },
      async suspendDatabase() {
        await machine.execution.stop();
        await base.passwordHasher.stop();
        if (input.activeInputs() !== 0) throw Error("S5_SUSPEND_INPUT_HELD");
        const check = await client.execute(
          "PRAGMA main.wal_checkpoint(TRUNCATE)",
        );
        if (
          JSON.stringify(check.columns) !==
            JSON.stringify(["busy", "log", "checkpointed"]) ||
          check.rows.length !== 1 ||
          check.rows[0]?.length !== 3 ||
          ![0, 1, 2].every(
            (i) =>
              typeof check.rows[0]?.[i] === "number" &&
              Number.isSafeInteger(check.rows[0]?.[i]) &&
              check.rows[0]?.[i] === 0,
          )
        )
          throw Error("S5_SUSPEND_CHECKPOINT");
        client.close();
        if (!client.closed) throw Error("S5_SUSPEND_CLOSE");
      },
      async resumeDatabase(ownership: MachineRuntimeOwnership) {
        if (!client.closed) throw Error("S5_RESUME_CLIENT_ACTIVE");
        client = createLibsqlClient({ url: `file:${dbfile}` });
        await applyPragmas(client);
        const resumed = createHollowContainer(
          getDatabase(client),
          "http://machine.fixture.invalid",
          { send: async () => {} },
        );
        c = {
          ...c,
          unitOfWorkProvider: resumed.unitOfWorkProvider,
          machine: { ...machine, ownership },
        };
        return c;
      },
      async settled(id: string) {
        for (let i = 0; i < 3200; i++) {
          const row = await c.unitOfWorkProvider.run((u) =>
            u.machineRegenerations.find(id),
          );
          if (row && !machineHeld(row) && !machine.execution.active(id))
            return row;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        failed = true;
        throw Error("S5_TERMINAL_MISSING");
      },
      fail() {
        failed = true;
      },
      async close() {
        try {
          await machine.execution.stop();
          await base.passwordHasher.stop();
          if (input.activeInputs() !== 0) throw Error("S5_INPUT_HELD");
          const fk = await client.execute("PRAGMA foreign_key_check");
          const integrity = await client.execute("PRAGMA integrity_check");
          if (
            fk.rows.length ||
            integrity.rows.length !== 1 ||
            integrity.rows[0]?.[0] !== "ok"
          )
            throw Error("S5_DB_INTEGRITY");
          if (!failed) {
            const check = await client.execute(
              "PRAGMA main.wal_checkpoint(TRUNCATE)",
            );
            if (
              JSON.stringify(check.columns) !==
                JSON.stringify(["busy", "log", "checkpointed"]) ||
              check.rows.length !== 1 ||
              check.rows[0]?.length !== 3 ||
              ![0, 1, 2].every((index) => {
                const n = check.rows[0]?.[index];
                return (
                  typeof n === "number" && Number.isSafeInteger(n) && n === 0
                );
              })
            )
              throw Error("S5_CHECKPOINT");
          }
        } finally {
          client.close();
          closed = client.closed;
        }
        if (!closed) throw Error("S5_CLIENT_CLOSE");
        if (!failed) await rm(root, { recursive: true });
      },
    };
  } catch (error) {
    client.close();
    throw error;
  }
}
