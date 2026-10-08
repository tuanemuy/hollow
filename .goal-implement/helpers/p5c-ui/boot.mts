import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, open, realpath, lstat } from "node:fs/promises";
import { createRequire, syncBuiltinESMExports } from "node:module";
import workerThreads, { Worker } from "node:worker_threads";
import childProcesses from "node:child_process";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { serve } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/apps/web/node_modules/@hono/node-server/dist/index.mjs";
import { createLibsqlClient, applyPragmas, getDatabase } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/libsql/client.ts";
import { BusinessRuleError } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/domain/error.ts";
import { driveFailureSchema } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/domain/integration/drive.ts";
import { driveBackupFailureSchema } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/domain/integration/driveBackup.ts";
import { NodeDriveExecution } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/execution.ts";
import { NodeDriveHttp } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/http.ts";
import { NodeDriveAuthorization } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/authorization.ts";
import { NodeDriveFolderProvider } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/provider.ts";
import { NodeDriveBackupProvider } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/backupProvider.ts";
import type { NodeDriveBackupSource } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/backupSource.ts";
import { acquireDriveRuntime } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/runtimeOwnership.ts";
import { createDriveSecretProtector } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/secretProtector.ts";
import type { createNodeDrive } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/factory.ts";
import type { DriveExecution, DriveServices, DriveSecretProtector } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/application/integration/drive/ports.ts";
import type { DriveBackupProvider } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/application/integration/drive/backup/ports.ts";
import { createProviderFixture, folderOne, folderTwo } from "./provider.mts";
import { createBrowserHarness, type BrowserHarness } from "./browser.mts";
import { createSupervisor, type AuditExpectations } from "./stop-audit.mts";

export const binding = Object.freeze({ candidate:"b6e567b24e24c78e26bb1bbb147bdf0fc6588bd3", build:"/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02", releaseSha:"fc2a38fab7b652a2a09102aade8fb981f058c1501612382d83075bab7aa71818", entrySha:"5e3a8085faf503b9e18e459ca28a8d4ff6e6751c2fadf1f5ebcf958295067b09", buildSha:"c68604ccfb684efacc33603287e2bfca2192e1ce0f308f30630db285cf384d54", businessSha:"bb2b1bf41a2bea332c16627bd8d77e9c1f89204966e5dff09adc6ddd0fd5656b" });
export const source = join(binding.build,"source");
export const workdir = join(source,"apps/web");
export const dist = join(workdir,"dist");
export function check(ok: unknown, code: string): asserts ok {if(!ok)throw Error(code);}
export const object = (v: unknown): v is Record<string,unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export type Business = Error & {code:string;retryable:boolean;toSerialized():unknown};
export type BusinessClass = new(code:string,message:string)=>Business;
export function createErrorBridge(built: BusinessClass, original: BusinessClass = BusinessRuleError<string>) {
  const mapped = new WeakMap<object, object>();
  const eligible = (v:unknown, ctor:BusinessClass, allow:(code:string)=>boolean): v is Business => {
    if(!(v instanceof ctor) || Object.getPrototypeOf(v)!==ctor.prototype || v.name!=="BusinessRuleError" || v.retryable!==false || v.toSerialized!==ctor.prototype.toSerialized)return false;
    const code=Object.getOwnPropertyDescriptor(v,"code"),message=Object.getOwnPropertyDescriptor(v,"message");
    if(!code || !message || typeof code.value!=="string" || typeof message.value!=="string" || !allow(code.value))return false;
    try {const s:unknown=v.toSerialized();return object(s)&&Object.keys(s).length===4&&s.kind==="business"&&s.code===code.value&&s.message===message.value&&s.retryable===false;}catch{return false;}
  };
  const project=(v:unknown,from:BusinessClass,to:BusinessClass,allow:(code:string)=>boolean):unknown=>{
    if(!eligible(v,from,allow))return v;
    const existing=mapped.get(v);if(existing)return existing;
    const result=new to(v.code,v.message);mapped.set(v,result);mapped.set(result,v);return result;
  };
  const backup=(code:string)=>driveBackupFailureSchema.safeParse(code).success;
  const drive=(code:string)=>driveFailureSchema.safeParse(code).success;
  return {
    toSource:(e:unknown)=>project(e,built,original,drive),
    toBuilt:(e:unknown)=>project(e,original,built,code=>code==="DRIVE_UNAVAILABLE"||backup(code)),
    work<T>(fn:(signal:AbortSignal)=>Promise<T>){return async(signal:AbortSignal):Promise<T>=>{try{return await fn(signal);}catch(e){throw project(e,built,original,drive);}};},
    async port<T>(fn:()=>Promise<T>):Promise<T>{try{return await fn();}catch(e){throw project(e,original,built,code=>code==="DRIVE_UNAVAILABLE"||backup(code));}},
    sync<T>(fn:()=>T):T {try{return fn();}catch(e){throw project(e,original,built,code=>code==="DRIVE_UNAVAILABLE");}},
  };
}
export function bridgeExecution(native: NodeDriveExecution, bridge: ReturnType<typeof createErrorBridge>): DriveExecution {
  return {
    changeRevision:native.changeRevision.bind(native),waitForChange:native.waitForChange.bind(native),accepting:native.accepting.bind(native),hasPendingCallers:native.hasPendingCallers.bind(native),caller:native.caller.bind(native),abort:native.abort.bind(native),unacknowledged:native.unacknowledged.bind(native),predecessors:native.predecessors.bind(native),
    coordinate:(phase,work)=>bridge.port(()=>native.coordinate(phase,work)),withCaller:(target,claim,settle)=>bridge.port(()=>native.withCaller(target,claim,settle)),
    run:(target,work)=>native.run(target,bridge.work(work)),closure:target=>bridge.sync(()=>native.closure(target)),acknowledge:proof=>bridge.port(()=>native.acknowledge(proof)),confirmSourceAcknowledged:proof=>bridge.port(()=>native.confirmSourceAcknowledged(proof)),acknowledgePredecessor:proof=>bridge.port(()=>native.acknowledgePredecessor(proof)),stop:()=>bridge.port(()=>native.stop()),
  };
}
export function bridgeProvider(native: DriveBackupProvider, bridge: ReturnType<typeof createErrorBridge>): DriveBackupProvider {
  return {allocateFileId:input=>bridge.port(()=>native.allocateFileId(input)),startResumable:input=>bridge.port(()=>native.startResumable(input)),queryReceived:input=>bridge.port(()=>native.queryReceived(input)),uploadChunk:input=>bridge.port(()=>native.uploadChunk(input)),inspectFile:input=>bridge.port(()=>native.inspectFile(input))};
}
export function bridgeProtector(native: DriveSecretProtector, bridge:ReturnType<typeof createErrorBridge>):DriveSecretProtector {return {available:native.available.bind(native),protect:(value,binding)=>bridge.sync(()=>native.protect(value,binding)),reveal:(value,binding)=>bridge.sync(()=>native.reveal(value,binding))};}

async function assertBinding() {
  const hashes = [[join(binding.build,"material/release-manifest.json"),binding.releaseSha],[join(binding.build,"material/build-manifest.json"),binding.buildSha],[join(dist,"server/server.node.js"),binding.entrySha],[join(dist,"server/assets/query-G26IDSH8.js"),binding.businessSha]];
  for(const [file,expected] of hashes) {check(file&&expected,"BINDING_PATH");check(createHash("sha256").update(await readFile(file)).digest("hex")===expected,"BINDING_HASH");}
}
type BuiltModule = {boot(dependencies:{driveFactory:typeof createNodeDrive;mailer:ReturnType<typeof createProviderFixture>["mailer"]}):Promise<{fetch(request:Request):Promise<Response>;hostname:string;port:number;quiesce():Promise<void>;shutdown():Promise<void>}>;NodeDriveBackupSource:typeof NodeDriveBackupSource};
function builtModule(v:unknown):v is BuiltModule {return object(v)&&typeof v.boot==="function"&&typeof v.NodeDriveBackupSource==="function";}
function businessModule(v:unknown):v is {a:BusinessClass} {return object(v)&&typeof v.a==="function"&&object(v.a.prototype)&&typeof v.a.prototype.toSerialized==="function";}
export type RpcBinding = {module:string;alias:string;id:string;method:"GET"|"POST"} | {kind:"fixed-drive-backup-history";module:"/assets/errorResponseMiddleware-CyKFLMJi.js";id:"a55e345a85bd9b6dc3caec547c27379c8cdbb9809e5119cd93d8baaf4b355f75";method:"GET"};
export async function clientBindings():Promise<Record<string,RpcBinding>> {
  const ts:typeof import("typescript")=createRequire(join(source,"package.json"))("typescript");
  const manifest=await readFile(join(binding.build,"material/build-manifest.json"),"utf8");check(createHash("sha256").update(manifest).digest("hex")===binding.buildSha,"OUTPUT_MANIFEST");const build:unknown=JSON.parse(manifest);check(object(build)&&object(build.outputs),"OUTPUT_MANIFEST");
  const names=new Map<string,string>();const result:Record<string,RpcBinding>={};
  const historyId="a55e345a85bd9b6dc3caec547c27379c8cdbb9809e5119cd93d8baaf4b355f75";let historyNames=0;
  for(const file of Object.keys(build.outputs).filter(x=>x.startsWith("server/rsc/")&&x.endsWith(".js"))) {
    const text=await readFile(join(dist,file),"utf8");for(const m of text.matchAll(/id: "([0-9a-f]{64})",\s*name: "([A-Za-z]+Fn)"/g))if(m[1]&&m[2]){names.set(m[1],m[2]);if(m[2]==="driveBackupHistoryFn"){historyNames++;check(file==="server/rsc/assets/driveBackupServerFn-u4VmcJxQ.js"&&m[1]===historyId,"RPC_REQUIRED_BINDING");}}
  }
  for(const file of Object.keys(build.outputs).filter(x=>x.startsWith("client/assets/")&&x.endsWith(".js"))) {
    const text=await readFile(join(dist,file),"utf8"),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const definitions=new Map<string,{id:string;method:"GET"|"POST"}>();
    const visit=(n:import("typescript").Node)=>{if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer){let id:string|undefined;let method:"GET"|"POST"|undefined;const scan=(x:import("typescript").Node)=>{if(ts.isCallExpression(x)&&x.arguments.length===1&&ts.isStringLiteralLike(x.arguments[0])&&names.has(x.arguments[0].text))id=x.arguments[0].text;if(ts.isPropertyAssignment(x)&&x.name.getText(ast)==="method"&&ts.isStringLiteralLike(x.initializer)&&["GET","POST"].includes(x.initializer.text))method=x.initializer.text==="GET"?"GET":"POST";ts.forEachChild(x,scan);};scan(n.initializer);if(id&&method)definitions.set(n.name.text,{id,method});}ts.forEachChild(n,visit);};visit(ast);
    for(const n of ast.statements)if(ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const x of n.exportClause.elements){const def=definitions.get(x.propertyName?.text??x.name.text);if(def){const name=names.get(def.id);check(name,"RPC_NAME");result[name]={module:"/assets/"+file.split("/").at(-1),alias:x.name.text,...def};}}
  }
  const outputs=build.outputs;
  const fixedAsset=async(file:string,bytes:number,sha:string)=>{const entry=outputs[file];check(object(entry)&&entry.bytes===bytes&&entry.sha256===sha,"RPC_REQUIRED_BINDING");const filename=join(dist,file),stat=await lstat(filename);check(stat.isFile()&&stat.nlink===1&&(stat.mode&0o7777)===0o600&&stat.size===bytes&&await realpath(filename)===filename,"RPC_REQUIRED_BINDING");const text=await readFile(filename,"utf8");check(Buffer.byteLength(text)===bytes&&createHash("sha256").update(text).digest("hex")===sha,"RPC_REQUIRED_BINDING");return ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);};
  await fixedAsset("server/rsc/assets/driveBackupServerFn-u4VmcJxQ.js",12534,"260f29d21a280bcb1b611c990e21350a40e4b0e216bbb0bf48d45caa6ef434ec");
  const historyAst=await fixedAsset("client/assets/ImportJobs-D10_FM5n.js",62362,"d7107ef2cb610ee185c47cdd1466886dec5240c1a933d7c7b8f0a1c60172d338");
  const factoryAst=await fixedAsset("client/assets/errorResponseMiddleware-CyKFLMJi.js",23714,"ebc9b7279f744dc9e64ea82aae999402a01119e87ce687152cb3339b3288e774");
  const imports=historyAst.statements.filter(ts.isImportDeclaration).filter(n=>ts.isStringLiteralLike(n.moduleSpecifier)&&n.moduleSpecifier.text==="./errorResponseMiddleware-CyKFLMJi.js");
  check(imports.length===1,"RPC_REQUIRED_BINDING");const imported=imports[0]?.importClause?.namedBindings;
  check(imported&&ts.isNamedImports(imported)&&imported.elements.length===3,"RPC_REQUIRED_BINDING");
  for(const [local,exported] of [["i","r"],["r","i"],["a","t"]])check(imported.elements.filter(n=>n.name.text===local&&n.propertyName?.text===exported).length===1,"RPC_REQUIRED_BINDING");
  for(const [alias,local] of [["r","Z"],["i","ke"],["t","Re"]])check(factoryAst.statements.filter(ts.isExportDeclaration).flatMap(n=>n.moduleSpecifier===undefined&&n.exportClause&&ts.isNamedExports(n.exportClause)?[...n.exportClause.elements]:[]).filter(n=>n.name.text===alias&&n.propertyName?.text===local).length===1,"RPC_REQUIRED_BINDING");
  const exactHistory=(node:import("typescript").Expression)=>{
    if(!ts.isCallExpression(node)||node.arguments.length!==1||!ts.isPropertyAccessExpression(node.expression)||node.expression.name.text!=="handler")return false;
    const rpc=node.arguments[0];if(!rpc||!ts.isCallExpression(rpc)||!ts.isIdentifier(rpc.expression)||rpc.expression.text!=="r"||rpc.arguments.length!==1||!ts.isStringLiteralLike(rpc.arguments[0]!)||rpc.arguments[0]!.text!==historyId)return false;
    const middleware=node.expression.expression;if(!ts.isCallExpression(middleware)||middleware.arguments.length!==1||!ts.isPropertyAccessExpression(middleware.expression)||middleware.expression.name.text!=="middleware")return false;
    const list=middleware.arguments[0];if(!list||!ts.isArrayLiteralExpression(list)||list.elements.length!==1||!ts.isIdentifier(list.elements[0]!)||list.elements[0]!.text!=="a")return false;
    const create=middleware.expression.expression;if(!ts.isCallExpression(create)||!ts.isIdentifier(create.expression)||create.expression.text!=="i"||create.arguments.length!==1)return false;
    const options=create.arguments[0];if(!options||!ts.isObjectLiteralExpression(options)||options.properties.length!==1)return false;
    const method=options.properties[0];return Boolean(method&&ts.isPropertyAssignment(method)&&ts.isIdentifier(method.name)&&method.name.text==="method"&&ts.isStringLiteralLike(method.initializer)&&method.initializer.text==="GET");
  };
  let historyIds=0;const countHistory=(n:import("typescript").Node)=>{if(ts.isStringLiteralLike(n)&&n.text===historyId)historyIds++;ts.forEachChild(n,countHistory);};countHistory(historyAst);
  check(historyNames===1&&names.get(historyId)==="driveBackupHistoryFn"&&!result.driveBackupHistoryFn&&historyIds===1&&historyAst.statements.filter(n=>ts.isExpressionStatement(n)&&exactHistory(n.expression)).length===1,"RPC_REQUIRED_BINDING");
  result.driveBackupHistoryFn={kind:"fixed-drive-backup-history",module:"/assets/errorResponseMiddleware-CyKFLMJi.js",id:historyId,method:"GET"};
  for(const name of ["bootstrapAuthenticationFn","signUpFn","verifyEmailFn","signInFn","signOutFn","currentUserFn","beginUploadFn","sealUploadFn","driveSettingsFn","driveReceiptFn","driveBackupFn","getNoteFn","driveHistoryFn","driveBackupHistoryFn"])check(result[name],"RPC_REQUIRED_BINDING");
  return result;
}
export async function callRpc(browser:BrowserHarness,map:Record<string,RpcBinding>,name:string,data?:unknown):Promise<unknown> {
  const spec=map[name];check(spec,"RPC_NOT_BOUND");
  if("kind"in spec){check(name==="driveBackupHistoryFn"&&data===undefined,"RPC_REQUIRED_BINDING");return browser.page.evaluate(async({module,id})=>{const imported:unknown=await import(module);if(typeof imported!=="object"||imported===null)throw Error("RPC_EXPORT");const create:unknown=Reflect.get(imported,"r"),rpc:unknown=Reflect.get(imported,"i"),middleware:unknown=Reflect.get(imported,"t");if(typeof create!=="function"||typeof rpc!=="function"||typeof middleware!=="object"||middleware===null)throw Error("RPC_FUNCTION");const builder:unknown=create({method:"GET"});if(typeof builder!=="function")throw Error("RPC_FUNCTION");const withMiddleware:unknown=Reflect.get(builder,"middleware");if(typeof withMiddleware!=="function")throw Error("RPC_FUNCTION");const configured:unknown=Reflect.apply(withMiddleware,builder,[[middleware]]);if(typeof configured!=="function")throw Error("RPC_FUNCTION");const handler:unknown=Reflect.get(configured,"handler");if(typeof handler!=="function")throw Error("RPC_FUNCTION");const fn:unknown=Reflect.apply(handler,configured,[rpc(id)]);if(typeof fn!=="function")throw Error("RPC_FUNCTION");return fn();},{module:spec.module,id:spec.id});}
  return browser.page.evaluate(async({module,alias,data})=>{const imported:unknown=await import(module);if(typeof imported!=="object"||imported===null||!(alias in imported))throw Error("RPC_EXPORT");const fn:unknown=Reflect.get(imported,alias);if(typeof fn!=="function")throw Error("RPC_FUNCTION");return fn(data===undefined?undefined:{data});},{module:spec.module,alias:spec.alias,data});
}
let contractsPrepared=false;
export async function prepareContracts() {
  check(!contractsPrepared,"PURE_ONCE");await assertBinding();
  const module:unknown=await import(pathToFileURL(join(dist,"server/assets/query-G26IDSH8.js")).href);check(businessModule(module),"PURE_BUILT_CLASS");
  const {runPureContract}=await import("./contract-pure.mts");const result=await runPureContract(module.a);contractsPrepared=true;return result;
}
export async function prepareUiRoot(reservedAbsoluteRoot:string):Promise<string> {
  check(contractsPrepared,"PURE_BEFORE_UI_ROOT");process.umask(0o077);
  const base="/Users/hikaru/.local/share/hollow-validation";
  check(reservedAbsoluteRoot===join(base,"ui-e63071b4")&&resolve(reservedAbsoluteRoot)===reservedAbsoluteRoot,"UI_ROOT_BINDING");
  check(await realpath(base)===base,"UI_ROOT_PARENT");
  let absent=false;try{await lstat(reservedAbsoluteRoot);}catch(error){check(error instanceof Error&&"code" in error&&error.code==="ENOENT","UI_ROOT_STAT");absent=true;}check(absent,"UI_ROOT_EXISTS");
  await mkdir(reservedAbsoluteRoot,{mode:0o700});check(await realpath(reservedAbsoluteRoot)===reservedAbsoluteRoot,"UI_ROOT_REALPATH");
  for(const d of ["objects","material","logs","node-tmp","c"])await mkdir(join(reservedAbsoluteRoot,d),{mode:0o700});return reservedAbsoluteRoot;
}
export async function runUi(root:string,origin:string) {
  check(contractsPrepared,"PURE_BEFORE_BOOT");await assertBinding();for(const key of ["DATABASE_AUTH_TOKEN","DATABASE_ENCRYPTION_KEY","HOLLOW_GOOGLE_CONFIG","HOLLOW_OPENROUTER_CONFIG","HOLLOW_DRIVE_CONFIG_FILE","HOLLOW_PDF_CONFIG","HOLLOW_ZIP_CONFIG","HOLLOW_SHARE_KEY_DIR","HOLLOW_SHARE_ACTIVE_KEY_ID","HOLLOW_SHARE_KEY_IDS","HOLLOW_PDF_TICKET_KEYRING","HOLLOW_INVITATION_KEY_FILE"])check(process.env[key]===undefined,"AMBIENT_CONFIGURATION");process.umask(0o077);check((await realpath(root))===root,"UI_ROOT_REALPATH");
  const supervisor=await createSupervisor({root,chromeRoot:join(root,"c")});
  const restoreObservation=installNativeObservation(supervisor);
  let app:Awaited<ReturnType<BuiltModule["boot"]>>|null=null;let server:ReturnType<typeof serve>|null=null;let browser:BrowserHarness|null=null;let bootEntered=false;let closing:Promise<void>|null=null;
  const close=()=>closing??=(async()=>{let failure:unknown=null;const closeOne=async(fn:()=>Promise<void>)=>{try{await fn();}catch(error){failure??=error;}};await closeOne(async()=>{await browser?.close();});await closeOne(async()=>{await app?.quiesce();});await closeOne(async()=>{if(server)await new Promise<void>((resolve,reject)=>server!.close(e=>e?reject(e):resolve()));});await closeOne(async()=>{await app?.shutdown();});await closeOne(()=>provider.close());if(bootEntered&&!app)failure??=Error("BOOT_CLOSE_UNPROVEN");if(failure)throw failure;})();
  const provider=createProviderFixture({origin,onServer:server=>supervisor.knownServer(server,"provider"),note:(code,value)=>supervisor.note(code,value),onFailure:code=>supervisor.failed(code)});
  supervisor.start(close);try {
  const url=`file:${join(root,"active.db")}`;const client=createLibsqlClient({url});
  try {await applyPragmas(client);const migrate:typeof import("/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/node_modules/drizzle-orm/libsql/migrator.js")=createRequire(join(source,"packages/core/package.json"))("drizzle-orm/libsql/migrator");await migrate.migrate(getDatabase(client),{migrationsFolder:join(source,"packages/core/src/adapters/libsql/migrations")});const fk=await client.execute("PRAGMA foreign_key_check");check(fk.rows.length===0,"MIGRATION_FK");}finally{client.close();}
  await provider.start();process.chdir(workdir);Object.assign(process.env,{DATABASE_URL:url,APP_URL:origin,HOLLOW_STORAGE_DIR:join(root,"objects"),TMPDIR:join(root,"node-tmp"),HOSTNAME:"127.0.0.1",PORT:new URL(origin).port});
  const imported:unknown=await import(pathToFileURL(join(dist,"server/server.node.js")).href);check(builtModule(imported),"BUILT_BOOT_API");const business:unknown=await import(pathToFileURL(join(dist,"server/assets/query-G26IDSH8.js")).href);check(businessModule(business),"BUILT_BUSINESS_API");const bridge=createErrorBridge(business.a);
  const factory:typeof createNodeDrive=async(base,options)=>{
    check(options.canonicalDatabasePath&&options.runtimeDirectory&&options.storage,"DRIVE_OPTIONS");const ownership=await acquireDriveRuntime(options.runtimeDirectory,options.canonicalDatabasePath);const native=new NodeDriveExecution(ownership.runtimeGeneration,ownership);const http=new NodeDriveHttp(native,provider.factory);
    const config={clientId:"ui-client",clientSecret:"ui-secret",callbackUrl:new URL("/auth/drive/callback",origin).href,picker:provider.picker,activeKid:"ui",keys:new Map([["ui",provider.aes]])};const services:DriveServices={runtimeGeneration:ownership.runtimeGeneration,picker:provider.picker,authorization:new NodeDriveAuthorization(config,base,http),folders:new NodeDriveFolderProvider(http),protector:bridgeProtector(createDriveSecretProtector(config),bridge),backup:{provider:bridgeProvider(new NodeDriveBackupProvider(http),bridge),source:new imported.NodeDriveBackupSource(options.storage,signal=>native.register(signal))},execution:bridgeExecution(native,bridge),wake:options.wake};provider.aes.fill(0);return {services,callbackUrl:config.callbackUrl};
  };
  bootEntered=true;app=await imported.boot({driveFactory:factory,mailer:provider.mailer});server=serve({fetch:app.fetch,hostname:app.hostname,port:app.port});supervisor.knownServer(server,"app");
  browser=await createBrowserHarness({root,origin,ledger:supervisor,respond:request=>provider.browserRespond(request.url(),request.method())});
  const map=await clientBindings();
  return {origin,app,server,browser,provider,supervisor,map,close,restoreObservation};
  }catch(error){const stop=await supervisor.stop(close);if(stop.actualClosed)restoreObservation();throw error;}
}

function installNativeObservation(supervisor:Awaited<ReturnType<typeof createSupervisor>>) {
  const OriginalWorker=Worker;const originalFork=childProcesses.fork;
  const uploadPaths=new Set([join(source,"packages/core/src/adapters/node/import/parserWorker.mjs"),join(dist,"server/browse/noteProjection.mjs")]);
  workerThreads.Worker=class extends OriginalWorker {
    constructor(file:string|URL,options?:import('node:worker_threads').WorkerOptions){const path=file instanceof URL?file.pathname:resolve(file);check(uploadPaths.has(path),'WORKER_PATH');const kind=path.endsWith('/parserWorker.mjs')?'parser':'projection';const data:unknown=options?.workerData;let operation:'detect'|'extract'|undefined;if(kind==='parser'){check(object(data)&&(data.operation==='detect'||data.operation==='extract'),'PARSER_INPUT');operation=data.operation;}const reserved=supervisor.reserveWorker(kind,operation);try{super(file,options);}catch(error){reserved.cancel();throw error;}reserved.commit(this);}
    override terminate():Promise<number>{supervisor.parserTerminate(this);return super.terminate();}
  };
  childProcesses.fork=((modulePath:string|URL,args?:ReadonlyArray<string>|import('node:child_process').ForkOptions,opts?:import('node:child_process').ForkOptions)=>{const path=modulePath instanceof URL?modulePath.pathname:resolve(modulePath);check(path===join(dist,'server/browse/searchSupervisor.mjs'),'FORK_PATH');const reserved=supervisor.reserveChild('search');let child:ReturnType<typeof originalFork>;try{child=Array.isArray(args)?originalFork(modulePath,args,opts):originalFork(modulePath,args as import('node:child_process').ForkOptions|undefined);}catch(error){reserved.cancel();throw error;}reserved.commit(child);return child;}) as typeof childProcesses.fork;
  syncBuiltinESMExports();return ()=>{workerThreads.Worker=OriginalWorker;childProcesses.fork=originalFork;syncBuiltinESMExports();};
}
const row=(value:unknown):Record<string,unknown>=>{check(object(value),"DTO_SHAPE");return value;};
const text=(value:unknown):string=>{check(typeof value==="string","DTO_TEXT");return value;};
const list=(value:unknown):unknown[]=>{check(Array.isArray(value),"DTO_LIST");return value;};
type UiOperationStage='ui-ready'|'signup-start'|'signup-done'|'signin-start'|'signin-done'|'upload1-start'|'upload1-done'|'upload2-start'|'upload2-done';
export async function executeUi(runtime:Awaited<ReturnType<typeof runUi>>,notify:(stage:UiOperationStage)=>void) {
  const {browser,provider,map,supervisor}=runtime;const {page}=browser;const origin=runtime.origin;
  const attemptIds:string[]=[];const counts=new Map<string,number>();let controlId:string|null=null;
  const uploadIds=new Set<string>();let responseFault:Error|null=null;const limits:Record<string,number>={beginDriveFn:3,createDriveFolderFn:1,cancelDriveFn:1,requestDriveBackupFn:3,retargetDriveBackupFn:1,bootstrapAuthenticationFn:13,signUpFn:1,verifyEmailFn:1,signOutFn:1,signInFn:1,beginUploadFn:2,sealUploadFn:2};
  let selectionPosts=0,pickerPosts=0,confirmations=0,resends=0,total=0;
  browser.operationGate(request=>{const u=new URL(request.url());if(u.origin!==origin)return;check(++total<=1800,"HOLLOW_REQUEST_COUNT");if(request.method()!=="POST")return;
    if(u.pathname.startsWith("/api/hollow/uploads/")){check(uploadIds.delete(u.pathname.slice("/api/hollow/uploads/".length)),"UPLOAD_ONCE");}else if(u.pathname==="/api/integrations/drive/picker")check(++pickerPosts<=4,"PICKER_MUTATIONS");else if(u.pathname==="/api/integrations/drive/selection")check(++selectionPosts<=2,"SELECTION_MUTATIONS");else {const found=Object.entries(map).find(([,spec])=>u.pathname.includes(spec.id));check(found,"UNBOUND_MUTATION");const [name]=found;const n=(counts.get(name)??0)+1;counts.set(name,n);if(name==="continueDriveFolderFn"){const data=request.postData()??"";if(data.includes('confirm'))check(++confirmations<=3,"CONFIRM_COUNT");else if(data.includes('resend'))check(++resends<=1,"RESEND_COUNT");else check(data.includes('inspect'),"CONTINUE_ACTION");}else check(n<=(limits[name]??0),"MUTATION_CAP");}});
  page.on("response",response=>{const u=new URL(response.url());if(u.origin!==origin||!['/api/integrations/drive/picker','/api/integrations/drive/selection'].includes(u.pathname))return;void response.json().then((raw:unknown)=>{const v=row(row(raw).value);const receipt=object(v.receipt)?v.receipt:object(v.row)?v.row:null;if(receipt)controlId=text(receipt.id);}).catch(()=>{responseFault=Error("PICKER_RESPONSE_GATE");});});
  const rpc=(name:string,data?:unknown)=>callRpc(browser,map,name,data);
  let accountId:string|null=null;
  const settings=async()=>{const v=row(await rpc("driveSettingsFn"));const actor=row(v.actor);check(accountId===null||actor.accountId===accountId,"CURRENT_ACCOUNT");check(Number.isSafeInteger(actor.authVersion)&&Number.isSafeInteger(actor.browserEpoch),"CURRENT_AUTH_BROWSER");return v;};
  const backup=async(id:string)=>{const v=row(await rpc("driveBackupFn",{noteId:id}));check(v.noteId===id&&v.hasOriginal===true&&row(v.actor).accountId===accountId,"CURRENT_NOTE_ORIGINAL");return v;};
  const wait=async<T,>(read:()=>Promise<T>,predicate:(v:T)=>boolean,ms=8000):Promise<T>=>{const until=performance.now()+ms;let polls=0;for(;;){if(responseFault)throw responseFault;await supervisor.guard();const value=await read();if(predicate(value))return value;check(++polls<=80&&performance.now()<until,"CURRENT_WAIT_DEADLINE");await new Promise(r=>setTimeout(r,100));}};
  const visible=async(value:string)=>page.evaluate(x=>document.body.innerText.includes(x),value);
  const scoped=async()=>{const scope=await page.$('[aria-label="Drive処理結果"]');check(scope,"RECEIPT_SCOPE");return scope;};
  const confirm=async(accept:boolean,name:string)=>{const before=selectionPosts+confirmations+resends;const dialog=browser.dialogOnce(accept);await browser.clickOnce(name,await scoped());await dialog;if(!accept){await new Promise(r=>setTimeout(r,150));check(before===selectionPosts+confirmations+resends,"CANCEL_CONFIRM_POST_ZERO");}};
  const authorize=async(relink:boolean)=>{await page.goto(new URL('/settings/drive',origin).href,{waitUntil:"domcontentloaded"});await wait(settings,v=>v.configured===true);const dialog=relink?browser.dialogOnce(true):null;await browser.clickOnce(relink?"Google Driveに再連携":"Google Driveと連携");if(dialog)await dialog;await wait(async()=>new URL(page.url()),u=>u.origin==="https://accounts.google.com"&&u.pathname==="/o/oauth2/v2/auth");await browser.clickOnce("Fixture Google同意");const result=await wait(async()=>new URL(page.url()),u=>u.origin===origin&&u.pathname==="/auth/drive-result");const id=result.searchParams.get("id");check(id,"AUTH_RECEIPT_ID");attemptIds.push(id);check(attemptIds.length<=3,"AUTH_RECEIPT_COUNT");};
  const select=async()=>{await page.goto(new URL('/integrations/drive/picker',origin).href,{waitUntil:"domcontentloaded"});await wait(settings,v=>v.state==="linked");await browser.clickOnce("説明を確認してGoogle Pickerを開く");await wait(async()=>page.frames().find(f=>new URL(f.url()).origin==="https://docs.google.com"),v=>v!==undefined);const frame=page.frames().find(f=>f.url().startsWith('https://docs.google.com/picker'));check(frame,"SDK_FRAME");const handles=await frame.$$('::-p-aria(F1を選択)');check(handles.length===1,"SDK_SELECTOR");const handle=handles[0];check(handle,"SDK_HANDLE");check(await handle.isVisible()&&await handle.evaluate(element=>element instanceof HTMLButtonElement&&!element.disabled),"SDK_ENABLED");await handle.click();await handle.dispose();await wait(async()=>controlId,v=>v!==null);await wait(async()=>visible('保存先を確認してください。'),Boolean);};
  const receipt=async()=>{check(controlId,"CONTROL_ID");return row(await rpc("driveReceiptFn",{by:"id",kind:"control",id:controlId}));};
  const stage=async(name:string,ms:number,work:()=>Promise<void>)=>{const start=performance.now();supervisor.note(name,true);await work();check(performance.now()-start<=ms,"STAGE_DEADLINE");if(responseFault)throw responseFault;supervisor.note(name+"-done",true);};
  const noteIds:string[]=[];
  await stage("u0-u2",180_000,async()=>{
    await page.goto(new URL('/signup',origin).href,{waitUntil:"domcontentloaded"});await rpc('bootstrapAuthenticationFn');const email=`ui-${randomUUID()}@example.invalid`,password=randomUUID();notify('signup-start');await rpc('signUpFn',{email,password,termsAccepted:true});notify('signup-done');const token=provider.verificationUrl().searchParams.get('token');check(token,"VERIFY_TOKEN");await rpc('verifyEmailFn',{token});await rpc('signOutFn');notify('signin-start');await rpc('signInFn',{email,password});notify('signin-done');const user=row(await rpc('currentUserFn'));accountId=text(user.id);
    for(let i=0;i<2;i++){notify(i===0?'upload1-start':'upload2-start');const accepted=row(await rpc('beginUploadFn',{files:[{name:`UI${i+1}.txt`,bytes:1024}],useAi:false,importReferences:false}));const upload=row(list(accepted.files)[0]);const id=text(upload.id);uploadIds.add(id);const body='UI_ORIGINAL_'+String(i+1)+' '.repeat(1024-13);const uploaded:unknown=await page.evaluate(async({id,body})=>{const res=await fetch('/api/hollow/uploads/'+id,{method:'POST',credentials:'same-origin',body:new TextEncoder().encode(body)});if(!res.ok)throw Error('UPLOAD_TRANSPORT');return res.json();},{id,body});noteIds.push(text(row(uploaded).noteId));await rpc('sealUploadFn',{id:text(accepted.batchId)});notify(i===0?'upload1-done':'upload2-done');}
    for(const id of noteIds)await wait(async()=>row(await rpc('getNoteFn',{id})),v=>typeof v.html==='string'&&v.html.includes('UI_ORIGINAL'),30_000);
    await authorize(false);await wait(settings,v=>v.state==='linked');controlId=null;await select();await confirm(true,'この保存先を利用する');await wait(settings,v=>object(v.folder)&&v.folder.id===folderOne);
    const n1=noteIds[0];check(n1,"NOTE_ONE");await page.goto(new URL('/notes/'+n1,origin).href,{waitUntil:'domcontentloaded'});await wait(async()=>visible('原本をDriveにバックアップ'),Boolean);check(!await visible('新しい保存先にバックアップ')&&!await visible('受付結果を確認できません'),'INITIAL_PANEL');
    provider.setStage('trashed');await backup(n1);await browser.clickOnce('原本をDriveにバックアップ');await wait(async()=>visible('ゴミ箱'),Boolean);check(await visible('復元')&&provider.state().generateFile===0,'TRASH_GUIDANCE');
    provider.setStage('restored');controlId=null;await select();await confirm(false,'この保存先を利用する');await confirm(true,'この保存先を利用する');await wait(settings,v=>object(v.folder)&&v.folder.id===folderOne);
    provider.setStage('missing');await page.goto(new URL('/notes/'+n1,origin).href,{waitUntil:'domcontentloaded'});await wait(async()=>visible('同じファイルで再試行'),Boolean);await backup(n1);const dialog=browser.dialogOnce(true);await browser.clickOnce('同じファイルで再試行');await dialog;await wait(async()=>row(await rpc('driveBackupHistoryFn')),v=>list(v.rows).some(value=>{const job=row(value);return job.noteId===n1&&job.state==='failed'&&job.failure==='DRIVE_BACKUP_FOLDER_UNAVAILABLE';}));await wait(async()=>visible('削除とは断定できないため'),Boolean);check(provider.state().generateFile===0,'RETRY_ALLOCATION_ZERO');
  });
  await stage('u3',120_000,async()=>{
    const n2=noteIds[1];check(n2,'NOTE_TWO');provider.setStage('held');await page.goto(new URL('/notes/'+n2,origin).href,{waitUntil:'domcontentloaded'});await wait(async()=>visible('原本をDriveにバックアップ'),Boolean);await backup(n2);await browser.clickOnce('原本をDriveにバックアップ');await wait(async()=>provider.state(),v=>v.heldSeen);const before=await settings();const heldAt=performance.now();
    provider.setStage('failed-relink');await authorize(true);await wait(async()=>visible('認可・応答を確認できません'),Boolean);const failed=await settings();check(failed.epoch===before.epoch&&failed.settingsVersion===before.settingsVersion&&JSON.stringify(failed.folder)===JSON.stringify(before.folder)&&!provider.state().heldClosed,'FAILED_RELINK_RETAINED');
    provider.setStage('successful-relink');await authorize(true);const after=await wait(settings,v=>v.state==='linked'&&v.epoch!==before.epoch);check(after.folder===null&&after.autoBackup===false&&performance.now()-heldAt<20_000,'SUCCESS_RELINK_SETTINGS');await wait(async()=>provider.state(),v=>v.heldClosed);await wait(()=>backup(n2),v=>list(v.processing).length===0);
  });
  await stage('u4',120_000,async()=>{
    provider.setStage('create');await page.goto(new URL('/settings/drive',origin).href,{waitUntil:'domcontentloaded'});await wait(settings,v=>v.folder===null);const dialog=browser.dialogOnce(true);await browser.clickOnce('新しい保存先を作成');await dialog;await wait(async()=>visible('Google上の作成結果を照会する'),Boolean);const before=provider.state().createPosts;await settings();await settings();check(provider.state().createPosts===before,'UNKNOWN_GET_NO_CREATE');await browser.clickOnce('Google上の作成結果を照会する',await scoped());await wait(async()=>visible('同じ保存先IDで作成をもう一度試す'),Boolean);await confirm(false,'同じ保存先IDで作成をもう一度試す');await confirm(true,'同じ保存先IDで作成をもう一度試す');await wait(async()=>visible('保存先を確認してください。'),Boolean);await confirm(true,'この保存先を利用する');await wait(settings,v=>object(v.folder)&&v.folder.id===folderTwo);check(provider.state().generateFolder===1&&provider.state().createPosts===2,'SAME_FOLDER_ID');
  });
  await stage('u5',120_000,async()=>{
    const n1=noteIds[0];check(n1,'NOTE_ONE');provider.setStage('retarget');await page.goto(new URL('/notes/'+n1,origin).href,{waitUntil:'domcontentloaded'});await backup(n1);await wait(async()=>visible('新しい保存先にバックアップ'),Boolean);let dialog=browser.dialogOnce(false);await browser.clickOnce('新しい保存先にバックアップ');await dialog;check((counts.get('retargetDriveBackupFn')??0)===0,'RETARGET_CANCEL_ZERO');dialog=browser.dialogOnce(true);await browser.clickOnce('新しい保存先にバックアップ');await dialog;await wait(()=>backup(n1),v=>list(v.records).length===1,20_000);await page.reload({waitUntil:'domcontentloaded'});await wait(async()=>visible('Driveの原本を開く'),Boolean);const result=await backup(n1);check(list(result.records).length===1&&provider.state().chunks===1,'SUCCESS_RECORD_ONE');
  });
  await stage('u6',60_000,async()=>{
    provider.setStage('lifecycle');controlId=null;await page.goto(new URL('/integrations/drive/picker',origin).href,{waitUntil:'domcontentloaded'});await wait(settings,v=>v.state==='linked');await browser.clickOnce('説明を確認してGoogle Pickerを開く');await wait(async()=>controlId,v=>v!==null);await wait(()=>page.evaluate(()=>typeof Reflect.get(window,'__uiLatePicker')==='function'),Boolean);const sdkDocument=await page.evaluateHandle(()=>document),sdkCallback=await page.evaluateHandle(()=>Reflect.get(window,'__uiLatePicker'));const before=pickerPosts,posts=selectionPosts;await page.goto(new URL('/settings/drive',origin).href,{waitUntil:'domcontentloaded'});const back=await browser.navigateBack();check(pickerPosts===before&&selectionPosts===posts,'BACK_AUTO_ZERO');const sameSdk=back.kind==='persisted'&&await page.evaluate((doc,callback)=>doc===document&&typeof callback==='function'&&Reflect.get(window,'__uiLatePicker')===callback,sdkDocument,sdkCallback).catch(()=>false);if(sameSdk){const invoked=await page.evaluate(callback=>{if(typeof callback!=='function')return false;callback({action:'picked',docs:[{id:'UI_F1'}]});return true;},sdkCallback);check(invoked,'LATE_CALLBACK_INVOKED');supervisor.note('bfcache-old-callback-once');await new Promise(r=>setTimeout(r,150));check(selectionPosts===posts,'LATE_CALLBACK_POST_ZERO');}else supervisor.note('bfcache-same-document-missing',true);await Promise.allSettled([sdkDocument.dispose(),sdkCallback.dispose()]);
    check(controlId,'LIFECYCLE_RECEIPT');await page.goto(new URL('/settings/drive?controlId='+controlId,origin).href,{waitUntil:'domcontentloaded'});const saved=await receipt();check(saved.current===true,'EXIT_RECEIPT_CURRENT');await browser.clickOnce('このDrive処理を取り消す',await scoped());await wait(receipt,v=>v.phase==='failed'||v.phase==='completed');await page.goto(new URL('/integrations/drive/picker',origin).href,{waitUntil:'domcontentloaded'});await wait(settings,v=>v.state==='linked');await browser.clickOnce('説明を確認してGoogle Pickerを開く');await wait(async()=>pickerPosts,v=>v===4);
  });
  supervisor.note('u0-u6-done',true);check(accountId&&noteIds.length===2&&attemptIds.length===3,'AUDIT_PUBLIC_IDENTITIES');
  const history=list(row(await rpc('driveBackupHistoryFn')).rows);check(history.length===4,'AUDIT_PUBLIC_JOBS');
  const jobs=history.map((v):AuditExpectations["jobs"][number]=>{const job=row(v);check(job.state==='failed'||job.state==='cancelled'||job.state==='succeeded','PUBLIC_JOB_TERMINAL');return {id:text(job.id),noteId:text(job.noteId),state:job.state};});
  check(jobs.filter(j=>j.state==='failed').length===2&&jobs.filter(j=>j.state==='cancelled').length===1&&jobs.filter(j=>j.state==='succeeded').length===1,'PUBLIC_JOB_STATES');
  const result=await backup(noteIds[0]!);const record=row(list(result.records)[0]);check(record.bytes===1024,'PUBLIC_RECORD_BYTES');
  const expectations:AuditExpectations={accountId,noteIds:[noteIds[0]!,noteIds[1]!],attemptIds:[attemptIds[0]!,attemptIds[1]!,attemptIds[2]!],jobs,record:{id:text(record.id),noteId:noteIds[0]!,bytes:1024,sha256:createHash('sha256').update('UI_ORIGINAL_1'+' '.repeat(1024-13)).digest('hex')}};
  return {expectations,counts:Object.fromEntries(counts),pickerPosts,selectionPosts};
}

export async function completeUi(root:string,origin:string,notify:(stage:UiOperationStage)=>void) {
  const runtime=await runUi(root,origin);let stageFailed=false;
  try {
    notify('ui-ready');const completed=await executeUi(runtime,notify);runtime.supervisor.note("u7",true);const stop=await runtime.supervisor.stop(runtime.close);
    check(stop.kind==="normal"&&stop.actualClosed,"NORMAL_STOP_REQUIRED");runtime.restoreObservation();
    const audit=await runtime.supervisor.copyAndAudit({activeDatabase:join(root,"active.db"),expectations:completed.expectations});
    runtime.supervisor.note("u7-done",true);const summary={candidate:binding.candidate,releaseSha:binding.releaseSha,counts:completed.counts,pickerPosts:completed.pickerPosts,selectionPosts:completed.selectionPosts,stop,audit,ledger:runtime.supervisor.entries};
    const payload=JSON.stringify(summary);check(Buffer.byteLength(payload)<=256*1024,"SUMMARY_BYTES");const handle=await open(join(root,"material/result.json"),"wx",0o600);runtime.supervisor.knownFd(handle);try{await handle.writeFile(payload);await handle.sync();}finally{await handle.close();}
    await runtime.supervisor.guard();return summary;
  }catch(error){stageFailed=true;const stop=await runtime.supervisor.stop(runtime.close);if(stop.actualClosed)runtime.restoreObservation();throw error;}
  finally {runtime.supervisor.note('stage-failed',stageFailed);}
}
