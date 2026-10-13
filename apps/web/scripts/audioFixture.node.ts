import { execFile } from "node:child_process";
import { chmod, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  readNodeAudioTools,
  validateAudioTools,
} from "@repo/core/adapters/node/llm/audioTools";

const exec = promisify(execFile);
export async function createAudioFiles(directory: string, toolsFile: string) {
  const tools = await readNodeAudioTools(toolsFile);
  if (!tools) throw Error("Owned audio tools required");
  await validateAudioTools(tools);
  const wav = (frames: number, marker: number) => {
    const data = Buffer.alloc(44 + frames * 2);
    data.write("RIFF");
    data.writeUInt32LE(data.length - 8, 4);
    data.write("WAVEfmt ", 8);
    data.writeUInt32LE(16, 16);
    data.writeUInt16LE(1, 20);
    data.writeUInt16LE(1, 22);
    data.writeUInt32LE(16000, 24);
    data.writeUInt32LE(32000, 28);
    data.writeUInt16LE(2, 32);
    data.writeUInt16LE(16, 34);
    data.write("data", 36);
    data.writeUInt32LE(data.length - 44, 40);
    for (let i = 0; i < frames; i++)
      data.writeInt16LE(
        i === 0
          ? marker
          : Math.round(12000 * Math.sin((2 * Math.PI * 440 * i) / 16000)),
        44 + i * 2,
      );
    return data;
  };
  for (const [name, frames, marker] of [
    ["audio.wav", 16000, 1],
    ["audio-slow.wav", 16000, 12345],
    ["audio-retry.wav", 16000, 23456],
    ["audio-chunks.wav", 120 * 16000 + 16000, 1],
  ] as const)
    await writeFile(join(directory, name), wav(frames, marker), {
      flag: "wx",
      mode: 0o600,
    });
  for (const [name, codec] of [
    ["audio.mp3", "libmp3lame"],
    ["audio.m4a", "aac"],
    ["audio.ogg", "libopus"],
    ["audio.flac", "flac"],
  ] as const) {
    await exec(
      tools.ffmpegPath,
      [
        "-nostdin",
        "-hide_banner",
        "-v",
        "error",
        "-i",
        join(directory, "audio.wav"),
        "-threads",
        "1",
        "-c:a",
        codec,
        join(directory, name),
      ],
      {
        env: {} as unknown as NodeJS.ProcessEnv,
        timeout: 10000,
        maxBuffer: 65536,
        windowsHide: true,
      },
    );
    await chmod(join(directory, name), 0o600);
  }
}
