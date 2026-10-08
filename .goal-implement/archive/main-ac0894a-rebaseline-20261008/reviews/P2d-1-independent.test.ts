import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { renderNote } from "@repo/core/application/asset/references";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { getNote } from "@repo/core/application/note/getNote";
import {
  getNoteVersion,
  listRevisions,
  renderRevision,
  restoreRevision,
} from "@repo/core/application/note/history";
import { listNotes } from "@repo/core/application/note/listNotes";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import {
  getTrashIntent,
  listTrash,
  restoreNote,
  trashNote,
} from "@repo/core/application/note/trash";
import { getWysContext } from "@repo/core/application/note/wysContext";
import {
  controlReference,
  readReferences,
} from "@repo/core/application/reference/read";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContainer, type TestContainer } from "/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src/adapters/libsql/__tests__/helpers";

describe("personal trash and active authorization", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let now: Date;
  let token: string;
  let other: string;
  beforeEach(async () => {
    base = await createTestContainer();
    now = new Date("2026-09-10T00:00:00Z");
    const mails: string[] = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    async function user(email: string) {
      const registration = await signUp(container, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const result = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        registration.browserToken,
      );
      if (!result) throw Error("session");
      return result.token;
    }
    token = await user("trash-a@example.test");
    other = await user("trash-b@example.test");
  });
  afterEach(() => base.close());
  const create = async (title = "保存済み") =>
    (
      await saveNote(container, token, {
        title,
        html: '<p class="keep">本文</p>',
        importReferences: false,
      })
    ).note;
  async function snapshot(id: string) {
    return container.unitOfWorkProvider.run(async (c) => ({
      note: await c.notes.findById(id),
      revisions: await c.revisions.list(id),
      head: await c.revisions.head(id),
      pins: await c.assets.referenceIds(id, 0),
      settings: await c.references.settings(id),
    }));
  }

  it("independent: actual twenty held revisions survive both metadata transitions", async () => {
    let note=await create();
    for(let i=0;i<24;i++) note=(await saveNote(container,token,{id:note.id,title:note.title,html:"<p>版"+i+"</p>",importReferences:false})).note;
    const before=await snapshot(note.id);
    expect(before.revisions).toHaveLength(20);
    const trashed=await trashNote(container,token,{id:note.id,version:note.version,cancelProcessing:false});
    const middle=await snapshot(note.id);
    expect(middle.revisions).toEqual(before.revisions);expect(middle.head).toEqual(before.head);
    await restoreNote(container,token,trashed);
    const after=await snapshot(note.id);
    expect(after.revisions).toEqual(before.revisions);expect(after.head).toEqual(before.head);
    expect(after.note?.html).toBe(note.html);expect(after.note?.version).toBe(note.version+2);
  });
  it("independent: restore actually succeeds one millisecond before expiry", async () => {
    const note=await create(),trashed=await trashNote(container,token,{id:note.id,version:0,cancelProcessing:false});
    now=new Date(new Date(trashed.purgeAfter).getTime()-1);
    token=(await signIn(container,{email:"trash-a@example.test",password:"test-password-1234"})).token;
    await restoreNote(container,token,trashed);
    expect((await getNote(container,token,note.id)).version).toBe(2);
  });
});

