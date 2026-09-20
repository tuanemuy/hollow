import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  PdfBinarySourceReader,
  PdfRenderedFile,
  PdfRenderInput,
  PdfWorkspace,
} from "@repo/core/application/pdf/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import { isSerializableError } from "@repo/core/lib/error";

export type PdfFixedFont = Readonly<{
  id: "font-body" | "font-code";
  path: string;
  bytes: number;
  sha256: string;
}>;
export type PdfPackSlot = Readonly<{
  id: string;
  mime: string;
  bytes: number;
  sha256: string;
  offset: number;
}>;
export type PdfPackManifest = Readonly<{
  version: 1;
  computeId: string;
  generation: number;
  bytes: number;
  sha256: string;
  slots: readonly PdfPackSlot[];
  plan: PdfRenderInput["plan"];
}>;
const failed = () =>
  new SystemError(
    SystemErrorCode.ExternalApiError,
    "PDF作業領域を安全に利用できません。",
  );
function translated(error: unknown): never {
  if (isSerializableError(error)) throw error;
  throw failed();
}
async function closeFile(handle: Awaited<ReturnType<typeof open>>) {
  try {
    await handle.close();
  } catch {
    throw new SystemError(
      SystemErrorCode.PdfOwnershipUnknown,
      "PDFファイルの終了を確認できません。",
    );
  }
}
export function pdfWorkspacePath(root: string, id: string) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
  )
    throw failed();
  return path.join(root, "workspaces", id);
}
async function privateDirectory(directory: string) {
  const info = await lstat(directory);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    info.uid !== process.getuid?.() ||
    (info.mode & 0o777) !== 0o700
  )
    throw failed();
}

export class FilePdfWorkspace implements PdfWorkspace {
  constructor(
    private readonly root: string,
    private readonly fonts: readonly PdfFixedFont[],
  ) {}
  reservation(input: PdfRenderInput) {
    const manifestBytes = Buffer.byteLength(
      JSON.stringify({
        plan: input.plan,
        sources: input.sources.map((s) => ({
          id: s.id,
          mime: s.mime,
          bytes: s.bytes,
        })),
      }),
    );
    const total =
      this.fonts.reduce((sum, f) => sum + f.bytes, 0) +
      input.sources.reduce((sum, s) => sum + s.bytes, 0) +
      manifestBytes * 4 +
      input.sources.length * 1024 +
      4096;
    if (!Number.isSafeInteger(total) || total < 1) throw failed();
    return total;
  }
  async writePack(
    input: PdfRenderInput,
    reader: PdfBinarySourceReader,
    signal: AbortSignal,
  ) {
    try {
      await this.writePackFile(input, reader, signal);
    } catch (error) {
      translated(error);
    }
  }
  private async writePackFile(
    input: PdfRenderInput,
    reader: PdfBinarySourceReader,
    signal: AbortSignal,
  ) {
    const directory = pdfWorkspacePath(this.root, input.workspaceId);
    await privateDirectory(this.root);
    await mkdir(path.join(this.root, "workspaces"), {
      mode: 0o700,
      recursive: true,
    });
    await privateDirectory(path.join(this.root, "workspaces"));
    await mkdir(directory, { mode: 0o700 });
    await mkdir(path.join(directory, "native"), { mode: 0o700 });
    const pack = await open(
      path.join(directory, "resources.pack"),
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    const hash = createHash("sha256");
    const slots: PdfPackSlot[] = [];
    let bytes = 0;
    const append = async (
      id: string,
      mime: string,
      expected: number,
      stream: AsyncIterable<Uint8Array>,
      expectedHash?: string,
    ) => {
      const offset = bytes;
      const sum = createHash("sha256");
      let count = 0;
      for await (const chunk of stream) {
        signal.throwIfAborted();
        if (chunk.byteLength > 65536 || count + chunk.byteLength > expected)
          throw failed();
        let written = 0;
        while (written < chunk.byteLength) {
          const result = await pack.write(
            chunk,
            written,
            chunk.byteLength - written,
            bytes + written,
          );
          if (!result.bytesWritten) throw failed();
          written += result.bytesWritten;
        }
        hash.update(chunk);
        sum.update(chunk);
        count += chunk.byteLength;
        bytes += chunk.byteLength;
      }
      const sha256 = sum.digest("hex");
      if (count !== expected || (expectedHash && sha256 !== expectedHash))
        throw failed();
      slots.push({ id, mime, bytes: count, sha256, offset });
    };
    try {
      for (const font of this.fonts) {
        const fontFile = await open(
          font.path,
          constants.O_RDONLY | constants.O_NOFOLLOW,
        );
        try {
          const info = await fontFile.stat();
          if (!info.isFile() || info.size !== font.bytes) throw failed();
          await append(
            font.id,
            "font/otf",
            font.bytes,
            (async function* () {
              let at = 0;
              while (at < font.bytes) {
                signal.throwIfAborted();
                const b = Buffer.alloc(Math.min(65536, font.bytes - at));
                const r = await fontFile.read(b, 0, b.length, at);
                if (!r.bytesRead) throw failed();
                at += r.bytesRead;
                yield b.subarray(0, r.bytesRead);
              }
            })(),
            font.sha256,
          );
        } finally {
          await closeFile(fontFile);
        }
      }
      const ids = new Set(this.fonts.map((f) => String(f.id)));
      for (const source of input.sources) {
        if (ids.has(source.id)) throw failed();
        ids.add(source.id);
        await append(
          source.id,
          source.mime,
          source.bytes,
          reader.read(source, signal),
          source.kind === "stored" ? source.sha256 : undefined,
        );
      }
      if (input.plan.mediaIds.some((id) => !ids.has(id))) throw failed();
      signal.throwIfAborted();
      await pack.sync();
      await pack.chmod(0o400);
    } finally {
      await closeFile(pack);
    }
    const manifest: PdfPackManifest = {
      version: 1,
      computeId: input.computeId,
      generation: input.generation,
      bytes,
      sha256: hash.digest("hex"),
      slots,
      plan: input.plan,
    };
    const encoded = JSON.stringify(manifest);
    const file = await open(
      path.join(directory, "manifest.json"),
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await file.writeFile(encoded);
      await file.sync();
    } finally {
      await closeFile(file);
    }
    const admission = await open(
      path.join(directory, "admission.json"),
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await admission.writeFile(
        JSON.stringify({
          bytes: Buffer.byteLength(encoded),
          sha256: createHash("sha256").update(encoded).digest("hex"),
        }),
      );
      await admission.sync();
    } finally {
      await closeFile(admission);
    }
    signal.throwIfAborted();
  }
  async *readOutput(
    file: PdfRenderedFile,
    signal: AbortSignal,
  ): AsyncIterable<Uint8Array> {
    try {
      yield* this.readOutputFile(file, signal);
    } catch (error) {
      translated(error);
    }
  }
  private async *readOutputFile(
    file: PdfRenderedFile,
    signal: AbortSignal,
  ): AsyncIterable<Uint8Array> {
    const directory = pdfWorkspacePath(this.root, file.workspaceId);
    await privateDirectory(directory);
    const handle = await open(
      path.join(directory, "output.pdf"),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size !== file.bytes) throw failed();
      const hash = createHash("sha256");
      let offset = 0;
      while (offset < file.bytes) {
        signal.throwIfAborted();
        const b = Buffer.alloc(Math.min(65536, file.bytes - offset));
        const r = await handle.read(b, 0, b.length, offset);
        if (!r.bytesRead) throw failed();
        offset += r.bytesRead;
        hash.update(b.subarray(0, r.bytesRead));
        yield b.subarray(0, r.bytesRead);
      }
      if (hash.digest("hex") !== file.sha256) throw failed();
      signal.throwIfAborted();
    } finally {
      await closeFile(handle);
    }
  }
  async remove(id: string) {
    try {
      return await this.removeFiles(id);
    } catch (error) {
      return translated(error);
    }
  }
  private async removeFiles(id: string) {
    const directory = pdfWorkspacePath(this.root, id);
    try {
      await privateDirectory(directory);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        return true;
      throw error;
    }
    await rm(directory, { recursive: true });
    return true;
  }
  async bytes(id: string) {
    try {
      return await this.countBytes(id);
    } catch (error) {
      return translated(error);
    }
  }
  private async countBytes(id: string) {
    const directory = pdfWorkspacePath(this.root, id);
    let total = 0;
    const pending = [directory];
    while (pending.length) {
      const current = pending.pop();
      if (!current) break;
      let info: Awaited<ReturnType<typeof lstat>>;
      try {
        info = await lstat(current);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        )
          continue;
        throw error;
      }
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) {
        for (const child of await readdir(current))
          pending.push(path.join(current, child));
      } else if (info.isFile()) {
        total += info.size;
        if (!Number.isSafeInteger(total))
          throw new BusinessRuleError(
            "PDF_DISK_CONFIGURATION",
            "PDF領域の実使用量を安全に計算できません。",
          );
      }
    }
    return total;
  }
}
