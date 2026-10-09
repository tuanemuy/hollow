import type { ReferenceReaderEntry } from "@repo/core/application/reference/view";
import { describe, expect, it } from "vitest";
import { referenceLedgerHtml } from "./referenceLedgerHtml";

describe("read-only reference ledger HTML", () => {
  it("shows current results and historical CSS notices as escaped text without external requests or controls", () => {
    const entries: readonly ReferenceReaderEntry[] = [
      {
        kind: "image",
        state: "acquired",
        current: true,
        source: { kind: "url", url: "https://original.example/image.png" },
        bytes: 1024,
        reason: null,
      },
      {
        kind: "stylesheet",
        state: "failed",
        current: true,
        source: {
          kind: "url",
          url: 'https://original.example/<img src=x onerror="bad()">',
        },
        bytes: 0,
        reason: "<script>bad()</script> & 取得できません",
      },
      {
        kind: "stylesheet",
        state: "limited",
        current: false,
        source: { kind: "data", mediaType: 'text/css"><img src=x>' },
        bytes: 0,
        reason: "ページ全体を覆う配置を除去しました。",
      },
      {
        kind: "video",
        state: "unattempted",
        current: true,
        source: { kind: "url", url: "clip.mp4" },
        bytes: 0,
        reason: null,
      },
    ];
    const html = referenceLedgerHtml(entries);
    expect(html).toContain('id="reference-ledger"');
    expect(html).toContain(
      "現在 3 件 · 取得済み 1 件 · 未取得 2 件 · 外部依存 0 件",
    );
    expect(html).toContain("取得失敗");
    expect(html).toContain("未試行");
    expect(html).toContain("安全化・CSS除去");
    expect(html).toContain("過去の参照");
    expect(html).toContain("ページ全体を覆う配置を除去しました。");
    expect(html).toContain(
      "&lt;script&gt;bad()&lt;/script&gt; &amp; 取得できません",
    );
    expect(html).not.toMatch(
      /<(?:script|img|video|iframe|link|a|input|button)\b/,
    );
    expect(html).not.toContain('href="https://');
  });
  it("provides an explicit empty record instead of exposing management actions", () => {
    const html = referenceLedgerHtml([]);
    expect(html).toContain("現在 0 件");
    expect(html).toContain("参照リソースはありません。");
    expect(html).not.toContain("取り込みをオン");
  });
});
