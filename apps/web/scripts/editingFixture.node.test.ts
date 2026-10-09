import { createServer } from "node:http";
import type { Socket } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalEditingReferenceFetcher } from "./editingFixture.node";

describe("trusted editing reference fixture admission and transport", () => {
  let server: ReturnType<typeof createServer>;
  let fetcher: LocalEditingReferenceFetcher;
  let origin: string;
  let count: number;
  let mode: "normal" | "headers-stall" | "body-stall";
  const sockets = new Set<Socket>();
  beforeEach(async () => {
    count = 0;
    mode = "normal";
    server = createServer((req, res) => {
      count++;
      if (mode === "headers-stall") return;
      if (req.url === "/missing.png") {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "text/css" });
      if (mode === "body-stall") {
        res.write("a");
        return;
      }
      res.end(".fixture { color: purple; }");
    });
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("fixture socket missing");
    origin = `http://127.0.0.1:${address.port}`;
    fetcher = new LocalEditingReferenceFetcher(origin, 200);
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    sockets.clear();
  });
  const body = (stream: ReadableStream<Uint8Array>) =>
    new Response(stream).text();
  const closed = () => expect.poll(() => sockets.size).toBe(0);

  it("permits only its exact origin and known paths without contacting rejected URLs", async () => {
    const urls = [
      "https://example.invalid/style.css",
      `${origin}/unknown`,
      `${origin}/style.css?secret=1`,
      origin.replace("127.0.0.1", "localhost") + "/style.css",
      `${origin}/style.css#fragment`,
    ];
    expect(
      (await fetcher.inspectMany(urls)).every((entry) => !entry.allowed),
    ).toBe(true);
    for (const url of urls)
      await expect(fetcher.fetch(url, { maxBytes: 1024 })).rejects.toThrow();
    expect(count).toBe(0);
    expect(await fetcher.inspect(`${origin}/style.css`)).toMatchObject({
      allowed: true,
      reason: null,
    });
    const response = await fetcher.fetch(`${origin}/style.css`, {
      maxBytes: 1024,
    });
    expect(response.finalUrl).toBe(`${origin}/style.css`);
    expect(response.contentType).toBe("text/css");
    expect(await body(response.body)).toBe(".fixture { color: purple; }");
    await closed();
  });

  it("rejects HTTP failures and oversize streams and closes native sockets", async () => {
    await expect(
      fetcher.fetch(`${origin}/missing.png`, { maxBytes: 1024 }),
    ).rejects.toThrow("404");
    const response = await fetcher.fetch(`${origin}/style.css`, {
      maxBytes: 1,
    });
    await expect(body(response.body)).rejects.toThrow("byte limit");
    await closed();
  });

  it.each([
    "headers-stall",
    "body-stall",
  ] as const)("enforces a finite deadline during %s", async (value) => {
    mode = value;
    const operation = fetcher
      .fetch(`${origin}/style.css`, { maxBytes: 1024 })
      .then((result) => body(result.body));
    await expect(operation).rejects.toThrow();
    await closed();
  });

  it("honors abortion before inspection and during streaming", async () => {
    const cancelled = AbortSignal.abort();
    await expect(
      fetcher.inspect(`${origin}/style.css`, { signal: cancelled }),
    ).rejects.toThrow();
    await expect(
      fetcher.fetch(`${origin}/style.css`, {
        maxBytes: 1024,
        signal: cancelled,
      }),
    ).rejects.toThrow();
    expect(count).toBe(0);
    mode = "body-stall";
    const controller = new AbortController();
    const response = await fetcher.fetch(`${origin}/style.css`, {
      maxBytes: 1024,
      signal: controller.signal,
    });
    controller.abort();
    await expect(body(response.body)).rejects.toThrow();
    await closed();
  });
});
