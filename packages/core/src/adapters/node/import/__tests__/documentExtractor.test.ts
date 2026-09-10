import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { crc32 } from "node:zlib";
import type { ImportFormat } from "@repo/core/application/ports/documentExtractor";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import yauzl from "yauzl";
import { detectFormat, IsolatedDocumentExtractor } from "../documentExtractor";

const extractor = new IsolatedDocumentExtractor();
const fixture = (name: string) =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url));

async function parts(bytes: Buffer): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) =>
    yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
      if (error) {
        reject(error);
        return;
      }
      const entries = new Map<string, Buffer>();
      zip.on("error", reject);
      zip.on("end", () => resolve(entries));
      zip.on("entry", (entry) =>
        zip.openReadStream(entry, (cause, stream) => {
          if (cause) {
            reject(cause);
            return;
          }
          const chunks: Buffer[] = [];
          stream.on("error", reject);
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", () => {
            entries.set(entry.fileName, Buffer.concat(chunks));
            zip.readEntry();
          });
        }),
      );
      zip.readEntry();
    }),
  );
}

function storedZip(entries: Map<string, Buffer>) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const filename = Buffer.from(name);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc32(content), 14);
    header.writeUInt32LE(content.length, 18);
    header.writeUInt32LE(content.length, 22);
    header.writeUInt16LE(filename.length, 26);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(crc32(content), 16);
    directory.writeUInt32LE(content.length, 20);
    directory.writeUInt32LE(content.length, 24);
    directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE(offset, 42);
    local.push(header, filename, content);
    central.push(directory, filename);
    offset += header.length + filename.length + content.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.size, 8);
  end.writeUInt16LE(entries.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

describe("isolated document extraction", () => {
  it.each<ImportFormat>([
    "docx",
    "xlsx",
    "pptx",
    "pdf",
  ])("extracts real Japanese %s and detects content ahead of extension", async (format) => {
    const bytes = await fixture(`generated-ja.${format}`);
    expect(await detectFormat(bytes, "misnamed.txt")).toBe(format);
    const extracted = await extractor.extract({ bytes, format });
    expect(extracted.html).toContain("日本語");
    expect(extracted.html).toContain("&amp;");
    expect(extracted.html.replaceAll("<br>", "")).toContain("&lt;確認&gt;");
    expect(extracted.coverage).not.toBe("no_text");
  });

  it.each([
    ["poi-SampleDoc.docx", "docx"],
    ["poi-SampleSS.xlsx", "xlsx"],
    ["poi-SampleShow.pptx", "pptx"],
    ["poi-japanese.pptx", "pptx"],
    ["pdfjs-basicapi.pdf", "pdf"],
  ] as const)("reads independently authored fixture %s", async (name, format) => {
    const extraction = await extractor.extract({
      bytes: await fixture(name),
      format,
    });
    expect(extraction.html.length).toBeGreaterThan(100);
    expect(extraction.coverage).not.toBe("no_text");
    if (name === "poi-japanese.pptx")
      expect(extraction.html).toContain(
        "Bold italic underline superscript subscript",
      );
  });

  it("preserves whitespace-only runs and inline breaks in PPTX", async () => {
    const entries = await parts(await fixture("generated-ja.pptx"));
    const original = entries.get("ppt/slides/slide1.xml");
    if (!original) throw new Error("Missing slide fixture");
    entries.set(
      "ppt/slides/slide1.xml",
      Buffer.from(
        original
          .toString()
          .replace(
            /<a:t>[^<]*<\/a:t>/,
            '<a:t>Bold</a:t></a:r><a:r><a:t xml:space="preserve"> </a:t></a:r><a:r><a:t>italic</a:t></a:r><a:r><a:t> </a:t></a:r><a:r><a:t>underline</a:t></a:r><a:br/><a:r><a:t>次の行</a:t>',
          ),
      ),
    );
    const extraction = await extractor.extract({
      bytes: storedZip(entries),
      format: "pptx",
    });
    expect(extraction.html).toContain("Bold italic underline<br>次の行");
  });

  it("follows presentation relationship order", async () => {
    const extracted = await extractor.extract({
      bytes: await fixture("generated-reordered.pptx"),
      format: "pptx",
    });
    expect(extracted.html.indexOf("日本茶")).toBeLessThan(
      extracted.html.indexOf("日本語の抽出"),
    );
  });

  it("extracts chart caches, SmartArt data and speaker notes, reporting unsupported parts", async () => {
    const entries = await parts(await fixture("generated-ja.pptx"));
    const relPart = "ppt/slides/_rels/slide1.xml.rels";
    const rels = entries.get(relPart)?.toString();
    if (!rels) throw new Error("Missing relationship fixture");
    const base =
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
    const relations = [
      ["chart", "../charts/chart1.xml"],
      ["diagramData", "../diagrams/data1.xml"],
      ["notesSlide", "../notesSlides/notesSlide99.xml"],
      ["oleObject", "../embeddings/embedded.bin"],
    ]
      .map(
        ([type, target], index) =>
          `<Relationship Id="extra${index}" Type="${base}${type}" Target="${target}"/>`,
      )
      .join("");
    entries.set(
      relPart,
      Buffer.from(
        rels.replace("</Relationships>", `${relations}</Relationships>`),
      ),
    );
    entries.set(
      "ppt/charts/chart1.xml",
      Buffer.from(
        '<c:chartSpace xmlns:c="urn:c"><c:chart><c:title><c:tx><c:v>売上グラフ</c:v></c:tx></c:title><c:ser><c:tx><c:v>日本茶</c:v></c:tx><c:val><c:numCache><c:pt idx="0"><c:v>246</c:v></c:pt></c:numCache></c:val></c:ser></c:chart></c:chartSpace>',
      ),
    );
    entries.set(
      "ppt/diagrams/data1.xml",
      Buffer.from(
        '<dgm:dataModel xmlns:dgm="urn:dgm" xmlns:a="urn:a"><dgm:ptLst><dgm:pt><dgm:t><a:p><a:r><a:t>組織図の文字</a:t></a:r></a:p></dgm:t></dgm:pt></dgm:ptLst></dgm:dataModel>',
      ),
    );
    entries.set(
      "ppt/notesSlides/notesSlide99.xml",
      Buffer.from(
        '<p:notes xmlns:p="urn:p" xmlns:a="urn:a"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>発表者メモ</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:nvPr><p:ph type="sldNum"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>999999</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>',
      ),
    );
    entries.set("ppt/embeddings/embedded.bin", Buffer.from([1, 2, 3]));
    const extraction = await extractor.extract({
      bytes: storedZip(entries),
      format: "pptx",
    });
    for (const text of [
      "売上グラフ",
      "日本茶",
      "246",
      "組織図の文字",
      "発表者メモ",
    ])
      expect(extraction.html).toContain(text);
    expect(extraction.html).not.toContain("999999");
    expect(extraction.notices).toContainEqual(
      expect.objectContaining({
        location: "ppt/embeddings/embedded.bin",
        code: "UNEXTRACTED_PART",
      }),
    );
    expect(extraction.coverage).toBe("partial");
  });

  it("deduplicates Excel merge values and projects formula caches, rich text, dates, errors and booleans", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("セル");
    sheet.mergeCells("A1:B1");
    sheet.getCell("A1").value = "一度だけ";
    sheet.addRow([
      { formula: "1+1", result: 2 },
      { formula: "2+2" },
      { richText: [{ text: "太字" }, { text: "通常" }] },
      new Date("2026-01-02T00:00:00Z"),
      { error: "#DIV/0!" },
      true,
    ]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const extraction = await extractor.extract({ bytes, format: "xlsx" });
    expect(extraction.html.match(/一度だけ/g)).toHaveLength(1);
    for (const text of [
      "<td>2</td>",
      "計算結果なし: 2+2",
      "太字通常",
      "2026-01-02",
      "#DIV/0!",
      "true",
    ])
      expect(extraction.html).toContain(text);
    expect(extraction.notices).toContainEqual(
      expect.objectContaining({
        code: "FORMULA_NOT_CALCULATED",
        location: "セル!B2",
      }),
    );
  });

  it("preserves the extracted text in a mixed PDF and identifies the missing page", async () => {
    const extraction = await extractor.extract({
      bytes: await fixture("generated-mixed.pdf"),
      format: "pdf",
    });
    expect(extraction.html).toContain("Text page");
    expect(extraction.coverage).toBe("partial");
    expect(extraction.notices).toContainEqual(
      expect.objectContaining({ code: "PAGE_NO_TEXT", location: "page:2" }),
    );
  });

  it.each([
    "generated-blank.pdf",
    "generated-image.pdf",
  ])("distinguishes no text from corruption: %s", async (name) => {
    const extraction = await extractor.extract({
      bytes: await fixture(name),
      format: "pdf",
    });
    expect(extraction.coverage).toBe("no_text");
    expect(extraction.html).toBe("");
    expect(extraction.notices[0]?.location).toBe("page:1");
  });

  it.each<ImportFormat>([
    "docx",
    "xlsx",
    "pptx",
    "pdf",
  ])("rejects corrupt %s instead of returning empty success", async (format) => {
    await expect(
      extractor.extract({ bytes: await fixture(`corrupt.${format}`), format }),
    ).rejects.toMatchObject({ code: "IMPORT_CORRUPT" });
  });
  it.each([
    ["poi-encrypted.docx", "docx"],
    ["generated-encrypted.pdf", "pdf"],
  ] as const)("distinguishes encrypted %s", async (name, format) => {
    await expect(
      extractor.extract({ bytes: await fixture(name), format }),
    ).rejects.toMatchObject({ code: "IMPORT_ENCRYPTED" });
  });
  it("rejects DTD declarations before parser evaluation", async () => {
    await expect(
      extractor.extract({
        bytes: await fixture("unsafe-xml.pptx"),
        format: "pptx",
      }),
    ).rejects.toMatchObject({ code: "IMPORT_UNSAFE_XML" });
  });
  it("validates UTF-16 XML in unused Office parts before a library can decode it", async () => {
    const entries = await parts(await fixture("generated-ja.docx"));
    entries.set(
      "word/unused.xml",
      Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from(
          '<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///etc/passwd">]><x>&secret;</x>',
          "utf16le",
        ),
      ]),
    );
    await expect(
      extractor.extract({ bytes: storedZip(entries), format: "docx" }),
    ).rejects.toMatchObject({ code: "IMPORT_UNSAFE_XML" });
  });
  it("does not request external Office references and records their omission", async () => {
    let connections = 0;
    const server = createServer((_request, response) => {
      connections++;
      response.end("must not read");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Missing test listener");
      const entries = await parts(await fixture("generated-ja.docx"));
      const part = "word/_rels/document.xml.rels";
      const rels = entries.get(part)?.toString();
      if (!rels) throw new Error("Missing relationships fixture");
      entries.set(
        part,
        Buffer.from(
          rels.replace(
            "</Relationships>",
            `<Relationship Id="externalTest" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="http://127.0.0.1:${address.port}/private" TargetMode="External"/></Relationships>`,
          ),
        ),
      );
      const extraction = await extractor.extract({
        bytes: storedZip(entries),
        format: "docx",
      });
      expect(connections).toBe(0);
      expect(extraction.notices).toContainEqual(
        expect.objectContaining({ code: "EXTERNAL_PART" }),
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
  it("recognizes media from bounded headers rather than filenames", async () => {
    const png = Buffer.alloc(33);
    Buffer.from("89504e470d0a1a0a", "hex").copy(png);
    png.write("IHDR", 12);
    png.writeUInt32BE(320, 16);
    png.writeUInt32BE(200, 20);
    expect(await detectFormat(png, "renamed.txt")).toBe("image");
    const wav = Buffer.alloc(44);
    wav.write("RIFF");
    wav.writeUInt32LE(1000000, 4);
    wav.write("WAVE", 8);
    wav.write("fmt ", 12);
    expect(await detectFormat(wav, "renamed.bin")).toBe("audio");
    expect(
      (await extractor.extract({ bytes: wav, format: "audio" })).coverage,
    ).toBe("no_text");
    await expect(
      detectFormat(Buffer.from("fake image"), "fake.png"),
    ).rejects.toMatchObject({ code: "IMPORT_UNSUPPORTED" });
  });
  it("rejects excess XML depth, ZIP entries, declared expansion and corrupt CRC", async () => {
    const deep = await parts(await fixture("generated-ja.pptx"));
    deep.set(
      "extra.xml",
      Buffer.from(`${"<x>".repeat(140)}value${"</x>".repeat(140)}`),
    );
    await expect(
      extractor.extract({ bytes: storedZip(deep), format: "pptx" }),
    ).rejects.toMatchObject({ code: "IMPORT_RESOURCE_LIMIT" });
    await expect(
      detectFormat(
        storedZip(
          new Map(
            Array.from({ length: 4097 }, (_, index) => [
              `${index}.txt`,
              Buffer.alloc(0),
            ]),
          ),
        ),
        "x.zip",
      ),
    ).rejects.toMatchObject({ code: "IMPORT_RESOURCE_LIMIT" });
    const bomb = storedZip(new Map([["one", Buffer.from("a")]]));
    bomb.writeUInt32LE(129 * 1024 * 1024, 18);
    bomb.writeUInt32LE(129 * 1024 * 1024, 22);
    bomb.writeUInt32LE(129 * 1024 * 1024, 34 + 20);
    bomb.writeUInt32LE(129 * 1024 * 1024, 34 + 24);
    await expect(detectFormat(bomb, "x.zip")).rejects.toMatchObject({
      code: "IMPORT_RESOURCE_LIMIT",
    });
    const damaged = storedZip(new Map([["one", Buffer.from("a")]]));
    damaged[33] = 98;
    await expect(detectFormat(damaged, "x.zip")).rejects.toMatchObject({
      code: "IMPORT_CORRUPT",
    });
  });
  it("rejects general ZIP and unsupported legacy Office", async () => {
    await expect(
      detectFormat(
        storedZip(new Map([["hello.txt", Buffer.from("hello")]])),
        "renamed.docx",
      ),
    ).rejects.toMatchObject({ code: "IMPORT_UNSUPPORTED" });
    const encrypted = await fixture("poi-encrypted.docx");
    const altered = Buffer.from(encrypted);
    const info = Buffer.from("EncryptionInfo", "utf16le");
    const start = altered.indexOf(info);
    altered.write("UnsupportedInf", start, "utf16le");
    await expect(detectFormat(altered, "old.doc")).rejects.toMatchObject({
      code: "IMPORT_UNSUPPORTED",
    });
  });
  it("decodes UTF strictly and safely escapes text while parsing Markdown", async () => {
    expect(
      (
        await extractor.extract({
          bytes: Buffer.from("日本語 & <確認>"),
          format: "text",
        })
      ).html,
    ).toContain("日本語 &amp; &lt;確認&gt;");
    expect(
      (
        await extractor.extract({
          bytes: Buffer.from("# 日本語\n\n**強調**"),
          format: "markdown",
        })
      ).html,
    ).toContain("<strong>強調</strong>");
    const utf16 = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from("日本語", "utf16le"),
    ]);
    expect(
      (await extractor.extract({ bytes: utf16, format: "text" })).html,
    ).toContain("日本語");
    await expect(
      detectFormat(Buffer.from([0xc3, 0x28]), "invalid.txt"),
    ).rejects.toMatchObject({ code: "IMPORT_INVALID_ENCODING" });
  });
  it("terminates a worker at its deadline and leaves the caller event loop responsive", async () => {
    const limited = new IsolatedDocumentExtractor({ timeoutMs: 1 });
    let ticked = false;
    const timer = setTimeout(() => {
      ticked = true;
    }, 0);
    await expect(
      limited.extract({
        bytes: await fixture("generated-ja.pdf"),
        format: "pdf",
      }),
    ).rejects.toMatchObject({ code: "IMPORT_TIMEOUT" });
    clearTimeout(timer);
    expect(ticked).toBe(true);
    expect(
      (
        await extractor.extract({
          bytes: Buffer.from("still alive"),
          format: "text",
        })
      ).html,
    ).toContain("still alive");
  });
  it("bounds concurrent parser admission and releases slots after saturation", async () => {
    const extractor = new IsolatedDocumentExtractor();
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        extractor.extract({
          bytes: new TextEncoder().encode("bounded"),
          format: "text",
        }),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(10);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(2);
    for (const result of rejected)
      expect(result.reason).toMatchObject({ code: "IMPORT_RESOURCE_LIMIT" });
    expect(
      (
        await extractor.extract({
          bytes: new TextEncoder().encode("recovered"),
          format: "text",
        })
      ).html,
    ).toContain("recovered");
  });
});
