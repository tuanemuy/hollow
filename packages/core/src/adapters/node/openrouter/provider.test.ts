import { createHash } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  request,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import { OpenRouterProviderError } from "@repo/core/application/integration/openRouter/ports";
import {
  OPENROUTER_DEFAULT_STT,
  OPENROUTER_DEFAULT_TEXT,
} from "@repo/core/domain/integration/openRouter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenRouterRequestFactory } from "./http";
import { NodeOpenRouterProvider } from "./provider";

const verifier = "synthetic_verifier_".padEnd(64, "a");
const correlation = "c".repeat(43);
const credential = "synthetic-opaque-credential";
const servers = new Set<Server>();
const sockets = new Set<Socket>();
const operations = new Set<Promise<unknown>>();
let now: Date;
type Handler = (
  url: URL,
  reply: ServerResponse,
  incoming: IncomingMessage,
  body: string,
) => void;
type Observation = {
  requestClosed: boolean;
  responseSeen: boolean;
  responseClosed: boolean;
  socketSeen: boolean;
  socketClosed: boolean;
};

function model(id = "fixture/text", inputs = ["text"], outputs = ["text"]) {
  return {
    id,
    name: "Synthetic model",
    architecture: { input_modalities: inputs, output_modalities: outputs },
    expiration_date: null,
  };
}
function page(
  data: unknown[],
  total = data.length,
  next: string | null = null,
) {
  return { data, total_count: total, links: { next } };
}
function next(offset: number) {
  return `/api/v1/models?output_modalities=all&offset=${offset}&limit=500`;
}
function json(reply: ServerResponse, data: unknown) {
  reply.writeHead(200, { "content-type": "application/json" });
  reply.end(JSON.stringify(data));
}
function track<T>(promise: Promise<T>): Promise<T> {
  operations.add(promise);
  void promise.then(
    () => operations.delete(promise),
    () => operations.delete(promise),
  );
  return promise;
}
async function code(promise: Promise<unknown>) {
  try {
    await track(promise);
    return "accepted";
  } catch (error) {
    return error instanceof OpenRouterProviderError
      ? error.code
      : "unexpected-error";
  }
}

async function setup(handler?: Handler) {
  const observations: Observation[] = [];
  let resolveSeen = () => {};
  const seen = new Promise<void>((resolve) => {
    resolveSeen = resolve;
  });
  let requestCount = 0;
  const server = createServer((incoming, reply) => {
    const parts: Buffer[] = [];
    incoming.on("data", (chunk: Buffer) => parts.push(chunk));
    incoming.once("end", () => {
      requestCount++;
      const url = new URL(incoming.url ?? "/", "http://127.0.0.1");
      if (handler)
        handler(url, reply, incoming, Buffer.concat(parts).toString());
      else if (url.pathname === "/api/v1/auth/keys")
        json(reply, { key: credential });
      else if (url.pathname === "/api/v1/key")
        json(reply, {
          data: {
            expires_at: null,
            creator_user_id: "synthetic-owner",
            label: "synthetic-ignored-label",
          },
        });
      else json(reply, page([model()]));
      resolveSeen();
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
  if (!address || typeof address === "string")
    throw new Error("fixture address unavailable");
  const factory: OpenRouterRequestFactory = (url, options, onResponse) => {
    expect(
      url.origin === "https://openrouter.ai" &&
        ["/api/v1/auth/keys", "/api/v1/key", "/api/v1/models"].includes(
          url.pathname,
        ),
    ).toBe(true);
    expect(options.port === 443 && options.agent === false).toBe(true);
    const observation: Observation = {
      requestClosed: false,
      responseSeen: false,
      responseClosed: false,
      socketSeen: false,
      socketClosed: false,
    };
    observations.push(observation);
    const local = new URL(
      `${url.pathname}${url.search}`,
      `http://127.0.0.1:${address.port}`,
    );
    const req = request(
      local,
      { ...options, port: address.port },
      (response) => {
        observation.responseSeen = true;
        response.once("close", () => {
          observation.responseClosed = true;
        });
        onResponse(response);
      },
    );
    req.once("close", () => {
      observation.requestClosed = true;
    });
    req.once("socket", (socket) => {
      observation.socketSeen = true;
      socket.once("close", () => {
        observation.socketClosed = true;
      });
    });
    return req;
  };
  const provider = new NodeOpenRouterProvider(
    "https://hollow.example.test/base?discarded=yes",
    { now: () => now },
    factory,
  );
  const closed = () => {
    expect(
      observations.every(
        (o) =>
          o.requestClosed &&
          (!o.responseSeen || o.responseClosed) &&
          (!o.socketSeen || o.socketClosed),
      ),
    ).toBe(true);
  };
  return { provider, observations, seen, closed, count: () => requestCount };
}
const exchange = (
  provider: NodeOpenRouterProvider,
  signal = new AbortController().signal,
) => track(provider.exchange({ code: "synthetic-code", verifier, signal }));
const inspect = (
  provider: NodeOpenRouterProvider,
  signal = new AbortController().signal,
) => track(provider.inspectCredential({ credential, signal }));
const list = (
  provider: NodeOpenRouterProvider,
  signal = new AbortController().signal,
) => track(provider.list(signal));

describe("LLM profile separately from model selection", () => {
  const valid = () => ({
    ...model(),
    context_length: 200000,
    top_provider: { context_length: 100000, max_completion_tokens: 16000 },
    supported_parameters: ["max_tokens"],
  });
  it("uses validated live limits without changing the selection DTO", async () => {
    const fixture = await setup((_url, reply) => json(reply, page([valid()])));
    const profile = await track(
      fixture.provider.inspect("fixture/text", new AbortController().signal),
    );
    expect(profile.contextTokens).toBe(100000);
    expect(profile.outputTokens).toBe(16000);
    expect(profile.source).toBe("live");
    expect("contextTokens" in (await list(fixture.provider))[0]!).toBe(false);
    fixture.closed();
  });
  it("does not invent missing custom capabilities or damage model selection", async () => {
    const fixture = await setup();
    await expect(
      track(
        fixture.provider.inspect("fixture/text", new AbortController().signal),
      ),
    ).rejects.toHaveProperty("code", "LLM_MODEL_INCOMPATIBLE");
    expect((await list(fixture.provider)).length).toBe(1);
    fixture.closed();
  });
  it("allows only the versioned adopted default during catalog failure", async () => {
    const fixture = await setup((_url, reply) => {
      reply.writeHead(503);
      reply.end();
    });
    const value = await track(
      fixture.provider.inspect(
        OPENROUTER_DEFAULT_TEXT,
        new AbortController().signal,
      ),
    );
    expect(value.source).toBe("adopted-default");
    expect(value.contextTokens).toBe(1048576);
    await expect(
      track(
        fixture.provider.inspect(
          "fixture/custom",
          new AbortController().signal,
        ),
      ),
    ).rejects.toHaveProperty("code", "LLM_UNAVAILABLE");
    fixture.closed();
  });
  it("does not reuse stale custom profiles after fifteen minutes", async () => {
    let fail = false;
    const fixture = await setup((_url, reply) => {
      if (fail) {
        reply.writeHead(503);
        reply.end();
      } else json(reply, page([valid()]));
    });
    await track(
      fixture.provider.inspect("fixture/text", new AbortController().signal),
    );
    now = new Date(now.getTime() + 15 * 60000);
    fail = true;
    await expect(
      track(
        fixture.provider.inspect("fixture/text", new AbortController().signal),
      ),
    ).rejects.toHaveProperty("code", "LLM_UNAVAILABLE");
    fixture.closed();
  });
  it.each([
    "absent",
    "expired",
    "unsupported",
  ])("does not resurrect a known %s default via static fallback", async (mode) => {
    let fail = false;
    const fixture = await setup((_url, reply) => {
      if (fail) {
        reply.writeHead(503);
        reply.end();
        return;
      }
      json(
        reply,
        page(
          mode === "absent"
            ? []
            : [
                {
                  ...valid(),
                  id: OPENROUTER_DEFAULT_TEXT,
                  expiration_date: mode === "expired" ? "2026-09-01" : null,
                  supported_parameters:
                    mode === "unsupported" ? [] : ["max_tokens"],
                },
              ],
        ),
      );
    });
    await list(fixture.provider);
    now = new Date(now.getTime() + 15 * 60000);
    fail = true;
    await expect(
      track(
        fixture.provider.inspect(
          OPENROUTER_DEFAULT_TEXT,
          new AbortController().signal,
        ),
      ),
    ).rejects.toHaveProperty(
      "code",
      mode === "unsupported"
        ? "LLM_MODEL_INCOMPATIBLE"
        : "LLM_MODEL_UNAVAILABLE",
    );
    fixture.closed();
  });
});

beforeEach(() => {
  now = new Date("2026-09-28T00:00:00Z");
});
afterEach(async () => {
  for (const socket of sockets) socket.destroy();
  await Promise.all(
    [...servers].map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
  await Promise.allSettled([...operations]);
  sockets.clear();
  servers.clear();
  operations.clear();
  vi.useRealTimers();
});

describe("OpenRouter bounded provider with owned loopback transport", () => {
  it("constructs S256 authorization with correlation only in the fixed callback and no state assumption", async () => {
    const f = await setup();
    const authorization = new URL(
      await f.provider.authorization({ correlation, verifier }),
    );
    const callback = new URL(
      authorization.searchParams.get("callback_url") ??
        "https://invalid.example",
    );
    expect(
      authorization.origin === "https://openrouter.ai" &&
        authorization.pathname === "/auth",
    ).toBe(true);
    expect(
      callback.origin === "https://hollow.example.test" &&
        callback.pathname === "/auth/openrouter/callback" &&
        callback.searchParams.get("correlation") === correlation,
    ).toBe(true);
    expect(
      authorization.searchParams.get("code_challenge") ===
        createHash("sha256").update(verifier).digest("base64url"),
    ).toBe(true);
    expect(
      authorization.searchParams.get("code_challenge_method") === "S256" &&
        !authorization.searchParams.has("state") &&
        !callback.searchParams.has("discarded"),
    ).toBe(true);
    expect(f.count()).toBe(0);
  });

  it("uses bearer-free JSON exchange and projects only metadata after all native resources close", async () => {
    let formCorrect = false;
    let headersCorrect = false;
    const f = await setup((url, reply, incoming, body) => {
      if (url.pathname.endsWith("auth/keys")) {
        const data: unknown = JSON.parse(body);
        formCorrect =
          JSON.stringify(data) ===
          JSON.stringify({
            code: "synthetic-code",
            code_verifier: verifier,
            code_challenge_method: "S256",
          });
        headersCorrect =
          incoming.headers.authorization === undefined &&
          incoming.headers["content-type"] === "application/json" &&
          incoming.headers["accept-encoding"] === "identity";
        json(reply, { key: credential });
      } else {
        headersCorrect &&=
          incoming.headers.authorization === `Bearer ${credential}`;
        json(reply, {
          data: {
            expires_at: "2026-09-29T00:00:00Z",
            creator_user_id: "synthetic-owner",
            label: credential,
            key: credential,
          },
        });
      }
    });
    expect((await exchange(f.provider)) === credential).toBe(true);
    f.closed();
    const metadata = await inspect(f.provider);
    expect(
      metadata.expiresAt?.getTime() === Date.parse("2026-09-29T00:00:00Z") &&
        metadata.providerUserId === "synthetic-owner",
    ).toBe(true);
    expect(
      Object.keys(metadata).sort().join(",") === "expiresAt,providerUserId",
    ).toBe(true);
    expect(formCorrect && headersCorrect).toBe(true);
    f.closed();
  });

  it("accepts missing metadata fields as unknown rather than fabricating an identity or expiry", async () => {
    const f = await setup((_url, reply) => json(reply, { data: {} }));
    const result = await inspect(f.provider);
    expect(result.expiresAt === null && result.providerUserId === null).toBe(
      true,
    );
    f.closed();
  });

  it.each([
    401, 429, 500,
  ])("distinguishes metadata status %i without exposing response or native cause", async (status) => {
    const f = await setup((_url, reply) => {
      reply.writeHead(status);
      reply.end(credential);
    });
    let failure: unknown;
    try {
      await inspect(f.provider);
    } catch (error) {
      failure = error;
    }
    expect(failure instanceof OpenRouterProviderError).toBe(true);
    if (!(failure instanceof OpenRouterProviderError))
      throw new Error("safe provider error expected");
    expect(
      failure.code ===
        (status === 401
          ? "OPENROUTER_CREDENTIAL_INVALID"
          : "OPENROUTER_UNAVAILABLE"),
    ).toBe(true);
    expect(
      !("cause" in failure) &&
        !JSON.stringify(failure.toSerialized()).includes(credential),
    ).toBe(true);
    expect(f.count()).toBe(1);
    f.closed();
  });

  it.each([
    400, 403,
  ])("classifies explicit code exchange rejection %i without retry", async (status) => {
    const f = await setup((_url, reply) => {
      reply.writeHead(status);
      reply.end(credential);
    });
    expect(await code(exchange(f.provider))).toBe(
      "OPENROUTER_PROVIDER_REJECTED",
    );
    expect(f.count()).toBe(1);
    f.closed();
  });

  it("rejects a known expired credential without retaining provider label", async () => {
    const f = await setup((_url, reply) =>
      json(reply, {
        data: { expires_at: now.toISOString(), label: credential },
      }),
    );
    expect(await code(inspect(f.provider))).toBe(
      "OPENROUTER_CREDENTIAL_INVALID",
    );
    f.closed();
  });

  it("treats malformed metadata expiry as unavailable rather than invalid key", async () => {
    const f = await setup((_url, reply) =>
      json(reply, { data: { expires_at: "not-a-date" } }),
    );
    expect(await code(inspect(f.provider))).toBe("OPENROUTER_UNAVAILABLE");
    f.closed();
  });

  it("rejects oversized code and malformed credentials before any request", async () => {
    const f = await setup();
    expect(
      await code(
        f.provider.exchange({
          code: "x".repeat(4097),
          verifier,
          signal: new AbortController().signal,
        }),
      ),
    ).toBe("OPENROUTER_PROVIDER_REJECTED");
    expect(
      await code(
        f.provider.inspectCredential({
          credential: "synthetic\r\ninvalid",
          signal: new AbortController().signal,
        }),
      ),
    ).toBe("OPENROUTER_CREDENTIAL_INVALID");
    expect(f.count()).toBe(0);
  });

  it.each([
    "exchange",
    "metadata",
    "models",
  ] as const)("rejects a chunked %s overflow while waiting for all native close events", async (kind) => {
    const f = await setup((_url, reply) => {
      reply.writeHead(200);
      reply.write(
        Buffer.alloc(kind === "models" ? 2 * 1024 * 1024 : 64 * 1024),
      );
      reply.write("x");
    });
    expect(
      await code(
        kind === "exchange"
          ? exchange(f.provider)
          : kind === "metadata"
            ? inspect(f.provider)
            : list(f.provider),
      ),
    ).toBe("OPENROUTER_UNAVAILABLE");
    f.closed();
  });

  it.each([
    "redirect",
    "encoding",
    "json",
    "utf8",
    "disconnect",
  ] as const)("rejects %s without following, retrying or leaking content", async (kind) => {
    const f = await setup((_url, reply, incoming) => {
      if (kind === "disconnect") {
        incoming.socket.destroy();
        return;
      }
      reply.writeHead(
        kind === "redirect" ? 302 : 200,
        kind === "redirect"
          ? { location: "https://outside.example.test/forbidden" }
          : kind === "encoding"
            ? { "content-encoding": "gzip" }
            : {},
      );
      reply.end(kind === "utf8" ? Buffer.from([0xff]) : credential);
    });
    expect(await code(exchange(f.provider))).toBe("OPENROUTER_UNAVAILABLE");
    expect(f.count()).toBe(1);
    f.closed();
  });

  it.each([
    "exchange",
    "metadata",
    "models",
  ] as const)("propagates cancellation to slow %s and waits for close", async (kind) => {
    const f = await setup((_url, reply) => {
      reply.writeHead(200);
      reply.write("{");
    });
    const controller = new AbortController();
    const result = code(
      kind === "exchange"
        ? exchange(f.provider, controller.signal)
        : kind === "metadata"
          ? inspect(f.provider, controller.signal)
          : list(f.provider, controller.signal),
    );
    await f.seen;
    controller.abort();
    expect(await result).toBe("OPENROUTER_UNAVAILABLE");
    f.closed();
  });

  it("enforces the complete catalog operation deadline rather than resetting per page", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let releaseFirst = () => {};
    const f = await setup((url, reply) => {
      if (url.searchParams.get("offset") === "0")
        releaseFirst = () => json(reply, page([model()], 2, next(1)));
      else {
        reply.writeHead(200);
        reply.write("{");
      }
    });
    const result = code(list(f.provider));
    await f.seen;
    await vi.advanceTimersByTimeAsync(9_000);
    releaseFirst();
    await vi.waitFor(() => expect(f.count()).toBe(2));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await result).toBe("OPENROUTER_UNAVAILABLE");
    f.closed();
  });

  it("does not allocate a request for a preaborted signal", async () => {
    const f = await setup();
    expect(await code(list(f.provider, AbortSignal.abort()))).toBe(
      "OPENROUTER_UNAVAILABLE",
    );
    expect(f.observations.length).toBe(0);
  });

  it("projects text, image and transcription capability without confusing audio chat and caches for fifteen minutes", async () => {
    const f = await setup((_url, reply) =>
      json(
        reply,
        page([
          model("fixture/multimodal", ["text", "image"], ["text"]),
          model("fixture/stt", ["audio"], ["transcription"]),
          model("fixture/audio-chat", ["audio"], ["text"]),
          { ...model("fixture/expired"), expiration_date: "2026-09-27" },
        ]),
      ),
    );
    const result = await list(f.provider);
    expect(result.map((m) => [m.id, m.kinds])).toEqual([
      ["fixture/multimodal", ["chat-text", "chat-image"]],
      ["fixture/stt", ["stt-transcription"]],
      ["fixture/audio-chat", []],
      ["fixture/expired", ["chat-text"]],
    ]);
    expect(result[3]?.expiresAt?.getTime()).toBe(
      Date.parse("2026-09-27T00:00:00Z"),
    );
    now = new Date(now.getTime() + 15 * 60_000 - 1);
    await list(f.provider);
    expect(f.count()).toBe(1);
    now = new Date(now.getTime() + 1);
    await list(f.provider);
    expect(f.count()).toBe(2);
    f.closed();
  });

  it("rebuilds only fixed validated pagination and never caches a partial failure", async () => {
    let fail = true;
    const f = await setup((url, reply) => {
      expect(
        url.searchParams.get("output_modalities") === "all" &&
          url.searchParams.get("limit") === "500",
      ).toBe(true);
      if (url.searchParams.get("offset") === "0")
        json(reply, page([model()], 2, `https://openrouter.ai${next(1)}`));
      else if (fail) {
        reply.writeHead(503);
        reply.end();
      } else json(reply, page([model("fixture/second")], 2));
    });
    expect(await code(list(f.provider))).toBe("OPENROUTER_UNAVAILABLE");
    fail = false;
    expect((await list(f.provider)).length).toBe(2);
    expect(f.count()).toBe(4);
    f.closed();
  });

  it.each([
    "outside",
    "duplicate-param",
    "wrong-offset",
    "missing-next",
    "premature-end",
    "count-change",
    "duplicate-id",
    "missing-total",
  ] as const)("fails a whole inconsistent catalog (%s)", async (kind) => {
    const f = await setup((url, reply) => {
      if (url.searchParams.get("offset") !== "0") {
        json(
          reply,
          page(
            [
              model(
                kind === "duplicate-id" ? "fixture/text" : "fixture/second",
              ),
            ],
            kind === "count-change" ? 3 : 2,
          ),
        );
        return;
      }
      const link =
        kind === "outside"
          ? "https://outside.example.test/api/v1/models?offset=1&limit=500&output_modalities=all"
          : kind === "duplicate-param"
            ? `${next(1)}&offset=1`
            : kind === "wrong-offset"
              ? next(0)
              : kind === "missing-next"
                ? null
                : next(1);
      if (kind === "missing-total")
        json(reply, { data: [model()], links: { next: null } });
      else json(reply, page([model()], kind === "premature-end" ? 1 : 2, link));
    });
    expect(await code(list(f.provider))).toBe("OPENROUTER_UNAVAILABLE");
    expect(f.count()).toBe(
      kind === "count-change" || kind === "duplicate-id" ? 2 : 1,
    );
    f.closed();
  });

  it("accepts exactly 5000 candidates without requiring another page", async () => {
    const f = await setup((url, reply) => {
      const offset = Number(url.searchParams.get("offset"));
      json(
        reply,
        page(
          Array.from({ length: 500 }, (_, i) => model(`fixture/${offset + i}`)),
          5000,
          offset + 500 < 5000 ? next(offset + 500) : null,
        ),
      );
    });
    expect((await list(f.provider)).length).toBe(5000);
    expect(f.count()).toBe(10);
    f.closed();
  });

  it("limits fallback to adopted defaults and updates knowledge only from complete catalogs", async () => {
    let mode: "missing" | "partial" | "restored" = "missing";
    const fixture = await setup((_url, reply) => {
      if (mode === "missing")
        json(
          reply,
          page([
            {
              ...model(OPENROUTER_DEFAULT_TEXT, ["text", "image"]),
              expiration_date: "2026-09-27",
            },
          ]),
        );
      else if (mode === "partial")
        json(
          reply,
          page([model(OPENROUTER_DEFAULT_TEXT, ["text", "image"])], 2),
        );
      else
        json(
          reply,
          page([
            model(OPENROUTER_DEFAULT_TEXT, ["text", "image"]),
            model(OPENROUTER_DEFAULT_STT, ["audio"], ["transcription"]),
          ]),
        );
    });
    expect(fixture.provider.fallback().length).toBe(2);
    await fixture.provider.list(new AbortController().signal);
    expect(fixture.provider.fallback().length).toBe(0);
    now = new Date(now.getTime() + 16 * 60_000);
    mode = "partial";
    expect(
      await code(fixture.provider.list(new AbortController().signal)),
    ).toBe("OPENROUTER_UNAVAILABLE");
    expect(fixture.provider.fallback().length).toBe(0);
    mode = "restored";
    await fixture.provider.list(new AbortController().signal);
    expect(fixture.provider.fallback().length).toBe(2);
    expect(
      fixture.provider.fallback().every((entry) => entry.adoptionVersion === 1),
    ).toBe(true);
    fixture.closed();
  });

  it("rejects a catalog larger than 5000 rather than trimming it", async () => {
    const f = await setup((_url, reply) =>
      json(reply, page([model()], 5001, next(1))),
    );
    expect(await code(list(f.provider))).toBe("OPENROUTER_UNAVAILABLE");
    expect(f.count()).toBe(1);
    f.closed();
  });

  it("stops at twenty pages without returning an incomplete candidate list", async () => {
    const f = await setup((url, reply) => {
      const offset = Number(url.searchParams.get("offset"));
      json(reply, page([model(`fixture/${offset}`)], 21, next(offset + 1)));
    });
    expect(await code(list(f.provider))).toBe("OPENROUTER_UNAVAILABLE");
    expect(f.count()).toBe(20);
    f.closed();
  });

  it("enforces the aggregate eight MiB while consuming the final response and awaits close", async () => {
    const f = await setup((url, reply) => {
      const offset = Number(url.searchParams.get("offset"));
      const data = JSON.stringify(
        page(
          [model(`fixture/${offset}`)],
          5,
          offset < 4 ? next(offset + 1) : null,
        ),
      );
      reply.writeHead(200);
      reply.write(data.padEnd(1_800_000, " "));
      if (offset < 4) reply.end();
    });
    expect(await code(list(f.provider))).toBe("OPENROUTER_UNAVAILABLE");
    expect(f.count()).toBe(5);
    f.closed();
  });
});
