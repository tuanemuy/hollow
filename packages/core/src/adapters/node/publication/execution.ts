import { type ChildProcess, fork } from "node:child_process";
import { existsSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  SystemError,
  SystemErrorCode,
  UnauthorizedError,
} from "@repo/core/application/errors";
import type {
  PublicDiscoveryExecution,
  PublicDiscoveryRequest,
  PublicDiscoveryResponse,
} from "@repo/core/application/publication/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  remainingSearchMs,
  SEARCH_BUDGET_MS,
  searchCanStart,
  searchDeadline,
  searchNow,
} from "../browse/searchDeadline";
import {
  type SearchDiagnostic,
  searchDiagnosticSchema,
} from "../browse/searchDiagnostic";
import { publicChildReplySchema, publicResponseSchema } from "./wire";

export { SEARCH_BUDGET_MS } from "../browse/searchDeadline";

const unavailable = () =>
  new SystemError(
    SystemErrorCode.PublicSearchBusy,
    "検索を完了できませんでした。条件を短くして再試行してください。",
  );
type Task = {
  id: number;
  started: number;
  request: PublicDiscoveryRequest;
  deadline: bigint;
  resolve: (r: PublicDiscoveryResponse) => void;
  reject: (e: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  detach: () => void;
  settled: boolean;
};
type Active = {
  task: Task;
  child: ChildProcess;
  closed: Promise<void>;
  close: () => void;
};

export class NodePublicDiscoveryExecution implements PublicDiscoveryExecution {
  private sequence = 0;
  private readonly queue: Task[] = [];
  private active: Active | null = null;
  private stopped = false;
  private stopping: Promise<void> | null = null;
  constructor(
    private readonly config: Readonly<{
      childPath: string;
      workerPath: string;
      databaseUrl: string;
      observe?: (event: SearchDiagnostic) => void;
    }>,
  ) {
    if (
      !existsSync(config.childPath) ||
      !existsSync(config.workerPath) ||
      !config.databaseUrl.startsWith("file:") ||
      !existsSync(config.databaseUrl.slice(5))
    )
      throw unavailable();
  }
  execute(
    request: PublicDiscoveryRequest,
    signal?: AbortSignal,
  ): Promise<PublicDiscoveryResponse> {
    if (this.stopped || this.queue.length >= 16 || signal?.aborted)
      return Promise.reject(unavailable());
    return new Promise((resolve, reject) => {
      const task: Task = {
        id: ++this.sequence,
        started: performance.now(),
        request,
        deadline: searchDeadline(),
        resolve,
        reject,
        settled: false,
        detach: () => {},
        timer: setTimeout(() => this.cancel(task), SEARCH_BUDGET_MS),
      };
      const abort = () => this.cancel(task);
      signal?.addEventListener("abort", abort, { once: true });
      task.detach = () => signal?.removeEventListener("abort", abort);
      this.queue.push(task);
      this.observe(task, "accepted");
      this.pump();
    });
  }
  private observe(
    task: Task,
    stage: SearchDiagnostic["stage"],
    details: Pick<SearchDiagnostic, "remainingMs" | "code" | "signal"> = {},
  ) {
    try {
      this.config.observe?.({
        request: task.id,
        stage,
        elapsedMs: performance.now() - task.started,
        queue: this.queue.length,
        ...details,
      });
    } catch {
      // A diagnostic sink cannot change request or resource ownership.
    }
  }
  private settle(task: Task, value: PublicDiscoveryResponse | Error) {
    if (task.settled) return;
    task.settled = true;
    clearTimeout(task.timer);
    task.detach();
    if (value instanceof Error) task.reject(value);
    else task.resolve(value);
  }
  private cancel(task: Task) {
    this.observe(task, "cancel");
    this.settle(task, unavailable());
    if (this.active?.task === task) this.active.child.kill("SIGKILL");
    else {
      const i = this.queue.indexOf(task);
      if (i >= 0) this.queue.splice(i, 1);
    }
  }
  private pump() {
    if (this.active || this.stopped) return;
    const task = this.queue.shift();
    if (!task) return;
    if (task.settled || !searchCanStart(task.deadline)) {
      this.settle(task, unavailable());
      this.pump();
      return;
    }
    let child: ChildProcess;
    this.observe(task, "fork", {
      remainingMs: remainingSearchMs(task.deadline),
    });
    try {
      // Web runtime ambient bindings do not apply to this IPC-only child.
      child = fork(this.config.childPath, [String(task.deadline)], {
        execArgv: [],
        env: {} as NodeJS.ProcessEnv,
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      });
    } catch {
      this.observe(task, "fork-error");
      this.settle(task, unavailable());
      this.pump();
      return;
    }
    let close = () => {};
    const closed = new Promise<void>((resolve) => {
      close = resolve;
    });
    const active: Active = { task, child, closed, close };
    this.active = active;
    let result: PublicDiscoveryResponse | Error = unavailable();
    child.on("message", (message) => {
      const diagnostic = searchDiagnosticSchema.safeParse(message);
      if (diagnostic.success) {
        this.observe(task, diagnostic.data.stage, {
          remainingMs: diagnostic.data.remainingMs,
        });
        return;
      }
      const parsed = publicChildReplySchema.safeParse(message);
      if (!parsed.success) {
        this.observe(task, "invalid-reply");
        result = unavailable();
        child.kill("SIGKILL");
        return;
      }
      const reply = parsed.data;
      this.observe(task, "result");
      if (reply.kind === "result")
        result = publicResponseSchema.parse(reply.value);
      else {
        const e = reply.error;
        result =
          e.kind === "business"
            ? new BusinessRuleError(e.code, e.message)
            : e.kind === "unauthorized"
              ? new UnauthorizedError(e.code, e.message)
              : e.kind === "notFound"
                ? new NotFoundError(e.code, e.message)
                : e.kind === "forbidden"
                  ? new ForbiddenError(e.code, e.message)
                  : e.kind === "conflict"
                    ? new ConflictError(e.code, e.message)
                    : unavailable();
      }
    });
    child.once("error", () => {
      this.observe(task, "child-error");
      result = unavailable();
    });
    child.once("close", (code, signal) => {
      this.observe(task, "close", {
        code,
        signal,
        remainingMs: remainingSearchMs(task.deadline),
      });
      if (this.active !== active) return;
      this.active = null;
      close();
      this.settle(
        task,
        code === 0 && searchNow() <= task.deadline ? result : unavailable(),
      );
      this.pump();
    });
    child.send(
      {
        request: task.request,
        databaseUrl: this.config.databaseUrl,
        workerPath: this.config.workerPath,
      },
      (error) => {
        if (error) this.cancel(task);
      },
    );
  }
  stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    this.stopped = true;
    for (const task of [...this.queue]) this.cancel(task);
    const active = this.active;
    if (!active) return Promise.resolve();
    this.cancel(active.task);
    this.stopping = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(unavailable()), SEARCH_BUDGET_MS);
      active.closed.then(() => {
        clearTimeout(timer);
        resolve();
      }, reject);
    });
    return this.stopping;
  }
}
