import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  openSync,
  realpathSync,
  writeSync,
} from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Worker as WorkerType } from "node:worker_threads";
import { deflateSync } from "node:zlib";
import { NodeLlmRuntimeOwnership } from "@repo/core/adapters/node/llm/runtimeOwnership";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { completeLlm } from "@repo/core/application/llm/completion";
import { cancelLlmRegeneration } from "@repo/core/application/llm/control";
import { sweepPdfPreviews } from "@repo/core/application/llm/pdfPreview";
import { recoverLlm, sweepLlm } from "@repo/core/application/llm/worker";
import type { SourceInputProof } from "@repo/core/application/regeneration/services";
import ExcelJS from "exceljs";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  createFormatsFixture,
  type FormatSlot,
  type FormatsFixture,
  lostFinishRecovery,
} from "./llmLocalFormats.integration.test";

function crc(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function zip(parts: Readonly<Record<string, string>>) {
  const files: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(parts)) {
    const value = Buffer.from(text);
    const filename = Buffer.from(name);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc(value), 14);
    header.writeUInt32LE(value.length, 18);
    header.writeUInt32LE(value.length, 22);
    header.writeUInt16LE(filename.length, 26);
    files.push(header, filename, value);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(crc(value), 16);
    directory.writeUInt32LE(value.length, 20);
    directory.writeUInt32LE(value.length, 24);
    directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, filename);
    offset += header.length + filename.length + value.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(Object.keys(parts).length, 8);
  end.writeUInt16LE(Object.keys(parts).length, 10);
  end.writeUInt32LE(Buffer.concat(central).length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, ...central, end]);
}
function pdf(contents: readonly string[]) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${contents.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${contents.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [index, content] of contents.entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    );
  }
  let body = "%PDF-1.7\n";
  const offsets: number[] = [];
  for (const [index, value] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${value}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}
function png() {
  const chunk = (name: string, value: Buffer) => {
    const kind = Buffer.from(name);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(value.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc(Buffer.concat([kind, value])));
    return Buffer.concat([size, kind, value, checksum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.from([0, 255, 255, 255]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
async function fixtures(): Promise<readonly FormatSlot[]> {
  const R =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const relationships = (body: string) =>
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
  const relation = (id: string, type: string, target: string) =>
    `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`;
  const docx = zip({
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    "_rels/.rels": relationships(
      relation("r1", "officeDocument", "word/document.xml"),
    ),
    "word/document.xml": `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Office text</w:t></w:r></w:p></w:body></w:document>`,
  });
  const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
  const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const pptx = zip({
    "[Content_Types].xml": "<Types/>",
    "_rels/.rels": relationships(
      relation("r1", "officeDocument", "ppt/presentation.xml"),
    ),
    "ppt/presentation.xml": `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="1" r:id="s1"/></p:sldIdLst></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": relationships(
      relation("s1", "slide", "slides/slide1.xml"),
    ),
    "ppt/slides/slide1.xml": `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree><a:p><a:r><a:t>Office slide</a:t></a:r></a:p></p:spTree></p:cSld></p:sld>`,
  });
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Sheet1").addRow(["Office cell"]);
  return [
    { name: "docx", format: "docx", bytes: docx },
    {
      name: "xlsx",
      format: "xlsx",
      bytes: Buffer.from(await workbook.xlsx.writeBuffer()),
    },
    { name: "pptx", format: "pptx", bytes: pptx },
    { name: "image", format: "image", bytes: png() },
    {
      name: "strict",
      format: "pdf",
      bytes: pdf(["BT /F1 12 Tf 10 80 Td (First) Tj 0 -20 Td (Second) Tj ET"]),
    },
    {
      name: "visual",
      format: "pdf",
      bytes: pdf(["0 0 1 RG 10 10 50 50 re S", "1 0 0 rg 10 10 50 50 re f"]),
    },
  ];
}
type WorkerReceipt = {
  worker: WorkerType;
  exit: number | null;
  successMessage: boolean;
  fallbackMessage: boolean;
  terminateRequested: boolean;
  terminateCode: number | null;
  cleanupForced: boolean;
  outEOF: boolean;
  errEOF: boolean;
  outClosed: boolean;
  errClosed: boolean;
};
type ChildReceipt = {
  child: ChildProcess;
  pid: number | null;
  birthUnknown: boolean;
  absent: boolean | null;
  exit: number | null;
  closed: boolean;
  eof: Set<number>;
  closedFD: Set<number>;
  forced: boolean;
};
function observeNative() {
  const require = createRequire(import.meta.url);
  const wm: typeof import("node:worker_threads") = require("node:worker_threads");
  const cm: typeof import("node:child_process") = require("node:child_process");
  const NativeWorker = wm.Worker;
  const originalSpawn = cm.spawn;
  const workers: WorkerReceipt[] = [];
  const children: ChildReceipt[] = [];
  let activeWorkers = 0;
  let activeChildren = 0;
  let workerAttempts = 0;
  let childAttempts = 0;
  let normalChecks = 0;
  let stopped = false;
  let restored = false;
  let databaseClosed: boolean | null = null;
  const modulePath = (name: string) =>
    realpathSync(
      fileURLToPath(new URL(`../../node/llm/${name}`, import.meta.url)),
    );
  const documentPath = modulePath("documentWorker.mjs");
  const childPaths = [
    modulePath("imageChild.mjs"),
    modulePath("pdfPagesChild.mjs"),
  ];
  const root = process.env["HOLLOW_S4_ROOT"];
  if (!root || realpathSync(root) !== root) throw Error("S4_NATIVE_ROOT");
  const ledgerFile = `${root}/records/native-ledger.json`;
  let ledgerIdentity: { dev: number; ino: number } | undefined;
  const persist = (create = false) => {
    const data = Buffer.from(
      JSON.stringify({
        version: 1,
        workerAttempts,
        childAttempts,
        normalChecks,
        stopped,
        restored,
        databaseClosed,
        workers: workers.map(({ worker: _worker, ...receipt }) => receipt),
        children: children.map(({ child: _child, pid: _pid, ...receipt }) => ({
          ...receipt,
          pidKnown: _pid !== null,
          eof: [...receipt.eof].sort(),
          closedFD: [...receipt.closedFD].sort(),
        })),
      }),
    );
    if (data.length > 8192) throw Error("S4_NATIVE_LEDGER_CAP");
    const fd = openSync(
      ledgerFile,
      constants.O_WRONLY |
        constants.O_NOFOLLOW |
        (create ? constants.O_CREAT | constants.O_EXCL : 0),
      0o600,
    );
    try {
      const info = fstatSync(fd);
      if (
        !info.isFile() ||
        info.nlink !== 1 ||
        info.uid !== process.getuid?.() ||
        (info.mode & 0o777) !== 0o600
      )
        throw Error("S4_NATIVE_LEDGER_FILE");
      if (create) ledgerIdentity = { dev: info.dev, ino: info.ino };
      if (
        !ledgerIdentity ||
        ledgerIdentity.dev !== info.dev ||
        ledgerIdentity.ino !== info.ino
      )
        throw Error("S4_NATIVE_LEDGER_IDENTITY");
      let offset = 0;
      while (offset < data.length) {
        const written = writeSync(fd, data.subarray(offset), offset);
        if (written < 1) throw Error("S4_NATIVE_LEDGER_WRITE");
        offset += written;
      }
      ftruncateSync(fd, data.length);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  };
  persist(true);
  class ObservedWorker extends NativeWorker {
    readonly receipt: WorkerReceipt;
    constructor(...args: ConstructorParameters<typeof NativeWorker>) {
      if (
        workerAttempts >= 6 ||
        activeWorkers !== 0 ||
        (args[0] instanceof URL &&
          (args[0].protocol !== "file:" ||
            args[0].search !== "" ||
            args[0].hash !== "")) ||
        (args[0] instanceof URL ? fileURLToPath(args[0]) : args[0]) !==
          documentPath ||
        realpathSync(
          args[0] instanceof URL ? fileURLToPath(args[0]) : args[0],
        ) !== documentPath
      )
        throw Error("S4_WORKER_CAP");
      workerAttempts++;
      activeWorkers++;
      try {
        super(...args);
      } catch (error) {
        activeWorkers--;
        throw error;
      }
      const r: WorkerReceipt = {
        worker: this,
        exit: null,
        successMessage: false,
        fallbackMessage: false,
        terminateRequested: false,
        terminateCode: null,
        cleanupForced: false,
        outEOF: false,
        errEOF: false,
        outClosed: false,
        errClosed: false,
      };
      this.receipt = r;
      workers.push(r);
      this.on("message", (value: unknown) => {
        if (
          typeof value === "object" &&
          value !== null &&
          "ok" in value &&
          value.ok === true
        )
          r.successMessage = true;
        if (
          typeof value === "object" &&
          value !== null &&
          "ok" in value &&
          value.ok === false &&
          "code" in value &&
          (value.code === "LLM_PDF_VISUAL_REQUIRED" ||
            value.code === "LLM_PDF_ORDER_UNPROVEN")
        )
          r.fallbackMessage = true;
      });
      this.once("exit", (code) => {
        r.exit = code;
        activeWorkers--;
      });
      this.stdout.once("end", () => {
        r.outEOF = true;
      });
      this.stderr.once("end", () => {
        r.errEOF = true;
      });
      this.stdout.once("close", () => {
        r.outClosed = true;
      });
      this.stderr.once("close", () => {
        r.errClosed = true;
      });
    }
    override terminate() {
      this.receipt.terminateRequested = true;
      const result = super.terminate();
      void result.then(
        (code) => {
          this.receipt.terminateCode = code;
        },
        () => {},
      );
      return result;
    }
  }
  const observedSpawn = new Proxy(originalSpawn, {
    apply(target, thisArg, args: unknown[]) {
      const childArgs = args[1];
      const module = Array.isArray(childArgs) ? childArgs[0] : undefined;
      if (
        childAttempts >= 6 ||
        activeChildren !== 0 ||
        args[0] !== process.execPath ||
        typeof module !== "string" ||
        !Array.isArray(childArgs) ||
        childArgs.length !== 1 ||
        !childPaths.includes(module) ||
        realpathSync(module) !== module
      )
        throw Error("S4_CHILD_CAP");
      childAttempts++;
      activeChildren++;
      let child: ChildProcess;
      try {
        child = Reflect.apply(target, thisArg, args);
      } catch (error) {
        activeChildren--;
        throw error;
      }
      const pid = child.pid;
      const r: ChildReceipt = {
        child,
        pid: pid ?? null,
        birthUnknown: pid === undefined,
        absent: null,
        exit: null,
        closed: false,
        eof: new Set(),
        closedFD: new Set(),
        forced: false,
      };
      children.push(r);
      child.once("spawn", () => {
        r.pid = child.pid ?? null;
      });
      child.on("error", () => {});
      let active = true;
      const ended = () => {
        if (active) {
          active = false;
          activeChildren--;
        }
      };
      child.once("exit", (code) => {
        r.exit = code;
        ended();
      });
      child.once("close", () => {
        r.closed = true;
        ended();
      });
      for (const [index, stream] of child.stdio.entries()) {
        if (!stream) continue;
        stream.once("close", () => {
          r.closedFD.add(index);
        });
        if (index > 0)
          stream.once("end", () => {
            r.eof.add(index);
          });
      }
      return child;
    },
  });
  wm.Worker = ObservedWorker;
  cm.spawn = observedSpawn;
  syncBuiltinESMExports();
  const allClosed = () =>
    workers.every(
      (r) =>
        r.exit !== null && r.outEOF && r.errEOF && r.outClosed && r.errClosed,
    ) &&
    children.every(
      (r) =>
        r.exit !== null &&
        r.closed &&
        r.closedFD.size === 4 &&
        r.eof.size === 3,
    );
  return {
    workers,
    children,
    databaseClosed(value: boolean) {
      databaseClosed = value;
      persist();
    },
    async normal() {
      try {
        await vi.waitFor(() => expect(allClosed()).toBe(true), {
          timeout: 10_000,
          interval: 20,
        });
        for (const r of workers)
          expect(
            !r.cleanupForced &&
              (r.exit === 0 ||
                (r.exit === 1 &&
                  (r.successMessage || r.fallbackMessage) &&
                  r.terminateRequested &&
                  r.terminateCode === r.exit)),
          ).toBe(true);
        for (const r of children) {
          expect(r.exit).toBe(0);
          expect(r.forced).toBe(false);
          expect(r.birthUnknown).toBe(false);
          const pid = r.pid;
          if (pid === null) throw Error("S4_CHILD_PID");
          expect(() => process.kill(pid, 0)).toThrow(
            expect.objectContaining({ code: "ESRCH" }),
          );
          r.absent = true;
        }
        normalChecks++;
      } finally {
        persist();
      }
    },
    async stop() {
      for (const r of children)
        if (!r.closed && r.exit === null) {
          r.forced = true;
          r.child.kill("SIGTERM");
        }
      for (const r of workers)
        if (r.exit === null) {
          r.cleanupForced = true;
          void r.worker.terminate().catch(() => {});
        }
      try {
        const deadline = performance.now() + 10_000;
        while (!allClosed() && performance.now() < deadline)
          await new Promise((resolve) => setTimeout(resolve, 20));
        for (const r of children)
          if (!r.closed && r.exit === null) r.child.kill("SIGKILL");
        await vi.waitFor(() => expect(allClosed()).toBe(true), {
          timeout: 10_000,
          interval: 20,
        });
        stopped = true;
      } finally {
        persist();
      }
    },
    restore() {
      if (wm.Worker !== ObservedWorker || cm.spawn !== observedSpawn)
        throw Error("S4_OBSERVER_REPLACED");
      wm.Worker = NativeWorker;
      cm.spawn = originalSpawn;
      syncBuiltinESMExports();
      restored = true;
      persist();
    },
  };
}
if (process.env["HOLLOW_S4_GROUP"] === "native")
  describe.sequential("S4-N normal local formats and actual native closure", () => {
    let f: FormatsFixture;
    let observer: ReturnType<typeof observeNative>;
    let started = 0;
    beforeAll(async () => {
      started = performance.now();
      observer = observeNative();
      f = await createFormatsFixture("native", await fixtures());
    }, 40_000);
    beforeEach(async () => {
      expect(performance.now() - started).toBeLessThan(180_000);
      await f.guard();
    });
    afterEach(async (context) => {
      if (context.task.result?.state === "fail") f.fail();
      else {
        await observer.normal();
        await f.guard();
      }
    });
    afterAll(async () => {
      try {
        if (f) {
          await f.close();
          observer.databaseClosed(f.client.closed);
        }
      } finally {
        try {
          await observer?.stop();
        } finally {
          observer?.restore();
        }
      }
    }, 60_000);
    for (const name of ["docx", "xlsx", "pptx", "image"] as const)
      it(`S4-N normal ${name} closes actual handles before generation`, async () => {
        const request = await f.request(name);
        await sweepLlm(f.container);
        const row = await f.wait(request.jobId);
        expect(row.outcome.kind).toBe("succeeded");
        expect(row.sourceMemoryBytes).toBe(0);
        expect(row.inputReceipt).toMatchObject({
          state: "closed",
          generation: 1,
        });
        expect(
          f.generations
            .filter((entry) => entry.consumer === row.jobId)
            .map((entry) => entry.generation),
        ).toEqual([1]);
      }, 40_000);
    it("S4-N strict PDF pending classify closes g1 before V2 prepare g2 and dispatch", async () => {
      const request = await f.pending("strict");
      await sweepLlm(f.container);
      const row = await f.wait(request.jobId);
      expect(row.outcome.kind).toBe("succeeded");
      expect(row.inputReceipt).toMatchObject({
        state: "closed",
        generation: 2,
      });
      expect(
        f.generations
          .filter((entry) => entry.consumer === row.jobId)
          .map((entry) => entry.generation),
      ).toEqual([2]);
    }, 40_000);
    it("S4-N visual preview and two redraws have independent consumer/g and actual children", async () => {
      const request = await f.preview("visual");
      await sweepPdfPreviews(f.container);
      await vi.waitFor(
        async () =>
          expect(
            (
              await f.container.unitOfWorkProvider.run((u) =>
                u.llmPdfPreviews.find(request.previewId),
              )
            )?.state,
          ).toBe("ready"),
        { timeout: 35_000, interval: 20 },
      );
      const preview = await f.container.unitOfWorkProvider.run((u) =>
        u.llmPdfPreviews.find(request.previewId),
      );
      expect(preview?.inputReceipt).toMatchObject({
        consumer: { kind: "pdf-preview" },
        state: "closed",
        generation: 1,
      });
      const job = await f.request("visual", request.previewId);
      await sweepLlm(f.container);
      const row = await f.wait(job.jobId);
      expect(row.outcome.kind).toBe("succeeded");
      expect(row.inputReceipt).toMatchObject({
        generation: 3,
        state: "closed",
      });
      expect(
        f.generations
          .filter((entry) => entry.consumer === row.jobId)
          .map((entry) => entry.generation),
      ).toEqual([2, 3]);
      expect(
        (
          await f.container.unitOfWorkProvider.run((u) =>
            u.llmQuota.reservation(row.jobId),
          )
        )?.state,
      ).toBe("consumed");
      expect(observer.workers).toHaveLength(6);
      expect(observer.children).toHaveLength(4);
    }, 40_000);
    it("S4-N V3 actual child closes while saved finish acknowledgement retains pin/execution then exact recovery releases", async () => {
      await lostFinishRecovery(f, "image");
      expect(observer.children).toHaveLength(5);
    }, 40_000);
  });

type DReceipt = {
  counterpart: "active" | "unknown";
  ownerExit: number | null;
  ownerAbsent: boolean;
  ownerEOF: boolean;
  ownerFDClosed: boolean;
  ownerIPCDisconnected: boolean;
  clientClosed: boolean;
  checkpoint: boolean;
  parentMatched: boolean;
  nativeAliveAfterOwner: boolean;
  nativeAbsent: boolean;
  nativeExit: null;
  nativeFDClosed: null;
  nativePipes: "not-used";
  rollback: boolean;
  responseLost: boolean;
  recovered: boolean;
  forced: boolean;
};
const dAbsent = (pid: number) => {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "ESRCH";
  }
};
const dSend = (
  child: ChildProcess,
  value: { type: "claim"; previewId: string } | { type: "exit" },
) =>
  new Promise<void>((resolve, reject) => {
    if (!child.connected) return reject(Error("S4_D_IPC"));
    child.send(value, (error) => (error ? reject(error) : resolve()));
  });
if (process.env["HOLLOW_S4_GROUP"] === "native-d")
  describe.sequential("S4-D true orphan preview predecessor", () => {
    let f: FormatsFixture;
    let started = 0;
    const receipts: DReceipt[] = [];
    const owners: ChildProcess[] = [];
    let ledgerIdentity: { dev: number; ino: number } | undefined;
    let ledgerClosed = false;
    const persist = () => {
      const file = path.join(f.root, "records", "native-d-ledger.json");
      const data = Buffer.from(
        JSON.stringify({
          version: 2,
          childAttempts:
            owners.length + receipts.filter((row) => row.parentMatched).length,
          receipts,
          databaseClosed: ledgerClosed,
        }),
      );
      if (data.length > 8192 || receipts.length > 2 || owners.length > 2)
        throw Error("S4_D_LEDGER_CAP");
      const fd = openSync(
        file,
        constants.O_WRONLY |
          constants.O_NOFOLLOW |
          (ledgerIdentity ? 0 : constants.O_CREAT | constants.O_EXCL),
        0o600,
      );
      try {
        const info = fstatSync(fd);
        if (
          !info.isFile() ||
          info.nlink !== 1 ||
          info.uid !== process.getuid?.() ||
          (info.mode & 0o777) !== 0o600
        )
          throw Error("S4_D_LEDGER_FILE");
        if (!ledgerIdentity) ledgerIdentity = { dev: info.dev, ino: info.ino };
        if (info.dev !== ledgerIdentity.dev || info.ino !== ledgerIdentity.ino)
          throw Error("S4_D_LEDGER_IDENTITY");
        let n = 0;
        while (n < data.length) {
          const written = writeSync(fd, data.subarray(n), n);
          if (written <= 0) throw Error("S4_D_LEDGER_WRITE");
          n += written;
        }
        ftruncateSync(fd, data.length);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    };
    beforeAll(async () => {
      started = performance.now();
      f = await createFormatsFixture("native", [
        {
          name: "active",
          format: "pdf",
          bytes: pdf(["0 0 1 RG 10 10 50 50 re S"]),
        },
        {
          name: "unknown",
          format: "pdf",
          bytes: pdf(["1 0 0 rg 10 10 50 50 re f"]),
        },
      ]);
    }, 40_000);
    beforeEach(async () => {
      expect(performance.now() - started).toBeLessThan(180_000);
      await f.guard();
    });
    afterEach(async (context) => {
      if (context.task.result?.state === "fail") f.fail();
      persist();
    });
    afterAll(async () => {
      try {
        if (f) {
          await f.close();
          ledgerClosed = f.client.closed;
          persist();
        }
      } finally {
        for (const owner of owners)
          if (owner.exitCode === null && owner.signalCode === null)
            owner.kill("SIGTERM");
      }
    }, 60_000);
    for (const counterpart of ["active", "unknown"] as const)
      it(`S4-D ${counterpart} actual orphan and same proof two CAS recovery`, async () => {
        const row: DReceipt = {
          counterpart,
          ownerExit: null,
          ownerAbsent: false,
          ownerEOF: false,
          ownerFDClosed: false,
          ownerIPCDisconnected: false,
          clientClosed: false,
          checkpoint: false,
          parentMatched: false,
          nativeAliveAfterOwner: false,
          nativeAbsent: false,
          nativeExit: null,
          nativeFDClosed: null,
          nativePipes: "not-used",
          rollback: false,
          responseLost: false,
          recovered: false,
          forced: false,
        };
        receipts.push(row);
        const request = await f.preview(counterpart);
        const bootstrap = process.env["HOLLOW_S4_BOOTSTRAP"];
        if (
          bootstrap !==
          "/Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/p5c-s4-native-bootstrap.mjs"
        )
          throw Error("S4_D_BOOTSTRAP");
        if (owners.length >= 2) throw Error("S4_D_CHILD_CAP");
        const owner = spawn(
          process.execPath,
          ["--experimental-transform-types", bootstrap, "owner", counterpart],
          {
            detached: false,
            stdio: ["pipe", "pipe", "pipe", "ipc"],
            env: {
              PATH:
                path.dirname(realpathSync(process.execPath)) + ":/usr/bin:/bin",
              LANG: "C.UTF-8",
              TMPDIR: path.join(f.root, "tmp"),
              HOLLOW_S4_ROOT: f.root,
            },
          },
        );
        owners.push(owner);
        const eof = new Set<number>();
        const closed = new Set<number>();
        let exited = false;
        let disconnected = false;
        let messageBytes = 0;
        let outputBytes = 0;
        let outputFault = false;
        const countOutput = (chunk: Buffer) => {
          outputBytes += chunk.length;
          if (outputBytes > 131072) outputFault = true;
        };
        owner.stdout?.on("data", countOutput);
        owner.stderr?.on("data", countOutput);
        owner.stdout?.on("end", () => eof.add(1));
        owner.stderr?.on("end", () => eof.add(2));
        owner.stdout?.on("close", () => closed.add(1));
        owner.stderr?.on("close", () => closed.add(2));
        owner.stdin?.on("close", () => closed.add(0));
        owner.stdout?.resume();
        owner.stderr?.resume();
        owner.on("exit", (code) => {
          row.ownerExit = code;
        });
        owner.on("close", () => {
          exited = true;
        });
        owner.on("disconnect", () => {
          disconnected = true;
        });
        const messages: unknown[] = [];
        let messageFault = false;
        owner.on("message", (value: unknown) => {
          const bytes = Buffer.byteLength(JSON.stringify(value));
          messageBytes += bytes;
          if (messageBytes > 32768 || messages.length >= 4) {
            messageFault = true;
            return;
          }
          messages.push(value);
        });
        owner.on("error", () => {
          messageFault = true;
        });
        const next = async () => {
          await vi.waitFor(
            () => {
              expect(messageFault).toBe(false);
              expect(outputFault).toBe(false);
              expect(messages.length).toBeGreaterThan(0);
            },
            { timeout: 10000, interval: 20 },
          );
          return messages.shift();
        };
        try {
          const awaiting = await next();
          expect(awaiting).toEqual({ type: "await-claim" });
          await dSend(owner, { type: "claim", previewId: request.previewId });
          const ready = await next();
          if (
            typeof ready !== "object" ||
            ready === null ||
            Object.keys(ready).sort().join(",") !==
              "checkpoint,clientClosed,nativeParent,nativePid,runtimeId,type" ||
            !("type" in ready) ||
            ready.type !== "owner-ready" ||
            !("runtimeId" in ready) ||
            typeof ready.runtimeId !== "string" ||
            !/^[0-9a-f-]{36}$/.test(ready.runtimeId) ||
            !("nativePid" in ready) ||
            typeof ready.nativePid !== "number" ||
            !Number.isSafeInteger(ready.nativePid) ||
            ready.nativePid <= 0 ||
            !("nativeParent" in ready) ||
            ready.nativeParent !== owner.pid ||
            !("clientClosed" in ready) ||
            ready.clientClosed !== true ||
            !("checkpoint" in ready) ||
            ready.checkpoint !== true
          )
            throw Error("S4_D_READY");
          const nativePid = ready.nativePid;
          const predecessor = ready.runtimeId;
          row.parentMatched = true;
          row.clientClosed = ready.clientClosed;
          row.checkpoint = ready.checkpoint;
          const before = await f.predecessorPreview(request.previewId);
          expect(before.owner.state).toBe(counterpart);
          expect(before.inputReceipt?.state).toBe(counterpart);
          expect(before.sourceMemoryBytes).toBe(52_428_800);
          const directory = path.join(
            f.root,
            "objects-native",
            ".llm-runtime",
            `recovery-${counterpart}`,
          );
          await dSend(owner, { type: "exit" });
          owner.stdin?.end();
          await vi.waitFor(
            () => {
              expect(outputFault).toBe(false);
              expect(exited).toBe(true);
              expect(row.ownerExit).toBe(0);
              expect(eof.size).toBe(2);
              expect(closed.size).toBe(3);
              expect(disconnected).toBe(true);
              expect(owner.pid !== undefined && dAbsent(owner.pid)).toBe(true);
            },
            { timeout: 10000, interval: 20 },
          );
          row.ownerAbsent = true;
          row.ownerEOF = true;
          row.ownerFDClosed = true;
          row.ownerIPCDisconnected = true;
          expect(() => process.kill(nativePid, 0)).not.toThrow();
          row.nativeAliveAfterOwner = true;
          await expect(
            NodeLlmRuntimeOwnership.acquire(directory),
          ).rejects.toMatchObject({
            code: "LLM_OWNERSHIP_UNKNOWN",
            closed: false,
          });
          const marker = path.join(f.root, "tmp", `release-${counterpart}`);
          const fd = openSync(marker, "wx", 0o600);
          try {
            expect(writeSync(fd, "release\n")).toBe(8);
            fsyncSync(fd);
          } finally {
            closeSync(fd);
          }
          await vi.waitFor(() => expect(dAbsent(nativePid)).toBe(true), {
            timeout: 10000,
            interval: 200,
          });
          row.nativeAbsent = true;
          const ownership = await NodeLlmRuntimeOwnership.acquire(directory);
          expect(ownership.predecessors()).toEqual([predecessor]);
          const proof = ownership.inputPredecessor(before);
          if (!proof) throw Error("S4_D_PROOF");
          expect(ownership.verifyPredecessorInput(proof, before)).toBe(true);
          const service = f.container.llm;
          if (!service || service.inputMode !== "leased-local-v2")
            throw Error("S4_D_SERVICE");
          f.container = { ...f.container, llm: { ...service, ownership } };
          const provider = f.container.unitOfWorkProvider;
          const original = provider.run.bind(provider);
          let second = 0;
          provider.run = (work) =>
            original(async (u) => {
              const replace = u.llmPdfPreviews.replace.bind(u.llmPdfPreviews);
              u.llmPdfPreviews.replace = async (value, version) => {
                if (
                  value.id === request.previewId &&
                  value.inputReceipt?.state === "closed" &&
                  value.sourceMemoryBytes === 0
                ) {
                  second += 1;
                  return false;
                }
                return replace(value, version);
              };
              return work(u);
            });
          try {
            await expect(recoverLlm(f.container)).rejects.toMatchObject({
              code: "LLM_OWNERSHIP_UNKNOWN",
              closed: false,
            });
          } finally {
            provider.run = original;
          }
          expect(second).toBe(1);
          expect(await f.predecessorPreview(request.previewId)).toEqual(before);
          expect(ownership.pendingInputProofs(predecessor)).toEqual([proof]);
          await expect(
            ownership.acknowledge(predecessor),
          ).rejects.toMatchObject({ code: "LLM_OWNERSHIP_UNKNOWN" });
          row.rollback = true;
          let armed = true;
          let lost = false;
          provider.run = async (work) => {
            let completed = false;
            const result = await original(async (u) => {
              const replace = u.llmPdfPreviews.replace.bind(u.llmPdfPreviews);
              u.llmPdfPreviews.replace = async (value, version) => {
                const ok = await replace(value, version);
                if (
                  ok &&
                  value.id === request.previewId &&
                  value.inputReceipt?.state === "closed" &&
                  value.sourceMemoryBytes === 0
                )
                  completed = true;
                return ok;
              };
              return work(u);
            });
            if (armed && completed) {
              armed = false;
              lost = true;
              throw new SystemError(SystemErrorCode.DatabaseError, "synthetic");
            }
            return result;
          };
          try {
            await expect(recoverLlm(f.container)).rejects.toMatchObject({
              code: SystemErrorCode.DatabaseError,
            });
          } finally {
            provider.run = original;
          }
          expect(lost).toBe(true);
          const saved = await f.predecessorPreview(request.previewId);
          expect(saved.state).toBe("failed");
          expect(saved.owner.state).toBe("closed");
          expect(saved.sourceMemoryBytes).toBe(0);
          expect(saved.inputReceipt).toEqual(proof.receipt);
          expect(saved.version).toBe(before.version + 2);
          expect(saved.source).toEqual(before.source);
          expect(saved.access).toEqual(before.access);
          expect(ownership.pendingInputProofs(predecessor)).toEqual([proof]);
          await expect(
            ownership.acknowledge(predecessor),
          ).rejects.toMatchObject({ code: "LLM_OWNERSHIP_UNKNOWN" });
          row.responseLost = true;
          await recoverLlm(f.container);
          expect(ownership.pendingInputProofs(predecessor)).toEqual([]);
          expect(ownership.predecessors()).toEqual([]);
          expect(() => ownership.assertReady()).not.toThrow();
          expect(await f.predecessorPreview(request.previewId)).toEqual(saved);
          row.recovered = true;
          expect(owners.length).toBeLessThanOrEqual(2);
          await f.guard();
          persist();
        } catch (error) {
          f.fail();
          row.forced = owner.exitCode === null && owner.signalCode === null;
          if (row.forced) owner.kill("SIGTERM");
          persist();
          throw error;
        }
      }, 40_000);
  });

if (process.env["HOLLOW_S4_GROUP"] === "native-e")
  describe.sequential("S4-E internal V4 and individual retained input", () => {
    let f: FormatsFixture;
    let observer: ReturnType<typeof observeNative>;
    let started = 0;
    let ioFault = false;
    let inode: { dev: number; ino: number } | undefined;
    const receipt = {
      version: 1,
      internalV4: false,
      originalClosed: false,
      originalCloseResolved: false,
      leaseHeld: false,
      proofVerified: false,
      consumeOnce: false,
      derivedProduced: false,
      stagePending: false,
      pinHeld: false,
      executionHeld: false,
      dispatchAbsent: false,
      recovered: false,
      released: false,
      databaseClosed: false,
    };
    const persist = (create = false) => {
      const bytes = Buffer.from(JSON.stringify(receipt));
      if (bytes.length > 8192) throw Error("S4_E_RECEIPT_CAP");
      const fd = openSync(
        `${f.root}/records/input-ledger.json`,
        constants.O_WRONLY |
          constants.O_NOFOLLOW |
          (create ? constants.O_CREAT | constants.O_EXCL : 0),
        0o600,
      );
      try {
        const info = fstatSync(fd);
        if (
          !info.isFile() ||
          info.nlink !== 1 ||
          info.uid !== process.getuid?.() ||
          (info.mode & 0o777) !== 0o600
        )
          throw Error("S4_E_RECEIPT_FILE");
        if (create) inode = { dev: info.dev, ino: info.ino };
        if (!inode || info.dev !== inode.dev || info.ino !== inode.ino)
          throw Error("S4_E_RECEIPT_IDENTITY");
        let offset = 0;
        while (offset < bytes.length) {
          const n = writeSync(fd, bytes.subarray(offset), offset);
          if (n < 1) throw Error("S4_E_RECEIPT_WRITE");
          offset += n;
        }
        ftruncateSync(fd, bytes.length);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    };
    const observeRead = () => {
      receipt.originalClosed = false;
      receipt.originalCloseResolved = false;
      const original = f.storage.openOwnedRead;
      f.storage.openOwnedRead = async function (...args) {
        const actual = await original.apply(this, args);
        const close = actual.close;
        const mark = (key: "originalClosed" | "originalCloseResolved") => {
          try {
            receipt[key] = true;
            persist();
          } catch {
            ioFault = true;
            f.fail();
          }
        };
        void actual.closed
          .then(
            () => mark("originalClosed"),
            () => {},
          )
          .catch(() => {
            ioFault = true;
            f.fail();
          });
        actual.close = function (...values) {
          const result = close.apply(this, values);
          void result
            .then(
              () => mark("originalCloseResolved"),
              () => {},
            )
            .catch(() => {
              ioFault = true;
              f.fail();
            });
          return result;
        };
        return actual;
      };
      return () => {
        f.storage.openOwnedRead = original;
      };
    };
    beforeAll(async () => {
      started = performance.now();
      observer = observeNative();
      f = await createFormatsFixture("native", [
        {
          name: "visual",
          format: "pdf",
          bytes: pdf(["0 0 1 RG 10 10 50 50 re S"]),
        },
        { name: "image", format: "image", bytes: png() },
      ]);
      if (!f.memory) throw Error("S4_E_MEMORY");
      persist(true);
    }, 40_000);
    beforeEach(async () => {
      expect(performance.now() - started).toBeLessThan(180_000);
      await f.guard();
    });
    afterEach(async (context) => {
      if (context.task.result?.state === "fail") f.fail();
      else {
        expect(ioFault).toBe(false);
        await observer.normal();
        await f.guard();
      }
    });
    afterAll(async () => {
      try {
        if (f) {
          await f.close();
          observer.databaseClosed(f.client.closed);
          receipt.databaseClosed = f.client.closed;
          persist();
        }
      } finally {
        try {
          await observer?.stop();
        } finally {
          observer?.restore();
        }
      }
    }, 60_000);
    it("S4-E V4 sourcePreparer internal pages prepare closes original input and native child under a normal claimed lease", async () => {
      const preview = await f.preview("visual");
      await sweepPdfPreviews(f.container);
      await vi.waitFor(
        async () =>
          expect((await f.predecessorPreview(preview.previewId)).state).toBe(
            "ready",
          ),
        { timeout: 35_000, interval: 20 },
      );
      const requested = await f.request("visual", preview.previewId);
      const claim = await f.stage.claim();
      if (
        !claim ||
        claim.value.jobId !== requested.jobId ||
        claim.value.selection !== "fixed" ||
        claim.value.preparationVersion !== 4 ||
        !claim.lease ||
        !f.memory
      )
        throw Error("S4_E_V4_CLAIM");
      const service = f.container.llm;
      if (!service) throw Error("SERVICE");
      const value = claim.value;
      const restoreRead = observeRead();
      let ended = false;
      try {
        expect(
          service.execution.start(
            value.jobId,
            value.accountId,
            value.deadlineAt,
            async (signal) => {
              const prepared = await f.storage.withOwner(
                { kind: "conversion-job", id: value.jobId },
                () => f.stage.prepare(value, signal),
              );
              expect(prepared.kind).toBe("pdf-pages");
              if (prepared.preparationVersion !== 4)
                throw Error("S4_E_V4_RESULT");
              expect(prepared.manifest).toEqual(value.manifest);
              expect(receipt.originalClosed).toBe(true);
              expect(receipt.originalCloseResolved).toBe(true);
              expect(f.memory?.activeInputs()).toBe(0);
              const saved = await f.row(value.jobId);
              expect(saved.sourceMemoryBytes).toBe(0);
              expect(saved.inputReceipt?.state).toBe("closed");
              receipt.internalV4 = true;
              persist();
              await cancelLlmRegeneration(f.container, f.token, value.jobId);
              await f.container.unitOfWorkProvider.run(async (u) => {
                const current = await u.llmConversions.find(value.jobId);
                if (
                  !current ||
                  current.cancelGeneration !== 1 ||
                  current.owner.state !== "active" ||
                  current.owner.runtimeId !== value.owner.runtimeId ||
                  current.owner.token !== value.owner.token ||
                  current.sourceMemoryBytes !== 0 ||
                  current.inputReceipt?.state !== "closed"
                )
                  throw Error("S4_E_V4_CANCEL");
                expect(await u.llmDispatches.list(value.jobId)).toHaveLength(0);
                await completeLlm(
                  f.container,
                  u,
                  current,
                  { kind: "cancelled" },
                  f.now,
                );
              });
              ended = true;
            },
          ),
        ).toBe(true);
        await vi.waitFor(() => expect(ended).toBe(true), {
          timeout: 35_000,
          interval: 20,
        });
        const saved = await f.wait(value.jobId);
        expect(saved.outcome.kind).toBe("cancelled");
        expect(
          (
            await f.container.unitOfWorkProvider.run((u) =>
              u.llmQuota.reservation(value.jobId),
            )
          )?.state,
        ).toBe("released");
        expect(f.generated).toHaveLength(0);
        expect(observer.workers).toHaveLength(1);
        expect(observer.children).toHaveLength(2);
      } finally {
        restoreRead();
      }
    }, 40_000);
    it("S4-E image saved finish response loss holds the original lease and pending derived outcome until exact recovery", async () => {
      const requested = await f.request("image");
      const service = f.container.llm;
      const memory = f.memory;
      if (!service || !memory) throw Error("S4_E_MEMORY");
      const provider = f.container.unitOfWorkProvider;
      const run = provider.run.bind(provider);
      const prepare = service.preparer.prepare;
      const stagePrepare = f.stage.prepare;
      const finish = memory.finish;
      const consume = memory.consume;
      const restoreRead = observeRead();
      let proof: SourceInputProof | undefined;
      let consumed = 0;
      let resolved = false;
      let armed = true;
      let pause = false;
      let waiting = false;
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      service.preparer.prepare = async function (...args) {
        const input = args[0];
        const slot = f.slots.get("image");
        if (
          !slot ||
          input.source.originalId !== slot.originalId ||
          input.bytes.byteLength !== slot.bytes.byteLength ||
          createHash("sha256").update(input.bytes).digest("hex") !==
            input.source.sha256
        )
          throw Error("S4_E_IMAGE_INPUT");
        const result = await prepare.apply(this, args);
        if (
          result.preparationVersion !== 3 ||
          result.kind !== "single-raster" ||
          result.raster.bytes.byteLength < 1 ||
          result.raster.width !== 1 ||
          result.raster.height !== 1
        )
          throw Error("S4_E_IMAGE_OUTCOME");
        receipt.derivedProduced = true;
        persist();
        return result;
      };
      f.stage.prepare = async function (...args) {
        const result = await stagePrepare.apply(this, args);
        resolved = true;
        return result;
      };
      memory.finish = function (...args) {
        const result = finish.apply(this, args);
        if (args[0].receipt.consumer.id === requested.jobId) proof = result;
        return result;
      };
      memory.consume = function (value) {
        if (value.receipt.consumer.id === requested.jobId)
          expect(value).toBe(proof);
        const result = consume.call(this, value);
        if (value.receipt.consumer.id === requested.jobId) consumed++;
        return result;
      };
      provider.run = async <T>(
        work: (
          u: import("@repo/core/application/execution/hollowUnitOfWork").HollowUnitOfWorkContext,
        ) => Promise<T>,
      ) => {
        if (pause) {
          pause = false;
          waiting = true;
          await gate;
        }
        let closed = false;
        const result = await run(async (u) => {
          const replace = u.llmConversions.replace.bind(u.llmConversions);
          u.llmConversions.replace = async (next, version) => {
            const ok = await replace(next, version);
            if (
              ok &&
              next.jobId === requested.jobId &&
              next.inputReceipt?.state === "closed" &&
              next.sourceMemoryBytes === 0
            )
              closed = true;
            return ok;
          };
          return work(u);
        });
        if (armed && closed) {
          armed = false;
          pause = true;
          throw new SystemError(SystemErrorCode.DatabaseError, "synthetic");
        }
        return result;
      };
      try {
        await sweepLlm(f.container);
        await vi.waitFor(() => expect(waiting).toBe(true), {
          timeout: 5000,
          interval: 10,
        });
        expect(receipt.originalClosed).toBe(true);
        expect(receipt.originalCloseResolved).toBe(true);
        expect(receipt.derivedProduced).toBe(true);
        expect(resolved).toBe(false);
        receipt.stagePending = true;
        const saved = await f.row(requested.jobId);
        expect(saved.sourceMemoryBytes).toBe(0);
        expect(saved.inputReceipt?.state).toBe("closed");
        if (!proof || !saved.inputReceipt) throw Error("S4_E_PROOF");
        expect(memory.verify(proof, saved.inputReceipt)).toBe(true);
        receipt.proofVerified = true;
        expect(memory.activeInputs()).toBe(1);
        expect(consumed).toBe(0);
        expect(
          memory.tryReserveBegin({
            kind: "llm-conversion",
            id: requested.jobId,
          }).kind,
        ).toBe("busy");
        receipt.leaseHeld = true;
        expect(service.execution.active(requested.jobId)).toBe(true);
        receipt.executionHeld = true;
        const pins = await f.client.execute({
          sql: "SELECT count(*) AS n FROM object_writes WHERE owner_id=? AND active=1",
          args: [requested.jobId],
        });
        expect(Number(pins.rows[0]?.["n"])).toBe(1);
        receipt.pinHeld = true;
        expect(
          await f.container.unitOfWorkProvider.run((u) =>
            u.llmDispatches.list(requested.jobId),
          ),
        ).toHaveLength(0);
        receipt.dispatchAbsent = true;
        expect(f.generated).toHaveLength(0);
        persist();
        release();
        expect((await f.wait(requested.jobId)).outcome.kind).toBe("succeeded");
        expect(consumed).toBe(1);
        expect(resolved).toBe(true);
        expect(memory.activeInputs()).toBe(0);
        expect(service.execution.active(requested.jobId)).toBe(false);
        const endedPins = await f.client.execute({
          sql: "SELECT count(*) AS n FROM object_writes WHERE owner_id=? AND active=1",
          args: [requested.jobId],
        });
        expect(Number(endedPins.rows[0]?.["n"])).toBe(0);
        receipt.consumeOnce = true;
        receipt.recovered = true;
        receipt.released = true;
        persist();
        expect(observer.children).toHaveLength(3);
        expect(f.generated).toHaveLength(1);
      } finally {
        release();
        provider.run = run;
        service.preparer.prepare = prepare;
        f.stage.prepare = stagePrepare;
        memory.finish = finish;
        memory.consume = consume;
        restoreRead();
      }
    }, 40_000);
  });
