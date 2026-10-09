import { writeFile } from "node:fs/promises";
import { join } from "node:path";

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

export async function createDriveFiles(directory: string) {
  const R =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const relationships = (body: string) =>
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
  const relation = (id: string, type: string, target: string) =>
    `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`;
  const types = (part: string, type: string) =>
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.${type}.main+xml"/></Types>`;
  const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
  const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const files = {
    "drive.txt": Buffer.from("Drive text source. Keep this original.", "utf8"),
    "drive.md": Buffer.from("# Drive Markdown\n\nDrive original body.", "utf8"),
    "drive.html": Buffer.from(
      "<h1>Drive HTML</h1><p>Drive original body.</p>",
      "utf8",
    ),
    "drive.docx": zip({
      "[Content_Types].xml": types(
        "word/document.xml",
        "wordprocessingml.document",
      ),
      "_rels/.rels": relationships(
        relation("r1", "officeDocument", "word/document.xml"),
      ),
      "word/document.xml":
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Drive office text</w:t></w:r></w:p></w:body></w:document>',
    }),
    "drive.pptx": zip({
      "[Content_Types].xml": types(
        "ppt/presentation.xml",
        "presentationml.presentation",
      ),
      "_rels/.rels": relationships(
        relation("r1", "officeDocument", "ppt/presentation.xml"),
      ),
      "ppt/presentation.xml": `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="1" r:id="s1"/></p:sldIdLst></p:presentation>`,
      "ppt/_rels/presentation.xml.rels": relationships(
        relation("s1", "slide", "slides/slide1.xml"),
      ),
      "ppt/slides/slide1.xml": `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree><a:p><a:r><a:t>Drive office slide</a:t></a:r></a:p></p:spTree></p:cSld></p:sld>`,
    }),
    "drive.xlsx": zip({
      "[Content_Types].xml":
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      "_rels/.rels": relationships(
        relation("r1", "officeDocument", "xl/workbook.xml"),
      ),
      "xl/workbook.xml": `<workbook xmlns="${S}" xmlns:r="${R}"><sheets><sheet name="Sheet1" sheetId="1" r:id="s1"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": relationships(
        relation("s1", "worksheet", "worksheets/sheet1.xml"),
      ),
      "xl/worksheets/sheet1.xml": `<worksheet xmlns="${S}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Drive office cell</t></is></c></row></sheetData></worksheet>`,
    }),
    "drive-strict.pdf": pdf([
      "BT /F1 12 Tf 10 80 Td (Drive text) Tj 0 -20 Td (Second) Tj ET",
    ]),
    "drive-visual.pdf": pdf([
      "0 0 1 RG 10 10 50 50 re S",
      "1 0 0 rg 10 10 50 50 re f",
    ]),
  };
  for (const [name, bytes] of Object.entries(files))
    await writeFile(join(directory, name), bytes, { flag: "wx", mode: 0o600 });
  return Object.keys(files);
}
