import childProcess from "node:child_process";
import net from "node:net";
import tls from "node:tls";
import https from "node:https";
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
import { types } from "node:util";

const TREE = "/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006";
const self = fileURLToPath(import.meta.url);
const main = process.argv[1] === self;
const canonicalNode = "/nix/store/a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node";
if (realpathSync(process.execPath) !== canonicalNode || process.versions.node !== "24.18.0") {
  emit({ event: "failure", stage: "bootstrap", code: "P5D_NODE_BINDING", case: "none" });
  throw new Error("P5D_NODE_BINDING");
}
const stages = [
  ["native-http", "accountDeletionNativeHttp.integration.test.ts", ["HTTP01"]],
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
let tlsClosed = false;
let numericLookupReceipt = null;
const checkpointKeys = new Set(["account", "begin-callback", "adoption-ready", "native-ledger", "use-query", "use-count", "use-active", "caller-active", "closure-absent", "registry-empty-active", "origin-empty", "callback-result", "registry-empty-closed", "use-closed-acked", "attempt-completed", "origin-native", "connection-linked", "delete-accepted", "sweep", "attempts-cleared", "uses-cleared", "origin-cleared", "connection-cleared", "final-ledger"]);
let checkpointSeen = false;
function emit(value) { if (main) process.stdout.write(`P5D ${JSON.stringify(value)}\n`); }
const reportedDenials = new Set();
function deny(method) {
  violation = true;
  if (!reportedDenials.has(method) && reportedDenials.size < 4) {
    reportedDenials.add(method);
    process.stdout.write(`P5D ${JSON.stringify({ event: "denial", method, context: main ? "node-main" : "vitest-fork" })}\n`);
  }
  throw new Error("P5D_RESOURCE_DENIED");
}
const databaseRoot = process.env.HOLLOW_ACCOUNT_DELETION_HTTP_ROOT;
const toolTmpRoot = `${databaseRoot}-cert-tool-tmp`;
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
const ownerRoot = `${databaseRoot}/openrouter-owner`;
const allowedFiles = new Set([`${databaseRoot}/native-http.db`, `${databaseRoot}/native-http.db-wal`, `${databaseRoot}/native-http.db-shm`, `${databaseRoot}/openrouter.key`, `${databaseRoot}/openrouter.json`, `${databaseRoot}/tls.key`, `${databaseRoot}/tls.crt`, `${databaseRoot}/tls-request.cnf`]);
const createdOwnerFiles = new Map();
const createdSecretFiles = new Set();
let ownerIdentity = null;
let recordIdentity = null;
let ownerWrites = 0;
const nativeRename = fsPromises.rename.bind(fsPromises);
const nativeUnlink = fsPromises.unlink.bind(fsPromises);
const nativeMkdir = fsPromises.mkdir.bind(fsPromises);
const nativeOpen = fsPromises.open.bind(fsPromises);
const ownerTemporary = (path) => typeof path === "string" && dirname(path) === ownerRoot && /^owner-[a-f0-9-]{36}\.tmp$/.test(basename(path));
const sameOwner = () => {
  if (!ownerIdentity) deny("fs.promises.rename");
  const value = nativeLstatSync(ownerRoot);
  if (!value.isDirectory() || value.isSymbolicLink() || value.dev !== ownerIdentity.dev || value.ino !== ownerIdentity.ino || value.uid !== process.getuid?.() || (value.mode & 0o7777) !== 0o700 || realpathSync(ownerRoot) !== ownerRoot) deny("fs.promises.rename");
};
const sameFile = (path, expected, method) => {
  const value = nativeLstatSync(path);
  if (!expected || !value.isFile() || value.isSymbolicLink() || value.dev !== expected.dev || value.ino !== expected.ino || value.uid !== process.getuid?.() || value.nlink !== 1 || (value.mode & 0o7777) !== 0o600 || value.size > 16_384) deny(method);
};
const writable = (value, method) => {
  const path = value instanceof URL ? fileURLToPath(value) : value;
  if (typeof path !== "string" || !allowedFiles.has(resolve(path)) || path === `${databaseRoot}/openrouter.key` || path === `${databaseRoot}/openrouter.json` || path === `${databaseRoot}/tls.key` || path === `${databaseRoot}/tls.crt` || path === `${databaseRoot}/tls-request.cnf`) deny(method);
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
fsPromises.mkdir = async (path, options) => {
  if (typeof path !== "string" || !options || Object.keys(options).join(",") !== "mode" || options.mode !== 0o700 || path !== databaseRoot && path !== ownerRoot) deny("fs.promises.mkdir");
  if (path === databaseRoot) {
    const value = nativeLstatSync(path);
    if (!value.isDirectory() || value.isSymbolicLink() || value.uid !== process.getuid?.() || (value.mode & 0o7777) !== 0o700 || realpathSync(path) !== path) deny("fs.promises.mkdir");
    return nativeMkdir(path, options);
  }
  if (ownerIdentity) deny("fs.promises.mkdir");
  const result = await nativeMkdir(path, options);
  ownerIdentity = nativeLstatSync(path);
  sameOwner();
  return result;
};
fsPromises.open = async (path, flags, mode) => {
  if (writes(flags) && (path === `${databaseRoot}/openrouter.key` || path === `${databaseRoot}/openrouter.json`)) {
    if (flags !== (fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW) || mode !== 0o600 || createdSecretFiles.has(path)) deny("fs.promises.open-write");
    const file = await nativeOpen(path, flags, mode);
    createdSecretFiles.add(path);
    return file;
  }
  if (writes(flags) && (path === `${ownerRoot}/recovery.lock` || ownerTemporary(path))) {
    sameOwner();
    if (flags !== (fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW) || mode !== 0o600 || createdOwnerFiles.has(path) || createdOwnerFiles.size >= 2 || ownerWrites++ >= 100) deny("fs.promises.open-write");
    const file = await nativeOpen(path, flags, mode);
    createdOwnerFiles.set(path, await file.stat());
    sameFile(path, createdOwnerFiles.get(path), "fs.promises.open-write");
    return file;
  }
  if (writes(flags)) writable(path, "fs.promises.open-write");
  return nativeOpen(path, flags, mode);
};
fsPromises.rename = async (source, target) => {
  sameOwner();
  if (!ownerTemporary(source) || target !== `${ownerRoot}/owner.json`) deny("fs.promises.rename");
  sameFile(source, createdOwnerFiles.get(source), "fs.promises.rename");
  if (recordIdentity) sameFile(target, recordIdentity, "fs.promises.rename");
  else { try { nativeLstatSync(target); deny("fs.promises.rename"); } catch (error) { if (error?.code !== "ENOENT") throw error; } }
  const result = await nativeRename(source, target);
  recordIdentity = createdOwnerFiles.get(source);
  createdOwnerFiles.delete(source);
  sameFile(target, recordIdentity, "fs.promises.rename");
  return result;
};
fsPromises.unlink = async (path) => {
  sameOwner();
  if (path !== `${ownerRoot}/recovery.lock`) deny("fs.promises.unlink");
  sameFile(path, createdOwnerFiles.get(path), "fs.promises.unlink");
  const result = await nativeUnlink(path);
  createdOwnerFiles.delete(path);
  return result;
};
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
const nativeConnect = net.Socket.prototype.connect;
const nativeListen = net.Server.prototype.listen;
const nativeTlsConnect = tls.connect;
const nativeLookup = dns.lookup;
const expectedCa = fs.readFileSync(`${databaseRoot}/tls.crt`);
if (expectedCa.length === 0 || expectedCa.length > 64 * 1024) deny("tls-connect");
let ownedListener = null;
let ownedPort = null;
let tlsCalls = 0;
let socketCalls = 0;
let nativeTlsDepth = 0;
let listenerLookupScope = null;
let numericLookupCalls = 0;
const tlsLedger = { accepted: 0, acceptedClosed: 0, tlsSockets: 0, tlsSocketClosed: 0, clientSockets: 0, clientSocketClosed: 0, requests: 0, requestClosed: 0, responseClosed: 0, listenerClosed: false };
net.Server.prototype.listen = function (...args) {
  const options = args[0];
  if (main || ownedListener || !(this instanceof https.Server) || args.length !== 2 || typeof args[1] !== "function" || !options || Object.keys(options).sort().join(",") !== "exclusive,host,port" || options.host !== "127.0.0.1" || options.port !== 0 || options.exclusive !== true) deny("server-listen");
  ownedListener = this;
  this.on("connection", (socket) => { tlsLedger.accepted++; socket.once("close", () => { tlsLedger.acceptedClosed++; }); if (tlsLedger.accepted > 2 || tlsLedger.accepted - tlsLedger.acceptedClosed > 1) deny("socket-connect"); });
  this.on("secureConnection", (socket) => { tlsLedger.tlsSockets++; socket.once("close", () => { tlsLedger.tlsSocketClosed++; }); if (socket.servername !== "openrouter.ai" || tlsLedger.tlsSockets > 2) deny("tls-connect"); });
  this.on("request", (request, response) => { tlsLedger.requests++; request.once("close", () => { tlsLedger.requestClosed++; }); response.once("close", () => { tlsLedger.responseClosed++; }); if (tlsLedger.requests > 2) deny("tls-connect"); });
  this.once("close", () => {
    tlsLedger.listenerClosed = true;
    if (!Object.entries(tlsLedger).every(([key, value]) => key === "listenerClosed" ? value === true : value === 2)) deny("tls-connect");
    process.stdout.write(`P5D_HTTP ${JSON.stringify({ event: "tls-closed", ...tlsLedger })}\n`);
  });
  this.once("listening", () => {
    const address = this.address();
    if (!address || typeof address === "string" || address.address !== "127.0.0.1" || address.family !== "IPv4" || !Number.isInteger(address.port) || address.port < 1 || address.port > 65535) deny("server-listen");
    ownedPort = address.port;
  });
  if (listenerLookupScope !== null) deny("server-listen");
  listenerLookupScope = this;
  try { return nativeListen.apply(this, args); } finally { listenerLookupScope = null; }
};
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (main || nativeTlsDepth !== 1 || socketCalls++ >= 2 || !options || options.host !== "openrouter.ai" || options.port !== ownedPort || typeof options.lookup !== "function") deny("socket-connect");
  return nativeConnect.apply(this, args);
};
tls.connect = function (...args) {
  const options = args[0];
  if (types.isProxy(options)) deny("tls-connect");
  const pathDescriptor = options !== null && typeof options === "object" ? Object.getOwnPropertyDescriptor(options, "path") : undefined;
  if (pathDescriptor && !Object.hasOwn(pathDescriptor, "value")) deny("tls-connect");
  const agentNullPath = pathDescriptor?.value === null && Object.getPrototypeOf(options) === null && !Object.hasOwn(options, "socketPath") && Reflect.ownKeys(options).every((key) => Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), "value"));
  if (pathDescriptor?.value === null && !agentNullPath) deny("tls-connect");
  if (main || !ownedListener?.listening || tlsCalls++ >= 2 || !options || (options.host ?? options.hostname) !== "openrouter.ai" || options.port !== ownedPort || options.servername !== "openrouter.ai" || options.rejectUnauthorized !== true || options.checkServerIdentity !== undefined && options.checkServerIdentity !== tls.checkServerIdentity || !Buffer.isBuffer(options.ca) || !options.ca.equals(expectedCa) || typeof options.lookup !== "function" || options.socket !== undefined || options.path !== undefined && !agentNullPath) deny("tls-connect");
  nativeTlsDepth++;
  try {
    const socket = nativeTlsConnect.apply(this, args);
    tlsLedger.clientSockets++;
    socket.once("close", () => { tlsLedger.clientSocketClosed++; });
    if (tlsLedger.clientSockets > 2 || tlsLedger.clientSockets - tlsLedger.clientSocketClosed > 1) { socket.destroy(); deny("tls-connect"); }
    return socket;
  } finally { nativeTlsDepth--; }
};
dgram.createSocket = () => deny("datagram-create");
for (const object of [dns, dnsPromises, dns.Resolver.prototype, dnsPromises.Resolver.prototype]) {
  for (const name of ["lookup", "lookupService", "resolve", "resolve4", "resolve6", "resolveAny", "resolveCaa", "resolveCname", "resolveMx", "resolveNaptr", "resolveNs", "resolvePtr", "resolveSoa", "resolveSrv", "resolveTxt", "reverse"]) {
    if (typeof object[name] === "function") object[name] = () => deny("dns-query");
  }
}
dns.lookup = function (...args) {
  const [hostname, options, callback] = args;
  if (main || this !== dns || listenerLookupScope === null || listenerLookupScope !== ownedListener || numericLookupCalls !== 0 || args.length !== 3 || hostname !== "127.0.0.1" || options === null || typeof options !== "object" || Object.getPrototypeOf(options) !== Object.prototype || Reflect.ownKeys(options).length !== 1 || Reflect.ownKeys(options)[0] !== "all" || options.family !== undefined || Object.getOwnPropertyDescriptor(options, "all")?.value !== true || typeof callback !== "function") deny("dns-query");
  numericLookupCalls++;
  const result = Reflect.apply(nativeLookup, this, args);
  if (args[2] !== callback) deny("dns-query");
  process.stdout.write('P5D_HTTP {"event":"numeric-lookup","numericApiCalls":1,"stockDelegated":true,"externalDnsQueries":0}\n');
  return result;
};
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
        const denied = JSON.parse(line.slice(4));
        if (denied.event !== "denial" || Object.keys(denied).sort().join(",") !== "context,event,method" || denied.context !== "vitest-fork" || typeof denied.method !== "string" || !/^(?:dns-query|socket-connect|server-listen|tls-connect|datagram-create|node-worker|harness-(?:argv|case|result)|child\.(?:fork|fork-handles|spawn|spawnSync|exec|execSync|execFile|execFileSync)|fs(?:\.promises)?\.(?:open-write|openSync-write|writeFile|writeFileSync|appendFile|appendFileSync|truncate|truncateSync|mkdir|mkdirSync|mkdtemp|mkdtempSync|rm|rmSync|rmdir|rmdirSync|unlink|unlinkSync|rename|renameSync|copyFile|copyFileSync|link|linkSync|symlink|symlinkSync|chmod|chmodSync))$/.test(denied.method)) deny("harness-result");
        violation = true; emit(denied); continue;
      }
      if (!line.startsWith("P5D_HTTP ")) continue;
      const packet = JSON.parse(line.slice(9));
      if (packet.event === "checkpoint") {
        if (checkpointSeen || Object.keys(packet).sort().join(",") !== "case,event,key" || packet.case !== "HTTP01" || typeof packet.key !== "string" || !checkpointKeys.has(packet.key)) deny("harness-result");
        checkpointSeen = true;
        emit({ event: "checkpoint", case: "HTTP01", key: packet.key });
        continue;
      }
      if (packet.event === "numeric-lookup") {
        if (numericLookupReceipt !== null || Object.keys(packet).sort().join(",") !== "event,externalDnsQueries,numericApiCalls,stockDelegated" || packet.numericApiCalls !== 1 || packet.stockDelegated !== true || packet.externalDnsQueries !== 0) deny("harness-result");
        numericLookupReceipt = { numericApiCalls: 1, stockDelegated: true, externalDnsQueries: 0 };
        continue;
      }
      if (packet.event === "tls-closed") {
        if (tlsClosed || Object.keys(packet).sort().join(",") !== "accepted,acceptedClosed,clientSocketClosed,clientSockets,event,listenerClosed,requestClosed,requests,responseClosed,tlsSocketClosed,tlsSockets" || !Object.entries(packet).every(([key, value]) => key === "event" ? value === "tls-closed" : key === "listenerClosed" ? value === true : value === 2)) deny("harness-result");
        tlsClosed = true; emit(packet); continue;
      }
      if (!tlsClosed || line !== 'P5D_HTTP {"event":"fixture-closed","executionStopped":true,"clientClosed":true,"listenerClosed":true}' || fixtureClosed) deny("harness-result");
      fixtureClosed = true;
      emit({ event: "fixture-closed", executionStopped: true, clientClosed: true, listenerClosed: true });
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
    if (process.cwd() !== TREE || process.env.HOLLOW_ACCOUNT_DELETION_HTTP_ROOT !== process.argv[2] || process.argv.length !== 3) deny("harness-argv");
    const { createVitest, ForksPoolWorker } = await import(pathToFileURL(vitestFile).href);
    class MemoryForksPoolWorker extends ForksPoolWorker {
      name = "p5d-http-memory-forks";
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
        onTestCaseReady(test) { const code = test.name.split(" ")[0]; if (!expected.includes(code)) deny("harness-case"); currentCase = code; },
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
        pool: { name: "p5d-http-memory-forks", createPoolWorker: (options) => new MemoryForksPoolWorker(options) }, maxWorkers: 1, fileParallelism: false, isolate: true, bail: 1, retry: 0,
        testTimeout: 40_000, hookTimeout: 40_000, teardownTimeout: 10_000,
        include: [relative], exclude: ["**/node_modules/**", "**/dist/**"], environment: "node",
        globals: true, cache: false, reporters: [reporter], api: false,
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
      if (files.length !== 1 || files[0].result?.state !== "pass" || actual.join(",") !== expected.join(",") || cases.some((row) => row.state !== "passed") || active.state.getUnhandledErrors().length || violation) throw new Error("P5D_CASE_FAILURE");
      phase = "close";
      await active.close(); active = null;
      phase = "wait-closed";
      await waitClosed();
      if (!fixtureClosed || !tlsClosed || numericLookupReceipt === null || !hooks.afterAllEnded) throw new Error("P5D_TOOL_CLOSE");
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
    emit({ event: "summary", ok: !failed && !violation && completed.length === 1, completed, cases, forks: children.length, forksActualClosed: children.every((row) => row.closed && row.exitObserved && row.stdoutEOF && row.stderrEOF), workerCount: 0, denied: violation, numericLookupReceipt });
    if (failed || violation || completed.length !== 1) process.exitCode = 1;
  }
}
