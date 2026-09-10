import { execFileSync } from "node:child_process";
import type { LookupAddress } from "node:dns";
import dns from "node:dns/promises";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NodeSafeReferenceFetcher } from "./safeFetcher";

const fetcher = new NodeSafeReferenceFetcher();
const realHttp = http.request.bind(http);
const realHttps = https.request.bind(https);
function dnsAll(
  resolve: (hostname: string) => Promise<LookupAddress[]>,
): typeof dns.lookup {
  return (async (hostname: string, options?: unknown) => {
    const answers = await resolve(hostname);
    if (
      options &&
      typeof options === "object" &&
      "all" in options &&
      options.all
    )
      return answers;
    const first = answers[0];
    if (!first) throw new Error("DNS empty");
    return first;
  }) as typeof dns.lookup;
}
let fixture: string;
let cert: Buffer;
let key: Buffer;
beforeAll(() => {
  fixture = mkdtempSync(path.join(os.tmpdir(), "hollow-reference-tls-"));
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      path.join(fixture, "key.pem"),
      "-out",
      path.join(fixture, "cert.pem"),
      "-days",
      "1",
      "-subj",
      "/CN=media.test",
      "-addext",
      "subjectAltName=DNS:media.test,DNS:cdn.test",
    ],
    { stdio: "ignore" },
  );
  cert = readFileSync(path.join(fixture, "cert.pem"));
  key = readFileSync(path.join(fixture, "key.pem"));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
afterAll(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

async function bytes(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

async function serverFixture(
  tls: boolean,
  fn: (input: {
    hits: { path: string; host: string | undefined; sni: string | undefined }[];
    pins: { hostname: string; address: string; family: number }[];
    closed: () => boolean;
  }) => Promise<void>,
) {
  const hits: {
    path: string;
    host: string | undefined;
    sni: string | undefined;
  }[] = [];
  const pins: { hostname: string; address: string; family: number }[] = [];
  let closed = false;
  const handler: http.RequestListener = (request, response) => {
    hits.push({
      path: request.url ?? "",
      host: request.headers.host,
      sni:
        "servername" in request.socket
          ? String(request.socket.servername)
          : undefined,
    });
    if (request.url === "/redirect") {
      response.writeHead(302, { location: "https://cdn.test/ok" });
      response.end();
    } else if (request.url === "/private") {
      response.writeHead(302, { location: "http://private.test/secret" });
      response.end();
    } else if (request.url === "/literal") {
      response.writeHead(302, { location: "http://127.0.0.1/secret" });
      response.end();
    } else if (request.url === "/loop") {
      response.writeHead(302, { location: "/loop" });
      response.end();
    } else if (request.url === "/slow") {
      request.socket.once("close", () => {
        closed = true;
      });
      response.writeHead(200);
      response.flushHeaders();
      response.write(Buffer.from([1, 2]));
    } else if (request.url === "/large") {
      response.writeHead(200);
      response.write(Buffer.alloc(700));
      response.end(Buffer.alloc(700));
    } else if (request.url === "/encoded") {
      response.writeHead(200, { "content-encoding": "gzip" });
      response.end("compressed");
    } else if (request.url === "/status") {
      response.writeHead(404);
      response.end("missing");
    } else {
      response.writeHead(200, { "content-type": "image/png" });
      response.end(Buffer.from([0, 255, 128, 1]));
    }
  };
  const server = tls
    ? https.createServer({ key, cert }, handler)
    : http.createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Listener address");
  const port = address.port;
  // Only this test transport maps a validated public address to its private fixture socket.
  const requestMock = (...args: unknown[]) => {
    const url = args[0] as URL;
    const options = args[1] as http.RequestOptions;
    const callback = args[2] as (message: http.IncomingMessage) => void;
    options.lookup?.(url.hostname, {}, (error, resolved, family) => {
      if (error || typeof resolved !== "string" || family === undefined)
        throw new Error("Pin lookup failed");
      pins.push({ hostname: url.hostname, address: resolved, family });
    });
    const mapped: https.RequestOptions = {
      ...options,
      port,
      ca: cert,
      headers: { ...options.headers, host: url.host },
      lookup(_hostname, _options, callback) {
        callback(null, "127.0.0.1", 4);
      },
    };
    return (tls ? realHttps : realHttp)(
      new URL(`${tls ? "https:" : "http:"}//${url.host}${url.pathname}`),
      mapped,
      callback,
    );
  };
  vi.spyOn(http, "request").mockImplementation(
    requestMock as typeof http.request,
  );
  vi.spyOn(https, "request").mockImplementation(
    requestMock as typeof https.request,
  );
  vi.spyOn(dns, "lookup").mockImplementation(
    dnsAll(async (hostname) =>
      hostname === "private.test"
        ? [{ address: "10.0.0.1", family: 4 }]
        : [{ address: "1.1.1.1", family: 4 }],
    ),
  );
  try {
    await fn({ hits, pins, closed: () => closed });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("production-shaped DNS admission with no public bypass", () => {
  it("rejects known internal hostnames before DNS even with forged public answers", async () => {
    const lookup = vi
      .spyOn(dns, "lookup")
      .mockImplementation(
        dnsAll(async () => [{ address: "1.1.1.1", family: 4 }]),
      );
    const connect = vi.spyOn(https, "request");
    for (const hostname of [
      "localhost",
      "metadata",
      "instance-data",
      "intranet",
      "host.localhost",
      "host.local",
      "metadata.google.internal",
      "router.home.arpa",
      "LOCALHOST.",
    ]) {
      expect(await fetcher.inspect(`https://${hostname}/`)).toMatchObject({
        allowed: false,
        reason: "REFERENCE_PRIVATE",
      });
    }
    expect(lookup).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });
  it("bounds render DNS inspection to eight concurrent lookups and five seconds total", async () => {
    vi.useFakeTimers();
    const lookup = vi
      .spyOn(dns, "lookup")
      .mockImplementation(dnsAll(() => new Promise(() => {})));
    const pending = fetcher.inspectMany(
      Array.from({ length: 200 }, (_, index) => `https://host${index}.test/a`),
    );
    expect(lookup).toHaveBeenCalledTimes(8);
    await vi.advanceTimersByTimeAsync(5001);
    const results = await pending;
    expect(results).toHaveLength(200);
    expect(
      results.every(
        (result) => !result.allowed && result.reason === "REFERENCE_TIMEOUT",
      ),
    ).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(8);
  });
  it("inspects at most 200 distinct URLs and reports uninspected excess", async () => {
    const lookup = vi
      .spyOn(dns, "lookup")
      .mockImplementation(
        dnsAll(async () => [{ address: "1.1.1.1", family: 4 }]),
      );
    const results = await fetcher.inspectMany(
      Array.from({ length: 202 }, (_, index) => `https://host${index}.test/a`),
    );
    expect(lookup).toHaveBeenCalledTimes(200);
    expect(results.slice(0, 200).every((result) => result.allowed)).toBe(true);
    expect(results[200]?.reason).toBe("REFERENCE_RESOURCE_LIMIT");
  });
  it("stops dependency inspection on the caller deadline without admitting further DNS work", async () => {
    const lookup = vi
      .spyOn(dns, "lookup")
      .mockImplementation(dnsAll(() => new Promise(() => {})));
    const controller = new AbortController();
    const pending = fetcher.inspectMany(
      Array.from({ length: 20 }, (_, i) => `https://dependency${i}.test/a`),
      { signal: controller.signal },
    );
    expect(lookup).toHaveBeenCalledTimes(8);
    controller.abort();
    const results = await pending;
    expect(
      results.every(
        (result) => !result.allowed && result.reason === "REFERENCE_CANCELLED",
      ),
    ).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(8);
  });
  it("rejects private, mixed and special DNS answers before creating any socket", async () => {
    const connect = vi.spyOn(http, "request");
    const secure = vi.spyOn(https, "request");
    const lookup = vi.spyOn(dns, "lookup");
    for (const answers of [
      [{ address: "10.0.0.1", family: 4 }],
      [
        { address: "1.1.1.1", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ],
      [{ address: "2001:db8::1", family: 6 }],
      [],
    ]) {
      lookup.mockImplementation(dnsAll(async () => answers));
      expect((await fetcher.inspect("https://media.test/a")).allowed).toBe(
        false,
      );
      await expect(
        fetcher.fetch("https://media.test/a", { maxBytes: 100 }),
      ).rejects.toMatchObject({ code: "REFERENCE_PRIVATE" });
    }
    expect(connect).not.toHaveBeenCalled();
    expect(secure).not.toHaveBeenCalled();
  });
  it("normalizes literal spelling tricks and rejects invalid schemes, credentials and ports", async () => {
    const lookup = vi.spyOn(dns, "lookup");
    const connect = vi.spyOn(http, "request");
    for (const url of [
      "http://127.1/",
      "http://2130706433/",
      "http://0x7f000001/",
      "http://0177.0.0.1/",
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[fc00::1]/",
      "http://[fe80::1]/",
      "http://169.254.169.254/",
      "http://100.64.0.1/",
      "http://0.0.0.0/",
      "http://192.0.2.1/",
      "file:///tmp/file",
      "http://u:p@media.test/",
      "https://media.test:80/",
      "http://media.test:8080/",
      `https://media.test/${"a".repeat(8192)}`,
    ])
      expect((await fetcher.inspect(url)).allowed).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(await fetcher.inspect("http://1.1.1.1:80/a#fragment")).toEqual({
      url: "http://1.1.1.1/a",
      allowed: true,
      reason: null,
    });
    expect(
      await fetcher.inspect("https://[2606:4700:4700::1111]:443/"),
    ).toMatchObject({ allowed: true });
  });
  it("expires stalled DNS and never opens a late-approved socket", async () => {
    vi.useFakeTimers();
    let release:
      | ((answers: { address: string; family: number }[]) => void)
      | undefined;
    vi.spyOn(dns, "lookup").mockImplementation(
      dnsAll(
        () =>
          new Promise<LookupAddress[]>((resolve) => {
            release = resolve;
          }),
      ),
    );
    const connect = vi.spyOn(https, "request");
    const result = expect(
      fetcher.fetch("https://media.test/a", { maxBytes: 100 }),
    ).rejects.toMatchObject({ code: "REFERENCE_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(30_001);
    await result;
    release?.([{ address: "1.1.1.1", family: 4 }]);
    await Promise.resolve();
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("pinned streaming transport using real fixture sockets", () => {
  it("preserves the original Host and public pin while returning exact binary bytes", () =>
    serverFixture(false, async ({ hits, pins }) => {
      const result = await fetcher.fetch("http://media.test/ok", {
        maxBytes: 100,
      });
      expect(await bytes(result.body)).toEqual(Buffer.from([0, 255, 128, 1]));
      expect(result.contentType).toBe("image/png");
      expect(hits[0]?.host).toBe("media.test");
      expect(pins).toEqual([
        { hostname: "media.test", address: "1.1.1.1", family: 4 },
      ]);
    }));
  it("preserves TLS SNI and certificate hostname verification across redirects", () =>
    serverFixture(true, async ({ hits, pins }) => {
      const result = await fetcher.fetch("https://media.test/redirect", {
        maxBytes: 100,
      });
      expect(await bytes(result.body)).toHaveLength(4);
      expect(result.finalUrl).toBe("https://cdn.test/ok");
      expect(hits.map((hit) => hit.sni)).toEqual(["media.test", "cdn.test"]);
      expect(pins.map((pin) => pin.hostname)).toEqual([
        "media.test",
        "cdn.test",
      ]);
      await expect(
        fetcher.fetch("https://wrong.test/ok", { maxBytes: 100 }),
      ).rejects.toMatchObject({ code: "REFERENCE_FETCH" });
      expect(hits).toHaveLength(2);
    }));
  it("rechecks redirect DNS/literals, never hits private targets, and limits redirects to five", () =>
    serverFixture(false, async ({ hits, pins }) => {
      for (const route of ["private", "literal"])
        await expect(
          fetcher.fetch(`http://media.test/${route}`, { maxBytes: 100 }),
        ).rejects.toMatchObject({ code: "REFERENCE_PRIVATE" });
      expect(hits.some((hit) => hit.path === "/secret")).toBe(false);
      expect(pins).toHaveLength(2);
      await expect(
        fetcher.fetch("http://media.test/loop", { maxBytes: 100 }),
      ).rejects.toMatchObject({ code: "REFERENCE_REDIRECT" });
      expect(hits.filter((hit) => hit.path === "/loop")).toHaveLength(6);
    }));
  it("enforces actual streamed bytes and rejects compressed/status responses", () =>
    serverFixture(false, async () => {
      const result = await fetcher.fetch("http://media.test/large", {
        maxBytes: 1024,
      });
      await expect(bytes(result.body)).rejects.toMatchObject({
        code: "REFERENCE_SIZE",
      });
      await expect(
        fetcher.fetch("http://media.test/encoded", { maxBytes: 1024 }),
      ).rejects.toMatchObject({ code: "REFERENCE_ENCODING" });
      await expect(
        fetcher.fetch("http://media.test/status", { maxBytes: 1024 }),
      ).rejects.toMatchObject({ code: "REFERENCE_FETCH" });
    }));
  it("keeps the 30-second deadline through body completion and destroys a stalled socket", () =>
    serverFixture(false, async ({ closed }) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const result = await fetcher.fetch("http://media.test/slow", {
        maxBytes: 1024,
      });
      const failure = expect(bytes(result.body)).rejects.toMatchObject({
        code: "REFERENCE_TIMEOUT",
      });
      await vi.advanceTimersByTimeAsync(30_001);
      await failure;
      vi.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(closed()).toBe(true);
    }));
  it("propagates caller cancellation to an active stream and cancels unread bodies", () =>
    serverFixture(false, async ({ closed }) => {
      const controller = new AbortController();
      const result = await fetcher.fetch("http://media.test/slow", {
        maxBytes: 1024,
        signal: controller.signal,
      });
      const failure = expect(bytes(result.body)).rejects.toMatchObject({
        code: "REFERENCE_CANCELLED",
      });
      controller.abort();
      await failure;
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(closed()).toBe(true);
      const unread = await fetcher.fetch("http://media.test/slow", {
        maxBytes: 1024,
      });
      await unread.body.cancel();
    }));
});
