import childProcess from "node:child_process";
import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dgram from "node:dgram";
import workerThreads from "node:worker_threads";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { Module, registerHooks, syncBuiltinESMExports } from "node:module";
import { createHash } from "node:crypto";
import { isProxy } from "node:util/types";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

const TREE = "/Users/hikaru/github.com/tuanemuy/hollow-parser-exit-c2a3d45f-20261006";
const PUBLIC = "/Users/hikaru/github.com/tuanemuy/hollow";
const ROOT = "/Users/hikaru/.local/share/hollow-validation/goal-implement-parser-exit-20261006-7a24c1f9";
const TMP = `${ROOT}/tool-tmp`;
const NODE = "/nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node";
const SELF = `${PUBLIC}/.goal-implement/helpers/parser-exit-loader.mjs`;
const RELATIVE = "packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts";
const PARSER = `${TREE}/packages/core/src/adapters/node/import/parserWorker.mjs`;
const CASE_NAMES = [
  "bounds concurrent parser admission and releases slots after saturation",
  "returns text results only after actual Worker exit and stdio closure",
  "closes failed and timed-out Workers before admitting recovery",
];
const FULL_NAMES = CASE_NAMES.map((name) => `isolated document extraction > ${name}`);
const LEDGER = Symbol.for("hollow.parser-exit.public-local-ledger.693b210e");
const nativeLstat = fs.lstatSync.bind(fs);
const nativeRealpath = fs.realpathSync.bind(fs);
const nativeReadDir = fs.readdirSync.bind(fs);
const nativeWrite = fs.writeSync.bind(fs);
const nativeFstat = fs.fstatSync.bind(fs);
const nativeOpen = fs.openSync.bind(fs);
const nativeRead = fs.readSync.bind(fs);
const nativeClose = fs.closeSync.bind(fs);
const pathOf = (value) => value instanceof URL ? fileURLToPath(value) : typeof value === "string" ? resolve(value) : null;

function install() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, LEDGER);
  if (previous) {
    if (!("value" in previous) || !previous.value || previous.value.self !== SELF || previous.value.context !== "fork" || !workerThreads.isMainThread) throw new Error("LEDGER_BINDING");
    return previous.value;
  }
  const main = workerThreads.isMainThread && process.argv[1] === SELF;
  const context = !workerThreads.isMainThread ? "parser" : main ? "main" : "fork";
  const controlFD = Number(process.env.HOLLOW_PARSER_CONTROL_FD);
  const controlIdentity = JSON.parse(process.env.HOLLOW_PARSER_CONTROL_IDENTITY ?? "null");
  const tmpIdentity = JSON.parse(process.env.HOLLOW_PARSER_TMP_IDENTITY ?? "null");
  const state = { self: SELF, context, denied: false, workers: [], children: [], maximum: 0, detect: 0, extract: 0, afterAll: false, setup: false, frames: 0, bytes: 0 };
  const emit = (event, fields = {}) => {
    if (context === "parser") throw new Error("PARSER_CONTROL_DENIED");
    const packet = Buffer.from(`${JSON.stringify({ event, context, ...fields })}\n`);
    if (packet.length > 512 || ++state.frames > 32 || (state.bytes += packet.length) > 16384) throw new Error("CONTROL_BOUND");
    const info = nativeFstat(controlFD);
    if (!info.isFile() || info.uid !== process.getuid() || info.nlink !== 1 || (info.mode & 0o7777) !== 0o600 || info.dev !== controlIdentity.dev || info.ino !== controlIdentity.ino || info.size + packet.length > 32768) throw new Error("CONTROL_BINDING");
    if (nativeWrite(controlFD, packet) !== packet.length) throw new Error("CONTROL_WRITE");
  };
  state.emit = emit;
  const failures = new WeakMap();
  state.makeError = (code) => { const error = new Error(code); failures.set(error, code); return error; };
  state.failureCode = (error) => error !== null && (typeof error === "object" || typeof error === "function") ? failures.get(error) ?? "TOOL_FAILURE" : "TOOL_FAILURE";
  let nativeDiagnostic = null;
  let filesystemDiagnostic = null;
  const deniedKinds = new Set();
  const deny = (kind) => {
    state.denied = true;
    if (context !== "parser" && !deniedKinds.has(kind) && deniedKinds.size < 4) { deniedKinds.add(kind); emit("denied", { kind, ...(kind === "native-module" ? { native: nativeDiagnostic } : kind === "filesystem" ? { filesystem: filesystemDiagnostic } : {}) }); }
    throw state.makeError("RESOURCE_DENIED");
  };
  state.deny = deny;
  const directory = (path, identity) => {
    const info = nativeLstat(path);
    if (!info.isDirectory() || info.isSymbolicLink() || info.uid !== process.getuid() || (info.mode & 0o7777) !== 0o700 || nativeRealpath(path) !== path || identity && (info.dev !== identity.dev || info.ino !== identity.ino)) deny("metadata");
    return info;
  };
  if (process.execPath !== NODE || nativeRealpath(process.execPath) !== NODE || process.versions.node !== "24.15.0" || process.cwd() !== TREE || process.env.HOLLOW_PARSER_ROOT !== ROOT || process.env.TMPDIR !== TMP || tmpdir() !== TMP || !Number.isSafeInteger(controlFD) || controlFD < 3 || !controlIdentity || !tmpIdentity) deny("binding");
  directory(ROOT); directory(TMP, tmpIdentity);
  const controlInfo = nativeFstat(controlFD);
  if (!controlInfo.isFile() || controlInfo.dev !== controlIdentity.dev || controlInfo.ino !== controlIdentity.ino || controlInfo.nlink !== 1 || controlInfo.uid !== process.getuid() || (controlInfo.mode & 0o7777) !== 0o600) deny("binding");
  const forkFile = nativeRealpath(`${TREE}/node_modules/vitest/dist/workers/forks.js`);
  if (context === "fork" && process.argv[1] !== forkFile || context === "parser" && process.argv[1] !== PARSER) deny("binding");
  const readAllowed = (value, method) => {
    const path = pathOf(value);
    if (!path) { filesystemDiagnostic = { method, site: "NORMALIZE", scope: null }; deny("filesystem"); }
    if (/\.(?:db|sqlite|sqlite3)(?:-(?:wal|shm|journal))?$/.test(path)) { filesystemDiagnostic = { method, site: "DB_SUFFIX", scope: null }; deny("filesystem"); }
    if (path === SELF || path === ROOT || path === TMP || path.startsWith(`${TREE}/`) || path === TREE || path.startsWith(`${PUBLIC}/node_modules/`)) return;
    filesystemDiagnostic = { method, site: "READ_SCOPE", scope: "OUTSIDE" };
    deny("filesystem");
  };
  const writes = (flags) => typeof flags === "number" ? (flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND)) !== 0 : typeof flags !== "string" || flags !== "r";
  for (const object of [fs, fsPromises]) {
    for (const name of ["open", "openSync"]) {
      if (typeof object[name] !== "function") continue;
      const original = object[name];
      object[name] = function (path, flags, ...rest) { if (writes(flags)) { filesystemDiagnostic = { method: name, site: "OPEN_FLAGS", scope: null }; deny("filesystem"); } readAllowed(path, name); return Reflect.apply(original, this, [path, flags, ...rest]); };
    }
    for (const name of ["readFile", "readFileSync", "stat", "statSync", "lstat", "lstatSync", "realpath", "realpathSync", "readdir", "readdirSync", "access", "accessSync", "existsSync", "createReadStream", "opendir", "opendirSync", "watch", "watchFile"]) {
      if (typeof object[name] !== "function") continue;
      const original = object[name];
      const wrapped = function (path, ...rest) { readAllowed(path, name); return Reflect.apply(original, this, [path, ...rest]); };
      if (original.native) wrapped.native = function (path, ...rest) { readAllowed(path, name); return Reflect.apply(original.native, this, [path, ...rest]); };
      object[name] = wrapped;
    }
    for (const name of ["write", "writeSync", "writev", "writevSync", "writeFile", "writeFileSync", "appendFile", "appendFileSync", "truncate", "truncateSync", "ftruncate", "ftruncateSync", "createWriteStream", "mkdir", "mkdirSync", "mkdtemp", "mkdtempSync", "rm", "rmSync", "rmdir", "rmdirSync", "unlink", "unlinkSync", "rename", "renameSync", "copyFile", "copyFileSync", "cp", "cpSync", "link", "linkSync", "symlink", "symlinkSync", "chmod", "chmodSync", "chown", "chownSync", "utimes", "utimesSync"]) {
      if (typeof object[name] === "function") object[name] = () => { filesystemDiagnostic = { method: name, site: "MUTATION", scope: null }; deny("filesystem"); };
    }
  }
  const projects = new Map();
  state.registerProjects = (vitest) => {
    directory(TMP, tmpIdentity);
    if (nativeReadDir(TMP).length) { filesystemDiagnostic = { method: "registerProjects", site: "TMP_EMPTY", scope: "TMP" }; deny("filesystem"); }
    for (const project of new Set([vitest.getRootProject(), ...vitest.projects])) {
      if (typeof project.tmpDir !== "string" || dirname(project.tmpDir) !== TMP || resolve(project.tmpDir) !== project.tmpDir || projects.has(project) && projects.get(project) !== project.tmpDir || !projects.has(project) && projects.size >= 2) { filesystemDiagnostic = { method: "registerProjects", site: "PROJECT_BINDING", scope: null }; deny("filesystem"); }
      projects.set(project, project.tmpDir);
    }
  };
  fsPromises.rm = async (path, options) => {
    if (context !== "main" || ![...projects.values()].includes(path) || !options || Object.keys(options).join(",") !== "recursive" || options.recursive !== true) { filesystemDiagnostic = { method: "rm", site: "RM_ARGUMENTS", scope: null }; deny("filesystem"); }
    directory(TMP, tmpIdentity);
    if (nativeReadDir(TMP).length) { filesystemDiagnostic = { method: "rm", site: "TMP_EMPTY", scope: "TMP" }; deny("filesystem"); }
    try { nativeLstat(path); } catch (error) { if (error && error.code === "ENOENT") throw error; filesystemDiagnostic = { method: "rm", site: "RM_STATE", scope: "PROJECT_TMP" }; deny("filesystem"); }
    filesystemDiagnostic = { method: "rm", site: "RM_STATE", scope: "PROJECT_TMP" };
    deny("filesystem");
  };
  const optionalFiles = new Map([["/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/vite@8.0.12_@types+node@25.7.0_esbuild@0.27.7_jiti@2.7.0_tsx@4.21.0/node_modules/vite/dist/node/chunks/node.js",{"sha256":"c75d80dd3f189acab3e96b73d4c053984ca3c2a0e5858e5ae6e523ca8282d7c8","bytes":1266564,"mode":420}],["/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/fsevents@2.3.3/node_modules/fsevents/fsevents.js",{"sha256":"1d75660f48786792f0e98d6dabfd301883c8f2a8f61aa690cbf58fb4386c0f1a","bytes":2483,"mode":420}],["/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/fsevents@2.3.3/node_modules/fsevents/package.json",{"sha256":"500839fcc76f6c5efcb454e6614b23c26775e75e1140619fff9ca64c291aec2b","bytes":1348,"mode":420}],["/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/fsevents@2.3.3/node_modules/fsevents/fsevents.node",{"sha256":"40f2f51199e4f5fc46fa6b985fb3461bb63e6cd86c62bfa9bcee45ed4438d5fb","bytes":163626,"mode":493}],["/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/vite@8.0.12_@types+node@25.7.0_esbuild@0.27.7_jiti@2.7.0_tsx@4.21.0/node_modules/vite/dist/node/chunks/chunk.js",{"sha256":"eeab70ea563186e5b9a6398ee9e1ea6cc5543786db622a0c4dcc1369cfad6d4e","bytes":1792,"mode":420}]]);
  const optionalPaths = [...optionalFiles.keys()];
  const [, optionalJS, , optionalNative, optionalVite] = optionalPaths;
  const originalNativeExtension = Module._extensions[".node"];
  const parentDescriptor = Object.getOwnPropertyDescriptor(Module.prototype, "parent");
  if (typeof originalNativeExtension !== "function" || !parentDescriptor || typeof parentDescriptor.get !== "function") deny("binding");
  const originalParent = parentDescriptor.get;
  let optionalDisabled = false;
  const originalModule = (value, filename, site) => {
    nativeDiagnostic.site = site;
    const match = (value) => {
      if (site === "OPTIONAL_PARENT") nativeDiagnostic.parentMatch = value;
      if (site === "OPTIONAL_ANCESTOR") nativeDiagnostic.ancestorMatch = value;
    };
    if (!value || typeof value !== "object" || isProxy(value) || Object.getPrototypeOf(value) !== Module.prototype || Object.hasOwn(value, "parent")) { match(false); deny("native-module"); }
    const field = Object.getOwnPropertyDescriptor(value, "filename");
    if (!field || !("value" in field) || field.value !== filename) { match(false); deny("native-module"); }
    match(true);
    return value;
  };
  const optionalBinding = (path, entry) => {
    const before = nativeLstat(path);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.uid !== process.getuid() || (before.mode & 0o7777) !== entry.mode || before.size !== entry.bytes || nativeRealpath(path) !== path) deny("native-module");
    const fd = nativeOpen(path, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      const opened = nativeFstat(fd);
      if (opened.dev !== before.dev || opened.ino !== before.ino) deny("native-module");
      const hash = createHash("sha256");
      const buffer = Buffer.alloc(65536);
      let size = 0;
      for (;;) {
        const count = nativeRead(fd, buffer, 0, buffer.length, null);
        if (count === 0) break;
        size += count;
        if (size > entry.bytes) deny("native-module");
        hash.update(buffer.subarray(0, count));
      }
      const after = nativeFstat(fd);
      if (size !== entry.bytes || hash.digest("hex") !== entry.sha256 || after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || after.mode !== before.mode || after.uid !== before.uid || after.nlink !== before.nlink) deny("native-module");
    } finally { nativeClose(fd); }
  };
  Module._extensions[".node"] = function (module, file) {
    if (file !== optionalNative) return Reflect.apply(originalNativeExtension, this, [module, file]);
    const contextMatch = context !== "parser";
    nativeDiagnostic = { family: "fsevents", site: "OPTIONAL_CONTEXT", contextMatch, parentMatch: null, ancestorMatch: null };
    if (!contextMatch || optionalDisabled) deny("native-module");
    const nativeModule = originalModule(module, optionalNative, "OPTIONAL_MODULE");
    const parent = originalModule(Reflect.apply(originalParent, nativeModule, []), optionalJS, "OPTIONAL_PARENT");
    originalModule(Reflect.apply(originalParent, parent, []), optionalVite, "OPTIONAL_ANCESTOR");
    nativeDiagnostic.site = "OPTIONAL_BINDING";
    try { for (const [path, entry] of optionalFiles) optionalBinding(path, entry); } catch { deny("native-module"); }
    optionalDisabled = true;
    try { emit("expected-disabled", { family: "fsevents", site: "optional-preload", count: 1 }); } catch (error) { state.denied = true; throw error; }
    throw state.makeError("OPTIONAL_BACKEND_DISABLED_BY_TOOL_POLICY");
  };
  const nativeAddons = new Map([
    ["/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@rolldown+binding-darwin-arm64@1.0.0/node_modules/@rolldown/binding-darwin-arm64/rolldown-binding.darwin-arm64.node", 18446672],
    ["/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/lightningcss-darwin-arm64@1.32.0/node_modules/lightningcss-darwin-arm64/lightningcss.darwin-arm64.node", 8516384],
  ]);
  const nativeFamilies = new Map([[optionalNative, "fsevents"], ...[...nativeAddons.keys()].map((path, index) => [path, index === 0 ? "rolldown" : "lightningcss"])]);
  const originalGetBuiltinModule = process.getBuiltinModule;
  process.getBuiltinModule = function (name) { if (name === "sqlite" || name === "node:sqlite") { nativeDiagnostic = { family: "other", site: "SQLITE_BUILTIN", contextMatch: null, parentMatch: null, ancestorMatch: null }; deny("native-module"); } return Reflect.apply(originalGetBuiltinModule, this, [name]); };
  const originalDlopen = process.dlopen;
  const openedAddons = new Set();
  process.dlopen = function (module, file, ...rest) {
    const path = pathOf(file);
    const contextMatch = context !== "parser";
    nativeDiagnostic = { family: nativeFamilies.get(path) ?? "other", site: "DLOPEN_GATE", contextMatch, parentMatch: null, ancestorMatch: null };
    if (!contextMatch || !nativeAddons.has(path) || nativeRealpath(path) !== path || openedAddons.has(path)) deny("native-module");
    nativeDiagnostic.site = "DLOPEN_METADATA";
    const info = nativeLstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.uid !== process.getuid() || (info.mode & 0o7777) !== 0o644 || info.size !== nativeAddons.get(path)) deny("native-module");
    openedAddons.add(path);
    return Reflect.apply(originalDlopen, this, [module, file, ...rest]);
  };
  registerHooks({ resolve(specifier, contextInfo, nextResolve) {
    if (specifier === "node:sqlite" || specifier === "sqlite" || specifier === "libsql" || specifier.startsWith("@libsql/") || specifier === "better-sqlite3" || specifier === "sqlite3") { nativeDiagnostic = { family: "other", site: "SQLITE_RESOLVE", contextMatch: null, parentMatch: null, ancestorMatch: null }; deny("native-module"); }
    return nextResolve(specifier, contextInfo);
  } });
  net.createServer = () => deny("network");
  for (const Resolver of [dns.Resolver, dns.promises.Resolver]) for (const name of Object.getOwnPropertyNames(Resolver.prototype)) if (name === "lookup" || name.startsWith("resolve") || name === "reverse" || name === "setServers") if (typeof Resolver.prototype[name] === "function") Resolver.prototype[name] = () => deny("network");
  net.connect = net.createConnection = net.Socket.prototype.connect = () => deny("network");
  net.Server.prototype.listen = () => deny("network");
  http.request = http.get = https.request = https.get = () => deny("network");
  tls.connect = () => deny("network");
  dgram.createSocket = () => deny("network");
  for (const object of [dns, dns.promises]) for (const name of Object.keys(object)) if (name === "lookup" || name === "lookupService" || name.startsWith("resolve") || name === "reverse") if (typeof object[name] === "function") object[name] = () => deny("network");
  globalThis.fetch = () => deny("network");
  const originalFork = childProcess.fork;
  for (const name of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync"]) childProcess[name] = () => deny("process");
  childProcess.fork = function (file, args, options) {
    if (context !== "main" || state.children.length || typeof file !== "string" || nativeRealpath(file) !== forkFile || !Array.isArray(args) || args.length || !options || options.stdio !== "pipe" || options.serialization !== "advanced" || !Array.isArray(options.execArgv) || !options.execArgv.includes(pathToFileURL(SELF).href)) deny("process");
    const handle = Reflect.apply(originalFork, this, [file, args, { ...options, detached: false, execPath: NODE, env: { ...options.env, HOLLOW_PARSER_CONTROL_FD: "4" }, stdio: ["pipe", "pipe", "pipe", "ipc", controlFD] }]);
    const row = { handle, exit: false, close: false, disconnect: false, code: null, signal: null, stdoutEnd: false, stdoutClose: false, stderrEnd: false, stderrClose: false, stdinClose: false };
    state.children.push(row);
    const channel = Object.getOwnPropertyDescriptor(handle, "channel");
    const connected = Object.getOwnPropertyDescriptor(handle, "connected");
    if (!Number.isSafeInteger(handle.pid) || !handle.stdin || !handle.stdout || !handle.stderr || !connected || !("value" in connected) || connected.value !== true || !channel || !("value" in channel) || channel.value === null || typeof channel.value !== "object") deny("process");
    handle.once("exit", (code, signal) => { row.exit = true; row.code = code; row.signal = signal; });
    handle.once("close", () => { row.close = true; });
    handle.once("disconnect", () => { row.disconnect = true; });
    handle.stdin.once("close", () => { row.stdinClose = true; });
    handle.stdout.once("end", () => { row.stdoutEnd = true; });
    handle.stdout.once("close", () => { row.stdoutClose = true; });
    handle.stderr.once("end", () => { row.stderrEnd = true; });
    handle.stderr.once("close", () => { row.stderrClose = true; });
    emit("fork-start", { count: 1, detached: false });
    return handle;
  };
  const nativeWorker = workerThreads.Worker;
  const workerClosed = (row) => row.exit !== null && row.stdoutEnd && row.stdoutClose && row.stderrEnd && row.stderrClose && row.termination === "fulfilled" && row.terminationCode === row.exit;
  state.workerClosed = workerClosed;
  const planned = [
    ...Array.from({ length: 10 }, () => ["extract", "bounded", "text"]),
    ["extract", "recovered", "text"], ["detect", "owned text", "normal.txt"], ["extract", "owned text", "text"],
    ["detect", [195, 40], "invalid.txt"], ["extract", "bounded", "text"], ["detect", "recovered", "normal.txt"],
  ];
  workerThreads.Worker = class extends nativeWorker {
    constructor(file, options) {
      const expected = planned[state.workers.length];
      const data = options?.workerData;
      const bytes = data?.bytes;
      if (context !== "fork" || !expected || pathOf(file) !== PARSER || nativeRealpath(PARSER) !== PARSER || !data || !(bytes instanceof Uint8Array) || data.operation !== expected[0] || Object.keys(options).sort().join(",") !== "resourceLimits,stderr,stdout,transferList,workerData" || Object.keys(data).sort().join(",") !== (expected[0] === "detect" ? "bytes,filename,operation" : "bytes,format,operation") || (expected[0] === "detect" ? data.filename : data.format) !== expected[2] || options.stdout !== true || options.stderr !== true || options.resourceLimits === null || typeof options.resourceLimits !== "object" || !Array.isArray(options.transferList) || options.transferList.length !== 1 || options.transferList[0] !== bytes.buffer || Object.keys(options.resourceLimits).sort().join(",") !== "maxOldGenerationSizeMb,maxYoungGenerationSizeMb,stackSizeMb" || options.resourceLimits.maxOldGenerationSizeMb !== 256 || options.resourceLimits.maxYoungGenerationSizeMb !== 32 || options.resourceLimits.stackSizeMb !== 4) deny("worker");
      const wanted = typeof expected[1] === "string" ? Buffer.from(expected[1]) : Uint8Array.from(expected[1]);
      if (bytes.byteLength !== wanted.byteLength || bytes.some((value, index) => value !== wanted[index]) || state.workers.filter((row) => !workerClosed(row)).length >= 2) deny("worker");
      super(file, options);
      const row = { worker: this, exit: null, stdoutEnd: false, stdoutClose: false, stderrEnd: false, stderrClose: false, termination: "none", terminationCode: null, errored: false, online: false };
      state.workers.push(row);
      if (expected[0] === "detect") state.detect++; else state.extract++;
      state.maximum = Math.max(state.maximum, state.workers.filter((value) => !workerClosed(value)).length);
      if (!Number.isSafeInteger(this.threadId) || this.threadId <= 0 || !this.stdout || !this.stderr) deny("worker");
      this.once("online", () => { row.online = true; });
      this.once("exit", (code) => { row.exit = code; });
      this.once("error", () => { row.errored = true; });
      this.stdout.once("end", () => { row.stdoutEnd = true; });
      this.stdout.once("close", () => { row.stdoutClose = true; });
      this.stderr.once("end", () => { row.stderrEnd = true; });
      this.stderr.once("close", () => { row.stderrClose = true; });
    }
    terminate() {
      const row = state.workers.find((value) => value.worker === this);
      if (!row || row.termination !== "none") deny("worker");
      row.termination = "pending";
      try {
        return super.terminate().then((code) => { row.termination = "fulfilled"; row.terminationCode = code; return code; }, (error) => { row.termination = "failed"; throw error; });
      } catch (error) { row.termination = "failed"; throw error; }
    }
  };
  syncBuiltinESMExports();
  Object.defineProperty(globalThis, LEDGER, { value: state, configurable: false, writable: false });
  if (context !== "parser") emit("node-binding", { canonical: true, version: true });
  return state;
}

const setupContext = workerThreads.isMainThread && process.argv[1] !== SELF && Object.hasOwn(globalThis, "__vitest_worker__");
if (setupContext) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, LEDGER);
  if (!previous || !("value" in previous) || previous.value?.self !== SELF || previous.value.context !== "fork") throw new Error("LEDGER_BINDING");
}
const state = install();
if (state.context === "fork" && setupContext) {
  if (state.setup) state.deny("binding");
  state.setup = true;
  const { afterAll } = await import("vitest");
  afterAll(() => {
    if (state.denied || state.workers.length !== 16 || state.detect !== 3 || state.extract !== 13 || state.maximum > 2 || !state.workers.every((row) => state.workerClosed(row) && [0, 1].includes(row.exit) && !row.errored)) state.deny("worker");
    state.afterAll = true;
    state.emit("worker-closed", { count: 16, detect: 3, extract: 13, maximum: state.maximum, online: state.workers.filter((row) => row.online).length, exit: true, readEnd: true, readClose: true, terminateHandled: true, afterAll: true });
  }, 40000);
} else if (state.context === "main") {
  let active = null;
  let ok = false;
  let modulePassed = false;
  let runEnded = false;
  let afterAllEnded = false;
  let suiteEnded = false;
  const cases = [];
  const deadline = setTimeout(() => { state.emit("failure", { code: "BODY_DEADLINE" }); process.exitCode = 1; void active?.close(); }, 180000);
  const ipcReleased = (row) => {
    const connected = Object.getOwnPropertyDescriptor(row.handle, "connected");
    const channel = Object.getOwnPropertyDescriptor(row.handle, "channel");
    return row.disconnect && connected && "value" in connected && connected.value === false && (!channel || "value" in channel && (channel.value === null || channel.value === undefined));
  };
  const childClosed = (row) => row.exit && row.close && ipcReleased(row) && row.stdinClose && row.stdoutEnd && row.stdoutClose && row.stderrEnd && row.stderrClose && (row.code === 0 && row.signal === null || row.code === null && row.signal === "SIGTERM");
  try {
    if (process.argv.length !== 2) state.deny("binding");
    const vitestFile = nativeRealpath(`${TREE}/node_modules/vitest/dist/node.js`);
    const { createVitest, ForksPoolWorker } = await import(pathToFileURL(vitestFile).href);
    class MemoryForksPoolWorker extends ForksPoolWorker { name = "parser-exit-memory-fork"; cacheFs = false; }
    const reporter = {
      onInit(vitest) { state.registerProjects(vitest); },
      onTestCaseReady(test) { if (!FULL_NAMES.includes(test.fullName) && test.result().state !== "skipped") state.deny("case"); },
      onTestCaseResult(test) {
        if (!FULL_NAMES.includes(test.fullName)) { if (test.result().state !== "skipped") state.deny("case"); return; }
        const index = FULL_NAMES.indexOf(test.fullName);
        if (index !== cases.length || test.result().state !== "passed") state.deny("case");
        cases.push(index); state.emit("case", { index, passed: true });
      },
      onHookEnd(hook) { if (hook.name === "afterAll") afterAllEnded = true; },
      onTestSuiteResult(suite) { if (suite.name === "isolated document extraction") { if (suite.errors().length) state.deny("case"); suiteEnded = true; } },
      onTestModuleEnd(module) { modulePassed = module.state() === "passed" && module.errors().length === 0; },
      onTestRunEnd(modules, errors, reason) { runEnded = reason === "passed" && modules.length === 1 && errors.length === 0; },
    };
    active = await createVitest("test", {
      root: TREE, config: false, configLoader: "native", run: true, watch: false,
      pool: { name: "parser-exit-memory-fork", createPoolWorker: (options) => new MemoryForksPoolWorker(options) },
      maxWorkers: 1, fileParallelism: false, isolate: true, bail: 1, retry: 0,
      testNamePattern: `^(?:${CASE_NAMES.map((name) => `isolated document extraction ${name}`).join("|")})$`, setupFiles: [SELF],
      testTimeout: 40000, hookTimeout: 40000, teardownTimeout: 10000,
      include: [RELATIVE], exclude: ["**/node_modules/**", "**/dist/**"], environment: "node",
      globals: true, cache: false, reporters: [reporter], api: false,
      execArgv: ["--import", pathToFileURL(SELF).href],
    }, {
      css: { postcss: { plugins: [] } },
      configFile: false, envFile: false, logLevel: "silent", resolve: { tsconfigPaths: true },
      server: { watch: null, hmr: false, ws: false, middlewareMode: true, forwardConsole: false },
      environments: { ssr: { optimizeDeps: { noDiscovery: true, include: [] } } },
    });
    state.registerProjects(active);
    state.emit("suite-start");
    await active.start([RELATIVE]);
    if (state.denied || !modulePassed || !runEnded || !suiteEnded || !afterAllEnded || cases.join(",") !== "0,1,2" || active.state.getUnhandledErrors().length) state.deny("case");
    await active.close(); active = null;
    const until = performance.now() + 10000;
    while (state.children.length !== 1 || !state.children.every(childClosed)) {
      if (performance.now() >= until) throw state.makeError("FORK_CLOSURE");
      await new Promise((resolveWait) => setTimeout(resolveWait, 20));
    }
    state.emit("fork-closed", { count: 1, actualExit: true, ipcDisconnect: true, connectedFalse: true, channelReleased: true, ipcEOF: null, stdinClose: true, readEnd: true, readClose: true, close: true, normalPoolStop: true, exitKind: state.children[0].signal === "SIGTERM" ? "pool-SIGTERM" : "exit0" });
    ok = true;
  } catch (error) {
    state.emit("failure", { code: state.failureCode(error) });
    process.exitCode = 1;
    try { await active?.close(); } catch { /* Closure remains unproven. */ }
  } finally {
    clearTimeout(deadline);
    state.emit("summary", { ok, cases: cases.length, modulePassed, runEnded, suiteEnded, afterAllEnded, denied: state.denied });
    if (!ok) process.exitCode = 1;
  }
}
