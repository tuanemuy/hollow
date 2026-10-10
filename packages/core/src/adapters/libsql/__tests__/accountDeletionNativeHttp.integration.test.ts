import { deleteAccount } from "@repo/core/application/account/deletion";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import {
  beginOpenRouter,
  unlinkOpenRouter,
} from "@repo/core/application/integration/openRouter/connection";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { openRouterHttp } from "../../../../../../apps/web/app/presentation/openRouterHttp.node";
import {
  createNativeHttpFixture,
  type NativeHttpFixture,
} from "./accountDeletionNativeHttpFixtures";

type HttpCheckpoint =
  | "account"
  | "begin-callback"
  | "adoption-ready"
  | "native-ledger"
  | "use-query"
  | "use-count"
  | "use-active"
  | "caller-active"
  | "closure-absent"
  | "registry-empty-active"
  | "origin-empty"
  | "callback-result"
  | "registry-empty-closed"
  | "use-closed-acked"
  | "attempt-completed"
  | "origin-native"
  | "connection-linked"
  | "delete-accepted"
  | "sweep"
  | "attempts-cleared"
  | "uses-cleared"
  | "origin-cleared"
  | "connection-cleared"
  | "final-ledger";

let f: NativeHttpFixture;
beforeAll(async () => {
  f = await createNativeHttpFixture();
}, 40_000);
afterEach(async (context) => {
  if (context.task.result?.state === "fail") f.fail();
  if (!f.failed()) await f.guard();
});
afterAll(async () => {
  if (f) await f.close();
}, 40_000);
it("HTTP01 normal OR native TLS closes both requests before whole adoption, exact ACK, and unlinked history cleanup", async () => {
  let checkpoint: HttpCheckpoint = "account";
  try {
    const actor = await f.account("p5d-http-self@example.test");
    checkpoint = "begin-callback";
    const started = await beginOpenRouter(f.container, actor.request, {
      expectedEpoch: 0,
      expectedVersion: 1,
      confirmedReconnect: false,
      returnTo: { kind: "settings" },
    });
    const callback = new URL(
      new URL(started.authorizationUrl).searchParams.get("callback_url") ?? "",
    );
    const request = new Request(callback, {
      headers: {
        Cookie: `hollow_auth_browser=${actor.request.browserToken}; hollow_session=${actor.token}`,
      },
    });
    const url = new URL(request.url);
    url.searchParams.set("code", "p5d-self-http-code");
    const held = f.holdAdoption();
    const response = openRouterHttp(new Request(url, request), f.container);
    try {
      checkpoint = "adoption-ready";
      await held.ready();
      checkpoint = "native-ledger";
      expect(f.endpoint.ledger()).toMatchObject({
        requests: 2,
        requestClosed: 2,
        responseClosed: 2,
        clientSockets: 2,
        clientSocketClosed: 2,
        accepted: 2,
        acceptedClosed: 2,
        tlsSockets: 2,
        tlsSocketClosed: 2,
        serverRequests: 2,
        serverResponseClosed: 2,
        failed: false,
      });
      checkpoint = "use-query";
      const uses = await f.nativeContainer.unitOfWorkProvider.run((u) =>
        u.accountDeletions.pendingCredentialUses(
          "openrouter",
          null,
          f.execution.recoverableRuntimeIds(),
        ),
      );
      checkpoint = "use-count";
      expect(uses).toHaveLength(1);
      const use = uses[0];
      if (!use) throw new Error("P5D_HTTP_USE_MISSING");
      checkpoint = "use-active";
      expect(use.state).toBe("active");
      checkpoint = "caller-active";
      expect(use.callerEnded).toBe(false);
      checkpoint = "closure-absent";
      expect(f.execution.closure(use.target)).toBeNull();
      checkpoint = "registry-empty-active";
      expect(f.execution.unacknowledged()).toHaveLength(0);
      checkpoint = "origin-empty";
      expect(
        (
          await f.client.execute(
            "select count(*) n from account_deletion_credential_origins",
          )
        ).rows[0]?.n,
      ).toBe(0);
    } finally {
      held.release();
    }
    checkpoint = "callback-result";
    expect((await response)?.status).toBe(303);
    checkpoint = "registry-empty-closed";
    expect(f.execution.unacknowledged()).toHaveLength(0);
    checkpoint = "use-closed-acked";
    expect(
      (
        await f.client.execute(
          "select state,caller_ended,acknowledged from account_deletion_credential_uses",
        )
      ).rows[0],
    ).toMatchObject({ state: "closed", caller_ended: 1, acknowledged: 1 });
    checkpoint = "attempt-completed";
    expect(
      (await f.client.execute("select state from openrouter_attempts")).rows[0]
        ?.state,
    ).toBe("completed");
    checkpoint = "origin-native";
    expect(
      (
        await f.client.execute(
          "select mode from account_deletion_credential_origins",
        )
      ).rows[0]?.mode,
    ).toBe("native-v1");
    checkpoint = "connection-linked";
    expect(
      (
        await f.client.execute(
          "select count(*) n from openrouter_connections where state='linked' and credential_envelope is not null and provider_user_id is not null",
        )
      ).rows[0]?.n,
    ).toBe(1);
    const connectionBefore = (
      await f.client.execute({
        sql: "select epoch,version,ever_linked_at from openrouter_connections where account_id=?",
        args: [actor.account.id],
      })
    ).rows[0];
    expect(connectionBefore).toBeDefined();
    await expect(
      f.client.execute({
        sql: "update openrouter_connections set state='unlinked',credential_envelope=null,key_expires_at=null,provider_user_id=null,linked_at=null,ever_linked_at=null,last_used_at=null,epoch=epoch+1,version=version+1 where account_id=?",
        args: [actor.account.id],
      }),
    ).rejects.toMatchObject({ code: "SQLITE_CONSTRAINT" });
    expect(
      (
        await f.client.execute({
          sql: "select epoch,version,ever_linked_at from openrouter_connections where account_id=?",
          args: [actor.account.id],
        })
      ).rows[0],
    ).toEqual(connectionBefore);
    const linked = await f.nativeContainer.unitOfWorkProvider.run((u) =>
      u.openRouterConnections.find(actor.account.id),
    );
    if (!linked) throw new Error("P5D_HTTP_CONNECTION_MISSING");
    await unlinkOpenRouter(f.nativeContainer, actor.request, {
      epoch: linked.epoch,
      version: linked.version,
    });
    const unlinked = await f.nativeContainer.unitOfWorkProvider.run((u) =>
      u.openRouterConnections.find(actor.account.id),
    );
    expect(unlinked).toMatchObject({
      state: "unlinked",
      epoch: linked.epoch + 1,
      version: linked.version + 1,
      credentialEnvelope: null,
      keyExpiresAt: null,
      providerUserId: null,
      linkedAt: null,
      lastUsedAt: null,
      everLinkedAt: linked.everLinkedAt,
    });
    expect(linked.everLinkedAt).not.toBeNull();
    checkpoint = "delete-accepted";
    expect(
      await deleteAccount(f.nativeContainer, actor.token, {
        email: actor.account.email,
      }),
    ).toEqual({ status: "accepted" });
    checkpoint = "sweep";
    for (let n = 0; n < 64; n++) {
      await sweepAccountDeletions(f.container);
      f.advance();
    }
    checkpoint = "attempts-cleared";
    expect(
      (await f.client.execute("select count(*) n from openrouter_attempts"))
        .rows[0]?.n,
    ).toBe(0);
    checkpoint = "uses-cleared";
    expect(
      (
        await f.client.execute(
          "select count(*) n from account_deletion_credential_uses",
        )
      ).rows[0]?.n,
    ).toBe(0);
    checkpoint = "origin-cleared";
    expect(
      (
        await f.client.execute(
          "select count(*) n from account_deletion_credential_origins",
        )
      ).rows[0]?.n,
    ).toBe(0);
    checkpoint = "connection-cleared";
    expect(
      (
        await f.client.execute(
          "select count(*) n from openrouter_connections where credential_envelope is not null or provider_user_id is not null or key_expires_at is not null or linked_at is not null or last_used_at is not null or ever_linked_at is not null",
        )
      ).rows[0]?.n,
    ).toBe(0);
    checkpoint = "final-ledger";
    expect(f.endpoint.ledger().failed).toBe(false);
  } catch (error) {
    try {
      process.stdout.write(
        `P5D_HTTP ${JSON.stringify({ event: "checkpoint", case: "HTTP01", key: checkpoint })}\n`,
      );
    } catch {
      throw error;
    }
    throw error;
  }
}, 40_000);
