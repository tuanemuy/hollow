import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
for (const [extension, options] of [
  ["wav", ["-c:a", "pcm_s16le"]],
  ["flac", ["-c:a", "flac"]],
  ["mp3", ["-c:a", "libmp3lame", "-q:a", "5", "-id3v2_version", "3"]],
  ["ogg", ["-c:a", "libvorbis", "-q:a", "3"]],
  ["opus.ogg", ["-c:a", "libopus", "-b:a", "48k"]],
  ["m4a", ["-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart"]],
]) {
  execFileSync("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=523.25:sample_rate=44100:duration=0.3",
    "-metadata",
    "title=日本語の構造検査",
    ...options,
    "-y",
    join(directory, `media-valid.${extension}`),
  ]);
}
for (const extension of ["gif", "webp"]) {
  execFileSync("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=32x32:duration=0.2",
    "-y",
    join(directory, `media-animated.${extension}`),
  ]);
}
for (const extension of ["png", "jpg", "gif", "webp"]) {
  execFileSync("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=32x32:duration=0.1",
    "-frames:v",
    "1",
    "-y",
    join(directory, `media-valid.${extension}`),
  ]);
}
