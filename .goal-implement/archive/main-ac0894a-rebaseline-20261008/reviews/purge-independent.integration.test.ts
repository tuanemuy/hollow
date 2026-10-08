import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import {
  acceptMediaUpload,
  beginMediaUpload,
  createMediaDraft,
} from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import { retryImport } from "@repo/core/application/import/controlJobs";
import { runImportJob } from "@repo/core/application/import/processJob";
import { listImports } from "@repo/core/application/import/readImports";
import {
  listNotePurges,
  requestNotePurge,
  retryNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { restoreNote, trashNote } from "@repo/core/application/note/trash";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CoordinatedObjectStorage } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/inlineMediaProcessor";
import { NodeReferenceProcessor } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/node/reference/referenceProcessor";
import { createTestContainer, type TestContainer } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/libsql/__tests__/helpers";

const stream = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
describe("irreversible purge, object ownership and physical capacity", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let token: string;
  let other: string;
  let storage: CoordinatedObjectStorage;
  let now: Date;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-purge-test-"));
    now = new Date("2026-09-10T00:00:00Z");
    const mails: string[] = [];
    const common = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    storage = new CoordinatedObjectStorage(
      dir,
      common.unitOfWorkProvider,
      common.clock,
    );
    c = {
      ...common,
      inlineMedia: new IsolatedInlineMediaProcessor(),
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
    };
    async function user(email: string) {
      const r = await signUp(c, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const result = await verifyEmail(
        c,
        new URL(link).searchParams.get("token") ?? "",
        r.browserToken,
      );
      if (!result) throw Error("session");
      return result.token;
    }
    token = await user("purge-a@example.test");
    other = await user("purge-b@example.test");
    await storage.recoverOwners();
  });
  afterEach(async () => {
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const create = async () =>
    (
      await saveNote(c, token, {
        title: "削除専用",
        html: "<p>saved</p>",
        importReferences: false,
      })
    ).note;
  const trash = async (id: string, version: number) =>
    trashNote(c, token, { id, version, cancelProcessing: true });

  it("independent: old unfinished purge remains accessible after 100 newer results",async()=>{
    const note=await create();const receipt=await trash(note.id,note.version);const p=await requestNotePurge(c,token,receipt);
    await base.client.execute({sql:"update note_purges set state='failed',failure='independent held storage',next_attempt_at=? where id=?",args:[now.getTime()+30000,p.id]});
    await base.client.execute({sql:`with recursive seq(n) as (select 1 union all select n+1 from seq where n<100) insert into note_purges(id,note_id,account_id,operation_id,title,cause,state,created_at,updated_at,next_attempt_at,lease_token,lease_until,completed,total,failure) select 'later-'||n,'later-note-'||n,account_id,'later-op-'||n,'later '||n,'manual','succeeded',created_at+n,updated_at+n,next_attempt_at+n,null,null,0,0,null from note_purges cross join seq where id=?`,args:[p.id]});
    const items=(await listNotePurges(c,token)).items;
    console.log(JSON.stringify({independent:'history boundary',returned:items.length,unfinishedReturned:items.some(x=>x.id===p.id),persistedState:(await c.unitOfWorkProvider.run(x=>x.purges.find(p.id)))?.state}));
    expect(items.some(x=>x.id===p.id)).toBe(true);
  });
  it("independent: 101 awaiting media reservations are captured across bounded passes and fully released", async()=>{
    const note=await create(); const draft=await createMediaDraft(c,token,note.id);
    for(let i=0;i<101;i++) await beginMediaUpload(c,token,{draftId:draft.id,name:"pending"+i+".png",bytes:4});
    expect((await listImports(c,token)).usedBytes).toBe(404);
    const p=await requestNotePurge(c,token,await trash(note.id,note.version));
    for(let i=0;i<5;i++){await sweepNotePurges(c);now=new Date(now.getTime()+3000);}
    const result=(await listNotePurges(c,token)).items.find(x=>x.id===p.id);
    expect(result).toMatchObject({state:"succeeded",total:202,completed:202});
    expect((await listImports(c,token)).usedBytes).toBe(0);
    expect(await c.unitOfWorkProvider.run(x=>x.notes.findById(note.id))).toBeNull();
  });
  it("independent: restore and manual purge race has one winner and cannot revive accepted purge",async()=>{
    for(const order of [true,false]){
      const note=await create();const receipt=await trash(note.id,note.version);
      const tasks=order?[()=>restoreNote(c,token,receipt),()=>requestNotePurge(c,token,receipt)]:[()=>requestNotePurge(c,token,receipt),()=>restoreNote(c,token,receipt)];
      const out=await Promise.allSettled(tasks.map(f=>f()));
      expect(out.filter(x=>x.status==="fulfilled")).toHaveLength(1);
      const purgeWon=out[order?1:0].status==="fulfilled";
      await sweepNotePurges(c);
      const current=await c.unitOfWorkProvider.run(x=>x.notes.findById(note.id));
      if(purgeWon)expect(current).toBeNull();else expect(current?.lifecycle.kind).toBe("active");
    }
  });
  it("independent: exact 90-day snapshot retention cutoff and account separation",async()=>{
    const bytes=new TextEncoder().encode("fixture");
    const batch=await beginUpload(c,token,{useAi:false,importReferences:false,files:[{name:"one.txt",bytes:bytes.length}]});
    const accepted=await acceptUpload(c,token,batch.files[0]!.id,stream(bytes));
    const job=await c.unitOfWorkProvider.run(x=>x.jobs.claim(now,"independent",new Date(now.getTime()+60000)));
    if(!job)throw Error("job");await runImportJob(c,job);
    const note=await c.unitOfWorkProvider.run(x=>x.notes.findById(accepted.noteId!));if(!note)throw Error("note");
    await requestNotePurge(c,token,await trash(note.id,note.version));await sweepNotePurges(c);
    expect((await listImports(c,token)).batches[0]?.jobs[0]?.targetDeleted).toBe(true);
    expect((await listImports(c,other)).batches).toEqual([]);
    await c.unitOfWorkProvider.run(x=>x.purges.prune(now));
    expect(await c.unitOfWorkProvider.run(x=>x.purges.snapshots(job.accountId,new Date(0)))).toHaveLength(1);
    await c.unitOfWorkProvider.run(x=>x.purges.prune(new Date(now.getTime()+1)));
    expect(await c.unitOfWorkProvider.run(x=>x.purges.snapshots(job.accountId,new Date(0)))).toHaveLength(0);
  });
});
