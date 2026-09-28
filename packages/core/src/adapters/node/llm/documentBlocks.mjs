import {
  documentManifestHash,
  documentSegmentHash,
} from "./documentIdentity.mjs";

export const SEGMENT_BYTES = 64 * 1024;
export function fail(code) {
  throw Object.assign(new Error(code), { code });
}
export function escapeHtml(value) {
  const text = String(value);
  if (/\[\[hollow-media:/iu.test(text)) fail("LLM_SOURCE_INVALID");
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

export function textBlocks(text, tag = "p") {
  if (/\[\[hollow-media:/iu.test(text)) fail("LLM_SOURCE_INVALID");
  const out = [];
  let body = "";
  let size = Buffer.byteLength(`<${tag}></${tag}>`);
  for (const point of text) {
    const escaped = point === "\n" ? "<br>" : escapeHtml(point);
    const bytes = Buffer.byteLength(escaped);
    if (size + bytes > SEGMENT_BYTES) {
      out.push(`<${tag}>${body}</${tag}>`);
      body = "";
      size = Buffer.byteLength(`<${tag}></${tag}>`);
    }
    body += escaped;
    size += bytes;
  }
  if (body) out.push(`<${tag}>${body}</${tag}>`);
  return out;
}

export function preparedDocument(source, blocks, coverage, notices) {
  if (!blocks.length) fail("LLM_DOCUMENT_NO_TEXT");
  if (notices.length > 200) fail("LLM_RESOURCE_LIMIT");
  const segments = [];
  let html = "";
  let firstBlock = 0;
  let blockCount = 0;
  const flush = () => {
    if (!blockCount) return;
    segments.push({
      identity: {
        kind: "prepared-segment",
        ordinal: segments.length,
        sha256: "",
      },
      html,
      firstBlock,
      blockCount,
    });
    if (segments.length > 16) fail("LLM_RESOURCE_LIMIT");
    firstBlock += blockCount;
    blockCount = 0;
    html = "";
  };
  for (const block of blocks) {
    if (Buffer.byteLength(block) > SEGMENT_BYTES) fail("LLM_RESOURCE_LIMIT");
    if (Buffer.byteLength(html) + Buffer.byteLength(block) > SEGMENT_BYTES)
      flush();
    html += block;
    blockCount++;
  }
  flush();
  const sha256 = documentManifestHash(source, coverage, notices, segments);
  for (const segment of segments)
    segment.identity.sha256 = documentSegmentHash(
      sha256,
      segment.identity.ordinal,
      segment.firstBlock,
      segment.blockCount,
      segment.html,
    );
  return {
    kind: "text-blocks",
    preparationVersion: 2,
    identity: { kind: "prepared-document", preparationVersion: 2, sha256 },
    coverage,
    segments,
    blocks: blocks.length,
    notices,
    media: [],
  };
}
