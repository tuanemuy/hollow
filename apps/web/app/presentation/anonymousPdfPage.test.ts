import type { PdfAnonymousStatus } from "@repo/core/application/pdf/anonymousUsecases";
import { describe, expect, it, vi } from "vitest";
import { renderAnonymousPdfPage } from "./anonymousPdfPage";

const links = {
  status: "/fixture/pdf/status",
  receive: "/fixture/pdf/receive",
  manual: "/fixture/pdf/download",
  origin: "/fixture",
};
const expiresAt = "2026-09-20T03:30:00.000Z";
const states: readonly PdfAnonymousStatus[] = [
  { kind: "expired" },
  { kind: "failed", failure: "PDF_GENERATION_FAILED" },
  { kind: "pending", expiresAt },
  { kind: "ready", automatic: false, expiresAt },
  { kind: "ready", automatic: true, expiresAt },
];

describe("anonymous PDF page", () => {
  it.each([
    [{ kind: "expired" }, false, null],
    [{ kind: "expired" }, true, null],
    [{ kind: "failed", failure: "PDF_DEADLINE" }, false, null],
    [{ kind: "failed", failure: "PDF_DEADLINE" }, true, null],
    [{ kind: "pending", expiresAt }, false, links.status],
    [{ kind: "pending", expiresAt }, true, links.status],
    [{ kind: "ready", automatic: false, expiresAt }, false, null],
    [{ kind: "ready", automatic: false, expiresAt }, true, null],
    [{ kind: "ready", automatic: true, expiresAt }, false, links.receive],
    [{ kind: "ready", automatic: true, expiresAt }, true, links.status],
  ] as const)("uses the fixed state priority %#", (status, busy, destination) => {
    expect(renderAnonymousPdfPage(status, links, busy).refresh).toEqual(
      destination === null ? null : { seconds: 2, path: destination },
    );
  });

  it("defaults busy to false", () => {
    const status = { kind: "ready", automatic: true, expiresAt } as const;
    expect(renderAnonymousPdfPage(status, links)).toEqual(
      renderAnonymousPdfPage(status, links, false),
    );
  });

  it.each(
    states,
  )("renders a complete script-free document for $kind", (status) => {
    const { html } = renderAnonymousPdfPage(status, links);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain(
      'name="viewport" content="width=device-width,initial-scale=1"',
    );
    expect(html).toContain("</main></body></html>");
    expect(html).not.toMatch(
      /<script|http-equiv|on(?:load|click|submit)\s*=|<iframe|<img|<link/i,
    );
    expect(html).toContain('href="/fixture"');
    expect(html).toContain("元の画面に戻る");
    expect(html).toContain("サインイン中もこのブラウザーでの期限付き取得");
    expect(html).toContain("処理履歴には追加されません");
    expect(html).toContain("overflow-wrap:anywhere");
    expect(html).toContain(":focus-visible");
  });

  it.each([
    false,
    true,
  ])("keeps terminal pages non-consuming with busy=%s", (busy) => {
    for (const status of states.slice(0, 2)) {
      const page = renderAnonymousPdfPage(status, links, busy);
      expect(page.refresh).toBeNull();
      expect(page.html).not.toContain("<form");
      expect(page.html).not.toContain(links.manual);
      expect(page.html).not.toContain(links.receive);
      expect(page.html).not.toContain(links.status);
      expect(page.html).not.toContain("<time>");
    }
  });

  it.each([
    false,
    true,
  ])("keeps a latched receipt manual-only with busy=%s", (busy) => {
    const page = renderAnonymousPdfPage(
      { kind: "ready", automatic: false, expiresAt },
      links,
      busy,
    );
    expect(page.refresh).toBeNull();
    expect(page.html).toContain(
      '<form method="post" action="/fixture/pdf/download">',
    );
    expect(page.html).toContain('<button type="submit">PDFを取得する</button>');
    expect(page.html).not.toContain("disabled");
    expect(page.html).not.toContain(links.receive);
    expect(page.html).not.toContain(links.status);
    expect(page.html).toContain("自動受取は繰り返しません");
    expect(page.html).not.toContain("2秒ごと");
  });

  it("offers manual POST as the fallback before automatic receipt", () => {
    const page = renderAnonymousPdfPage(
      { kind: "ready", automatic: true, expiresAt },
      links,
    );
    expect(page.refresh).toEqual({ seconds: 2, path: links.receive });
    expect(page.html).toContain('method="post"');
    expect(page.html).toContain("まもなく自動受取を開始");
    expect(page.html).toContain("端末への保存完了を意味しません");
  });

  it("only polls status while busy and does not claim receipt success", () => {
    const page = renderAnonymousPdfPage(
      { kind: "ready", automatic: true, expiresAt },
      links,
      true,
    );
    expect(page.refresh).toEqual({ seconds: 2, path: links.status });
    expect(page.html).toContain("取得処理の終了を待っています");
    expect(page.html).not.toContain("まもなく自動受取を開始");
    expect(page.html).not.toContain(links.receive);
  });

  it("escapes validated path values for HTML attributes without changing Refresh paths", () => {
    const paths = {
      status: "/fixture/status?a=1&b=\"two'<>",
      receive: "/fixture/receive?a=1&b=\"two'<>",
      manual: "/fixture/manual?a=1&b=\"two'<>",
      origin: "/fixture/origin?a=1&b=\"two'<>",
    };
    const pending = renderAnonymousPdfPage(
      { kind: "pending", expiresAt },
      paths,
    );
    expect(pending.html).toContain(
      'href="/fixture/status?a=1&amp;b=&quot;two&#39;&lt;&gt;"',
    );
    expect(pending.html).toContain(
      'href="/fixture/origin?a=1&amp;b=&quot;two&#39;&lt;&gt;"',
    );
    expect(pending.refresh?.path).toBe(paths.status);
    const ready = renderAnonymousPdfPage(
      { kind: "ready", automatic: true, expiresAt },
      paths,
    );
    expect(ready.html).toContain(
      'action="/fixture/manual?a=1&amp;b=&quot;two&#39;&lt;&gt;"',
    );
    expect(ready.refresh?.path).toBe(paths.receive);
  });

  it("escapes expiry text in pending and ready pages", () => {
    const text = "<b>fixture</b>&\"'";
    for (const status of [
      { kind: "pending", expiresAt: text },
      { kind: "ready", automatic: false, expiresAt: text },
    ] as const) {
      const { html } = renderAnonymousPdfPage(status, links);
      expect(html).toContain(
        "<time>&lt;b&gt;fixture&lt;/b&gt;&amp;&quot;&#39;</time>",
      );
      expect(html).not.toContain("<b>");
    }
  });

  it.each([
    ["PDF_CONTENT_CHANGED", "ノートの内容が変わりました"],
    ["PDF_COPY_CHANGED", "ノートの内容が変わりました"],
    ["PDF_DEADLINE", "制限時間内に終わりませんでした"],
    ["PDF_CANCELLED", "作成を続けられませんでした"],
    ["PDF_BUSY", "作成処理が混み合っています"],
  ])("maps the safe failure code %s to a fixed explanation", (failure, explanation) => {
    const page = renderAnonymousPdfPage(
      { kind: "failed", failure },
      links,
      true,
    );
    expect(page.html).toContain(explanation);
    expect(page.html).not.toContain(failure);
    expect(page.refresh).toBeNull();
  });

  it("never renders arbitrary failure text or prototype property names", () => {
    const baseline = renderAnonymousPdfPage(
      { kind: "failed", failure: "PDF_GENERATION_FAILED" },
      links,
    );
    for (const failure of [
      '<script>alert("fixture")</script>',
      "unknown-fixture-text",
      "toString",
      "__proto__",
      "constructor",
    ]) {
      expect(
        renderAnonymousPdfPage({ kind: "failed", failure }, links),
      ).toEqual(baseline);
    }
  });

  it("does not inspect time or replace application expiry decisions", () => {
    const clock = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("page is clock-free");
    });
    try {
      const page = renderAnonymousPdfPage(
        { kind: "pending", expiresAt: "2000-01-01T00:00:00.000Z" },
        links,
      );
      expect(page.refresh).toEqual({ seconds: 2, path: links.status });
      expect(clock).not.toHaveBeenCalled();
    } finally {
      clock.mockRestore();
    }
  });
});
