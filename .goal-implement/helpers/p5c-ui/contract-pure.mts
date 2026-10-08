import assert from "node:assert/strict";
import { createErrorBridge, bridgeProvider, bridgeProtector, type BusinessClass, type Business } from "./boot.mts";
import { classifyRegularDatabase, isOwnedChromeVersionLink, classifyGuardContext } from "./stop-audit.mts";
import { BusinessRuleError } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/domain/error.ts";
import { DriveTransportError } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/execution.ts";

export async function runPureContract(built:BusinessClass) {
  const deadline=performance.now()+30_000;const conditions:Record<string,true>={};
  const done=(name:string)=>{assert(performance.now()<deadline);conditions[name]=true;assert(Object.keys(conditions).length<=24);};
  const bridge=createErrorBridge(built);const source=BusinessRuleError<string>;const signal=new AbortController().signal;
  const owned=new built('DRIVE_UNAVAILABLE','pure');const projected=bridge.toSource(owned);assert(projected instanceof source);assert.equal(projected.code,owned.code);assert.equal(bridge.toBuilt(projected),owned);done('built_to_source_exact_roundtrip');
  await assert.rejects(bridge.work(()=>{throw owned;})(signal),e=>e===projected);done('work_sync_before_classifier');
  await assert.rejects(bridge.work(async()=>{throw owned;})(signal),e=>e===projected);done('work_async_before_classifier');
  for(const code of ['DRIVE_BACKUP_QUOTA','DRIVE_BACKUP_FOLDER_TRASHED']) {
    const refusal=new source(code,'pure');const mapped=bridge.toBuilt(refusal);assert(mapped instanceof built);assert.equal(mapped.code,code);
    await assert.rejects(bridge.port(()=>{throw refusal;}),e=>e===mapped);await assert.rejects(bridge.port(async()=>{throw refusal;}),e=>e===mapped);done('provider_sync_async_'+code);
  }
  const protectorError=new source('DRIVE_UNAVAILABLE','pure');const protector=bridgeProtector({available:()=>true,protect(){throw protectorError;},reveal(){throw protectorError;}},bridge);assert.throws(()=>protector.protect("pure",{purpose:"resource-key",accountId:"pure",subject:"pure",epoch:1,fileId:"pure"}),e=>e instanceof built);done('protector_sync');
  const refuse=()=>{throw new source('DRIVE_BACKUP_QUOTA','pure');};const provider=bridgeProvider({allocateFileId:refuse,startResumable:refuse,queryReceived:refuse,uploadChunk:refuse,inspectFile:refuse},bridge);await assert.rejects(provider.allocateFileId({accessToken:'pure',signal}),e=>e instanceof built&&e.code==='DRIVE_BACKUP_QUOTA');done('actual_provider_facade');
  const folderError=new built('DRIVE_FOLDER_TRASHED','pure');await assert.rejects(bridge.work(async()=>{throw folderError;})(signal),e=>e instanceof source&&e.code==='DRIVE_FOLDER_TRASHED');done('work_folder_classifier_class');
  const unknown=new Error('pure');assert.equal(bridge.toSource(unknown),unknown);assert.equal(bridge.toBuilt(unknown),unknown);await assert.rejects(bridge.work(async()=>{throw unknown;})(signal),e=>e===unknown);done('unknown_same_object');
  const transport=new DriveTransportError('DRIVE_PROVIDER_REJECTED','unknown','access-token');assert.equal(bridge.toSource(transport),transport);assert.equal(bridge.toBuilt(transport),transport);assert.equal(transport.delivery,'unknown');assert.equal(transport.credentialRejection,'access-token');done('native_transport_unchanged');
  const unproven=Object.assign(new Error('pure'),{code:'DRIVE_BACKUP_OWNERSHIP_UNKNOWN',owner:{kind:'drive-backup',id:'pure'}});assert.equal(bridge.toSource(unproven),unproven);assert.equal(bridge.toBuilt(unproven),unproven);await assert.rejects(bridge.port(async()=>{throw unproven;}),e=>e===unproven);done('unproven_nonconversion_no_private_brand_forge');
  const plain={name:'BusinessRuleError',code:'DRIVE_UNAVAILABLE',retryable:false,toSerialized(){return {kind:'business',code:this.code,message:'pure',retryable:false};}};assert.equal(bridge.toBuilt(plain),plain);done('plain_nonconversion');
  const badCode=new built('NOT_A_DRIVE_CODE','pure');assert.equal(bridge.toSource(badCode),badCode);done('unknown_code_nonconversion');
  const tampered=new built('DRIVE_UNAVAILABLE','pure');Object.defineProperty(tampered,'toSerialized',{value:()=>({kind:'business',code:'DRIVE_UNAVAILABLE',message:'pure',retryable:false})});assert.equal(bridge.toSource(tampered),tampered);done('serializer_override_nonconversion');
  class Derived extends source {};const derived=new Derived('DRIVE_UNAVAILABLE','pure');assert.equal(bridge.toBuilt(derived),derived);done('subclass_nonconversion');
  const ownKind=new built('DRIVE_UNAVAILABLE','pure');Object.defineProperty(ownKind,'retryable',{value:true});assert.equal(bridge.toSource(ownKind),ownKind);done('retryable_nonconversion');
  const ownMessage=new built('DRIVE_UNAVAILABLE','pure');Object.defineProperty(ownMessage,'message',{get(){return 'pure';}});assert.equal(bridge.toSource(ownMessage),ownMessage);done('accessor_nonconversion');
  const value={opaque:true};const buffer=new Uint8Array([1]);assert.equal(await bridge.work(async()=>value)(signal),value);assert.equal(await bridge.port(async()=>buffer),buffer);assert.equal(bridge.sync(()=>value),value);done('success_value_buffer_identity');
  const closed=Promise.resolve();const proof={opaque:true};const ack=Promise.resolve(proof);assert.equal(bridge.sync(()=>closed),closed);assert.equal(bridge.sync(()=>ack),ack);assert.equal(await bridge.port(()=>ack),proof);done('closed_ACK_values_nonconversion');
  const rejectClosed=Promise.reject(unknown);await assert.rejects(rejectClosed,e=>e===unknown);assert.equal(bridge.sync(()=>rejectClosed),rejectClosed);done('closed_rejection_identity');
  const businessResult:Business=new built('DRIVE_UNAVAILABLE','pure');const body=businessResult.toSerialized();assert.equal(typeof body,'object');done('built_constructor_contract');
  const root='/pure-ui',profile=root+'/chrome/profile';
  for(const name of ['active','opaque','audit'])for(const suffix of ['','-wal','-shm','-journal'])assert.deepEqual(classifyRegularDatabase(root,root+'/'+name+'.db'+suffix,profile),{kind:'app-database',name});
  for(const relative of ['unknown.db','active.sqlite','node-tmp/active.db','objects/audit.db-shm','chrome/active.db'])assert.equal(classifyRegularDatabase(root,root+'/'+relative,profile).kind,'unknown-database');
  done('database_exact_app_and_unknown_outside_profile');
  for(const extension of ['db','sqlite','sqlite3'])for(const suffix of ['','-wal','-shm','-journal']){
    const file=profile+'/Default/storage.'+extension+suffix;
    assert.equal(classifyRegularDatabase(root,file,profile).kind,'owned-chrome-profile');assert.equal(classifyRegularDatabase(root,file,null).kind,'unknown-database');
    assert.equal(classifyRegularDatabase(root,root+'/chrome/profile-other/Default/storage.'+extension+suffix,profile).kind,'unknown-database');
  }
  const metadata={root,ownedProfile:profile,filename:profile+'/RunningChromeVersion',currentChrome:true,symlink:true,uid:42,ownerUid:42,nlink:1,bytes:15,target:'154.0.8037.98:1'};
  assert.equal(isOwnedChromeVersionLink(metadata),true);
  for(const change of [{filename:root+'/RunningChromeVersion'},{filename:profile+'/Default/RunningChromeVersion'},{filename:profile+'-other/RunningChromeVersion'},{filename:profile+'/../RunningChromeVersion'},{ownedProfile:null},{currentChrome:false},{symlink:false},{uid:43},{nlink:2},{target:'154.0.8037.98:2'},{target:'154.0.8037.98:0'},{target:'154.0.8037.93:1'},{bytes:33}])assert.equal(isOwnedChromeVersionLink({...metadata,...change}),false);
  assert.deepEqual(classifyGuardContext(root,root+'/chrome',profile,metadata.filename,'symlink'),{location:'owned-chrome-profile',type:'symlink',knownMetadataName:true});
  assert.deepEqual(classifyGuardContext(root,root+'/chrome',profile,root+'/chrome/other-link','symlink'),{location:'chrome-tmp',type:'symlink',knownMetadataName:false});
  assert.deepEqual(classifyGuardContext(root,root+'/chrome',profile,root+'/objects/socket','socket'),{location:'objects',type:'socket',knownMetadataName:false});
  assert.deepEqual(classifyGuardContext(root,root+'/chrome',profile,root+'/../RunningChromeVersion','other'),{location:'unknown',type:'other',knownMetadataName:false});
  done('database_owned_profile_requires_exact_boundary');
  for(const file of ['/pure-ui-other/active.db',root+'/../active.db',profile+'/../storage.db',root+'/chrome/profile/../../active.db','pure-ui/active.db'])assert.equal(classifyRegularDatabase(root,file,profile).kind,'unknown-database');
  for(const candidate of ['/pure-ui-other/chrome/profile',root+'/chrome/profile/../profile','chrome/profile'])assert.equal(classifyRegularDatabase(root,profile+'/Default/storage.db',candidate).kind,'unknown-database');
  assert.equal(classifyRegularDatabase(root,root+'/objects/document.txt',profile).kind,'other');done('database_escape_and_prefix_spoof_rejected');
  assert(Object.keys(conditions).length<=24);return {conditions,count:Object.keys(conditions).length,deadlineMs:30_000,filesystem:0,db:0,nativeWorker:0,sockets:0};
}
