import { expect, it } from "vitest";
import { externalReadingAllowed } from "./externalReading";

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
