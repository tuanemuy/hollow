import { open, readFile } from "node:fs/promises";
import { parentPort, workerData } from "node:worker_threads";
import { validateMediaFile } from "./import/mediaWorker.mjs";

const fail = (code = "MEDIA_CORRUPT") => {
  throw new Error(code);
};
async function safeSvg(file, bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(
    await readFile(file),
  );
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) fail("MEDIA_UNSAFE_SVG");
  const { XMLValidator, XMLParser } = await import("fast-xml-parser");
  if (XMLValidator.validate(text) !== true) fail();
  const roots = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    processEntities: false,
    trimValues: false,
  })
    .parse(text)
    .filter((n) => !Object.keys(n)[0].startsWith("?"));
  if (
    roots.length !== 1 ||
    !roots[0].svg ||
    roots[0][":@"]?.["@_xmlns"] !== "http://www.w3.org/2000/svg"
  )
    fail("MEDIA_UNSUPPORTED");
  const pending = roots.map((node) => ({ node, depth: 0 }));
  let nodes = 0;
  while (pending.length) {
    const { node, depth } = pending.pop();
    if (++nodes > 100_000 || depth > 64) fail("MEDIA_RESOURCE_LIMIT");
    for (const value of Object.values(node))
      if (Array.isArray(value))
        for (const child of value)
          pending.push({ node: child, depth: depth + 1 });
  }
  const { default: sanitize } = await import("sanitize-html");
  const removed = new Set();
  const tags = [
    "svg",
    "g",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "defs",
    "linearGradient",
    "radialGradient",
    "stop",
    "clipPath",
    "mask",
    "use",
    "title",
    "desc",
  ];
  const attrs = [
    "id",
    "xmlns",
    "xmlns:xlink",
    "viewBox",
    "width",
    "height",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "d",
    "points",
    "transform",
    "fill",
    "fill-rule",
    "fill-opacity",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-opacity",
    "opacity",
    "font-size",
    "font-family",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
    "dx",
    "dy",
    "rotate",
    "offset",
    "stop-color",
    "stop-opacity",
    "gradientUnits",
    "gradientTransform",
    "spreadMethod",
    "clip-path",
    "clipPathUnits",
    "mask",
    "maskUnits",
    "maskContentUnits",
    "preserveAspectRatio",
    "href",
    "xlink:href",
  ];
  let count = 0;
  const html = sanitize(text, {
    parser: {
      xmlMode: true,
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
    },
    allowedTags: tags,
    allowedAttributes: { "*": attrs },
    allowedSchemes: [],
    allowProtocolRelative: false,
    nonTextTags: ["script", "style", "foreignObject"],
    transformTags: {
      "*": (tagName, attribs) => {
        if (++count > 100_000) fail("MEDIA_RESOURCE_LIMIT");
        if (!tags.includes(tagName)) removed.add("SVGの実行・未対応要素");
        for (const [name, value] of Object.entries(attribs)) {
          if (!attrs.includes(name)) {
            delete attribs[name];
            removed.add("SVGのイベント・CSS・未対応属性");
            continue;
          }
          if (name === "xmlns" || name === "xmlns:xlink") {
            delete attribs[name];
            continue;
          }
          if (["href", "xlink:href"].includes(name)) {
            if (!/^#[A-Za-z_][\w.-]*$/.test(value)) {
              delete attribs[name];
              removed.add("SVGの外部参照");
            }
          } else if (["fill", "stroke", "clip-path", "mask"].includes(name)) {
            if (
              !/^(?:none|currentColor|transparent|[a-zA-Z]+|#[a-fA-F0-9]{3,8}|rgba?\([\d.,%\s]+\)|url\(#[A-Za-z_][\w.-]*\))$/.test(
                value,
              )
            ) {
              delete attribs[name];
              removed.add("SVGの危険な描画参照");
            }
          }
        }
        if (tagName === "svg") attribs.xmlns = "http://www.w3.org/2000/svg";
        if (attribs["xlink:href"]) {
          attribs.href = attribs["xlink:href"];
          delete attribs["xlink:href"];
        }
        return { tagName, attribs };
      },
    },
  });
  const output = new TextEncoder().encode(html);
  if (output.length > 20 * 1024 * 1024 || bytes > 20 * 1024 * 1024)
    fail("MEDIA_SIZE");
  if (XMLValidator.validate(html) !== true) fail();
  // Decode the sanitized SVG, never the untrusted source, to validate drawable input.
  const { default: sharp } = await import("sharp");
  await sharp(output, { failOn: "warning", limitInputPixels: 40_000_000 })
    .resize({ width: 64, height: 64, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return {
    kind: "image",
    mime: "image/svg+xml",
    sanitizedSvg: output,
    removed: [...removed],
  };
}
async function video(file, bytes, head) {
  const { Input, CustomSource, EncodedPacketSink, MP4, WEBM } = await import(
    "mediabunny"
  );
  const handle = await open(file, "r");
  let readBytes = 0;
  try {
    if (head.toString("ascii", 4, 8) === "ftyp") {
      let position = 0;
      while (position < bytes) {
        const header = Buffer.alloc(16);
        const { bytesRead } = await handle.read(
          header,
          0,
          Math.min(16, bytes - position),
          position,
        );
        if (bytesRead < 8) fail();
        let size = header.readUInt32BE();
        if (size === 1) {
          if (bytesRead < 16) fail();
          size = Number(header.readBigUInt64BE(8));
          if (size < 16) fail();
        } else if (!size) size = bytes - position;
        if (size < 8 || !Number.isSafeInteger(size) || position + size > bytes)
          fail();
        position += size;
      }
    }
    const input = new Input({
      formats: [MP4, WEBM],
      source: new CustomSource({
        maxCacheSize: 1024 * 1024,
        getSize: () => bytes,
        read: async (start, end) => {
          if (
            !Number.isSafeInteger(start) ||
            !Number.isSafeInteger(end) ||
            start < 0 ||
            end > bytes ||
            end <= start
          )
            fail();
          readBytes += end - start;
          if (readBytes > 1024 * 1024 * 1024 || end - start > 32 * 1024 * 1024)
            fail("MEDIA_RESOURCE_LIMIT");
          const result = Buffer.alloc(end - start);
          const read = await handle.read(result, 0, result.length, start);
          if (read.bytesRead !== result.length) fail();
          return result;
        },
      }),
    });
    try {
      const format = await input.getFormat();
      const tracks = await input.getTracks();
      if (!tracks.length || tracks.length > 32) fail("MEDIA_RESOURCE_LIMIT");
      if (!tracks.some((track) => track.isVideoTrack()))
        fail("MEDIA_UNSUPPORTED");
      let packets = 0;
      for (const track of tracks) {
        if (!(await track.getCodec())) fail("MEDIA_UNSUPPORTED");
        if (!(await track.getDecoderConfig())) fail("MEDIA_UNSUPPORTED");
        if (
          track.isVideoTrack() &&
          (!((await track.getCodedWidth()) > 0) ||
            !((await track.getCodedHeight()) > 0))
        )
          fail();
        let count = 0;
        for await (const packet of new EncodedPacketSink(track).packets(
          undefined,
          undefined,
          { verifyKeyPackets: true },
        )) {
          if (++packets > 2_000_000 || packet.data.length > 32 * 1024 * 1024)
            fail("MEDIA_RESOURCE_LIMIT");
          if (
            !packet.data.length ||
            !Number.isFinite(packet.timestamp) ||
            !Number.isFinite(packet.duration)
          )
            fail();
          count++;
        }
        if (!count) fail();
      }
      return {
        kind: "video",
        mime: format === MP4 ? "video/mp4" : "video/webm",
        removed: [],
      };
    } finally {
      input.dispose();
    }
  } finally {
    await handle.close();
  }
}
async function inspect() {
  const { file, bytes } = workerData;
  const handle = await open(file, "r");
  const head = Buffer.alloc(Math.min(bytes, 1024));
  try {
    await handle.read(head, 0, head.length, 0);
  } finally {
    await handle.close();
  }
  if (
    head.toString("ascii", 4, 8) === "ftyp" ||
    head.subarray(0, 4).toString("hex") === "1a45dfa3"
  )
    return video(file, bytes, head);
  if (bytes > 20 * 1024 * 1024) fail("MEDIA_SIZE");
  if (/^\s*(?:<\?xml\b|<svg\b|<!--|<!DOCTYPE)/.test(head.toString("utf8")))
    return safeSvg(file, bytes);
  let mime;
  if (head.subarray(0, 8).toString("hex") === "89504e470d0a1a0a")
    mime = "image/png";
  else if (head[0] === 255 && head[1] === 216) mime = "image/jpeg";
  else if (/^GIF8[79]a/.test(head.toString("ascii", 0, 6))) mime = "image/gif";
  else if (
    head.toString("ascii", 0, 4) === "RIFF" &&
    head.toString("ascii", 8, 12) === "WEBP"
  )
    mime = "image/webp";
  else fail("MEDIA_UNSUPPORTED");
  await validateMediaFile({ file, bytes, format: "image" });
  return { kind: "image", mime, removed: [] };
}
try {
  parentPort.postMessage(await inspect());
} catch (error) {
  parentPort.postMessage(
    error.message === "IMPORT_RESOURCE_LIMIT"
      ? "MEDIA_RESOURCE_LIMIT"
      : /^MEDIA_/.test(error.message)
        ? error.message
        : "MEDIA_CORRUPT",
  );
}
