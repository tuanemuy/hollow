import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, rename } from "node:fs/promises";
import path from "node:path";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { PDF_DOCUMENT_PROFILE } from "@repo/core/application/pdf/document";
import type { PdfCapacity } from "@repo/core/application/pdf/ports";
import { z } from "zod";
import { NodePdfSupervisor } from "./supervisor";
import type { PdfFixedFont } from "./workspace";

const absolute = z
  .string()
  .min(1)
  .refine((value) => path.isAbsolute(value) && !/[\r\n\0]/.test(value));
const bytes = z.number().int().safe().positive();
const file = z.strictObject({
  path: absolute,
  bytes,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const capacitySchema = z.strictObject({
  diskBytes: bytes,
  outputBytes: bytes,
  nativeTempBytes: bytes,
  finalCopyBytes: bytes,
  totalMs: bytes.max(3600000),
  renderMs: bytes.max(3600000),
  termGraceMs: bytes.max(30000),
  leaseMs: bytes,
  cleanupDelayMs: bytes,
});
const configuration = z.strictObject({
  version: z.literal(1),
  python: absolute,
  chrome: file,
  fonts: z.strictObject({ body: file, code: file }),
  capacity: capacitySchema,
});
const failure = () =>
  new SystemError(
    SystemErrorCode.PdfOwnershipUnknown,
    "PDF配備または前回の所有状態を安全に確認できません。",
  );
async function verifiedFile(input: z.infer<typeof file>) {
  const handle = await open(
    input.path,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size !== input.bytes) throw failure();
    const hash = createHash("sha256");
    let offset = 0;
    while (offset < input.bytes) {
      const buffer = Buffer.alloc(Math.min(65536, input.bytes - offset));
      const result = await handle.read(buffer, 0, buffer.length, offset);
      if (!result.bytesRead) throw failure();
      hash.update(buffer.subarray(0, result.bytesRead));
      offset += result.bytesRead;
    }
    const after = await handle.stat();
    if (
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      hash.digest("hex") !== input.sha256
    )
      throw failure();
  } finally {
    await handle.close();
  }
}
async function readConfiguration(fileName: string) {
  const handle = await open(
    fileName,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const info = await handle.stat();
    if (
      !info.isFile() ||
      info.uid !== process.getuid?.() ||
      (info.mode & 0o022) !== 0 ||
      info.size > 16384
    )
      throw failure();
    return configuration.parse(JSON.parse(await handle.readFile("utf8")));
  } finally {
    await handle.close();
  }
}
export type NodePdfConfiguration = Readonly<{
  root: string;
  profile: string;
  fonts: readonly PdfFixedFont[];
  capacity: PdfCapacity;
  supervisor: NodePdfSupervisor;
}>;

export async function prepareNodePdf(
  storageDirectory: string,
  configPath: string | undefined,
  bundleDirectory: string,
): Promise<NodePdfConfiguration | null> {
  const root = path.join(storageDirectory, ".pdf-runtime");
  try {
    const existing = await lstat(root).catch((error) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        return null;
      throw error;
    });
    if (!configPath) {
      if (existing) throw failure();
      return null;
    }
    const config = await readConfiguration(configPath);
    if (
      config.capacity.finalCopyBytes < config.capacity.outputBytes ||
      config.capacity.renderMs > config.capacity.totalMs
    )
      throw failure();
    const profile = createHash("sha256")
      .update(
        JSON.stringify({
          document: PDF_DOCUMENT_PROFILE,
          chrome: config.chrome.sha256,
          body: config.fonts.body.sha256,
          code: config.fonts.code.sha256,
        }),
      )
      .digest("hex");
    const supervisor = new NodePdfSupervisor(
      config.python,
      path.join(bundleDirectory, "supervisor.py"),
      root,
      profile,
      config.capacity,
    );
    if (existing) {
      if (
        !existing.isDirectory() ||
        existing.isSymbolicLink() ||
        existing.uid !== process.getuid?.() ||
        (existing.mode & 0o777) !== 0o700
      )
        throw failure();
      await supervisor.recover();
    }
    await verifiedFile(config.chrome);
    await verifiedFile(config.fonts.body);
    await verifiedFile(config.fonts.code);
    if (!existing) await mkdir(root, { recursive: true, mode: 0o700 });
    const runtime = {
      version: 1,
      node: process.execPath,
      engine: path.join(bundleDirectory, "engine.mjs"),
      chrome: config.chrome.path,
      profile,
      outputBytes: config.capacity.outputBytes,
      nativeTempBytes: config.capacity.nativeTempBytes,
      renderMs: config.capacity.renderMs,
    };
    const temp = path.join(root, "runtime.next.json");
    const output = await open(
      temp,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await output.writeFile(JSON.stringify(runtime));
      await output.sync();
    } finally {
      await output.close();
    }
    await rename(temp, path.join(root, "runtime.json"));
    if (!existing) await supervisor.recover();
    return {
      root,
      profile,
      capacity: config.capacity,
      supervisor,
      fonts: [
        { id: "font-body", ...config.fonts.body },
        { id: "font-code", ...config.fonts.code },
      ],
    };
  } catch {
    throw failure();
  }
}
