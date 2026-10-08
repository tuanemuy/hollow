import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  admitEmptyTarget,
  cancelEmptyTrash,
  confirmEmptyTrash,
  discardEmptyTrash,
  getEmptyTrash,
  listEmptyAttempts,
  listEmptyTrash,
  prepareEmptyTrash,
  retryEmptyTrash,
  sweepEmptyTrash,
} from "@repo/core/application/note/emptyTrash";
import {
  listNotePurges,
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { restoreNote, trashNote } from "@repo/core/application/note/trash";
import { processOutboxEvents } from "@repo/core/application/workers/eventRelayWorker";
import { sql } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/node_modules/drizzle-orm/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { notes } from "@repo/core/adapters/libsql/hollowSchema";
import { LibsqlNoteRepository } from "@repo/core/adapters/libsql/repositories/noteRepository";
import { createTestContainer, type TestContainer } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/libsql/__tests__/helpers";

describe("fixed-scope empty trash and logical child attempts", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let token: string;
  let other: string;
  let owner: string;
  let now: Date;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-empty-test-"));
    now = new Date("2026-09-10T05:00:00Z");
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
      const s = await verifyEmail(
        c,
        new URL(link).searchParams.get("token") ?? "",
        r.browserToken,
      );
      if (!s) throw Error("session");
      return s;
    }
    const a = await user("empty-a@example.test");
    token = a.token;
    owner = a.user.id;
    other = (await user("empty-b@example.test")).token;
    await storage.recoverOwners();
  });
  afterEach(async () => {
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  async function seed(n: number) {
    const rows = Array.from({ length: n }, (_, i) => ({
      id: c.idGenerator.next(),
      ownerAccountId: owner,
      lifecycle: "trashed" as const,
      trashedAt: now,
      purgeAfter: new Date(now.getTime() + 30 * 86400_000),
      trashOperationId: c.idGenerator.next(),
      title: `metadata ${i}`,
      html: "<p>source</p>",
      version: 0,
      createdAt: now,
      updatedAt: now,
    }));
    for (let i = 0; i < n; i += 50)
      await base.db.insert(notes).values(rows.slice(i, i + 50));
    return rows;
  }
  async function prepare() {
    const p = await prepareEmptyTrash(c, token);
    if (p.kind !== "prepared") throw Error("empty fixture");
    return p;
  }
  async function detail(id: string) {
    const d = await getEmptyTrash(c, token, { id });
    if (d.kind !== "job") throw Error("not accepted");
    return d;
  }

  it("independent 51: twenty fenced continue while thirty-one unstarted cancel", async () => {
    await seed(51); const p=await prepare(); await confirmEmptyTrash(c,token,p);
    const pending=await c.unitOfWorkProvider.run(x=>x.emptyTrash.pending(20));
    for(const item of pending) await c.unitOfWorkProvider.run(x=>admitEmptyTarget(c,x,item));
    expect((await detail(p.id)).job.counts).toMatchObject({active:20,waiting:31});
    await cancelEmptyTrash(c,token,{id:p.id,generation:0});
    for(let i=0;i<21;i++){await sweepNotePurges(c);await sweepEmptyTrash(c);}
    expect((await detail(p.id)).job).toMatchObject({state:"cancelled",counts:{total:51,succeeded:20,cancelled:31,failed:0,waiting:0,active:0}});
    expect(await base.db.select().from(notes)).toHaveLength(31);
    expect((await getEmptyTrash(c,token,{id:p.id,after:50})).kind).toBe("job");
  });
  it("independent fixed target absence is not success without the same intent proof", async () => {
    const rows=await seed(2); const p=await prepare(); await confirmEmptyTrash(c,token,p);
    const targets=await c.unitOfWorkProvider.run(x=>x.emptyTrash.pending(20));
    const [proven,unproven]=targets;if(!proven||!unproven)throw Error("fixture");
    const t=await c.unitOfWorkProvider.run(x=>x.emptyTrash.target(p.id,proven.ordinal));if(!t?.noteId||!t.operationId)throw Error("target");
    await requestNotePurge(c,token,{id:t.noteId,operationId:t.operationId});await sweepNotePurges(c);
    const u=await c.unitOfWorkProvider.run(x=>x.emptyTrash.target(p.id,unproven.ordinal));if(!u?.noteId)throw Error("target");
    await base.db.run(sql`delete from notes where id=${u.noteId}`);
    await sweepEmptyTrash(c);
    expect((await detail(p.id)).job.counts).toMatchObject({total:2,succeeded:1,cancelled:1,failed:0});
    expect(rows.length).toBe(2);
  });
  it("independent P expiry preserves Q result and incomplete recovery until physical success", async () => {
    await seed(1);const p=await prepare(),q=await prepare();await confirmEmptyTrash(c,token,p);await sweepEmptyTrash(c);
    now=new Date(now.getTime()+14*60000);await confirmEmptyTrash(c,token,q);await sweepEmptyTrash(c);
    await c.unitOfWorkProvider.run(async x=>{const claim=await x.purges.claim(now,"independent-fault",new Date(now.getTime()+60000));if(!claim)throw Error("claim");await x.purges.defer(claim.id,"independent-fault",now,"independent failed");});
    now=new Date(now.getTime()+90*86400_000-7*60000);
    token=(await signIn(c,{email:"empty-a@example.test",password:"test-password-1234"})).token;
    await sweepEmptyTrash(c);
    expect((await detail(p.id)).job.historical).toBe(true);
    expect((await detail(q.id)).job.historical).toBe(false);
    expect((await detail(p.id)).items[0]?.title).toBe("");
    expect((await detail(q.id)).items[0]?.title).not.toBe("");
    expect((await detail(p.id)).job.counts.failed).toBe(1);
    await sweepNotePurges(c);await sweepEmptyTrash(c);await sweepEmptyTrash(c);
    await expect(getEmptyTrash(c,token,p)).rejects.toMatchObject({code:"EMPTY_NOT_FOUND"});
    expect((await detail(q.id)).job.counts.succeeded).toBe(1);
    expect(await base.db.select().from(notes)).toHaveLength(0);
  });
});
