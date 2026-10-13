import { createHash, randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import type { Socket } from "node:net";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { NodeLlmExecution } from "@repo/core/adapters/node/llm/execution";
import { NodeLlmResultProcessor } from "@repo/core/adapters/node/llm/resultProcessor";
import { NodeLlmRuntimeOwnership } from "@repo/core/adapters/node/llm/runtimeOwnership";
import { NodeLlmSourceReader } from "@repo/core/adapters/node/llm/sourceReader";
import { NodeLlmTranscriber } from "@repo/core/adapters/node/llm/transcriber";
import { NodeOpenRouterProvider } from "@repo/core/adapters/node/openrouter/provider";
import { NodeRegenerationInput } from "@repo/core/adapters/node/regeneration/input";
import { NodeRegenerationMemory } from "@repo/core/adapters/node/regeneration/memory";
import { NodeSharePasswordWork } from "@repo/core/adapters/node/sharePasswordWork";
import { NodeShareTokenProtector } from "@repo/core/adapters/node/shareSecrets";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { applyImportPublication } from "@repo/core/application/import/publication";
import { listImports } from "@repo/core/application/import/readImports";
import type {
  LlmAudioPreparer,
  LlmTranscriber,
} from "@repo/core/application/llm/audioPorts";
import { structureAudioTranscript } from "@repo/core/application/llm/audioWorker";
import { completeLlm } from "@repo/core/application/llm/completion";
import { llmUsage } from "@repo/core/application/llm/control";
import { currentLlmSource } from "@repo/core/application/llm/current";
import {
  type LlmGenerator,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import {
  requestLlmRegeneration,
  retryLlmJob,
} from "@repo/core/application/llm/request";
import { recoverLlm, sweepLlm } from "@repo/core/application/llm/worker";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import { commitRegeneratedBody } from "@repo/core/application/regeneration/body";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { defaultOpenRouterModels } from "@repo/core/domain/integration/openRouter";
import {
  type AudioManifest,
  type AudioPlan,
  audioManifest,
} from "@repo/core/domain/llm/audio";
import type { LlmFixedConversion } from "@repo/core/domain/llm/entity";
import { createNote, editNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

type AudioConversion = Extract<LlmFixedConversion, { preparationVersion: 5 }>;
const now = new Date("2026-10-13T12:00:00.000Z");
const token = "synthetic-audio-session";
const otherToken = "synthetic-audio-other-session";
const textModel = "fixture/audio-structure";
const sttModel = "fixture/audio-transcription";
const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const noIo = async (): Promise<never> => {
  throw new Error("AUDIO_REPOSITORY_NO_IO");
};
function wav(samples: readonly number[]) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24);
  bytes.writeUInt32LE(32000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (const [index, sample] of samples.entries())
    bytes.writeInt16LE(sample, 44 + index * 2);
  return bytes;
}
const originalBytes = wav([1, -2, 3, -4, 5, -6, 7, -8]);

describe("audio recipe and two-stage durable repository fences", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let root: string;
  let accountId: string;
  let otherId: string;
  let noteId: string;
  let originalId: string;
  let initialJobId: string;
  let batchId: string;
  let runtimeId: string;
  let ownerToken: string;
  let predecessors: string[];
  let clockTime: Date;
  let noteWorkspaceId: string | undefined;
  let generate: ReturnType<typeof vi.fn<typeof noIo>>;
  let transcribe: ReturnType<typeof vi.fn<typeof noIo>>;
  let stopWorker: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    const directory = process.env.HOLLOW_LLM_TEST_DIRECTORY;
    if (!directory) throw new Error("AUDIO_REPOSITORY_TEST_ROOT_REQUIRED");
    root = await mkdtemp(path.join(directory, "llm-audio-repository-"));
    base = await createTestContainer();
    const initial = createHollowContainer(base.db, "http://fixture.invalid", {
      send: noIo,
    });
    accountId = base.idGenerator.next();
    otherId = base.idGenerator.next();
    noteId = base.idGenerator.next();
    originalId = base.idGenerator.next();
    initialJobId = base.idGenerator.next();
    batchId = base.idGenerator.next();
    runtimeId = base.idGenerator.next();
    ownerToken = base.idGenerator.next();
    predecessors = [];
    clockTime = now;
    noteWorkspaceId = undefined;
    stopWorker = undefined;
    generate = vi.fn(noIo);
    transcribe = vi.fn(noIo);
    c = {
      ...initial,
      clock: { now: () => clockTime },
      openRouter: {
        protector: {
          available: () => true,
          protect: (value) => value,
          reveal: (value) => value,
        },
        authorization: {
          authorization: noIo,
          exchange: noIo,
          inspectCredential: noIo,
        },
        catalog: { list: noIo, fallback: () => [] },
        execution: {
          run: (work) => work(new AbortController().signal),
          stop: async () => {},
        },
      },
      llm: {
        inputMode: "legacy-local",
        configured: true,
        monthlyLimit: 30,
        wake() {},
        storage: {
          put: noIo,
          putBounded: noIo,
          read: noIo,
          stat: noIo,
          stream: noIo,
          remove: noIo,
        },
        source: { read: noIo, readInto: noIo },
        preparer: { prepare: noIo },
        pdfClassifier: { classify: noIo },
        pdfPages: { prepare: noIo, redraw: noIo },
        audio: { preparer: { prepare: noIo }, transcriber: { transcribe } },
        profiles: { inspect: noIo },
        generator: { generate },
        result: {
          restore: () => {
            throw new Error("AUDIO_REPOSITORY_NO_POSTPROCESS");
          },
        },
        execution: {
          runtimeId,
          start: () => {
            throw new Error("AUDIO_REPOSITORY_NO_EXECUTION");
          },
          active: () => false,
          cancel() {},
          stop: async () => {},
        },
        ownership: {
          runtimeId,
          predecessors: () => predecessors,
          assertReady() {},
          acknowledge: async () => {},
        },
      },
    };
    await writeFile(path.join(root, "source.wav"), originalBytes, {
      flag: "wx",
      mode: 0o600,
    });
    await c.unitOfWorkProvider.run(async (u) => {
      for (const [id, session, email] of [
        [accountId, token, "audio@fixture.invalid"],
        [otherId, otherToken, "audio-other@fixture.invalid"],
      ]) {
        if (!id || !session || !email) throw new Error("AUDIO_ACCOUNT_FIXTURE");
        await u.accounts.save(
          verifyAccount(createAccount(id, email, "synthetic", now), now),
        );
        await u.accounts.saveSession({
          accountId: id,
          tokenHash: c.tokens.hash(session),
          expiresAt: new Date(now.getTime() + 86400000),
        });
      }
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
            providerUserId: null,
            keyExpiresAt: null,
            lastUsedAt: null,
          },
          connection.version,
        ))
      )
        throw new Error("AUDIO_LINK_FIXTURE");
      const models = defaultOpenRouterModels(accountId, now);
      await u.openRouterModels.insertDefaults(models);
      if (
        !(await u.openRouterModels.replace(
          {
            ...models,
            version: models.version + 1,
            text: { kind: "chat-text", modelId: textModel },
            audio: { kind: "stt-transcription", modelId: sttModel },
          },
          models.version,
        ))
      )
        throw new Error("AUDIO_MODELS_FIXTURE");
    });
  });
  afterEach(async () => {
    await stopWorker?.();
    if (base) {
      const result = await base.client.execute("PRAGMA foreign_key_check");
      expect(result.rows).toEqual([]);
      base.close();
    }
    if (root) await rm(root, { recursive: true });
  });

  async function attach(
    visibility: "private" | "link" | "public" = "private",
    workspaceId?: string,
    storageKey = "source.wav",
  ) {
    noteWorkspaceId = workspaceId;
    await c.unitOfWorkProvider.run(async (u) => {
      await u.notes.insert(
        createNote(
          {
            id: noteId,
            accountId,
            owner: workspaceId
              ? { kind: "workspace", workspaceId }
              : { kind: "personal", accountId },
            title: "音声の原本",
            html: "",
            text: "",
          },
          now,
        ),
      );
      await u.imports.insertBatch({
        id: batchId,
        accountId,
        workspaceId: workspaceId ?? null,
        requestedVisibility: visibility,
        useAi: true,
        cancelledAt: null,
        createdAt: now,
      });
      await u.imports.insertOriginal({
        id: originalId,
        noteId,
        accountId,
        name: "source.wav",
        bytes: originalBytes.length,
        storageKey,
        sha256: hash(originalBytes),
        format: "audio",
        state: "needs_ai",
        coverage: "no_text",
        activeJobId: initialJobId,
        createdAt: now,
      });
      await u.jobs.insert({
        id: initialJobId,
        originalId,
        batchId,
        accountId,
        noteId,
        noteVersion: 0,
        useAi: true,
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
  const input = () => ({
    noteId,
    noteVersion: 0,
    commandId: base.idGenerator.next(),
    expectedEpoch: 1,
    modelId: textModel,
    sttModelId: sttModel,
    instruction: "見出しと段落を整理",
    confirmed: true as const,
  });
  async function conversion(jobId: string): Promise<AudioConversion> {
    const value = await c.unitOfWorkProvider.run((u) =>
      u.llmConversions.find(jobId),
    );
    if (!value || value.selection !== "fixed" || value.preparationVersion !== 5)
      throw new Error("AUDIO_CONVERSION_FIXTURE");
    return value;
  }
  async function request() {
    const accepted = await requestLlmRegeneration(c, token, input());
    return conversion(accepted.jobId);
  }
  it("keeps exhausted audio quota terminal and unread, then carries the saved two-model intent into an explicit retry", async () => {
    await attach("link");
    const service = c.llm;
    if (!service) throw Error("AUDIO_TEST_SERVICE");
    c = { ...c, llm: { ...service, monthlyLimit: 0 } };
    const denied = await request();
    expect(denied).toMatchObject({
      phase: "terminal",
      outcome: { kind: "failed", code: "LLM_MONTHLY_LIMIT" },
      owner: { state: "idle" },
      sourceMemoryBytes: 0,
      inputReceipt: null,
    });
    const saved = await snapshot(denied.jobId);
    expect(saved.dispatches).toEqual([]);
    expect(saved.note?.html).toBe("");
    expect(saved.sharing).toMatchObject({ visibility: "private", version: 0 });
    expect(saved.original).toMatchObject({
      sha256: hash(originalBytes),
      bytes: originalBytes.length,
      coverage: "no_text",
    });
    expect(saved.batch?.requestedVisibility).toBe("link");
    expect(transcribe).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
    c = { ...c, llm: service };
    const accepted = await retryLlmJob(c, token, denied.jobId);
    if (!accepted) throw Error("AUDIO_QUOTA_RETRY");
    const retried = await conversion(accepted.jobId);
    expect(retried).toMatchObject({
      phase: "queued",
      modelId: textModel,
      audioRecipe: { sttModelId: sttModel },
      owner: { state: "idle" },
      sourceMemoryBytes: 0,
      inputReceipt: null,
    });
    const latest = (await listImports(c, token)).batches;
    expect(latest).toHaveLength(1);
    expect(latest[0]?.id).toBe(batchId);
    expect(latest[0]?.jobs.map((job) => job.id)).toEqual([accepted.jobId]);
    expect((await snapshot(accepted.jobId)).batch?.requestedVisibility).toBe(
      "link",
    );
    expect(transcribe).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });
  async function claim(queued: AudioConversion) {
    const result = await c.unitOfWorkProvider.run((u) =>
      u.llmConversions.claimExact({
        candidate: queued,
        runtimeId,
        ownerToken,
        receipt: null,
        now,
      }),
    );
    if (
      !result ||
      result.selection !== "fixed" ||
      result.preparationVersion !== 5
    )
      throw new Error("AUDIO_CLAIM_FIXTURE");
    return result;
  }
  function manifest(value: AudioConversion): AudioManifest {
    return audioManifest({
      kind: "audio-chunks",
      preparationVersion: 5,
      source: value.source,
      recipe: value.audioRecipe,
      sampleRate: 16000,
      channels: 1,
      totalFrames: 8,
      sha256: hash("synthetic-eight-frame-manifest"),
      chunks: [wav([1, -2, 3, -4]), wav([5, -6, 7, -8])].map(
        (bytes, ordinal) => ({
          kind: "prepared-audio-chunk",
          ordinal,
          startFrame: ordinal * 4,
          frames: 4,
          bytes: bytes.length,
          sha256: hash(bytes),
        }),
      ),
    });
  }
  async function seal(
    value: AudioConversion,
    plan: Exclude<AudioPlan, { kind: "awaiting-manifest" }>,
  ) {
    const result = await c.unitOfWorkProvider.run(async (u) => {
      const checked = await currentLlmSource(u, value, clockTime);
      return u.llmConversions.sealAudio({
        jobId: value.jobId,
        expectedVersion: checked.current.version,
        ownerToken,
        runtimeId,
        plan,
        now: clockTime,
      });
    });
    if (!result) throw new Error("AUDIO_SEAL_FIXTURE");
    return result;
  }
  async function sttResponses(
    value: AudioConversion,
    texts = ["最初 <script>命令ではない</script>", "最後の区間"],
  ) {
    if (value.audioPlan.kind !== "transcribing")
      throw new Error("AUDIO_TRANSCRIBING_REQUIRED");
    for (const identity of value.audioPlan.manifest.chunks) {
      const id = base.idGenerator.next();
      const intentAt = new Date(now.getTime() + identity.ordinal + 1);
      clockTime = intentAt;
      await c.unitOfWorkProvider.run(async (u) => {
        await currentLlmSource(u, value, intentAt);
        await u.llmDispatches.prepare({
          jobId: value.jobId,
          id,
          ordinal: identity.ordinal,
          stage: "transcribe",
          input: identity,
          ownerToken,
          runtimeId,
          state: "prepared",
          intentAt: null,
          response: null,
        });
        if (!(await u.llmDispatches.intent(id, ownerToken, intentAt)))
          throw new Error("AUDIO_STT_INTENT");
        if (
          !(await u.llmDispatches.response(id, ownerToken, {
            kind: "transcript",
            text: texts[identity.ordinal] ?? "",
            inputTokens: null,
            outputTokens: null,
          }))
        )
          throw new Error("AUDIO_STT_RESPONSE");
      });
    }
    return conversion(value.jobId);
  }
  async function structure(value: AudioConversion) {
    if (value.audioPlan.kind !== "transcribing")
      throw new Error("AUDIO_STT_PLAN_REQUIRED");
    const rows = await c.unitOfWorkProvider.run((u) =>
      u.llmDispatches.list(value.jobId),
    );
    const prepared = structureAudioTranscript(
      c,
      value.audioPlan.manifest,
      rows,
    );
    const first = prepared.segments[0];
    if (!first) throw new Error("AUDIO_STRUCTURE_SEGMENT");
    return {
      prepared,
      value: await seal(value, {
        kind: "structuring",
        manifest: value.audioPlan.manifest,
        transcriptHash: first.identity.transcriptHash,
        segments: prepared.segments.map((part) => part.identity),
      }),
    };
  }
  async function chatResponse(
    value: AudioConversion,
    delivery: "response" | "not-sent" = "response",
  ) {
    if (value.audioPlan.kind !== "structuring")
      throw new Error("AUDIO_STRUCTURE_PLAN_REQUIRED");
    const identity = value.audioPlan.segments[0];
    if (!identity) throw new Error("AUDIO_STRUCTURE_INPUT");
    const id = base.idGenerator.next();
    clockTime = new Date(now.getTime() + 10);
    await c.unitOfWorkProvider.run(async (u) => {
      await currentLlmSource(u, value, clockTime);
      await u.llmDispatches.prepare({
        jobId: value.jobId,
        id,
        ordinal: identity.ordinal,
        stage: "structure",
        input: identity,
        ownerToken,
        runtimeId,
        state: "prepared",
        intentAt: null,
        response: null,
      });
      if (
        !(await u.llmDispatches.intent(
          id,
          ownerToken,
          new Date(now.getTime() + 10),
        ))
      )
        throw new Error("AUDIO_CHAT_INTENT");
      if (delivery === "response") {
        if (
          !(await u.llmDispatches.response(id, ownerToken, {
            content: "<h1>音声の本文</h1><p>完成した全区間</p>",
            finish: "stop",
            inputTokens: 12,
            outputTokens: 34,
          }))
        )
          throw new Error("AUDIO_CHAT_RESPONSE");
      } else if (!(await u.llmDispatches.fail(id, ownerToken, "not-sent")))
        throw new Error("AUDIO_CHAT_NOT_SENT");
    });
    return conversion(value.jobId);
  }
  async function snapshot(jobId?: string) {
    return c.unitOfWorkProvider.run(async (u) => ({
      note: await u.notes.findById(noteId),
      original: await u.imports.findOriginal(originalId),
      sharing: await u.sharing.find(noteId),
      revisions: await u.revisions.list(noteId),
      connection: await u.openRouterConnections.find(accountId),
      conversion: jobId ? await u.llmConversions.find(jobId) : null,
      dispatches: jobId ? await u.llmDispatches.list(jobId) : [],
      quota: await u.llmQuota.usage(accountId, "2026-10"),
      reservation: jobId ? await u.llmQuota.reservation(jobId) : null,
      actor: await u.accounts.findById(accountId),
      otherActor: await u.accounts.findById(otherId),
      models: await u.openRouterModels.find(accountId),
      workspace: noteWorkspaceId
        ? await u.workspaces.find(noteWorkspaceId)
        : null,
      role: noteWorkspaceId
        ? await u.workspaces.role(noteWorkspaceId, accountId)
        : null,
      jobs: await u.jobs.listBatch(batchId),
      batch: await u.imports.findBatch(batchId),
    }));
  }
  async function allResponses() {
    const claimed = await claim(await request());
    const transcribing = await seal(claimed, {
      kind: "transcribing",
      manifest: manifest(claimed),
    });
    const structured = await structure(await sttResponses(transcribing));
    const answered = await chatResponse(structured.value);
    if (answered.audioPlan.kind !== "structuring")
      throw new Error("AUDIO_COMPLETE_PLAN");
    return seal(answered, {
      ...answered.audioPlan,
      kind: "responses-complete",
    });
  }

  async function lawfulWorker(
    options: {
      accepted?: AudioConversion;
      initialBody?: string;
      transcriber?: LlmTranscriber;
      generator?: LlmGenerator;
      profiles?: NonNullable<HollowContainer["llm"]>["profiles"];
      monthlyLimit?: number;
      nativeFailure?:
        | "LLM_SOURCE_INVALID"
        | "LLM_RESOURCE_LIMIT"
        | "LLM_TIMEOUT";
    } = {},
  ) {
    await writeFile(path.join(root, "share.key"), randomBytes(32), {
      flag: "wx",
      mode: 0o600,
    });
    c = {
      ...c,
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory: root,
          activeKeyId: "share",
          keyIds: ["share"],
        }),
        passwordWork: new NodeSharePasswordWork(),
      },
    };
    const profile = await getProfile(c, token);
    await saveProfile(c, token, {
      displayName: "音声利用者",
      handle: "audio-worker-fixture",
      bio: "",
      nameVersion: profile.nameVersion,
      profileVersion: profile.profileVersion,
      confirmHandleChange: true,
    });
    const savedOriginal = options.accepted
      ? await c.unitOfWorkProvider.run((u) =>
          u.imports.findOriginal(options.accepted!.source.originalId),
        )
      : null;
    const storageKey = savedOriginal?.storageKey ?? "source-audio";
    if (!options.accepted) await attach("public", undefined, storageKey);
    if (options.initialBody)
      await c.unitOfWorkProvider.run(async (u) => {
        const previous = await u.notes.findById(noteId);
        if (!previous) throw Error("AUDIO_OLD_BODY_NOTE");
        await commitRegeneratedBody(c, u, {
          previous,
          note: editNote(
            previous,
            previous.title,
            options.initialBody!,
            clockTime,
          ),
          actor: { kind: "user", accountId },
          cause: "manual",
        });
      });
    const objectRoot = path.join(root, "worker-objects");
    await mkdir(objectRoot, { mode: 0o700 });
    await writeFile(path.join(objectRoot, storageKey), originalBytes, {
      flag: "wx",
      mode: 0o600,
    });
    const storage = new CoordinatedObjectStorage(
      objectRoot,
      c.unitOfWorkProvider,
      c.clock,
    );
    await storage.recoverOwners();
    await expect(storage.openOwnedRead(storageKey)).rejects.toMatchObject({
      code: "OBJECT_OWNER_REQUIRED",
    });
    const ownership = await NodeLlmRuntimeOwnership.acquire(
      path.join(root, "worker-runtime"),
    );
    const memory = new NodeRegenerationMemory({ prepare: noIo });
    const source = new NodeLlmSourceReader(storage);
    const spool = path.join(root, "bounded-audio-spool");
    const chunks = [wav([1, -2, 3, -4]), wav([5, -6, 7, -8])];
    let preparedClosed = false;
    let copiedBytes = 0;
    const readOrdinals: number[] = [];
    const boundedPreparer: LlmAudioPreparer = {
      async prepare(input, signal) {
        expect(signal.aborted).toBe(false);
        expect(input.source.sha256).toBe(hash(originalBytes));
        expect(input.recipe.sttModelId).toBe(sttModel);
        await mkdir(spool, { mode: 0o700 });
        await input.copy(
          {
            async write(bytes) {
              expect(bytes.byteLength).toBeLessThanOrEqual(64 * 1024);
              expect(Buffer.from(bytes)).toEqual(
                originalBytes.subarray(
                  copiedBytes,
                  copiedBytes + bytes.byteLength,
                ),
              );
              copiedBytes += bytes.byteLength;
              expect(copiedBytes).toBeLessThanOrEqual(originalBytes.length);
            },
          },
          signal,
        );
        expect(copiedBytes).toBe(originalBytes.length);
        if (options.nativeFailure)
          throw new LlmOperationError(options.nativeFailure, "not-sent", true);
        const ownerRows = await base.client.execute(
          "select kind, owner_id from object_writes where active=1",
        );
        expect(ownerRows.rows).toEqual([
          { kind: "conversion-job", owner_id: accepted.jobId },
        ]);
        expect(
          (
            await base.client.execute(
              "select k.storage_key from object_write_keys k join object_writes w on w.id=k.write_id where w.active=1",
            )
          ).rows,
        ).toEqual([{ storage_key: storageKey }]);
        const current = await conversion(accepted.jobId);
        expect(current).toMatchObject({
          sourceMemoryBytes: 52_428_800,
          inputReceipt: { state: "active" },
        });
        const fixedManifest = manifest(current);
        for (const [ordinal, bytes] of chunks.entries())
          await writeFile(path.join(spool, `chunk-${ordinal}`), bytes, {
            flag: "wx",
            mode: 0o600,
          });
        let resolveClosed!: () => void;
        const closed = new Promise<void>((resolve) => {
          resolveClosed = resolve;
        });
        return {
          manifest: fixedManifest,
          closed,
          async readChunk(identity, chunkSignal) {
            expect(chunkSignal.aborted).toBe(false);
            expect(preparedClosed).toBe(false);
            expect(identity).toEqual(fixedManifest.chunks[identity.ordinal]);
            const bytes = await readFile(
              path.join(spool, `chunk-${identity.ordinal}`),
            );
            expect(hash(bytes)).toBe(identity.sha256);
            expect(bytes.byteLength).toBe(identity.bytes);
            readOrdinals.push(identity.ordinal);
            return {
              identity,
              sampleRate: 16000,
              channels: 1,
              mimeType: "audio/wav",
              bytes,
            };
          },
          async close() {
            await rm(spool, { recursive: true });
            preparedClosed = true;
            resolveClosed();
          },
        };
      },
    };
    const stage = new NodeRegenerationInput(
      c,
      { input: memory, local: source },
      boundedPreparer,
    );
    stage.configureRuntime(ownership.runtimeId, ownership);
    const execution = new NodeLlmExecution(ownership, c.clock);
    stopWorker = async () => {
      await execution.stop();
      await stage.stop();
    };
    const defaultTranscriber: LlmTranscriber = {
      transcribe: vi.fn<LlmTranscriber["transcribe"]>(async (value, signal) => {
        expect(signal.aborted).toBe(false);
        expect(value.model).toMatchObject({
          kind: "stt-transcription",
          modelId: sttModel,
        });
        expect(Buffer.from(value.input.bytes)).toEqual(
          chunks[value.input.identity.ordinal],
        );
        expect(hash(value.input.bytes)).toBe(value.input.identity.sha256);
        const saved = await snapshot(accepted.jobId);
        expect(saved.conversion).toMatchObject({
          audioPlan: { kind: "transcribing" },
        });
        expect(saved.note?.html).toBe(options.initialBody ?? "");
        expect(saved.sharing?.visibility).toBe("private");
        expect(await llmUsage(c, token)).toMatchObject({
          consumed: 1,
          reserved: 0,
        });
        clockTime = new Date(now.getTime() + value.input.identity.ordinal + 1);
        return {
          kind: "transcript",
          text:
            value.input.identity.ordinal === 0 ? "最初の区間" : "最後の区間",
          inputTokens: null,
          outputTokens: null,
        };
      }),
    };
    const defaultGenerator: LlmGenerator = {
      generate: vi.fn<LlmGenerator["generate"]>(async (value, signal) => {
        expect(signal.aborted).toBe(false);
        expect(value.model).toMatchObject({
          kind: "chat-text",
          modelId: textModel,
        });
        if (value.input.kind !== "text-block")
          throw new Error("AUDIO_WORKER_TEXT_INPUT_REQUIRED");
        expect(value.input.html).toContain("最初の区間");
        expect(value.input.html).toContain("最後の区間");
        const saved = await snapshot(accepted.jobId);
        expect(saved.conversion).toMatchObject({
          audioPlan: { kind: "structuring" },
          retryOf: initialJobId,
          preparationVersion: 5,
          promptVersion: 4,
        });
        expect(
          saved.dispatches
            .filter((row) => row.stage === "transcribe")
            .map((row) => row.state),
        ).toEqual(["response", "response"]);
        expect(saved.note?.html).toBe(options.initialBody ?? "");
        clockTime = new Date(now.getTime() + 3);
        return {
          content: "<h1>全音声の本文</h1><p>最初の区間と最後の区間</p>",
          finish: "stop",
          inputTokens: 12,
          outputTokens: 34,
        };
      }),
    };
    const transcriber = options.transcriber ?? defaultTranscriber;
    const generator = options.generator ?? defaultGenerator;
    if (!c.llm) throw new Error("AUDIO_WORKER_SERVICES_REQUIRED");
    c = {
      ...c,
      llm: {
        ...c.llm,
        ...(options.monthlyLimit === undefined
          ? {}
          : { monthlyLimit: options.monthlyLimit }),
        inputMode: "leased-local-v2",
        inputStage: stage,
        ownership,
        execution,
        storage,
        source,
        audio: { preparer: boundedPreparer, transcriber },
        generator,
        result: new NodeLlmResultProcessor(),
        profiles: options.profiles ?? {
          async inspect(model) {
            if (model.kind === "stt-transcription")
              return {
                kind: "stt-transcription",
                modelId: model.modelId,
                source: "adopted-default",
                checkedAt: now,
              };
            if (model.kind !== "chat-text")
              throw new Error("AUDIO_WORKER_MODEL_KIND_REQUIRED");
            return {
              kind: "chat-text",
              modelId: model.modelId,
              source: "adopted-default",
              checkedAt: now,
              contextTokens: 32000,
              outputTokens: 4096,
              supportsMaxTokens: true,
            };
          },
        },
      },
    };
    const currentNote = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!currentNote) throw Error("AUDIO_WORKER_NOTE");
    const accepted =
      options.accepted ??
      (await conversion(
        (
          await requestLlmRegeneration(c, token, {
            ...input(),
            noteVersion: currentNote.version,
          })
        ).jobId,
      ));
    return {
      accepted,
      execution,
      memory,
      stage,
      transcriber,
      generator,
      readOrdinals,
      spool,
      state: {
        get preparedClosed() {
          return preparedClosed;
        },
        get copiedBytes() {
          return copiedBytes;
        },
      },
    };
  }

  it("runs both audio worker stages inside the actual object owner and closes the input before publishing the original intent", async () => {
    const {
      accepted,
      execution,
      memory,
      stage,
      transcriber,
      generator,
      readOrdinals,
      spool,
      state,
    } = await lawfulWorker();
    const before = await snapshot(accepted.jobId);
    await sweepLlm(c);
    await vi.waitFor(async () => {
      expect((await conversion(accepted.jobId)).phase).toBe("terminal");
      expect(execution.active(accepted.jobId)).toBe(false);
    });
    const saved = await snapshot(accepted.jobId);
    expect(saved.conversion).toMatchObject({
      outcome: { kind: "succeeded", noteVersion: 1 },
      sourceMemoryBytes: 0,
      inputReceipt: { state: "closed" },
      owner: { state: "closed" },
      audioPlan: { kind: "responses-complete" },
      retryOf: initialJobId,
    });
    expect(saved.note).toMatchObject({
      html: "<h1>全音声の本文</h1><p>最初の区間と最後の区間</p>",
      version: 1,
    });
    expect(saved.original).toMatchObject({
      id: originalId,
      sha256: hash(originalBytes),
      bytes: originalBytes.length,
      state: "ready",
      coverage: "complete",
    });
    expect(saved.batch).toEqual(before.batch);
    expect(saved.sharing).toMatchObject({ visibility: "public", version: 1 });
    expect(saved.sharing?.tokenHash).toBeTruthy();
    expect(
      before.revisions.map((revision) => revision.capturedNoteVersion),
    ).toEqual([0]);
    expect(
      saved.revisions.map((revision) => revision.capturedNoteVersion).sort(),
    ).toEqual([0, 1]);
    expect(
      saved.dispatches.map((row) => [
        row.stage ?? "structure",
        row.ordinal,
        row.state,
      ]),
    ).toEqual([
      ["transcribe", 0, "scrubbed"],
      ["transcribe", 1, "scrubbed"],
      ["structure", 0, "scrubbed"],
    ]);
    expect(transcriber.transcribe).toHaveBeenCalledTimes(2);
    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(readOrdinals).toEqual([0, 1]);
    expect(state.preparedClosed).toBe(true);
    expect(memory.activeInputs()).toBe(0);
    expect(stage.lease(await conversion(accepted.jobId))).toBeNull();
    await expect(readFile(path.join(spool, "chunk-0"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(
      (
        await base.client.execute(
          "select count(*) as active from object_writes where active=1",
        )
      ).rows,
    ).toEqual([{ active: 0 }]);
    expect(
      (
        await base.client.execute(
          "select count(*) as pending from object_write_keys k join object_writes w on w.id=k.write_id where w.active=1",
        )
      ).rows,
    ).toEqual([{ pending: 0 }]);
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
    expect(saved.connection?.lastUsedAt).toEqual(new Date(now.getTime() + 2));
    const latest = (await listImports(c, token)).batches;
    expect(latest).toHaveLength(1);
    expect(latest[0]?.jobs.map((job) => job.id)).toEqual([accepted.jobId]);
    if (!stopWorker) throw Error("AUDIO_WORKER_STOP_REQUIRED");
    await stopWorker();
    stopWorker = undefined;
  });

  it.each([
    ["401", "LLM_CREDENTIAL_INVALID", 1],
    ["402", "LLM_CREDIT_REQUIRED", 1],
    ["429", "LLM_RATE_LIMIT", 1],
    ["invalid", "LLM_RESPONSE_INVALID", 1],
    ["empty", "LLM_AUDIO_NO_TEXT", 2],
    ["expired", "LLM_MODEL_UNAVAILABLE", 0],
    ["quota", "LLM_MONTHLY_LIMIT", 0],
    ["source-corrupt", "LLM_SOURCE_INVALID", 0],
    ["native-resource", "LLM_RESOURCE_LIMIT", 0],
    ["native-timeout", "LLM_TIMEOUT", 0],
    ["stt-timeout", "LLM_DELIVERY_UNKNOWN", 1],
  ] as const)("terminates the audio worker safely after actual provider %s", async (mode, code, sends) => {
    const sockets = new Set<Socket>();
    const socketClosures: Promise<void>[] = [];
    let wire = 0;
    let sent = () => {};
    const sentRequest = new Promise<void>((resolve) => {
      sent = resolve;
    });
    const server = createServer((incoming, outgoing) => {
      const parts: Buffer[] = [];
      incoming.on("data", (part: Buffer) => parts.push(part));
      incoming.once("end", () => {
        if (incoming.url?.startsWith("/api/v1/models")) {
          outgoing.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({
              data: [
                {
                  id: textModel,
                  name: "本文",
                  architecture: {
                    input_modalities: ["text"],
                    output_modalities: ["text"],
                  },
                  expiration_date: null,
                  context_length: 32000,
                  supported_parameters: ["max_tokens"],
                  top_provider: { max_completion_tokens: 4096 },
                },
                {
                  id: sttModel,
                  name: "音声",
                  architecture: {
                    input_modalities: ["audio"],
                    output_modalities: ["transcription"],
                  },
                  expiration_date: mode === "expired" ? "2026-10-01" : null,
                },
              ],
              total_count: 2,
              links: { next: null },
            }),
          );
          return;
        }
        expect(incoming.url).toBe("/api/v1/audio/transcriptions");
        const body = JSON.parse(Buffer.concat(parts).toString());
        expect(body.model).toBe(sttModel);
        expect(body.provider).toEqual({ data_collection: "deny", zdr: true });
        expect(body.input_audio.format).toBe("wav");
        wire++;
        if (mode === "stt-timeout") {
          sent();
          return;
        }
        outgoing.setHeader("Connection", "close");
        outgoing.writeHead(/^\d+$/.test(mode) ? Number(mode) : 200, {
          "Content-Type": "application/json",
        });
        outgoing.end(
          mode === "invalid"
            ? "{not-json"
            : JSON.stringify(
                mode === "empty"
                  ? { text: "" }
                  : { error: { message: "PRIVATE_PROVIDER_BODY" } },
              ),
        );
      });
    });
    server.on("connection", (socket) => {
      sockets.add(socket);
      socketClosures.push(
        new Promise<void>((yes) =>
          socket.once("close", () => {
            sockets.delete(socket);
            yes();
          }),
        ),
      );
    });
    await new Promise<void>((yes) => server.listen(0, "127.0.0.1", yes));
    const address = server.address();
    if (!address || typeof address === "string")
      throw Error("AUDIO_PROVIDER_ADDRESS");
    const dial = (url: URL) =>
      new URL(url.pathname + url.search, `http://127.0.0.1:${address.port}`);
    const native = new NodeLlmTranscriber((url, options, response) =>
      httpRequest(
        dial(url),
        { ...options, port: address.port, agent: false },
        response,
      ),
    );
    const provider = new NodeOpenRouterProvider(
      "http://fixture.invalid",
      c.clock,
      (url, options, response) =>
        httpRequest(
          dial(url),
          { ...options, port: address.port, agent: false },
          response,
        ),
    );
    const stt = {
      transcribe: vi.fn<LlmTranscriber["transcribe"]>(async (value, signal) => {
        if (mode !== "stt-timeout") return native.transcribe(value, signal);
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const result = native.transcribe(value, signal);
        result.catch(() => {});
        try {
          await sentRequest;
          await vi.advanceTimersByTimeAsync(60_000);
          return await result;
        } finally {
          vi.useRealTimers();
        }
      }),
    };
    const generation = { generate: vi.fn(noIo) };
    let worker: Awaited<ReturnType<typeof lawfulWorker>> | undefined;
    try {
      worker = await lawfulWorker({
        transcriber: stt,
        generator: generation,
        profiles: provider,
        initialBody: "<p>以前の本文を保持</p>",
        ...(mode === "quota" ? { monthlyLimit: 0 } : {}),
        ...(mode === "source-corrupt"
          ? { nativeFailure: "LLM_SOURCE_INVALID" as const }
          : mode === "native-resource"
            ? { nativeFailure: "LLM_RESOURCE_LIMIT" as const }
            : mode === "native-timeout"
              ? { nativeFailure: "LLM_TIMEOUT" as const }
              : {}),
      });
      const before = await snapshot(worker.accepted.jobId);
      await sweepLlm(c);
      await vi.waitFor(async () => {
        expect((await conversion(worker!.accepted.jobId)).phase).toBe(
          "terminal",
        );
        expect(worker!.execution.active(worker!.accepted.jobId)).toBe(false);
      });
      const saved = await snapshot(worker.accepted.jobId);
      expect(saved.conversion).toMatchObject({
        outcome: { kind: mode === "stt-timeout" ? "unknown" : "failed", code },
        owner: { state: mode === "quota" ? "idle" : "closed" },
        sourceMemoryBytes: 0,
      });
      expect(saved.note).toEqual(before.note);
      expect(saved.sharing).toEqual(before.sharing);
      expect(saved.original).toEqual({ ...before.original, state: "needs_ai" });
      expect(saved.revisions).toEqual(before.revisions);
      expect(await llmUsage(c, token)).toMatchObject({
        consumed: sends > 0 ? 1 : 0,
        reserved: 0,
      });
      expect(wire).toBe(sends);
      expect(stt.transcribe).toHaveBeenCalledTimes(sends);
      expect(generation.generate).not.toHaveBeenCalled();
      if (sends > 0) {
        expect(saved.conversion?.inputReceipt).toMatchObject({
          state: "closed",
        });
        expect(worker.state.preparedClosed).toBe(true);
        expect(saved.connection?.lastUsedAt).not.toBeNull();
      } else expect(saved.connection?.lastUsedAt).toBeNull();
      expect(worker.memory.activeInputs()).toBe(0);
      const history = await listImports(c, token);
      expect(JSON.stringify(history)).not.toContain("PRIVATE_PROVIDER_BODY");
      expect(JSON.stringify(history)).toContain(code);
      const terminal = await snapshot(worker.accepted.jobId);
      await sweepLlm(c);
      await recoverLlm(c);
      expect(await snapshot(worker.accepted.jobId)).toEqual(terminal);
      expect(wire).toBe(sends);
      expect(stt.transcribe).toHaveBeenCalledTimes(sends);
      expect(generation.generate).not.toHaveBeenCalled();
    } finally {
      await stopWorker?.();
      stopWorker = undefined;
      await new Promise<void>((yes, no) =>
        server.close((error) => (error ? no(error) : yes())),
      );
      await Promise.all(socketClosures);
      expect(sockets.size).toBe(0);
    }
  });

  it("recovers every saved audio stage, prepares the current source again and adopts without a provider resend", async () => {
    await attach("private", undefined, "source-audio");
    const completed = await allResponses();
    await c.unitOfWorkProvider.run(async (u) => {
      const current = await u.llmConversions.find(completed.jobId);
      if (
        !current ||
        current.selection !== "fixed" ||
        current.preparationVersion !== 5
      )
        throw Error("AUDIO_RECOVERY_CURRENT");
      await u.llmConversions.replace(
        {
          ...current,
          phase: "response-ready",
          version: current.version + 1,
          updatedAt: clockTime,
        },
        current.version,
      );
    });
    predecessors = [runtimeId];
    await recoverLlm(c);
    const ready = await conversion(completed.jobId);
    expect(ready).toMatchObject({
      phase: "response-ready",
      owner: { state: "closed" },
      sourceMemoryBytes: 0,
      inputReceipt: null,
    });
    const worker = await lawfulWorker({ accepted: ready });
    await sweepLlm(c);
    await vi.waitFor(async () => {
      expect((await conversion(ready.jobId)).phase).toBe("terminal");
      expect(worker.execution.active(ready.jobId)).toBe(false);
    });
    const result = await snapshot(ready.jobId);
    expect(result.conversion).toMatchObject({
      outcome: { kind: "succeeded", noteVersion: 1 },
      owner: { state: "closed" },
      inputReceipt: { state: "closed" },
      sourceMemoryBytes: 0,
    });
    expect(result.note?.html).toBe("<h1>音声の本文</h1><p>完成した全区間</p>");
    expect(worker.state.copiedBytes).toBe(originalBytes.length);
    expect(worker.state.preparedClosed).toBe(true);
    expect(worker.transcriber.transcribe).not.toHaveBeenCalled();
    expect(worker.generator.generate).not.toHaveBeenCalled();
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
    expect(worker.memory.activeInputs()).toBe(0);
  });

  it("fixes STT and text models in one conversion and seals both complete response sets with one logical quota", async () => {
    await attach();
    const value = await allResponses();
    expect(value).toMatchObject({
      source: { format: "audio" },
      modelId: textModel,
      audioRecipe: { sttModelId: sttModel },
      preparationVersion: 5,
      promptVersion: 4,
      phase: "response-ready",
      audioPlan: { kind: "responses-complete" },
      retryOf: initialJobId,
    });
    const saved = await snapshot(value.jobId);
    expect(
      saved.dispatches.map((row) => [
        row.stage ?? "structure",
        row.ordinal,
        row.state,
      ]),
    ).toEqual([
      ["transcribe", 0, "response"],
      ["transcribe", 1, "response"],
      ["structure", 0, "response"],
    ]);
    expect(saved.quota).toMatchObject({ reserved: 0, consumed: 1 });
    expect(saved.note).toMatchObject({ html: "", version: 0 });
    expect(saved.original).toMatchObject({
      bytes: originalBytes.length,
      sha256: hash(originalBytes),
      activeJobId: value.jobId,
    });
    expect(generate).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("rejects STT-only response-ready and a skipped structure seal atomically", async () => {
    await attach();
    const claimed = await claim(await request());
    const transcribing = await sttResponses(
      await seal(claimed, {
        kind: "transcribing",
        manifest: manifest(claimed),
      }),
    );
    const before = await snapshot(transcribing.jobId);
    await expect(
      c.unitOfWorkProvider.run((u) =>
        u.llmConversions.replace(
          {
            ...transcribing,
            phase: "response-ready",
            version: transcribing.version + 1,
          },
          transcribing.version,
        ),
      ),
    ).rejects.toBeDefined();
    const rows = await c.unitOfWorkProvider.run((u) =>
      u.llmDispatches.list(transcribing.jobId),
    );
    const prepared = structureAudioTranscript(c, manifest(claimed), rows);
    const segment = prepared.segments[0];
    if (!segment) throw new Error("AUDIO_TEST_SEGMENT");
    await expect(
      seal(transcribing, {
        kind: "responses-complete",
        manifest: manifest(claimed),
        transcriptHash: segment.identity.transcriptHash,
        segments: prepared.segments.map((part) => part.identity),
      }),
    ).rejects.toBeDefined();
    expect(await snapshot(transcribing.jobId)).toEqual(before);
  });

  it("cannot replace either fixed model or seal another source under the accepted command", async () => {
    await attach();
    const value = await claim(await request());
    const before = await snapshot(value.jobId);
    await expect(
      c.unitOfWorkProvider.run((u) =>
        u.llmConversions.replace(
          {
            ...value,
            modelId: "fixture/replaced-text",
            version: value.version + 1,
          },
          value.version,
        ),
      ),
    ).rejects.toBeDefined();
    await expect(
      c.unitOfWorkProvider.run((u) =>
        u.llmConversions.replace(
          {
            ...value,
            audioRecipe: {
              ...value.audioRecipe,
              sttModelId: "fixture/replaced-stt",
            },
            version: value.version + 1,
          },
          value.version,
        ),
      ),
    ).rejects.toBeDefined();
    const foreign = {
      ...manifest(value),
      source: { ...value.source, originalId: base.idGenerator.next() },
    };
    await expect(
      seal(value, { kind: "transcribing", manifest: foreign }),
    ).rejects.toBeDefined();
    const wrongOwner = await c.unitOfWorkProvider.run((u) =>
      u.llmConversions.sealAudio({
        jobId: value.jobId,
        expectedVersion: value.version,
        ownerToken: base.idGenerator.next(),
        runtimeId,
        plan: { kind: "transcribing", manifest: manifest(value) },
        now,
      }),
    );
    expect(wrongOwner).toBeNull();
    expect(await snapshot(value.jobId)).toEqual(before);
  });

  it("does not seal structure from a missing STT response and does not confuse empty transcript with success", async () => {
    await attach();
    const claimed = await claim(await request());
    const value = await seal(claimed, {
      kind: "transcribing",
      manifest: manifest(claimed),
    });
    const before = await snapshot(value.jobId);
    await expect(structure(value)).rejects.toMatchObject({
      code: "LLM_SOURCE_CHANGED",
    });
    expect(await snapshot(value.jobId)).toEqual(before);
    const empty = await sttResponses(value, ["", ""]);
    await expect(structure(empty)).rejects.toMatchObject({
      code: "LLM_AUDIO_NO_TEXT",
    });
    expect((await conversion(value.jobId)).audioPlan.kind).toBe("transcribing");
    expect((await snapshot(value.jobId)).quota).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });

  it("escapes transcript markup into plain text and fixes a nonempty structural input once", async () => {
    await attach();
    const claimed = await claim(await request());
    const value = await sttResponses(
      await seal(claimed, {
        kind: "transcribing",
        manifest: manifest(claimed),
      }),
    );
    const result = await structure(value);
    expect(result.prepared.segments.map((segment) => segment.html)).toEqual([
      "<p>区間 1\n最初 &lt;script&gt;命令ではない&lt;/script&gt;\n区間 2\n最後の区間\n</p>",
    ]);
    const before = await snapshot(value.jobId);
    await expect(
      seal(result.value, { kind: "transcribing", manifest: manifest(claimed) }),
    ).rejects.toBeDefined();
    expect(await snapshot(value.jobId)).toEqual(before);
  });

  it("keeps logical consumption and latest STT use when the later structure dispatch is proven not sent", async () => {
    await attach();
    const claimed = await claim(await request());
    const stt = await sttResponses(
      await seal(claimed, {
        kind: "transcribing",
        manifest: manifest(claimed),
      }),
    );
    const answer = await chatResponse((await structure(stt)).value, "not-sent");
    await c.unitOfWorkProvider.run((u) =>
      completeLlm(
        c,
        u,
        answer,
        { kind: "failed", code: "LLM_UNAVAILABLE" },
        new Date(now.getTime() + 20),
      ),
    );
    const saved = await snapshot(answer.jobId);
    expect(saved.quota).toMatchObject({ reserved: 0, consumed: 1 });
    expect(saved.connection?.lastUsedAt).toEqual(new Date(now.getTime() + 2));
    expect(saved.note).toMatchObject({ html: "", version: 0 });
  });

  it.each([
    "stt-only",
    "intent-unknown",
  ] as const)("recovers %s with no automatic external send or partial body adoption", async (mode) => {
    await attach();
    const claimed = await claim(await request());
    let value = await seal(claimed, {
      kind: "transcribing",
      manifest: manifest(claimed),
    });
    if (mode === "stt-only") value = await sttResponses(value);
    else {
      const chunk = manifest(claimed).chunks[0];
      if (!chunk) throw new Error("AUDIO_RECOVERY_CHUNK");
      clockTime = new Date(now.getTime() + 3);
      await c.unitOfWorkProvider.run(async (u) => {
        const id = base.idGenerator.next();
        await u.llmDispatches.prepare({
          id,
          jobId: value.jobId,
          ordinal: 0,
          stage: "transcribe",
          input: chunk,
          runtimeId,
          ownerToken,
          state: "prepared",
          intentAt: null,
          response: null,
        });
        if (
          !(await u.llmDispatches.intent(
            id,
            ownerToken,
            new Date(now.getTime() + 3),
          ))
        )
          throw new Error("AUDIO_RECOVERY_INTENT");
      });
    }
    const before = await snapshot(value.jobId);
    predecessors = [runtimeId];
    await recoverLlm(c);
    const saved = await snapshot(value.jobId);
    expect(saved.conversion).toMatchObject({
      phase: "terminal",
      owner: { state: "closed" },
      outcome: { kind: "unknown", code: "LLM_DELIVERY_UNKNOWN" },
    });
    expect(saved.note).toEqual(before.note);
    expect(saved.revisions).toEqual(before.revisions);
    expect(saved.quota).toMatchObject({ consumed: 1, reserved: 0 });
    expect(saved.connection?.lastUsedAt).toEqual(
      new Date(now.getTime() + (mode === "stt-only" ? 2 : 3)),
    );
    expect(generate).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
    await recoverLlm(c);
    expect(await snapshot(value.jobId)).toEqual(saved);
  });

  it.each([
    "actor",
    "epoch",
    "version",
  ] as const)("rejects a stale %s before admission without altering the original, body, history or quota", async (cause) => {
    await attach();
    const before = await snapshot();
    const requestInput = input();
    await expect(
      requestLlmRegeneration(c, cause === "actor" ? otherToken : token, {
        ...requestInput,
        ...(cause === "epoch" ? { expectedEpoch: 0 } : {}),
        ...(cause === "version" ? { noteVersion: 1 } : {}),
      }),
    ).rejects.toMatchObject({
      code:
        cause === "actor"
          ? "NOTE_NOT_FOUND"
          : cause === "epoch"
            ? "OPENROUTER_CONNECTION_CHANGED"
            : "NOTE_CONFLICT",
    });
    expect(await snapshot()).toEqual(before);
  });

  it("rejects stale source and current viewer role before a stage seal and leaves all persisted state unchanged", async () => {
    const workspace = await createWorkspace(c, otherToken, {
      name: "音声ワークスペース",
      description: "",
    });
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspace.id, accountId, "editor"),
    );
    await attach("private", workspace.id);
    const value = await claim(await request());
    const before = await snapshot(value.jobId);
    await expect(
      c.unitOfWorkProvider.run((u) =>
        currentLlmSource(
          u,
          { ...value, source: { ...value.source, sha256: "0".repeat(64) } },
          now,
        ),
      ),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_CHANGED" });
    expect(await snapshot(value.jobId)).toEqual(before);
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspace.id, accountId, "viewer"),
    );
    const viewer = await snapshot(value.jobId);
    await expect(
      seal(value, { kind: "transcribing", manifest: manifest(value) }),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_CHANGED" });
    expect(await snapshot(value.jobId)).toEqual(viewer);
  });

  it.each([
    "link",
    "public",
  ] as const)("keeps the original %s intent and one parent job until both stages complete, then applies it atomically", async (visibility) => {
    await writeFile(path.join(root, "share.key"), randomBytes(32), {
      flag: "wx",
      mode: 0o600,
    });
    c = {
      ...c,
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory: root,
          activeKeyId: "share",
          keyIds: ["share"],
        }),
        passwordWork: new NodeSharePasswordWork(),
      },
    };
    if (visibility === "public") {
      const profile = await getProfile(c, token);
      await saveProfile(c, token, {
        displayName: "音声利用者",
        handle: "audio-fixture",
        bio: "",
        nameVersion: profile.nameVersion,
        profileVersion: profile.profileVersion,
        confirmHandleChange: true,
      });
    }
    await attach(visibility);
    const value = await allResponses();
    const before = await snapshot(value.jobId);
    expect(before.sharing).toMatchObject({ visibility: "private", version: 0 });
    expect(before.batch).toMatchObject({
      id: batchId,
      requestedVisibility: visibility,
    });
    expect(before.conversion?.retryOf).toBe(initialJobId);
    const pending = (await listImports(c, token)).batches;
    expect(pending).toHaveLength(1);
    expect(pending[0]?.jobs.map((job) => job.id)).toEqual([value.jobId]);
    await c.unitOfWorkProvider.run(async (u) => {
      const checked = await currentLlmSource(u, value, clockTime);
      const note = editNote(
        checked.note,
        checked.note.title,
        "<p>完成した全音声本文</p>",
        clockTime,
      );
      await commitRegeneratedBody(c, u, {
        previous: checked.note,
        note,
        actor: { kind: "system", jobId: value.jobId },
        cause: "import",
      });
      await u.imports.saveOriginal({
        ...checked.original,
        state: "ready",
        coverage: "complete",
      });
      await applyImportPublication(c, u, value.jobId);
      await completeLlm(
        c,
        u,
        value,
        { kind: "succeeded", noteVersion: note.version },
        clockTime,
      );
    });
    const saved = await snapshot(value.jobId);
    expect(saved.note).toMatchObject({
      html: "<p>完成した全音声本文</p>",
      version: 1,
    });
    expect(saved.sharing).toMatchObject({
      visibility,
      version: 1,
      linkGeneration: 1,
    });
    expect(saved.sharing?.tokenHash).toBeTruthy();
    expect(saved.original).toMatchObject({
      id: originalId,
      sha256: hash(originalBytes),
      bytes: originalBytes.length,
    });
    expect(saved.conversion?.outcome).toMatchObject({
      kind: "succeeded",
      noteVersion: 1,
    });
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
    const finished = (await listImports(c, token)).batches;
    expect(finished).toHaveLength(1);
    expect(finished[0]?.jobs).toHaveLength(1);
    expect(finished[0]?.jobs[0]).toMatchObject({
      id: value.jobId,
      state: "succeeded",
    });
  });
});
