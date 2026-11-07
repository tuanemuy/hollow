import { describe, expect, it } from "vitest";
import { hasBody } from "./entity";

describe("hasBody", () => {
  it.each(["", " ", "\n\t "])("treats %j as no body", (html) => {
    expect(hasBody(html)).toBe(false);
  });
  it.each([
    "<p>本文</p>",
    " x ",
    "<img src=a>",
  ])("treats %j as a body", (html) => {
    expect(hasBody(html)).toBe(true);
  });
});
