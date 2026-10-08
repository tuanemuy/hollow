import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { createServer, request, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { DriveRequestFactory } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/adapters/node/drive/http.ts";
import type { Mail } from "/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02/source/packages/core/src/application/ports/mailer.ts";
import type { ResponseSpec } from "./browser.mts";

export type ProviderStage = "initial" | "trashed" | "restored" | "missing" | "held" | "failed-relink" | "successful-relink" | "create" | "retarget" | "lifecycle";
export const folderOne = "UI_F1";
export const folderTwo = "UI_F2";
const scope = "openid email https://www.googleapis.com/auth/drive.file";
const json = (value: unknown) => JSON.stringify(value);
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
function assert(ok: unknown, code: string): asserts ok { if (!ok) throw Error(code); }

export function createProviderFixture(input: { origin: string; onServer(server: Server): void; note(code: string, value?: number | boolean): void;onFailure(code:string):void }) {
  let stage: ProviderStage = "initial";
  let requests = 0, responseBytes = 0, concurrent = 0, generateFolder = 0, generateFile = 0, createPosts = 0, starts = 0, chunks = 0, auth = 0;
  let created = false, backup: Record<string, unknown> | null = null, creationProperties:Record<string,unknown>={};
  let heldClosed = false, heldSeen = false;
  const authCodes = new Map<string, { nonce: string; failed: boolean }>();
  const sockets = new Set<import("node:net").Socket>();
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = pair.publicKey.export({ format: "pem", type: "spki" }).toString();
  const credential = randomBytes(24).toString("base64url");
  const aes = randomBytes(32);
  let mail: Mail | null = null;
  let base: URL | null = null;
  let server: Server | null = null;
  const folder = (id: string, trashed = false) => ({ id, name: id === folderOne ? "F1" : "F2", mimeType: "application/vnd.google-apps.folder", trashed, explicitlyTrashed: trashed, parents: ["root"], capabilities: { canAddChildren: true }, appProperties: id === folderTwo && backup === null ? { hollowDriveFolder: "" } : {} });
  const respond = (res: ServerResponse, status: number, value: unknown, headers: Record<string,string> = {}) => {
    const data = json(value); responseBytes += Buffer.byteLength(data); assert(responseBytes <= 12 * 1024 * 1024, "PROVIDER_BYTES");
    res.writeHead(status, { "Content-Type": "application/json", ...headers }); res.end(data);
  };
  async function route(req: IncomingMessage, res: ServerResponse) {
    assert(++requests <= 80 && ++concurrent <= 2, "PROVIDER_COUNT");
    res.once("close", () => concurrent--);
    const original = req.headers["x-ui-original"];
    assert(typeof original === "string", "PROVIDER_ORIGINAL");
    const url = new URL(original); assert(url.protocol === "https:", "PROVIDER_PROTOCOL");
    const pieces: Buffer[] = []; let bytes = 0;
    for await (const chunk of req) { const value = Buffer.from(chunk); bytes += value.length; assert(bytes <= 16_384, "PROVIDER_BODY"); pieces.push(value); }
    const body = Buffer.concat(pieces);
    if (url.hostname === "oauth2.googleapis.com" && url.pathname === "/token" && req.method === "POST") {
      const form = new URLSearchParams(body.toString()); const saved = authCodes.get(form.get("code") ?? "");
      assert(form.get("grant_type") === "authorization_code" && saved, "TOKEN_INPUT");
      authCodes.delete(form.get("code") ?? "");
      if (saved.failed) return respond(res, 400, { error: "invalid_grant" });
      const encode = (v: unknown) => Buffer.from(json(v)).toString("base64url"); const now = Math.floor(Date.now()/1000);
      const unsigned = `${encode({alg:"RS256",kid:"ui",typ:"JWT"})}.${encode({iss:"https://accounts.google.com",aud:"ui-client",sub:"ui-subject",email:"drive@example.invalid",email_verified:true,nonce:saved.nonce,iat:now,exp:now+3600})}`;
      return respond(res, 200, { access_token: credential, refresh_token: credential, expires_in: 3600, token_type: "Bearer", scope, id_token: `${unsigned}.${sign("RSA-SHA256",Buffer.from(unsigned),pair.privateKey).toString("base64url")}` });
    }
    if (url.hostname === "www.googleapis.com" && url.pathname === "/oauth2/v1/certs" && req.method === "GET") return respond(res, 200, { ui: pem }, {"Cache-Control":"max-age=3600"});
    assert(url.hostname === "www.googleapis.com", "PROVIDER_HOST");
    assert(req.headers.authorization === `Bearer ${credential}`, "PROVIDER_BEARER");
    if (url.pathname === "/drive/v3/files/generateIds" && req.method === "GET") {
      assert(url.searchParams.get("count")==="1" && url.searchParams.get("space")==="drive" && url.searchParams.get("type")==="files" && url.searchParams.get("fields")==="ids", "GENERATE_QUERY");
      if(stage === "create") { assert(++generateFolder === 1,"FOLDER_ALLOCATION"); return respond(res,200,{ids:[folderTwo]}); }
      assert(stage === "retarget" && ++generateFile === 1,"FILE_ALLOCATION"); return respond(res,200,{ids:["UI_BACKUP_FILE"]});
    }
    if (url.pathname === "/drive/v3/files" && req.method === "POST") {
      assert(stage === "create" && ++createPosts <= 2,"CREATE_COUNT"); const data:unknown=JSON.parse(body.toString()); assert(record(data)&&data.id===folderTwo,"CREATE_ID");
      assert(record(data.appProperties),"CREATE_MARKER"); creationProperties=data.appProperties;
      if(createPosts === 1) { req.socket.destroy(); return; }
      created=true; return respond(res,200,{id:folderTwo});
    }
    if (url.pathname.startsWith("/drive/v3/files/") && req.method === "GET") {
      const id = decodeURIComponent(url.pathname.slice("/drive/v3/files/".length));
      assert(url.searchParams.get("supportsAllDrives")==="true" && url.searchParams.has("fields"),"INSPECT_QUERY");
      if(id===folderOne) {
        if(stage === "held" || stage === "failed-relink" || stage === "successful-relink") { heldSeen=true; req.socket.once("close",()=>{heldClosed=true;input.note("held-socket-closed",true);}); return; }
        if(stage === "missing") return respond(res,404,{error:{code:404}});
        return respond(res,200,folder(id,stage === "trashed"));
      }
      if(id===folderTwo) {
        if(!created) return respond(res,404,{error:{code:404}});
        return respond(res,200,{...folder(id),appProperties:creationProperties});
      }
      assert(id==="UI_BACKUP_FILE" && backup,"INSPECT_FILE"); return respond(res,200,backup);
    }
    if (url.pathname === "/upload/drive/v3/files" && req.method === "POST") {
      assert(stage==="retarget" && ++starts===1,"UPLOAD_START");const v:unknown=JSON.parse(body.toString());assert(record(v)&&v.id==="UI_BACKUP_FILE"&&Array.isArray(v.parents)&&v.parents[0]===folderTwo,"UPLOAD_TARGET");backup={...v};
      return respond(res,200,{}, {Location:"https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=UI_SESSION"});
    }
    if(url.pathname === "/upload/drive/v3/files" && req.method === "PUT") {
      assert(url.searchParams.get("upload_id")==="UI_SESSION"&&backup,"UPLOAD_SESSION");
      if(body.length===0) return respond(res,308,{},chunks?{Range:"bytes=0-1023"}:{});
      assert(++chunks===1 && body.length===1024 && req.headers["content-range"]==="bytes 0-1023/1024","UPLOAD_CHUNK");
      backup={...backup,size:"1024",sha256Checksum:createHash("sha256").update(body).digest("hex"),trashed:false,explicitlyTrashed:false,webViewLink:"https://drive.google.com/file/d/UI_BACKUP_FILE/view"};
      return respond(res,200,backup);
    }
    throw Error("PROVIDER_ENDPOINT");
  }
  return {
    aes,
    picker: {appId:"1",apiKey:"ui-picker"},
    setStage(next: ProviderStage) {stage=next;input.note(`stage-${next}`,true);},
    state() {return {requests,generateFolder,generateFile,createPosts,starts,chunks,heldClosed,heldSeen};},
    async start() {
      assert(server===null,"PROVIDER_BOOT_ONCE");server=createServer((req,res)=>{void route(req,res).catch(()=>{input.note("provider-fault",true);input.onFailure("UI_PROVIDER_ROUTE_FAILED");res.destroy();});});
      server.on("connection",socket=>{sockets.add(socket);socket.once("close",()=>sockets.delete(socket));});input.onServer(server);
      await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve)); const a=server.address() as AddressInfo;base=new URL(`http://127.0.0.1:${a.port}`);
    },
    factory: ((url,options,reply) => {
      assert(base,"PROVIDER_NOT_STARTED");assert(url.protocol==="https:"&&["oauth2.googleapis.com","www.googleapis.com"].includes(url.hostname),"PROVIDER_ALLOWLIST");
      const headers={...options.headers,"x-ui-original":url.href};
      return request(new URL("/relay",base), {...options,protocol:"http:",hostname:base.hostname,port:base.port,path:"/relay",headers},reply);
    }) satisfies DriveRequestFactory,
    async browserRespond(urlString: string,method: string): Promise<ResponseSpec|null> {
      const u=new URL(urlString);
      if(u.origin==="https://accounts.google.com" && u.pathname==="/o/oauth2/v2/auth" && method==="GET") {
        assert(++auth<=3,"AUTH_COUNT");const nonce=u.searchParams.get("nonce"),state=u.searchParams.get("state");assert(nonce&&state,"AUTH_DOCUMENT");
        const code=`ui_code_${auth}`;authCodes.set(code,{nonce,failed:stage==="failed-relink"});const callback=new URL("/auth/drive/callback",input.origin);callback.searchParams.set("state",state);callback.searchParams.set("code",code);
        return {status:200,contentType:"text/html",body:`<!doctype html><a id="consent" href="${callback.href.replaceAll("&","&amp;")}">Fixture Google同意</a>`};
      }
      if(u.origin==="https://apis.google.com" && u.pathname==="/js/api.js" && method==="GET") return {status:200,contentType:"application/javascript",body:pickerScript};
      if(u.origin==="https://docs.google.com" && u.pathname==="/picker" && method==="GET") return {status:200,contentType:"text/html",body:`<!doctype html><button onclick="parent.postMessage({uiPicker:true,id:'${folderOne}'},'*')">F1を選択</button>`};
      return null;
    },
    mailer: {async send(value: Mail) {assert(mail===null,"MAIL_COUNT");mail=value;}},
    verificationUrl() {assert(mail,"MAIL_MISSING");const match=mail.text.match(/https?:\/\/[^\s]+/);assert(match,"MAIL_LINK");return new URL(match[0]);},
    async close() {assert(server,"PROVIDER_MISSING");await new Promise<void>((resolve,reject)=>server!.close(e=>e?reject(e):resolve()));assert(sockets.size===0,"PROVIDER_SOCKET_HELD");aes.fill(0);authCodes.clear();mail=null;},
  };
}
const pickerScript = `(()=>{let cb=null,frame=null;class View{setIncludeFolders(){return this}setSelectFolderEnabled(){return this}setEnableDrives(){return this}setMimeTypes(){return this}}class Builder{setDeveloperKey(){return this}setAppId(){return this}setOAuthToken(){return this}addView(){return this}setCallback(x){cb=x;window.__uiLatePicker=x;return this}build(){return{setVisible(){frame=document.createElement('iframe');frame.src='https://docs.google.com/picker';frame.title='Fixture Google Picker';document.body.append(frame)},dispose(){frame?.remove();frame=null}}}}window.addEventListener('message',e=>{if(e.origin==='https://docs.google.com'&&e.data?.uiPicker)cb?.({action:'picked',docs:[{id:e.data.id}]})});window.gapi={load(n,o){if(n!=='picker')throw Error('SDK_SCOPE');o.callback()}};window.google={picker:{DocsView:View,PickerBuilder:Builder,Action:{PICKED:'picked',CANCEL:'cancel'}}}})();`;
