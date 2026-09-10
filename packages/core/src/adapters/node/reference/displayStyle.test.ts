import { describe, expect, it } from "vitest";
import { NodeReferenceProcessor } from "./referenceProcessor";

describe("safe declaration display classification", () => {
  const processor = new NodeReferenceProcessor();
  it.each([
    '<h1 class="red">heading</h1><strong>semantic</strong>',
    '<p style="">empty</p><style>/* comment */ .red {}</style>',
    '<p style="made-up: red; color: nonsense">invalid</p>',
    '<style>@import "https://example.com/a.css";</style><p>text</p>',
    '<script>color:red</script><link rel="stylesheet" href="https://example.com/a.css">',
    '<p style="--red:red">unused variable</p>',
    '<p style="color:var()">invalid variable</p>',
  ])("does not infer decoration from absent or ineffective declarations: %s", (html) =>
    expect(processor.hasDecoration(html)).toBe(false));
  it.each([
    '<p style="color:red">red</p>',
    '<style style="">p{color:red}</style><p>sheet with an empty attribute</p>',
    '<p style="c\\6flor:red">escaped property</p>',
    "<style>p{margin:2px}</style><p>margin</p>",
    "<style>@media (min-width:1px){p{color:red}}</style><p>conditional</p>",
    '<p style="--red:red;color:var(--red)">variable</p>',
  ])("recognizes remaining safe declarations without computed cascade claims: %s", (html) =>
    expect(processor.hasDecoration(html)).toBe(true));
});
