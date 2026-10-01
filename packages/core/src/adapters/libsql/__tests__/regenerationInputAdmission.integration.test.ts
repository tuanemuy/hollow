import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import {
  beginInput,
  finishInput,
} from "@repo/core/application/regeneration/memory";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  inputCapacity,
  inputComposition,
  inputDatabase,
  inputId,
  inputProtector,
  seedInputMachine,
} from "./regenerationInputFixtures";

declare module "vitest" {
  interface TaskMeta {
    inputStage?: number;
    inputClosed?: boolean;
  }
}

function gate() {
  let release: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe
  .skipIf(!process.env.HOLLOW_REGENERATION_INPUT_ROOT)
  .sequential(
    "0043 exclusive input admission with one real database",
    { timeout: 10_000 },
    () => {
      let base: Awaited<ReturnType<typeof inputDatabase>>;
      let composition: ReturnType<typeof inputComposition>;
      let failed = false;
      let deadline = 0;
      let stage: (value: number) => void = () => {};
      const metas: { inputClosed?: boolean }[] = [];
      const withinBudget = () => {
        if (Date.now() > deadline) throw Error("INPUT_ADMISSION_DEADLINE");
      };
      const boundary = async (work: () => Promise<void>) => {
        try {
          withinBudget();
          await work();
          withinBudget();
        } catch (error) {
          failed = true;
          throw error;
        }
      };

      // biome-ignore lint/correctness/noEmptyPattern: Vitest suite hooks require a destructured fixture argument.
      beforeAll(async ({}, suite) => {
        deadline = Date.now() + 120_000;
        suite.meta.inputStage = 1;
        suite.meta.inputClosed = false;
        try {
          base = await inputDatabase("application", 43, (phase, closed) => {
            suite.meta.inputStage = phase;
            suite.meta.inputClosed = closed;
          });
          composition = inputComposition(base);
          withinBudget();
          suite.meta.inputStage = 7;
        } catch (error) {
          failed = true;
          throw error;
        }
      }, 60_000);

      beforeEach((ctx) => {
        if (failed) ctx.skip();
        withinBudget();
        ctx.task.meta.inputStage = 1;
        ctx.task.meta.inputClosed = false;
        metas.push(ctx.task.meta);
        stage = (value) => {
          withinBudget();
          ctx.task.meta.inputStage = value;
        };
      });
      afterEach((ctx) => {
        if (ctx.task.result?.state !== "pass") failed = true;
      });

      // biome-ignore lint/correctness/noEmptyPattern: Vitest suite hooks require a destructured fixture argument.
      afterAll(async ({}, suite) => {
        let stopped = !composition;
        let closed = !base;
        let failure: unknown;
        suite.meta.inputStage = 90;
        try {
          await composition?.execution.stop();
          stopped = true;
          suite.meta.inputStage = 91;
        } catch (error) {
          failure = error;
        }
        try {
          base?.client.close();
          closed = true;
          const capacity = inputCapacity();
          expect(capacity.bytes).toBeLessThanOrEqual(64 * 1024 * 1024);
          expect(capacity.dbBytes).toBeLessThanOrEqual(16 * 1024 * 1024);
          withinBudget();
          if (!failure) suite.meta.inputStage = 92;
        } catch (error) {
          failure ??= error;
        } finally {
          suite.meta.inputClosed = stopped && closed;
          for (const meta of metas) meta.inputClosed = stopped && closed;
        }
        if (failure) throw failure;
      }, 5_000);

      const seed = (n: number) =>
        seedInputMachine(base, n, inputProtector, false, undefined, stage);
      const row = (consumer: { kind: "machine-regeneration"; id: string }) =>
        base.uow.run((u) => u.machineRegenerations.find(consumer.id));

      function instrument(beforeRun: () => Promise<void> = async () => {}) {
        const state = {
          calls: 0,
          replacements: 0,
          saved: 0,
          commits: 0,
          loseNextReply: false,
        };
        const lostReply = Error("INPUT_ADMISSION_COMMIT_REPLY_UNKNOWN");
        const provider: HollowUnitOfWorkProvider = {
          async run<T>(
            work: (u: HollowUnitOfWorkContext) => Promise<T>,
          ): Promise<T> {
            state.calls++;
            await beforeRun();
            const result = await base.uow.run((u) =>
              work({
                ...u,
                machineRegenerations: {
                  insert: (value) => u.machineRegenerations.insert(value),
                  find: (id) => u.machineRegenerations.find(id),
                  command: (executorId, commandId) =>
                    u.machineRegenerations.command(executorId, commandId),
                  remove: (id) => u.machineRegenerations.remove(id),
                  async replace(value, expectedVersion) {
                    state.replacements++;
                    const saved = await u.machineRegenerations.replace(
                      value,
                      expectedVersion,
                    );
                    if (saved) state.saved++;
                    return saved;
                  },
                },
              }),
            );
            state.commits++;
            if (state.loseNextReply) {
              state.loseNextReply = false;
              throw lostReply;
            }
            return result;
          },
        };
        const c: HollowContainer = {
          ...composition.c,
          unitOfWorkProvider: provider,
        };
        return { c, state, lostReply };
      }

      it("preserves closed generation after reply loss, reconciles the old proof, then completes generation two", async () =>
        boundary(async () => {
          const p = await seed(1);
          const f = instrument();
          stage(201);
          const first = await beginInput(f.c, composition.services, p.consumer);
          const proof = composition.memory.finish(first, inputId(810001));
          f.state.loseNextReply = true;
          stage(202);
          await expect(
            finishInput(f.c, composition.services, proof),
          ).rejects.toBe(f.lostReply);
          const before = await row(p.consumer);
          expect(before).toMatchObject({
            sourceMemoryBytes: 0,
            inputReceipt: { state: "closed", generation: 1 },
          });
          expect(composition.memory.verify(proof, proof.receipt)).toBe(true);
          const counts = { ...f.state };
          stage(203);
          await expect(
            beginInput(f.c, composition.services, p.consumer),
          ).rejects.toBeDefined();
          expect(f.state).toEqual(counts);
          expect(await row(p.consumer)).toEqual(before);
          expect(composition.memory.verify(proof, proof.receipt)).toBe(true);
          stage(204);
          await finishInput(f.c, composition.services, proof);
          expect(f.state.replacements).toBe(2);
          expect(f.state.saved).toBe(2);
          expect(await row(p.consumer)).toEqual(before);
          expect(composition.memory.verify(proof, proof.receipt)).toBe(false);
          stage(205);
          const second = await beginInput(
            f.c,
            composition.services,
            p.consumer,
          );
          expect(second.receipt.generation).toBe(2);
          const secondProof = composition.memory.finish(
            second,
            inputId(810002),
          );
          await finishInput(f.c, composition.services, secondProof);
          expect(await row(p.consumer)).toMatchObject({
            sourceMemoryBytes: 0,
            inputReceipt: { state: "closed", generation: 2 },
            owner: { state: "active" },
          });
          expect(f.state).toEqual({
            calls: 5,
            replacements: 4,
            saved: 4,
            commits: 5,
            loseNextReply: false,
          });
          expect(
            composition.memory.verify(secondProof, secondProof.receipt),
          ).toBe(false);
          stage(209);
        }));

      it("admits one concurrent begin before any database work and completes its only reservation", async () =>
        boundary(async () => {
          const p = await seed(2);
          const entered = gate();
          const proceed = gate();
          const f = instrument(async () => {
            entered.release();
            await proceed.promise;
          });
          stage(301);
          const first = beginInput(f.c, composition.services, p.consumer).then(
            (lease) => ({ kind: "lease" as const, lease }),
            () => ({ kind: "failed" as const }),
          );
          let second: Promise<boolean> | undefined;
          try {
            await Promise.race([entered.promise, first.then(() => undefined)]);
            expect(f.state.calls).toBe(1);
            expect(f.state.replacements).toBe(0);
            stage(302);
            second = beginInput(f.c, composition.services, p.consumer).then(
              () => false,
              () => true,
            );
            expect(f.state.calls).toBe(1);
            expect(f.state.replacements).toBe(0);
            expect(await second).toBe(true);
          } finally {
            proceed.release();
            await first;
            await second;
          }
          const admitted = await first;
          if (admitted.kind !== "lease")
            throw Error("INPUT_ADMISSION_NO_LEASE");
          stage(303);
          expect(f.state).toEqual({
            calls: 1,
            replacements: 1,
            saved: 1,
            commits: 1,
            loseNextReply: false,
          });
          expect(await row(p.consumer)).toMatchObject({
            sourceMemoryBytes: SOURCE_MEMORY_BYTES,
            inputReceipt: { state: "active", generation: 1 },
          });
          const proof = composition.memory.finish(
            admitted.lease,
            inputId(810003),
          );
          await finishInput(f.c, composition.services, proof);
          expect(f.state.saved).toBe(2);
          expect(await row(p.consumer)).toMatchObject({
            sourceMemoryBytes: 0,
            inputReceipt: { state: "closed", generation: 1 },
          });
          expect(composition.memory.verify(proof, proof.receipt)).toBe(false);
          stage(309);
        }));

      it("preserves an uncertain committed active reservation and its intent without admitting another begin", async () =>
        boundary(async () => {
          const p = await seed(3);
          const f = instrument();
          f.state.loseNextReply = true;
          stage(401);
          await expect(
            beginInput(f.c, composition.services, p.consumer),
          ).rejects.toBe(f.lostReply);
          const before = await row(p.consumer);
          expect(before).toMatchObject({
            sourceMemoryBytes: SOURCE_MEMORY_BYTES,
            inputReceipt: { state: "active", generation: 1 },
          });
          expect(f.state).toEqual({
            calls: 1,
            replacements: 1,
            saved: 1,
            commits: 1,
            loseNextReply: false,
          });
          stage(402);
          await expect(
            beginInput(f.c, composition.services, p.consumer),
          ).rejects.toBeDefined();
          expect(f.state).toEqual({
            calls: 1,
            replacements: 1,
            saved: 1,
            commits: 1,
            loseNextReply: false,
          });
          expect(await row(p.consumer)).toEqual(before);
          stage(403);
          expect(
            (await base.client.execute("PRAGMA foreign_key_check")).rows,
          ).toHaveLength(0);
          expect(
            (
              await base.client.execute(
                "SELECT count(*) AS n FROM __drizzle_migrations",
              )
            ).rows[0]?.n,
          ).toBe(44);
          const totals = (
            await base.client.execute(
              "SELECT sum(source_memory_bytes) AS bytes, sum(CASE WHEN source_memory_bytes>0 THEN 1 ELSE 0 END) AS reservations FROM (SELECT source_memory_bytes FROM machine_regenerations UNION ALL SELECT source_memory_bytes FROM llm_conversions UNION ALL SELECT source_memory_bytes FROM llm_pdf_previews)",
            )
          ).rows[0];
          expect(totals?.bytes).toBe(SOURCE_MEMORY_BYTES);
          expect(totals?.reservations).toBe(1);
          expect(
            (
              await base.client.execute(
                "SELECT count(*) AS n FROM machine_regenerations",
              )
            ).rows[0]?.n,
          ).toBe(3);
          stage(409);
        }));
    },
  );
