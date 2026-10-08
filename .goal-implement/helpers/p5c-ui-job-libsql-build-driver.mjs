import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import dc from 'node:diagnostics_channel';
import { registerHooks, createRequire, builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const manifestPath = new URL('./p5c-ui-job-libsql-build-manifest.json', import.meta.url);
const envelope = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const raw = zlib.inflateSync(Buffer.from(envelope.payloadZlibBase64, 'base64'), { maxOutputLength: 2097152 });
if (raw.length !== envelope.payloadBytes || crypto.createHash('sha256').update(raw).digest('hex') !== envelope.payloadSha256) throw Error('TOOL_BINDING');
const binding = JSON.parse(raw);
const node = binding.node;
const sourceRoot = binding.sourceRoot;
const root = binding.root;
const control = Number(process.env.HOLLOW_BUILD_CONTROL);
const state = { held: false, child: null, starts: 0, exits: 0, childExit: null, childSignal: null, childClose: false, stdoutEnd: false, stdoutClose: false, stdinFinish: false, stdinClose: false, streamError: false, stdinEndCalls: 0, buildDone: false, normalStopCalled: false, phase: 'SETUP', reason: null };
let frameCount = 0;
function held(reason = null) { state.held = true; if (state.reason === null && reason !== null) state.reason = reason; }
function emit(record) {
  const frame = Buffer.from(JSON.stringify(record) + '\n');
  if (++frameCount > 16 || frame.length > 512) { held('FRAME_LIMIT'); throw Error('TOOL_FRAME'); }
  try { if (fs.writeSync(control, frame) !== frame.length) throw Error('TOOL_FRAME'); } catch (error) { held('FRAME_WRITE'); throw error; }
}
if (process.execPath !== node || process.versions.node !== '24.15.0' || process.platform !== 'darwin' || process.arch !== 'arm64' || !Number.isInteger(control) || control < 3) throw Error('TOOL_NODE');
const byPath = new Map(binding.dependencies.map(row => [row.canonical, row]));
const binary = binding.dependencies.find(row => row.canonical.endsWith('/@esbuild/darwin-arm64/bin/esbuild'));
const original = { realpath: fs.realpathSync, readFile: fs.readFileSync, lstat: fs.lstatSync, open: fs.openSync, fstat: fs.fstatSync, close: fs.closeSync, read: fs.readSync };
function verify(filename, row) {
  const s = original.lstat(filename);
  if (!s.isFile() || s.uid !== row.uid || s.nlink !== row.nlink || (s.mode & 0o777) !== row.mode || s.size !== row.bytes || original.realpath(filename) !== filename) throw Error('TOOL_PUBLIC');
  const fd = original.open(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = original.fstat(fd);
    const bytes = original.readFile(fd);
    const after = original.fstat(fd);
    for (const key of ['dev', 'ino', 'size', 'mode', 'uid', 'nlink', 'mtimeMs', 'ctimeMs']) if (s[key] !== before[key] || before[key] !== after[key]) throw Error('TOOL_PUBLIC');
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== row.sha256) throw Error('TOOL_PUBLIC');
  } finally { original.close(fd); }
}
for (const row of binding.dependencies) verify(row.canonical, row);
emit({ event: 'header', schemaVersion: 1, entries: 4, nativeWorkers: 0, database: false });
const subscriptions = [];
function subscribe(name, handler) { const channel = dc.channel(name); channel.subscribe(handler); subscriptions.push([channel, handler]); }
subscribe('tracing:child_process.spawn:start', ({ process: child, options }) => {
  state.starts++;
  // This callback observes the stock spawn; it is not a permission gate.
  const args = options?.args;
  if (state.starts !== 1 || state.child !== child || options?.file !== binary.canonical || !Array.isArray(args) || args.length !== 3 || args[0] !== binary.canonical || args[1] !== '--service=0.27.7' || args[2] !== '--ping' || options?.cwd !== path.join(sourceRoot, 'apps/web') || options?.detached !== false) held('SPAWN_BINDING');
});
subscribe('child_process', ({ process: child }) => {
  if (state.child) { held('EXTRA_CHILD'); return; }
  state.child = child;
  child.once('error', () => held('CHILD_ERROR'));
  child.once('exit', (code, signal) => { state.exits++; state.childExit = code; state.childSignal = signal === null ? null : signal === 'SIGTERM' ? 'SIGTERM' : 'OTHER'; });
  child.once('close', () => { state.childClose = true; });
  child.once('spawn', () => {
    if (child !== state.child || child.stderr !== null || !child.stdin || !child.stdout || !Number.isInteger(child.pid)) { held('SERVICE_REGISTRATION'); return; }
    child.stdin.once('finish', () => { state.stdinFinish = true; });
    child.stdin.once('close', () => { state.stdinClose = true; });
    child.stdin.once('error', () => { state.streamError = true; held('STDIN_ERROR'); });
    child.stdout.once('end', () => { state.stdoutEnd = true; });
    child.stdout.once('close', () => { state.stdoutClose = true; });
    child.stdout.once('error', () => { state.streamError = true; held('STDOUT_ERROR'); });
    emit({ event: 'service', registered: true, count: 1, stderr: null, observation: 'after-start', ownedPid: child.pid });
  });
});
subscribe('worker_threads', () => held('WORKER_OBSERVED'));
subscribe('net.client.socket', ({ socket }) => { if (socket.remoteAddress !== undefined) held('REMOTE_SOCKET'); });
const allowed = new Set(binding.dependencies.map(row => row.canonical));
const builtins = new Set(builtinModules.flatMap(name => [name, 'node:' + name]));
registerHooks({
  resolve(specifier, context, next) {
    const result = next(specifier, context);
    if (builtins.has(specifier) || result.url.startsWith('node:')) return result;
    if (!result.url.startsWith('file:') || !allowed.has(fileURLToPath(result.url))) { held('RESOLVE_SCOPE'); throw Error('TOOL_SCOPE'); }
    return result;
  },
  load(url, context, next) {
    if (!url.startsWith('node:') && (!url.startsWith('file:') || !/\.(?:js|mjs|cjs|json)$/.test(fileURLToPath(url)))) { held('LOAD_SCOPE'); throw Error('TOOL_SCOPE'); }
    return next(url, context);
  },
});
const require = createRequire(import.meta.url);
const net = require('node:net');
const tls = require('node:tls');
const dns = require('node:dns');
const dgram = require('node:dgram');
const deny = () => { held('PORT_DENIED'); throw Error('TOOL_PORT'); };
net.Socket.prototype.connect = deny;
net.Server.prototype.listen = deny;
net.connect = deny;
net.createConnection = deny;
tls.connect = deny;
dgram.createSocket = deny;
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'reverse']) {
  dns[name] = deny;
  if (dns.promises && name in dns.promises) dns.promises[name] = deny;
}
process.dlopen = deny;
const serviceModule = binding.dependencies.find(row => row.canonical.endsWith('/esbuild/lib/main.js')).canonical;
let esbuild;
let timer;
try {
  state.phase = 'IMPORT_PENDING';
  esbuild = await import(serviceModule);
  state.phase = 'IMPORT_RETURNED';
  timer = setTimeout(() => { held('DEADLINE'); process.exitCode = 1; }, 60000);
  state.phase = 'BUILD_PENDING';
  const result = await esbuild.build({
    entryPoints: binding.entries.map(name => path.join(sourceRoot, 'apps/web/app/worker/node', name + '.ts')),
    outdir: path.join(root, 'outputs/browse'),
    absWorkingDir: path.join(sourceRoot, 'apps/web'),
    bundle: true, platform: 'node', format: 'esm', target: 'node22',
    outExtension: { '.js': '.mjs' },
    external: ['@libsql/client', 'libsql', 'css-tree'],
    metafile: true,
  });
  state.buildDone = true;
  state.phase = 'BUILD_RETURNED';
  if (state.held || state.starts !== 1 || !state.child || result.errors.length !== 0 || result.warnings.length !== 0) { held(state.held ? 'BUILD_HELD' : 'BUILD_RESULT'); throw Error('TOOL_BUILD'); }
  state.phase = 'INPUT_CHECK';
  const knownInputs = new Set([...binding.source.map(row => path.join(sourceRoot, row.path)), ...byPath.keys()]);
  for (const input of Object.keys(result.metafile.inputs)) {
    const resolved = path.resolve(sourceRoot, 'apps/web', input);
    const canonical = original.realpath(resolved);
    if (!knownInputs.has(canonical)) { held('INPUT_SCOPE'); throw Error('TOOL_INPUT'); }
  }
  state.phase = 'OUTPUT_CHECK';
  const outputs = Object.keys(result.metafile.outputs).map(output => path.resolve(sourceRoot, 'apps/web', output)).sort();
  const expected = binding.entries.map(name => path.join(root, 'outputs/browse', name + '.mjs')).sort();
  if (JSON.stringify(outputs) !== JSON.stringify(expected)) { held('OUTPUT_SET'); throw Error('TOOL_OUTPUT'); }
  state.phase = 'BUILT_FRAME';
  emit({ event: 'built', entries: 4, inputs: Object.keys(result.metafile.inputs).length, warnings: 0 });
  state.phase = 'STDIN_END';
  const child = state.child;
  state.stdinEndCalls++;
  // Post-build control operation, not the timing of esbuild's default stop.
  Reflect.apply(child.stdin.end, child.stdin, []);
  state.phase = 'SERVICE_CLOSE';
  while (!(state.childClose && state.exits === 1 && state.stdoutEnd && state.stdoutClose && state.stdinFinish && state.stdinClose)) {
    if (state.held) { held('CLOSURE_HELD'); throw Error('TOOL_CLOSURE'); }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  if (state.childExit !== 0 || state.childSignal !== null || state.streamError || state.stdinEndCalls !== 1) { held('CLOSURE_RESULT'); throw Error('TOOL_CLOSURE'); }
  state.normalStopCalled = true;
  state.phase = 'ORIGINAL_STOP';
  await esbuild.stop();
  clearTimeout(timer);
  state.phase = 'CLOSED_FRAME';
  emit({ event: 'closed', buildDone: true, serviceCount: 1, exit: 0, signal: null, close: true, stdoutEnd: true, stdoutClose: true, stdinFinish: true, stdinClose: true, stderr: null, stdinEndCalls: 1, originalStopCalled: true, rootForce: false, nativeWorkers: 0 });
} catch {
  held('UNKNOWN');
  if (timer) clearTimeout(timer);
  try { emit({ event: 'held', kind: 'UNKNOWN', phase: state.phase, reason: state.reason }); } catch {}
  process.exitCode = 1;
} finally {
  // Missing closure is left to the outer owned-process deadline, never promoted.
  if (state.held) process.exitCode = 1;
}
