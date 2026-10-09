import { Server } from "node:http";
import { serve } from "@hono/node-server";
import {
  createTestContainer,
  type TestContainer,
} from "@repo/core/adapters/libsql/__tests__/helpers";
import { NodeOpenRouterExecution } from "@repo/core/adapters/node/openrouter/execution";
import {
  ensureAuthenticationBrowser,
  signOutAuthentication,
} from "@repo/core/application/account/context";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { beginOpenRouter } from "@repo/core/application/integration/openRouter/connection";
import { OpenRouterProviderError } from "@repo/core/application/integration/openRouter/ports";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fenceAuthenticationRequest } from "@/presentation/authenticationHttp.node";
import { openRouterHttp } from "@/presentation/openRouterHttp.node";

describe("OpenRouter callback real loopback HTTP with isolated provider", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let server: Server;
  let origin: string;
  let execution: NodeOpenRouterExecution;
  let auth: { browserToken: string; sessionToken: string };
  let correlation: string;
  let attemptId: string;
  let exchanges: number;
  let fail: boolean;
  let clock: Date;
  beforeEach(async () => {
    base = await createTestContainer();
    clock = new Date("2026-09-27T15:00:00Z");
    execution = new NodeOpenRouterExecution();
    exchanges = 0;
    fail = false;
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        send: async () => {},
      }),
      clock: { now: () => clock },
      openRouter: {
        execution,
        protector: {
          available: () => true,
          protect: () => "synthetic-envelope",
          reveal: () => "synthetic-verifier",
        },
        catalog: { list: async () => [], fallback: () => [] },
        authorization: {
          authorization: async (input) => {
            correlation = input.correlation;
            return "http://localhost:3000/contract";
          },
          exchange: async () => {
            exchanges++;
            if (fail)
              throw new OpenRouterProviderError("OPENROUTER_UNAVAILABLE");
            return "synthetic-key";
          },
          inspectCredential: async () => ({
            expiresAt: null,
            providerUserId: null,
          }),
        },
      },
    };
    auth = {
      browserToken: c.tokens.generate(),
      sessionToken: c.tokens.generate(),
    };
    const browser = await ensureAuthenticationBrowser(c, auth.browserToken);
    await c.unitOfWorkProvider.run(async (u) => {
      const a = verifyAccount(
        createAccount(
          c.idGenerator.next(),
          "callback@fixture.invalid",
          "synthetic-hash",
          clock,
        ),
        clock,
      );
      await u.accounts.save(a);
      await u.accounts.saveSession({
        tokenHash: c.tokens.hash(auth.sessionToken),
        accountId: a.id,
        browser,
        expiresAt: new Date(clock.getTime() + 86400000),
      });
    });
    const a = await beginOpenRouter(c, auth, {
      expectedEpoch: 0,
      expectedVersion: 1,
      confirmedReconnect: false,
      returnTo: { kind: "settings" },
    });
    attemptId = a.id;
    server = await new Promise<Server>((resolve, reject) => {
      const s = serve(
        {
          hostname: "127.0.0.1",
          port: 0,
          fetch: async (incoming) => {
            try {
              return (
                (await openRouterHttp(
                  await fenceAuthenticationRequest(incoming, c),
                  c,
                )) ?? new Response(null, { status: 404 })
              );
            } catch {
              return new Response(null, { status: 500 });
            }
          },
        },
        () =>
          s instanceof Server ? resolve(s) : reject(Error("fixture server")),
      );
    });
    const address = server.address();
    if (!address || typeof address === "string") throw Error("fixture port");
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => {
    await execution.stop();
    if (server) {
      server.closeIdleConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    try {
      expect((await base.db.all(sql`pragma foreign_key_check`)).length).toBe(0);
    } finally {
      base.close();
    }
  });
  const cookie = () =>
    `hollow_auth_browser=${auth.browserToken}; hollow_session=${auth.sessionToken}`;
  async function send(
    query?: string,
    headers?: Record<string, string>,
    method = "GET",
  ) {
    const response = await fetch(
      `${origin}/auth/openrouter/callback?${query ?? new URLSearchParams({ correlation, code: "synthetic-code" }).toString()}`,
      { method, redirect: "manual", headers: headers ?? { cookie: cookie() } },
    );
    await response.arrayBuffer();
    return response;
  }
  it("redirects to only safe receipt id with no Hollow Set-Cookie and consumes code once", async () => {
    const response = await send();
    expect(response.status).toBe(303);
    expect(
      response.headers.get("location") ===
        `/auth/openrouter-result?id=${attemptId}`,
    ).toBe(true);
    expect(response.headers.get("set-cookie")).toBe(null);
    expect(response.headers.get("cache-control")?.includes("no-store")).toBe(
      true,
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    await send();
    expect(exchanges).toBe(1);
  });
  it("does not choose latest attempt for missing or duplicate correlation", async () => {
    await send("code=synthetic-code");
    await send(
      new URLSearchParams([
        ["correlation", correlation],
        ["correlation", correlation],
        ["code", "synthetic-code"],
      ]).toString(),
    );
    expect(exchanges).toBe(0);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.openRouterAttempts.find(attemptId),
        )
      )?.state,
    ).toBe("pending");
  });
  it("rejects missing or transplanted browser binding without deleting legitimate session", async () => {
    await send(undefined, { cookie: `hollow_session=${auth.sessionToken}` });
    const other = c.tokens.generate();
    await ensureAuthenticationBrowser(c, other);
    await send(undefined, {
      cookie: `hollow_auth_browser=${other}; hollow_session=${auth.sessionToken}`,
    });
    expect(exchanges).toBe(0);
    expect(
      (await c.unitOfWorkProvider.run((u) =>
        u.accounts.findSession(c.tokens.hash(auth.sessionToken)),
      )) !== null,
    ).toBe(true);
    await send();
    expect(exchanges).toBe(1);
  });
  it("rejects old callback after signout and browser ensure without epoch reset", async () => {
    await signOutAuthentication(c, auth);
    await ensureAuthenticationBrowser(c, auth.browserToken);
    await send();
    expect(exchanges).toBe(0);
  });
  it("keeps unknown exchange non-replayable across repeated GET", async () => {
    fail = true;
    await send();
    fail = false;
    await send();
    expect(exchanges).toBe(1);
    const a = await c.unitOfWorkProvider.run((u) =>
      u.openRouterAttempts.find(attemptId),
    );
    expect(
      a?.state === "failed" && a.failure === "OPENROUTER_EXCHANGE_UNKNOWN",
    ).toBe(true);
  });
  it("rejects unsupported methods and excessive callback inputs before exchange", async () => {
    expect((await send(undefined, undefined, "POST")).status).toBe(405);
    await send(
      new URLSearchParams({ correlation, code: "x".repeat(4097) }).toString(),
    );
    expect(exchanges).toBe(0);
  });
  it("records only the bound cancelled attempt and never exchanges provider error", async () => {
    await send(
      new URLSearchParams({
        correlation,
        error: "synthetic-denied",
      }).toString(),
    );
    expect(exchanges).toBe(0);
    const a = await c.unitOfWorkProvider.run((u) =>
      u.openRouterAttempts.find(attemptId),
    );
    expect(a?.state === "failed" && a.failure === "OPENROUTER_CANCELLED").toBe(
      true,
    );
  });
  it("does not exchange an expired callback on repeated public GET or disclose its code in the redirect", async () => {
    const pending = await c.unitOfWorkProvider.run((u) =>
      u.openRouterAttempts.find(attemptId),
    );
    if (!pending) throw Error("pending attempt");
    const before = await base.db.all(sql`select * from openrouter_connections`);
    clock = pending.expiresAt;
    for (let i = 0; i < 2; i++) {
      const response = await send();
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/auth/openrouter-result?id=${attemptId}`,
      );
      expect(response.headers.get("location")).not.toContain("synthetic-code");
      expect(response.headers.get("set-cookie")).toBeNull();
    }
    expect(exchanges).toBe(0);
    expect(
      await base.db.all(sql`select * from openrouter_connections`),
    ).toEqual(before);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.openRouterAttempts.find(attemptId),
      ),
    ).toEqual(pending);
  });
});
