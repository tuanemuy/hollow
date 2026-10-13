import { execFile } from "node:child_process";
import { type BigIntStats, constants } from "node:fs";
import { lstat, open, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { AudioNativeTools } from "@repo/core/application/llm/audioPorts";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import { z } from "zod";

const run = promisify(execFile);
const invalid = () =>
  new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
const absolute = z
  .string()
  .min(1)
  .max(4096)
  .refine(
    (value) =>
      path.isAbsolute(value) &&
      path.normalize(value) === value &&
      ![...value].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ),
  );
const configuration = z
  .object({
    version: z.literal(1),
    ffmpegPath: absolute,
    ffprobePath: absolute,
    pythonPath: absolute,
  })
  .strict();
function same(left: BigIntStats, right: BigIntStats) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

export async function readNodeAudioTools(
  file: string | undefined,
): Promise<AudioNativeTools | undefined> {
  if (file === undefined) return undefined;
  if (!absolute.safeParse(file).success) throw invalid();
  const uid = process.getuid?.();
  if (uid === undefined) throw invalid();
  const parentPath = path.dirname(file);
  let bytes: Buffer | undefined;
  try {
    const parent = await lstat(parentPath, { bigint: true });
    if (
      !parent.isDirectory() ||
      parent.isSymbolicLink() ||
      parent.uid !== BigInt(uid) ||
      (parent.mode & 0o7777n) !== 0o700n ||
      (await realpath(parentPath)) !== parentPath
    )
      throw invalid();
    const handle = await open(
      file,
      constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
    );
    try {
      const before = await handle.stat({ bigint: true });
      if (
        !before.isFile() ||
        before.uid !== BigInt(uid) ||
        (before.mode & 0o7777n) !== 0o600n ||
        before.nlink !== 1n ||
        before.size < 1n ||
        before.size > 16384n ||
        !same(before, await lstat(file, { bigint: true }))
      )
        throw invalid();
      bytes = Buffer.alloc(Number(before.size) + 1);
      let length = 0;
      while (length < bytes.length) {
        const result = await handle.read(
          bytes,
          length,
          bytes.length - length,
          length,
        );
        if (!result.bytesRead) break;
        length += result.bytesRead;
      }
      if (
        length !== Number(before.size) ||
        !same(before, await handle.stat({ bigint: true })) ||
        !same(before, await lstat(file, { bigint: true })) ||
        !same(parent, await lstat(parentPath, { bigint: true })) ||
        (await realpath(parentPath)) !== parentPath
      )
        throw invalid();
      const text = bytes.subarray(0, length).toString("utf8");
      if (!Buffer.from(text, "utf8").equals(bytes.subarray(0, length)))
        throw invalid();
      const parsed = configuration.safeParse(JSON.parse(text));
      if (!parsed.success) throw invalid();
      return {
        ffmpegPath: parsed.data.ffmpegPath,
        ffprobePath: parsed.data.ffprobePath,
        pythonPath: parsed.data.pythonPath,
      };
    } finally {
      await handle.close();
    }
  } catch {
    throw invalid();
  } finally {
    bytes?.fill(0);
  }
}

async function inspect(
  file: string,
  args: readonly string[],
  maximum = 2 * 1024 * 1024,
) {
  const result = await run(file, [...args], {
    env: {} as unknown as NodeJS.ProcessEnv,
    cwd: path.dirname(file),
    encoding: "utf8",
    timeout: 10_000,
    killSignal: "SIGKILL",
    maxBuffer: maximum,
    windowsHide: true,
  });
  if (result.stderr.length) throw invalid();
  return result.stdout;
}

export async function validateAudioTools(
  tools: AudioNativeTools,
): Promise<void> {
  try {
    for (const file of [
      tools.ffmpegPath,
      tools.ffprobePath,
      tools.pythonPath,
    ]) {
      if (!absolute.safeParse(file).success) throw invalid();
      const info = await stat(file);
      if (
        !info.isFile() ||
        (info.mode & 0o111) === 0 ||
        (info.mode & 0o022) !== 0
      )
        throw invalid();
    }
    const ffmpeg = await inspect(tools.ffmpegPath, ["-version"]);
    const ffprobe = await inspect(tools.ffprobePath, ["-version"]);
    if (
      !/^ffmpeg version 8\.0\.1(?:\s|$)/.test(ffmpeg) ||
      !/^ffprobe version 8\.0\.1(?:\s|$)/.test(ffprobe)
    )
      throw invalid();
    const help = await inspect(tools.ffmpegPath, [
      "-hide_banner",
      "-h",
      "full",
    ]);
    const probeHelp = await inspect(tools.ffprobePath, [
      "-hide_banner",
      "-h",
      "full",
    ]);
    for (const option of [
      "protocol_whitelist",
      "format_whitelist",
      "codec_whitelist",
      "threads",
      "filter_threads",
      "reinit_filter",
      "enable_drefs",
      "use_absolute_path",
    ]) {
      if (!help.includes(option)) throw invalid();
    }
    for (const option of [
      "show_frames",
      "show_streams",
      "show_entries",
      "protocol_whitelist",
      "format_whitelist",
      "codec_whitelist",
    ]) {
      if (!probeHelp.includes(option)) throw invalid();
    }
    const decoders = await inspect(tools.ffmpegPath, [
      "-hide_banner",
      "-decoders",
    ]);
    const formats = await inspect(tools.ffmpegPath, [
      "-hide_banner",
      "-formats",
    ]);
    for (const decoder of [
      "pcm_s16le",
      "pcm_s24le",
      "pcm_s32le",
      "pcm_f32le",
      "mp3",
      "aac",
      "opus",
      "vorbis",
      "flac",
    ]) {
      if (!new RegExp(`^\\s*A[.A-Z]{5}\\s+${decoder}\\s`, "m").test(decoders))
        throw invalid();
    }
    for (const format of ["wav", "mp3", "mov", "ogg", "flac", "s16le"]) {
      if (
        !formats.split("\n").some((line) => {
          const match = /^\s*[D .][E .]\s+([^ ]+)\s/.exec(line);
          return match?.[1]?.split(",").includes(format);
        })
      )
        throw invalid();
    }
    await inspect(
      tools.pythonPath,
      [
        "-I",
        "-S",
        "-c",
        "import os,resource,sys; assert os.name == 'posix' and sys.platform in ('linux','darwin'); assert hasattr(resource,'RLIMIT_AS') and hasattr(resource,'RLIMIT_CPU') and hasattr(resource,'RLIMIT_NOFILE'); print('audio-launcher-v1')",
      ],
      1024,
    );
  } catch {
    throw invalid();
  }
}
