import { closeSync, constants, fstatSync, fsyncSync, ftruncateSync, openSync, realpathSync, writeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire, syncBuiltinESMExports } from "node:module";
import type { ChildProcess } from "node:child_process";
import { ForksPoolWorker, type PoolOptions } from "vitest/node";
import { defineConfig } from "vitest/config";
import type { Reporter } from "vitest/reporters";
import type { TestCase, TestModule } from "vitest/node";

const source = "/Users/hikaru/github.com/tuanemuy/hollow-p5c-formats-c2a3d45f-20261006";
const root = "/Users/hikaru/.local/share/hollow-validation/p5c-s4-c-b5860f4e";
const node = "/nix/store/a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node";
const group = process.env["HOLLOW_S4_GROUP"];
if (
  realpathSync(process.execPath) !== node ||
  process.versions.node !== "24.18.0" ||
  process.env["HOLLOW_S4_ROOT"] !== root ||
  (group !== "native-e" && group !== "tool-fork" && group !== "app-c")
) throw new Error("S4_TOOL_BINDING");
const receipt = Buffer.from(JSON.stringify({
  pid: process.pid,
  execPath: realpathSync(process.execPath),
  version: process.versions.node,
  group,
}));
if (receipt.length > 512) throw new Error("S4_TOOL_RECEIPT_CAP");
const fd = openSync(`${root}/records/node-${group}-${process.pid}.json`, "wx", 0o600);
try {
  let position = 0;
  while (position < receipt.length) position += writeSync(fd, receipt.subarray(position));
  fsyncSync(fd);
} finally {
  closeSync(fd);
}
const native = "packages/core/src/adapters/libsql/__tests__/llmLocalFormatsNative.integration.test.ts";
const pure = "packages/core/src/application/regeneration/localFormats.test.ts";
const app = "packages/core/src/adapters/libsql/__tests__/llmLocalFormats.integration.test.ts";
const appC = group === "app-c";
const toolOnly = group === "tool-fork";
const selectedName = "S4-P typed local input and exact opaque lifetime > V3 retains raster while original receipt can close";
const skippedNames = [
  ...[
    "V2 docx closes original input independently of segments",
    "V2 xlsx closes original input independently of segments",
    "V2 pptx closes original input independently of segments",
    "V2 pdf closes original input independently of segments",
    "classify and redraw use distinct fresh generations and reject old leases",
    "unfinished native work retains its slot and cannot issue finish proof",
    "consumed proof cannot close a replacement generation",
  ].map((title) => `S4-P typed local input and exact opaque lifetime > ${title}`),
  ...[
    "reserved birth is durable and parent absence never substitutes for missing child identity",
    "known child alive or unknown absence blocks acquire; all actual absences permit exact preview proof",
    "closed journal requires individual known child absence and preserves exact birth token",
    "record2 leased-text capability never proves a local preview input",
  ].map((title) => `S4-P record3 birth and capability > ${title}`),
];
const skipCases = new Map<string, { test: TestCase; result: boolean }>();
const toolCase = { readyCount: 0, resultCount: 0, sameIdentity: false, selectedPassed: false, skipReadyCount: 0, skipResultCount: 0, skipSameIdentity: false, skipUnstarted: false, total: null as number | null, skipped: null as number | null };
const isUnstartedSkip = (test: TestCase) => skippedNames.includes(test.fullName) && test.options.mode === "skip" && test.result().state === "skipped" && test.diagnostic() === undefined;
let readyCase: TestCase | undefined;
const errorClasses = ["Error", "TypeError", "RangeError", "AssertionError", "SystemError", "BusinessRuleError", "LibsqlError", "SqliteError"] as const;
const nativeCodes = ["ENOENT", "EEXIST", "EACCES", "EPERM", "ERR_MODULE_NOT_FOUND", "SQLITE_ERROR", "SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_CONSTRAINT", "SQLITE_CONSTRAINT_FOREIGNKEY", "SQLITE_CANTOPEN"] as const;
const assertionAtoms = ["queued", "classifying", "preparing", "dispatching", "response-ready", "finalizing", "terminal", "pending", "succeeded", "failed", "cancelled", "unknown", "true", "false"] as const;
const assertionAtom = (value: unknown) => assertionAtoms.find((atom) => atom === value) ?? null;
const safeError = (error: unknown) => {
  const name = typeof error === "object" && error !== null && "name" in error ? error.name : undefined;
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  return {
    errorClass: errorClasses.find((value) => value === name) ?? "unknown",
    nativeCode: nativeCodes.find((value) => value === code) ?? "unknown",
    expectedAtom: name === "AssertionError" && typeof error === "object" && error !== null && "expected" in error ? assertionAtom(error.expected) : null,
    actualAtom: name === "AssertionError" && typeof error === "object" && error !== null && "actual" in error ? assertionAtom(error.actual) : null,
  };
};
const observerFile = `${root}/records/reporter-${group}.json`;
const observerState: {
  group: typeof group;
  phase: "init" | "collected" | "module-start" | "module-end" | "hook-start" | "hook-end" | "case-ready" | "case-end" | "run-end";
  hook: "beforeAll" | "afterAll" | "beforeEach" | "afterEach" | null;
  hookStarts: number;
  hookEnds: number;
  caseStates: Array<"passed" | "failed" | "skipped" | "pending">;
  errors: ReturnType<typeof safeError>[];
  overflow: boolean;
  callbacks: number;
  runReason: "passed" | "failed" | "interrupted" | null;
} = { group, phase: "init", hook: null, hookStarts: 0, hookEnds: 0, caseStates: [], errors: [], overflow: false, callbacks: 0, runReason: null };
let observerIdentity: { ino: number; dev: number } | undefined;
const persistObserver = (create = false) => {
  const data = Buffer.from(JSON.stringify({ ...observerState, ...(toolOnly ? { toolCase } : {}) }));
  if (data.length > 8192 || observerState.callbacks > 128) throw new Error("S4_DIAGNOSTIC_CAP");
  const fd = openSync(observerFile, (create ? constants.O_CREAT | constants.O_EXCL : 0) | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.nlink !== 1 || (info.mode & 0o777) !== 0o600 || info.uid !== process.getuid?.()) throw new Error("S4_DIAGNOSTIC_FILE");
    if (create) observerIdentity = { ino: info.ino, dev: info.dev };
    if (!observerIdentity || info.ino !== observerIdentity.ino || info.dev !== observerIdentity.dev) throw new Error("S4_DIAGNOSTIC_IDENTITY");
    let position = 0;
    while (position < data.length) {
      const written = writeSync(fd, data.subarray(position), position);
      if (written <= 0) throw new Error("S4_DIAGNOSTIC_WRITE");
      position += written;
    }
    ftruncateSync(fd, data.length);
    fsyncSync(fd);
  } finally { closeSync(fd); }
};
const checkModule = (module: TestModule) => {
  if (module.moduleId !== `${source}/${toolOnly ? pure : appC ? app : native}`) throw new Error("S4_DIAGNOSTIC_MODULE");
};
const addErrors = (errors: readonly unknown[]) => {
  for (const error of errors.slice(0, 16)) {
    if (observerState.errors.length >= 16) { observerState.overflow = true; break; }
    observerState.errors.push(safeError(error));
  }
  if (errors.length > 16) observerState.overflow = true;
};
const updateObserver = (phase: typeof observerState.phase) => {
  observerState.phase = phase;
  observerState.callbacks += 1;
  persistObserver();
};
const observer: Reporter = {
  onInit() { persistObserver(true); },
  onTestModuleCollected(module) { checkModule(module); updateObserver("collected"); },
  onTestModuleStart(module) { checkModule(module); updateObserver("module-start"); },
  onTestModuleEnd(module) {
    checkModule(module);
    if (toolOnly) {
      const tests = [...module.children.allTests()];
      if (tests.length !== 12 || tests.filter((test) => test.fullName === selectedName).length !== 1) throw new Error("S4_TOOL_CASES");
      const selected = tests.find((test) => test.fullName === selectedName);
      toolCase.total = tests.length;
      toolCase.skipped = tests.filter((test) => test.fullName !== selectedName && test.result().state === "skipped").length;
      toolCase.skipSameIdentity = skipCases.size === 11 && tests.filter((test) => test.fullName !== selectedName).every((test) => {
        const skipped = skipCases.get(test.fullName);
        return skipped?.test === test && skipped.result;
      });
      toolCase.skipUnstarted = tests.filter((test) => test.fullName !== selectedName).every(isUnstartedSkip);
      if (selected !== readyCase || selected?.result().state !== "passed" || toolCase.skipped !== 11 || !toolCase.sameIdentity || !toolCase.selectedPassed || toolCase.readyCount !== 1 || toolCase.resultCount !== 1 || toolCase.skipReadyCount !== 11 || toolCase.skipResultCount !== 11 || !toolCase.skipSameIdentity || !toolCase.skipUnstarted) throw new Error("S4_TOOL_CASES");
    }
    addErrors(module.errors()); updateObserver("module-end");
  },
  onTestCaseReady(test) {
    if (!toolOnly) return;
    checkModule(test.module);
    if (test.fullName !== selectedName) {
      if (!isUnstartedSkip(test) || skipCases.has(test.fullName) || skipCases.size >= 11) throw new Error("S4_TOOL_CASE_IDENTITY");
      skipCases.set(test.fullName, { test, result: false }); toolCase.skipReadyCount += 1;
      updateObserver("case-ready"); return;
    }
    if (readyCase !== undefined || test.options.mode !== "run") throw new Error("S4_TOOL_CASE_IDENTITY");
    readyCase = test; toolCase.readyCount += 1; updateObserver("case-ready");
  },
  onHookStart(hook) {
    checkModule(hook.entity.type === "module" ? hook.entity : hook.entity.module);
    observerState.hook = hook.name;
    observerState.hookStarts += 1;
    updateObserver("hook-start");
  },
  onHookEnd(hook) {
    checkModule(hook.entity.type === "module" ? hook.entity : hook.entity.module);
    observerState.hook = hook.name;
    observerState.hookEnds += 1;
    if (hook.entity.type === "test") addErrors(hook.entity.result().errors ?? []);
    else addErrors(hook.entity.errors());
    updateObserver("hook-end");
  },
  onTestCaseResult(test) {
    checkModule(test.module);
    if (observerState.caseStates.length >= 24) throw new Error("S4_DIAGNOSTIC_CAP");
    const result = test.result();
    if (toolOnly) {
      if (test.fullName === selectedName) {
        if (test !== readyCase || toolCase.resultCount !== 0 || test.options.mode !== "run") throw new Error("S4_TOOL_CASE_IDENTITY");
        toolCase.resultCount += 1; toolCase.sameIdentity = test === readyCase;
        toolCase.selectedPassed = result.state === "passed";
      } else {
        const skipped = skipCases.get(test.fullName);
        if (!isUnstartedSkip(test) || !skipped || skipped.test !== test || skipped.result || toolCase.skipResultCount >= 11) throw new Error("S4_TOOL_CASE_IDENTITY");
        skipped.result = true; toolCase.skipResultCount += 1;
      }
    }
    observerState.caseStates.push(result.state);
    addErrors(result.errors ?? []);
    updateObserver("case-end");
  },
  onTestRunEnd(modules, errors, reason) {
    if (modules.length > 1) throw new Error("S4_DIAGNOSTIC_MODULE");
    for (const module of modules) { checkModule(module); addErrors(module.errors()); }
    addErrors(errors);
    observerState.runReason = reason;
    updateObserver("run-end");
  },
};

const forkState = {
  version: 1, attempts: 0, handles: 0, pidKnown: false, connectedInitially: false,
  exit: null as number | null, signal: null as "SIGTERM" | "SIGKILL" | null,
  actualClose: false, absent: null as boolean | null, requestedStop: false,
  termRequested: false, killRequested: false, stdinFinish: false, stdinClosed: false,
  stdoutEOF: false, stdoutClosed: false, stderrEOF: false, stderrClosed: false,
  disconnected: false, channelReleased: false, ipcEOF: null, ipcFDClosed: null,
};
const forkFile = `${root}/records/fork-ledger.json`;
let forkIdentity: { dev: number; ino: number } | undefined;
const persistFork = (create = false) => {
  const bytes = Buffer.from(JSON.stringify(forkState));
  if (bytes.length > 8192) throw new Error("S4_FORK_CAP");
  const fd = openSync(forkFile, constants.O_WRONLY | constants.O_NOFOLLOW | (create ? constants.O_CREAT | constants.O_EXCL : 0), 0o600);
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.nlink !== 1 || info.uid !== process.getuid?.() || (info.mode & 0o777) !== 0o600) throw new Error("S4_FORK_FILE");
    if (create) forkIdentity = { dev: info.dev, ino: info.ino };
    if (!forkIdentity || info.dev !== forkIdentity.dev || info.ino !== forkIdentity.ino) throw new Error("S4_FORK_IDENTITY");
    let offset = 0;
    while (offset < bytes.length) {
      const written = writeSync(fd, bytes.subarray(offset), offset);
      if (written < 1) throw new Error("S4_FORK_WRITE");
      offset += written;
    }
    ftruncateSync(fd, bytes.length); fsyncSync(fd);
  } finally { closeSync(fd); }
};
class ObservedFork extends ForksPoolWorker {
  override readonly cacheFs = false;
  private actual: ChildProcess | undefined;
  override async start() {
    const cm: typeof import("node:child_process") = createRequire(import.meta.url)("node:child_process");
    const original = cm.fork;
    const observed = new Proxy(original, {
      apply: (target, receiver, values: Parameters<typeof original>) => {
        const [file, args, options] = values;
        if (forkState.attempts !== 0 || file !== this.entrypoint || realpathSync(file) !== file || !Array.isArray(args) || args.length !== 0 || !options || options.execArgv !== this.execArgv || options.env !== this.env || options.stdio !== "pipe" || options.serialization !== "advanced") throw new Error("S4_FORK_BINDING");
        forkState.attempts++; persistFork(true);
        const actual = Reflect.apply(target, receiver, values);
        this.actual = actual; forkState.handles++;
        const pid = actual.pid;
        forkState.pidKnown = typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0;
        forkState.connectedInitially = actual.connected;
        actual.once("exit", (code, signal) => { forkState.exit = code; forkState.signal = signal === "SIGTERM" || signal === "SIGKILL" ? signal : null; persistFork(); });
        actual.once("close", () => { forkState.actualClose = true; forkState.channelReleased = actual.channel == null; persistFork(); });
        actual.once("disconnect", () => { forkState.disconnected = !actual.connected; forkState.channelReleased = actual.channel == null; persistFork(); });
        actual.once("error", () => { forkState.absent = null; persistFork(); });
        actual.stdin?.once("finish", () => { forkState.stdinFinish = true; persistFork(); });
        actual.stdin?.once("close", () => { forkState.stdinClosed = true; persistFork(); });
        actual.stdout?.once("end", () => { forkState.stdoutEOF = true; persistFork(); });
        actual.stdout?.once("close", () => { forkState.stdoutClosed = true; persistFork(); });
        actual.stderr?.once("end", () => { forkState.stderrEOF = true; persistFork(); });
        actual.stderr?.once("close", () => { forkState.stderrClosed = true; persistFork(); });
        const kill = actual.kill;
        actual.kill = function (...args) {
          if (args[0] === undefined || args[0] === "SIGTERM") forkState.termRequested = true;
          if (args[0] === "SIGKILL") forkState.killRequested = true;
          persistFork(); return kill.apply(this, args);
        };
        if (!forkState.pidKnown || !actual.stdin || !actual.stdout || !actual.stderr || !actual.connected) throw new Error("S4_FORK_HANDLE");
        persistFork(); return actual;
      },
    });
    cm.fork = observed; syncBuiltinESMExports();
    try { await super.start(); }
    finally {
      if (cm.fork !== observed) throw new Error("S4_FORK_RESTORATION");
      cm.fork = original; syncBuiltinESMExports();
    }
  }
  override async stop() {
    forkState.requestedStop = true; persistFork();
    await super.stop();
    const actual = this.actual; const pid = actual?.pid;
    if (!actual || !pid) throw new Error("S4_FORK_HANDLE");
    actual.stdout?.resume(); actual.stderr?.resume();
    const end = performance.now() + 10_000;
    while (performance.now() < end && !(forkState.actualClose && forkState.stdinClosed && forkState.stdoutEOF && forkState.stdoutClosed && forkState.stderrEOF && forkState.stderrClosed && forkState.disconnected && forkState.channelReleased)) await new Promise((resolve) => setTimeout(resolve, 20));
    try { process.kill(pid, 0); forkState.absent = false; }
    catch (error) { forkState.absent = typeof error === "object" && error !== null && "code" in error && error.code === "ESRCH" ? true : null; }
    persistFork();
    if (!(forkState.absent === true && forkState.actualClose && forkState.stdinClosed && forkState.stdoutEOF && forkState.stdoutClosed && forkState.stderrEOF && forkState.stderrClosed && forkState.disconnected && forkState.channelReleased && !forkState.killRequested && ((forkState.exit === 0 && forkState.signal === null) || (forkState.exit === null && forkState.signal === "SIGTERM" && forkState.termRequested)))) throw new Error("S4_FORK_CLOSURE");
  }
}

export default defineConfig({
  root: source,
  envDir: false,
  cacheDir: `${root}/cache`,
  test: {
    environment: "node",
    include: [toolOnly ? pure : appC ? app : native],
    setupFiles: [fileURLToPath(import.meta.url)],
    pool: { name: "s4-observed-forks", createPoolWorker: (options: PoolOptions) => new ObservedFork(options) },
    maxWorkers: 1,
    maxConcurrency: 1,
    cache: false,
    watch: false,
    fileParallelism: false,
    bail: 1,
    testTimeout: toolOnly ? 30_000 : 40_000,
    hookTimeout: 60_000,
    teardownTimeout: 10_000,
    reporters: ["json", observer],
    silent: true,
  },
});
