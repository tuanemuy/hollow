import { request } from "node:https";
import {
  type CredentialRuntimeOwner,
  NodeCredentialUses,
  nativeCredentialTransport,
} from "@repo/core/adapters/node/auth/credentialRuntimeOwnership";
import { NodeAuthenticationExecution } from "@repo/core/adapters/node/authenticationExecution";
import { deleteAccount } from "@repo/core/application/account/deletion";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import { ownsCredentials } from "@repo/core/application/account/ports";
import { GOOGLE_ISSUER } from "@repo/core/domain/account/authentication";
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

describe.sequential("P5d-E legacy credential cutover remains held", () => {
  let f: AccountDeletionFixture;
  let actor: Awaited<ReturnType<AccountDeletionFixture["account"]>>;
  const subject = "p5d-synthetic-self-google-subject";
  beforeAll(async () => {
    f = await createAccountDeletionFixture("credentials");
    actor = await f.account("credentials@p5d.fixture.test");
    await f.container.unitOfWorkProvider.run(async (u) => {
      expect(
        await u.authentication.linkGoogle(
          actor.account.id,
          actor.account.authVersion,
          { issuer: GOOGLE_ISSUER, subject, linkedAt: f.container.clock.now() },
        ),
      ).toBe(true);
      const linked = await u.accounts.findById(actor.account.id);
      if (!linked) throw new Error("P5d Google fixture account");
      expect(
        await u.authentication.setPassword(linked.id, linked.authVersion, null),
      ).toBe(true);
    });
    await f.client.execute({
      sql: "insert into account_deletion_credential_origins(provider,account_id,mode,use_id,credential_epoch) values('google',?,'legacy-unproven',null,null)",
      args: [actor.account.id],
    });
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

  it("E01 legacy execution and a fake HTTP factory cannot issue native ownership", async () => {
    const execution = new NodeAuthenticationExecution();
    expect(ownsCredentials(execution)).toBe(false);
    expect(nativeCredentialTransport(() => {})).toBeNull();
    await execution.stop();
    const transport = nativeCredentialTransport(request);
    if (!transport) throw new Error("P5d native transport identity");
    const fake: CredentialRuntimeOwner = {
      provider: "google",
      runtimeId: f.container.idGenerator.next(),
      accepting: () => true,
      recoverableRuntimeIds: () => [],
      predecessor: () => null,
      verifyPredecessor: () => false,
      acknowledge: async () => {},
      beginUse: async () => {},
      absentUse: async () => true,
    };
    expect(() => new NodeCredentialUses(fake, transport, {})).toThrow();
  });

  it("E02 Google-only retirement fences admission while preserving unproven credential copies", async () => {
    expect(
      await deleteAccount(f.container, actor.token, {
        email: actor.account.email,
      }),
    ).toEqual({ status: "accepted" });
    for (let n = 0; n < 64; n++) {
      await sweepAccountDeletions(f.container);
      f.advance();
    }
    const intent = (
      await f.client.execute({
        sql: "select state from account_deletions where account_id=?",
        args: [actor.account.id],
      })
    ).rows[0];
    expect(intent?.state).not.toBe("succeeded");
    expect(
      (
        await f.client.execute({
          sql: "select subject from google_identities where account_id=?",
          args: [actor.account.id],
        })
      ).rows[0]?.subject,
    ).toBe(subject);
    expect(
      (
        await f.client.execute(
          "select count(*) n from account_deletion_credential_uses",
        )
      ).rows[0]?.n,
    ).toBe(0);
    await expect(
      f.client.execute({
        sql: "delete from google_identities where account_id=?",
        args: [actor.account.id],
      }),
    ).rejects.toThrow();
    await expect(
      f.client.execute({
        sql: "delete from account_deletion_credential_origins where account_id=?",
        args: [actor.account.id],
      }),
    ).rejects.toThrow();
  }, 40_000);

  it("E03 fresh native labels cannot overwrite a legacy origin or bypass active account guards", async () => {
    await expect(
      f.client.execute({
        sql: "update account_deletion_credential_origins set mode='native-v1',use_id=? where account_id=?",
        args: [f.container.idGenerator.next(), actor.account.id],
      }),
    ).rejects.toThrow();
    await expect(
      f.container.unitOfWorkProvider.run((u) =>
        u.authentication.linkGoogle(
          actor.account.id,
          actor.account.authVersion,
          {
            issuer: GOOGLE_ISSUER,
            subject: "p5d-another-self-subject",
            linkedAt: f.container.clock.now(),
          },
        ),
      ),
    ).resolves.toBe(false);
  });
});
