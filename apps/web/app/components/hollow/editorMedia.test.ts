import { describe, expect, it } from "vitest";
import {
  frameDocument,
  isMediaUrl,
  mediaFileError,
  mediaMarkup,
  mediaUploadError,
  parseMediaUpload,
  safeParentLink,
} from "./editorMedia";

describe("editor media boundary", () => {
  it("changes only the trusted default stylesheet when original display is selected", () => {
    const html =
      '<style>.original{color:purple}</style><p class="original">本文</p><span data-hollow-link="one">外部リンク</span><img src="/api/notes/n/assets/a">';
    const assets = ["/api/notes/n/assets/a", "data:image/png;base64,YQ=="];
    const external = {
      images: ["https://images.test/a.png"],
      backgrounds: ["https://background.test/tile.png"],
      media: ["https://media.test/a.mp4"],
      fonts: ["https://font.test/a.woff2"],
    };
    const standard = frameDocument(
      html,
      assets,
      "https://hollow.test",
      external,
    );
    const original = frameDocument(
      html,
      assets,
      "https://hollow.test",
      external,
      "original",
    );
    expect(standard).toBe(
      frameDocument(html, assets, "https://hollow.test", external, "default"),
    );
    const [head, body] = original.split("</head>");
    expect(head).not.toContain("<style>");
    expect(head).toContain('<meta charset="utf-8">');
    expect(original).toMatch(
      /^<!doctype html><html><head><meta http-equiv="Content-Security-Policy"/,
    );
    expect(
      standard.match(/<meta http-equiv="Content-Security-Policy"[^>]+>/)?.[0],
    ).toBe(
      original.match(/<meta http-equiv="Content-Security-Policy"[^>]+>/)?.[0],
    );
    expect(body).toBe(`<body>${html}</body></html>`);
    expect(original).not.toContain("font:16px/1.85");
    expect(standard).toContain("font:16px/1.85");
    expect(
      frameDocument(html, assets, "https://hollow.test", external, "default"),
    ).toBe(standard);
  });
  it("retains default-deny policy for original display without any admitted resources", () => {
    const original = frameDocument(
      "<p>plain</p>",
      [],
      "https://hollow.test",
      undefined,
      "original",
    );
    for (const directive of [
      "default-src",
      "script-src",
      "object-src",
      "frame-src",
      "connect-src",
      "form-action",
      "base-uri",
      "font-src",
      "img-src",
      "media-src",
    ])
      expect(original).toContain(`${directive} 'none'`);
    expect(original).toContain("style-src 'unsafe-inline'");
    expect(original).not.toContain("<style>");
  });
  it("reads the HTTP error envelope and hides unknown internal messages", () => {
    expect(
      mediaUploadError({
        error: {
          kind: "notFound",
          code: "ASSET_NOT_FOUND",
          message: "hidden detail",
        },
      }),
    ).toContain("再読み込み");
    expect(
      mediaUploadError({
        error: {
          kind: "business",
          code: "MEDIA_CORRUPT",
          message: "メディアが破損しています",
        },
      }),
    ).toBe("メディアが破損しています");
    for (const kind of ["unknown", "system", "invented"])
      expect(
        mediaUploadError({
          error: {
            kind,
            code: "PRIVATE_CODE",
            message: "private storage path",
          },
        }),
      ).not.toContain("private");
    expect(mediaUploadError({ error: "private storage path" })).not.toContain(
      "private",
    );
  });
  it("validates complete upload responses instead of casting unknown payloads", () => {
    const valid = {
      asset: {
        id: "a",
        url: "/api/drafts/d/assets/a",
        kind: "image",
        mime: "image/png",
        bytes: 12,
      },
      removed: ["script"],
    };
    expect(parseMediaUpload(valid)).toEqual(valid);
    for (const invalid of [
      null,
      {},
      { ...valid, removed: [1] },
      { ...valid, asset: { ...valid.asset, bytes: -1 } },
      { ...valid, asset: { ...valid.asset, kind: "audio" } },
      { ...valid, asset: { ...valid.asset, url: "https://evil/image" } },
    ])
      expect(() => parseMediaUpload(invalid)).toThrow();
  });
  it("permits only exact note or draft asset paths in the current scope", () => {
    const scope = { noteId: "note_1", draftId: "draft-1" };
    expect(isMediaUrl("/api/notes/note_1/assets/asset-1", scope)).toBe(true);
    expect(isMediaUrl("/api/drafts/draft-1/assets/asset-1", scope)).toBe(true);
    for (const value of [
      "/api/notes/other/assets/a",
      "/api/notes/note_1/assets/../logout",
      "/api/notes/note_1/assets/%2e%2e",
      "/api/notes/note_1/assets/a?x=1",
      "/api/notes/note_1/assets/a#x",
      "//evil/api/notes/note_1/assets/a",
      "https://evil/a",
      "data:image/png;base64,a",
      "/api/signout",
      "/api/notes/note_1/assets/a;connect-src *",
    ])
      expect(isMediaUrl(value, scope)).toBe(false);
  });
  it("applies inclusive image and video byte limits and rejects empty or unsupported files", () => {
    expect(
      mediaFileError({ name: "写真.SVG", size: 20 * 1024 * 1024 }),
    ).toBeNull();
    expect(
      mediaFileError({ name: "写真.png", size: 20 * 1024 * 1024 + 1 }),
    ).toContain("20 MiB");
    expect(
      mediaFileError({ name: "動画.webm", size: 200 * 1024 * 1024 }),
    ).toBeNull();
    expect(
      mediaFileError({ name: "動画.mp4", size: 200 * 1024 * 1024 + 1 }),
    ).toContain("200 MiB");
    expect(mediaFileError({ name: "empty.png", size: 0 })).not.toBeNull();
    expect(mediaFileError({ name: "audio.mp3", size: 1 })).not.toBeNull();
  });
  it("creates escaped canonical media markup without copying arbitrary attributes", () => {
    const asset = {
      id: "a",
      url: "/api/drafts/d/assets/a",
      kind: "image" as const,
      bytes: 12,
      mime: "image/png",
    };
    expect(
      mediaMarkup(asset, '"><script>alert(1)</script>', { draftId: "d" }),
    ).toBe(
      '<p><img src="/api/drafts/d/assets/a" alt="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"></p>',
    );
    expect(
      mediaMarkup({ ...asset, kind: "video" }, "動画", { draftId: "d" }),
    ).toContain('controls preload="metadata"');
    expect(() => mediaMarkup(asset, "", { draftId: "other" })).toThrow();
  });
  it("puts restrictive CSP first and lists only exact server asset URLs", () => {
    const doc = frameDocument(
      "<p>本文</p>",
      ["/api/notes/n/assets/a", "https://evil/a", "/api/signout"],
      "https://hollow.test",
    );
    expect(doc).toMatch(
      /^<!doctype html><html><head><meta http-equiv="Content-Security-Policy"/,
    );
    expect(doc).toContain("img-src https://hollow.test/api/notes/n/assets/a;");
    expect(doc).toContain("media-src https://hollow.test/api/notes/n/assets/a");
    for (const type of [
      "default",
      "script",
      "object",
      "frame",
      "connect",
      "font",
    ])
      expect(doc).toContain(`${type}-src 'none'`);
    expect(doc).not.toContain("https://evil");
    expect(doc).not.toContain("/api/signout");
    expect(frameDocument("", [], "https://hollow.test")).toContain(
      "img-src 'none'; media-src 'none'",
    );
  });
  it("does not expose executable parent links", () => {
    for (const url of [
      "https://example.com/",
      "http://example.com/",
      "mailto:hello@example.com",
    ])
      expect(safeParentLink(url)).toBe(true);
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "blob:https://hollow.test/a",
      "/api/signout",
    ])
      expect(safeParentLink(url)).toBe(false);
  });
  it("separates admitted external CSP categories and rejects source-list injection", () => {
    const doc = frameDocument("", [], "https://hollow.test", {
      images: [
        "https://images.test/a.png",
        "https://hollow.test/api/signout",
        "https://*.bad.test/a",
        "https://bad.test/a; script-src *",
      ],
      backgrounds: ["https://background.test/tile.png"],
      media: ["https://video.test/a.mp4"],
      fonts: ["https://font.test/a.woff2"],
    });
    expect(doc).toContain(
      "img-src https://images.test/a.png https://background.test/tile.png;",
    );
    expect(doc).toContain("media-src https://video.test/a.mp4");
    expect(doc).toContain("font-src https://font.test/a.woff2;");
    expect(doc).not.toContain("bad.test");
    expect(doc).not.toContain("/api/signout");
    expect(doc).not.toContain("data:");
  });
  it("allows data CSP only for server-authorized media categories", () => {
    const doc = frameDocument(
      "",
      ["data:image/png;base64,YQ=="],
      "https://hollow.test",
    );
    expect(doc).toContain("img-src data:; media-src 'none'");
    expect(doc).toContain("font-src 'none'");
    const video = frameDocument(
      "",
      ["data:video/mp4;base64,YQ=="],
      "https://hollow.test",
    );
    expect(video).toContain("img-src 'none'; media-src data:");
  });
});
