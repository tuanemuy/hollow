import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type PdfComputeIdentity,
  pdfComputeIdentity,
  type ZipContentIdentity,
  zipContentIdentity,
} from "./pdf";

describe("separate ZIP confirmation and PDF compute identity", () => {
  it("preserves the canonical hash while distinguishing its meaning statically", () => {
    const hash = "a".repeat(64);
    expect(zipContentIdentity(hash)).toEqual({
      kind: "zip-content",
      value: hash,
    });
    expect(pdfComputeIdentity(hash)).toEqual({
      kind: "pdf-compute",
      value: hash,
    });
    expectTypeOf<ZipContentIdentity>().not.toEqualTypeOf<PdfComputeIdentity>();
  });
  it.each([
    "",
    "a".repeat(63),
    "A".repeat(64),
    "g".repeat(64),
  ])("rejects invalid boundary hash %s", (hash) => {
    expect(() => zipContentIdentity(hash)).toThrow();
    expect(() => pdfComputeIdentity(hash)).toThrow();
  });
});
