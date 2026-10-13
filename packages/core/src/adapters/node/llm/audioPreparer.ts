import {
  type ChildProcess,
  type SpawnOptions,
  spawn,
} from "node:child_process";
import { createHash } from "node:crypto";
import { type BigIntStats, constants } from "node:fs";
import {
  type FileHandle,
  lstat,
  mkdir,
  mkdtemp,
  open,
  realpath,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type {
  AudioChunk,
  AudioNativeTools,
  LlmAudioPreparer,
  OwnedAudioPrepared,
} from "@repo/core/application/llm/audioPorts";
import {
  isLlmOperationError,
  type LlmNativeBirth,
  type LlmNativeInputOwner,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import {
  AUDIO_LIMITS,
  type AudioChunkIdentity,
  type AudioManifest,
  audioManifest,
  audioRecipe,
} from "@repo/core/domain/llm/audio";
import { LLM_LIMITS, type LlmFailure } from "@repo/core/domain/llm/entity";
import { z } from "zod";

export type AudioChildFactory = (
  file: string,
  args: readonly string[],
  options: SpawnOptions,
) => ChildProcess;
export type AudioPreparerNativeOptions = Readonly<{
  spawn?: AudioChildFactory;
  residentBytes?: (pid: number) => Promise<number | undefined>;
}>;
type Prepare = Parameters<LlmAudioPreparer["prepare"]>[0];
const failure = (code: LlmFailure, closed = true) =>
  new LlmOperationError(code, "not-sent", closed);
const unknown = () => failure("LLM_OWNERSHIP_UNKNOWN", false);
const formats = "wav,mp3,mov,ogg,flac";
const codecs =
  "pcm_s16le,pcm_s16be,pcm_s24le,pcm_s24be,pcm_s32le,pcm_s32be,pcm_u8,pcm_f32le,pcm_f32be,pcm_f64le,pcm_f64be,mp3,mp3float,aac,opus,vorbis,flac";
const common = [
  "-hide_banner",
  "-v",
  "warning",
  "-protocol_whitelist",
  "file,pipe",
  "-codec_whitelist",
  codecs,
  "-threads",
  "1",
];
const sourceFlags =
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
const outputFlags =
  constants.O_RDWR |
  constants.O_CREAT |
  constants.O_EXCL |
  constants.O_NOFOLLOW;
const launcher = fileURLToPath(new URL("./audioLauncher.py", import.meta.url));
const samplerEvent = z.discriminatedUnion("event", [
  z
    .object({
      event: z.literal("sample"),
      rss: z.number().int().nonnegative().safe(),
    })
    .strict(),
  z.object({ event: z.literal("gone") }).strict(),
  z.object({ event: z.literal("closed") }).strict(),
  z
    .object({
      event: z.literal("failure"),
      code: z.enum(["memory-limit", "deadline", "monitor-unavailable"]),
    })
    .strict(),
]);

function same(left: BigIntStats, right: BigIntStats) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.nlink === right.nlink &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}
function privateFile(info: BigIntStats) {
  return (
    info.isFile() &&
    info.uid === BigInt(process.getuid?.() ?? -1) &&
    (info.mode & 0o7777n) === 0o600n &&
    info.nlink === 1n
  );
}
async function privateDirectory(directory: string) {
  if (!path.isAbsolute(directory) || path.normalize(directory) !== directory)
    throw failure("LLM_SOURCE_INVALID");
  const info = await lstat(directory, { bigint: true });
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    info.uid !== BigInt(process.getuid?.() ?? -1) ||
    (info.mode & 0o7777n) !== 0o700n ||
    (await realpath(directory)) !== directory
  )
    throw failure("LLM_SOURCE_INVALID");
  return info;
}
async function writeAll(handle: FileHandle, bytes: Uint8Array, offset: number) {
  let written = 0;
  while (written < bytes.byteLength) {
    const result = await handle.write(
      bytes,
      written,
      bytes.byteLength - written,
      offset + written,
    );
    if (!result.bytesWritten) throw failure("LLM_SOURCE_INVALID");
    written += result.bytesWritten;
  }
}
function integer(value: string | undefined, minimum = 0) {
  if (value === undefined || !/^(0|[1-9][0-9]*)$/.test(value))
    throw failure("LLM_AUDIO_CORRUPT");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum)
    throw failure("LLM_AUDIO_CORRUPT");
  return number;
}

class Probe {
  private pending = "";
  private readonly streams: Array<{
    index: number;
    rate: number;
    channels: number;
    codec: string;
  }> = [];
  private readonly frames = new Map<
    number,
    { samples: number; count: number; channels: number }
  >();
  private format: { bytes: number; streams: number } | null = null;
  private bytes = 0;

  feed(bytes: Buffer) {
    this.bytes += bytes.length;
    if (this.bytes > 128 * 1024 * 1024) throw failure("LLM_RESOURCE_LIMIT");
    if (bytes.some((byte) => byte > 127 || byte === 0))
      throw failure("LLM_AUDIO_CORRUPT");
    this.pending += bytes.toString("ascii");
    let newline = this.pending.indexOf("\n");
    while (newline !== -1) {
      const line = this.pending.slice(0, newline);
      this.pending = this.pending.slice(newline + 1);
      if (line.length > 4096) throw failure("LLM_RESOURCE_LIMIT");
      this.line(line);
      newline = this.pending.indexOf("\n");
    }
    if (this.pending.length > 4096) throw failure("LLM_RESOURCE_LIMIT");
  }
  private line(line: string) {
    const [kind, ...pairs] = line.split("|");
    if (!kind || !["frame", "stream", "format"].includes(kind))
      throw failure("LLM_AUDIO_CORRUPT");
    const fields = new Map<string, string>();
    for (const pair of pairs) {
      const equal = pair.indexOf("=");
      const key = pair.slice(0, equal);
      if (equal < 1 || fields.has(key)) throw failure("LLM_AUDIO_CORRUPT");
      fields.set(key, pair.slice(equal + 1));
    }
    if (kind === "frame") {
      if (fields.get("media_type") !== "audio")
        throw failure("LLM_AUDIO_UNSUPPORTED");
      const index = integer(fields.get("stream_index"));
      const channels = integer(fields.get("channels"), 1);
      const samples = integer(fields.get("nb_samples"), 1);
      if (channels > 8 || samples > 16 * 1024 * 1024 || index > 63)
        throw failure("LLM_AUDIO_UNSUPPORTED");
      const value = this.frames.get(index) ?? {
        samples: 0,
        count: 0,
        channels,
      };
      if (value.channels !== channels) throw failure("LLM_AUDIO_UNSUPPORTED");
      value.samples += samples;
      value.count++;
      if (
        !Number.isSafeInteger(value.samples) ||
        value.samples > AUDIO_LIMITS.pcmBytes ||
        value.count > 1_000_000
      )
        throw failure("LLM_RESOURCE_LIMIT");
      this.frames.set(index, value);
      if (this.frames.size > 1) throw failure("LLM_AUDIO_UNSUPPORTED");
    } else if (kind === "stream") {
      if (fields.get("codec_type") !== "audio" || this.streams.length !== 0)
        throw failure("LLM_AUDIO_UNSUPPORTED");
      const index = integer(fields.get("index"));
      const rate = integer(fields.get("sample_rate"), 1);
      const channels = integer(fields.get("channels"), 1);
      const codec = fields.get("codec_name") ?? "";
      if (
        index !== 0 ||
        rate > 384000 ||
        channels > 8 ||
        !codecs.split(",").includes(codec)
      )
        throw failure("LLM_AUDIO_UNSUPPORTED");
      this.streams.push({ index, rate, channels, codec });
    } else {
      if (this.format) throw failure("LLM_AUDIO_CORRUPT");
      const names = fields.get("format_name")?.split(",") ?? [];
      if (!names.some((name) => formats.split(",").includes(name)))
        throw failure("LLM_AUDIO_UNSUPPORTED");
      this.format = {
        bytes: integer(fields.get("size"), 1),
        streams: integer(fields.get("nb_streams"), 1),
      };
    }
  }
  finish(sourceBytes: number) {
    if (this.pending.length) throw failure("LLM_AUDIO_CORRUPT");
    const stream = this.streams[0];
    const frames = stream && this.frames.get(stream.index);
    if (
      !stream ||
      !frames ||
      this.frames.size !== 1 ||
      this.format?.bytes !== sourceBytes ||
      this.format.streams !== 1 ||
      stream.channels !== frames.channels
    )
      throw failure("LLM_AUDIO_CORRUPT");
    return { ...stream, samples: frames.samples };
  }
}

function wavHeader(frames: number, channels: number) {
  const header = Buffer.alloc(44);
  const bytes = frames * channels * 2;
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + bytes, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(16000, 24);
  header.writeUInt32LE(16000 * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(bytes, 40);
  return header;
}

class ChunkWriter {
  readonly chunks: AudioChunkIdentity[] = [];
  private handle: FileHandle | null = null;
  private bytes = 0;
  private total = 0;
  private hash = createHash("sha256");
  private readonly chunkFrames: number;
  private readonly capacity: number;
  constructor(
    private readonly directory: string,
    private readonly channels: number,
  ) {
    this.chunkFrames = Math.min(
      AUDIO_LIMITS.chunkSeconds * 16000,
      Math.floor((AUDIO_LIMITS.chunkBytes - 44) / (channels * 2)),
    );
    this.capacity = this.chunkFrames * channels * 2;
  }
  async write(input: Buffer) {
    if (this.total + input.byteLength > AUDIO_LIMITS.pcmBytes)
      throw failure("LLM_RESOURCE_LIMIT");
    let offset = 0;
    while (offset < input.length) {
      if (!this.handle) {
        if (this.chunks.length >= AUDIO_LIMITS.chunks)
          throw failure("LLM_RESOURCE_LIMIT");
        this.handle = await open(
          path.join(this.directory, `chunk-${this.chunks.length}.wav`),
          outputFlags,
          0o600,
        );
        await writeAll(this.handle, Buffer.alloc(44), 0);
        this.bytes = 0;
        this.hash = createHash("sha256");
      }
      const part = input.subarray(
        offset,
        offset + Math.min(this.capacity - this.bytes, input.length - offset),
      );
      await writeAll(this.handle, part, 44 + this.bytes);
      this.bytes += part.length;
      this.total += part.length;
      offset += part.length;
      if (this.bytes === this.capacity) await this.seal();
    }
  }
  private async seal() {
    const handle = this.handle;
    if (!handle || !this.bytes || this.bytes % (this.channels * 2))
      throw failure("LLM_AUDIO_CORRUPT");
    const frames = this.bytes / (this.channels * 2);
    const header = wavHeader(frames, this.channels);
    await writeAll(handle, header, 0);
    await handle.sync();
    const buffer = Buffer.alloc(65536);
    let offset = 0;
    while (offset < 44 + this.bytes) {
      const result = await handle.read(
        buffer,
        0,
        Math.min(buffer.length, 44 + this.bytes - offset),
        offset,
      );
      if (!result.bytesRead) throw failure("LLM_SOURCE_INVALID");
      this.hash.update(buffer.subarray(0, result.bytesRead));
      offset += result.bytesRead;
    }
    await handle.close();
    this.handle = null;
    this.chunks.push({
      kind: "prepared-audio-chunk",
      ordinal: this.chunks.length,
      startFrame: (this.total - this.bytes) / (this.channels * 2),
      frames,
      bytes: 44 + this.bytes,
      sha256: this.hash.digest("hex"),
    });
  }
  async finish() {
    if (this.handle) await this.seal();
    if (!this.chunks.length) throw failure("LLM_AUDIO_NO_TEXT");
    return this.total / (this.channels * 2);
  }
  async close() {
    if (this.handle) {
      await this.handle.close();
      this.handle = null;
    }
  }
}

export class NodeLlmAudioPreparer implements LlmAudioPreparer {
  private readonly childFactory: AudioChildFactory;
  private readonly residentBytes:
    | ((pid: number) => Promise<number | undefined>)
    | undefined;
  constructor(
    private readonly tools: AudioNativeTools,
    private readonly directory: string,
    options: AudioPreparerNativeOptions = {},
  ) {
    this.childFactory = options.spawn ?? spawn;
    this.residentBytes = options.residentBytes;
  }

  private async run(
    mode: "probe" | "decode",
    args: readonly string[],
    directory: string,
    native: LlmNativeInputOwner,
    signal: AbortSignal,
    consume: (bytes: Buffer) => Promise<void>,
  ) {
    if (signal.aborted) throw failure("LLM_TIMEOUT");
    const births = await native.reserveMany(2, signal);
    const toolBirth = births[0];
    const samplerBirth = births[1];
    if (births.length !== 2 || !toolBirth || !samplerBirth) throw unknown();
    const pair = (() => {
      let started: ChildProcess | undefined;
      try {
        const tool = this.childFactory(
          this.tools.pythonPath,
          [
            "-I",
            "-S",
            launcher,
            mode,
            mode === "probe" ? this.tools.ffprobePath : this.tools.ffmpegPath,
            ...args,
          ],
          {
            cwd: directory,
            env: {} as unknown as NodeJS.ProcessEnv,
            stdio: ["pipe", "pipe", "pipe", "pipe"],
            windowsHide: true,
          },
        );
        started = tool;
        if (tool.pid === undefined) throw unknown();
        const sampler = this.childFactory(
          this.tools.pythonPath,
          ["-I", "-S", launcher, "rss", String(tool.pid)],
          {
            cwd: directory,
            env: {} as unknown as NodeJS.ProcessEnv,
            stdio: ["pipe", "pipe", "pipe", "pipe"],
            windowsHide: true,
          },
        );
        return { tool, sampler };
      } catch {
        if (started) {
          started.on("error", () => {});
          for (const pipe of started.stdio) pipe?.on("error", () => {});
          started.stdout?.resume();
          started.stderr?.resume();
          const protocol = started.stdio[3];
          if (protocol instanceof Readable) protocol.resume();
          try {
            started.kill("SIGKILL");
          } catch {}
        }
        throw unknown();
      }
    })();
    const { tool, sampler } = pair;
    return new Promise<void>((resolve, reject) => {
      const state = (child: ChildProcess, birth: LlmNativeBirth) => ({
        child,
        birth,
        pipes: child.stdio.filter((pipe) => pipe != null),
        closed: new Set<unknown>(),
        exited: false,
        processClosed: false,
        outputDone: false,
        exitCode: null as number | null,
        registered: false,
        ready: false,
        started: false,
        handshake: "",
        stderr: 0,
      });
      const t = state(tool, toolBirth);
      const s = state(sampler, samplerBirth);
      const children = [t, s];
      let sampleSeen = false;
      let samplerClosed = false;
      let samplerStopping = false;
      let samplerBytes = 0;
      let samplerPending = "";
      let settled = false;
      let finalizing = false;
      let code: LlmFailure | null = null;
      let ownershipUnknown = false;
      let stopTimer: ReturnType<typeof setTimeout> | undefined;
      const release = () => {
        clearTimeout(deadline);
        clearTimeout(stopTimer);
        signal.removeEventListener("abort", abort);
      };
      const finish = () => {
        if (
          settled ||
          finalizing ||
          !children.every(
            (value) =>
              value.exited &&
              value.processClosed &&
              value.outputDone &&
              value.closed.size === value.pipes.length,
          )
        )
          return;
        finalizing = true;
        if (!children.every((value) => value.registered) || ownershipUnknown) {
          settled = true;
          release();
          reject(unknown());
          return;
        }
        clearTimeout(deadline);
        clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            release();
            reject(unknown());
          }
        }, LLM_LIMITS.stopMs);
        stopTimer.unref();
        void Promise.all(
          children.map((value) => native.closed(value.birth)),
        ).then(
          () => {
            if (settled) return;
            settled = true;
            release();
            if (code) reject(failure(code));
            else if (
              !children.every(
                (value) =>
                  value.started && value.exitCode === 0 && value.stderr === 0,
              ) ||
              !sampleSeen ||
              !samplerClosed ||
              samplerPending.length
            )
              reject(failure("LLM_AUDIO_CORRUPT"));
            else resolve();
          },
          () => {
            if (!settled) {
              settled = true;
              release();
              reject(unknown());
            }
          },
        );
      };
      const stop = (reason: LlmFailure) => {
        code ??= reason;
        if (stopTimer || settled) return;
        for (const value of children) {
          value.child.stdin?.destroy();
          try {
            if (!value.exited) value.child.kill("SIGKILL");
          } catch {
            ownershipUnknown = true;
          }
        }
        stopTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            release();
            reject(unknown());
          }
        }, LLM_LIMITS.stopMs);
        stopTimer.unref();
        finish();
      };
      const abort = () => stop("LLM_TIMEOUT");
      const deadline = setTimeout(
        () => stop("LLM_TIMEOUT"),
        AUDIO_LIMITS.nativeMs,
      );
      deadline.unref();
      signal.addEventListener("abort", abort, { once: true });
      const begin = () => {
        if (
          !children.every((value) => value.ready && value.registered) ||
          code ||
          signal.aborted
        )
          return;
        if (!s.started) {
          s.started = true;
          sampler.stdin?.write("GO\n", (error?: Error | null) => {
            if (error) stop("LLM_SOURCE_INVALID");
          });
        }
        if (sampleSeen && !t.started) {
          t.started = true;
          tool.stdin?.end("GO\n", (error?: Error | null) => {
            if (error) stop("LLM_SOURCE_INVALID");
          });
        }
      };
      const stopSampler = () => {
        if (
          t.exited &&
          t.outputDone &&
          !samplerStopping &&
          !code &&
          s.started
        ) {
          samplerStopping = true;
          sampler.stdin?.end("STOP\n", (error?: Error | null) => {
            if (error) stop("LLM_SOURCE_INVALID");
          });
        }
      };
      const observe = async (rss: number) => {
        const reported =
          this.residentBytes && tool.pid !== undefined
            ? await this.residentBytes(tool.pid)
            : rss;
        if (
          reported === undefined ||
          !Number.isSafeInteger(reported) ||
          reported < 0
        )
          throw failure("LLM_SOURCE_INVALID");
        if (reported > AUDIO_LIMITS.nativeMemoryBytes)
          throw failure("LLM_RESOURCE_LIMIT");
        sampleSeen = true;
        begin();
      };
      const samplerOutput = async (bytes: Buffer) => {
        samplerBytes += bytes.length;
        if (
          samplerBytes > 256 * 1024 ||
          bytes.some((byte) => byte > 127 || byte === 0)
        )
          throw failure("LLM_RESOURCE_LIMIT");
        samplerPending += bytes.toString("ascii");
        let newline = samplerPending.indexOf("\n");
        while (newline !== -1) {
          const line = samplerPending.slice(0, newline);
          samplerPending = samplerPending.slice(newline + 1);
          if (line.length > 256 || samplerClosed)
            throw failure("LLM_SOURCE_INVALID");
          let event: z.infer<typeof samplerEvent>;
          try {
            event = samplerEvent.parse(JSON.parse(line));
          } catch {
            throw failure("LLM_SOURCE_INVALID");
          }
          if (event.event === "sample") await observe(event.rss);
          else if (event.event === "closed") {
            if (!samplerStopping || !sampleSeen)
              throw failure("LLM_SOURCE_INVALID");
            samplerClosed = true;
          } else if (event.event === "failure") {
            throw failure(
              event.code === "memory-limit"
                ? "LLM_RESOURCE_LIMIT"
                : event.code === "deadline"
                  ? "LLM_TIMEOUT"
                  : "LLM_SOURCE_INVALID",
            );
          }
          newline = samplerPending.indexOf("\n");
        }
        if (samplerPending.length > 256) throw failure("LLM_RESOURCE_LIMIT");
      };
      for (const value of children) {
        for (const pipe of value.pipes) {
          pipe.once("close", () => {
            value.closed.add(pipe);
            finish();
          });
          pipe.on("error", () => stop("LLM_SOURCE_INVALID"));
        }
        const child = value.child;
        child.once("error", () => {
          if (child.pid === undefined) value.exited = true;
          ownershipUnknown = true;
          stop("LLM_OWNERSHIP_UNKNOWN");
        });
        child.once("exit", (exitCode, nativeSignal) => {
          value.exited = true;
          value.exitCode = exitCode;
          if (nativeSignal === "SIGALRM" || nativeSignal === "SIGXCPU")
            stop("LLM_TIMEOUT");
          else if (exitCode !== 0 && !code) stop("LLM_AUDIO_CORRUPT");
          else if (value === s && !samplerStopping && !code)
            stop("LLM_SOURCE_INVALID");
          stopSampler();
          finish();
        });
        child.once("close", () => {
          value.processClosed = true;
          finish();
        });
        const protocol = child.stdio[3];
        if (
          !child.stdin ||
          !child.stdout ||
          !child.stderr ||
          !(protocol instanceof Readable)
        ) {
          value.outputDone = true;
          stop("LLM_SOURCE_INVALID");
          continue;
        }
        protocol.on("data", (bytes: Buffer) => {
          value.handshake += bytes.toString("ascii");
          if (
            !"READY\n".startsWith(value.handshake) ||
            value.handshake.length > 6
          ) {
            stop("LLM_SOURCE_INVALID");
            return;
          }
          if (value.handshake === "READY\n") {
            value.ready = true;
            begin();
          }
        });
        child.stderr.on("data", (bytes: Buffer) => {
          value.stderr += bytes.length;
          stop(
            value.stderr > 16384 ? "LLM_RESOURCE_LIMIT" : "LLM_AUDIO_CORRUPT",
          );
        });
        void (async () => {
          try {
            for await (const bytes of child.stdout ?? []) {
              if (!Buffer.isBuffer(bytes)) throw failure("LLM_SOURCE_INVALID");
              if (!code)
                await (value === t ? consume(bytes) : samplerOutput(bytes));
            }
          } catch (error) {
            stop(
              isLlmOperationError(error) ? error.code : "LLM_SOURCE_INVALID",
            );
          } finally {
            value.outputDone = true;
            stopSampler();
            finish();
          }
        })();
        if (child.pid === undefined) {
          ownershipUnknown = true;
          stop("LLM_OWNERSHIP_UNKNOWN");
          continue;
        }
        void native.register(value.birth, child.pid).then(
          () => {
            value.registered = true;
            if (signal.aborted) abort();
            begin();
            finish();
          },
          () => {
            ownershipUnknown = true;
            stop("LLM_OWNERSHIP_UNKNOWN");
          },
        );
      }
      if (signal.aborted) abort();
    });
  }

  async prepare(
    input: Prepare,
    signal: AbortSignal,
  ): Promise<OwnedAudioPrepared> {
    if (signal.aborted) throw failure("LLM_TIMEOUT");
    const recipe = audioRecipe(input.recipe);
    if (input.source.bytes > AUDIO_LIMITS.sourceBytes)
      throw failure("LLM_RESOURCE_LIMIT");
    if (
      input.source.format !== "audio" ||
      !Number.isSafeInteger(input.source.bytes) ||
      input.source.bytes < 1 ||
      !/^[a-f0-9]{64}$/.test(input.source.sha256)
    )
      throw failure("LLM_SOURCE_INVALID");
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await privateDirectory(this.directory);
    const directory = await mkdtemp(path.join(this.directory, "audio-"));
    const directoryInfo = await privateDirectory(directory);
    const sourcePath = path.join(directory, "source.bin");
    let sourceHandle: FileHandle | null = null;
    let writer: ChunkWriter | null = null;
    const pendingWrites = new Set<Promise<void>>();
    let preserve = false;
    try {
      sourceHandle = await open(sourcePath, outputFlags, 0o600);
      const handle = sourceHandle;
      const hash = createHash("sha256");
      let bytes = 0;
      let writing = false;
      await input.copy(
        {
          write: (chunk) => {
            const work = (async () => {
              if (signal.aborted) throw failure("LLM_TIMEOUT");
              if (
                writing ||
                !(chunk instanceof Uint8Array) ||
                chunk.byteLength === 0 ||
                chunk.byteLength > 65536
              )
                throw failure("LLM_SOURCE_INVALID");
              if (
                bytes + chunk.byteLength > input.source.bytes ||
                bytes + chunk.byteLength > AUDIO_LIMITS.sourceBytes
              )
                throw failure("LLM_SOURCE_CHANGED");
              writing = true;
              try {
                const stable = Buffer.from(chunk);
                await writeAll(handle, stable, bytes);
                hash.update(stable);
                bytes += chunk.byteLength;
              } finally {
                writing = false;
              }
            })();
            pendingWrites.add(work);
            void work.then(
              () => {
                pendingWrites.delete(work);
              },
              () => {
                pendingWrites.delete(work);
              },
            );
            return work;
          },
        },
        signal,
      );
      if (
        writing ||
        bytes !== input.source.bytes ||
        hash.digest("hex") !== input.source.sha256
      )
        throw failure("LLM_SOURCE_CHANGED");
      await sourceHandle.sync();
      await sourceHandle.close();
      sourceHandle = null;
      const before = await lstat(sourcePath, { bigint: true });
      if (!privateFile(before) || before.size !== BigInt(bytes))
        throw failure("LLM_SOURCE_INVALID");
      const prefix = Buffer.alloc(12);
      const prefixHandle = await open(sourcePath, sourceFlags);
      try {
        await prefixHandle.read(prefix, 0, prefix.length, 0);
      } finally {
        await prefixHandle.close();
      }
      const mov = prefix.toString("ascii", 4, 8) === "ftyp";
      const inputOptions = mov
        ? [
            ...common,
            "-f",
            "mov",
            "-format_whitelist",
            "mov",
            "-enable_drefs",
            "0",
            "-use_absolute_path",
            "0",
          ]
        : [...common, "-format_whitelist", "wav,mp3,ogg,flac"];
      const probe = new Probe();
      await this.run(
        "probe",
        [
          ...inputOptions,
          "-show_frames",
          "-show_streams",
          "-show_format",
          "-show_entries",
          "frame=media_type,stream_index,nb_samples,channels:frame_side_data=:stream=index,codec_type,codec_name,sample_rate,channels:stream_tags=:stream_disposition=:stream_side_data=:format=format_name,nb_streams,size:format_tags=",
          "-of",
          "compact=p=1:nk=0",
          "source.bin",
        ],
        directory,
        input.native,
        signal,
        async (value) => {
          probe.feed(value);
        },
      );
      const inspected = probe.finish(bytes);
      writer = new ChunkWriter(directory, inspected.channels);
      const chunks = writer;
      await this.run(
        "decode",
        [
          "-nostdin",
          "-xerror",
          ...inputOptions,
          "-guess_layout_max",
          "0",
          "-reinit_filter",
          "0",
          "-i",
          "source.bin",
          "-map",
          "0:a:0",
          "-vn",
          "-sn",
          "-dn",
          "-filter_threads",
          "1",
          "-threads",
          "1",
          "-ar",
          "16000",
          "-ac",
          String(inspected.channels),
          "-c:a",
          "pcm_s16le",
          "-f",
          "s16le",
          "pipe:1",
        ],
        directory,
        input.native,
        signal,
        (value) => chunks.write(value),
      );
      const totalFrames = await writer.finish();
      const expected = (inspected.samples * 16000) / inspected.rate;
      if (
        totalFrames !== Math.floor(expected) &&
        totalFrames !== Math.ceil(expected)
      )
        throw failure("LLM_AUDIO_CORRUPT");
      if (!same(before, await lstat(sourcePath, { bigint: true })))
        throw failure("LLM_SOURCE_CHANGED");
      const base = {
        kind: "audio-chunks" as const,
        preparationVersion: 5 as const,
        source: input.source,
        recipe,
        sampleRate: 16000 as const,
        channels: inspected.channels,
        totalFrames,
        chunks: writer.chunks,
      };
      const manifest = audioManifest({
        ...base,
        sha256: createHash("sha256")
          .update(
            JSON.stringify([
              "audio-manifest-v5",
              input.source.originalId,
              input.source.sha256,
              input.source.bytes,
              recipe.sttModelId,
              recipe.pipelineVersion,
              recipe.decoderPolicy,
              16000,
              inspected.channels,
              totalFrames,
              writer.chunks.map((chunk) => [
                chunk.ordinal,
                chunk.sha256,
                chunk.startFrame,
                chunk.frames,
                chunk.bytes,
              ]),
            ]),
          )
          .digest("hex"),
      });
      return this.owned(directory, directoryInfo, manifest);
    } catch (error) {
      preserve = isLlmOperationError(error) && !error.closed;
      let cleanupFailed = false;
      await Promise.allSettled(pendingWrites);
      const cleanup = await Promise.allSettled([
        sourceHandle?.close(),
        writer?.close(),
      ]);
      cleanupFailed = cleanup.some((value) => value.status === "rejected");
      if (!preserve && !cleanupFailed) {
        try {
          const current = await privateDirectory(directory);
          if (
            current.dev !== directoryInfo.dev ||
            current.ino !== directoryInfo.ino
          )
            throw unknown();
          await rm(directory, { recursive: true });
        } catch {
          cleanupFailed = true;
        }
      }
      if (preserve || cleanupFailed) throw unknown();
      if (isLlmOperationError(error)) throw error;
      if (
        typeof error === "object" &&
        error !== null &&
        "kind" in error &&
        error.kind === "business"
      )
        throw error;
      throw failure("LLM_SOURCE_INVALID");
    }
  }

  private owned(
    directory: string,
    directoryInfo: BigIntStats,
    manifest: AudioManifest,
  ): OwnedAudioPrepared {
    const controller = new AbortController();
    let closing = false;
    let closePromise: Promise<void> | null = null;
    let read: Promise<AudioChunk> | null = null;
    let readClosureUnknown = false;
    let resolveClosed: () => void = () => {};
    let rejectClosed: (error: unknown) => void = () => {};
    const closed = new Promise<void>((resolve, reject) => {
      resolveClosed = resolve;
      rejectClosed = reject;
    });
    void closed.catch(() => {});
    const readChunk = (
      identity: AudioChunkIdentity,
      signal: AbortSignal,
    ): Promise<AudioChunk> => {
      if (closing || read) return Promise.reject(unknown());
      const expected = manifest.chunks[identity.ordinal];
      if (
        !expected ||
        expected.kind !== identity.kind ||
        expected.ordinal !== identity.ordinal ||
        expected.startFrame !== identity.startFrame ||
        expected.frames !== identity.frames ||
        expected.bytes !== identity.bytes ||
        expected.sha256 !== identity.sha256
      )
        return Promise.reject(failure("LLM_SOURCE_CHANGED"));
      const active = AbortSignal.any([signal, controller.signal]);
      read = (async () => {
        if (active.aborted) throw failure("LLM_TIMEOUT");
        const file = path.join(directory, `chunk-${identity.ordinal}.wav`);
        const handle = await open(file, sourceFlags);
        let result: AudioChunk | undefined;
        let readFailure: unknown;
        try {
          const before = await handle.stat({ bigint: true });
          if (
            !privateFile(before) ||
            before.size !== BigInt(identity.bytes) ||
            !same(before, await lstat(file, { bigint: true }))
          )
            throw failure("LLM_SOURCE_CHANGED");
          const bytes = Buffer.alloc(identity.bytes);
          let offset = 0;
          while (offset < bytes.length) {
            if (active.aborted) throw failure("LLM_TIMEOUT");
            const result = await handle.read(
              bytes,
              offset,
              Math.min(65536, bytes.length - offset),
              offset,
            );
            if (!result.bytesRead) throw failure("LLM_SOURCE_CHANGED");
            offset += result.bytesRead;
          }
          if (
            active.aborted ||
            !same(before, await handle.stat({ bigint: true })) ||
            !same(before, await lstat(file, { bigint: true })) ||
            createHash("sha256").update(bytes).digest("hex") !==
              identity.sha256 ||
            !bytes
              .subarray(0, 44)
              .equals(wavHeader(identity.frames, manifest.channels))
          )
            throw failure("LLM_SOURCE_CHANGED");
          result = {
            identity: expected,
            sampleRate: 16000,
            channels: manifest.channels,
            mimeType: "audio/wav",
            bytes,
          };
        } catch (error) {
          readFailure = error;
        }
        try {
          await handle.close();
        } catch {
          readClosureUnknown = true;
          throw unknown();
        }
        if (readFailure !== undefined)
          throw isLlmOperationError(readFailure)
            ? readFailure
            : failure("LLM_SOURCE_CHANGED");
        if (!result) throw unknown();
        return result;
      })();
      const pending = read;
      void pending.then(
        () => {
          if (read === pending) read = null;
        },
        () => {
          if (read === pending) read = null;
        },
      );
      return pending;
    };
    const close = () => {
      if (closePromise) return closePromise;
      closing = true;
      controller.abort();
      closePromise = (async () => {
        if (read) await read.catch(() => {});
        if (readClosureUnknown) throw unknown();
        const current = await privateDirectory(directory);
        if (
          current.dev !== directoryInfo.dev ||
          current.ino !== directoryInfo.ino
        )
          throw unknown();
        await rm(directory, { recursive: true });
        resolveClosed();
      })().catch(() => {
        const error = unknown();
        rejectClosed(error);
        throw error;
      });
      return closePromise;
    };
    return { manifest, readChunk, close, closed };
  }
}
