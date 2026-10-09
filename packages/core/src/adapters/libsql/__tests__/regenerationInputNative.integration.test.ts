import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  type ClientRequest,
  createServer,
  request,
  type Server,
} from "node:http";
import type { Socket } from "node:net";
import path from "node:path";
import type { WorkerOptions } from "node:worker_threads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import type {
  DriveClosedProof,
  DriveSecretProtector,
} from "@repo/core/application/integration/drive/ports";
import { acknowledgeSourceClosure } from "@repo/core/application/integration/drive/runner";
import type { LlmSourcePreparer } from "@repo/core/application/llm/ports";
import { isLlmOperationError } from "@repo/core/application/llm/ports";
import type {
  RegenerationSourceProvider,
  RegenerationSourceRequest,
} from "@repo/core/application/regeneration/services";
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
import { NodeDriveExecution } from "../../node/drive/execution";
import {
  DRIVE_SOURCE_FILE_FIELDS,
  type DriveRequestFactory,
  NodeDriveHttp,
} from "../../node/drive/http";
import { createDriveSecretProtector } from "../../node/drive/secretProtector";
import { NodeRegenerationSourceProvider } from "../../node/drive/sourceProvider";
import { NodeLlmSourcePreparer } from "../../node/llm/sourcePreparer";
import { NodeLlmSourceReader } from "../../node/llm/sourceReader";
import { FileObjectStorage } from "../../node/objectStorage";
import { NodeRegenerationInput } from "../../node/regeneration/input";

declare module "vitest" {
  interface TaskMeta {
    inputCounts?: number[];
  }
}

import {
  inputId as id,
  inputCapacity,
  inputComposition,
  inputDatabase,
  inputRoot,
  inputNow as now,
  seedInputLlm,
} from "./regenerationInputFixtures";

const workers = vi.hoisted(() => ({
  spawned: 0,
  active: 0,
  rows: [] as {
    message: boolean;
    exit: boolean;
    stdout: boolean;
    stderr: boolean;
    terminate: number;
    exitCode: number | null;
    output: number;
  }[],
}));
vi.mock("node:worker_threads", async (original) => {
  const actual = await original<typeof import("node:worker_threads")>();
  return {
    ...actual,
    Worker: class extends actual.Worker {
      private readonly observation;
      constructor(file: string | URL, options?: WorkerOptions) {
        if (workers.spawned >= 4 || workers.active !== 0)
          throw Error("INPUT_WORKER_BUDGET");
        super(file, options);
        workers.spawned++;
        workers.active++;
        const row = {
          message: false,
          exit: false,
          stdout: false,
          stderr: false,
          terminate: 0,
          exitCode: null as number | null,
          output: 0,
        };
        this.observation = row;
        workers.rows.push(row);
        this.once("message", () => {
          row.message = true;
        });
        this.once("exit", (code) => {
          row.exit = true;
          row.exitCode = code;
          workers.active--;
        });
        this.stdout.once("end", () => {
          row.stdout = true;
        });
        this.stderr.once("end", () => {
          row.stderr = true;
        });
        this.stdout.on("data", (b: Buffer) => {
          row.output += b.length;
        });
        this.stderr.on("data", (b: Buffer) => {
          row.output += b.length;
        });
      }
      override terminate() {
        this.observation.terminate++;
        return super.terminate();
      }
    },
  };
});

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
async function bounded<T>(work: Promise<T>, ms = 5000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, no) => {
        timer = setTimeout(() => no(Error("INPUT_DEADLINE")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
type Seed = Awaited<ReturnType<typeof seedInputLlm>>;
type Mode = "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | "N7" | "N8" | "N9";
const columns: Record<Mode, readonly ("M" | "D")[]> = {
  N1: ["M", "D", "M", "M"],
  N2: ["M", "D", "M", "M", "D", "M"],
  N3: ["M"],
  N4: ["M", "D"],
  N5: ["M", "D", "M"],
  N6: ["M", "D"],
  N7: ["M", "D"],
  N8: ["M", "D", "M"],
  N9: ["M"],
};

describe.skipIf(!process.env.HOLLOW_REGENERATION_INPUT_ROOT)(
  "0043 owned source native",
  () => {
    let base: Awaited<ReturnType<typeof inputDatabase>>;
    let server: Server;
    let port = 0;
    let mode: Mode = "N1";
    let seed: Seed;
    let sequence = 0;
    let received = 0;
    let sent = 0;
    let totalBytes = 0;
    let violations = 0;
    let activeRequests = 0;
    let requestClosed = 0;
    let responseClosed = 0;
    let socketClosed = 0;
    let socketCreated = 0;
    let failed = false;
    let aborter = new AbortController();
    let execution: NodeDriveExecution;
    let composition: ReturnType<typeof inputComposition>;
    let input: NodeRegenerationInput;
    let provider: NodeRegenerationSourceProvider;
    let realPreparer: NodeLlmSourcePreparer;
    let useRealWorker = false;
    let invalidated = false;
    let checks = 0;
    const sockets = new Set<Socket>();
    const requests = new Set<ClientRequest>();
    const metas: { inputClosed?: boolean }[] = [];
    let protector: DriveSecretProtector;
    let localDirectory: string;
    let storage: FileObjectStorage;
    let fdOpened = 0;
    let fdClosed = 0;
    const zero = {
      kind: "text-blocks" as const,
      preparationVersion: 1 as const,
      segments: [],
      blocks: 0,
      notices: [],
      media: [],
    };
    const preparer: LlmSourcePreparer = {
      prepare: (value, signal) =>
        useRealWorker
          ? realPreparer.prepare(value, signal)
          : Promise.resolve(zero),
    };
    const wrapperProvider: RegenerationSourceProvider = {
      read: (value) => provider.read(currentRequest(value)),
      inspect: (value) => provider.inspect(currentRequest(value)),
    };
    function currentRequest(
      value: RegenerationSourceRequest,
    ): RegenerationSourceRequest {
      return {
        ...value,
        checkCurrent: async () => {
          checks++;
          if (mode === "N9" && checks === 2) {
            await base.uow.run(async (u) => {
              const c = await u.driveConnections.find(seed.record.accountId);
              if (!c || c.state !== "linked") throw Error("INPUT_CONNECTION");
              expect(
                await u.driveConnections.replace(
                  {
                    ...c,
                    state: "needs-relink",
                    version: c.version + 1,
                    updatedAt: now,
                  },
                  c.version,
                  "invalidate",
                ),
              ).toBe(true);
            });
            invalidated = true;
          }
          await value.checkCurrent();
        },
      };
    }
    // biome-ignore lint/correctness/noEmptyPattern: Vitest suite hooks require a destructured fixture argument.
    beforeAll(async ({}, suite) => {
      base = await inputDatabase("native", 45, (phase, closed) => {
        suite.meta.inputStage = phase;
        suite.meta.inputClosed = closed;
      });
      const keyBytes = randomBytes(32);
      protector = createDriveSecretProtector({
        activeKid: "source",
        keys: new Map([["source", keyBytes]]),
      });
      keyBytes.fill(0);
      localDirectory = path.join(inputRoot(), "native-originals");
      mkdirSync(localDirectory, { mode: 0o700 });
      storage = new FileObjectStorage(localDirectory);
      const realOpen = storage.openOwnedRead.bind(storage);
      vi.spyOn(storage, "openOwnedRead").mockImplementation(
        async (key, signal) => {
          const handle = await realOpen(key, signal);
          fdOpened++;
          void handle.closed.then(
            () => {
              fdClosed++;
            },
            () => {},
          );
          return handle;
        },
      );
      execution = new NodeDriveExecution(id(980001));
      const factory: DriveRequestFactory = (original, options, reply) => {
        const expected = columns[mode][sequence++];
        const isMetadata =
          original.searchParams.get("fields") === DRIVE_SOURCE_FILE_FIELDS &&
          [...original.searchParams].length === 1;
        const isDownload = original.search === "?alt=media";
        if (
          !seed ||
          options.method !== "GET" ||
          original.origin !== "https://www.googleapis.com" ||
          original.pathname !== `/drive/v3/files/${seed.record.fileId}` ||
          (expected === "M"
            ? !isMetadata
            : expected === "D"
              ? !isDownload
              : true) ||
          sent >= 24 ||
          requests.size !== 0
        )
          throw Error("INPUT_WIRE_GUARD");
        const headers = options.headers;
        if (
          !headers ||
          !("Authorization" in headers) ||
          headers.Authorization !== "Bearer synthetic-access"
        )
          throw Error("INPUT_WIRE_AUTH");
        const target = new URL(
          original.pathname + original.search,
          `http://127.0.0.1:${port}`,
        );
        const req = request(
          target,
          {
            ...options,
            protocol: "http:",
            hostname: "127.0.0.1",
            host: "127.0.0.1",
            port,
            agent: false,
          },
          (res) => {
            res.once("close", () => {
              responseClosed++;
            });
            reply(res);
            if (mode === "N6" && expected === "D")
              queueMicrotask(() => aborter.abort());
          },
        );
        sent++;
        requests.add(req);
        req.once("close", () => {
          requestClosed++;
          requests.delete(req);
        });
        req.once("socket", (socket) => {
          socketCreated++;
          socket.once("close", () => {
            socketClosed++;
          });
        });
        return req;
      };
      provider = new NodeRegenerationSourceProvider(
        new NodeDriveHttp(execution, factory),
      );
      realPreparer = new NodeLlmSourcePreparer(
        new URL("../../node/llm/sourceWorker.mjs", import.meta.url),
      );
      composition = inputComposition(base, {
        execution,
        provider: wrapperProvider,
        protector,
        preparer,
        local: new NodeLlmSourceReader(storage),
      });
      input = new NodeRegenerationInput(composition.c, composition.services);
      server = createServer((req, res) => {
        received++;
        activeRequests++;
        const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
        let settled = false;
        const end = () => {
          if (!settled) {
            settled = true;
            activeRequests--;
          }
        };
        res.once("close", end);
        if (
          activeRequests !== 1 ||
          received > 24 ||
          req.method !== "GET" ||
          url.pathname !== `/drive/v3/files/${seed.record.fileId}` ||
          req.headers.authorization !== "Bearer synthetic-access"
        ) {
          violations++;
          res.writeHead(403).end();
          return;
        }
        const metadata =
          url.searchParams.get("fields") === DRIVE_SOURCE_FILE_FIELDS;
        const body = metadata
          ? Buffer.from(
              JSON.stringify({
                id: seed.record.fileId,
                parents: [seed.record.folder.id],
                size: String(seed.bytes.length),
                sha256Checksum:
                  mode === "N3" ? "0".repeat(64) : seed.record.sha256,
                trashed: false,
                explicitlyTrashed: false,
                version: mode === "N5" && sequence === 3 ? "2" : "1",
                mimeType: "text/plain",
                capabilities: { canDownload: true },
              }),
            )
          : Buffer.from(seed.bytes);
        if (!metadata && mode === "N4") body[0] = (body[0]! + 1) % 256;
        totalBytes +=
          body.length + Buffer.byteLength(req.rawHeaders.join("\r\n")) + 512;
        if (totalBytes > 2 * 1024 * 1024) {
          violations++;
          res.destroy();
          return;
        }
        res.writeHead(200, {
          "Content-Length": body.length,
          "Content-Type": metadata
            ? "application/json"
            : "application/octet-stream",
        });
        if (!metadata && mode === "N6") res.write(body.subarray(0, 1));
        else res.end(body);
      });
      server.on("connection", (socket) => {
        sockets.add(socket);
        socket.once("close", () => sockets.delete(socket));
      });
      await bounded(
        new Promise<void>((resolve, reject) => {
          server.once("error", reject);
          server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve();
          });
        }),
      );
      const address = server.address();
      if (
        !address ||
        typeof address === "string" ||
        address.address !== "127.0.0.1"
      )
        throw Error("INPUT_ADDRESS");
      port = address.port;
      suite.meta.inputStage = 7;
    });
    beforeEach((ctx) => {
      if (failed) ctx.skip();
      ctx.task.meta.inputStage = 1;
      metas.push(ctx.task.meta);
    });
    afterEach((ctx) => {
      ctx.task.meta.inputCounts = [
        sent,
        received,
        requestClosed,
        responseClosed,
        socketCreated,
        socketClosed,
        activeRequests,
        totalBytes,
        workers.spawned,
        workers.active,
        workers.rows.filter((r) => r.exit).length,
        workers.rows.filter((r) => r.stdout && r.stderr).length,
        workers.rows.reduce((n, r) => n + r.terminate, 0),
        fdOpened,
        fdClosed,
      ];
      if (ctx.task.result?.state !== "pass") failed = true;
    });
    // biome-ignore lint/correctness/noEmptyPattern: Vitest suite hooks require a destructured fixture argument.
    afterAll(async ({}, suite) => {
      aborter.abort();
      await bounded(execution?.stop() ?? Promise.resolve(), 60000);
      for (const req of requests) req.destroy();
      if (server)
        await bounded(
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
        );
      expect(sockets.size).toBe(0);
      expect(requests.size).toBe(0);
      expect(socketClosed).toBe(socketCreated);
      expect(requestClosed).toBe(sent);
      expect(workers.active).toBe(0);
      base?.client.close();
      if (base) {
        suite.meta.inputClosed = true;
        for (const meta of metas) meta.inputClosed = true;
      }
      inputCapacity();
    }, 60000);
    async function setup(next: Mode, n: number) {
      mode = next;
      sequence = 0;
      checks = 0;
      invalidated = false;
      useRealWorker = false;
      aborter = new AbortController();
      seed = await seedInputLlm(base, n, protector, "input text ".repeat(90));
      return input.begin(seed.consumer);
    }
    async function complete(lease: Awaited<ReturnType<typeof input.begin>>) {
      await input.finish(lease);
      const row = await base.uow.run((u) =>
        u.llmConversions.find(lease.receipt.consumer.id),
      );
      expect(row?.sourceMemoryBytes).toBe(0);
      expect(row?.inputReceipt?.state).toBe("closed");
      expect(row?.owner.state).toBe("active");
    }
    async function wireDone(expected: number) {
      expect(sequence).toBe(expected);
      expect(requestClosed).toBe(sent);
      expect(socketClosed).toBe(socketCreated);
      expect(violations).toBe(0);
      expect(
        (await base.uow.run((u) => u.regenerationAttempts.held())).length,
      ).toBe(0);
      expect(execution.unacknowledged(67)).toHaveLength(0);
    }
    it("N1 persisted Drive source to W1 text input and final metadata, active consumer release", async (ctx) => {
      const lease = await setup("N1", 101);
      useRealWorker = true;
      ctx.task.meta.inputStage = 101;
      await input.read(lease, aborter.signal);
      const attempts = await base.uow.run((u) =>
        u.regenerationAttempts.forBinding(seed.binding.id),
      );
      expect(attempts).toHaveLength(1);
      expect(attempts[0]?.completion).toMatchObject({
        callerEnded: true,
        acknowledged: true,
        outcome: "succeeded",
      });
      await expect(
        Promise.resolve().then(() => input.finish(lease)),
      ).rejects.toBeDefined();
      const prepared = await input.prepareText(lease, aborter.signal);
      expect(prepared.blocks).toBeGreaterThan(0);
      expect(workers.rows[0]).toMatchObject({
        message: true,
        exit: true,
        stdout: true,
        stderr: true,
      });
      ctx.task.meta.inputStage = 102;
      await input.finalCheck(lease, aborter.signal);
      await complete(lease);
      await wireDone(4);
    }, 120000);
    it("N2 sequential same-consumer reads keep one receipt and reject overlap", async (ctx) => {
      const lease = await setup("N2", 102);
      ctx.task.meta.inputStage = 201;
      const first = input.read(lease, aborter.signal);
      await expect(input.read(lease, aborter.signal)).rejects.toBeDefined();
      await first;
      await input.prepareText(lease, aborter.signal);
      await input.read(lease, aborter.signal);
      await input.prepareText(lease, aborter.signal);
      const attempts = await base.uow.run((u) =>
        u.regenerationAttempts.forBinding(seed.binding.id),
      );
      expect(attempts.map((a) => a.ordinal)).toEqual([1, 2]);
      expect(lease.receipt.generation).toBe(1);
      await complete(lease);
      await wireDone(6);
    }, 120000);
    for (const [next, n, expected] of [
      ["N3", 103, 1],
      ["N4", 104, 2],
      ["N5", 105, 3],
      ["N6", 106, 2],
    ] as const) {
      it(`${next} rejects unavailable, changed, or aborted bytes without retry`, async (ctx) => {
        const lease = await setup(next, n);
        ctx.task.meta.inputStage = n * 10;
        await expect(input.read(lease, aborter.signal)).rejects.toBeDefined();
        await expect(
          input.prepareText(lease, new AbortController().signal),
        ).rejects.toBeDefined();
        await complete(lease);
        await wireDone(expected);
      }, 120000);
    }
    it("N7 missing close proof holds the reservation despite actual socket closure", async (ctx) => {
      const lease = await setup("N7", 107);
      ctx.task.meta.inputStage = 701;
      const register = execution.register.bind(execution);
      let calls = 0;
      let release: (() => void) | undefined;
      const spy = vi
        .spyOn(execution, "register")
        .mockImplementation((signal) => {
          const done = register(signal);
          return ++calls === 2
            ? () => {
                release = done;
              }
            : done;
        });
      try {
        await expect(input.read(lease, aborter.signal)).rejects.toBeDefined();
        expect(sequence).toBe(2);
        expect(requestClosed).toBe(sent);
        expect(socketClosed).toBe(socketCreated);
        expect(
          (await base.uow.run((u) => u.regenerationAttempts.held()))[0]?.phase,
        ).toBe("unknown");
        await expect(
          Promise.resolve().then(() => input.finish(lease)),
        ).rejects.toBeDefined();
        if (!release) throw Error("INPUT_RELEASE");
        release();
        const proof = execution.unacknowledged(67)[0];
        if (!proof) throw Error("INPUT_PROOF");
        expect(execution.caller(proof.target)).toBe("ended");
        await execution.coordinate("maintenance", () =>
          acknowledgeSourceClosure(composition.c, proof),
        );
        await wireDone(2);
        await expect(
          Promise.resolve().then(() => input.finish(lease)),
        ).rejects.toBeDefined();
      } finally {
        spy.mockRestore();
        release?.();
      }
    }, 120000);
    it("N8 retains buffer until ACK commit and exact read proves a lost response", async (ctx) => {
      const lease = await setup("N8", 108);
      ctx.task.meta.inputStage = 801;
      const reached = gate();
      const resume = gate();
      let armed = false;
      let injected = 0;
      let readbacks = 0;
      const acknowledge = execution.acknowledge.bind(execution);
      const ack = vi
        .spyOn(execution, "acknowledge")
        .mockImplementation(async (proof) => {
          await acknowledge(proof);
          armed = true;
          reached.resolve();
        });
      const adopt = vi.spyOn(composition.memory, "adopt");
      const uow: HollowUnitOfWorkProvider = {
        async run<T>(
          work: (u: HollowUnitOfWorkContext) => Promise<T>,
        ): Promise<T> {
          if (armed) {
            armed = false;
            await resume.promise;
            const value = await base.uow.run(work);
            injected++;
            void value;
            throw new SystemError(SystemErrorCode.DatabaseError, "synthetic");
          }
          if (injected) readbacks++;
          return base.uow.run(work);
        },
      };
      const c: HollowContainer = { ...composition.c, unitOfWorkProvider: uow };
      const owned = new NodeRegenerationInput(c, composition.services);
      const reading = owned.read(lease, aborter.signal);
      void reading.catch(() => {});
      try {
        await bounded(reached.promise);
        expect(adopt).not.toHaveBeenCalled();
        const proof: DriveClosedProof | undefined =
          execution.unacknowledged(67)[0];
        if (!proof) throw Error("INPUT_PROOF");
        expect(execution.caller(proof.target)).toBe("ended");
        expect(
          (await base.uow.run((u) => u.regenerationAttempts.held())).length,
        ).toBe(1);
        await expect(
          Promise.resolve().then(() => owned.finish(lease)),
        ).rejects.toBeDefined();
        resume.resolve();
        await reading;
        expect(injected).toBe(1);
        expect(readbacks).toBeGreaterThanOrEqual(1);
        expect(adopt).toHaveBeenCalledTimes(1);
        await input.prepareText(lease, aborter.signal);
        await complete(lease);
        await wireDone(3);
      } finally {
        resume.resolve();
        ack.mockRestore();
        adopt.mockRestore();
        await reading.catch(() => {});
      }
    }, 120000);
    it("N9 rejects the next wire after current credential invalidation", async (ctx) => {
      const lease = await setup("N9", 109);
      ctx.task.meta.inputStage = 901;
      await expect(input.read(lease, aborter.signal)).rejects.toBeDefined();
      expect(invalidated).toBe(true);
      expect(checks).toBe(2);
      await complete(lease);
      await wireDone(1);
    }, 120000);
    for (const [format, n, cancel] of [
      ["html", 110, false],
      ["markdown", 111, false],
      ["text", 112, true],
    ] as const) {
      it(`W${n - 108} local ${format} input owns file close and actual worker termination`, async (ctx) => {
        ctx.task.meta.inputStage = 1000 + n;
        useRealWorker = true;
        const text =
          format === "html"
            ? "<p>local input</p>"
            : format === "markdown"
              ? "# Local\n\ninput"
              : "local input";
        const local = await seedInputLlm(base, n, protector, text, {
          format,
          drive: false,
        });
        writeFileSync(
          path.join(localDirectory, local.storageKey),
          local.bytes,
          { flag: "wx", mode: 0o600 },
        );
        const lease = await input.begin(local.consumer);
        const controller = new AbortController();
        await input.read(lease, controller.signal);
        expect(fdClosed).toBe(fdOpened);
        // Wait for the public preparer call, not a worker message or a private registry state.
        if (cancel) {
          const started = gate();
          const original = realPreparer.prepare.bind(realPreparer);
          const spy = vi
            .spyOn(realPreparer, "prepare")
            .mockImplementation((value, signal) => {
              const pending = original(value, signal);
              started.resolve();
              return pending;
            });
          const preparing = input.prepareText(lease, controller.signal);
          void preparing.catch(() => {});
          try {
            await bounded(started.promise);
            controller.abort();
            await expect(preparing).rejects.toSatisfy(
              (e) => isLlmOperationError(e) && e.closed,
            );
          } finally {
            spy.mockRestore();
          }
        } else {
          expect(
            (await input.prepareText(lease, controller.signal)).blocks,
          ).toBeGreaterThan(0);
        }
        const row = workers.rows.at(-1);
        expect(row).toMatchObject({ exit: true, stdout: true, stderr: true });
        await complete(lease);
      }, 45000);
    }
    it("finishes the exact wire/worker budgets and retains only the conservative unknown reservation", async (ctx) => {
      ctx.task.meta.inputStage = 9090;
      expect(sent).toBe(24);
      expect(received).toBe(24);
      expect(responseClosed).toBe(24);
      expect(totalBytes).toBeLessThanOrEqual(2 * 1024 * 1024);
      expect(violations).toBe(0);
      expect(activeRequests).toBe(0);
      expect(workers.spawned).toBe(4);
      expect(workers.active).toBe(0);
      expect(workers.rows.every((r) => r.exit && r.stdout && r.stderr)).toBe(
        true,
      );
      expect(fdOpened).toBe(3);
      expect(fdClosed).toBe(3);
      expect(
        (await base.client.execute("PRAGMA foreign_key_check")).rows,
      ).toHaveLength(0);
      expect(
        (
          await base.client.execute(
            "SELECT sum(source_memory_bytes) AS n FROM llm_conversions",
          )
        ).rows[0]?.n,
      ).toBe(52428800);
      expect(
        await base.uow.run((u) => u.regenerationAttempts.held()),
      ).toHaveLength(0);
      expect(execution.unacknowledged(67)).toHaveLength(0);
    });
  },
);
