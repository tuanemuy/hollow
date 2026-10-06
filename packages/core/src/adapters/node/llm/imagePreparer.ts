import {
  type ChildProcess,
  type SpawnOptions,
  spawn,
} from "node:child_process";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  type LlmImagePreparedSource,
  LlmOperationError,
  type LlmPrepareInput,
} from "@repo/core/application/llm/ports";
import { LLM_LIMITS, type LlmFailure } from "@repo/core/domain/llm/entity";
import { z } from "zod";
import { imageIdentity } from "./imageIdentity";

type Input = Extract<LlmPrepareInput, { preparationVersion: 3 }>;
export type ImageChildFactory = (
  file: string,
  args: readonly string[],
  options: SpawnOptions,
) => ChildProcess;
const positive = z.number().int().positive().max(LLM_LIMITS.imageDimension);
const metadataSchema = z
  .object({
    version: z.literal(1),
    ok: z.literal(true),
    codec: z.enum(["jpeg", "png", "webp", "gif"]),
    sourceWidth: positive,
    sourceHeight: positive,
    orientation: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
      z.literal(8),
    ]),
    width: positive,
    height: positive,
    bytes: z.number().int().positive().max(LLM_LIMITS.imageBytes),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
const errorSchema = z
  .object({
    version: z.literal(1),
    ok: z.literal(false),
    code: z.enum([
      "LLM_IMAGE_CORRUPT",
      "LLM_IMAGE_UNSUPPORTED",
      "LLM_IMAGE_MULTIFRAME",
      "LLM_RESOURCE_LIMIT",
    ]),
  })
  .strict();
const failure = (code: LlmFailure, closed = true) =>
  new LlmOperationError(code, "not-sent", closed);

function checked(
  value: unknown,
  bytes: Buffer,
  input: Input,
): LlmImagePreparedSource {
  const result = metadataSchema.safeParse(value);
  if (!result.success) throw failure("LLM_SOURCE_INVALID");
  const m = result.data;
  if (
    m.bytes !== bytes.length ||
    createHash("sha256").update(bytes).digest("hex") !== m.sha256 ||
    m.width * m.height > LLM_LIMITS.imagePixels ||
    m.sourceWidth * m.sourceHeight > LLM_LIMITS.imagePixels ||
    m.width !== (m.orientation >= 5 ? m.sourceHeight : m.sourceWidth) ||
    m.height !== (m.orientation >= 5 ? m.sourceWidth : m.sourceHeight) ||
    bytes.length < 33 ||
    !bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    bytes.readUInt32BE(8) !== 13 ||
    bytes.toString("ascii", 12, 16) !== "IHDR" ||
    bytes.readUInt32BE(16) !== m.width ||
    bytes.readUInt32BE(20) !== m.height ||
    bytes[24] !== 8 ||
    bytes[25] !== 2
  )
    throw failure("LLM_SOURCE_INVALID");
  return {
    kind: "single-raster",
    preparationVersion: 3,
    ...imageIdentity(input.source, m),
    raster: { mimeType: "image/png", bytes, width: m.width, height: m.height },
    coverage: {
      kind: "single-frame",
      codec: m.codec,
      sourceWidth: m.sourceWidth,
      sourceHeight: m.sourceHeight,
      orientation: m.orientation,
      frames: 1,
      fullPixels: true,
      resized: false,
      cropped: false,
    },
    normalization: "srgb-white-v1",
  };
}

export class NodeLlmImagePreparer {
  constructor(
    private readonly childPath: string,
    private readonly factory: ImageChildFactory = spawn,
  ) {}

  async prepare(
    input: Input,
    signal: AbortSignal,
  ): Promise<LlmImagePreparedSource> {
    if (signal.aborted) throw failure("LLM_UNAVAILABLE");
    if (input.bytes.byteLength > 50 * 1024 * 1024)
      throw failure("LLM_RESOURCE_LIMIT");
    if (
      !input.bytes.byteLength ||
      input.source.bytes !== input.bytes.byteLength ||
      input.preparationVersion !== 3 ||
      input.promptVersion !== 2 ||
      input.source.format !== "image" ||
      createHash("sha256").update(input.bytes).digest("hex") !==
        input.source.sha256
    )
      throw failure("LLM_SOURCE_INVALID");
    const birth = await input.native?.reserve();
    let child: ChildProcess;
    try {
      child = this.factory(process.execPath, [this.childPath], {
        stdio: ["pipe", "pipe", "pipe", "pipe"],
        // The codec child does not inherit the web app's augmented ProcessEnv.
        env: {
          LANG: "C",
          LC_ALL: "C",
          UV_THREADPOOL_SIZE: "1",
        } as unknown as NodeJS.ProcessEnv,
        windowsHide: true,
      });
    } catch {
      throw failure(
        birth ? "LLM_OWNERSHIP_UNKNOWN" : "LLM_UNAVAILABLE",
        !birth,
      );
    }
    return new Promise((resolve, reject) => {
      const inputPipe = child.stdin;
      const output = child.stdout;
      const errors = child.stderr;
      const metadata = child.stdio[3];
      const valid =
        inputPipe && output && errors && metadata instanceof Readable;
      const pipes = child.stdio.filter((pipe) => pipe != null);
      const closed = new Set<unknown>();
      let exited = false;
      let childClosed = false;
      let inputDone = !valid;
      let exitCode: number | null = null;
      let settled = false;
      let finalizing = false;
      let nativeUnknown = false;
      let stopping = false;
      let stopTimer: ReturnType<typeof setTimeout> | undefined;
      let code: LlmFailure | undefined;
      let outputBytes = 0;
      let metadataBytes = 0;
      let stderrBytes = 0;
      const png: Buffer[] = [];
      const json: Buffer[] = [];
      const release = () => {
        clearTimeout(timer);
        clearTimeout(stopTimer);
        signal.removeEventListener("abort", abort);
      };
      const finish = () => {
        if (
          !childClosed ||
          !exited ||
          !inputDone ||
          closed.size !== pipes.length
        )
          return;
        if (settled || finalizing) return;
        finalizing = true;
        if (nativeUnknown) {
          release();
          settled = true;
          reject(failure("LLM_OWNERSHIP_UNKNOWN", false));
          return;
        }
        const complete = () => {
          release();
          if (settled) return;
          settled = true;
          if (signal.aborted) {
            reject(failure("LLM_UNAVAILABLE"));
            return;
          }
          if (code) {
            reject(failure(code));
            return;
          }
          try {
            const value: unknown = JSON.parse(
              new TextDecoder("utf-8", { fatal: true }).decode(
                Buffer.concat(json, metadataBytes),
              ),
            );
            const error = errorSchema.safeParse(value);
            if (error.success) throw failure(error.data.code);
            if (exitCode !== 0) throw failure("LLM_SOURCE_INVALID");
            resolve(checked(value, Buffer.concat(png, outputBytes), input));
          } catch (error) {
            reject(
              error instanceof LlmOperationError
                ? error
                : failure("LLM_SOURCE_INVALID"),
            );
          }
        };
        if (!birth || !input.native) {
          complete();
          return;
        }
        clearTimeout(timer);
        clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          release();
          reject(failure("LLM_OWNERSHIP_UNKNOWN", false));
        }, LLM_LIMITS.stopMs);
        stopTimer.unref();
        void input.native.closed(birth).then(complete, () => {
          if (settled) return;
          settled = true;
          release();
          reject(failure("LLM_OWNERSHIP_UNKNOWN", false));
        });
      };
      const stop = (reason: LlmFailure) => {
        code ??= reason;
        if (stopping) return;
        stopping = true;
        inputPipe?.destroy();
        if (!exited && child.pid !== undefined) {
          try {
            child.kill("SIGTERM");
          } catch {
            /* No exit proof: retain ownership until actual close or unknown. */
          }
        }
        stopTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal.removeEventListener("abort", abort);
          reject(failure("LLM_OWNERSHIP_UNKNOWN", false));
        }, LLM_LIMITS.stopMs);
        stopTimer.unref();
        finish();
      };
      const abort = () => stop("LLM_UNAVAILABLE");
      const timer = setTimeout(() => stop("LLM_TIMEOUT"), LLM_LIMITS.prepareMs);
      timer.unref();
      signal.addEventListener("abort", abort, { once: true });
      for (const pipe of pipes) {
        pipe.once("close", () => {
          closed.add(pipe);
          finish();
        });
        pipe.on("error", () => stop("LLM_SOURCE_INVALID"));
      }
      child.once("error", () => {
        if (child.pid === undefined) exited = true;
        stop("LLM_UNAVAILABLE");
      });
      child.once("exit", (value) => {
        exited = true;
        exitCode = value;
        finish();
      });
      child.once("close", () => {
        childClosed = true;
        finish();
      });
      if (!valid) {
        stop("LLM_UNAVAILABLE");
        return;
      }
      output.on("data", (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > LLM_LIMITS.imageBytes) stop("LLM_RESOURCE_LIMIT");
        else if (!stopping) png.push(chunk);
      });
      errors.on("data", (chunk: Buffer) => {
        stderrBytes += chunk.length;
        if (stderrBytes > 4096) stop("LLM_RESOURCE_LIMIT");
      });
      metadata.on("data", (chunk: Buffer) => {
        metadataBytes += chunk.length;
        if (metadataBytes > 16384) stop("LLM_RESOURCE_LIMIT");
        else if (!stopping) json.push(chunk);
      });
      const bytes = input.bytes;
      const chunks = function* () {
        for (let offset = 0; offset < bytes.byteLength; offset += 65536)
          yield bytes.subarray(offset, offset + 65536);
      };
      void (async () => {
        try {
          if (birth && input.native) {
            if (child.pid === undefined)
              throw failure("LLM_OWNERSHIP_UNKNOWN", false);
            try {
              await input.native.register(birth, child.pid);
            } catch (error) {
              nativeUnknown = true;
              throw error;
            }
          }
          if (!stopping && !signal.aborted)
            await pipeline(Readable.from(chunks()), inputPipe);
          else inputPipe.destroy();
        } catch {
          stop(nativeUnknown ? "LLM_OWNERSHIP_UNKNOWN" : "LLM_SOURCE_INVALID");
        } finally {
          inputDone = true;
          finish();
        }
      })();
      if (signal.aborted) abort();
    });
  }
}
