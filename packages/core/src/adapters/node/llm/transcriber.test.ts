import { createHash } from "node:crypto";
import { createServer, request, type Server } from "node:http";
import type { Socket } from "node:net";
import type {
  AudioChunk,
  LlmTranscriber,
} from "@repo/core/application/llm/audioPorts";
import { afterEach, describe, expect, it } from "vitest";
import { NodeLlmTranscriber } from "./transcriber";

const servers = new Set<Server>();
const sockets = new Set<Socket>();
const controllers = new Set<AbortController>();
const operations = new Set<Promise<unknown>>();
afterEach(async () => {
  for (const c of controllers) c.abort();
  await Promise.allSettled(operations);
  for (const s of sockets) s.destroy();
  await Promise.all(
    [...servers].map((s) => new Promise<void>((r) => s.close(() => r()))),
  );
  servers.clear();
  sockets.clear();
  controllers.clear();
  operations.clear();
});
function chunk(): AudioChunk {
  const bytes = Buffer.alloc(244);
  bytes.write("RIFF");
  bytes.writeUInt32LE(236, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24);
  bytes.writeUInt32LE(32000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(200, 40);
  return {
    mimeType: "audio/wav",
    sampleRate: 16000,
    channels: 1,
    bytes,
    identity: {
      kind: "prepared-audio-chunk",
      ordinal: 0,
      startFrame: 0,
      frames: 100,
      bytes: 244,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}
const input = (): Parameters<LlmTranscriber["transcribe"]>[0] => ({
  dispatchId: "owned-dispatch",
  credential: "synthetic-key",
  model: {
    kind: "stt-transcription",
    modelId: "openai/whisper-large-v3",
    source: "adopted-default",
    checkedAt: new Date("2026-10-13T00:00:00Z"),
  },
  input: chunk(),
});
async function fixture(
  value: unknown = {
    text: "日本語の文字起こしです。",
    usage: { input_tokens: 10, output_tokens: 5 },
  },
  status = 200,
) {
  let count = 0;
  let wire: unknown;
  const closed = { request: false, response: false, socket: false };
  const server = createServer((incoming, reply) => {
    const body: Buffer[] = [];
    incoming.on("data", (b) => body.push(b));
    incoming.once("end", () => {
      count++;
      wire = JSON.parse(Buffer.concat(body).toString("utf8"));
      reply.writeHead(status, { "Content-Type": "application/json" });
      reply.end(JSON.stringify(value));
    });
  });
  servers.add(server);
  server.on("connection", (s) => {
    sockets.add(s);
    s.once("close", () => sockets.delete(s));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Owned address missing");
  const transcriber = new NodeLlmTranscriber((url, options, receive) => {
    expect(url.href).toBe("https://openrouter.ai/api/v1/audio/transcriptions");
    expect(options).toMatchObject({ method: "POST", port: 443, agent: false });
    const req = request(
      new URL(url.pathname, `http://127.0.0.1:${address.port}`),
      { ...options, port: address.port },
      (res) => {
        res.once("close", () => {
          closed.response = true;
        });
        receive(res);
      },
    );
    req.once("close", () => {
      closed.request = true;
    });
    req.once("socket", (s) =>
      s.once("close", () => {
        closed.socket = true;
      }),
    );
    return req;
  });
  const controller = new AbortController();
  controllers.add(controller);
  const run = (data = input()) => {
    const work = transcriber.transcribe(data, controller.signal);
    operations.add(work);
    return work;
  };
  return { run, wire: () => wire, count: () => count, closed };
}
describe("owned STT wire contract", () => {
  it("sends exact deny/ZDR JSON and complete WAV without chat-only routing properties", async () => {
    const f = await fixture();
    const data = input();
    await expect(f.run(data)).resolves.toEqual({
      kind: "transcript",
      text: "日本語の文字起こしです。",
      inputTokens: 10,
      outputTokens: 5,
    });
    expect(f.wire()).toEqual({
      model: "openai/whisper-large-v3",
      input_audio: {
        data: Buffer.from(data.input.bytes).toString("base64"),
        format: "wav",
      },
      response_format: "json",
      provider: { data_collection: "deny", zdr: true },
    });
    expect(f.count()).toBe(1);
    expect(f.closed).toEqual({ request: true, response: true, socket: true });
  });
  it("persists an empty transcription as a response without inventing speech", async () => {
    const f = await fixture({ text: "" });
    await expect(f.run()).resolves.toMatchObject({
      kind: "transcript",
      text: "",
    });
    expect(f.closed.socket).toBe(true);
  });
  it.each([
    { text: 1 },
    { text: "text", error: { message: "private-provider-body" } },
    { text: "text", usage: { input_tokens: -1 } },
    { text: "x".repeat(65537) },
  ])("rejects malformed/oversize response with native closure", async (value) => {
    const f = await fixture(value);
    await expect(f.run()).rejects.toMatchObject({
      delivery: "possible",
      closed: true,
    });
    expect(f.count()).toBe(1);
    expect(f.closed.socket).toBe(true);
  });
  it.each([401, 402, 429, 500])("does not resend HTTP %i", async (status) => {
    const f = await fixture({ error: "private-provider-body" }, status);
    await expect(f.run()).rejects.toMatchObject({
      delivery: "possible",
      closed: true,
    });
    expect(f.count()).toBe(1);
    expect(f.closed.socket).toBe(true);
  });
  it("refuses changed WAV hash before transmission", async () => {
    const f = await fixture();
    const data = input();
    data.input.bytes[44] = 1;
    await expect(f.run(data)).rejects.toMatchObject({
      code: "LLM_SOURCE_INVALID",
      delivery: "not-sent",
      closed: true,
    });
    expect(f.count()).toBe(0);
  });
});
