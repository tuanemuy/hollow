import { mkdir, lstat, realpath, readlink, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import childProcesses from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {createServer} from 'node:http';
import {Socket} from 'node:net';
import { hostname } from 'node:os';
import path from 'node:path';
import puppeteer, { type ElementHandle, type HTTPRequest, type JSHandle, type Page } from '/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import type { Supervisor } from './stop-audit.mts';

export const RELEASE_SHA = '93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0';
export type { ElementHandle, HTTPRequest, Page };
export type ResponseSpec = Readonly<{ status: number; contentType?: string; headers?: Readonly<Record<string, string>>; body?: string | Uint8Array }>;
export type DocumentTicket = Readonly<{ origin: string; path: string }>;
export interface BrowserHarness {
  readonly page: Page;
  readonly profileRoot: string;
  readonly chromeRoot: string;
  clickOnce(accessibleName: string, scope?: ElementHandle<Element>): Promise<void>;
  operationGate(gate:(request:HTTPRequest)=>void):void;
  dialogOnce(accept: boolean): Promise<void>;
  documentTicket(): Promise<DocumentTicket>;
  navigateBack(): Promise<Readonly<{ kind: 'persisted' | 'reload' | 'missing'; ticket: DocumentTicket | null }>>;
  close(): Promise<void>;
}
function fail(code: string): never { throw new Error(code); }
async function assertChromePublicMetadata(ledger: Supervisor): Promise<void> {
  const app = '/Applications/Google Chrome.app';
  const versions = app + '/Contents/Frameworks/Google Chrome Framework.framework/Versions';
  const framework = versions + '/154.0.8037.98';
  const current = versions + '/Current';
  const link = await lstat(current);
  if (!link.isSymbolicLink() || link.nlink !== 1 || link.size !== 13 || await readlink(current) !== '154.0.8037.98' || await realpath(current) !== framework) fail('UI_BROWSER_VERSION_BINDING');
  const directory = await lstat(framework);
  if (!directory.isDirectory() || await realpath(framework) !== framework) fail('UI_BROWSER_VERSION_BINDING');
  for (const [filename, size] of [[app + '/Contents/MacOS/Google Chrome', 367696], [framework + '/Google Chrome Framework', 517027008]] as const) {
    const stat = await lstat(filename);
    if (!stat.isFile() || stat.size !== size || (stat.mode & 0o7777) !== 0o775 || await realpath(filename) !== filename) fail('UI_BROWSER_EXECUTABLE_BINDING');
  }
  for (const [filename, size, sha] of [[app + '/Contents/Info.plist', 18856, '89dd2f1a7b8a46a153603197c416dab4078d47d499785422ba5286d4f39b2e69'], [framework + '/Resources/Info.plist', 1075, 'e18aa35402e19da4924b8db9502466c6997144f3e85b20cd433876629d826f46']] as const) {
    const stat = await lstat(filename);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size !== size || (stat.mode & 0o7777) !== 0o664 || await realpath(filename) !== filename) fail('UI_BROWSER_VERSION_BINDING');
    const handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      ledger.knownFd(handle);
      const before = await handle.stat();
      if (!before.isFile() || before.ino !== stat.ino || before.dev !== stat.dev || before.nlink !== stat.nlink || before.uid !== stat.uid || before.size !== size || before.mode !== stat.mode) fail('UI_BROWSER_VERSION_BINDING');
      const bytes = Buffer.alloc(size + 1); let at = 0;
      while (at < bytes.length) { const result = await handle.read(bytes, at, bytes.length - at, at); if (result.bytesRead === 0) break; at += result.bytesRead; }
      const after = await handle.stat();
      if (at !== size || after.ino !== before.ino || after.dev !== before.dev || after.nlink !== before.nlink || after.uid !== before.uid || after.size !== before.size || after.mode !== before.mode || after.mtimeMs !== before.mtimeMs || createHash('sha256').update(bytes.subarray(0, at)).digest('hex') !== sha) fail('UI_BROWSER_VERSION_BINDING');
    } finally { await handle.close(); }
  }
  const after = await lstat(current);
  if (!after.isSymbolicLink() || after.ino !== link.ino || after.dev !== link.dev || after.nlink !== link.nlink || after.size !== link.size || after.mtimeMs !== link.mtimeMs || await readlink(current) !== '154.0.8037.98' || await realpath(current) !== framework) fail('UI_BROWSER_VERSION_BINDING');
}

export async function createBrowserHarness(options: Readonly<{
  root: string;
  origin: string;
  respond(request: HTTPRequest): Promise<ResponseSpec | null>;
  ledger: Supervisor;
}>): Promise<BrowserHarness> {
  const { root, ledger, respond } = options;
  const origin = new URL(options.origin);
  if (origin.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(origin.hostname) || !origin.port || origin.username || origin.password || options.origin !== origin.origin) fail('UI_BROWSER_ORIGIN');
  if (root !== ledger.root || path.dirname(ledger.chromeRoot) !== root || (process.umask() & 0o077) !== 0o077) fail('UI_BROWSER_ROOT');
  const chromeRoot = ledger.chromeRoot;
  const profileRoot = path.join(chromeRoot, 'profile');
  const executable = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const binary = await lstat(executable);
  if (!binary.isFile() || (binary.mode & 0o7777) !== 0o775 || binary.size !== 367696) fail('UI_BROWSER_EXECUTABLE_BINDING');
  await assertChromePublicMetadata(ledger);
  if (Buffer.byteLength(path.join(chromeRoot, '.org.chromium.Chromium.XXXXXXXXXXXXXXXX', 'SingletonSocket')) > 253) fail('UI_BROWSER_SOCKET_LENGTH');
  await mkdir(profileRoot, { mode: 0o700 });
  for (const directory of [root, chromeRoot, profileRoot]) {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.uid !== process.getuid?.() || (stat.mode & 0o7777) !== 0o700 || await realpath(directory) !== directory) fail('UI_BROWSER_DIRECTORY');
  }
  let deniedBackground=0,proxyInputBytes=0,proxyOutputBytes=0,proxyOutputReserved=0,proxyConnections=0;const proxySockets=new Set<Socket>(),replied=new WeakSet<Socket>();
  const deniedReply=Buffer.from('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  const proxyCapacity=()=>{if(proxyInputBytes+proxyOutputReserved<=1024*1024)return true;ledger.failed('UI_PROXY_CAPACITY');for(const socket of proxySockets)socket.destroy();return false;};
  const deny=(socket:Socket)=>{if(++deniedBackground>150||replied.has(socket)){ledger.failed('UI_PROXY_CAPACITY');for(const owned of proxySockets)owned.destroy();return;}replied.add(socket);if(!proxyCapacity())return;proxyOutputReserved+=deniedReply.byteLength;if(!proxyCapacity())return;ledger.note('proxy-denied');socket.end(deniedReply);};
  const proxy=createServer({maxHeaderSize:8192,requestTimeout:8000,headersTimeout:8000},request=>deny(request.socket));
  proxy.on('checkContinue',request=>deny(request.socket));proxy.on('checkExpectation',request=>deny(request.socket));
  proxy.on('connect',(_request,socket)=>{if(!(socket instanceof Socket)){ledger.failed('UI_PROXY_SOCKET_TYPE');socket.destroy();return;}deny(socket);});
  proxy.on('connection',socket=>{proxySockets.add(socket);const startedWritten=socket.bytesWritten;if(++proxyConnections>150){ledger.failed('UI_PROXY_CONNECTION_CAP');for(const owned of proxySockets)owned.destroy();}socket.on('data',(chunk:Buffer)=>{proxyInputBytes+=chunk.byteLength;proxyCapacity();});socket.once('close',()=>{proxyOutputBytes+=socket.bytesWritten-startedWritten;proxySockets.delete(socket);if(proxyInputBytes+proxyOutputBytes>1024*1024)ledger.failed('UI_PROXY_CAPACITY');ledger.note('proxy-input-bytes',proxyInputBytes);ledger.note('proxy-output-bytes',proxyOutputBytes);});socket.setTimeout(8000,()=>socket.destroy());});
  proxy.on('clientError',(_error,socket)=>{ledger.failed('UI_PROXY_PROTOCOL');socket.destroy();});ledger.knownServer(proxy,'proxy');
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('UI_PROXY_LISTEN_TIMEOUT')),8000);proxy.once('error',error=>{clearTimeout(timer);reject(error);});proxy.listen(0,'127.0.0.1',()=>{clearTimeout(timer);resolve();});}).catch(async error=>{for(const socket of proxySockets)socket.destroy();await new Promise<void>(resolve=>proxy.close(()=>resolve()));throw error;});
  const address=proxy.address();if(!address||typeof address==='string')fail('UI_PROXY_ADDRESS');const proxyArg=`--proxy-server=http://127.0.0.1:${address.port}`;
  const bypassArg=`--proxy-bypass-list=<-loopback>;${origin.hostname}:${origin.port}`;
  let proxyClosed=false;const closeProxy=async()=>{if(proxyClosed)return;proxyClosed=true;for(const socket of proxySockets)socket.destroy();await new Promise<void>((resolve,reject)=>proxy.close(error=>error?reject(error):resolve()));if(proxySockets.size)await new Promise<void>(resolve=>setTimeout(resolve,0));if(proxySockets.size)fail('UI_PROXY_CLOSE_UNPROVEN');};
  const originalSpawn=childProcesses.spawn;let spawned:ReturnType<typeof childProcesses.spawn>|null=null;
  const observedSpawn=((...args:Parameters<typeof childProcesses.spawn>)=>{const [command,argv,config]=args;if(command!==executable||!Array.isArray(argv)||!argv.includes(`--user-data-dir=${profileRoot}`)||!argv.includes(proxyArg)||!argv.includes(bypassArg)||!argv.includes('--remote-debugging-pipe')||config?.detached!==true||!Array.isArray(config.stdio)||config.stdio.length!==5||!config.stdio.every(value=>value==='pipe')||spawned)fail('UI_CHROME_SPAWN_BINDING');const reserved=ledger.reserveChild('chrome');let child:ReturnType<typeof childProcesses.spawn>;try{child=originalSpawn(...args);}catch(error){reserved.cancel();throw error;}reserved.commit(child);spawned=child;ledger.ownChrome(child);return child;}) as typeof childProcesses.spawn;
  let browser:Awaited<ReturnType<typeof puppeteer.launch>>|null=null;
  try {
  await ledger.beginChromeSetup(profileRoot,hostname());childProcesses.spawn=observedSpawn;syncBuiltinESMExports();
  try {browser = await puppeteer.launch({
    executablePath: executable,
    userDataDir: profileRoot,
    protocol: 'cdp', pipe: true, headless: true, dumpio: false, timeout: 30_000,
    handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
    ignoreDefaultArgs: ['--disable-back-forward-cache'],args:[proxyArg,bypassArg],
    env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', LANG: 'en_US.UTF-8', TMPDIR: chromeRoot, MAC_CHROMIUM_TMPDIR: chromeRoot },
  });}finally{if(childProcesses.spawn!==observedSpawn){ledger.failed('UI_SPAWN_OBSERVER_CHANGED');fail('UI_SPAWN_OBSERVER_CHANGED');}childProcesses.spawn=originalSpawn;syncBuiltinESMExports();}
  const ownedBrowser=browser;
  const child = ownedBrowser.process() ?? fail('UI_BROWSER_PROCESS');
  if(!Object.is(child,spawned))fail('UI_CHROME_HANDLE_CHANGED');
  if (child.stdin && !child.stdin.writableEnded) child.stdin.end();
  child.stdout?.resume(); child.stderr?.resume();
  const cdp = await ownedBrowser.target().createCDPSession();
  const processInfo = await cdp.send('SystemInfo.getProcessInfo');
  const pids = processInfo.processInfo.map((info: { id: number }) => info.id);
  await ledger.registerChrome(child, profileRoot, pids, hostname());
  if (await ownedBrowser.version() !== 'Chrome/154.0.8037.98') fail('UI_BROWSER_VERSION_BINDING');
  if (ownedBrowser.browserContexts().length !== 1 || ownedBrowser.defaultBrowserContext() !== ownedBrowser.browserContexts()[0]) fail('UI_BROWSER_CONTEXT_COUNT');
  const pages = await ownedBrowser.pages();
  if (pages.length !== 1) fail('UI_BROWSER_PAGE_COUNT');
  const page = pages[0] ?? fail('UI_BROWSER_PAGE_MISSING');
  page.setDefaultTimeout(8_000); page.setDefaultNavigationTimeout(8_000);
  let opGate:((request:HTTPRequest)=>void)|null=null;
  let requests = 0, fixtureRequests = 0, requestBytes = 0, denied = 0;
  let fatal: Error | null = null;
  let closed = false;
  let mutationUnknown = false;
  let backUsed = false;
  let dialogPending: { accept: boolean; resolve(): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> } | null = null;
  const inflight = new Set<Promise<void>>();
  let currentDocument: { handle: JSHandle<object | null>; ticket: DocumentTicket } | null = null;
  let documentCount = 0;
  let webWorkers = 0;
  page.on('workercreated', () => { webWorkers++; if (webWorkers > 2) fatal ??= new Error('UI_WEB_WORKER_CAP'); });
  await page.evaluateOnNewDocument(() => {
    const key = '__hollow_ui_document__';
    Object.defineProperty(globalThis, key, { value: Object.freeze({}), configurable: false });
    let persisted = false;
    addEventListener('pageshow', event => { persisted = event.persisted; });
    Object.defineProperty(globalThis, '__hollow_ui_persisted__', { get: () => persisted });
  });
  await page.setRequestInterception(true);
  const network = await page.createCDPSession();
  await network.send('Network.enable');
  const networkKinds = new Map<string, 'app' | 'fixture' | 'denied'>();
  const responseBytes = { app: 0, fixture: 0, denied: 0 };
  network.on('Network.responseReceived', event => {
    const url = new URL(event.response.url);
    networkKinds.set(event.requestId, url.origin === origin.origin ? 'app' : ['accounts.google.com', 'apis.google.com', 'docs.google.com'].includes(url.hostname) ? 'fixture' : 'denied');
  });
  network.on('Network.dataReceived', event => {
    const kind = networkKinds.get(event.requestId);
    if (!kind) return;
    responseBytes[kind] += event.encodedDataLength;
    if (responseBytes.app > 48 * 1024 * 1024 || responseBytes.fixture > 12 * 1024 * 1024 || responseBytes.denied > 1024 * 1024) fatal ??= new Error('UI_BROWSER_RESPONSE_CAP');
  });
  network.on('Network.loadingFinished', event => { networkKinds.delete(event.requestId); });
  network.on('Network.loadingFailed', event => { networkKinds.delete(event.requestId); });
  const check = () => { if (closed || fatal || ledger.failure || mutationUnknown) fail('UI_BROWSER_UNPROVEN'); };
  page.on('dialog', dialog => {
    const pending = dialogPending;
    if (!pending) { fatal ??= new Error('UI_DIALOG_UNEXPECTED'); void dialog.dismiss().catch(() => {}); return; }
    dialogPending = null; clearTimeout(pending.timer);
    const result = pending.accept ? dialog.accept() : dialog.dismiss();
    void result.then(() => { ledger.note('dialog-once'); pending.resolve(); }, () => { mutationUnknown = true; pending.reject(new Error('UI_DIALOG_RESPONSE_UNKNOWN')); });
  });
  page.on('request', request => {
    const work = (async () => {
      const url = new URL(request.url());
      const body = request.postData();
      requestBytes += Buffer.byteLength(body ?? '');
      if (requestBytes > 48 * 1024 * 1024) fail('UI_BROWSER_REQUEST_BYTES');
      if (url.origin === origin.origin && !url.username && !url.password) { requests++; if (requests > 1800) fail('UI_BROWSER_REQUEST_CAP');if(request.method()==='POST'){if(!opGate)fail('UI_OPERATION_GATE_MISSING');opGate(request);}await request.continue(); return; }
      if (url.protocol === 'data:' || url.protocol === 'blob:') { await request.abort('blockedbyclient'); return; }
      if (url.protocol !== 'https:' || !['accounts.google.com', 'apis.google.com', 'docs.google.com'].includes(url.hostname) || url.username || url.password) { denied++; if (denied > 150) fail('UI_BROWSER_DENY_CAP'); await request.abort('blockedbyclient'); return; }
      const response = await respond(request);
      if (!response) { denied++; if (denied > 150) fail('UI_BROWSER_DENY_CAP'); ledger.note('network-denied'); await request.abort('blockedbyclient'); return; }
      fixtureRequests++; if (fixtureRequests > 80) fail('UI_BROWSER_FIXTURE_CAP');
      if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599) fail('UI_BROWSER_RESPONSE');
      await request.respond({ status: response.status, contentType: response.contentType, headers: response.headers ? { ...response.headers } : undefined, body: response.body });
    })();
    inflight.add(work);
    void work.catch(async () => {
      fatal ??= new Error('UI_BROWSER_NETWORK_FAILED');ledger.failed('UI_BROWSER_NETWORK_FAILED');
      if (!request.isInterceptResolutionHandled()) await request.abort('blockedbyclient').catch(() => {});
    }).finally(() => { inflight.delete(work); });
  });
  async function documentTicket(): Promise<DocumentTicket> {
    check();
    const handle = await page.evaluateHandle(() => (globalThis as typeof globalThis & { __hollow_ui_document__?: object }).__hollow_ui_document__ ?? null);
    let retained = false;
    try {
      if (await handle.jsonValue() === null) fail('UI_DOCUMENT_MISSING');
      const identity = await page.evaluate(value => value === (globalThis as typeof globalThis & { __hollow_ui_document__?: object }).__hollow_ui_document__, handle);
      if (!identity) fail('UI_DOCUMENT_CHANGED');
      const location = await page.evaluate(() => ({ origin: globalThis.location.origin, path: globalThis.location.pathname }));
      if (location.origin !== origin.origin && !(location.origin === 'https://accounts.google.com' && location.path === '/o/oauth2/v2/auth')) fail('UI_DOCUMENT_ORIGIN');
      if (currentDocument && currentDocument.ticket.origin === location.origin && currentDocument.ticket.path === location.path && await page.evaluate((previous, current) => previous === current, currentDocument.handle, handle).catch(() => false)) return currentDocument.ticket;
      documentCount++; if (documentCount > 64) fail('UI_DOCUMENT_CAP');
      const ticket = Object.freeze(location);
      if (currentDocument) await currentDocument.handle.dispose().catch(() => {});
      currentDocument = { handle, ticket }; retained = true;
      const information = await cdp.send('SystemInfo.getProcessInfo');
      ledger.chromeProcesses(information.processInfo.map((info: { id: number }) => info.id));
      return ticket;
    } finally { if (!retained) await handle.dispose(); }
  }
  const api: BrowserHarness = {
    page, profileRoot, chromeRoot, documentTicket,
    operationGate(gate){check();if(opGate)fail('UI_OPERATION_GATE_DUPLICATE');opGate=gate;},
    async clickOnce(name, scope) {
      check();
      if (!name || name.length > 256 || /[\[\]"\\\r\n]/.test(name)) fail('UI_ARIA_NAME');
      const before = await documentTicket();
      const handles = await (scope ?? page).$$(`aria/${name}`);
      try {
        if (handles.length !== 1) fail('UI_ARIA_COUNT');
        const handle = handles[0] ?? fail('UI_ARIA_MISSING');
        if (!await handle.isVisible() || !await handle.evaluate(element => element.isConnected && !element.matches(':disabled,[aria-disabled="true"]'))) fail('UI_ARIA_DISABLED');
        if (await documentTicket() !== before) fail('UI_CLICK_DOCUMENT_CHANGED');
        try { await handle.click(); } catch { mutationUnknown = true; fail('UI_CLICK_UNKNOWN'); }
        ledger.note('click-once');
        const after = await documentTicket().catch(() => null);
        ledger.note('click-document-stable', after === before);
      } finally { await Promise.all(handles.map(handle => handle.dispose())); }
    },
    dialogOnce(accept) {
      check();
      if (dialogPending) fail('UI_DIALOG_ALREADY_ARMED');
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { dialogPending = null; mutationUnknown = true; reject(new Error('UI_DIALOG_MISSING')); }, 8000);
        dialogPending = { accept, resolve, reject, timer };
      });
    },
    async navigateBack() {
      check();
      if (backUsed) fail('UI_BACK_ALREADY_USED');
      backUsed = true;
      try {
        const response = await page.goBack({ waitUntil: 'domcontentloaded', timeout: 8000 });
        const ticket = await documentTicket();
        const persisted = await page.evaluate(() => (globalThis as typeof globalThis & { __hollow_ui_persisted__?: boolean }).__hollow_ui_persisted__ === true);
        const kind = persisted ? 'persisted' : response ? 'reload' : 'missing';
        ledger.note('back-kind', kind);
        return Object.freeze({ kind, ticket });
      } catch { mutationUnknown = true; fail('UI_BACK_UNKNOWN'); }
    },
    async close() {
      if (closed) return;
      closed = true;
      if (dialogPending) { clearTimeout(dialogPending.timer); dialogPending.reject(new Error('UI_DIALOG_CLOSED')); dialogPending = null; }
      try {
        if (currentDocument) await currentDocument.handle.dispose();
        await network.detach();
        await page.close({ runBeforeUnload: false });
        await Promise.allSettled([...inflight]);
        await cdp.detach();
      } finally {try{await ownedBrowser.close();}finally{await closeProxy();}}
      ledger.note('browser-close-returned');
      const after = await lstat(executable);
      if (!after.isFile() || after.ino !== binary.ino || after.dev !== binary.dev || after.size !== binary.size || after.mode !== binary.mode || after.mtimeMs !== binary.mtimeMs) fail('UI_BROWSER_EXECUTABLE_CHANGED');
      if (fatal || mutationUnknown) fail('UI_BROWSER_CLOSE_UNPROVEN');
    },
  };
  await ledger.guard();
  return api;
  }catch(error){
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([(async()=>{try{await browser?.close();}finally{await closeProxy();}})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('UI_BROWSER_SETUP_CLOSE_TIMEOUT')),30000);})]);}
    catch{ledger.failed('UI_BROWSER_SETUP_CLOSE_UNPROVEN');}
    finally{clearTimeout(timer);if(childProcesses.spawn===observedSpawn){childProcesses.spawn=originalSpawn;syncBuiltinESMExports();}}
    ledger.failed('UI_BROWSER_SETUP_FAILED');throw error;
  }
}
