#!/usr/bin/env python3
import errno
import hashlib
import json
import os
from pathlib import Path
import selectors
import signal
import stat
import subprocess
import sys
import time

REPO = Path('/Users/hikaru/github.com/tuanemuy/hollow')
BASE = Path('/Users/hikaru/.local/share/hollow-validation')
ROOT = BASE / 'ui-e63071b4'
SCRATCH = BASE / 'ui-tool-e63071b4'
BUILD = BASE / 'goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02'
WORKDIR = BUILD / 'source/apps/web'
NODE = '/nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node'
SOURCE_MANIFEST = BUILD / 'material/source-manifest.json'
SOURCE_SHA = 'f1d7f33945f0977de5b1615639b8f96e6b15ded2207600d90ccd97adf78255b0'
HELPERS = REPO / '.goal-implement/helpers/p5c-ui'
ORIGIN = 'http://127.0.0.1:43173'
MiB = 1024 * 1024
HASHES = {
    'boot.mts': 'bf12b05a053edafda14c727817ba604b6cd8688e18905f94124ea2d76d5c46b0',
    'provider.mts': 'bcb1c1d0f0a0c0df7a13bb4837c01fc5e6486cb0ef779def437dda65bcbe7097',
    'browser.mts': '006e983e8edbc9155a43669fa80f61f35ef01ebfc2fcaa69c6c661233c5b59bc',
    'contract-pure.mts': 'cd7843510584a375ee108e0a2879d4c598d4d8be9d66675139c4326065ccabcd',
    'stop-audit.mts': '157f0c4e6d0143fee0f59197e161150d79c76d53c7c4736a4538a33aa005abcb',
}
ENV = {'PATH': '/usr/bin:/bin', 'LANG': 'C', 'TMPDIR': str(SCRATCH)}

STAGES = ('initialization', 'native-hooks', 'boot-import', 'pure', 'ui-root', 'ui-work', 'ui-ready', 'signup-start', 'signup-done', 'signin-start', 'signin-done', 'upload1-start', 'upload1-done', 'upload2-start', 'upload2-done', 'finalize-restore', 'finalize-recovery', 'finalize-hooks', 'finalize-frame', 'finalize-fd')
FAULTS = ('CAUGHT', 'UNCAUGHT_EXCEPTION', 'UNHANDLED_REJECTION', 'ASYNC_IIFE_REJECTION', 'FINALIZATION')
CASE_MARKERS = ('AMBIENT_CONFIGURATION', 'AUDIT_PUBLIC_IDENTITIES', 'AUDIT_PUBLIC_JOBS', 'AUTH_RECEIPT_COUNT', 'AUTH_RECEIPT_ID', 'BACK_AUTO_ZERO', 'BINDING_HASH', 'BINDING_PATH', 'BOOT_CLOSE_UNPROVEN', 'BUILT_BOOT_API', 'BUILT_BUSINESS_API', 'CANCEL_CONFIRM_POST_ZERO', 'CONFIRM_COUNT', 'CONTINUE_ACTION', 'CONTROL_ID', 'CURRENT_ACCOUNT', 'CURRENT_AUTH_BROWSER', 'CURRENT_NOTE_ORIGINAL', 'CURRENT_WAIT_DEADLINE', 'DRIVE_OPTIONS', 'DTO_LIST', 'DTO_SHAPE', 'DTO_TEXT', 'EXIT_RECEIPT_CURRENT', 'FAILED_RELINK_RETAINED', 'FORK_PATH', 'HOLLOW_REQUEST_COUNT', 'INITIAL_PANEL', 'LATE_CALLBACK_INVOKED', 'LATE_CALLBACK_POST_ZERO', 'LIFECYCLE_RECEIPT', 'MIGRATION_FK', 'MUTATION_CAP', 'NORMAL_STOP_REQUIRED', 'NOTE_ONE', 'NOTE_TWO', 'OUTPUT_MANIFEST', 'PARSER_INPUT', 'PICKER_MUTATIONS', 'PICKER_RESPONSE_GATE', 'PROVIDER_ENDPOINT', 'PUBLIC_JOB_STATES', 'PUBLIC_JOB_TERMINAL', 'PUBLIC_RECORD_BYTES', 'PURE_BEFORE_BOOT', 'PURE_BEFORE_UI_ROOT', 'PURE_BUILT_CLASS', 'PURE_ONCE', 'RECEIPT_SCOPE', 'RESEND_COUNT', 'RETARGET_CANCEL_ZERO', 'RETRY_ALLOCATION_ZERO', 'RPC_EXPORT', 'RPC_FUNCTION', 'RPC_NAME', 'RPC_NOT_BOUND', 'RPC_REQUIRED_BINDING', 'SAME_FOLDER_ID', 'SDK_ENABLED', 'SDK_FRAME', 'SDK_HANDLE', 'SDK_SCOPE', 'SDK_SELECTOR', 'SELECTION_MUTATIONS', 'STAGE_DEADLINE', 'SUCCESS_RECORD_ONE', 'SUCCESS_RELINK_SETTINGS', 'SUMMARY_BYTES', 'TRASH_GUIDANCE', 'UI_ARIA_COUNT', 'UI_ARIA_DISABLED', 'UI_ARIA_MISSING', 'UI_ARIA_NAME', 'UI_AUDIT_ATTEMPT', 'UI_AUDIT_ATTEMPTS', 'UI_AUDIT_CLOSE', 'UI_AUDIT_CONNECTION', 'UI_AUDIT_COUNTS', 'UI_AUDIT_EXPECTATIONS', 'UI_AUDIT_GATE', 'UI_AUDIT_HEAD', 'UI_AUDIT_HISTORY', 'UI_AUDIT_INTEGRITY', 'UI_AUDIT_JOB', 'UI_AUDIT_NOTE', 'UI_AUDIT_OLD_TARGETS', 'UI_AUDIT_ORIGINALS', 'UI_AUDIT_OWNER', 'UI_AUDIT_PIN', 'UI_AUDIT_RECORD', 'UI_AUDIT_SCALAR', 'UI_AUDIT_SCOPE', 'UI_AUDIT_SECOND_HEAD', 'UI_AUDIT_TARGET', 'UI_AUDIT_TRANSFER', 'UI_AUDIT_WAL', 'UI_BACK_ALREADY_USED', 'UI_BACK_UNKNOWN', 'UI_BROWSER_CLOSE_UNPROVEN', 'UI_BROWSER_CONTEXT_COUNT', 'UI_BROWSER_DENY_CAP', 'UI_BROWSER_DIRECTORY', 'UI_BROWSER_EXECUTABLE_BINDING', 'UI_BROWSER_EXECUTABLE_CHANGED', 'UI_BROWSER_FIXTURE_CAP', 'UI_BROWSER_NETWORK_FAILED', 'UI_BROWSER_ORIGIN', 'UI_BROWSER_PAGE_COUNT', 'UI_BROWSER_PAGE_MISSING', 'UI_BROWSER_PROCESS', 'UI_BROWSER_REQUEST_BYTES', 'UI_BROWSER_REQUEST_CAP', 'UI_BROWSER_RESPONSE', 'UI_BROWSER_RESPONSE_CAP', 'UI_BROWSER_ROOT', 'UI_BROWSER_SETUP_CLOSE_TIMEOUT', 'UI_BROWSER_SOCKET_LENGTH', 'UI_BROWSER_UNPROVEN', 'UI_BROWSER_VERSION_BINDING', 'UI_CAPACITY', 'UI_CATEGORY_CAPACITY', 'UI_CHILD_CAPACITY', 'UI_CHILD_ERROR', 'UI_CHILD_REGISTRATION', 'UI_CHROME_EARLY_OWNER', 'UI_CHROME_HANDLE_CHANGED', 'UI_CHROME_HOST', 'UI_CHROME_METADATA_BINDING', 'UI_CHROME_METADATA_EXIT', 'UI_CHROME_METADATA_FAILED', 'UI_CHROME_METADATA_MISSING', 'UI_CHROME_METADATA_SHAPE', 'UI_CHROME_PG_UNPROVEN', 'UI_CHROME_PID', 'UI_CHROME_PROCESS_CAP', 'UI_CHROME_REGISTRATION', 'UI_CHROME_SETUP', 'UI_CHROME_SETUP_TIMEOUT', 'UI_CHROME_SPAWN_BINDING', 'UI_CHROME_UNREGISTERED', 'UI_CLICK_DOCUMENT_CHANGED', 'UI_CLICK_UNKNOWN', 'UI_COMPLETION_UNPROVEN', 'UI_CONTROL_CAP', 'UI_CONTROL_FD', 'UI_CONTROL_WRITE', 'UI_COPY_CHANGED', 'UI_COPY_DEADLINE', 'UI_COPY_SHORT', 'UI_COPY_SOURCE', 'UI_COPY_WRITE', 'UI_DATABASE_CAPACITY', 'UI_DEADLINE', 'UI_DIALOG_ALREADY_ARMED', 'UI_DIALOG_CLOSED', 'UI_DIALOG_MISSING', 'UI_DIALOG_RESPONSE_UNKNOWN', 'UI_DIALOG_UNEXPECTED', 'UI_DIRECTORY_BINDING', 'UI_DIRECTORY_CHANGED', 'UI_DIRECTORY_MODE', 'UI_DOCUMENT_CAP', 'UI_DOCUMENT_CHANGED', 'UI_DOCUMENT_MISSING', 'UI_DOCUMENT_ORIGIN', 'UI_EMERGENCY_STOP', 'UI_ENTRY_TYPE', 'UI_ENTRY_UID', 'UI_FAILURE_CODE', 'UI_FD_REGISTRATION', 'UI_FILE_MODE', 'UI_GUARD_FAILED', 'UI_HELPER_BINDING', 'UI_LEDGER_VALUE', 'UI_LOG_CAPACITY', 'UI_MIRROR_CAP', 'UI_NATIVE_TS_BINDING', 'UI_NATIVE_TS_BOUNDARY', 'UI_NATIVE_TS_FILE', 'UI_NATIVE_TS_HASH', 'UI_NODE_EXECUTABLE_BINDING', 'UI_NODE_VERSION_BINDING', 'UI_NORMAL_CLOSE_UNPROVEN', 'UI_OPERATION_GATE_DUPLICATE', 'UI_OPERATION_GATE_MISSING', 'UI_OUTER_CHROME_BINDING', 'UI_PARSER_OPERATION', 'UI_PIPE_ERROR', 'UI_PROXY_ADDRESS', 'UI_PROXY_CLOSE_UNPROVEN', 'UI_PROXY_LISTEN_TIMEOUT', 'UI_PURE_COUNT', 'UI_RESERVATION_USED', 'UI_ROOT_BINDING', 'UI_ROOT_CAPACITY', 'UI_ROOT_EXISTS', 'UI_ROOT_MODE', 'UI_ROOT_PARENT', 'UI_ROOT_REALPATH', 'UI_ROOT_STAT', 'UI_SEARCH_WORKER_DIAGNOSTIC', 'UI_SELF_SIGNAL_FAILED', 'UI_SERVER_CAPACITY', 'UI_SINGLETON_BINDING', 'UI_SINGLETON_CHANGED', 'UI_SINGLETON_COOKIE', 'UI_SINGLETON_DIRECTORY', 'UI_SINGLETON_EXTRA', 'UI_SINGLETON_PARTIAL', 'UI_SINGLETON_RETAINED', 'UI_SINGLETON_SETUP_EXTRA', 'UI_SINGLETON_SOCKET_MODE', 'UI_SINGLETON_SOCKET_PATH', 'UI_SINGLETON_SOCKET_ROOT', 'UI_SINGLETON_TYPE', 'UI_SOURCE_ENTRY', 'UI_SOURCE_MANIFEST', 'UI_SOURCE_MANIFEST_SHAPE', 'UI_SPAWN_OBSERVER_CHANGED', 'UI_STOP_UNAVAILABLE', 'UI_SUPERVISOR_START', 'UI_UID_UNAVAILABLE', 'UI_UNKNOWN_DATABASE', 'UI_WEB_WORKER_CAP', 'UI_WHOLE_DEADLINE', 'UI_WORKER_CAPACITY', 'UI_WORKER_DUPLICATE', 'UI_WORKER_ERROR', 'UI_WORKER_STOP_FAILED', 'UNBOUND_MUTATION', 'UNKNOWN_GET_NO_CREATE', 'UPLOAD_ONCE', 'UPLOAD_TRANSPORT', 'VERIFY_TOKEN', 'WORKER_PATH')
NATIVE_CODES = ('ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX', 'ERR_UNKNOWN_FILE_EXTENSION', 'ERR_INVALID_TYPESCRIPT_SYNTAX', 'ERR_REQUIRE_CYCLE_MODULE', 'ERR_REQUIRE_ASYNC_MODULE', 'ERR_INVALID_ARG_TYPE', 'ERR_INVALID_ARG_VALUE', 'ERR_STREAM_DESTROYED', 'ERR_UNHANDLED_ERROR', 'EPIPE', 'EBADF', 'ENOENT', 'EACCES', 'EPERM')

ERROR_NAMES = ('Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError', 'CodedError', 'ApplicationError', 'BusinessRuleError', 'RehydrationError', 'NotFoundError', 'ConflictError', 'UnauthorizedError', 'ForbiddenError', 'SystemError')
SERIALIZED_KINDS = ('business', 'notFound', 'conflict', 'unauthorized', 'forbidden', 'system')

FATAL_PREFIXES = ((b'FATAL ERROR:', 'NODE_FATAL_ERROR'), (b'libc++abi:', 'LIBCXXABI_FATAL'), (b'Assertion failed:', 'ASSERTION_FAILED'))

LAUNCHER = r"""
'use strict';
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const {fileURLToPath,pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const {isProxy,isNativeError}=require('node:util').types;
const {syncBuiltinESMExports,registerHooks,stripTypeScriptTypes}=require('node:module');
const FD=__FD__, TAG=__TAG__, HELPER_HASHES=__HELPERS__;
const CASE_MARKERS=new Set(__CASES__), NATIVE_CODES=new Set(__NATIVE__);
const ERROR_NAMES=new Set(__ERROR_NAMES__), SERIALIZED_KINDS=new Set(__KINDS__);
const BUILTIN_ERROR_NAMES=new Map([[Error.prototype,'Error'],[EvalError.prototype,'EvalError'],[RangeError.prototype,'RangeError'],[ReferenceError.prototype,'ReferenceError'],[SyntaxError.prototype,'SyntaxError'],[TypeError.prototype,'TypeError'],[URIError.prototype,'URIError'],[AggregateError.prototype,'AggregateError']]);
const ROOT='/Users/hikaru/.local/share/hollow-validation/ui-e63071b4';
const ORIGIN='http://127.0.0.1:43173';
const SOURCE='/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source';
const HELPER='/Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/p5c-ui';
const MANIFEST=path.dirname(SOURCE)+'/material/source-manifest.json';
const MANIFEST_SHA='f1d7f33945f0977de5b1615639b8f96e6b15ded2207600d90ccd97adf78255b0';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const originalSpawn=cp.spawn;
const pureDeadline=performance.now()+30000;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
let sequence=0,bytes=0,chrome=null,controlFailure=false,hooks=null,recovery=null,stage="initialization",faultCount=0;
function writeAll(fd,payload) {
 let at=0;while(at<payload.length){const n=fs.writeSync(fd,payload,at,payload.length-at);if(n<1)throw Error('UI_CONTROL_WRITE');at+=n;}
}
function frame(kind,fields={}) {
 const payload=Buffer.from(JSON.stringify({sequence:++sequence,kind,tag:TAG,...fields})+'\n');
 if(sequence>64||payload.length>512||bytes+payload.length>32768)throw Error('UI_CONTROL_CAP');
 writeAll(FD,payload);bytes+=payload.length;
}
function recordFault(error,fault) {
 let marker='UNKNOWN',guard=null;
 const detail={type:fault,name:'UNKNOWN',code:'UNKNOWN',kind:'UNKNOWN'};
 try{
  if(error!==null&&(typeof error==='object'||typeof error==='function')&&!isProxy(error)) {
   const proto=Object.getPrototypeOf(error);
   const name=Object.getOwnPropertyDescriptor(error,'name');
   if(!name)detail.name=BUILTIN_ERROR_NAMES.get(proto)??'UNKNOWN';
   else if(Object.hasOwn(name,'value')&&typeof name.value==='string'&&ERROR_NAMES.has(name.value))detail.name=name.value;
   const message=isNativeError(error)?Object.getOwnPropertyDescriptor(error,'message'):null;
   const code=Object.getOwnPropertyDescriptor(error,'code');
   if(!code)detail.code='ABSENT';
   else if(Object.hasOwn(code,'value')&&typeof code.value==='string'&&NATIVE_CODES.has(code.value))detail.code=code.value;
   if(message&&Object.hasOwn(message,'value')&&typeof message.value==='string'&&CASE_MARKERS.has(message.value))marker=message.value;
   else if(detail.code!=='UNKNOWN'&&detail.code!=='ABSENT')marker=detail.code;
   const kind=Object.getOwnPropertyDescriptor(error,'kind');
   if(kind) {
    if(Object.hasOwn(kind,'value')&&typeof kind.value==='string'&&SERIALIZED_KINDS.has(kind.value))detail.kind=kind.value;
   } else {
    const own=Object.getOwnPropertyDescriptor(error,'toSerialized');
    const method=own??(proto!==null&&!isProxy(proto)?Object.getOwnPropertyDescriptor(proto,'toSerialized'):undefined);
    if(method) {
     if(Object.hasOwn(method,'value')&&typeof method.value==='function')detail.kind='METHOD_ONLY';
    } else if(proto===null||!isProxy(proto))detail.kind='ABSENT_AT_BOUNDARY';
   }
   const metadata=Object.getOwnPropertyDescriptor(error,'guardContext');
   const value=metadata&&Object.hasOwn(metadata,'value')?metadata.value:null;
   if(value&&typeof value==='object'&&!isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype&&Object.isFrozen(value)&&Object.keys(value).length===3) {
    const location=Object.getOwnPropertyDescriptor(value,'location'),type=Object.getOwnPropertyDescriptor(value,'type'),known=Object.getOwnPropertyDescriptor(value,'knownMetadataName');
    if(location&&type&&known&&Object.hasOwn(location,'value')&&Object.hasOwn(type,'value')&&Object.hasOwn(known,'value')&&typeof location.value==='string'&&typeof type.value==='string'&&typeof known.value==='boolean'&&['root','owned-chrome-profile','chrome-tmp','objects','node-tmp','other','unknown'].includes(location.value)&&['directory','regular','symlink','socket','other','unknown'].includes(type.value))guard={location:location.value,type:type.value,knownMetadataName:known.value};
   }
  }
 }catch{}
 try{if(++faultCount<=16)frame('fault',{stage,fault:detail,marker,guard});}catch{controlFailure=true;}
}
function enterStage(value){stage=value;frame('stage',{stage});}
const monitor=(error,origin)=>recordFault(error,origin==='unhandledRejection'?'UNHANDLED_REJECTION':'UNCAUGHT_EXCEPTION');
process.on('uncaughtExceptionMonitor',monitor);
function groupAbsent(pid) {try{process.kill(-pid,0);return false;}catch(e){return e&&e.code==='ESRCH';}}
function ownSignal(pid,name) {if(!groupAbsent(pid))process.kill(-pid,name);}
function installNativeHooks() {
 const raw=fs.readFileSync(MANIFEST);if(raw.length>1024*1024||digest(raw)!==MANIFEST_SHA)throw Error('UI_SOURCE_MANIFEST');
 const manifest=JSON.parse(raw.toString('utf8'));
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||Object.keys(manifest).length!==1457)throw Error('UI_SOURCE_MANIFEST_SHAPE');
 const allowed=new Map();
 for(const [rel,value] of Object.entries(manifest)) {
  if(!rel.startsWith('packages/core/src/')||!rel.endsWith('.ts'))continue;
  if(path.posix.normalize(rel)!==rel||rel.startsWith('/')||rel.includes('\\')||!value||typeof value!=='object'||!Number.isSafeInteger(value.bytes)||value.bytes<0||value.bytes>32*1024*1024||!/^[a-f0-9]{64}$/.test(value.sha256)||value.mode!=='100644')throw Error('UI_SOURCE_ENTRY');
  allowed.set(SOURCE+'/'+rel,{bytes:value.bytes,sha256:value.sha256,kind:'source'});
 }
 for(const [name,sha256] of Object.entries(HELPER_HASHES)) {
  if(!/^[a-z-]+\.mts$/.test(name)||!/^[a-f0-9]{64}$/.test(sha256))throw Error('UI_HELPER_BINDING');
  allowed.set(HELPER+'/'+name,{bytes:null,sha256,kind:'helper'});
 }
 return registerHooks({
  resolve(specifier,context,nextResolve) {
   try{return nextResolve(specifier,context);}catch(error) {
    if(!error||error.code!=='ERR_MODULE_NOT_FOUND'||!context.parentURL||!/^\.\.?\//.test(specifier)||specifier.includes('?')||specifier.includes('#')||specifier.includes('\\')||path.posix.extname(specifier)!=='')throw error;
    const parent=new URL(context.parentURL);
    if(parent.protocol!=='file:'||parent.search||parent.hash)throw error;
    const from=fileURLToPath(parent);if(allowed.get(from)?.kind!=='source')throw error;
    const candidate=new URL(specifier+'.ts',parent);const target=fileURLToPath(candidate);
    if(!target.startsWith(SOURCE+'/packages/core/src/')||!allowed.has(target)||fs.realpathSync(target)!==target)throw error;
    return nextResolve(candidate.href,context);
   }
  },
  load(url,context,nextLoad) {
   const location=new URL(url);const ext=path.extname(location.pathname);
   if(!['.ts','.mts','.tsx','.cts'].includes(ext))return nextLoad(url,context);
   if(location.protocol!=='file:'||location.search||location.hash||ext==='.tsx'||ext==='.cts')throw Error('UI_NATIVE_TS_BOUNDARY');
   const file=fileURLToPath(location);const expected=allowed.get(file);
   if(!expected||fs.realpathSync(file)!==file||location.href!==pathToFileURL(file).href||context.format==='commonjs'||context.format==='commonjs-typescript')throw Error('UI_NATIVE_TS_BINDING');
   const st=fs.lstatSync(file);if(!st.isFile()||st.nlink!==1||st.size>32*1024*1024||(expected.bytes!==null&&st.size!==expected.bytes))throw Error('UI_NATIVE_TS_FILE');
   const original=fs.readFileSync(file);if(digest(original)!==expected.sha256)throw Error('UI_NATIVE_TS_HASH');
   return {format:'module',source:stripTypeScriptTypes(original.toString('utf8'),{mode:'transform',sourceUrl:location.href}),shortCircuit:true};
  }
 });
}
function rememberChrome(child) {
 const pipes=child.stdio.map(stream=>({stream,closed:stream?.closed===true}));
 const state={child,pipes,exited:child.exitCode!==null,closed:false};
 child.once('exit',()=>{state.exited=true;});child.once('close',()=>{state.closed=true;});
 for(const pipe of pipes)pipe.stream?.once('close',()=>{pipe.closed=true;});
 return state;
}
function preserveChromeOnWriteFailure(state) {
 controlFailure=true;
 if(recovery)return;
 try{ownSignal(state.child.pid,'SIGKILL');}catch{}
 for(const pipe of state.pipes)pipe.stream?.destroy();
 // A referenced timer retains the actual owner until the finite close gate settles.
 recovery=new Promise(resolve=>{
  const deadline=performance.now()+10000;
  const timer=setInterval(()=>{
   const actualClosed=state.exited&&state.closed&&state.pipes.length===5&&state.pipes.every(p=>p.closed)&&groupAbsent(state.child.pid);
   if(actualClosed){clearInterval(timer);resolve(true);}
   else if(performance.now()>=deadline){
    clearInterval(timer);
    // The outer retains the mirrored PID if physical closure remains unproven.
    resolve(false);
   }
  },200);
 });
}
const observeSpawn=function(command,argv,options) {
 if(command!==CHROME)return originalSpawn.apply(this,arguments);
 if(chrome||!Array.isArray(argv)||options?.detached!==true||!Array.isArray(options.stdio)||options.stdio.length!==5||!options.stdio.every(x=>x==='pipe')||!argv.includes('--remote-debugging-pipe')||!argv.includes('--user-data-dir='+ROOT+'/c/profile')||!argv.includes('--proxy-bypass-list=<-loopback>;127.0.0.1:43173')||argv.filter(x=>x.startsWith('--proxy-server=')).length!==1||!argv.some(x=>/^--proxy-server=http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(x)))throw Error('UI_OUTER_CHROME_BINDING');
 const child=originalSpawn.apply(this,arguments);chrome=rememberChrome(child);
 if(!Number.isSafeInteger(child.pid)||child.pid<1){controlFailure=true;return child;}
 const mirror=Buffer.from('\nHOLLOW_UI_OWNERSHIP:'+TAG+':'+JSON.stringify({kind:'chrome',tag:TAG,pid:child.pid,pgid:child.pid})+'\n');
 try{if(mirror.length>512)throw Error('UI_MIRROR_CAP');writeAll(2,mirror);frame('chrome',{pid:child.pid,pgid:child.pid});}catch{preserveChromeOnWriteFailure(chrome);}
 return child;
};
(async()=>{
 let success=false,recoveryClosed=null;
 try {
  const st=fs.fstatSync(FD);if(!st.isFile()||st.nlink!==1||(st.mode&511)!==384||!/^[a-f0-9]{32}$/.test(TAG))throw Error('UI_CONTROL_FD');
  enterStage('initialization');cp.spawn=observeSpawn;syncBuiltinESMExports();
  const node='/nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node';
  let canonicalNode;try{canonicalNode=fs.realpathSync(process.execPath);}catch{throw Error('UI_NODE_EXECUTABLE_BINDING');}
  if(process.execPath!==node||canonicalNode!==node)throw Error('UI_NODE_EXECUTABLE_BINDING');
  if(process.versions.node!=='24.15.0')throw Error('UI_NODE_VERSION_BINDING');
  enterStage('native-hooks');hooks=installNativeHooks();frame('loader-ready');enterStage('boot-import');
  const boot=await import('file:///Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/p5c-ui/boot.mts');
  enterStage('pure');const pure=await boot.prepareContracts();if(performance.now()>=pureDeadline||pure.count!==24||pure.count>24)throw Error('UI_PURE_COUNT');
  frame('pure-ok',{count:pure.count});frame('ui-start');
  enterStage('ui-root');const root=await boot.prepareUiRoot(ROOT);if(root!==ROOT)throw Error('UI_ROOT_BINDING');
  enterStage('ui-work');const result=await boot.completeUi(root,ORIGIN,enterStage);
  if(controlFailure||result.stop.kind!=='normal'||result.stop.actualClosed!==true||result.audit.auditClosed!==true)throw Error('UI_COMPLETION_UNPROVEN');
  frame('done',{normal:true,actualClosed:true,auditClosed:true});success=true;
 }catch(error){
  recordFault(error,'CAUGHT');const code='UI_INNER_FAILED';
  try{frame('failed',{code});}catch{controlFailure=true;if(chrome?.child.pid)preserveChromeOnWriteFailure(chrome);}
  process.exitCode=1;
 }finally{
  const finalStep=(value,fn)=>{stage=value;try{frame('stage',{stage});fn();}catch(error){controlFailure=true;process.exitCode=1;recordFault(error,'FINALIZATION');}};
  finalStep('finalize-restore',()=>{if(cp.spawn===observeSpawn)cp.spawn=originalSpawn;else throw Error('UI_OUTER_CHROME_BINDING');syncBuiltinESMExports();});
  stage='finalize-recovery';try{frame('stage',{stage});if(recovery)recoveryClosed=await recovery;}catch(error){controlFailure=true;process.exitCode=1;recordFault(error,'FINALIZATION');}
  if(recoveryClosed===false){controlFailure=true;process.exitCode=1;}
  finalStep('finalize-hooks',()=>hooks?.deregister());
  stage='finalize-frame';try{frame('stage',{stage});frame('finished',{success:success&&!controlFailure,recoveryClosed});}catch(error){process.exitCode=1;recordFault(error,'FINALIZATION');}
  stage='finalize-fd';try{frame('stage',{stage});fs.closeSync(FD);}catch(error){process.exitCode=1;recordFault(error,'FINALIZATION');}

 }
})().catch(error=>{recordFault(error,'ASYNC_IIFE_REJECTION');throw error;});
"""


def fail(code):
    raise RuntimeError(code)


def public_binding():
    node = Path(NODE)
    try:
        node_stat = node.lstat()
        node_canonical = node.resolve(strict=True)
    except OSError:
        fail('NODE_PUBLIC_BINDING')
    if node_canonical != node or not stat.S_ISREG(node_stat.st_mode) or stat.S_IMODE(node_stat.st_mode) != 0o555 or node_stat.st_size != 64896912 or node_stat.st_nlink != 2:
        fail('NODE_PUBLIC_BINDING')
    if BASE.resolve() != BASE or HELPERS.resolve() != HELPERS:
        fail('PUBLIC_PARENT_BINDING')
    for name, expected in HASHES.items():
        path = HELPERS / name
        st = path.lstat()
        if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or stat.S_IMODE(st.st_mode) != 0o600:
            fail('HELPER_MODE')
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            fail('HELPER_HASH')
    if hashlib.sha256(SOURCE_MANIFEST.read_bytes()).hexdigest() != SOURCE_SHA:
        fail('SOURCE_MANIFEST_HASH')
    for path in (ROOT, SCRATCH):
        if os.path.lexists(path):
            fail('EXCLUSIVE_ROOT_EXISTS')


def tree_bytes(root, strict=False):
    count = 0
    total = 0
    stack = [(root, 0)]
    while stack:
        path, depth = stack.pop()
        if depth > 32:
            fail('OUTER_TREE_DEPTH')
        try:
            st = path.lstat()
        except FileNotFoundError:
            continue
        count += 1
        if count > 32768:
            fail('OUTER_TREE_COUNT')
        if stat.S_ISDIR(st.st_mode):
            if strict and stat.S_IMODE(st.st_mode) != 0o700:
                fail('TOOL_DIRECTORY_MODE')
            try:
                with os.scandir(path) as entries:
                    for entry in entries:
                        stack.append((Path(entry.path), depth + 1))
            except FileNotFoundError:
                continue
        else:
            if strict and (not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or stat.S_IMODE(st.st_mode) != 0o600):
                fail('TOOL_FILE_MODE')
            total += st.st_size
    return total


def group_state(pgid):
    try:
        os.killpg(pgid, 0)
        return 'alive'
    except ProcessLookupError:
        return 'absent'
    except OSError:
        return 'unproven'


def own_signal(pgid, sig):
    state = group_state(pgid)
    if state == 'absent':
        return {'attempted': False, 'outcome': 'ESRCH-absent'}
    if state != 'alive':
        return {'attempted': False, 'outcome': 'other-unknown'}
    try:
        os.killpg(pgid, sig)
        return {'attempted': True, 'outcome': 'sent-success'}
    except ProcessLookupError:
        return {'attempted': True, 'outcome': 'ESRCH-absent'}
    except OSError as error:
        return {'attempted': True, 'outcome': 'EPERM-unknown' if error.errno == errno.EPERM else 'other-unknown'}


def new_file(path):
    return os.open(path, os.O_RDWR | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o600)


def run():
    os.umask(0o077)
    public_binding()
    tag = os.urandom(16).hex()
    os.mkdir(SCRATCH, 0o700)
    control = new_file(SCRATCH / 'ownership.jsonl')
    selector = selectors.DefaultSelector()
    process = None
    receipt = {'root': str(ROOT), 'origin': ORIGIN, 'nodeExit': None,
               'nodePGAbsent': False, 'chromePGAbsent': None,
               'stdoutEof': False, 'stderrEof': False, 'stdoutClosed': False, 'stderrClosed': False,
               'controlRegularFdClosed': False, 'controlIsPipe': False, 'controlEofObserved': False,
               'nativeSyncHooks': True, 'loaderThreads': 0, 'transformServices': 0,
               'ownershipMirrorValidated': False, 'chromeRecoveryClosed': None,
               'kind': 'unproven', 'forced': False, 'error': None, 'faults': [], 'stages': [],
               'outerDeadlineExceeded': None, 'pureCount': None,
               'outerSignals': {slot: {'attempted': False, 'outcome': 'not-attempted'} for slot in ('node-term', 'node-kill', 'chrome-term', 'chrome-kill')},
               'fatalPrefixes': [],
               'nodePGState': 'unobserved', 'chromePGState': 'unobserved'}
    chrome_pgid = None
    streams = {}
    phase = 'pure'
    pure_ok = done = finished = finished_seen = chrome_frame_seen = False
    buffer = mirror_buffer = b''
    prefix = b'\nHOLLOW_UI_OWNERSHIP:' + tag.encode() + b':'
    mirror_seen = False
    offset = sequence = total_output = 0
    next_guard = 0.0
    tail = None
    deadline = 0.0
    sent = set()
    fatal_progress = [0, 0, 0]
    fatal_seen = [False, False, False]

    def bind_chrome(frame):
        nonlocal chrome_pgid
        pid = frame['pid']
        if type(pid) is not int or not 0 < pid < 2**31 or type(frame['pgid']) is not int or frame['pgid'] != pid or process is None or pid == process.pid:
            fail('CHROME_OWNERSHIP_BINDING')
        if chrome_pgid is not None and chrome_pgid != pid:
            fail('CHROME_OWNERSHIP_COUNT')
        chrome_pgid = pid
        receipt['chromePid'] = pid

    def consume_control(now):
        nonlocal offset, buffer, sequence, pure_ok, phase, deadline, done, finished, finished_seen, chrome_frame_seen
        size = os.fstat(control).st_size
        if size > 32768:
            fail('CONTROL_CAP')
        data = os.pread(control, min(32768 - offset, 65536), offset)
        offset += len(data)
        buffer += data
        while b'\n' in buffer:
            line, buffer = buffer.split(b'\n', 1)
            if not line or len(line) > 511:
                fail('CONTROL_FRAME_BYTES')
            frame = json.loads(line)
            if not isinstance(frame, dict) or len(frame) > 7 or type(frame.get('sequence')) is not int or frame['sequence'] != sequence + 1 or frame.get('tag') != tag:
                fail('CONTROL_FRAME_SEQUENCE')
            sequence += 1
            if sequence > 64:
                fail('CONTROL_FRAME_COUNT')
            kind = frame.get('kind')
            expected = {'loader-ready': set(), 'pure-ok': {'count'}, 'ui-start': set(),
                        'chrome': {'pid', 'pgid'}, 'done': {'normal', 'actualClosed', 'auditClosed'},
                        'failed': {'code'}, 'finished': {'success', 'recoveryClosed'},
                        'stage': {'stage'}, 'fault': {'stage', 'fault', 'marker', 'guard'}}
            if kind not in expected or set(frame) != expected[kind] | {'sequence', 'kind', 'tag'}:
                fail('CONTROL_FRAME_SHAPE')
            if kind == 'stage':
                if frame['stage'] not in STAGES or len(receipt['stages']) >= 32:
                    fail('STAGE_FRAME')
                receipt['stages'].append(frame['stage'])
            elif kind == 'fault':
                detail = frame['fault']
                if not isinstance(detail, dict) or set(detail) != {'type', 'name', 'code', 'kind'} or any(type(detail[key]) is not str for key in ('type', 'name', 'code', 'kind')):
                    fail('FAULT_FRAME')
                if frame['stage'] not in STAGES or detail['type'] not in FAULTS or detail['name'] not in (*ERROR_NAMES, 'UNKNOWN') or detail['code'] not in (*NATIVE_CODES, 'ABSENT', 'UNKNOWN') or detail['kind'] not in (*SERIALIZED_KINDS, 'METHOD_ONLY', 'ABSENT_AT_BOUNDARY', 'UNKNOWN') or frame['marker'] not in (*CASE_MARKERS, *NATIVE_CODES, 'UNKNOWN') or len(receipt['faults']) >= 16:
                    fail('FAULT_FRAME')
                guard = frame['guard']
                if guard is not None and (not isinstance(guard, dict) or set(guard) != {'location', 'type', 'knownMetadataName'} or guard['location'] not in ('root', 'owned-chrome-profile', 'chrome-tmp', 'objects', 'node-tmp', 'other', 'unknown') or guard['type'] not in ('directory', 'regular', 'symlink', 'socket', 'other', 'unknown') or type(guard['knownMetadataName']) is not bool):
                    fail('FAULT_FRAME')
                receipt['faults'].append({'stage': frame['stage'], 'fault': detail['type'], 'marker': frame['marker'], 'guard': guard, 'errorInfo': {key: detail[key] for key in ('name', 'code', 'kind')}})
                receipt['error'] = receipt['error'] or 'INNER_FAULT'
            elif kind == 'pure-ok':
                if phase != 'pure' or pure_ok or type(frame['count']) is not int or frame['count'] != 24:
                    fail('PURE_RESULT_BINDING')
                pure_ok = True
                receipt['pureCount'] = frame['count']
            elif kind == 'ui-start':
                if not pure_ok or phase != 'pure' or now >= deadline:
                    fail('UI_STAGE_GATE')
                phase = 'ui'
                deadline = now + 720.0
            elif kind == 'chrome':
                if phase != 'ui' or chrome_frame_seen:
                    fail('CHROME_OWNERSHIP_FRAME')
                bind_chrome(frame)
                chrome_frame_seen = True
            elif kind == 'done':
                if phase != 'ui' or done or chrome_pgid is None or not all(frame[k] is True for k in ('normal', 'actualClosed', 'auditClosed')):
                    fail('DONE_UNPROVEN')
                done = True
            elif kind == 'failed':
                if not isinstance(frame['code'], str) or len(frame['code']) > 80:
                    fail('FAILED_FRAME')
                receipt['error'] = receipt['error'] or 'INNER_FAILURE'
            elif kind == 'finished':
                if finished_seen or type(frame['success']) is not bool or (frame['recoveryClosed'] is not None and type(frame['recoveryClosed']) is not bool):
                    fail('FINISHED_FRAME')
                finished_seen = True
                finished = frame['success']
                receipt['chromeRecoveryClosed'] = frame['recoveryClosed']
                if not finished or frame['recoveryClosed'] is False:
                    receipt['error'] = receipt['error'] or 'INNER_UNPROVEN'
        if len(buffer) > 511:
            fail('CONTROL_PARTIAL_CAP')

    def consume_mirror(chunk, now):
        nonlocal mirror_buffer, mirror_seen
        mirror_buffer += chunk
        while True:
            start = mirror_buffer.find(prefix)
            if start < 0:
                mirror_buffer = mirror_buffer[-(len(prefix) - 1):]
                return
            mirror_buffer = mirror_buffer[start:]
            end = mirror_buffer.find(b'\n', len(prefix))
            if end < 0:
                if len(mirror_buffer) > 511:
                    fail('MIRROR_PARTIAL_CAP')
                return
            line = mirror_buffer[len(prefix):end]
            if end + 1 > 512:
                fail('MIRROR_FRAME_CAP')
            frame = json.loads(line)
            if not isinstance(frame, dict) or set(frame) != {'kind', 'tag', 'pid', 'pgid'} or frame['kind'] != 'chrome' or frame['tag'] != tag or mirror_seen:
                fail('MIRROR_FRAME_BINDING')
            # Read stage frames first; the early stderr mirror can precede the next outer poll.
            try:
                consume_control(now)
            except Exception:
                receipt['error'] = receipt['error'] or 'CONTROL_UNPROVEN'
            if not pure_ok or phase != 'ui':
                fail('MIRROR_STAGE_GATE')
            bind_chrome(frame)
            mirror_seen = True
            receipt['ownershipMirrorValidated'] = True
            mirror_buffer = mirror_buffer[end + 1:]

    def consume_fatal(chunk):
        for byte in chunk:
            for index, (literal, _marker) in enumerate(FATAL_PREFIXES):
                if fatal_seen[index]:
                    continue
                matched = fatal_progress[index]
                matched = matched + 1 if byte == literal[matched] else int(byte == literal[0])
                if matched == len(literal):
                    fatal_seen[index] = True
                    matched = 0
                fatal_progress[index] = matched
        receipt['fatalPrefixes'] = [marker for index, (_literal, marker) in enumerate(FATAL_PREFIXES) if fatal_seen[index]]

    def drain_pipes():
        nonlocal total_output
        for key, _mask in selector.select(0.2):
            try:
                chunk = os.read(key.fileobj.fileno(), 65536)
            except BlockingIOError:
                continue
            if chunk:
                total_output += len(chunk)
                if total_output > 12 * MiB:
                    receipt['error'] = receipt['error'] or 'NODE_OUTPUT_CAP'
                if key.data == 'stderr':
                    consume_fatal(memoryview(chunk)[:max(0, min(len(chunk), 12 * MiB - (total_output - len(chunk))))])
                    try:
                        consume_mirror(chunk, time.monotonic())
                    except Exception:
                        receipt['error'] = receipt['error'] or 'MIRROR_UNPROVEN'
            else:
                selector.unregister(key.fileobj)
                key.fileobj.close()
                receipt[key.data + 'Eof'] = True
                receipt[key.data + 'Closed'] = True

    def stop_groups(elapsed, error):
        # Keep the Node owner alive for its ten-second actual Chrome/FD recovery gate.
        targets = (('chrome', chrome_pgid, 0.0, 10.0), ('node', process.pid, 10.0, 20.0))
        for target, pgid, term_at, kill_at in targets:
            if pgid is None or group_state(pgid) == 'absent':
                continue
            for name, sig, at in (('term', signal.SIGTERM, term_at), ('kill', signal.SIGKILL, kill_at)):
                if elapsed >= at and (pgid, sig) not in sent and (error or elapsed >= 10.0):
                    receipt['forced'] = True
                    receipt['outerSignals'][target + '-' + name] = own_signal(pgid, sig)
                    sent.add((pgid, sig))

    try:
        launcher = LAUNCHER.replace('__FD__', str(control)).replace('__TAG__', json.dumps(tag)).replace('__HELPERS__', json.dumps(HASHES, sort_keys=True)).replace('__CASES__', json.dumps(CASE_MARKERS)).replace('__NATIVE__', json.dumps(NATIVE_CODES)).replace('__ERROR_NAMES__', json.dumps(ERROR_NAMES)).replace('__KINDS__', json.dumps(SERIALIZED_KINDS))
        process = subprocess.Popen([NODE, '--eval', launcher], cwd=WORKDIR, env=ENV, stdin=subprocess.DEVNULL,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   pass_fds=(control,), start_new_session=True)
        receipt['nodePid'] = process.pid
        if os.getpgid(process.pid) != process.pid:
            fail('NODE_PG_BINDING')
        deadline = time.monotonic() + 30.0
        for name, stream in (('stdout', process.stdout), ('stderr', process.stderr)):
            if stream is None:
                fail('NODE_PIPE_MISSING')
            streams[name] = stream
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, name)
        while True:
            drain_pipes()
            now = time.monotonic()
            try:
                consume_control(now)
                if now >= next_guard:
                    next_guard = now + 0.2
                    scratch_bytes = tree_bytes(SCRATCH, True)
                    node_tmp = tree_bytes(ROOT / 'node-tmp')
                    if scratch_bytes + node_tmp > 8 * MiB or tree_bytes(ROOT) + scratch_bytes > 256 * MiB:
                        fail('OUTER_CAPACITY')
            except Exception:
                receipt['error'] = receipt['error'] or 'OUTER_GUARD_OR_CONTROL'
            exited = process.poll() is not None
            if now >= deadline and not exited:
                receipt['outerDeadlineExceeded'] = 'pure' if phase == 'pure' else 'ui'
                receipt['error'] = receipt['error'] or ('PURE_DEADLINE' if phase == 'pure' else 'UI_DEADLINE')
            if tail is None and (exited or receipt['error']):
                tail = now
            if tail is not None:
                pipes_closed = all(receipt[k] for k in ('stdoutEof', 'stderrEof', 'stdoutClosed', 'stderrClosed'))
                if exited and group_state(process.pid) == 'absent' and (chrome_pgid is None or group_state(chrome_pgid) == 'absent') and pipes_closed:
                    break
                elapsed = now - tail
                stop_groups(elapsed, bool(receipt['error']) or (exited and process.returncode != 0))
                if elapsed >= 30.0:
                    receipt['error'] = receipt['error'] or 'OUTER_CLOSURE_DEADLINE'
                    break
    except BaseException:
        receipt['error'] = receipt['error'] or 'OUTER_EXCEPTION'
        if process is not None:
            if tail is None:
                tail = time.monotonic()
            while time.monotonic() - tail < 30.0:
                drain_pipes()
                now = time.monotonic()
                try:
                    consume_control(now)
                except Exception:
                    receipt['error'] = receipt['error'] or 'STOP_CONTROL_UNPROVEN'
                stop_groups(now - tail, True)
                if process.poll() is not None and group_state(process.pid) == 'absent' and (chrome_pgid is None or group_state(chrome_pgid) == 'absent') and not selector.get_map():
                    break
    finally:
        receipt['outputBytes'] = total_output
        receipt['controlFrames'] = sequence
        receipt['purePassed'] = pure_ok
        receipt['uiCompleted'] = done
        receipt['finishedSeen'] = finished_seen
        receipt['innerFinishedSuccess'] = finished
        receipt['outerPhase'] = phase
        if buffer or prefix in mirror_buffer:
            receipt['error'] = receipt['error'] or 'OWNERSHIP_PARTIAL_FINAL'
        if process is not None:
            if process.poll() is not None:
                receipt['nodeExit'] = process.wait(timeout=0)
            receipt['nodePGState'] = group_state(process.pid)
            receipt['nodePGAbsent'] = receipt['nodePGState'] == 'absent'
        receipt['chromePGState'] = group_state(chrome_pgid) if chrome_pgid else 'unobserved'
        receipt['chromePGAbsent'] = receipt['chromePGState'] == 'absent' if chrome_pgid else None
        if receipt['nodeExit'] is not None and receipt['nodeExit'] != 0:
            receipt['error'] = receipt['error'] or 'NODE_NONZERO_EXIT'
        if not finished_seen:
            receipt['error'] = receipt['error'] or 'INNER_FINISHED_MISSING'
        actual_closed = receipt['nodeExit'] is not None and receipt['nodePGAbsent'] and (chrome_pgid is None or receipt['chromePGAbsent'] is True) and all(receipt[k] for k in ('stdoutEof', 'stderrEof', 'stdoutClosed', 'stderrClosed'))
        if done and finished and pure_ok and mirror_seen and chrome_frame_seen and receipt['nodeExit'] == 0 and actual_closed and receipt['chromePGAbsent'] is True and not receipt['error'] and not receipt['forced']:
            receipt['kind'] = 'normal'
        elif receipt['forced'] and actual_closed and (phase == 'pure' or chrome_pgid is not None):
            receipt['kind'] = 'forced'
        for name, stream in streams.items():
            if not stream.closed:
                try:
                    stream.close()
                    receipt[name + 'Closed'] = True
                except OSError:
                    receipt['error'] = receipt['error'] or 'PIPE_CLOSE_FAILED'
        selector.close()
        try:
            os.close(control)
            receipt['controlRegularFdClosed'] = True
        except OSError:
            receipt['error'] = receipt['error'] or 'CONTROL_CLOSE_FAILED'
        receipt['uiRootCreated'] = os.path.lexists(ROOT)
        if receipt['error'] or not receipt['controlRegularFdClosed']:
            if receipt['kind'] == 'normal':
                receipt['kind'] = 'unproven'
        summary = json.dumps(receipt, sort_keys=True, separators=(',', ':')).encode()
        if len(summary) > 8192:
            fail('OUTER_SUMMARY_CAP')
        summary_fd = new_file(SCRATCH / 'outer.json')
        try:
            at = 0
            while at < len(summary):
                wrote = os.write(summary_fd, summary[at:])
                if wrote < 1:
                    fail('OUTER_SUMMARY_WRITE')
                at += wrote
            os.fsync(summary_fd)
        finally:
            os.close(summary_fd)
    public_fields = ('kind', 'nodeExit', 'error', 'nodePGAbsent', 'chromePGAbsent',
                     'controlRegularFdClosed', 'controlIsPipe', 'controlEofObserved',
                     'purePassed', 'uiCompleted', 'finishedSeen', 'innerFinishedSuccess',
                     'outerPhase', 'outerDeadlineExceeded', 'pureCount', 'nodePGState', 'chromePGState', 'stdoutEof', 'stderrEof',
                     'stdoutClosed', 'stderrClosed', 'forced', 'outputBytes', 'controlFrames',
                     'ownershipMirrorValidated', 'chromeRecoveryClosed', 'uiRootCreated',
                     'nativeSyncHooks', 'loaderThreads', 'transformServices', 'stages', 'faults', 'outerSignals', 'fatalPrefixes')
    print(json.dumps({key: receipt[key] for key in public_fields}, separators=(',', ':')))
    return 0 if receipt['kind'] == 'normal' and receipt['controlRegularFdClosed'] else 1


if __name__ == '__main__':
    if sys.argv[1:] != ['--run']:
        raise SystemExit('Only the separately authorized --run invocation is supported.')
    raise SystemExit(run())
