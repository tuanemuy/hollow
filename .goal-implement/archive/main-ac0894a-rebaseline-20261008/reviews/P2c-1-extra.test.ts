import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signUp } from "@repo/core/application/account/signUp";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { runImportJob } from "@repo/core/application/import/processJob";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { getAsset } from "@repo/core/application/asset/access";
import { collectMediaGarbage } from "@repo/core/application/asset/collectGarbage";
import { renderNote } from "@repo/core/application/asset/references";
import {
  acceptMediaUpload,
  beginMediaUpload,
  createMediaDraft,
} from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { commitNote } from "@repo/core/application/note/commitNote";
import { getNote } from "@repo/core/application/note/getNote";
import {
  listRevisions,
  renderRevision,
  restoreRevision,
} from "@repo/core/application/note/history";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import {
  controlReference,
  readReferences,
} from "@repo/core/application/reference/read";
import {
  historyAssetUrl,
  parseAssetUrl,
  parseHistoryAssetUrl,
} from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { editNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mediaHttp } from "/Users/hikaru/github.com/tuanemuy/hollow/apps/web/app/presentation/mediaHttp.node";
import { guardResourceRequest } from "/Users/hikaru/github.com/tuanemuy/hollow/apps/web/app/presentation/resourceRequestGuard.node";
import {
  detectFormat,
  IsolatedDocumentExtractor,
  withParserAdmission,
} from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/inlineMediaProcessor";
import { FileObjectStorage } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/objectStorage";
import { NodeReferenceProcessor } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/reference/referenceProcessor";
import { createTestContainer, type TestContainer } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/libsql/__tests__/helpers";

const bytes = (text: string) => new TextEncoder().encode(text);
const stream = (data: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(data);
      c.close();
    },
  });
describe("immutable note history and retention scopes", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let dir: string;
  let now: Date;
  let token: string;
  let other: string;
  let resources: Map<string, Uint8Array>;
  let fetched: string[];
  let storage: FileObjectStorage;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-revision-test-"));
    storage = new FileObjectStorage(dir);
    now = new Date("2026-09-06T00:00:00Z");
    resources = new Map();
    fetched = [];
    const mails: string[] = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
      inlineMedia: new IsolatedInlineMediaProcessor(),
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
      referencing: {
        processor: new NodeReferenceProcessor(),
        fetcher: {
          async inspect(url) {
            return { url, allowed: true, reason: null };
          },
          async inspectMany(urls) {
            return urls.map((url) => ({ url, allowed: true, reason: null }));
          },
          async fetch(url) {
            fetched.push(url);
            const input = resources.get(url);
            if (!input)
              throw new BusinessRuleError("REFERENCE_FETCH", "test missing");
            return {
              body: stream(input),
              finalUrl: url,
              contentType: "application/octet-stream",
            };
          },
        },
        wake() {},
      },
    };
    async function user(email: string) {
      const registered = await signUp(container, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const session = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        registered.browserToken,
      );
      if (!session) throw Error("session");
      return session.token;
    }
    token = await user("revision-a@example.test");
    other = await user("revision-b@example.test");
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  async function run() {
    const job = await container.unitOfWorkProvider.run((c) =>
      c.references.claim(
        now,
        container.tokens.generate(),
        new Date(now.getTime() + 60_000),
      ),
    );
    if (!job || job.state !== "running") throw Error("job");
    await runReferenceJob(container, job, new AbortController().signal);
    return job;
  }
  async function mediaNote() {
    const data = await readFile(
      new URL(
        "file:///Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    const draft = await createMediaDraft(container, token);
    const upload = await beginMediaUpload(container, token, {
      draftId: draft.id,
      name: "photo.png",
      bytes: data.length,
    });
    const accepted = await acceptMediaUpload(
      container,
      token,
      upload.uploadId,
      stream(data),
    );
    const saved = (
      await saveNote(container, token, {
        title: "media",
        html: `<p>old</p><img src="${accepted.asset.url}" alt="photo">`,
        draftId: draft.id,
      })
    ).note;
    const url = container.htmlSanitizer.assetUrls(saved.html)[0];
    const ref = parseAssetUrl(url ?? "");
    if (!ref) throw Error("ref");
    return { saved, ref, data, url: url ?? "" };
  }

  it("independent: exact rollback after actual pruning and pin removal", async () => {
    const {saved,ref}=await mediaNote();
    for(let i=1;i<20;i++) await saveNote(container,token,{id:saved.id,title:"step"+i,html:"<p>no asset</p>"});
    const tables=["notes","note_revisions","note_revision_heads","note_asset_references","assets","reference_entries","reference_settings","reference_jobs"];
    async function snapshot(){const out:any={};for(const t of tables)out[t]=(await base.client.execute("SELECT * FROM "+t+" ORDER BY rowid")).rows;return out;}
    const before=await snapshot();
    await expect(container.unitOfWorkProvider.run(async c=>{
      const previous=(await c.notes.findById(saved.id))!;
      const remove=c.assets.removeRevisionPins.bind(c.assets);
      c.assets.removeRevisionPins=async (...args)=>{await remove(...args);throw new BusinessRuleError("INDEPENDENT_INJECTED","independent-after-prune");};
      await commitNote(container,c,{previous,note:editNote(previous,"will roll back","<p>other</p>",now),actor:{kind:"system"},cause:"reference"});
    })).rejects.toThrow("independent-after-prune");
    expect(await snapshot()).toEqual(before);
    expect(await getAsset(container,token,{scope:"history",scopeId:saved.id,revisionNo:1,assetId:ref.assetId})).toMatchObject({state:"ready",unreferencedAt:null});
  });
  it("independent: history survives eight days, restore wins GC, next last pin gets a fresh clock",async()=>{
    const {saved,ref}=await mediaNote();
    let current=(await saveNote(container,token,{id:saved.id,title:"removed",html:"<p>removed</p>"})).note;
    now=new Date(now.getTime()+8*86400000);
    await collectMediaGarbage(container);
    const restored=await restoreRevision(container,token,{noteId:saved.id,revisionNo:1,expectedVersion:current.version});
    await collectMediaGarbage(container);
    expect((await getAsset(container,token,ref)).state).toBe("ready");
    expect(restored.html).toBe(saved.html);
    const held=await container.unitOfWorkProvider.run(c=>c.assets.find(ref.assetId));
    expect(held?.unreferencedAt).toBeNull();
    for(let i=0;i<20;i++)current=(await saveNote(container,token,{id:saved.id,title:"drop"+i,html:"<p>drop</p>"})).note;
    expect((await container.unitOfWorkProvider.run(c=>c.assets.find(ref.assetId)))?.unreferencedAt).toEqual(now);
    await expect(getAsset(container,token,{scope:"history",scopeId:saved.id,revisionNo:1,assetId:ref.assetId})).rejects.toMatchObject({code:"ASSET_NOT_FOUND"});
    await expect(restoreRevision(container,token,{noteId:saved.id,revisionNo:1,expectedVersion:current.version})).rejects.toMatchObject({code:"REVISION_NOT_FOUND"});
  });
  it("independent: all history method denial pairs precede Range validation and storage I/O",async()=>{
    const {saved,ref}=await mediaNote();
    await saveNote(container,token,{id:saved.id,title:"removed",html:"<p>removed</p>"});
    const own=(await saveNote(container,token,{title:"other own",html:"<p>other</p>"})).note;
    const basePath=historyAssetUrl({scope:"history",scopeId:saved.id,revisionNo:1,assetId:ref.assetId});
    const stat=vi.spyOn(storage,"stat");
    for(const method of ["GET","HEAD"]){
      for(const [path,auth] of [[basePath,other],[basePath,null],[basePath.replace(saved.id,own.id),token],[basePath.replace("/revisions/1/","/revisions/2/"),token]]){
        stat.mockClear();
        const response=await mediaHttp(new Request("http://localhost:3000"+path,{method,headers:{...(auth?{cookie:"hollow_session="+auth}:{}),range:"bytes=999999999-"}}),container);
        expect(response?.status).toBe(auth===null?401:404);
        expect(response?.headers.get("Content-Range")).toBeNull();
        expect(stat).not.toHaveBeenCalled();
      }
      for(const [range,status] of [["bytes=0-3",206],["bytes=999999999-",416]]){
        const response=await mediaHttp(new Request("http://localhost:3000"+basePath,{method,headers:{cookie:"hollow_session="+token,range}}),container);
        expect(response?.status).toBe(status);
        if(method==="HEAD")expect(await response?.text()).toBe("");
      }
    }
  });
  it("independent: metadata user priority is not a human content mutation",async()=>{
    const n=(await saveNote(container,token,{title:"same",html:"<p>same</p>"})).note;
    const before=await container.unitOfWorkProvider.run(c=>c.revisions.head(n.id));
    const chosen=await setDisplayStyle(container,token,{id:n.id,style:"default"});
    const after=await container.unitOfWorkProvider.run(c=>c.revisions.head(n.id));
    expect(after?.currentNo).toBe(1);expect(after?.actors).toEqual(before?.actors);
    expect(chosen.display).toMatchObject({style:"default",source:"user",initialization:{kind:"complete"}});
    const changed=await setDisplayStyle(container,token,{id:n.id,style:"original"});
    expect((await listRevisions(container,token,n.id)).currentRevisionNo).toBe(2);
    const current=await container.unitOfWorkProvider.run(c=>c.revisions.head(n.id));
    expect(current?.actors[0]?.version).toBe(changed.version);
    await expect(restoreRevision(container,token,{noteId:n.id,revisionNo:2,expectedVersion:changed.version})).rejects.toMatchObject({code:"REVISION_UNCHANGED"});
  });
  it("independent: same URL CSS restores twice with empty stylesheet normal pair and no reacquisition",async()=>{
    const url="https://public.example/independent.css";
    resources.set(url,bytes("/* valid empty */"));
    const n=(await saveNote(container,token,{title:"empty",html:'<link rel="stylesheet" href="'+url+'"><p>empty</p>'})).note;
    await run();
    const empty=await getNote(container,token,n.id),selected=(await listRevisions(container,token,n.id)).currentRevisionNo;
    await saveNote(container,token,{id:n.id,title:"remove",html:"<p>removed</p>"});
    resources.set(url,bytes("p{color:red}"));
    await saveNote(container,token,{id:n.id,title:"red",html:'<link rel="stylesheet" href="'+url+'"><p>red</p>'});
    await run();
    const red=await getNote(container,token,n.id),calls=fetched.length;
    const restored=await restoreRevision(container,token,{noteId:n.id,revisionNo:selected,expectedVersion:red.version});
    expect(restored.html).toBe(empty.html);
    expect((await readReferences(container,token,n.id)).job).toBeNull();
    expect(fetched.length).toBe(calls);
    await saveNote(container,token,{id:n.id,title:restored.title,html:restored.html});
    expect((await readReferences(container,token,n.id)).job).toBeNull();
    expect((await listRevisions(container,token,n.id)).currentRevisionNo).toBe(6);
  });
  it("independent: processing rejects restore, real conversion combines content and initial style in one revision, baseline restore never revives pending",async()=>{
    const input=bytes('<style>p{color:blue}</style><p>independent conversion</p>');
    const batch=await beginUpload(container,token,{files:[{name:"independent.html",bytes:input.length}],useAi:false});
    const accepted=await acceptUpload(container,token,batch.files[0]!.id,stream(input));
    const id=accepted.noteId!;
    expect((await listRevisions(container,token,id)).processing).toBe(true);
    await expect(restoreRevision(container,token,{noteId:id,revisionNo:1,expectedVersion:0})).rejects.toMatchObject({code:"NOTE_PROCESSING"});
    expect((await listRevisions(container,token,id)).items).toHaveLength(1);
    const job=await container.unitOfWorkProvider.run(c=>c.jobs.claim(now,container.tokens.generate(),new Date(now.getTime()+90000)));
    if(!job)throw Error("missing independent conversion");
    await runImportJob(container,job);
    const ready=await getNote(container,token,id);
    expect(ready.html).toContain("independent conversion");expect(ready.display.style).toBe("original");
    const history=await listRevisions(container,token,id);expect(history.items).toHaveLength(2);expect(history.items[0]).toMatchObject({actorKind:"system",cause:"import"});
    const restored=await restoreRevision(container,token,{noteId:id,revisionNo:1,expectedVersion:ready.version});
    expect(restored.html).toBe("");expect(restored.display).toMatchObject({style:"default",source:"user",initialization:{kind:"complete"}});
    expect((await getNote(container,token,id)).status).toBe("ready");
    expect((await listRevisions(container,token,id)).items).toHaveLength(3);
    expect((await readReferences(container,token,id)).job).toBeNull();
  });
  it("independent: current authority is rechecked after restore DNS, without appending history",async()=>{
    const n=(await saveNote(container,token,{title:"old background",html:'<p style="background:url(https://public.example/old.png)">old</p>'})).note;
    const current=(await saveNote(container,token,{id:n.id,title:"new",html:"<p>new</p>"})).note;
    const account=(await base.client.execute("SELECT id FROM accounts WHERE email='revision-b@example.test'")).rows[0]!.id;
    const before=(await base.client.execute("SELECT * FROM note_revisions ORDER BY rowid")).rows;
    vi.spyOn(container.referencing!.fetcher,"inspectMany").mockImplementationOnce(async urls=>{
      await base.client.execute({sql:"UPDATE notes SET owner_account_id=? WHERE id=?",args:[account!,n.id]});
      return urls.map(url=>({url,allowed:true,reason:null}));
    });
    await expect(restoreRevision(container,token,{noteId:n.id,revisionNo:1,expectedVersion:current.version})).rejects.toMatchObject({code:"NOTE_NOT_FOUND"});
    expect((await base.client.execute("SELECT * FROM note_revisions ORDER BY rowid")).rows).toEqual(before);
    expect((await getNote(container,other,n.id)).html).toBe(current.html);
  });
  it("independent: missing revision after inspection is not restored and metadata-less history rendering retains internal image",async()=>{
    const {saved,ref}=await mediaNote();
    const shown=await renderRevision(container,token,{noteId:saved.id,revisionNo:1,externalReading:false});
    expect(shown.assetUrls).toContain(historyAssetUrl({scope:"history",scopeId:saved.id,revisionNo:1,assetId:ref.assetId}));
    expect(shown.externalSources).toEqual({images:[],media:[],backgrounds:[],fonts:[]});
    const url="https://public.example/bg.png";
    const n=(await saveNote(container,token,{title:"first",html:'<p style="background:url('+url+')">first</p>'})).note;
    const current=(await saveNote(container,token,{id:n.id,title:"latest",html:"<p>latest</p>"})).note;
    vi.spyOn(container.referencing!.fetcher,"inspectMany").mockImplementationOnce(async urls=>{
      await base.client.execute({sql:"DELETE FROM note_revisions WHERE note_id=? AND revision_no=1",args:[n.id]});
      return urls.map(url=>({url,allowed:true,reason:null}));
    });
    await expect(restoreRevision(container,token,{noteId:n.id,revisionNo:1,expectedVersion:current.version})).rejects.toMatchObject({code:"REVISION_NOT_FOUND"});
    expect((await getNote(container,token,n.id)).html).toBe(current.html);
    expect((await listRevisions(container,token,n.id)).items).toHaveLength(1);
  });
  it("independent: safe and hostile inline SVG are rechecked without rewriting immutable snapshot",async()=>{
    for(const tail of ['<rect width="8" height="8" fill="blue"/>','<script>window.__historyProbe=1</script><rect onload="window.__historyProbe=2" width="8" height="8"/>']){
      const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">'+tail+'</svg>';
      const uri="data:image/svg+xml;base64,"+Buffer.from(svg).toString("base64");
      const n=(await saveNote(container,token,{title:"inline independent",html:'<img src="'+uri+'">'})).note;
      const original=await container.unitOfWorkProvider.run(c=>c.revisions.find(n.id,1));
      const current=(await saveNote(container,token,{id:n.id,title:"removed",html:"<p>removed</p>"})).note;
      const preview=await renderRevision(container,token,{noteId:n.id,revisionNo:1});
      const safe=preview.assetUrls.find(u=>u.startsWith("data:"))!;
      const decoded=Buffer.from(safe.split(",")[1]!,"base64").toString();
      expect(decoded).toContain("<svg");expect(decoded).not.toMatch(/<script|onload|__historyProbe/);
      if(tail.includes("script"))expect(preview.removed.length).toBeGreaterThan(0);
      expect(await container.unitOfWorkProvider.run(c=>c.revisions.find(n.id,1))).toEqual(original);
      const restored=await restoreRevision(container,token,{noteId:n.id,revisionNo:1,expectedVersion:current.version});
      expect(restored.html).toContain(safe);
      expect((await readReferences(container,token,n.id)).job).toBeNull();
    }
  });
});
