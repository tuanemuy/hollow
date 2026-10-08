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

  it("revision independent: original failed-plus-100-success remains reachable and is observed after retry",async()=>{
    const note=await create();const receipt=await trash(note.id,note.version);const p=await requestNotePurge(c,token,receipt);
    await base.client.execute({sql:"update note_purges set state='failed',failure='independent held storage',next_attempt_at=? where id=?",args:[now.getTime()+30000,p.id]});
    await base.client.execute({sql:`with recursive seq(n) as (select 1 union all select n+1 from seq where n<100) insert into note_purges(id,note_id,account_id,operation_id,title,cause,state,created_at,updated_at,next_attempt_at,lease_token,lease_until,completed,total,failure) select 'later-'||n,'later-note-'||n,account_id,'later-op-'||n,'later '||n,'manual','succeeded',created_at+n,updated_at+n,next_attempt_at+n,null,null,0,0,null from note_purges cross join seq where id=?`,args:[p.id]});
    const before=await listNotePurges(c,token);
    expect(before.items.map(x=>x.id)).toEqual([p.id]);expect(before.summary).toMatchObject({unfinished:1,active:0,failed:1});
    expect((await listNotePurges(c,token,{scope:"completed"})).items.length).toBe(50);
    const foreign=await listNotePurges(c,other,{watch:[p.id],requests:[{noteId:note.id,operationId:receipt.operationId}]});
    expect(foreign.observed).toEqual([]);expect(foreign.requests[0].purge).toBeNull();
    await retryNotePurge(c,token,p);await sweepNotePurges(c);
    const after=await listNotePurges(c,token,{scope:"unfinished",watch:[p.id],requests:[{noteId:note.id,operationId:receipt.operationId}]});
    expect(after.items).toEqual([]);expect(after.summary.unfinished).toBe(0);expect(after.observed[0]).toMatchObject({id:p.id,state:"succeeded"});expect(after.requests[0].purge?.id).toBe(p.id);
  });
});

