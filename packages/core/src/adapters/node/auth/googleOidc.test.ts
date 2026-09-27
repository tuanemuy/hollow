import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { createServer, request, type Server } from "node:http";
import type { Socket } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GoogleRequestFactory } from "./googleHttp";
import { NodeGoogleOidc } from "./googleOidc";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = keys.publicKey.export({ type: "spki", format: "pem" }).toString();
const now = new Date("2026-09-27T13:00:00.000Z");
const verifier = "v".repeat(43);
const config = {
  clientId: "synthetic-client",
  clientSecret: "synthetic-secret",
  redirectUri: "https://hollow.example.test/auth/google/callback",
};
const tokens = {
  generate: () => "synthetic",
  hash: (v: string) => createHash("sha256").update(v).digest("hex"),
};
const tokenUrl = "https://oauth2.googleapis.com/token";
const certUrl = "https://www.googleapis.com/oauth2/v1/certs";
const base = {
  iss: "https://accounts.google.com",
  aud: config.clientId,
  sub: "subject",
  email: "user@gmail.com",
  email_verified: true,
  nonce: "synthetic-nonce",
  iat: now.getTime() / 1000 - 10,
  exp: now.getTime() / 1000 + 3600,
};
function jwt(
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
) {
  const signed = `${Buffer.from(JSON.stringify({ alg: "RS256", kid: "key", ...header })).toString("base64url")}.${Buffer.from(JSON.stringify({ ...base, ...claims })).toString("base64url")}`;
  return `${signed}.${sign("RSA-SHA256", Buffer.from(signed), keys.privateKey).toString("base64url")}`;
}
type Options = {
  claims?: () => Record<string, unknown>;
  header?: () => Record<string, unknown>;
  certs?: () => Record<string, string>;
  cache?: string;
  age?: string;
  fault?:
    | "token-limit"
    | "cert-limit"
    | "slow-token"
    | "slow-certs"
    | "redirect"
    | "encoded"
    | "disconnect"
    | "json"
    | "token-size"
    | "certificate-unavailable";
};
type Observation = {
  url: string;
  requestClosed: boolean;
  responseClosed: boolean;
  socketClosed: boolean;
  responseSeen: boolean;
  socketSeen: boolean;
};
const servers = new Set<Server>();
const sockets = new Set<Socket>();
const operations = new Set<Promise<unknown>>();

async function setup(options: Options = {}) {
  const observations: Observation[] = [];
  const forms: string[] = [];
  let seen: () => void = () => {};
  const requestSeen = new Promise<void>((resolve) => {
    seen = resolve;
  });
  const server = createServer((incoming, reply) => {
    const parts: Buffer[] = [];
    incoming.on("data", (chunk: Buffer) => parts.push(chunk));
    incoming.once("end", () => {
      forms.push(Buffer.concat(parts).toString());
      const token = incoming.url === "/token";
      if (options.fault === "disconnect") {
        incoming.socket.destroy();
        seen();
        return;
      }
      if (options.fault === "redirect") {
        reply.writeHead(302, {
          location: "https://outside.example.test/never",
        });
        reply.end();
        seen();
        return;
      }
      reply.writeHead(200, {
        "content-type": "application/json",
        "cache-control": options.cache ?? "max-age=3600",
        ...(options.age === undefined ? {} : { age: options.age }),
        ...(options.fault === "encoded" ? { "content-encoding": "gzip" } : {}),
      });
      if (
        (token && options.fault === "token-limit") ||
        (!token && options.fault === "cert-limit")
      ) {
        reply.write(Buffer.alloc(token ? 65536 : 262144));
        reply.write("x");
        seen();
        return;
      }
      if (
        (token && options.fault === "slow-token") ||
        (!token && options.fault === "slow-certs")
      ) {
        reply.write("{");
        seen();
        return;
      }
      if (options.fault === "json") {
        reply.end("invalid-json");
        seen();
        return;
      }
      if (!token && options.fault === "certificate-unavailable") {
        reply.destroy();
        seen();
        return;
      }
      reply.end(
        JSON.stringify(
          token
            ? {
                id_token:
                  options.fault === "token-size"
                    ? "x".repeat(16385)
                    : jwt(options.claims?.(), options.header?.()),
              }
            : (options.certs?.() ?? { key: pem }),
        ),
      );
      seen();
    });
  });
  servers.add(server);
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw Error("fixture address");
  const factory: GoogleRequestFactory = (url, opts, onResponse) => {
    expect([tokenUrl, certUrl]).toContain(url.href);
    expect(url.protocol).toBe("https:");
    expect(opts.port).toBe(443);
    expect(opts.agent).toBe(false);
    const observation: Observation = {
      url: url.href,
      requestClosed: false,
      responseClosed: false,
      socketClosed: false,
      responseSeen: false,
      socketSeen: false,
    };
    observations.push(observation);
    const req = request(
      new URL(
        `http://127.0.0.1:${address.port}/${url.href === tokenUrl ? "token" : "certs"}`,
      ),
      { ...opts, port: address.port },
      (response) => {
        observation.responseSeen = true;
        response.once("close", () => {
          observation.responseClosed = true;
        });
        onResponse(response);
      },
    );
    req.once("socket", (socket) => {
      observation.socketSeen = true;
      socket.once("close", () => {
        observation.socketClosed = true;
      });
    });
    req.once("close", () => {
      observation.requestClosed = true;
    });
    return req;
  };
  const provider = new NodeGoogleOidc(
    config,
    { clock: { now: () => new Date() }, tokens },
    { requestFactory: factory },
  );
  const closed = () => {
    for (const o of observations) {
      expect(o.requestClosed).toBe(true);
      if (o.responseSeen) expect(o.responseClosed).toBe(true);
      if (o.socketSeen) expect(o.socketClosed).toBe(true);
    }
  };
  return { provider, observations, forms, requestSeen, closed, options };
}
function exchange(
  provider: NodeGoogleOidc,
  signal = new AbortController().signal,
) {
  const pending = provider.exchange({
    code: "synthetic-code",
    verifier,
    nonceHash: tokens.hash(base.nonce),
    signal,
  });
  operations.add(pending);
  void pending.finally(() => operations.delete(pending)).catch(() => {});
  return pending;
}

describe("NodeGoogleOidc with owned native fixed HTTP", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
  });
  afterEach(async () => {
    for (const socket of sockets) socket.destroy();
    await Promise.all(
      [...servers].map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
    );
    servers.clear();
    sockets.clear();
    await Promise.allSettled([...operations]);
    operations.clear();
    vi.useRealTimers();
  });

  it("uses fixed authorization endpoint, S256 and only identity scopes", async () => {
    const f = await setup();
    for (const mode of ["login", "link", "reauth"] as const) {
      const url = new URL(
        await f.provider.authorization({
          state: "state",
          nonce: "nonce",
          verifier,
          mode,
        }),
      );
      expect(url.origin + url.pathname).toBe(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      expect(url.searchParams.get("scope")).toBe("openid email profile");
      expect(url.searchParams.get("access_type")).toBe("online");
      expect(url.searchParams.get("nonce")).toBe("nonce");
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(url.searchParams.get("code_challenge")).toBe(
        createHash("sha256").update(verifier).digest("base64url"),
      );
    }
    expect(f.observations).toHaveLength(0);
  });

  it("verifies RSA and returns canonical claims only after all native ownership closes", async () => {
    const f = await setup({ claims: () => ({ iss: "accounts.google.com" }) });
    expect(await exchange(f.provider)).toEqual({
      issuer: "https://accounts.google.com",
      subject: base.sub,
      email: base.email,
      authoritative: true,
      issuedAt: new Date(base.iat * 1000),
      expiresAt: new Date(base.exp * 1000),
    });
    f.closed();
    expect(f.observations.map((o) => o.url)).toEqual([tokenUrl, certUrl]);
    const form = new URLSearchParams(f.forms[0]);
    expect(form.get("code_verifier")).toBe(verifier);
    expect(form.get("client_secret")).toBe(config.clientSecret);
    expect(form.get("grant_type")).toBe("authorization_code");
  });

  it.each([
    { email: "user@gmail.com.evil.test", expected: false },
    { email: "user@example.test", expected: false },
    { email: "user@example.test", hd: "example.test", expected: true },
  ])("uses exact Gmail or signed hd (%s)", async ({ expected, ...claims }) => {
    const f = await setup({ claims: () => claims });
    expect((await exchange(f.provider)).authoritative).toBe(expected);
    f.closed();
  });

  it.each([
    { iss: "https://invalid.example.test" },
    { aud: "other" },
    { aud: [config.clientId] },
    { azp: "other" },
    { email_verified: "true" },
    { email_verified: false },
    { nonce: "other" },
    { sub: "bad subject" },
    { sub: "" },
    { hd: " " },
    { iat: "123" },
    { iat: base.exp },
    { exp: now.getTime() / 1000 },
    { email: "invalid" },
  ])("rejects invalid signed claims (%s)", async (claims) => {
    const f = await setup({ claims: () => claims });
    await expect(exchange(f.provider)).rejects.toMatchObject({
      code: "AUTH_UNVERIFIED",
    });
    f.closed();
  });

  it.each([
    { alg: "none" },
    { alg: "ES256" },
    { kid: "unknown" },
  ])("rejects invalid headers (%s)", async (header) => {
    const f = await setup({ header: () => header });
    await expect(exchange(f.provider)).rejects.toMatchObject({
      code: "AUTH_UNVERIFIED",
    });
    expect(
      f.observations.filter((o) => o.url === certUrl).length,
    ).toBeLessThanOrEqual(1);
    f.closed();
  });

  it("rejects a modified signature", async () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const f = await setup({
      certs: () => ({
        key: other.publicKey.export({ type: "spki", format: "pem" }).toString(),
      }),
    });
    await expect(exchange(f.provider)).rejects.toMatchObject({
      code: "AUTH_UNVERIFIED",
    });
    f.closed();
  });

  it("shares certificate refresh and reuses the fresh cache", async () => {
    const f = await setup();
    await Promise.all([exchange(f.provider), exchange(f.provider)]);
    await exchange(f.provider);
    expect(f.observations.filter((o) => o.url === certUrl)).toHaveLength(1);
    f.closed();
  });

  it("refreshes once for unknown kid, caps freshness at six hours and never falls back to expired keys", async () => {
    let kid = "key";
    const f = await setup({
      header: () => ({ kid }),
      claims: () => ({
        iat: Date.now() / 1000 - 1,
        exp: Date.now() / 1000 + 3600,
      }),
      certs: () => ({ [kid]: pem }),
      cache: "max-age=86400",
    });
    await exchange(f.provider);
    kid = "rotated";
    await exchange(f.provider);
    expect(f.observations.filter((o) => o.url === certUrl)).toHaveLength(2);
    vi.setSystemTime(new Date(now.getTime() + 6 * 60 * 60_000));
    f.options.fault = "certificate-unavailable";
    await expect(exchange(f.provider)).rejects.toMatchObject({
      code: "AUTH_UNVERIFIED",
    });
    expect(f.observations.filter((o) => o.url === certUrl)).toHaveLength(3);
    f.closed();
  });

  it.each([
    "max-age=0",
    "no-store, max-age=3600",
    "no-cache, max-age=3600",
    "invalid",
  ])("uses fresh noncacheable certificates only for each exchange (%s)", async (cache) => {
    const f = await setup({ cache });
    await exchange(f.provider);
    await exchange(f.provider);
    expect(f.observations.filter((o) => o.url === certUrl)).toHaveLength(2);
    f.closed();
  });

  it("does not reuse exhausted Age and rejects more than 32 keys", async () => {
    const aged = await setup({ cache: "max-age=60", age: "60" });
    await exchange(aged.provider);
    await exchange(aged.provider);
    expect(aged.observations.filter((o) => o.url === certUrl)).toHaveLength(2);
    const many = await setup({
      certs: () =>
        Object.fromEntries(
          Array.from({ length: 33 }, (_, n) => [n ? `key${n}` : "key", pem]),
        ),
    });
    await expect(exchange(many.provider)).rejects.toMatchObject({
      code: "AUTH_UNVERIFIED",
    });
    aged.closed();
    many.closed();
  });

  it.each([
    "token-limit",
    "cert-limit",
  ] as const)("rejects size overflow and observes request/response/socket close before return (%s)", async (fault) => {
    const f = await setup({ fault });
    await expect(exchange(f.provider)).rejects.toMatchObject({
      code:
        fault === "token-limit" ? "AUTH_EXCHANGE_UNKNOWN" : "AUTH_UNVERIFIED",
    });
    f.closed();
  });

  it.each([
    "redirect",
    "encoded",
    "disconnect",
    "json",
  ] as const)("rejects HTTP faults without retry or secret exposure (%s)", async (fault) => {
    const f = await setup({ fault });
    const error: unknown = await exchange(f.provider).catch((value) => value);
    expect(error).toMatchObject({ code: "AUTH_EXCHANGE_UNKNOWN" });
    expect(error).not.toHaveProperty("cause");
    expect(String(error)).not.toContain(config.clientSecret);
    expect(JSON.stringify(error)).not.toContain(verifier);
    expect(f.observations).toHaveLength(1);
    f.closed();
  });

  it("rejects oversized code before any connection and ID token before certificates", async () => {
    const f = await setup({ fault: "token-size" });
    await expect(
      f.provider.exchange({
        code: "x".repeat(4097),
        verifier,
        nonceHash: tokens.hash(base.nonce),
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "AUTH_PROVIDER_REJECTED" });
    expect(f.observations).toHaveLength(0);
    await expect(exchange(f.provider)).rejects.toMatchObject({
      code: "AUTH_UNVERIFIED",
    });
    expect(f.observations).toHaveLength(1);
    f.closed();
  });

  it.each([
    "slow-token",
    "slow-certs",
  ] as const)("waits for native close on cancellation (%s)", async (fault) => {
    const f = await setup({ fault });
    const controller = new AbortController();
    const result = expect(
      exchange(f.provider, controller.signal),
    ).rejects.toMatchObject({
      code:
        fault === "slow-token" ? "AUTH_EXCHANGE_UNKNOWN" : "AUTH_UNVERIFIED",
    });
    if (fault === "slow-token") await f.requestSeen;
    else
      await vi.waitFor(() =>
        expect(
          f.observations.some((o) => o.url === certUrl && o.responseSeen),
        ).toBe(true),
      );
    controller.abort();
    await result;
    f.closed();
  });

  it("aborts the aggregate deadline and waits for native close", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const f = await setup({ fault: "slow-token" });
    const result = expect(exchange(f.provider)).rejects.toMatchObject({
      code: "AUTH_EXCHANGE_UNKNOWN",
    });
    await f.requestSeen;
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    f.closed();
  });

  it("honors a preaborted signal without creating a request", async () => {
    const f = await setup();
    await expect(exchange(f.provider, AbortSignal.abort())).rejects.toThrow();
    expect(f.observations).toHaveLength(0);
  });
});
