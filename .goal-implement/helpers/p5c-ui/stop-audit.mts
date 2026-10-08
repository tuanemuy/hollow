import { spawn, type ChildProcess } from 'node:child_process';
import { constants } from 'node:fs';
import { lstat, open, readdir, readlink, realpath, type FileHandle } from 'node:fs/promises';
import type { Server, Socket } from 'node:net';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Readable, Writable } from 'node:stream';
import type { Worker } from 'node:worker_threads';

export const RELEASE_SHA = '93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0';
const MiB = 1024 * 1024;
function fail(code: string): never { throw new Error(code); }
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
async function bounded<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('UI_DEADLINE')), ms); })]); }
  finally { clearTimeout(timer); }
}
export type ResourceSnapshot = Readonly<{ bytes: number; chromeBytes: number; databaseBytes: number; files: number }>;
export type RegularDatabaseClassification = Readonly<{ kind: 'app-database'; name: 'active' | 'opaque' | 'audit' }> | Readonly<{ kind: 'owned-chrome-profile' | 'other' | 'unknown-database' }>;
export function classifyRegularDatabase(root: string, filename: string, ownedProfile: string | null): RegularDatabaseClassification {
  const canonical = (value: string) => path.isAbsolute(value) && path.normalize(value) === value;
  const descendant = (value: string, directory: string) => value.startsWith(`${directory}${path.sep}`);
  if (!canonical(root) || !canonical(filename) || !descendant(filename, root)) return { kind: 'unknown-database' };
  const relative = path.relative(root, filename);
  const app = /^(active|opaque|audit)\.db(?:-(?:wal|shm|journal))?$/.exec(relative);
  if (app) {
    const name = app[1];
    if (name === 'active' || name === 'opaque' || name === 'audit') return { kind: 'app-database', name };
  }
  if (ownedProfile !== null && canonical(ownedProfile) && descendant(ownedProfile, root) && descendant(filename, ownedProfile)) return { kind: 'owned-chrome-profile' };
  return { kind: /\.(?:db|sqlite|sqlite3)(?:-(?:wal|shm|journal))?$/.test(relative) ? 'unknown-database' : 'other' };
}
export type LedgerEntry = Readonly<{ code: string; value: number | boolean | string }>;
export type GuardEntryType = 'directory' | 'regular' | 'symlink' | 'socket' | 'other' | 'unknown';
export type GuardContext = Readonly<{ location: 'root' | 'owned-chrome-profile' | 'chrome-tmp' | 'objects' | 'node-tmp' | 'other' | 'unknown'; type: GuardEntryType; knownMetadataName: boolean }>;
export function isOwnedChromeVersionLink(input: Readonly<{ root: string; ownedProfile: string | null; filename: string; currentChrome: boolean; symlink: boolean; uid: number; ownerUid: number; nlink: number; bytes: number; target: string | null }>): boolean {
  return input.currentChrome && input.ownedProfile !== null && classifyRegularDatabase(input.root, input.filename, input.ownedProfile).kind === 'owned-chrome-profile' && input.filename === path.join(input.ownedProfile, 'RunningChromeVersion') && input.symlink && input.uid === input.ownerUid && input.nlink === 1 && input.target === '154.0.8037.98:1' && input.bytes === Buffer.byteLength(input.target) && input.bytes <= 32;
}
export function classifyGuardContext(root: string, chromeRoot: string, ownedProfile: string | null, filename: string, type: GuardEntryType): GuardContext {
  const canonical = (value: string) => path.isAbsolute(value) && path.normalize(value) === value;
  const inside = (value: string, directory: string) => value === directory || value.startsWith(`${directory}${path.sep}`);
  const bound = canonical(root) && canonical(filename) && inside(filename, root);
  let location: GuardContext['location'] = 'unknown';
  if (bound) {
    if (ownedProfile !== null && canonical(ownedProfile) && inside(ownedProfile, root) && inside(filename, ownedProfile)) location = 'owned-chrome-profile';
    else if (canonical(chromeRoot) && path.dirname(chromeRoot) === root && inside(filename, chromeRoot)) location = 'chrome-tmp';
    else if (inside(filename, path.join(root, 'objects'))) location = 'objects';
    else if (inside(filename, path.join(root, 'node-tmp'))) location = 'node-tmp';
    else if (filename === root || path.dirname(filename) === root) location = 'root';
    else location = 'other';
  }
  return Object.freeze({ location, type, knownMetadataName: bound && path.basename(filename) === 'RunningChromeVersion' });
}
export type ChildKind = 'chrome' | 'app' | 'search' | 'metadata';
export type ChildReceipt = { readonly child: ChildProcess; readonly kind: ChildKind; readonly pid: number; readonly ownProcessGroup: boolean; readonly searchWorker: { start: boolean; exit: boolean } | null; exit: boolean; close: boolean; ipcDisconnected: boolean; signal: NodeJS.Signals | null; code: number | null };
type PipeReceipt = { stream: Readable | Writable; readable: boolean; writable: boolean; end: boolean; finish: boolean; close: boolean };
type WorkerKind='parser'|'projection'|'search';
type WorkerReceipt = { worker: Worker; kind: WorkerKind; exit: boolean; code: number | null; parser:{operation:'detect'|'extract';success:boolean;adapterTerminate:boolean;monitorTerminate:boolean}|null };
export type Reservation<T>={commit(value:T):void;cancel():void};
export type StopReport = Readonly<{ kind: 'normal' | 'forced' | 'unproven'; children: number; workers: number; searchWorkersProxied: number; searchWorkerPipesDirectlyObserved: 0; pipes: number; fds: number; servers: number; pipeReadEof:number;pipeWriteFinish:number;pipeWriteClosedWithoutFinish:number;chromeKnownPidsAbsent:boolean;chromeGroupAbsent:boolean; actualClosed: boolean }>;
export type AuditExpectations = Readonly<{
  accountId: string;
  noteIds: readonly [string, string];
  attemptIds: readonly [string, string, string];
  jobs: readonly Readonly<{ id: string; noteId: string; state: 'failed' | 'cancelled' | 'succeeded' }>[];
  record: Readonly<{ id: string; noteId: string; bytes: 1024; sha256: string }>;
}>;
export type AuditSummary = Readonly<{ foreignKeys: true; integrity: true; accounts: 1; notes: 2; attempts: 3; targets: number; heads: number; jobs: number; records: 1; owners: 0; pins: 0; auditClosed: true }>;
export interface Supervisor {
  readonly root: string;
  readonly chromeRoot: string;
  readonly entries: readonly LedgerEntry[];
  readonly failure: Error | null;
  note(code: string, value?: number | boolean | string): void;
  guard(): Promise<ResourceSnapshot>;
  start(onFailure?: () => Promise<void>): void;
  knownChild(child: ChildProcess, options: Readonly<{ kind: ChildKind; ownProcessGroup?: boolean }>): ChildReceipt;
  knownWorker(worker: Worker, kind: WorkerKind, operation?:'detect'|'extract'): void;
  reserveWorker(kind:WorkerKind,operation?:'detect'|'extract'):Reservation<Worker>;
  reserveChild(kind:ChildKind):Reservation<ChildProcess>;
  parserTerminate(worker:Worker):void;
  failed(code:string):void;
  beginChromeSetup(profile:string,host:string):Promise<void>;
  ownChrome(child:ChildProcess):void;
  knownFd(handle: FileHandle): void;
  knownPipe(stream: Readable | Writable): void;
  knownServer(server: Server,kind:'app'|'provider'|'proxy'): void;
  registerChrome(child: ChildProcess, profileRoot: string, pids: readonly number[], host: string): Promise<void>;
  chromeProcesses(pids: readonly number[]): void;
  stop(normalClose: () => Promise<void>): Promise<StopReport>;
  copyAndAudit(input: Readonly<{ activeDatabase: string; expectations: AuditExpectations }>): Promise<AuditSummary>;
}

export async function createSupervisor(options: Readonly<{ root: string; chromeRoot: string }>): Promise<Supervisor> {
  const { root, chromeRoot } = options;
  if (!path.isAbsolute(root) || path.normalize(root) !== root || path.dirname(chromeRoot) !== root) fail('UI_ROOT_BINDING');
  const uid = process.getuid?.() ?? fail('UI_UID_UNAVAILABLE');
  for (const directory of [root, chromeRoot]) {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.uid !== uid || (stat.mode & 0o7777) !== 0o700 || await realpath(directory) !== directory) fail('UI_ROOT_MODE');
  }
  const began = performance.now();
  const entries: LedgerEntry[] = [];
  const children: ChildReceipt[] = [];
  const verifiedGroups = new Set<ChildProcess>();
  const workers: WorkerReceipt[] = [];
  const pipes: PipeReceipt[] = [];
  const fds: { handle: FileHandle; closed: boolean }[] = [];
  const servers: { server: Server; kind:'app'|'provider'|'proxy'; closed: boolean; sockets: Set<Socket> }[] = [];
  const workerReservations=new Map<WorkerKind,number>();const childReservations=new Map<ChildKind,number>();
  let chromeSetup:{profile:string;host:string;until:number}|null=null;let setupPending=false;let guardInFlight:Promise<ResourceSnapshot>|null=null;let stopCallback:(()=>Promise<void>)|undefined;
  let failure: Error | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let checking = false;
  let stopped: StopReport | null = null;
  let stopTask: Promise<StopReport> | null = null;
  let auditUsed = false;
  let chrome: { child: ChildProcess; profile: string; host: string; pids: Set<number>; nativeDirectory: string | null; cookie: string | null } | null = null;
  const note = (code: string, value: number | boolean | string = true) => {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(code) || entries.length >= 4096 || (typeof value === 'number' && !Number.isSafeInteger(value)) || (typeof value === 'string' && !/^(normal|forced|unproven|closed|open|unused|missing|persisted|reload|denied)$/.test(value))) fail('UI_LEDGER_VALUE');
    entries.push(Object.freeze({ code, value }));
  };
  const inside = (candidate: string, directory: string) => candidate === directory || candidate.startsWith(`${directory}${path.sep}`);
  async function singletonLinks(): Promise<Set<string>> {
    const allowed = new Set<string>();
    if (!chrome) return allowed;
    const names = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'] as const;
    const values: Partial<Record<typeof names[number], string>> = {};
    for (const name of names) {
      const filename = path.join(chrome.profile, name);
      try {
        const stat = await lstat(filename);
        if (!stat.isSymbolicLink() || stat.uid !== uid) fail('UI_SINGLETON_TYPE');
        values[name] = await readlink(filename);
        allowed.add(filename);
      } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
    }
    if(setupPending){
      const candidates:string[]=[];for(const name of await readdir(chromeRoot)){if(name==='profile')continue;const file=path.join(chromeRoot,name),entry=await lstat(file);if(entry.isDirectory()){const entries=await readdir(file);if(entries.includes('SingletonCookie')||entries.includes('SingletonSocket'))candidates.push(name);}}if(candidates.length>1)fail('UI_SINGLETON_SETUP_EXTRA');
      if(candidates.length){const directory=path.join(chromeRoot,candidates[0]!);if(chrome.nativeDirectory&&chrome.nativeDirectory!==directory)fail('UI_SINGLETON_CHANGED');const stat=await lstat(directory);if(!stat.isDirectory()||stat.uid!==uid||(stat.mode&0o7777)!==0o700||await realpath(directory)!==directory)fail('UI_SINGLETON_DIRECTORY');chrome.nativeDirectory=directory;for(const name of await readdir(directory)){if(name!=='SingletonCookie'&&name!=='SingletonSocket')fail('UI_SINGLETON_EXTRA');const file=path.join(directory,name),stat=await lstat(file);if(name==='SingletonCookie'){const cookie=await readlink(file);if(!stat.isSymbolicLink()||stat.uid!==uid||!/^[0-9]{1,64}$/.test(cookie)||chrome.cookie&&chrome.cookie!==cookie)fail('UI_SINGLETON_COOKIE');chrome.cookie=cookie;}else if(!stat.isSocket()||stat.uid!==uid||(stat.mode&0o7077)!==0)fail('UI_SINGLETON_SOCKET_MODE');allowed.add(file);}}
    }
    const profileControls=Object.keys(values).length;if(setupPending&&profileControls===0)return allowed;
    if (profileControls === 0) {
      if (chrome.nativeDirectory && chrome.cookie) {
        const directory = chrome.nativeDirectory;
        let retained = false;
        try { retained = (await lstat(directory)).isDirectory(); }
        catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
        if (retained) {
          const stat = await lstat(directory);
          const socket = path.join(directory, 'SingletonSocket');
          const cookiePath = path.join(directory, 'SingletonCookie');
          const names = await readdir(directory);if(names.length===0)return allowed;
          const socketStat = await lstat(socket), cookieStat = await lstat(cookiePath);
          if (stat.uid !== uid || (stat.mode & 0o7777) !== 0o700 || await realpath(directory) !== directory || names.length !== 2 || !names.includes('SingletonSocket') || !names.includes('SingletonCookie') || !socketStat.isSocket() || socketStat.uid !== uid || (socketStat.mode & 0o7077) !== 0 || !cookieStat.isSymbolicLink() || cookieStat.uid !== uid || await readlink(cookiePath) !== chrome.cookie) fail('UI_SINGLETON_RETAINED');
          allowed.add(socket); allowed.add(cookiePath);
        }
      }
      return allowed;
    }
    if (!chrome.child.pid || chrome.child.exitCode !== null || chrome.child.signalCode !== null) fail('UI_SINGLETON_PARTIAL');
    if(profileControls!==3){
      if(!setupPending)fail('UI_SINGLETON_PARTIAL');const lock=values.SingletonLock,cookie=values.SingletonCookie,socket=values.SingletonSocket;
      if(lock&&lock!==`${chrome.host}-${chrome.child.pid}`||cookie&&!/^[0-9]{1,64}$/.test(cookie)||cookie&&chrome.cookie&&cookie!==chrome.cookie)fail('UI_SINGLETON_BINDING');
      if(socket&&(!path.isAbsolute(socket)||path.normalize(socket)!==socket||Buffer.byteLength(socket)>253||path.basename(socket)!=='SingletonSocket'||path.dirname(path.dirname(socket))!==chromeRoot||chrome.nativeDirectory&&chrome.nativeDirectory!==path.dirname(socket)))fail('UI_SINGLETON_SOCKET_PATH');
      return allowed;
    }
        const lock = values.SingletonLock;
    const cookie = values.SingletonCookie;
    const socket = values.SingletonSocket;
    if ((!lock&&!setupPending) || !cookie || !socket || (lock&&lock !== `${chrome.host}-${chrome.child.pid}`) || !/^[0-9]{1,64}$/.test(cookie)) fail('UI_SINGLETON_BINDING');
    if (!path.isAbsolute(socket) || path.normalize(socket) !== socket || Buffer.byteLength(socket) > 253 || path.basename(socket) !== 'SingletonSocket') fail('UI_SINGLETON_SOCKET_PATH');
    const directory = path.dirname(socket);
    if (path.dirname(directory) !== chromeRoot || directory === chrome.profile) fail('UI_SINGLETON_SOCKET_ROOT');
    if (chrome.nativeDirectory && chrome.nativeDirectory !== directory || chrome.cookie && chrome.cookie !== cookie) fail('UI_SINGLETON_CHANGED');
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.uid !== uid || (stat.mode & 0o7777) !== 0o700 || await realpath(directory) !== directory) fail('UI_SINGLETON_DIRECTORY');
    const socketStat = await lstat(socket);
    if (!socketStat.isSocket() || socketStat.uid !== uid || (socketStat.mode & 0o7077) !== 0) fail('UI_SINGLETON_SOCKET_MODE');
    const cookiePath = path.join(directory, 'SingletonCookie');
    const cookieStat = await lstat(cookiePath);
    if (!cookieStat.isSymbolicLink() || cookieStat.uid !== uid || await readlink(cookiePath) !== cookie) fail('UI_SINGLETON_COOKIE');
    const contents = await readdir(directory);
    if (contents.length !== 2 || !contents.includes('SingletonCookie') || !contents.includes('SingletonSocket')) fail('UI_SINGLETON_EXTRA');
    chrome.nativeDirectory = directory;
    chrome.cookie = cookie;
    allowed.add(socket); allowed.add(cookiePath);
    return allowed;
  }
  async function performGuard(): Promise<ResourceSnapshot> {
    while(setupPending&&!chrome){if(!chromeSetup||performance.now()>chromeSetup.until)fail("UI_CHROME_SETUP_TIMEOUT");await sleep(10);}
    if(setupPending&&chromeSetup&&performance.now()>chromeSetup.until)fail("UI_CHROME_SETUP_TIMEOUT");
    if (performance.now() - began > 720_000) fail('UI_WHOLE_DEADLINE');
    const special = await singletonLinks();
    let bytes = 0, chromeBytes = 0, databaseBytes = 0, files = 0;
    const categories = new Map<string, number>();
    function entryFail(code: string, filename: string, stat: Awaited<ReturnType<typeof lstat>>): never {
      const type: GuardEntryType = stat.isDirectory() ? 'directory' : stat.isFile() ? 'regular' : stat.isSymbolicLink() ? 'symlink' : stat.isSocket() ? 'socket' : 'other';
      throw Object.assign(new Error(code), { guardContext: classifyGuardContext(root, chromeRoot, chrome?.profile ?? null, filename, type) });
    }
    async function walk(directory: string): Promise<void> {
      const before = await lstat(directory);
      if (!before.isDirectory() || before.uid !== uid || await realpath(directory) !== directory) fail('UI_DIRECTORY_BINDING');
      for (const name of await readdir(directory)) {
        const filename = path.join(directory, name);
        const stat = await lstat(filename);
        if (stat.uid !== uid) entryFail('UI_ENTRY_UID', filename, stat);
        if (special.has(filename)) continue;
        const profileEntry = chrome && inside(filename, chrome.profile);
        const mode = stat.mode & 0o7777;
        if (name === 'RunningChromeVersion') {
          const target = stat.isSymbolicLink() && stat.size <= 32 ? await readlink(filename) : null;
          if (!isOwnedChromeVersionLink({ root, ownedProfile: chrome?.profile ?? null, filename, currentChrome: chrome !== null, symlink: stat.isSymbolicLink(), uid: stat.uid, ownerUid: uid, nlink: stat.nlink, bytes: stat.size, target })) entryFail('UI_ENTRY_TYPE', filename, stat);
          files++; bytes += stat.size; chromeBytes += stat.size;
          if (bytes > 256 * MiB || files > 20_000) entryFail('UI_ROOT_CAPACITY', filename, stat);
          continue;
        }
        if (stat.isDirectory()) {
          if (!(mode === 0o700 || profileEntry && filename !== chrome?.profile && mode === 0o755)) entryFail('UI_DIRECTORY_MODE', filename, stat);
          await walk(filename);
        } else if (stat.isFile()) {
          if (!(mode === 0o600 || profileEntry && mode === 0o644) || stat.nlink !== 1) entryFail('UI_FILE_MODE', filename, stat);
          files++; bytes += stat.size;
          if (inside(filename, chromeRoot)) chromeBytes += stat.size;
          const relative = path.relative(root, filename);
          const category = relative.split(path.sep)[0] ?? '';
          categories.set(category, (categories.get(category) ?? 0) + stat.size);
          const database = classifyRegularDatabase(root, filename, chrome?.profile ?? null);
          if (database.kind === 'app-database') {
            databaseBytes += stat.size;
            const key = database.name;
            categories.set(`db-${key}`, (categories.get(`db-${key}`) ?? 0) + stat.size);
          } else if (database.kind === 'unknown-database') entryFail('UI_UNKNOWN_DATABASE', filename, stat);
        } else entryFail('UI_ENTRY_TYPE', filename, stat);
        if (bytes > 256 * MiB || files > 20_000) entryFail('UI_ROOT_CAPACITY', filename, stat);
      }
      const after = await lstat(directory);
      if (!after.isDirectory() || after.ino !== before.ino || after.dev !== before.dev || after.uid !== uid) fail('UI_DIRECTORY_CHANGED');
    }
    await walk(root);
    if (chromeBytes > 128 * MiB || databaseBytes > 48 * MiB) fail('UI_CAPACITY');
    for (const name of ['active', 'opaque', 'audit']) if ((categories.get(`db-${name}`) ?? 0) > 16 * MiB) fail('UI_DATABASE_CAPACITY');
    for (const [name, cap] of [['objects', MiB], ['material', 256 * 1024], ['node-tmp', 8 * MiB]] as const) if ((categories.get(name) ?? 0) > cap) fail('UI_CATEGORY_CAPACITY');
    const logs = (categories.get('logs') ?? 0) + (categories.get('results') ?? 0) + (categories.get('helpers') ?? 0);
    if (logs > 12 * MiB) fail('UI_LOG_CAPACITY');
    return Object.freeze({ bytes, chromeBytes, databaseBytes, files });
  }
  async function guard():Promise<ResourceSnapshot>{if(!guardInFlight)guardInFlight=performGuard().finally(()=>{guardInFlight=null;});return guardInFlight;}
  function knownPipe(stream: Readable | Writable,role?:{readable:boolean;writable:boolean}) {
    if (pipes.some(p => p.stream === stream)) return;
    const readable = role?.readable??('readableEnded' in stream && (stream.readable || stream.readableEnded));
    const writable = role?.writable??('writableFinished' in stream && (stream.writable || stream.writableFinished));
    const receipt: PipeReceipt = { stream, readable, writable, end: readable && Boolean((stream as Readable).readableEnded), finish: writable && Boolean((stream as Writable).writableFinished), close: stream.closed };
    stream.once('end', () => { receipt.end = true; });
    stream.once('finish', () => { receipt.finish = true; });
    stream.once('close', () => { receipt.close = true; });
    stream.once('error', () => { failure ??= new Error('UI_PIPE_ERROR'); });
    pipes.push(receipt);
  }
  function knownChild(child: ChildProcess, options: Readonly<{ kind: ChildKind; ownProcessGroup?: boolean }>): ChildReceipt {
    const old = children.find(c => c.child === child);
    if (old) return old;
    const pid = child.pid ?? 0;
    if (pid === process.pid || pid===1) fail('UI_CHILD_REGISTRATION');
    const cap = options.kind === 'search' ? 16 : 1;
    if (children.filter(c => c.kind === options.kind).length >= cap || options.kind === 'search' && children.some(c => c.kind === 'search' && !c.close)) fail('UI_CHILD_CAPACITY');
    const receipt: ChildReceipt = { child, pid, kind: options.kind, ownProcessGroup: options.ownProcessGroup ?? false, searchWorker: options.kind === 'search' ? { start: false, exit: false } : null, exit: false, close: false, ipcDisconnected: !child.connected, signal: null, code: null };
    if (receipt.searchWorker) child.on('message', (message: unknown) => {
      if (!message || typeof message !== 'object' || !('kind' in message) || message.kind !== 'diagnostic' || !('stage' in message) || (message.stage !== 'worker-start' && message.stage !== 'worker-exit')) return;
      const evidence = receipt.searchWorker;
      if (!evidence || Object.keys(message).length !== 3 || !('remainingMs' in message) || typeof message.remainingMs !== 'number' || !Number.isFinite(message.remainingMs) || receipt.exit || receipt.close || (message.stage === 'worker-start' ? evidence.start || evidence.exit : !evidence.start || evidence.exit)) { failure ??= new Error('UI_SEARCH_WORKER_DIAGNOSTIC'); return; }
      if (message.stage === 'worker-start') evidence.start = true;
      else evidence.exit = true;
      note(message.stage === 'worker-start' ? 'search-worker-start-proxy' : 'search-worker-exit-proxy');
    });
    child.once('exit', (code, signal) => { receipt.exit = true; receipt.code = code; receipt.signal = signal; });
    child.once('close', () => { receipt.close = true; });
    child.once('disconnect', () => { receipt.ipcDisconnected = true; });
    child.once('error', () => { failure ??= new Error('UI_CHILD_ERROR'); });
    for(const [index,stream] of child.stdio.entries())if(stream)knownPipe(stream,options.kind==='chrome'?{readable:[1,2,4].includes(index),writable:[0,3].includes(index)}:undefined);if(options.kind==='chrome')note('chrome-five-stdio',child.stdio.length===5&&child.stdio.every(Boolean));
    children.push(receipt);
    return receipt;
  }
  const chromeKnownPidsAbsent = () => {
    if (!chrome) return true;
    for (const pid of chrome.pids) {
      try { process.kill(pid, 0); return false; }
      catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) return false; }
    }
    return true;
  };
  const chromeGroupPresence=():'unused'|'absent'|'alive'|'unproven'=>{
    if(!chrome)return 'unused';if(!verifiedGroups.has(chrome.child)||!chrome.child.pid)return 'unproven';
    try{process.kill(-chrome.child.pid,0);return 'alive';}catch(error){return error instanceof Error&&'code'in error&&error.code==='ESRCH'?'absent':'unproven';}
  };
  const chromeGroupAbsent=()=>{const state=chromeGroupPresence();return state==='unused'||state==='absent';};
  const actualClosed = () => children.every(c => c.exit && c.close && c.ipcDisconnected && !c.child.connected) && chromeKnownPidsAbsent() && chromeGroupAbsent() && workers.every(w => w.exit) && pipes.every(p => p.close && p.stream.closed && (!p.readable || p.end)) && fds.every(f => f.closed && f.handle.fd === -1) && servers.every(s => s.closed && s.sockets.size === 0);
  async function awaitClosed(ms: number): Promise<boolean> {
    const until = performance.now() + ms;
    while (!actualClosed() && performance.now() < until) await sleep(200);
    return actualClosed();
  }
  const api: Supervisor = {
    root, chromeRoot, entries,
    get failure() { return failure; },
    note, guard,
    start(onFailure) {
      stopCallback=onFailure;if (timer || stopped) fail('UI_SUPERVISOR_START');
      timer = setInterval(() => {
        if (checking || stopped) return;
        checking = true;
        void guard().catch(() => { failure ??= new Error('UI_GUARD_FAILED'); void api.stop(onFailure ?? (async () => fail('UI_EMERGENCY_STOP'))); }).finally(() => { checking = false; });
      }, 200);
    },
    knownChild,
    reserveWorker(kind,operation){
      const group=workers.filter(w=>(w.kind==='search')===(kind==='search'));const reserved=[...workerReservations].filter(([k])=>(k==='search')===(kind==='search')).reduce((n,[,v])=>n+v,0);
      if(group.length+reserved>=(kind==='search'?16:8)||group.filter(w=>!w.exit).length+reserved>=(kind==='search'?1:2))fail('UI_WORKER_CAPACITY');
      if(kind==='parser'&&operation!=='detect'&&operation!=='extract')fail('UI_PARSER_OPERATION');workerReservations.set(kind,(workerReservations.get(kind)??0)+1);let pending=true;
      const release=()=>{if(!pending)fail('UI_RESERVATION_USED');pending=false;workerReservations.set(kind,(workerReservations.get(kind)??1)-1);};
      return {cancel:release,commit(worker){release();api.knownWorker(worker,kind,operation);}};
    },
    reserveChild(kind){const pending=childReservations.get(kind)??0;if(children.filter(c=>c.kind===kind).length+pending>=(kind==='search'?16:1)||(kind==='search'&&children.some(c=>c.kind==='search'&&!c.close))||pending)fail('UI_CHILD_CAPACITY');childReservations.set(kind,pending+1);let live=true;const release=()=>{if(!live)fail('UI_RESERVATION_USED');live=false;childReservations.set(kind,(childReservations.get(kind)??1)-1);};return {cancel:release,commit(child){release();knownChild(child,{kind,ownProcessGroup:kind==='chrome'});}};},
    knownWorker(worker,kind,operation) {
      if(workers.some(w=>w.worker===worker))fail('UI_WORKER_DUPLICATE');
      const receipt:WorkerReceipt={worker,kind,exit:false,code:null,parser:kind==='parser'&&operation?{operation,success:false,adapterTerminate:false,monitorTerminate:false}:null};
      workers.push(receipt);
      worker.once('exit',code=>{receipt.exit=true;receipt.code=code;});worker.once('error',()=>{failure??=new Error('UI_WORKER_ERROR');});
      if(receipt.parser)worker.once('message',(message:unknown)=>{const parser=receipt.parser!;const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);if(!object(message)||message.ok!==true||!('value'in message))return;const value=message.value;parser.success=parser.operation==='detect'?value==='text':object(value)&&typeof value.html==='string'&&value.html.length<=800*1024&&['complete','partial','no_text'].includes(String(value.coverage))&&Array.isArray(value.notices)&&value.notices.length<=10000&&value.notices.every(v=>object(v)&&typeof v.code==='string'&&v.code.length<=80&&typeof v.location==='string'&&v.location.length<=1024&&typeof v.message==='string'&&v.message.length<=2048);note('parser-success-message',parser.success);});
      if(worker.stdout)knownPipe(worker.stdout);if(worker.stderr)knownPipe(worker.stderr);
    },
    parserTerminate(worker){const row=workers.find(w=>w.worker===worker);if(row?.parser&&!row.parser.monitorTerminate){row.parser.adapterTerminate=true;note('parser-adapter-terminate');}},
    failed(code){if(!/^[A-Z][A-Z0-9_]{0,79}$/.test(code))fail('UI_FAILURE_CODE');failure??=new Error(code);void api.stop(stopCallback??(async()=>fail('UI_STOP_UNAVAILABLE')));},
    async beginChromeSetup(profile,host){if(chromeSetup||chrome||path.dirname(profile)!==chromeRoot||! /^[A-Za-z0-9._-]{1,253}$/.test(host))fail('UI_CHROME_SETUP');await guard();chromeSetup={profile,host,until:performance.now()+30000};setupPending=true;},
    ownChrome(child){if(!chromeSetup||chrome)fail('UI_CHROME_EARLY_OWNER');const pid=child.pid??fail('UI_CHROME_PID');chrome={child,profile:chromeSetup.profile,host:chromeSetup.host,pids:new Set([pid]),nativeDirectory:null,cookie:null};note('chrome-early-owned');},
    knownFd(handle) {
      if (handle.fd < 0 || fds.some(f => f.handle === handle)) fail('UI_FD_REGISTRATION');
      const receipt = { handle, get closed() { return handle.fd === -1; } };
      fds.push(receipt);
    },
    knownPipe,
    knownServer(server,kind) {
      if (servers.some(s => s.server === server) || servers.length >= 3 || servers.some(s=>s.kind===kind)) fail('UI_SERVER_CAPACITY');
      const receipt = { server, kind, closed: false, sockets: new Set<Socket>() };
      server.on('connection', socket => { receipt.sockets.add(socket); socket.once('close', () => { receipt.sockets.delete(socket); }); });
      server.once('close', () => { receipt.closed = true; }); servers.push(receipt);
    },
    async registerChrome(child, profileRoot, pids, host) {
      if (!chrome || chrome.child!==child || chrome.profile!==profileRoot || chrome.host!==host || path.dirname(profileRoot) !== chromeRoot) fail('UI_CHROME_REGISTRATION');
      const pid = child.pid ?? fail('UI_CHROME_PID');
      if (!/^[A-Za-z0-9._-]{1,253}$/.test(host)) fail('UI_CHROME_HOST');
      const known = new Set([pid, ...pids]);
      if (known.size > 17 || [...known].some(value => !Number.isSafeInteger(value) || value <= 1 || value === process.pid)) fail('UI_CHROME_PROCESS_CAP');
      chrome.pids=known;
      const probe = spawn('/bin/ps', ['-p', [...known].join(','), '-o', 'pid=,ppid=,pgid='], { stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: '/usr/bin:/bin', LANG: 'C' } });
      const receipt = knownChild(probe, { kind: 'metadata' });
      let output = '', stderrBytes = 0, overflow = false;
      probe.stdout.setEncoding('utf8');
      probe.stdout.on('data', (chunk: string) => { if (Buffer.byteLength(output) + Buffer.byteLength(chunk) > 8192) overflow = true; else output += chunk; });
      probe.stderr.on('data', (chunk: Buffer) => { stderrBytes += chunk.byteLength; if (stderrBytes > 1024) overflow = true; });
      await bounded(new Promise<void>((resolve, reject) => { probe.once('close', () => resolve()); probe.once('error', () => reject(new Error('UI_CHROME_METADATA_FAILED'))); }), 2000);
      if (!receipt.exit || !receipt.close || receipt.code !== 0 || receipt.signal || overflow || stderrBytes !== 0) fail('UI_CHROME_METADATA_EXIT');
      const found = new Set<number>();
      for (const line of output.trim().split('\n')) {
        const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(line);
        if (!match) fail('UI_CHROME_METADATA_SHAPE');
        const processId = Number(match[1]), parent = Number(match[2]), group = Number(match[3]);
        if (!known.has(processId) || found.has(processId) || group !== pid || (processId === pid ? parent !== process.pid : !known.has(parent))) fail('UI_CHROME_METADATA_BINDING');
        found.add(processId);
      }
      if (found.size !== known.size) fail('UI_CHROME_METADATA_MISSING');
      verifiedGroups.add(child);
      setupPending=false;note('chrome-pg-bound');await guard();
    },
    chromeProcesses(pids) {
      if (!chrome) fail('UI_CHROME_UNREGISTERED');
      for (const pid of pids) { if (!Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid) fail('UI_CHROME_PID'); chrome.pids.add(pid); }
      if (chrome.pids.size > 17) fail('UI_CHROME_PROCESS_CAP');
    },
    async stop(normalClose) {
      if (stopTask) return stopTask;
      stopTask = (async () => {
      clearInterval(timer);
      let normal = false;
      const stopStarted = performance.now();
      try { await bounded(normalClose(), 120_000); normal = await awaitClosed(Math.max(0, 120_000 - (performance.now() - stopStarted))); }
      catch { failure ??= new Error('UI_NORMAL_CLOSE_UNPROVEN'); }
      let forced = false;
      if (!normal) {
        for (const worker of workers) if (!worker.exit) { forced = true;if(worker.parser)worker.parser.monitorTerminate=true; void worker.worker.terminate().catch(() => { failure ??= new Error('UI_WORKER_STOP_FAILED'); }); }
        for (const signal of ['SIGTERM', 'SIGKILL'] as const) {
          for (const child of children) {
            const groupState=child.kind==='chrome'?chromeGroupPresence():'unused';const ownedGroupAlive=groupState==='alive';if(!ownedGroupAlive&&(child.exit||child.child.exitCode!==null||child.child.signalCode!==null))continue;
            forced = true;
            try {if(child.ownProcessGroup&&verifiedGroups.has(child.child)){if(groupState==='alive')process.kill(-child.pid,signal);else if(groupState==='unproven'){failure??=new Error('UI_CHROME_PG_UNPROVEN');child.child.kill(signal);}}else child.child.kill(signal);}
            catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) failure ??= new Error('UI_SELF_SIGNAL_FAILED'); }
          }
          if (await awaitClosed(10_000)) break;
        }
        await awaitClosed(10_000);
      }
      const searchWorkersProxied = children.filter(c => c.kind === 'search' && c.searchWorker?.start && c.searchWorker.exit && c.exit && c.close && c.code === 0 && c.signal === null).length;
      stopped = Object.freeze({ kind: normal && !failure && children.every(c => c.signal === null && c.code === 0 && (c.kind !== 'search' || c.searchWorker?.start && c.searchWorker.exit)) && workers.every(w => w.parser ? w.parser.success&&w.parser.adapterTerminate&&!w.parser.monitorTerminate&&(w.code===0||w.code===1) : w.code===0) ? 'normal' : forced ? 'forced' : 'unproven', children: children.length, workers: workers.length, searchWorkersProxied, searchWorkerPipesDirectlyObserved: 0, pipes: pipes.length, fds: fds.length, servers: servers.length,pipeReadEof:pipes.filter(p=>p.readable&&p.end).length,pipeWriteFinish:pipes.filter(p=>p.writable&&p.finish).length,pipeWriteClosedWithoutFinish:pipes.filter(p=>p.writable&&p.close&&!p.finish).length,chromeKnownPidsAbsent:chromeKnownPidsAbsent(),chromeGroupAbsent:chromeGroupAbsent(), actualClosed: actualClosed() });
      note('search-workers-proxied', searchWorkersProxied);
      note('search-worker-pipes-direct', false);
      note('search-worker-pipes-source', searchWorkersProxied > 0);
      note('chrome-known-pids-absent',stopped.chromeKnownPidsAbsent);note('chrome-pg-absent',stopped.chromeGroupAbsent);if(chromeGroupPresence()==='unproven')note('chrome-pg-state','unproven');
      note('stop-kind', stopped.kind); note('actual-closed', stopped.actualClosed);
      return stopped;
      })();
      return stopTask;
    },
    async copyAndAudit({ activeDatabase, expectations: expected }) {
      if (auditUsed || stopped?.kind !== 'normal' || !stopped.actualClosed || failure || activeDatabase !== path.join(root, 'active.db')) fail('UI_AUDIT_GATE');
      if (expected.jobs.length !== 4 || new Set(expected.jobs.map(job => job.id)).size !== 4 || new Set(expected.noteIds).size !== 2 || new Set(expected.attemptIds).size !== 3 || expected.record.noteId !== expected.noteIds[0] || expected.record.bytes !== 1024 || !/^[a-f0-9]{64}$/.test(expected.record.sha256)) fail('UI_AUDIT_EXPECTATIONS');
      auditUsed = true;
      await guard();
      for (const suffix of ['-wal', '-journal']) {
        try { if ((await lstat(activeDatabase + suffix)).size !== 0) fail('UI_AUDIT_WAL'); }
        catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
      }
      async function copy(source: string, destination: string) {
        const stat = await lstat(source);
        if (!stat.isFile() || stat.uid !== uid || (stat.mode & 0o7777) !== 0o600 || stat.size > 16 * MiB) fail('UI_COPY_SOURCE');
        const input = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW); api.knownFd(input);
        let output: FileHandle | null = null;
        try {
          output = await open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); api.knownFd(output);
          const buffer = Buffer.alloc(64 * 1024); let position = 0;
          while (position < stat.size) {
            if (performance.now() - began > 720_000) fail('UI_COPY_DEADLINE');
            const { bytesRead } = await input.read(buffer, 0, Math.min(buffer.length, stat.size - position), position);
            if (bytesRead === 0) fail('UI_COPY_SHORT');
            let wrote = 0; while (wrote < bytesRead) { const result = await output.write(buffer, wrote, bytesRead - wrote, position + wrote); if (!result.bytesWritten) fail('UI_COPY_WRITE'); wrote += result.bytesWritten; }
            position += bytesRead;
          }
          const after = await input.stat(); if (after.ino !== stat.ino || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs) fail('UI_COPY_CHANGED');
          await output.sync();
        } finally { await Promise.all([input.close(), ...(output ? [output.close()] : [])]); }
      }
      const opaque = path.join(root, 'opaque.db'), audit = path.join(root, 'audit.db');
      await copy(activeDatabase, opaque); await copy(opaque, audit);
      const database = new DatabaseSync(audit, { readOnly: true, enableForeignKeyConstraints: true, timeout: 1000 });
      let closed = false;
      try {
        database.exec('PRAGMA query_only=ON');
        const scalar = (sql: string, ...args: (string | number | null)[]) => { const row = database.prepare(sql).get(...args); const value = row && Object.values(row)[0]; return typeof value === 'number' ? value : fail('UI_AUDIT_SCALAR'); };
        if (database.prepare('PRAGMA foreign_key_check').all().length !== 0 || database.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok') fail('UI_AUDIT_INTEGRITY');
        if (scalar('SELECT count(*) FROM accounts') !== 1 || scalar('SELECT count(*) FROM accounts WHERE id=?', expected.accountId) !== 1 || scalar('SELECT count(*) FROM notes') !== 2) fail('UI_AUDIT_SCOPE');
        for (const id of expected.noteIds) if (scalar('SELECT count(*) FROM notes WHERE id=? AND owner_account_id=? AND owner_workspace_id IS NULL', id, expected.accountId) !== 1) fail('UI_AUDIT_NOTE');
        if (scalar('SELECT count(*) FROM drive_authorization_attempts') !== 3) fail('UI_AUDIT_ATTEMPTS');
        for (const id of expected.attemptIds) if (scalar('SELECT count(*) FROM drive_authorization_attempts WHERE id=? AND account_id=?', id, expected.accountId) !== 1) fail('UI_AUDIT_ATTEMPT');
        for (const table of ['drive_authorization_attempts', 'drive_control_operations', 'drive_backup_transfers']) if (scalar(`SELECT count(*) FROM ${table} WHERE owner_state IN ('active','unknown')`) !== 0) fail('UI_AUDIT_OWNER');
        if (scalar('SELECT count(*) FROM drive_backup_transfers WHERE read_pinned!=0 OR refresh_pending!=0') !== 0 || scalar('SELECT count(*) FROM object_writes WHERE active!=0') !== 0 || scalar("SELECT count(*) FROM regeneration_source_attempts WHERE owner_state IN ('active','unknown') OR (owner_state='closed' AND (coalesce(json_extract(completion,'$.callerEnded'),0)!=1 OR coalesce(json_extract(completion,'$.acknowledged'),0)!=1))") !== 0) fail('UI_AUDIT_PIN');
        if (scalar('SELECT count(*) FROM drive_backup_targets') !== 3 || scalar('SELECT count(*) FROM drive_backup_target_heads') !== 2 || scalar('SELECT count(*) FROM drive_backup_jobs') !== 4 || scalar('SELECT count(*) FROM drive_backup_records') !== 1) fail('UI_AUDIT_COUNTS');
        if (scalar('SELECT count(*) FROM originals') !== 2 || scalar('SELECT count(*) FROM originals WHERE note_id IN (?,?) AND account_id=? AND bytes=1024 AND state=\'ready\'', ...expected.noteIds, expected.accountId) !== 2) fail('UI_AUDIT_ORIGINALS');
        if (scalar("SELECT count(*) FROM drive_connections WHERE account_id=? AND state='linked' AND folder IS NOT NULL AND auto_backup=0", expected.accountId) !== 1) fail('UI_AUDIT_CONNECTION');
        if (scalar("SELECT count(*) FROM drive_backup_targets t JOIN originals o ON o.id=t.original_id JOIN notes n ON n.id=o.note_id JOIN drive_connections c ON c.account_id=t.account_id WHERE t.account_id=? AND n.id IN (?,?) AND t.note_id=n.id AND t.subject=json_extract(c.credential,'$.subject') AND ((t.state='unallocated' AND t.file_id IS NULL) OR (t.state='confirmed' AND t.file_id IS NOT NULL))", expected.accountId, ...expected.noteIds) !== 3 || scalar("SELECT count(*) FROM drive_backup_targets WHERE state='unallocated'") !== 2 || scalar("SELECT count(*) FROM drive_backup_targets WHERE state='confirmed'") !== 1) fail('UI_AUDIT_TARGET');
        if (scalar("SELECT count(*) FROM drive_backup_target_heads h JOIN drive_backup_targets t ON t.id=h.target_id JOIN originals o ON o.id=h.original_id JOIN notes n ON n.id=o.note_id WHERE h.account_id=? AND n.id IN (?,?) AND h.account_id=t.account_id AND h.original_id=t.original_id AND h.subject=t.subject AND t.note_id=n.id", expected.accountId, ...expected.noteIds) !== 2) fail('UI_AUDIT_HEAD');
        for (const job of expected.jobs) {
          if (!expected.noteIds.includes(job.noteId) || scalar('SELECT count(*) FROM drive_backup_jobs j JOIN drive_backup_targets t ON t.id=j.target_id JOIN originals o ON o.id=t.original_id WHERE j.id=? AND j.account_id=? AND j.note_id=? AND j.state=? AND j.terminal_at IS NOT NULL AND t.note_id=j.note_id AND t.account_id=j.account_id AND o.note_id=j.note_id AND json_extract(j.admission_identity,\'$.subject\')=t.subject AND json_extract(j.admission_identity,\'$.sha256\')=o.sha256 AND json_extract(j.admission_identity,\'$.bytes\')=o.bytes', job.id, expected.accountId, job.noteId, job.state) !== 1) fail('UI_AUDIT_JOB');
        }
        if (scalar("SELECT count(*) FROM drive_backup_jobs WHERE note_id=? AND state='failed' AND record_id IS NULL", expected.noteIds[0]) !== 2 || scalar("SELECT count(DISTINCT target_id) FROM drive_backup_jobs WHERE note_id=? AND state='failed'", expected.noteIds[0]) !== 1 || scalar("SELECT count(*) FROM drive_backup_jobs WHERE note_id=? AND state='cancelled' AND record_id IS NULL", expected.noteIds[1]) !== 1 || scalar("SELECT count(*) FROM drive_backup_jobs WHERE note_id=? AND state='succeeded' AND record_id=?", expected.noteIds[0], expected.record.id) !== 1) fail('UI_AUDIT_HISTORY');
        if (scalar("SELECT count(*) FROM drive_backup_jobs j JOIN drive_backup_targets t ON t.id=j.target_id WHERE j.note_id=? AND j.state='failed' AND t.state='unallocated'", expected.noteIds[0]) !== 2 || scalar("SELECT count(*) FROM drive_backup_jobs j JOIN drive_backup_targets t ON t.id=j.target_id WHERE j.note_id=? AND j.state='cancelled' AND t.state='unallocated'", expected.noteIds[1]) !== 1) fail('UI_AUDIT_OLD_TARGETS');
        const record = expected.record;
        if (scalar("SELECT count(*) FROM drive_backup_records r JOIN drive_backup_targets t ON t.id=r.target_id JOIN originals o ON o.id=r.original_id JOIN drive_connections c ON c.account_id=r.account_id JOIN drive_backup_target_heads h ON h.target_id=t.id WHERE r.id=? AND r.account_id=? AND r.note_id=? AND r.bytes=? AND r.sha256=? AND o.note_id=r.note_id AND o.bytes=r.bytes AND o.sha256=r.sha256 AND t.original_id=o.id AND t.note_id=r.note_id AND t.account_id=r.account_id AND t.state='confirmed' AND t.file_id=r.file_id AND t.subject=r.subject AND r.subject=json_extract(c.credential,'$.subject') AND t.folder=r.folder AND json_extract(r.folder,'$.id')=json_extract(c.folder,'$.id') AND h.original_id=o.id AND h.account_id=r.account_id AND h.subject=r.subject", record.id, expected.accountId, record.noteId, record.bytes, record.sha256) !== 1) fail('UI_AUDIT_RECORD');
        if (scalar("SELECT count(*) FROM drive_backup_target_heads h JOIN drive_backup_targets t ON t.id=h.target_id WHERE t.note_id=? AND t.state='unallocated'", expected.noteIds[1]) !== 1) fail('UI_AUDIT_SECOND_HEAD');
        const transfers = scalar('SELECT count(*) FROM drive_backup_transfers');
        if (transfers > 4 || scalar("SELECT count(*) FROM drive_backup_transfers x JOIN drive_backup_jobs j ON j.id=x.job_id JOIN drive_backup_targets t ON t.id=x.target_id WHERE j.id IN (?,?,?,?) AND x.account_id=? AND x.account_id=j.account_id AND x.note_id=j.note_id AND x.target_id=j.target_id AND t.note_id=x.note_id AND x.owner_state IN ('none','closed') AND x.phase IN ('succeeded','failed','cancelled') AND x.read_pinned=0 AND x.refresh_pending=0", ...expected.jobs.map(job => job.id), expected.accountId) !== transfers) fail('UI_AUDIT_TRANSFER');
      } finally { database.close(); closed = !database.isOpen; note('audit-closed', closed); }
      await guard();
      if (!closed || !actualClosed()) fail('UI_AUDIT_CLOSE');
      note('copy-fds-closed');
      return Object.freeze({ foreignKeys: true, integrity: true, accounts: 1, notes: 2, attempts: 3, targets: 3, heads: 2, jobs: 4, records: 1, owners: 0, pins: 0, auditClosed: true });
    },
  };
  return api;
}
