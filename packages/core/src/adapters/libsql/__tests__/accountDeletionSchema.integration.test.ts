import { deleteAccount } from "@repo/core/application/account/deletion";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFailed,
} from "vitest";
import {
  type AccountDeletionFixture,
  createAccountDeletionFixture,
} from "./accountDeletionFixtures";

describe.sequential("P5d-G formal 0046 guards", () => {
  let f: AccountDeletionFixture;
  let actor: Awaited<ReturnType<AccountDeletionFixture["account"]>>;
  beforeAll(async () => {
    f = await createAccountDeletionFixture("schema");
    actor = await f.account("schema@p5d.fixture.test");
  }, 40_000);
  beforeEach(async () => {
    onTestFailed(() => f.fail());
    await f.guard();
  });
  afterEach(async () => {
    await f.guard();
  });
  afterAll(async () => {
    await f?.close();
  }, 40_000);

  it("G01 rejects a deletion intent with an unrelated fence version", async () => {
    await expect(
      f.client.execute({
        sql: "insert into account_deletions(id,account_id,fence_auth_version,state,cursor_table,version,accepted_at,next_attempt_at) values(?,?,99,'queued','personal-notes',1,?,?)",
        args: [
          f.container.idGenerator.next(),
          actor.account.id,
          f.container.clock.now().getTime(),
          f.container.clock.now().getTime(),
        ],
      }),
    ).rejects.toThrow();
    expect(
      (await f.client.execute("select count(*) n from account_deletions"))
        .rows[0]?.n,
    ).toBe(0);
  });

  it("G02 permits only a matching irreversible anchor and keeps formal foreign keys", async () => {
    await deleteAccount(f.container, actor.token, {
      email: actor.account.email,
    });
    const row = (
      await f.client.execute({
        sql: "select state,email,password_hash,created_at,verified_at,auth_version,deletion_id from accounts where id=?",
        args: [actor.account.id],
      })
    ).rows[0];
    expect(row).toMatchObject({
      state: "deleted",
      email: null,
      password_hash: null,
      created_at: null,
      verified_at: null,
      auth_version: 2,
    });
    expect(typeof row?.deletion_id).toBe("string");
    await expect(
      f.client.execute({
        sql: "update accounts set state='active' where id=?",
        args: [actor.account.id],
      }),
    ).rejects.toThrow();
    await expect(
      f.client.execute({
        sql: "delete from accounts where id=?",
        args: [actor.account.id],
      }),
    ).rejects.toThrow();
    await expect(
      f.client.execute({
        sql: "insert into sessions(token_hash,account_id,expires_at) values(?,?,?)",
        args: [
          f.container.tokens.hash(f.container.tokens.generate()),
          actor.account.id,
          f.container.clock.now().getTime() + 10_000,
        ],
      }),
    ).rejects.toThrow();
    expect((await f.client.execute("PRAGMA foreign_key_check")).rows).toEqual(
      [],
    );
    expect(
      (
        await f.client.execute(
          "select count(*) n from sqlite_master where type='trigger' and name like 'p5d_%'",
        )
      ).rows[0]?.n,
    ).toBeGreaterThanOrEqual(78);
  });
});
