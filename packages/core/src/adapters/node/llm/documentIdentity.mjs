import { createHash } from "node:crypto";

const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function documentManifestHash(source, coverage, notices, segments) {
  const orderedCoverage =
    coverage.kind === "office-text"
      ? {
          kind: coverage.kind,
          format: coverage.format,
          textComplete: coverage.textComplete,
          units: coverage.units.map((unit) => ({
            ordinal: unit.ordinal,
            kind: unit.kind,
            firstBlock: unit.firstBlock,
            blockCount: unit.blockCount,
          })),
          uninterpretedMedia: coverage.uninterpretedMedia,
        }
      : {
          kind: coverage.kind,
          pages: coverage.pages.map((page) => ({
            ordinal: page.ordinal,
            class: page.class,
            firstBlock: page.firstBlock,
            blockCount: page.blockCount,
          })),
        };
  return hash([
    "hollow.prepare",
    2,
    source.format,
    source.sha256,
    orderedCoverage,
    notices.map((notice) => ({
      code: notice.code,
      unit: notice.unit,
      count: notice.count,
    })),
    segments.map((segment) => [
      segment.identity.ordinal,
      segment.firstBlock,
      segment.blockCount,
      segment.html,
    ]),
  ]);
}

export function documentSegmentHash(
  manifestHash,
  ordinal,
  firstBlock,
  blockCount,
  html,
) {
  return hash([
    "hollow.segment",
    2,
    manifestHash,
    ordinal,
    firstBlock,
    blockCount,
    html,
  ]);
}
