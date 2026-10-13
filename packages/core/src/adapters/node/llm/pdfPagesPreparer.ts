import {
  type ChildProcess,
  type SpawnOptions,
  spawn,
} from "node:child_process";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type {
  LlmPdfPagesPreparer,
  PdfClassificationInput,
} from "@repo/core/application/llm/pdfClassificationPorts";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import { LLM_LIMITS, type LlmFailure } from "@repo/core/domain/llm/entity";
import {
  PDF_LLM_LIMITS,
  type PdfPageIdentity,
  type PdfPageManifest,
} from "@repo/core/domain/llm/pdfPreview";
import { z } from "zod";
import { pdfPagesIdentity } from "./pdfPagesIdentity";

export type PdfPagesChildFactory = (
  file: string,
  args: readonly string[],
  options: SpawnOptions,
) => ChildProcess;
const positive = z.number().int().positive();
const pageSchema = z
  .object({
    ordinal: z.number().int().min(0).max(31),
    width: positive.max(PDF_LLM_LIMITS.dimension),
    height: positive.max(PDF_LLM_LIMITS.dimension),
    bytes: positive.max(PDF_LLM_LIMITS.pageBytes),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
const preparedSchema = z
  .object({
    version: z.literal(1),
    ok: z.literal(true),
    pages: z.array(pageSchema).min(1).max(PDF_LLM_LIMITS.pages),
  })
  .strict();
const rasterSchema = z
  .object({ version: z.literal(1), ok: z.literal(true), page: pageSchema })
  .strict();
const errorSchema = z
  .object({
    version: z.literal(1),
    ok: z.literal(false),
    code: z.enum([
      "LLM_DOCUMENT_CORRUPT",
      "LLM_DOCUMENT_ENCRYPTED",
      "LLM_DOCUMENT_UNSUPPORTED",
      "LLM_RESOURCE_LIMIT",
      "LLM_TIMEOUT",
      "LLM_UNAVAILABLE",
    ]),
  })
  .strict();
const failure = (code: LlmFailure, closed = true) =>
  new LlmOperationError(code, "not-sent", closed);
type Result = Readonly<{ metadata: unknown; png: Buffer }>;

export class NodeLlmPdfPagesPreparer implements LlmPdfPagesPreparer {
  constructor(
    private readonly childPath: string,
    private readonly factory: PdfPagesChildFactory = spawn,
  ) {}

  async prepare(
    input: PdfClassificationInput,
    signal: AbortSignal,
  ): Promise<PdfPageManifest> {
    const value = await this.run(input, null, signal);
    const parsed = preparedSchema.safeParse(value.metadata);
    if (!parsed.success || value.png.length)
      throw failure("LLM_SOURCE_INVALID");
    try {
      return pdfPagesIdentity(input.source, parsed.data.pages);
    } catch {
      throw failure("LLM_SOURCE_INVALID");
    }
  }

  async redraw(
    input: PdfClassificationInput &
      Readonly<{ manifest: PdfPageManifest; page: PdfPageIdentity }>,
    signal: AbortSignal,
  ) {
    const expected = input.manifest.pages[input.page.ordinal];
    const manifest = pdfPagesIdentity(input.source, input.manifest.pages);
    if (
      manifest.sha256 !== input.manifest.sha256 ||
      !expected ||
      expected.sha256 !== input.page.sha256 ||
      expected.width !== input.page.width ||
      expected.height !== input.page.height ||
      expected.bytes !== input.page.bytes
    )
      throw failure("LLM_SOURCE_CHANGED");
    const value = await this.run(input, input.page.ordinal, signal);
    const parsed = rasterSchema.safeParse(value.metadata);
    if (!parsed.success) throw failure("LLM_SOURCE_INVALID");
    const page = parsed.data.page;
    const png = value.png;
    if (
      page.ordinal !== expected.ordinal ||
      page.sha256 !== expected.sha256 ||
      page.width !== expected.width ||
      page.height !== expected.height ||
      page.bytes !== expected.bytes
    )
      throw failure("LLM_SOURCE_CHANGED");
    if (
      png.length !== page.bytes ||
      createHash("sha256").update(png).digest("hex") !== page.sha256 ||
      png.length < 33 ||
      !png
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      png.readUInt32BE(8) !== 13 ||
      png.toString("ascii", 12, 16) !== "IHDR" ||
      png.readUInt32BE(16) !== page.width ||
      png.readUInt32BE(20) !== page.height ||
      png[24] !== 8 ||
      (png[25] !== 2 && png[25] !== 6)
    )
      throw failure("LLM_SOURCE_INVALID");
    return {
      mimeType: "image/png" as const,
      bytes: png,
      width: page.width,
      height: page.height,
    };
  }

  private async run(
    input: PdfClassificationInput,
    ordinal: number | null,
    signal: AbortSignal,
  ): Promise<Result> {
    if (signal.aborted) throw failure("LLM_UNAVAILABLE");
    if (input.bytes.byteLength > 50 * 1024 * 1024)
      throw failure("LLM_RESOURCE_LIMIT");
    if (
      !input.bytes.byteLength ||
      input.source.format !== "pdf" ||
      input.source.bytes !== input.bytes.byteLength ||
      createHash("sha256").update(input.bytes).digest("hex") !==
        input.source.sha256 ||
      (ordinal !== null &&
        (!Number.isInteger(ordinal) ||
          ordinal < 0 ||
          ordinal >= PDF_LLM_LIMITS.pages))
    )
      throw failure("LLM_SOURCE_INVALID");
    const birth = await input.native?.reserve(signal);
    let child: ChildProcess;
    try {
      child = this.factory(process.execPath, [this.childPath], {
        stdio: ["pipe", "pipe", "pipe", "pipe"],
        windowsHide: true,
        env: {
          LANG: "C",
          LC_ALL: "C",
          UV_THREADPOOL_SIZE: "1",
          HOLLOW_PDF_PAGES_ACTION: ordinal === null ? "prepare" : "redraw",
          ...(ordinal === null
            ? {}
            : { HOLLOW_PDF_PAGES_ORDINAL: String(ordinal) }),
        } as unknown as NodeJS.ProcessEnv,
      });
    } catch {
      throw failure(
        birth ? "LLM_OWNERSHIP_UNKNOWN" : "LLM_UNAVAILABLE",
        !birth,
      );
    }
    return new Promise((resolve, reject) => {
      const inputPipe = child.stdin;
      const metadata = child.stdout;
      const errors = child.stderr;
      const binary = child.stdio[3];
      const valid =
        inputPipe && metadata && errors && binary instanceof Readable;
      const pipes = child.stdio.filter((pipe) => pipe != null);
      const closed = new Set<unknown>();
      let exited = false;
      let childClosed = false;
      let inputDone = !valid;
      let settled = false;
      let finalizing = false;
      let nativeUnknown = false;
      let stopping = false;
      let exitCode: number | null = null;
      let code: LlmFailure | undefined;
      let binaryBytes = 0;
      let metadataBytes = 0;
      let stderrBytes = 0;
      const png: Buffer[] = [];
      const json: Buffer[] = [];
      let stopTimer: ReturnType<typeof setTimeout> | undefined;
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
          if (signal.aborted) return reject(failure("LLM_UNAVAILABLE"));
          if (code) return reject(failure(code));
          try {
            const value: unknown = JSON.parse(
              new TextDecoder("utf-8", { fatal: true }).decode(
                Buffer.concat(json, metadataBytes),
              ),
            );
            const error = errorSchema.safeParse(value);
            if (error.success) throw failure(error.data.code);
            if (exitCode !== 0 || stderrBytes !== 0)
              throw failure("LLM_DOCUMENT_CORRUPT");
            resolve({ metadata: value, png: Buffer.concat(png, binaryBytes) });
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
        png.length = 0;
        inputPipe?.destroy();
        if (!exited && child.pid !== undefined) {
          try {
            child.kill("SIGTERM");
          } catch {
            /* Actual closure remains unproven. */
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
      const timer = setTimeout(
        () => stop("LLM_TIMEOUT"),
        ordinal === null ? PDF_LLM_LIMITS.prepareMs : PDF_LLM_LIMITS.pageMs,
      );
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
      metadata.on("data", (chunk: Buffer) => {
        metadataBytes += chunk.length;
        if (metadataBytes > PDF_LLM_LIMITS.manifestBytes)
          stop("LLM_RESOURCE_LIMIT");
        else if (!stopping) json.push(chunk);
      });
      binary.on("data", (chunk: Buffer) => {
        binaryBytes += chunk.length;
        if (binaryBytes > (ordinal === null ? 0 : PDF_LLM_LIMITS.pageBytes))
          stop("LLM_RESOURCE_LIMIT");
        else if (!stopping) png.push(chunk);
      });
      errors.on("data", (chunk: Buffer) => {
        stderrBytes += chunk.length;
        if (stderrBytes > 4096) stop("LLM_RESOURCE_LIMIT");
      });
      const chunks = function* () {
        for (let offset = 0; offset < input.bytes.length; offset += 65536)
          yield input.bytes.subarray(offset, offset + 65536);
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
