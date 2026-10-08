import childProcess from "node:child_process";
import net from "node:net";
import tls from "node:tls";
import dgram from "node:dgram";
import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import workerThreads from "node:worker_threads";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs, { realpathSync } from "node:fs";
import fsPromises from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

const TREE = "/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006";
const self = fileURLToPath(import.meta.url);
const main = process.argv[1] === self;
const canonicalNode = "/nix/store/a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node";
if (realpathSync(process.execPath) !== canonicalNode || process.versions.node !== "24.18.0") {
  emit({ event: "failure", stage: "bootstrap", code: "P5D_NODE_BINDING", case: "none" });
  throw new Error("P5D_NODE_BINDING");
}
const stages = [
  ["owner-race", "accountDeletionOwnerRace.integration.test.ts", ["OR01"]],
];
let stage = "bootstrap";
let currentCase = "none";
let violation = false;
const originalFork = childProcess.fork;
const nativeLstat = fsPromises.lstat.bind(fsPromises);
const nativeLstatSync = fs.lstatSync.bind(fs);
const nativeReaddirSync = fs.readdirSync.bind(fs);
const children = [];
let fixtureClosed = false;
let caseFailure = false;
const sourceFaultKeys = new Set(["client-bound", "statement-bound", "uow-bound", "observer"]);
const checkpointKeys = new Set(["entry", "race", "fence", "final", "RACE_CALLER_OVERLAP", "RACE_TRANSACTION_RECEIPT", "RACE_WINNER_COUNT", "RACE_LOSER_COUNT", "RACE_ACCEPTED", "RACE_REFUSAL_CLASS", "RACE_REFUSAL_CODE"]);
function emit(value) { if (main) { const frame = `P5D ${JSON.stringify(value)}\n`; if (Buffer.byteLength(frame) > 512) throw new Error("P5D_RESOURCE_DENIED"); process.stdout.write(frame); } }
const reportedDenials = new Set();
const denialMethods = new Set(["dns-query", "socket-connect", "server-listen", "tls-connect", "datagram-create", "node-worker", "child.fork", "child.fork-handles", "harness-argv", "harness-case", "harness-result", ...["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync"].map((name) => `child.${name}`), "fs.open-write", "fs.openSync-write", "fs.promises.open-write", ...["fs", "fs.promises"].flatMap((namespace) => ["writeFile", "writeFileSync", "appendFile", "appendFileSync", "truncate", "truncateSync", "mkdir", "mkdirSync", "mkdtemp", "mkdtempSync", "rm", "rmSync", "rmdir", "rmdirSync", "unlink", "unlinkSync", "rename", "renameSync", "copyFile", "copyFileSync", "link", "linkSync", "symlink", "symlinkSync", "chmod", "chmodSync"].map((name) => `${namespace}.${name}`))]);
function deny(method) {
  violation = true;
  if (!reportedDenials.has(method) && reportedDenials.size < 4) {
    reportedDenials.add(method);
    process.stdout.write(`P5D ${JSON.stringify({ event: "denial", method, context: main ? "node-main" : "vitest-fork" })}\n`);
  }
  throw new Error("P5D_RESOURCE_DENIED");
}
const databaseRoot = process.env.HOLLOW_ACCOUNT_DELETION_OWNER_RACE_ROOT;
const toolTmpRoot = `${databaseRoot}-tool-tmp`;
const toolTmpExpected = JSON.parse(process.env.HOLLOW_P5D_TOOL_TMP_IDENTITY ?? "null");
const projectTmpRegistry = new Map();
function checkToolTmp() {
  if (!toolTmpExpected || Object.keys(toolTmpExpected).sort().join(",") !== "dev,ino" || !Number.isSafeInteger(toolTmpExpected.dev) || !Number.isSafeInteger(toolTmpExpected.ino) || process.env.TMPDIR !== toolTmpRoot || tmpdir() !== toolTmpRoot || resolve(toolTmpRoot) !== toolTmpRoot) deny("fs.promises.rm");
  try {
    const info = nativeLstatSync(toolTmpRoot);
    if (!info.isDirectory() || info.isSymbolicLink() || info.dev !== toolTmpExpected.dev || info.ino !== toolTmpExpected.ino || info.uid !== process.getuid?.() || (info.mode & 0o7777) !== 0o700 || realpathSync(toolTmpRoot) !== toolTmpRoot || info.size > 8 * 1024 ** 2 || nativeReaddirSync(toolTmpRoot).length !== 0) deny("fs.promises.rm");
  } catch {
    deny("fs.promises.rm");
  }
}
function registerProjectTmp(vitest) {
  checkToolTmp();
  for (const project of new Set([vitest.getRootProject(), ...vitest.projects])) {
    const path = project.tmpDir;
    if (typeof path !== "string" || dirname(path) !== toolTmpRoot || basename(path) === "." || basename(path) === ".." || resolve(path) !== path) deny("fs.promises.rm");
    const previous = projectTmpRegistry.get(project);
    if (previous) {
      if (previous.path !== path || previous.stage !== stage) deny("fs.promises.rm");
    } else {
      if (projectTmpRegistry.size >= 4) deny("fs.promises.rm");
      projectTmpRegistry.set(project, { path, stage });
    }
  }
}
checkToolTmp();
const allowedFiles = new Set([`${databaseRoot}/owner-race.db`, `${databaseRoot}/owner-race.db-wal`, `${databaseRoot}/owner-race.db-shm`]);
const writable = (value, method) => {
  const path = value instanceof URL ? fileURLToPath(value) : value;
  if (typeof path !== "string" || !allowedFiles.has(resolve(path))) deny(method);
};
const writes = (flags) => typeof flags === "number" ? !!(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND)) : typeof flags === "string" && /[wa+]/.test(flags);
for (const [object, names] of [[fs, ["open", "openSync"]], [fsPromises, ["open"]]]) {
  for (const name of names) {
    const original = object[name];
    object[name] = function (path, flags, ...rest) { if (writes(flags)) writable(path, `${object === fs ? "fs" : "fs.promises"}.${name}-write`); return original.call(this, path, flags, ...rest); };
  }
}
for (const object of [fs, fsPromises]) {
  for (const name of ["writeFile", "writeFileSync", "appendFile", "appendFileSync", "truncate", "truncateSync"]) {
    if (typeof object[name] !== "function") continue;
    const original = object[name];
    object[name] = function (path, ...rest) { writable(path, `${object === fs ? "fs" : "fs.promises"}.${name}`); return original.call(this, path, ...rest); };
  }
  for (const name of ["mkdir", "mkdirSync", "mkdtemp", "mkdtempSync", "rm", "rmSync", "rmdir", "rmdirSync", "unlink", "unlinkSync", "rename", "renameSync", "copyFile", "copyFileSync", "link", "linkSync", "symlink", "symlinkSync", "chmod", "chmodSync"]) if (typeof object[name] === "function") object[name] = () => deny(`${object === fs ? "fs" : "fs.promises"}.${name}`);
}
fsPromises.rm = async (path, options) => {
  if (!main || typeof path !== "string" || !options || Object.keys(options).join(",") !== "recursive" || options.recursive !== true || ![...projectTmpRegistry].some(([project, entry]) => entry.path === path && entry.stage === stage && project.tmpDir === entry.path)) deny("fs.promises.rm");
  checkToolTmp();
  try {
    await nativeLstat(path);
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") {
      checkToolTmp();
      throw error;
    }
    deny("fs.promises.rm");
  }
  deny("fs.promises.rm");
};
net.Socket.prototype.connect = () => deny("socket-connect");
net.Server.prototype.listen = () => deny("server-listen");
tls.connect = () => deny("tls-connect");
dgram.createSocket = () => deny("datagram-create");
for (const object of [dns, dnsPromises, dns.Resolver.prototype, dnsPromises.Resolver.prototype]) {
  for (const name of ["lookup", "lookupService", "resolve", "resolve4", "resolve6", "resolveAny", "resolveCaa", "resolveCname", "resolveMx", "resolveNaptr", "resolveNs", "resolvePtr", "resolveSoa", "resolveSrv", "resolveTxt", "reverse"]) {
    if (typeof object[name] === "function") object[name] = () => deny("dns-query");
  }
}
workerThreads.Worker = class { constructor() { deny("node-worker"); } };
for (const name of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync"]) childProcess[name] = () => deny(`child.${name}`);
const vitestFile = realpathSync(`${TREE}/node_modules/vitest/dist/node.js`);
const forkFile = realpathSync(`${TREE}/node_modules/vitest/dist/workers/forks.js`);
childProcess.fork = main ? function (modulePath, args, options) {
  if (children.length >= 1 || children.some((child) => !child.closed) || realpathSync(modulePath) !== forkFile || args.length !== 0 || options.stdio !== "pipe") deny("child.fork");
  const handle = originalFork(modulePath, args, options);
  if (!handle.pid || !handle.stdout || !handle.stderr || !handle.stdin) deny("child.fork-handles");
  const row = { handle, closed: false, stdoutEOF: false, stderrEOF: false, exitObserved: false, signal: null, code: null };
  children.push(row);
  let safeBuffer = "";
  handle.stdout.on("data", (chunk) => {
    safeBuffer += chunk.toString("utf8");
    if (safeBuffer.length > 2 * 1024 ** 2) deny("harness-result");
    while (safeBuffer.includes("\n")) {
      const index = safeBuffer.indexOf("\n");
      const line = safeBuffer.slice(0, index); safeBuffer = safeBuffer.slice(index + 1);
      if (line.startsWith("P5D ")) {
        let packet;
        try { packet = JSON.parse(line.slice(4)); } catch { deny("harness-result"); }
        if (packet === null || typeof packet !== "object" || Object.keys(packet).sort().join(",") !== "context,event,method" || packet.event !== "denial" || packet.context !== "vitest-fork" || !denialMethods.has(packet.method)) deny("harness-result");
        violation = true;
        if (!reportedDenials.has(packet.method) && reportedDenials.size < 4) { reportedDenials.add(packet.method); emit(packet); }
        continue;
      }
      if (!line.startsWith("P5D_OWNER_RACE ")) continue;
      if (line.startsWith('P5D_OWNER_RACE {"event":"case-failure"')) {
        let packet;
        try { packet = JSON.parse(line.slice(15)); } catch { deny("harness-result"); }
        if (packet === null || typeof packet !== "object" || Object.keys(packet).sort().join(",") !== "case,checkpoint,event,sourceFault" || packet.event !== "case-failure" || packet.case !== "OR01" || !checkpointKeys.has(packet.checkpoint) || (packet.sourceFault !== null && !sourceFaultKeys.has(packet.sourceFault)) || caseFailure) deny("harness-result");
        caseFailure = true;
        emit(packet);
        continue;
      }
      if (line !== 'P5D_OWNER_RACE {"event":"fixture-closed","hashersStopped":true,"client1Closed":true,"client2Closed":true}' || fixtureClosed) deny("harness-result");
      fixtureClosed = true;
      emit({ event: "fixture-closed", hashersStopped: true, client1Closed: true, client2Closed: true });
    }
  });
  handle.stdout.once("end", () => { row.stdoutEOF = true; });
  handle.stderr.once("end", () => { row.stderrEOF = true; });
  handle.once("exit", (code, signal) => { row.exitObserved = true; row.code = code; row.signal = signal; });
  handle.once("close", () => { row.closed = true; });
  emit({ event: "fork", pid: handle.pid });
  return handle;
} : () => deny("child.fork");
syncBuiltinESMExports();
if (main) {
  let active = null;
  let failed = false;
  const cases = [];
  const completed = [];
  let phase = "bootstrap";
  let diagnosticSent = false;
  let hooks = { beforeAllStarted: false, beforeAllEnded: false, afterAllStarted: false, afterAllEnded: false };
  let errorSource = "none";
  let errorDetails = [];
  const errorClasses = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "AssertionError", "LibsqlError", "LibsqlBatchError", "SqliteError", "DrizzleError", "DrizzleQueryError"]);
  const nativeCodes = new Set(["SQLITE_ERROR", "SQLITE_INTERNAL", "SQLITE_PERM", "SQLITE_ABORT", "SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_NOMEM", "SQLITE_READONLY", "SQLITE_INTERRUPT", "SQLITE_IOERR", "SQLITE_CORRUPT", "SQLITE_NOTFOUND", "SQLITE_FULL", "SQLITE_CANTOPEN", "SQLITE_PROTOCOL", "SQLITE_EMPTY", "SQLITE_SCHEMA", "SQLITE_TOOBIG", "SQLITE_CONSTRAINT", "SQLITE_MISMATCH", "SQLITE_MISUSE", "SQLITE_NOLFS", "SQLITE_AUTH", "SQLITE_FORMAT", "SQLITE_RANGE", "SQLITE_NOTADB", "SQLITE_NOTICE", "SQLITE_WARNING", "SQLITE_UNKNOWN", "ENOENT", "EEXIST", "EACCES", "EPERM", "ENOSPC", "ERR_DLOPEN_FAILED", "ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"]);
  const captureErrors = (source, errors) => {
    if (errorDetails.length) return;
    const seen = new Set();
    for (const error of errors.slice(0, 3)) {
      let value = error;
      for (let depth = 0; value !== null && typeof value === "object" && depth < 3 && errorDetails.length < 3 && !seen.has(value); depth++) {
        seen.add(value);
        errorDetails.push({ errorClass: errorClasses.has(value.name) ? value.name : "unknown", nativeCode: nativeCodes.has(value.code) ? value.code : "none", statementIndex: value.name === "LibsqlBatchError" && Number.isInteger(value.statementIndex) && value.statementIndex >= 0 && value.statementIndex < 1534 ? value.statementIndex : null });
        value = value.cause;
      }
      if (errorDetails.length === 3) break;
    }
    if (errorDetails.length) errorSource = source;
  };
  const diagnose = (error) => {
    if (diagnosticSent) return;
    captureErrors("harness", [error]);
    diagnosticSent = true;
    emit({ event: "diagnostic", stage, phase, ...hooks, source: errorSource, errors: errorDetails });
  };
  const deadline = setTimeout(() => { emit({ event: "failure", stage, code: "GROUP_DEADLINE", case: currentCase }); process.exitCode = 1; void active?.close(); }, 180_000);
  const waitClosed = async () => {
    const started = performance.now();
    while (children.some((row) => !row.closed || !row.stdoutEOF || !row.stderrEOF || !row.exitObserved)) {
      if (performance.now() - started > 10_000) throw new Error("P5D_TOOL_CLOSE");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    if (children.some((row) => !(row.signal === "SIGTERM" && row.code === null || row.signal === null && row.code === 0))) throw new Error("P5D_TOOL_CLOSE");
  };
  try {
    if (process.cwd() !== TREE || process.env.HOLLOW_ACCOUNT_DELETION_OWNER_RACE_ROOT !== process.argv[2] || process.argv.length !== 3) deny("harness-argv");
    const { createVitest, ForksPoolWorker } = await import(pathToFileURL(vitestFile).href);
    class MemoryForksPoolWorker extends ForksPoolWorker {
      name = "p5d-owner-race-memory-forks";
      cacheFs = false;
    }
    for (const [label, file, expected] of stages) {
      stage = label;
      currentCase = "none";
      hooks = { beforeAllStarted: false, beforeAllEnded: false, afterAllStarted: false, afterAllEnded: false };
      errorSource = "none";
      errorDetails = [];
      phase = "create";
      emit({ event: "stage", stage });
      const actual = [];
      const reporter = {
        onInit(vitest) { registerProjectTmp(vitest); },
        onHookStart(hook) { if (hook.name === "beforeAll") hooks.beforeAllStarted = true; if (hook.name === "afterAll") hooks.afterAllStarted = true; },
        onHookEnd(hook) { if (hook.name === "beforeAll") hooks.beforeAllEnded = true; if (hook.name === "afterAll") hooks.afterAllEnded = true; },
        onTestSuiteResult(suite) { captureErrors("suite", suite.errors()); },
        onTestModuleEnd(module) { captureErrors("module", module.errors()); },
        onTestCaseReady(test) {
          const code = test.name.split(" ")[0];
          if (test.name !== "OR01 preserves an active owner when two original clients request retirement concurrently" || !expected.includes(code)) deny("harness-case");
          currentCase = code;
        },
        onTestCaseResult(test) {
          const code = test.name.split(" ")[0];
          const result = test.result();
          const state = result.state;
          if (state === "failed") captureErrors("case", result.errors ?? []);
          if (!expected.includes(code) || !["passed", "failed", "skipped", "pending"].includes(state)) deny("harness-result");
          actual.push(code); cases.push({ code, state });
          emit({ event: "case", stage, code, state });
        },
      };
      const relative = `packages/core/src/adapters/libsql/__tests__/${file}`;
      active = await createVitest("test", {
        root: TREE, config: false, configLoader: "native", run: true, watch: false,
        pool: { name: "p5d-owner-race-memory-forks", createPoolWorker: (options) => new MemoryForksPoolWorker(options) }, maxWorkers: 1, fileParallelism: false, isolate: true, bail: 1, retry: 0,
        testTimeout: 40_000, hookTimeout: 40_000, teardownTimeout: 10_000,
        include: [relative], exclude: ["**/node_modules/**", "**/dist/**"], environment: "node",
        globals: true, cache: false, reporters: [reporter], api: false, testNamePattern: /\bOR01\b/,
        execArgv: ["--import", pathToFileURL(self).href],
      }, {
        configFile: false, envFile: false, logLevel: "silent", resolve: { tsconfigPaths: true },
        server: { watch: null, hmr: false, ws: false, middlewareMode: true },
        environments: { ssr: { optimizeDeps: { noDiscovery: true, include: [] } } },
      });
      registerProjectTmp(active);
      phase = "start";
      await active.start([relative]);
      phase = "results";
      captureErrors("unhandled", active.state.getUnhandledErrors());
      const files = active.state.getFiles();
      if (files.length !== 1 || files[0].result?.state !== "pass" || actual.join(",") !== expected.join(",") || cases.some((row) => row.state !== "passed") || active.state.getUnhandledErrors().length || violation || caseFailure) throw new Error("P5D_CASE_FAILURE");
      phase = "close";
      await active.close(); active = null;
      phase = "wait-closed";
      await waitClosed();
      if (!fixtureClosed || !hooks.afterAllEnded) throw new Error("P5D_TOOL_CLOSE");
      completed.push(label);
      emit({ event: "closed", stage, filePassed: true, afterAllCompleted: true, forksClosed: true });
    }
  } catch (error) {
    diagnose(error);
    failed = true;
    const safe = ["P5D_RESOURCE_DENIED", "P5D_TOOL_CLOSE", "P5D_CASE_FAILURE"].includes(error?.message) ? error.message : "P5D_TOOL_FAILURE";
    emit({ event: "failure", stage, code: safe, case: currentCase });
    try { await active?.close(); await waitClosed(); } catch { emit({ event: "failure", stage, code: "P5D_TOOL_CLOSE", case: currentCase }); }
  } finally {
    clearTimeout(deadline);
    emit({ event: "summary", ok: !failed && !violation && !caseFailure && completed.length === 1, completed, cases, forks: children.length, forksActualClosed: children.every((row) => row.closed && row.exitObserved && row.stdoutEOF && row.stderrEOF), workerCount: 0, denied: violation });
    if (failed || violation || caseFailure || completed.length !== 1) process.exitCode = 1;
  }
}
