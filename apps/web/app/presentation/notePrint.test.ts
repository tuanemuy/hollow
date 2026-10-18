import { createHash } from "node:crypto";
import { DEFAULT_DOCUMENT_CSS } from "@repo/core/lib/defaultDocumentStyle";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOTE_PRINT_SCRIPT,
  NOTE_PRINT_SCRIPT_HASH,
  type NotePrintSource,
  notePrintDocument,
  notePrintResponse,
  readingPrintNotice,
} from "./notePrint";
import {
  PRINT_ACTION_LABEL,
  PRINT_NOTICE_CLASS,
  READING_PRINT_NOTICE,
} from "./notePrintText";

const origin = "https://hollow.test";
const source: NotePrintSource = {
  title: 'Q3 "plan" <draft>',
  html: '<p>BODY MARKER</p><img src="https://hollow.test/api/notes/n/assets/a" loading="lazy">',
  assetUrls: ["/api/notes/n/assets/a"],
  externalSources: {
    images: ["https://images.example/a.png"],
    media: [],
    backgrounds: [],
    fonts: [],
  },
  display: { style: "default" },
};
const directives = (policy: string) =>
  new Map(
    policy.split(";").map((part) => {
      const [name = "", ...values] = part.trim().split(/\s+/);
      return [name, values.join(" ")] as const;
    }),
  );

describe("note print document", () => {
  it("admits exactly the bundled print script by its hash", () => {
    expect(NOTE_PRINT_SCRIPT_HASH).toBe(
      `sha256-${createHash("sha256").update(NOTE_PRINT_SCRIPT).digest("base64")}`,
    );
    const document = notePrintDocument(source, origin, "/notes/n");
    expect(directives(document.contentSecurityPolicy).get("script-src")).toBe(
      `'${NOTE_PRINT_SCRIPT_HASH}'`,
    );
    const scripts = [...document.html.matchAll(/<script>([^<]*)<\/script>/g)];
    expect(scripts.map((match) => match[1])).toEqual([NOTE_PRINT_SCRIPT]);
    expect(document.html.indexOf("<script>")).toBeLessThan(
      document.html.indexOf("<body>"),
    );
  });

  it("keeps the note body policy and isolates the top-level document", () => {
    const policy = directives(
      notePrintDocument(source, origin, "/notes/n").contentSecurityPolicy,
    );
    expect(policy.get("default-src")).toBe("'none'");
    for (const name of [
      "object-src",
      "frame-src",
      "connect-src",
      "form-action",
      "base-uri",
      "frame-ancestors",
    ])
      expect(policy.get(name)).toBe("'none'");
    expect(policy.get("img-src")).toBe(
      "https://hollow.test/api/notes/n/assets/a https://images.example/a.png",
    );
    expect(policy.get("sandbox")).toBe(
      "allow-same-origin allow-scripts allow-modals",
    );
  });

  it("titles the document after the note and renders the body under a screen-only toolbar", () => {
    const { html } = notePrintDocument(
      source,
      origin,
      '/s/token"><script>x()</script>',
    );
    expect(html).toContain("<title>Q3 &quot;plan&quot; &lt;draft&gt;</title>");
    expect(html).toContain(
      `<style>${DEFAULT_DOCUMENT_CSS}</style><style>@media screen{body{margin-inline:max(24px,calc((100% - 680px) / 2))}}</style></head>`,
    );
    expect(html).toContain(
      '<a href="/s/token&quot;&gt;&lt;script&gt;x()&lt;/script&gt;">ノートに戻る</a>',
    );
    expect(html).toContain(
      `<button type="button">${PRINT_ACTION_LABEL}</button>`,
    );
    expect(html).toContain("@media print{:host{display:none!important}}");
    expect(html.indexOf("<hollow-print-bar>")).toBeLessThan(
      html.indexOf("BODY MARKER"),
    );
    expect(html).toContain(`</hollow-print-bar>${source.html}</body>`);
  });

  it("omits the default stylesheet when the note keeps its original display", () => {
    const { html } = notePrintDocument(
      { ...source, display: { style: "original" } },
      origin,
      "/notes/n",
    );
    expect(html).not.toContain(DEFAULT_DOCUMENT_CSS);
    expect(html).toContain("BODY MARKER");
  });

  it.each([
    "",
    "  \n ",
  ])("sends an empty body (%j) back to the entry page instead of printing", async (html) => {
    const response = notePrintResponse(
      new Request("https://hollow.test/notes/n/print"),
      { ...source, html },
      origin,
      "/notes/n",
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/notes/n");
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(await response.text()).toBe("");
  });

  it("answers HEAD without a body and keeps the response private", async () => {
    const response = notePrintResponse(
      new Request("https://hollow.test/notes/n/print", { method: "HEAD" }),
      source,
      origin,
      "/notes/n",
    );
    expect(await response.text()).toBe("");
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "private, no-store",
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    });
    const get = notePrintResponse(
      new Request("https://hollow.test/notes/n/print"),
      source,
      origin,
      "/notes/n",
    );
    expect(await get.text()).toBe(
      notePrintDocument(source, origin, "/notes/n").html,
    );
  });

  it("prints the reading-page notice with the class the stylesheet keeps on paper", () => {
    expect(readingPrintNotice).toBe(
      `<p class="${PRINT_NOTICE_CLASS}">${READING_PRINT_NOTICE}</p>`,
    );
    expect(READING_PRINT_NOTICE).toContain(`「${PRINT_ACTION_LABEL}」`);
  });
});

type FakeImage = {
  complete: boolean;
  loading: string;
  handlers: Record<string, (() => void)[]>;
  addEventListener(type: string, handler: () => void): void;
  settle(type: "load" | "error"): void;
};
const image = (complete: boolean): FakeImage => ({
  complete,
  loading: "lazy",
  handlers: {},
  addEventListener(type, handler) {
    (this.handlers[type] ??= []).push(handler);
  },
  settle(type) {
    this.complete = true;
    for (const handler of this.handlers[type] ?? []) handler();
  },
});

function runPrintScript(images: FakeImage[], withBar = true) {
  const loaded: Record<string, () => void> = {};
  const button = {
    disabled: false,
    textContent: PRINT_ACTION_LABEL,
    click: undefined as undefined | (() => void),
    addEventListener(_type: string, handler: () => void) {
      this.click = handler;
    },
  };
  const document = {
    images,
    fonts: { ready: Promise.resolve() },
    addEventListener(type: string, handler: () => void) {
      loaded[type] = handler;
    },
    querySelector: (selector: string) =>
      withBar && selector === "hollow-print-bar"
        ? { shadowRoot: { querySelector: () => button } }
        : null,
  };
  const print = vi.fn();
  new Function("document", "print", "setTimeout", NOTE_PRINT_SCRIPT)(
    document,
    print,
    setTimeout,
  );
  loaded.DOMContentLoaded?.();
  return { print, button };
}

describe("note print script", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads lazy images eagerly and prints once they have all settled", async () => {
    const ready = image(true);
    const slow = image(false);
    const broken = image(false);
    const { print, button } = runPrintScript([ready, slow, broken]);
    expect([ready, slow, broken].map((item) => item.loading)).toEqual([
      "eager",
      "eager",
      "eager",
    ]);
    await vi.advanceTimersByTimeAsync(0);
    expect(print).not.toHaveBeenCalled();
    expect(button).toMatchObject({
      disabled: true,
      textContent: "画像を読み込んでいます…",
    });
    slow.settle("load");
    await vi.advanceTimersByTimeAsync(0);
    expect(print).not.toHaveBeenCalled();
    broken.settle("error");
    await vi.advanceTimersByTimeAsync(0);
    expect(print).toHaveBeenCalledTimes(1);
    expect(button).toMatchObject({
      disabled: false,
      textContent: PRINT_ACTION_LABEL,
    });
  });

  it("prints after 15 seconds when an image never answers", async () => {
    const { print } = runPrintScript([image(false)]);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(print).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("prints again on each press of the button but not while it is still waiting", async () => {
    const slow = image(false);
    const { print, button } = runPrintScript([slow]);
    button.click?.();
    slow.settle("load");
    await vi.advanceTimersByTimeAsync(0);
    expect(print).toHaveBeenCalledTimes(1);
    button.click?.();
    await vi.advanceTimersByTimeAsync(0);
    button.click?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(print).toHaveBeenCalledTimes(3);
  });

  it("still prints once when the toolbar is missing", async () => {
    const { print } = runPrintScript([], false);
    await vi.advanceTimersByTimeAsync(0);
    expect(print).toHaveBeenCalledTimes(1);
  });
});
