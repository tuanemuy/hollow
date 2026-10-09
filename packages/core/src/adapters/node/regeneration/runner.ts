import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type {
  MachineAdmission,
  MachineOwnedInput,
  MachineProgress,
} from "@repo/core/application/regeneration/services";
import { sweepMachine } from "@repo/core/application/regeneration/worker";
import {
  MACHINE_HISTORY_LIMIT,
  MACHINE_HISTORY_MS,
} from "@repo/core/domain/regeneration/machine";
export class NodeMachineProgress implements MachineProgress {
  private readonly completions = new Map<
    string,
    { value: MachineOwnedInput; done: Promise<void>; resolve: () => void }
  >();
  constructor(
    private readonly verifyEntry: (value: MachineOwnedInput) => boolean,
    private readonly verifyCompletion: (
      value: MachineOwnedInput,
    ) => Promise<boolean>,
  ) {}
  pendingCompletion(id: string) {
    return this.completions.get(id)?.value ?? null;
  }
  awaitCompletion(value: MachineOwnedInput) {
    const owned = this.owned(value.value.id);
    if (
      !value.proof ||
      !owned ||
      owned.lease !== value.lease ||
      owned.proof !== value.proof ||
      !this.verifyEntry(value)
    )
      return Promise.reject(new Error("MACHINE_COMPLETION_UNPROVEN"));
    const prior = this.completions.get(value.value.id);
    if (prior)
      return prior.value.lease === value.lease &&
        prior.value.proof === value.proof
        ? prior.done
        : Promise.reject(new Error("MACHINE_COMPLETION_UNPROVEN"));
    let resolve!: () => void;
    const done = new Promise<void>((ready) => {
      resolve = ready;
    });
    this.completions.set(value.value.id, { value, done, resolve });
    return done;
  }
  async confirmCompletion(value: MachineOwnedInput) {
    const waiter = this.completions.get(value.value.id);
    if (
      !waiter ||
      waiter.value.lease !== value.lease ||
      waiter.value.proof !== value.proof ||
      !(await this.verifyCompletion(value)) ||
      this.completions.get(value.value.id) !== waiter
    )
      return false;
    this.completions.delete(value.value.id);
    waiter.resolve();
    return true;
  }
  private readonly pending = new Map<string, MachineAdmission>();
  private readonly leases = new Map<string, MachineOwnedInput>();
  admission(id: string) {
    return this.pending.get(id) ?? null;
  }
  admissions() {
    return [...this.pending.values()];
  }
  retainAdmission(value: MachineAdmission) {
    this.pending.set(value.candidate.id, value);
  }
  releaseAdmission(id: string) {
    this.pending.delete(id);
  }
  owned(id: string) {
    return this.leases.get(id) ?? null;
  }
  inputs() {
    return [...this.leases.values()];
  }
  retainInput(value: MachineOwnedInput) {
    this.leases.set(value.value.id, value);
  }
  releaseInput(id: string) {
    this.leases.delete(id);
  }
}
export function createMachineRunner(c: HollowContainer) {
  let stopped = false;
  let finished = false;
  let stopping: Promise<void> | null = null;
  let recoveryFailure: { error: unknown } | null = null;
  let reportRecoveryFailure!: (value: { error: unknown }) => void;
  const recoveryFailed = new Promise<{ error: unknown }>((resolve) => {
    reportRecoveryFailure = resolve;
  });
  let active: Promise<void> | null = null;
  let lastPrune = 0;
  const wake = () => {
    if (finished || active) return;
    const admit = !stopped;
    active = (async () => {
      await sweepMachine(c, admit);
      if (!admit) return;
      const now = c.clock.now();
      if (now.getTime() - lastPrune >= 60000) {
        await c.unitOfWorkProvider.run((u) =>
          u.machineRegenerations.prune(
            new Date(now.getTime() - MACHINE_HISTORY_MS),
            MACHINE_HISTORY_LIMIT,
          ),
        );
        lastPrune = now.getTime();
      }
    })()
      .catch((error: unknown) => {
        if (!admit) {
          recoveryFailure ??= { error };
          reportRecoveryFailure(recoveryFailure);
        }
        c.logger.error("MACHINE_RUNTIME_PROGRESS_UNCONFIRMED");
      })
      .finally(() => {
        active = null;
      });
  };
  const timer = setInterval(wake, 2000);
  timer.unref();
  queueMicrotask(wake);
  const stop = (): Promise<void> => {
    if (stopping) return stopping;
    stopped = true;
    stopping = (async () => {
      try {
        await active;
        for (const input of c.machine?.progress.inputs() ?? [])
          c.machine?.execution.cancel(input.value.id);
        const executionStop = c.machine?.execution.stop();
        wake();
        await Promise.race([
          executionStop,
          recoveryFailed.then(({ error }) => {
            throw error;
          }),
        ]);
      } finally {
        finished = true;
        clearInterval(timer);
        await active;
      }
      if (recoveryFailure) throw recoveryFailure.error;
      await sweepMachine(c, false);
      if (
        (c.machine?.progress.inputs() ?? []).some((input) =>
          c.machine?.progress.pendingCompletion(input.value.id),
        )
      )
        throw new Error("MACHINE_COMPLETION_UNPROVEN");
    })();
    return stopping;
  };
  return { wake, stop };
}
