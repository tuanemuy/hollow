import { describe, expect, it } from "vitest";
import { NodeHtmlSanitizer as sanitizer } from "../htmlSanitizer";

const url =
  "/api/notes/00000000-0000-4000-8000-000000000001/assets/00000000-0000-4000-8000-000000000002";
describe("canonical HTML versus inert render", () => {
  it("retains canonical links but renders no navigable element even before load handlers", () => {
    const source =
      '<a href="https://example.org" target="_top">external</a><a href="/notes/delete">self</a><a href="java&#x73;cript:alert(1)">bad</a><form action="/signout"><button>Submit</button></form><base href="https://evil.test"><meta http-equiv="refresh" content="0;url=/trap"><iframe src="/trap"></iframe><object data="/trap"></object><script>parent.bad=1</script><img src="/trap" onerror="alert(1)">';
    const canonical = sanitizer.sanitize(source);
    expect(canonical.html).toContain('href="https://example.org"');
    const rendered = sanitizer.render(canonical.html, new Set());
    expect(rendered.links).toEqual([
      {
        id: "link-0",
        url: "https://example.org",
        label: "https://example.org",
      },
    ]);
    expect(rendered.html).not.toMatch(
      /href=|target=|<a\b|<form|<base|<meta|<iframe|<object|<script|onerror|src=/,
    );
  });
  it("renders only authorized assets and returns exact CSP destinations without changing canonical HTML", () => {
    const input = `<style>p{color:red;background:url(/trap)}</style><p>text</p><img src="${url}" alt="photo"><video src="/trap"></video>`;
    expect(sanitizer.assetUrls(input)).toEqual([url]);
    const rendered = sanitizer.render(input, new Set([url]));
    expect(rendered.html).toContain(`src="${url}"`);
    expect(rendered.html).not.toContain('src="/trap"');
    expect(rendered.assetUrls).toEqual([url]);
    expect(rendered.html).toContain("color:red");
    expect(
      sanitizer.rewriteAssets(
        input,
        new Map([[url, url.replace("notes", "drafts")]]),
      ),
    ).toContain(url.replace("notes", "drafts"));
  });
});
