import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  link,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type {
  LlmAudioPreparer,
  OwnedAudioPrepared,
} from "@repo/core/application/llm/audioPorts";
import type {
  LlmNativeBirth,
  LlmNativeInputOwner,
} from "@repo/core/application/llm/ports";
import { AUDIO_LIMITS, type AudioRecipe } from "@repo/core/domain/llm/audio";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AudioChildFactory, NodeLlmAudioPreparer } from "./audioPreparer";
import { readNodeAudioTools, validateAudioTools } from "./audioTools";

const tools = {
  ffmpegPath: "/synthetic/ffmpeg",
  ffprobePath: "/synthetic/ffprobe",
  pythonPath: "/synthetic/python",
};
const recipe: AudioRecipe = {
  sttModelId: "synthetic/stt",
  pipelineVersion: 1,
  decoderPolicy: "ffmpeg-8.0.1-pcm16-16k-v1",
};
type Input = Parameters<LlmAudioPreparer["prepare"]>[0];
type NativeRecord = {
  child: ChildProcess;
  mode: string;
  closed: Promise<void>;
  pipes: Set<unknown>;
};
type NativeMutation = Readonly<{
  probeSuffix?: string;
  probeSamples?: number;
  channels?: number;
  streamCount?: number;
  extraStream?: boolean;
  warning?: boolean;
  dropBytes?: number;
  hangDecode?: boolean;
  rss?: number;
  invalidSampler?: boolean;
}>;
let root = "";
const records: NativeRecord[] = [];
const prepared: OwnedAudioPrepared[] = [];
const controllers: AbortController[] = [];

beforeEach(async () => {
  const directory = process.env.HOLLOW_LLM_TEST_DIRECTORY;
  if (!directory) throw new Error("Dedicated audio test root is required");
  root = await mkdtemp(path.join(directory, "audio-contract-"));
});
afterEach(async () => {
  for (const controller of controllers) controller.abort();
  await Promise.allSettled(prepared.map((value) => value.close()));
  await Promise.all(records.map((value) => value.closed));
  for (const value of records) {
    expect(value.pipes.size).toBe(4);
    expect(value.child.pid).toBeDefined();
    expect(() => process.kill(value.child.pid ?? -1, 0)).toThrow();
  }
  await rm(root, { recursive: true });
  controllers.length = 0;
  records.length = 0;
  prepared.length = 0;
  vi.restoreAllMocks();
});

function waveform(frames = 1600, channels = 2) {
  const bytes = new Uint8Array(44 + frames * channels * 2);
  const view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  view.setUint32(4, bytes.length - 8, true);
  bytes.set(new TextEncoder().encode("WAVEfmt "), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 16000 * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  bytes.set(new TextEncoder().encode("data"), 36);
  view.setUint32(40, bytes.length - 44, true);
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      view.setInt16(
        44 + (frame * channels + channel) * 2,
        (frame * 17 + channel * 257) % 32000,
        true,
      );
    }
  }
  return bytes;
}
function source(bytes: Uint8Array): Input["source"] {
  return {
    kind: "original",
    originalId: "00000000-0000-4000-8000-000000000001",
    format: "audio",
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
function signal() {
  const controller = new AbortController();
  controllers.push(controller);
  return controller;
}
function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function owner() {
  const births = new Map<LlmNativeBirth, { pid: number | null }>();
  const events: string[] = [];
  let next = 0;
  let failingClose = false;
  let closeGate: Promise<void> | null = null;
  const native: LlmNativeInputOwner = {
    reserve: async () => {
      const value = { birthId: `native-${++next}` };
      births.set(value, { pid: null });
      events.push("reserve");
      return value;
    },
    reserveMany: async (count, abort) => {
      if (abort.aborted || births.size + count > 2)
        throw new Error("Illegal native admission");
      events.push(`reserve-${count}`);
      const values: LlmNativeBirth[] = [];
      for (let index = 0; index < count; index++)
        values.push(await native.reserve());
      return values;
    },
    register: async (birth, pid) => {
      const entry = births.get(birth);
      if (
        !entry ||
        entry.pid !== null ||
        !records.some((value) => value.child.pid === pid)
      )
        throw new Error("Unowned native registration");
      entry.pid = pid;
      events.push("register");
    },
    closed: async (birth) => {
      const entry = births.get(birth);
      const child = records.find((value) => value.child.pid === entry?.pid);
      if (
        !entry ||
        !child ||
        (!child.child.killed && child.child.exitCode === null) ||
        child.pipes.size !== 4
      )
        throw new Error("Physical close is unproven");
      expect(() => process.kill(entry.pid ?? -1, 0)).toThrow();
      events.push("close-request");
      if (closeGate) await closeGate;
      if (failingClose) throw new Error("Closure authority unavailable");
      births.delete(birth);
      events.push("closed");
    },
  };
  return {
    native,
    births,
    events,
    holdClose(value: Promise<void> | null) {
      closeGate = value;
    },
    failClose(value: boolean) {
      failingClose = value;
    },
    async release() {
      failingClose = false;
      closeGate = null;
      await Promise.all(
        [...births.keys()].map((birth) => native.closed(birth)),
      );
    },
  };
}

function factory(mutation: NativeMutation = {}): AudioChildFactory {
  return (_file, args, options) => {
    const mode = args[3] ?? "";
    expect(["probe", "decode", "rss"]).toContain(mode);
    expect(options.env).toEqual({});
    expect(options.shell).toBeUndefined();
    if (mode !== "rss") {
      expect(args).toContain("-protocol_whitelist");
      expect(args).toContain("file,pipe");
      expect(args).toContain("wav,mp3,ogg,flac");
      expect(args).not.toContain("mov");
    }
    if (mode === "decode") expect(args).toContain("-reinit_filter");
    const script = `
      const fs=require('node:fs');
      const {pipeline}=require('node:stream');
      const mode=${JSON.stringify(mode)};
      const config=${JSON.stringify(mutation)};
      fs.writeSync(3,'READY\\n');
      let pending='';let started=false;
      process.stdin.on('data',part=>{
        pending+=part.toString('ascii');
        while(pending.includes('\\n')){
          const newline=pending.indexOf('\\n');const command=pending.slice(0,newline);pending=pending.slice(newline+1);
          if(command==='STOP'&&mode==='rss'){
            fs.writeSync(1,'{"event":"closed"}\\n');process.exit(0);
          }
          if(command!=='GO'||started)process.exit(78);
          started=true;fs.closeSync(3);
          if(mode==='rss'){
            fs.writeSync(1,config.invalidSampler?'{"event":"sample","rss":1,"extra":true}\\n':JSON.stringify({event:'sample',rss:config.rss??16000000})+'\\n');
          }else if(mode==='probe'){
            const input=fs.readFileSync('source.bin');
            const channels=config.channels??input.readUInt16LE(22);
            const samples=config.probeSamples??((input.length-44)/(input.readUInt16LE(22)*2));
            const line='frame|media_type=audio|stream_index=0|nb_samples='+samples+'|channels='+channels+'\\n';
            const stream='stream|index=0|codec_type=audio|codec_name=pcm_s16le|sample_rate=16000|channels='+channels+'\\n';
            fs.writeSync(1,line+stream+(config.extraStream?stream.replace('index=0','index=1'):'')+'format|format_name=wav|nb_streams='+(config.streamCount??1)+'|size='+input.length+'\\n'+(config.probeSuffix??''));
            if(config.warning)fs.writeSync(2,'synthetic trailing decoder warning\\n');
            process.exit(0);
          }else if(config.hangDecode){setInterval(()=>{},1000);
          }else{
            const size=fs.statSync('source.bin').size;
            pipeline(fs.createReadStream('source.bin',{start:44,end:size-1-(config.dropBytes??0)}),process.stdout,error=>process.exit(error?1:0));
          }
        }
      });
      process.stdin.on('end',()=>{if(mode==='rss')process.exit(78);});
    `;
    const child = spawn(process.execPath, ["-e", script], options);
    const pipes = new Set<unknown>();
    for (const pipe of child.stdio) pipe?.once("close", () => pipes.add(pipe));
    const closed = new Promise<void>((resolve) =>
      child.once("close", () => resolve()),
    );
    records.push({ child, mode, pipes, closed });
    return child;
  };
}
async function prepare(
  bytes: Uint8Array,
  mutation: NativeMutation = {},
  ownership = owner(),
  controller = signal(),
) {
  const adapter = new NodeLlmAudioPreparer(tools, root, {
    spawn: factory(mutation),
  });
  const value = await adapter.prepare(
    {
      source: source(bytes),
      recipe,
      native: ownership.native,
      copy: async (sink, abort) => {
        for (let offset = 0; offset < bytes.length; offset += 65536) {
          if (abort.aborted) throw new Error("Source cancelled");
          await sink.write(bytes.subarray(offset, offset + 65536));
        }
      },
    },
    controller.signal,
  );
  prepared.push(value);
  return { value, ownership };
}

describe("audio spool, full coverage and owned native boundary", () => {
  it("preserves independent stereo PCM through two registered and physically closed pairs", async () => {
    const bytes = waveform(1601, 2);
    const { value, ownership } = await prepare(bytes);
    expect(records.map((record) => record.mode)).toEqual([
      "probe",
      "rss",
      "decode",
      "rss",
    ]);
    expect(records.every((record) => record.pipes.size === 4)).toBe(true);
    expect(ownership.births.size).toBe(0);
    expect(
      ownership.events.filter((event) => event === "reserve-2"),
    ).toHaveLength(2);
    expect(value.manifest).toMatchObject({
      sampleRate: 16000,
      channels: 2,
      totalFrames: 1601,
      source: source(bytes),
      recipe,
    });
    expect(value.manifest.chunks).toHaveLength(1);
    const identity = value.manifest.chunks[0];
    if (!identity) throw new Error("Missing full input chunk");
    const chunk = await value.readChunk(identity, signal().signal);
    expect(Buffer.from(chunk.bytes)).toEqual(Buffer.from(bytes));
    expect(chunk.identity.sha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    await value.close();
    await expect(value.closed).resolves.toBeUndefined();
    expect(await readdir(root)).toEqual([]);
  });

  it("seals the complete 120-second chunk and the last sample without a gap", async () => {
    const frames = 1_920_000;
    const bytes = waveform(frames + 1, 1);
    const { value } = await prepare(bytes);
    expect(
      value.manifest.chunks.map((chunk) => [
        chunk.ordinal,
        chunk.startFrame,
        chunk.frames,
      ]),
    ).toEqual([
      [0, 0, 1_920_000],
      [1, 1_920_000, 1],
    ]);
    expect(value.manifest.totalFrames).toBe(1_920_001);
    expect(value.manifest.chunks.map((chunk) => chunk.bytes)).toEqual([
      3_840_044, 46,
    ]);
    const restored: Buffer[] = [];
    for (const identity of value.manifest.chunks)
      restored.push(
        Buffer.from(
          (await value.readChunk(identity, signal().signal)).bytes,
        ).subarray(44),
      );
    expect(
      Buffer.concat(restored).equals(Buffer.from(bytes).subarray(44)),
    ).toBe(true);
  });

  it("keeps all eight channels and splits at the WAV byte boundary before 120 seconds", async () => {
    const frames = Math.floor((AUDIO_LIMITS.chunkBytes - 44) / 16);
    const bytes = waveform(frames + 1, 8);
    const { value } = await prepare(bytes);
    expect(value.manifest.channels).toBe(8);
    expect(
      value.manifest.chunks.map((chunk) => [
        chunk.startFrame,
        chunk.frames,
        chunk.bytes,
      ]),
    ).toEqual([
      [0, frames, 44 + frames * 16],
      [frames, 1, 60],
    ]);
    const second = value.manifest.chunks[1];
    if (!second) throw new Error("Missing final eight-channel frame");
    expect(
      Buffer.from(
        (await value.readChunk(second, signal().signal)).bytes,
      ).subarray(44),
    ).toEqual(Buffer.from(bytes).subarray(bytes.length - 16));
  });

  it.each([
    [{ channels: 9 }, "LLM_AUDIO_UNSUPPORTED"],
    [{ extraStream: true, streamCount: 2 }, "LLM_AUDIO_UNSUPPORTED"],
    [{ probeSamples: 1599 }, "LLM_AUDIO_CORRUPT"],
    [
      {
        probeSuffix:
          "frame|media_type=audio|stream_index=0|nb_samples=1|channels=1\n",
      },
      "LLM_AUDIO_UNSUPPORTED",
    ],
    [{ probeSuffix: "{" }, "LLM_AUDIO_CORRUPT"],
    [{ warning: true }, "LLM_AUDIO_CORRUPT"],
    [{ dropBytes: 1 }, "LLM_AUDIO_CORRUPT"],
    [{ dropBytes: 4 }, "LLM_AUDIO_CORRUPT"],
  ] as const)("rejects frame/metadata/EOF mutation %j without publishing partial preparation", async (mutation, code) => {
    await expect(prepare(waveform(), mutation)).rejects.toMatchObject({
      code,
      delivery: "not-sent",
      closed: true,
    });
    expect(await readdir(root)).toEqual([]);
    expect(prepared).toHaveLength(0);
    expect(records.every((record) => record.pipes.size === 4)).toBe(true);
  });

  it.each([
    [{ rss: AUDIO_LIMITS.nativeMemoryBytes + 1 }, "LLM_RESOURCE_LIMIT"],
    [{ invalidSampler: true }, "LLM_SOURCE_INVALID"],
  ] as const)("stops the tool on sampler failure %j and waits for both physical closes", async (mutation, code) => {
    await expect(prepare(waveform(), mutation)).rejects.toMatchObject({
      code,
      closed: true,
    });
    expect(records).toHaveLength(2);
    expect(records.every((record) => record.pipes.size === 4)).toBe(true);
    expect(await readdir(root)).toEqual([]);
  });

  it("does not admit decode or publish a manifest while pair closure acknowledgement is pending", async () => {
    const ownership = owner();
    const gate = deferred();
    ownership.holdClose(gate.promise);
    let finished = false;
    const result = prepare(waveform(), {}, ownership).finally(() => {
      finished = true;
    });
    await vi.waitFor(() =>
      expect(
        ownership.events.filter((event) => event === "close-request"),
      ).toHaveLength(2),
    );
    expect(finished).toBe(false);
    expect(records.map((record) => record.mode)).toEqual(["probe", "rss"]);
    expect(ownership.births.size).toBe(2);
    ownership.holdClose(null);
    gate.resolve();
    await result;
    expect(ownership.births.size).toBe(0);
  });

  it("retains private spool and native authority after an unproven closure", async () => {
    const ownership = owner();
    ownership.failClose(true);
    await expect(prepare(waveform(), {}, ownership)).rejects.toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      closed: false,
    });
    expect(ownership.births.size).toBe(2);
    expect(records).toHaveLength(2);
    expect(await readdir(root)).toHaveLength(1);
    expect(prepared).toHaveLength(0);
    await ownership.release();
  });

  it("cancels a live native decode and releases only after its pair has actually closed", async () => {
    const controller = signal();
    const ownership = owner();
    const result = prepare(
      waveform(),
      { hangDecode: true },
      ownership,
      controller,
    );
    const rejection = expect(result).rejects.toMatchObject({
      code: "LLM_TIMEOUT",
      closed: true,
    });
    await vi.waitFor(() =>
      expect(records.some((record) => record.mode === "decode")).toBe(true),
    );
    controller.abort();
    await rejection;
    expect(records.every((record) => record.pipes.size === 4)).toBe(true);
    expect(ownership.births.size).toBe(0);
    expect(await readdir(root)).toEqual([]);
  });

  it("rejects source hash drift and over-limit identity before any native birth", async () => {
    const bytes = waveform();
    const native = owner();
    const adapter = new NodeLlmAudioPreparer(tools, root, { spawn: factory() });
    const input: Input = {
      source: { ...source(bytes), sha256: "0".repeat(64) },
      recipe,
      native: native.native,
      copy: async (sink) => {
        await sink.write(bytes);
      },
    };
    await expect(adapter.prepare(input, signal().signal)).rejects.toMatchObject(
      { code: "LLM_SOURCE_CHANGED", closed: true },
    );
    await expect(
      adapter.prepare(
        {
          ...input,
          source: { ...input.source, bytes: AUDIO_LIMITS.sourceBytes + 1 },
        },
        signal().signal,
      ),
    ).rejects.toMatchObject({ code: "LLM_RESOURCE_LIMIT", closed: true });
    expect(native.events).toEqual([]);
    expect(records).toEqual([]);
    expect(await readdir(root)).toEqual([]);
  });

  it("bounds copy chunks and checks the original's complete byte count", async () => {
    const bytes = waveform(20000, 2);
    const native = owner();
    const adapter = new NodeLlmAudioPreparer(tools, root, { spawn: factory() });
    await expect(
      adapter.prepare(
        {
          source: source(bytes),
          recipe,
          native: native.native,
          copy: async (sink) => {
            await sink.write(bytes);
          },
        },
        signal().signal,
      ),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_INVALID", closed: true });
    await expect(
      adapter.prepare(
        {
          source: source(bytes),
          recipe,
          native: native.native,
          copy: async (sink) => {
            await sink.write(bytes.subarray(0, 64));
          },
        },
        signal().signal,
      ),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_CHANGED", closed: true });
    expect(native.events).toEqual([]);
    expect(await readdir(root)).toEqual([]);
  });

  it("detects prepared file mutation on read and never serves a changed chunk", async () => {
    const { value } = await prepare(waveform());
    const identity = value.manifest.chunks[0];
    if (!identity) throw new Error("Missing chunk");
    const name = (await readdir(root))[0];
    if (!name) throw new Error("Missing owned private directory");
    const file = path.join(root, name, "chunk-0.wav");
    const bytes = await readFile(file);
    bytes[44] = (bytes[44] ?? 0) ^ 1;
    await writeFile(file, bytes);
    await expect(
      value.readChunk(identity, signal().signal),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_CHANGED" });
    await value.close();
    await expect(value.closed).resolves.toBeUndefined();
  });

  it("rejects a foreign chunk identity and prevents reads after cleanup", async () => {
    const { value } = await prepare(waveform());
    const identity = value.manifest.chunks[0];
    if (!identity) throw new Error("Missing chunk");
    await expect(
      value.readChunk({ ...identity, sha256: "0".repeat(64) }, signal().signal),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_CHANGED" });
    await value.close();
    await value.close();
    await expect(value.closed).resolves.toBeUndefined();
    await expect(
      value.readChunk(identity, signal().signal),
    ).rejects.toMatchObject({ code: "LLM_OWNERSHIP_UNKNOWN", closed: false });
  });

  it("preserves scratch and rejects both close receipts when the owned directory cannot be verified", async () => {
    const { value } = await prepare(waveform());
    const name = (await readdir(root))[0];
    if (!name) throw new Error("Missing owned private directory");
    const retained = path.join(root, `${name}-retained`);
    await rename(path.join(root, name), retained);
    const rejections: unknown[] = [];
    const observe = (reason: unknown) => {
      rejections.push(reason);
    };
    process.on("unhandledRejection", observe);
    try {
      await expect(value.close()).rejects.toMatchObject({
        code: "LLM_OWNERSHIP_UNKNOWN",
        closed: false,
      });
      await expect(value.closed).rejects.toMatchObject({
        code: "LLM_OWNERSHIP_UNKNOWN",
        closed: false,
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(rejections).toEqual([]);
      expect(await readdir(retained)).toContain("chunk-0.wav");
      expect(await readdir(retained)).toContain("source.bin");
    } finally {
      process.off("unhandledRejection", observe);
    }
  });

  it("closes the prepared read descriptor on cancellation before cleaning the files", async () => {
    const { value } = await prepare(waveform(20000, 2));
    const identity = value.manifest.chunks[0];
    if (!identity) throw new Error("Missing chunk");
    const controller = signal();
    const reading = value.readChunk(identity, controller.signal);
    const rejection = expect(reading).rejects.toMatchObject({
      code: "LLM_TIMEOUT",
      closed: true,
    });
    controller.abort();
    await rejection;
    await value.close();
    await expect(value.closed).resolves.toBeUndefined();
    expect(await readdir(root)).toEqual([]);
  });
});

describe("dedicated audio tool configuration", () => {
  const payload = { version: 1, ...tools };
  it("reads only the owned finite regular configuration and does not start a tool", async () => {
    const file = path.join(root, "tools.json");
    await writeFile(file, JSON.stringify(payload), { mode: 0o600, flag: "wx" });
    await expect(readNodeAudioTools(file)).resolves.toEqual(tools);
    await expect(readNodeAudioTools(undefined)).resolves.toBeUndefined();
    expect(records).toHaveLength(0);
  });
  it.each([
    "extra-field",
    "symlink",
    "hardlink",
    "open-mode",
    "oversize",
    "unsafe-path",
  ])("rejects %s without returning partial tools", async (mutation) => {
    const file = path.join(root, "tools.json");
    await writeFile(
      file,
      mutation === "oversize"
        ? "a".repeat(16385)
        : JSON.stringify(
            mutation === "extra-field"
              ? { ...payload, extra: true }
              : mutation === "unsafe-path"
                ? { ...payload, ffmpegPath: "/synthetic/ffmpeg\n" }
                : payload,
          ),
      { mode: 0o600, flag: "wx" },
    );
    let selected = file;
    if (mutation === "symlink") {
      selected = path.join(root, "link.json");
      await symlink(file, selected);
    }
    if (mutation === "hardlink")
      await link(file, path.join(root, "other.json"));
    if (mutation === "open-mode") await chmod(file, 0o644);
    await expect(readNodeAudioTools(selected)).rejects.toMatchObject({
      code: "LLM_UNCONFIGURED",
    });
  });
  it("rejects a non-private parent and relative tool path before launching commands", async () => {
    const directory = path.join(root, "public");
    await mkdir(directory, { mode: 0o755 });
    const file = path.join(directory, "tools.json");
    await writeFile(file, JSON.stringify(payload), { mode: 0o600, flag: "wx" });
    await expect(readNodeAudioTools(file)).rejects.toMatchObject({
      code: "LLM_UNCONFIGURED",
    });
    await expect(
      validateAudioTools({ ...tools, ffmpegPath: "relative" }),
    ).rejects.toMatchObject({ code: "LLM_UNCONFIGURED" });
  });
});
