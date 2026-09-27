import { Server } from "node:http";
import { serve } from "@hono/node-server";
import {
  createTestContainer,
  type TestContainer,
} from "@repo/core/adapters/libsql/__tests__/helpers";
import { NodeAuthenticationExecution } from "@repo/core/adapters/node/authenticationExecution";
import {
  captureAuthentication,
  ensureAuthenticationBrowser,
  signOutAuthentication,
} from "@repo/core/application/account/context";
import { beginGoogleAuthentication } from "@repo/core/application/account/google";
import { currentUser } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { GOOGLE_ISSUER } from "@repo/core/domain/account/authentication";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authenticationCookie,
  authenticationHttp,
  fenceAuthenticationRequest,
} from "@/presentation/authenticationHttp.node";

describe("real loopback HTTP authentication callback and common request fence", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let execution: NodeAuthenticationExecution;
  let server: Server;
  let origin: string;
  let state = "";
  let exchanges = 0;
  let hold: Promise<void> | null = null;
  let release = () => {};
  let signalHeld = () => {};
  let held: Promise<void>;
  const pending = new Set<Promise<Response>>();
  const clock = new Date("2026-09-27T13:00:00Z");
  beforeEach(async () => {
    base = await createTestContainer();
    execution = new NodeAuthenticationExecution();
    exchanges = 0;
    hold = null;
    held = new Promise((resolve) => {
      signalHeld = resolve;
    });
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        send: async () => {},
      }),
      clock: { now: () => clock },
      googleAuthentication: {
        execution,
        protector: {
          available: () => true,
          protect: () => "synthetic-envelope",
          reveal: () => "synthetic-verifier",
        },
        provider: {
          authorization: async (input) => {
            state = input.state;
            return "http://localhost/contract";
          },
          exchange: async () => {
            exchanges++;
            return {
              issuer: GOOGLE_ISSUER,
              subject: "synthetic",
              email: "synthetic@fixture.invalid",
              authoritative: true,
              issuedAt: clock,
              expiresAt: new Date(clock.getTime() + 600_000),
            };
          },
        },
      },
    };
    server = await new Promise<Server>((resolve, reject) => {
      const s = serve(
        {
          hostname: "127.0.0.1",
          port: 0,
          fetch: async (incoming) => {
            try {
              const request = await fenceAuthenticationRequest(incoming, c);
              const response = await authenticationHttp(request, c);
              if (response) {
                if (hold) {
                  signalHeld();
                  await hold;
                }
                return response;
              }
              const pathname = new URL(request.url).pathname;
              const browserToken = authenticationCookie(
                request,
                "hollow_auth_browser",
              );
              const sessionToken = authenticationCookie(
                request,
                "hollow_session",
              );
              if (pathname === "/contract/current")
                return Response.json({
                  authenticated: Boolean(await currentUser(c, sessionToken)),
                });
              if (
                request.method !== "POST" ||
                request.headers.get("origin") !== origin
              )
                return new Response(null, { status: 403 });
              if (pathname === "/contract/bootstrap") {
                const token = browserToken ?? c.tokens.generate();
                await ensureAuthenticationBrowser(c, token);
                return new Response(null, {
                  headers: browserToken
                    ? {}
                    : {
                        "Set-Cookie": `hollow_auth_browser=${token}; Path=/; HttpOnly; SameSite=Lax`,
                      },
                });
              }
              if (!browserToken) return new Response(null, { status: 403 });
              const auth = { browserToken, sessionToken };
              if (pathname === "/contract/signout") {
                await signOutAuthentication(c, auth);
                return new Response(null, { status: 204 });
              }
              if (pathname === "/contract/capture") {
                const context = await c.unitOfWorkProvider.run((u) =>
                  captureAuthentication(c, u, auth),
                );
                return Response.json({ authenticated: context.actor !== null });
              }
              return new Response(null, { status: 404 });
            } catch {
              return new Response(null, { status: 409 });
            }
          },
        },
        () =>
          s instanceof Server
            ? resolve(s)
            : reject(new Error("fixture HTTP server")),
      );
    });
    const address = server.address();
    if (!address || typeof address === "string") throw Error("fixture port");
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => {
    release();
    await Promise.allSettled([...pending]);
    await execution.stop();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections();
    });
    try {
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base.close();
    }
  });
  function http(path: string, cookie = "", method = "GET") {
    const task = fetch(`${origin}${path}`, {
      method,
      redirect: "manual",
      headers: { cookie, origin, connection: "close" },
    });
    pending.add(task);
    void task.finally(() => pending.delete(task)).catch(() => {});
    return task;
  }
  function cookie(response: Response) {
    return response.headers.get("set-cookie")?.split(";")[0] ?? "";
  }
  async function browser() {
    return cookie(await http("/contract/bootstrap", "", "POST"));
  }
  async function start(browserCookie: string) {
    const browserToken = browserCookie.split("=")[1];
    if (!browserToken) throw Error("fixture browser");
    await beginGoogleAuthentication(
      c,
      { browserToken, sessionToken: null },
      "login",
      { kind: "notes" },
    );
    return `/auth/google/callback?state=${encodeURIComponent(state)}&code=synthetic`;
  }

  it("returns a no-store tokenless redirect and rejects cookie loss or transplantation without deleting the source session", async () => {
    const own = await browser();
    const other = await browser();
    const result = await http(await start(own), own);
    expect(result.status).toBe(303);
    expect(
      result.headers.get("location")?.startsWith("/auth/google-result?id="),
    ).toBe(true);
    expect(result.headers.get("location")?.includes(state)).toBe(false);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(result.headers.get("referrer-policy")).toBe("no-referrer");
    const session = cookie(result);
    expect(
      await (await http("/contract/current", `${own};${session}`)).json(),
    ).toEqual({ authenticated: true });
    expect(await (await http("/contract/current", session)).json()).toEqual({
      authenticated: false,
    });
    expect(
      await (await http("/contract/current", `${other};${session}`)).json(),
    ).toEqual({ authenticated: false });
    expect(
      await (
        await http("/contract/current", `${own};${session};${session}`)
      ).json(),
    ).toEqual({ authenticated: false });
    expect(
      await (await http("/contract/current", `${own};${session}`)).json(),
    ).toEqual({ authenticated: true });
  });
  it("does not restore authentication when a held successful callback Set-Cookie arrives after signout", async () => {
    const own = await browser();
    const callback = await start(own);
    hold = new Promise((resolve) => {
      release = resolve;
    });
    const response = http(callback, own);
    await held;
    expect((await http("/contract/signout", own, "POST")).status).toBe(204);
    release();
    hold = null;
    const late = cookie(await response);
    expect(Boolean(late)).toBe(true);
    expect(
      await (await http("/contract/current", `${own};${late}`)).json(),
    ).toEqual({ authenticated: false });
    expect(exchanges).toBe(1);
  });
  it("keeps parallel bootstrap contexts separate and binds a legacy token only once", async () => {
    const [a, b] = await Promise.all([browser(), browser()]);
    expect(a === b).toBe(false);
    const id = c.idGenerator.next();
    const token = c.tokens.generate();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(id, "legacy@fixture.invalid", "synthetic", clock),
          clock,
        ),
      );
      await u.accounts.saveSession({
        tokenHash: c.tokens.hash(token),
        accountId: id,
        expiresAt: new Date(clock.getTime() + 86_400_000),
      });
    });
    const session = `hollow_session=${token}`;
    expect(await (await http("/contract/current", session)).json()).toEqual({
      authenticated: true,
    });
    expect(
      await (await http("/contract/capture", `${a};${session}`, "POST")).json(),
    ).toEqual({ authenticated: true });
    expect(
      await (await http("/contract/capture", `${b};${session}`, "POST")).json(),
    ).toEqual({ authenticated: false });
    expect(await (await http("/contract/bootstrap", a, "POST")).text()).toBe(
      "",
    );
    expect(
      await (await http("/contract/current", `${a};${session}`)).json(),
    ).toEqual({ authenticated: true });
  });
  it("does not exchange a callback from another browser or accept duplicated or oversized code", async () => {
    const own = await browser();
    const other = await browser();
    const callback = await start(own);
    expect((await http(callback, other)).status).toBe(303);
    expect(exchanges).toBe(0);
    expect((await http(`${callback}&code=duplicate`, own)).status).toBe(303);
    expect(exchanges).toBe(0);
    const next = await start(own);
    expect(
      (
        await http(
          `${next.replace("code=synthetic", `code=${"a".repeat(4097)}`)}`,
          own,
        )
      ).status,
    ).toBe(303);
    expect(exchanges).toBe(0);
  });
});
