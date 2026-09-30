import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type {
  DriveClosedProof,
  DriveClosureState,
  DriveExecution,
  DriveExecutionTarget,
  DriveOwnedResult,
  DrivePredecessorProof,
} from "@repo/core/application/integration/drive/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  DriveFailure,
  DriveOwner,
} from "@repo/core/domain/integration/drive";
import { driveFailureSchema } from "@repo/core/domain/integration/drive";

export class DriveTransportError extends Error {
  constructor(
    readonly code: DriveFailure = "DRIVE_UNAVAILABLE",
    readonly delivery: "not-sent" | "unknown" = "unknown",
    readonly credentialRejection:
      | null
      | "access-token"
      | "refresh-token" = null,
  ) {
    super(code);
  }
}
const unavailable = () =>
  new BusinessRuleError(
    "DRIVE_UNAVAILABLE",
    "Drive処理の終了を確認できません。",
  );
const key = (t: DriveExecutionTarget) =>
  JSON.stringify([t.kind, t.id, t.owner.runtimeGeneration, t.owner.token]);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
type Entry = {
  target: DriveExecutionTarget;
  caller: "pending" | "ended";
  claimed: boolean;
  started: boolean;
  workEnded: boolean;
  resources: number;
  controller: AbortController;
  proof: DriveClosedProof | null;
  acknowledged: boolean;
  ended: ReturnType<typeof deferred<void>>;
  closed: ReturnType<typeof deferred<void>>;
};
type Lane = "claim" | "settle" | "maintenance";
type Waiter = { start(): void; lane: Lane };
export type DrivePredecessorStore = Readonly<{
  list(): readonly DrivePredecessorProof[];
  acknowledge(proof: DrivePredecessorProof): Promise<void>;
}>;

export class NodeDriveExecution implements DriveExecution {
  private entries = new Map<string, Entry>();
  private signals = new WeakMap<AbortSignal, Entry>();
  private previousProofs = new Map<string, DriveClosedProof>();
  private queue: Waiter[] = [];
  private locked = false;
  private stopping = false;
  private revision = 0;
  private subscribers = new Set<
    (result: "changed" | "expired" | "stopped") => void
  >();
  private scope = new AsyncLocalStorage<boolean>();
  constructor(
    readonly runtimeGeneration: string,
    private readonly predecessor: DrivePredecessorStore = {
      list: () => [],
      acknowledge: async () => {},
    },
    private readonly deadlines: Readonly<{
      operationMs: number;
      closeMs: number;
      backupMs?: number;
    }> = { operationMs: 30_000, closeMs: 5_000 },
  ) {}

  changeRevision() {
    return this.revision;
  }
  waitForChange(
    revision: number,
    signal?: AbortSignal,
  ): Promise<"changed" | "expired" | "stopped"> {
    if (this.stopping || signal?.aborted) return Promise.resolve("stopped");
    if (revision !== this.revision) return Promise.resolve("changed");
    if (this.subscribers.size >= 100) return Promise.resolve("expired");
    return new Promise((resolve) => {
      let done = false;
      const finish = (result: "changed" | "expired" | "stopped") => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", aborted);
        this.subscribers.delete(finish);
        resolve(result);
      };
      const aborted = () => finish("stopped");
      const timer = setTimeout(() => finish("expired"), 30_000);
      this.subscribers.add(finish);
      signal?.addEventListener("abort", aborted, { once: true });
      if (signal?.aborted) aborted();
    });
  }
  private changed() {
    this.revision =
      this.revision === Number.MAX_SAFE_INTEGER ? 0 : this.revision + 1;
    for (const finish of [...this.subscribers])
      finish(this.stopping ? "stopped" : "changed");
  }

  accepting() {
    return (
      !this.stopping &&
      this.predecessor.list().length === 0 &&
      ![...this.entries.values()].some((e) => e.proof && !e.acknowledged) &&
      this.previousProofs.size === 0
    );
  }
  hasPendingCallers() {
    return [...this.entries.values()].some((e) => e.caller === "pending");
  }
  coordinate<T>(lane: Lane, work: () => Promise<T>): Promise<T> {
    if (this.scope.getStore()) return Promise.reject(unavailable());
    const limit = lane === "claim" ? 100 : lane === "settle" ? 3 : 1;
    if (this.queue.filter((w) => w.lane === lane).length >= limit)
      return Promise.reject(unavailable());
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        lane,
        start: () => {
          this.locked = true;
          Promise.resolve()
            .then(() => this.scope.run(true, work))
            .then(resolve, reject)
            .finally(() => {
              this.locked = false;
              this.next();
            });
        },
      });
      this.next();
    });
  }
  private next() {
    if (this.locked || !this.queue.length) return;
    let index = this.queue.findIndex((w) => w.lane === "settle");
    if (index < 0) index = 0;
    this.queue.splice(index, 1)[0]!.start();
  }
  async withCaller<C, T>(
    target: DriveExecutionTarget,
    claim: () => Promise<C | null>,
    settle: (claimed: C) => Promise<T>,
  ) {
    const id = key(target);
    let entry: Entry | undefined;
    try {
      const value = await this.coordinate("claim", async () => {
        if (
          !this.accepting() ||
          target.owner.runtimeGeneration !== this.runtimeGeneration ||
          this.entries.has(id) ||
          this.entries.size >= 67 ||
          [...this.entries.values()].filter(
            (e) => e.caller === "pending" || !e.proof,
          ).length >= 3 ||
          [...this.entries.values()].filter(
            (e) =>
              (e.target.kind === "backup") === (target.kind === "backup") &&
              (e.caller === "pending" || !e.proof),
          ).length >= (target.kind === "backup" ? 1 : 2) ||
          Buffer.byteLength(JSON.stringify(target)) > 1800
        )
          throw unavailable();
        entry = {
          target: structuredClone(target),
          caller: "pending",
          claimed: false,
          started: false,
          workEnded: false,
          resources: 0,
          controller: new AbortController(),
          proof: null,
          acknowledged: false,
          ended: deferred<void>(),
          closed: deferred<void>(),
        };
        entry.closed.promise.catch(() => {});
        this.entries.set(id, entry);
        const claimed = await claim();
        if (claimed === null) {
          this.entries.delete(id);
          entry.ended.resolve();
          return null;
        }
        entry.claimed = true;
        return claimed;
      });
      if (value === null) return { kind: "not-claimed" as const };
      return { kind: "settled" as const, value: await settle(value) };
    } finally {
      if (entry && this.entries.get(id) === entry) {
        const current = entry;
        await this.coordinate("settle", async () => {
          current.caller = "ended";
          if (!current.started) current.workEnded = true;
          this.observe(current);
          current.ended.resolve();
          this.changed();
          if (current.acknowledged) this.entries.delete(id);
        });
      }
    }
  }
  caller(target: DriveExecutionTarget) {
    return this.entries.get(key(target))?.caller ?? "untracked";
  }
  private observe(e: Entry) {
    if (!e.workEnded || e.resources !== 0 || e.acknowledged) return;
    if (!e.proof)
      e.proof = {
        target: e.target,
        source: "local-close",
        evidenceId: randomUUID(),
      };
    e.closed.resolve();
  }
  /** Request factories register before native creation and release only on all real closes. */
  register(signal: AbortSignal): () => void {
    const entry = this.signals.get(signal);
    if (
      !entry ||
      !entry.started ||
      entry.workEnded ||
      signal.aborted ||
      entry.resources >= (entry.target.kind === "backup" ? 2 : 1)
    )
      throw new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
    entry.resources++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      entry.resources--;
      this.observe(entry);
      this.changed();
    };
  }
  run<T>(
    target: DriveExecutionTarget,
    work: (signal: AbortSignal) => Promise<T>,
  ) {
    const entry = this.entries.get(key(target));
    if (!entry || entry.caller !== "pending" || !entry.claimed || entry.started)
      throw new DriveTransportError("DRIVE_UNAVAILABLE", "not-sent");
    entry.started = true;
    this.signals.set(entry.controller.signal, entry);
    const result = deferred<DriveOwnedResult<T>>();
    let finished = false;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (value: DriveOwnedResult<T>) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      result.resolve(value);
      closeTimer = setTimeout(
        () => entry.closed.reject(unavailable()),
        this.deadlines.closeMs,
      );
      entry.closed.promise.then(
        () => clearTimeout(closeTimer),
        () => clearTimeout(closeTimer),
      );
    };
    const timer = setTimeout(
      () => {
        entry.controller.abort();
        finish({
          kind: "failure",
          code: "DRIVE_UNAVAILABLE",
          delivery: "unknown",
          credentialRejection: null,
        });
      },
      target.kind === "backup"
        ? (this.deadlines.backupMs ?? 1_800_000)
        : this.deadlines.operationMs,
    );
    Promise.resolve()
      .then(() => work(entry.controller.signal))
      .then(
        (value) => finish({ kind: "value", value }),
        (error: unknown) => {
          const parsed =
            error instanceof BusinessRuleError
              ? driveFailureSchema.safeParse(error.code)
              : null;
          finish({
            kind: "failure",
            code:
              error instanceof DriveTransportError
                ? error.code
                : parsed?.success
                  ? parsed.data
                  : "DRIVE_UNAVAILABLE",
            delivery:
              error instanceof DriveTransportError ? error.delivery : "unknown",
            credentialRejection:
              error instanceof DriveTransportError
                ? error.credentialRejection
                : null,
          });
        },
      )
      .finally(() => {
        entry.workEnded = true;
        this.signals.delete(entry.controller.signal);
        this.observe(entry);
      });
    return {
      result: result.promise,
      closed: entry.closed.promise,
      abort: () => entry.controller.abort(),
    };
  }
  closure(target: DriveExecutionTarget): DriveClosureState {
    const entry = this.entries.get(key(target));
    if (entry)
      return entry.proof && !entry.acknowledged
        ? { kind: "closed", proof: entry.proof }
        : { kind: "held" };
    if (
      !this.predecessor
        .list()
        .some((p) => p.runtimeGeneration === target.owner.runtimeGeneration)
    )
      return { kind: "unproven" };
    let proof = this.previousProofs.get(key(target));
    if (!proof) {
      if (this.previousProofs.size + this.entries.size >= 67)
        throw unavailable();
      proof = {
        target: structuredClone(target),
        evidenceId: randomUUID(),
        source: "predecessor-exit",
      };
      this.previousProofs.set(key(target), proof);
    }
    return { kind: "closed", proof };
  }
  unacknowledged(limit: number) {
    return [...this.entries.values()]
      .flatMap((e) => (e.proof && !e.acknowledged ? [e.proof] : []))
      .concat([...this.previousProofs.values()])
      .slice(0, Math.max(0, Math.min(67, limit)));
  }
  async acknowledge(proof: DriveClosedProof) {
    const entry = this.entries.get(key(proof.target));
    const actual = entry?.proof ?? this.previousProofs.get(key(proof.target));
    if (!actual) return;
    if (
      actual.evidenceId !== proof.evidenceId ||
      actual.source !== proof.source
    )
      throw unavailable();
    if (entry) {
      entry.acknowledged = true;
      if (entry.caller === "ended") this.entries.delete(key(proof.target));
    } else this.previousProofs.delete(key(proof.target));
    this.changed();
  }
  predecessors() {
    return this.predecessor.list();
  }
  acknowledgePredecessor(proof: DrivePredecessorProof) {
    if (
      [...this.previousProofs.values()].some(
        (p) => p.target.owner.runtimeGeneration === proof.runtimeGeneration,
      )
    )
      return Promise.reject(unavailable());
    return this.predecessor.acknowledge(proof);
  }
  abort(owner: DriveOwner & { state: "active" | "unknown" }) {
    for (const e of this.entries.values())
      if (
        e.target.owner.token === owner.token &&
        e.target.owner.runtimeGeneration === owner.runtimeGeneration
      )
        e.controller.abort();
  }
  async stop() {
    this.stopping = true;
    this.changed();
    const entries = [...this.entries.values()];
    for (const e of entries) e.controller.abort();
    await Promise.all(entries.map((e) => e.ended.promise));
    if (entries.some((e) => !e.workEnded || e.resources !== 0))
      throw unavailable();
  }
}
