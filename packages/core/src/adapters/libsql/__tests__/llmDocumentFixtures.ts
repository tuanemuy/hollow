import ExcelJS from "exceljs";

const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
function crc(bytes: Buffer) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function zip(parts: Readonly<Record<string, string | Buffer>>) {
  const files: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, input] of Object.entries(parts)) {
    const value = Buffer.isBuffer(input) ? input : Buffer.from(input);
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
const relationships = (body: string) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
const relation = (id: string, type: string, target: string) =>
  `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`;
const types = (part: string, type: string) =>
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.${type}"/></Types>`;
export const paragraph = (text: string) =>
  `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
export function documentDocx(
  body = paragraph("First") + paragraph("Second"),
  media = false,
) {
  return zip({
    "[Content_Types].xml": types(
      "word/document.xml",
      "wordprocessingml.document.main+xml",
    ),
    "_rels/.rels": relationships(
      relation("r1", "officeDocument", "word/document.xml"),
    ),
    "word/document.xml": `<w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:a="${A}"><w:body>${body}${media ? '<w:p><w:r><w:drawing><a:blip r:embed="image1"/></w:drawing></w:r></w:p>' : ""}</w:body></w:document>`,
    ...(media
      ? {
          "word/_rels/document.xml.rels": relationships(
            relation("image1", "image", "media/image.png"),
          ),
          "word/media/image.png": Buffer.from([
            137, 80, 78, 71, 13, 10, 26, 10,
          ]),
        }
      : {}),
  });
}
export function documentPptx(
  body = "<a:p><a:r><a:t>First</a:t></a:r></a:p><a:p><a:r><a:t>Second</a:t></a:r></a:p>",
) {
  return zip({
    "[Content_Types].xml": types(
      "ppt/presentation.xml",
      "presentationml.presentation.main+xml",
    ),
    "_rels/.rels": relationships(
      relation("r1", "officeDocument", "ppt/presentation.xml"),
    ),
    "ppt/presentation.xml": `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="256" r:id="r1"/></p:sldIdLst></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": relationships(
      relation("r1", "slide", "slides/slide1.xml"),
    ),
    "ppt/slides/slide1.xml": `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree><p:sp><p:txBody><a:bodyPr/><a:lstStyle/>${body}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
  });
}
export async function documentXlsx() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet");
  sheet.getCell("A1").value = "First";
  sheet.getCell("A2").value = "Second";
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
export function documentPdf(
  contents: readonly string[] = [
    "BT /F1 12 Tf 30 340 Td (First) Tj 0 -20 Td (Second) Tj ET",
  ],
  corruptPage?: number,
) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${contents.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${contents.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [index, content] of contents.entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 400] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
    );
    const stream = index === corruptPage ? "01020304>" : content;
    objects.push(
      `<< /Length ${Buffer.byteLength(stream)}${index === corruptPage ? " /Filter [/ASCIIHexDecode /FlateDecode]" : ""} >>\nstream\n${stream}\nendstream`,
    );
  }
  let body = "%PDF-1.7\n";
  const positions = [0];
  for (const [index, value] of objects.entries()) {
    positions.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${value}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${positions
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}
