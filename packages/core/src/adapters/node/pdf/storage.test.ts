import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { PDF_DOCUMENT_PROFILE } from "@repo/core/application/pdf/document";
import type { PdfRenderInput } from "@repo/core/application/pdf/ports";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openPdfChannel } from "./channel";
import { FilePdfSourceReader } from "./source";
import { FilePdfWorkspace, type PdfPackManifest } from "./workspace";

const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
describe("PDF raw sources, sealed pack and local channel", () => {
  let root: string;
  let storage: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-pdf-storage-"));
    await chmod(root, 0o700);
    storage = path.join(root, "objects");
    await mkdir(storage, { mode: 0o700 });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  async function fixture() {
    const font = Buffer.from("synthetic-font-bytes");
    const image = Buffer.from("synthetic-image-bytes");
    const fontPath = path.join(root, "font.otf");
    await writeFile(fontPath, font, { mode: 0o600 });
    await writeFile(path.join(storage, "image"), image, { mode: 0o600 });
    const workspace = new FilePdfWorkspace(root, [
      {
        id: "font-body",
        path: fontPath,
        bytes: font.length,
        sha256: hash(font),
      },
      {
        id: "font-code",
        path: fontPath,
        bytes: font.length,
        sha256: hash(font),
      },
    ]);
    const id = randomUUID();
    const input: PdfRenderInput = {
      computeId: id,
      generation: 1,
      workspaceId: id,
      deadlineAt: new Date(0),
      plan: {
        profile: PDF_DOCUMENT_PROFILE,
        filename: "test.pdf",
        segments: [
          { kind: "text", value: '<img src="' },
          { kind: "media", id: "image" },
          { kind: "text", value: '">' },
        ],
        mediaIds: ["image"],
        notices: [],
      },
      sources: [
        {
          kind: "stored",
          id: "image",
          key: "image",
          mime: "image/png",
          bytes: image.length,
          sha256: hash(image),
        },
      ],
    };
    return {
      workspace,
      input,
      image,
      reader: new FilePdfSourceReader(storage),
      directory: path.join(root, "workspaces", id),
    };
  }
  it("streams exact binary bytes without data URI and validates before a sealed manifest", async () => {
    const f = await fixture();
    await f.workspace.writePack(
      f.input,
      f.reader,
      new AbortController().signal,
    );
    const manifest: PdfPackManifest = JSON.parse(
      await readFile(path.join(f.directory, "manifest.json"), "utf8"),
    );
    const pack = await readFile(path.join(f.directory, "resources.pack"));
    expect(hash(pack)).toBe(manifest.sha256);
    const slot = manifest.slots.find((s) => s.id === "image");
    expect(slot).toBeDefined();
    expect(
      pack.subarray(slot?.offset, (slot?.offset ?? 0) + (slot?.bytes ?? 0)),
    ).toEqual(f.image);
    expect(
      (await stat(path.join(f.directory, "resources.pack"))).mode & 0o777,
    ).toBe(0o400);
    expect(await f.workspace.bytes(f.input.workspaceId)).toBeLessThanOrEqual(
      f.workspace.reservation(f.input),
    );
    expect(await f.workspace.remove(f.input.workspaceId)).toBe(true);
    expect(await f.workspace.bytes(f.input.workspaceId)).toBe(0);
  });
  it("does not seal a partial or corrupted original", async () => {
    const f = await fixture();
    await writeFile(path.join(storage, "image"), Buffer.alloc(f.image.length));
    await expect(
      f.workspace.writePack(f.input, f.reader, new AbortController().signal),
    ).rejects.toMatchObject({ code: "PDF_MEDIA_UNAVAILABLE" });
    await expect(
      stat(path.join(f.directory, "admission.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(await f.workspace.remove(f.input.workspaceId)).toBe(true);
  });
  it("refuses file traversal and symlinks and closes a cancelled source", async () => {
    const f = await fixture();
    await symlink(path.join(storage, "image"), path.join(storage, "alias"));
    for (const key of ["../font.otf", "alias"]) {
      const source = {
        kind: "stored" as const,
        id: "x",
        key,
        mime: "image/png",
        bytes: f.image.length,
        sha256: hash(f.image),
      };
      await expect(
        (async () => {
          for await (const _ of f.reader.read(
            source,
            new AbortController().signal,
          )) {
            /* drain */
          }
        })(),
      ).rejects.toMatchObject({ code: "PDF_MEDIA_UNAVAILABLE" });
    }
    const abort = new AbortController();
    const source = f.input.sources[0];
    if (!source) throw Error("fixture");
    const iterator = f.reader
      .read(source, abort.signal)
      [Symbol.asyncIterator]();
    expect((await iterator.next()).done).toBe(false);
    abort.abort();
    await expect(iterator.next()).rejects.toMatchObject({
      code: "PDF_MEDIA_UNAVAILABLE",
    });
  });
  it("allows only exact registered GETs and limits replays, with actual close", async () => {
    const f = await fixture();
    await f.workspace.writePack(
      f.input,
      f.reader,
      new AbortController().signal,
    );
    const manifest: PdfPackManifest = JSON.parse(
      await readFile(path.join(f.directory, "manifest.json"), "utf8"),
    );
    const channel = await openPdfChannel(
      f.directory,
      manifest,
      new AbortController().signal,
    );
    channel.setDocument("<p>synthetic</p>");
    const request = (
      url: string,
      headers: Record<string, string> = {},
      method = "GET",
    ) =>
      new Promise<{ status: number; bytes: number }>((resolve, reject) => {
        const req = http.request(
          channel.origin + url,
          { headers, method },
          (res) => {
            let bytes = 0;
            res.on("data", (chunk) => {
              bytes += chunk.length;
            });
            res.on("end", () =>
              resolve({ status: res.statusCode ?? 0, bytes }),
            );
          },
        );
        req.on("error", reject);
        req.end();
      });
    try {
      expect((await request("/document")).status).toBe(404);
      expect(
        (
          await request("/document", {
            ...channel.header,
            cookie: "synthetic=canary",
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await request("/document", {
            ...channel.header,
            host: "other.invalid",
          })
        ).status,
      ).toBe(404);
      expect((await request("/document", channel.header, "POST")).status).toBe(
        404,
      );
      expect((await request("/file/anything", channel.header)).status).toBe(
        404,
      );
      expect(
        (await request("/g/other/slot/other", channel.header)).status,
      ).toBe(404);
      expect((await request("/document", channel.header)).status).toBe(200);
      const image = channel.paths.get("image");
      if (!image) throw Error("fixture slot");
      expect(
        (await request(image, { ...channel.header, range: "bytes=0-1" }))
          .status,
      ).toBe(404);
      for (let i = 0; i < 4; i++)
        expect(await request(image, channel.header)).toEqual({
          status: 200,
          bytes: f.image.length,
        });
      expect((await request(image, channel.header)).status).toBe(404);
      channel.assertReady();
    } finally {
      await channel.close();
    }
    expect(channel.stats()).toMatchObject({
      readers: 0,
      sockets: 0,
      tasks: 0,
      fatal: false,
    });
  });
  it("rejects a changed sealed pack before opening a channel", async () => {
    const f = await fixture();
    await f.workspace.writePack(
      f.input,
      f.reader,
      new AbortController().signal,
    );
    const manifest: PdfPackManifest = JSON.parse(
      await readFile(path.join(f.directory, "manifest.json"), "utf8"),
    );
    await chmod(path.join(f.directory, "resources.pack"), 0o600);
    await writeFile(
      path.join(f.directory, "resources.pack"),
      Buffer.alloc(manifest.bytes),
    );
    await chmod(path.join(f.directory, "resources.pack"), 0o400);
    await expect(
      openPdfChannel(f.directory, manifest, new AbortController().signal),
    ).rejects.toThrow("pack-hash");
  });
});
