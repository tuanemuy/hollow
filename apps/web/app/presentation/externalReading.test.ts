import { expect, it } from "vitest";
import {
  externalDocumentReadingAllowed,
  externalReadingAllowed,
} from "./externalReading";

it("requires trustworthy transport and browser Fetch Metadata only for external direct reading", () => {
  const metadata = { destination: "empty", mode: "cors", site: "same-origin" };
  for (const app of [
    "https://hollow.example",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ])
    expect(externalReadingAllowed(app, metadata)).toBe(true);
  expect(externalReadingAllowed("http://hollow.example", metadata)).toBe(false);
  for (const missing of ["destination", "mode", "site"] as const)
    expect(
      externalReadingAllowed("https://hollow.example", {
        ...metadata,
        [missing]: undefined,
      }),
    ).toBe(false);
  expect(
    externalReadingAllowed("https://hollow.example", {
      ...metadata,
      site: "cross-site",
    }),
  ).toBe(false);
});

it("reads external sources for a top-level document only when this app or the user started the navigation", () => {
  const navigation = {
    destination: "document",
    mode: "navigate",
    site: "same-origin",
  };
  for (const site of ["same-origin", "none"])
    expect(
      externalDocumentReadingAllowed("https://hollow.example", {
        ...navigation,
        site,
      }),
    ).toBe(true);
  for (const site of ["cross-site", "same-site", undefined])
    expect(
      externalDocumentReadingAllowed("https://hollow.example", {
        ...navigation,
        site,
      }),
    ).toBe(false);
  expect(
    externalDocumentReadingAllowed("http://hollow.example", navigation),
  ).toBe(false);
  for (const [field, value] of [
    ["destination", "iframe"],
    ["destination", undefined],
    ["mode", "cors"],
    ["mode", undefined],
  ] as const)
    expect(
      externalDocumentReadingAllowed("https://hollow.example", {
        ...navigation,
        [field]: value,
      }),
    ).toBe(false);
  expect(externalReadingAllowed("https://hollow.example", navigation)).toBe(
    false,
  );
});
