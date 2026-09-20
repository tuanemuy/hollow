import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { FileObjectStorage } from "../objectStorage";
import { prepareNodePdf } from "./config";
import { NodePdfSupervisor } from "./supervisor";

const directories: string[] = [];
async function directory() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hollow-pdf-config-"));
  directories.push(root);
  return root;
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of directories.splice(0))
    await rm(root, { recursive: true, force: true });
});
it("leaves new storage PDF-unconfigured without touching it", async () => {
  const root = await directory();
  expect(
    await prepareNodePdf(path.join(root, "objects"), undefined, root),
  ).toBeNull();
});
it("does not bypass common recovery when old PDF ownership lacks configuration", async () => {
  const root = await directory();
  await mkdir(path.join(root, ".pdf-runtime"), { mode: 0o700 });
  await expect(prepareNodePdf(root, undefined, root)).rejects.toMatchObject({
    code: "PDF_OWNERSHIP_UNKNOWN",
  });
});
it("keeps the PDF runtime outside normal object reads and partial cleanup", async () => {
  const root = await directory();
  const runtime = path.join(root, ".pdf-runtime");
  await mkdir(runtime, { mode: 0o700 });
  await writeFile(path.join(runtime, "canary"), "synthetic", { mode: 0o600 });
  await writeFile(path.join(root, "sample.part-test"), "partial");
  const storage = new FileObjectStorage(root);
  await expect(storage.read(".pdf-runtime")).rejects.toMatchObject({
    code: "DATA_INTEGRITY_ERROR",
  });
  await expect(storage.remove(".pdf-runtime")).rejects.toMatchObject({
    code: "DATA_INTEGRITY_ERROR",
  });
  await storage.remove("sample");
  expect(await readFile(path.join(runtime, "canary"), "utf8")).toBe(
    "synthetic",
  );
});
it("checks old ownership before replacing runtime configuration or reading new resources", async () => {
  const root = await directory();
  const runtime = path.join(root, ".pdf-runtime");
  await mkdir(runtime, { mode: 0o700 });
  const prior = "synthetic prior runtime";
  const ledger = "synthetic unknown ownership";
  await writeFile(path.join(runtime, "runtime.json"), prior, { mode: 0o600 });
  await writeFile(path.join(runtime, "generation.json"), ledger, {
    mode: 0o600,
  });
  const absent = {
    path: path.join(root, "absent-resource"),
    bytes: 1,
    sha256: "0".repeat(64),
  };
  const config = path.join(root, "config.json");
  await writeFile(
    config,
    JSON.stringify({
      version: 1,
      python: path.join(root, "absent-python"),
      chrome: absent,
      fonts: { body: absent, code: absent },
      capacity: {
        diskBytes: 10000,
        outputBytes: 100,
        nativeTempBytes: 100,
        finalCopyBytes: 100,
        totalMs: 1000,
        renderMs: 500,
        termGraceMs: 100,
        leaseMs: 1000,
        cleanupDelayMs: 100,
      },
    }),
    { mode: 0o600 },
  );
  const recovery = vi
    .spyOn(NodePdfSupervisor.prototype, "recover")
    .mockRejectedValue(new Error("synthetic ownership unknown"));
  await expect(prepareNodePdf(root, config, root)).rejects.toMatchObject({
    code: "PDF_OWNERSHIP_UNKNOWN",
  });
  expect(recovery).toHaveBeenCalledOnce();
  expect(await readFile(path.join(runtime, "runtime.json"), "utf8")).toBe(
    prior,
  );
  expect(await readFile(path.join(runtime, "generation.json"), "utf8")).toBe(
    ledger,
  );
  await expect(
    readFile(path.join(runtime, "runtime.next.json")),
  ).rejects.toMatchObject({ code: "ENOENT" });
});
