import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { getAsset } from "@repo/core/application/asset/access";
import { renderNote } from "@repo/core/application/asset/references";
import {
  acceptMediaUpload,
  beginMediaUpload,
  createMediaDraft,
} from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import {
  cancelImport,
  reimportNote,
  retryImport,
} from "@repo/core/application/import/controlJobs";
import { commitImportResult } from "@repo/core/application/import/processJob";
import {
  listImports,
  requireOriginal,
} from "@repo/core/application/import/readImports";
import {
  confirmEmptyTrash,
  prepareEmptyTrash,
  sweepEmptyTrash,
} from "@repo/core/application/note/emptyTrash";
import { getNote } from "@repo/core/application/note/getNote";
import { listRevisions } from "@repo/core/application/note/history";
import {
  beginNotePurge,
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import {
  listTrash,
  restoreNote,
  trashNote,
} from "@repo/core/application/note/trash";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import { readReferences } from "@repo/core/application/reference/read";
import {
  checkWorkspaceSlug,
  createWorkspace,
  getScopeUsage,
  listScopedNotes,
  listWorkspaces,
} from "@repo/core/application/workspace/usecases";
import {
  capacityLimit,
  workspaceFields,
  workspaceSlug,
} from "@repo/core/domain/workspace/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "@repo/core/adapters/node/inlineMediaProcessor";
import { NodeReferenceProcessor } from "@repo/core/adapters/node/reference/referenceProcessor";
import { createTestContainer, type TestContainer } from "@repo/core/adapters/libsql/__tests__/helpers";

const stream = (s: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(s);
      c.close();
    },
  });
describe("workspace scope, actor policy and capacity", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let now: Date;
  let a: { id: string; token: string };
  let b: { id: string; token: string };
  let w: string;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-workspace-test-"));
    now = new Date("2026-09-10T07:00:00Z");
    const mails: string[] = [];
    const common = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    const storage = new CoordinatedObjectStorage(
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
    await storage.recoverOwners();
    async function user(email: string) {
      const r = await signUp(c, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const s = await verifyEmail(
        c,
        new URL(link).searchParams.get("token") ?? "",
        r.browserToken,
      );
      if (!s) throw Error("session");
      return { id: s.user.id, token: s.token };
    }
    a = await user("workspace-a@example.test");
    b = await user("workspace-b@example.test");
    w = (
      await createWorkspace(c, a.token, {
        name: " W 日本語 ",
        description: " 非公開 ",
        slug: "workspace-one",
      })
    ).id;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const member = (role: "owner" | "editor" | "viewer" | null) =>
    c.unitOfWorkProvider.run((x) => x.workspaces.membership(w, b.id, role));
  const note = (workspaceId = w, html = "<p>本文</p>") =>
    saveNote(c, a.token, { title: "same", html, workspaceId });
  async function imported(workspaceId = w) {
    const bytes = new TextEncoder().encode("<p>import source</p>");
    const batch = await beginUpload(c, a.token, {
      workspaceId,
      useAi: false,
      files: [{ name: "source.html", bytes: bytes.length }],
    });
    const upload = batch.files[0];
    if (!upload) throw Error("upload");
    const result = await acceptUpload(c, a.token, upload.id, stream(bytes));
    if (!result.noteId || !result.jobId) throw Error("note");
    return { batch, result: { noteId: result.noteId, jobId: result.jobId } };
  }

  it("independent slug lookup throttle exact reset and anonymous rejection", async()=>{
    await expect(checkWorkspaceSlug(c,null,{slug:"independent-one"})).rejects.toThrow();
    for(let i=0;i<60;i++) await checkWorkspaceSlug(c,a.token,{slug:"independent-one"});
    await expect(checkWorkspaceSlug(c,a.token,{slug:"independent-one"})).rejects.toMatchObject({code:"WORKSPACE_SLUG_RATE"});
    now=new Date(now.getTime()+60_000);
    expect((await checkWorkspaceSlug(c,a.token,{slug:"independent-one"})).available).toBe(true);
  });
  it("independent membership pagination is not limited by creator cap, including equal creation times",async()=>{
    await c.unitOfWorkProvider.run(async x=>{
      for(let i=0;i<51;i++){
        const id=c.idGenerator.next();
        await x.workspaces.create({id,creatorId:a.id,name:"member-"+i,description:"",slug:null,createdAt:now,state:"active"});
        await x.workspaces.membership(id,b.id,i%2?"viewer":"editor");
      }
    });
    const one=await listWorkspaces(c,b.token);
    const two=await listWorkspaces(c,b.token,{cursor:one.nextCursor!});
    expect(one.items).toHaveLength(50);expect(two.items).toHaveLength(1);
    expect(new Set([...one.items,...two.items].map(v=>v.id)).size).toBe(51);
    expect((await createWorkspace(c,b.token,{name:"my first",description:""})).id).toBeTruthy();
  });
  it("independent save dependency I/O rechecks revoked editor and keeps original body/revision",async()=>{
    const saved=await note();await member("editor");
    let inspections=0;
    c={...c,referencing:{processor:new NodeReferenceProcessor(),fetcher:{
      async inspect(url){return{url,allowed:true,reason:null}},
      async inspectMany(urls){inspections++;await member(null);return urls.map(url=>({url,allowed:true,reason:null}))},
      async fetch(){throw Error("never fetch")},
    },wake(){}}};
    await expect(saveNote(c,b.token,{id:saved.note.id,title:"not adopted",html:'<p style="background-image:url(https://fixture.example/x.png)">new</p>'})).rejects.toThrow();
    expect(inspections).toBe(1);expect((await getNote(c,a.token,saved.note.id)).html).toBe(saved.note.html);
    expect((await listRevisions(c,a.token,saved.note.id)).items).toHaveLength(1);
  });
  it("independent role loss after empty confirmation stops unfenced target; accepted purge intent remains durable",async()=>{
    await member("editor");const saved=await note();
    const t=await trashNote(c,b.token,{id:saved.note.id,version:saved.note.version,cancelProcessing:true});
    const p=await prepareEmptyTrash(c,b.token,{workspaceId:w});if(p.kind!=="prepared")throw Error("prepared");
    await confirmEmptyTrash(c,b.token,p);await member(null);await sweepEmptyTrash(c);
    expect(await c.unitOfWorkProvider.run(x=>x.purges.forNote(saved.note.id))).toBeNull();
    expect((await c.unitOfWorkProvider.run(x=>x.notes.findById(saved.note.id)))?.lifecycle.kind).toBe("trashed");
    await expect(restoreNote(c,b.token,t)).rejects.toThrow();
  });
  it("independent supplied scope cannot move existing note; creator and source ownership remain invariant",async()=>{
    const saved=await note();await member("editor");
    const changed=await saveNote(c,b.token,{id:saved.note.id,workspaceId:c.idGenerator.next(),title:"same note",html:"<p>editor</p>"});
    expect(changed.note.id).toBe(saved.note.id);expect((await c.unitOfWorkProvider.run(x=>x.notes.findById(saved.note.id)))?.owner).toEqual({kind:'workspace',workspaceId:w});expect(changed.note.creator).toEqual(saved.note.creator);
    expect((await listScopedNotes(c,b.token)).items).toHaveLength(0);
    expect((await listScopedNotes(c,b.token,{workspaceId:w})).items).toHaveLength(1);
  });
});
