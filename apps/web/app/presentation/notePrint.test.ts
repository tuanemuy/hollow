import { createHash } from "node:crypto";
import { DEFAULT_DOCUMENT_CSS } from "@repo/core/lib/defaultDocumentStyle";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import layoutCss from "../styles/layout.css?raw";
import {
  NOTE_PRINT_SCRIPT,
  NOTE_PRINT_SCRIPT_HASH,
  type NotePrintSource,
  notePrintDocument,
  notePrintFailure,
  notePrintResponse,
  readingPrintNotice,
  returnToEntry,
} from "./notePrint";
import {
  PRINT_ACTION_LABEL,
  PRINT_FAILURE_MESSAGE,
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
      `<div role="toolbar" aria-label="印刷"><button type="button">${PRINT_ACTION_LABEL}</button>`,
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

  it("sends the reader back to the entry page without a body or a policy", async () => {
    const response = returnToEntry("/s/token");
    expect(response.status).toBe(303);
    expect(Object.fromEntries(response.headers)).toEqual({
      "cache-control": "private, no-store",
      location: "/s/token",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    });
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
    expect(get.status).toBe(200);
    expect(get.headers.get("content-security-policy")).toContain(
      `script-src '${NOTE_PRINT_SCRIPT_HASH}';`,
    );
    const html = await get.text();
    expect(html.startsWith('<!doctype html><html lang="ja"><head>')).toBe(true);
    expect(html).toContain(`</hollow-print-bar>${source.html}</body></html>`);
  });

  it("reports that the print view could not open, with the way back and nothing to print", async () => {
    const response = notePrintFailure(
      new Request("https://hollow.test/notes/n/print"),
      '/notes/n"><b>',
    );
    expect(response.status).toBe(500);
    expect(Object.fromEntries(response.headers)).toEqual({
      "cache-control": "private, no-store",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    });
    const html = await response.text();
    expect(html).toContain(
      `<div><p role="alert">${PRINT_FAILURE_MESSAGE}</p><a href="/notes/n&quot;&gt;&lt;b&gt;">ノートに戻る</a></div>`,
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<button");
    const head = notePrintFailure(
      new Request("https://hollow.test/notes/n/print", { method: "HEAD" }),
      "/notes/n",
    );
    expect(head.status).toBe(500);
    expect(await head.text()).toBe("");
  });

  it("prints the reading-page notice with the class the stylesheet keeps on paper", () => {
    expect(readingPrintNotice).toBe(
      `<p class="${PRINT_NOTICE_CLASS}">${READING_PRINT_NOTICE}</p>`,
    );
    expect(READING_PRINT_NOTICE).toContain(`「${PRINT_ACTION_LABEL}」`);
  });

  it("hides the reading-page notice on screen and prints nothing else on a page that carries it", () => {
    const css = layoutCss.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
    const notice = `.${PRINT_NOTICE_CLASS}`;
    expect(css).toContain(
      `${notice} { display: none; } @media print { body:has(${notice}) :not( :has(${notice}), ${notice}, ${notice} * ) { display: none !important; } ${notice} { display: block; } }`,
    );
  });
});

type FakeImage = {
  complete: boolean;
  loading: string;
  src?: string;
  handlers: Record<string, (() => void)[]>;
  addEventListener(type: string, handler: () => void): void;
  settle(type: "load" | "error"): void;
};
const image = (complete: boolean): FakeImage => ({
  complete,
  loading: "lazy",
  handlers: {},
  addEventListener(type, handler) {
    this.handlers[type] = [...(this.handlers[type] ?? []), handler];
  },
  settle(type) {
    this.complete = true;
    for (const handler of this.handlers[type] ?? []) handler();
  },
});

type FakeElement = { backgrounds: Partial<Record<string, string>> };
type FakePage = {
  images?: FakeImage[];
  elements?: FakeElement[];
  posters?: string[];
  fonts?: Promise<void>;
  withBar?: boolean;
};

function runPrintScript({
  images = [],
  elements = [],
  posters = [],
  fonts = Promise.resolve(),
  withBar = true,
}: FakePage) {
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
    fonts: { ready: fonts },
    addEventListener(type: string, handler: () => void) {
      loaded[type] = handler;
    },
    querySelector: (selector: string) =>
      withBar && selector === "hollow-print-bar"
        ? { shadowRoot: { querySelector: () => button } }
        : null,
    querySelectorAll: (selector: string) =>
      selector === "body *"
        ? elements
        : selector === "video[poster]"
          ? posters.map((poster) => ({ poster }))
          : [],
  };
  const getComputedStyle = (element: FakeElement, pseudo: string | null) => ({
    backgroundImage: element.backgrounds[pseudo ?? ""] ?? "none",
  });
  const requested: FakeImage[] = [];
  function Image() {
    const created = image(false);
    requested.push(created);
    return created;
  }
  const print = vi.fn();
  new Function(
    "document",
    "print",
    "setTimeout",
    "getComputedStyle",
    "Image",
    NOTE_PRINT_SCRIPT,
  )(document, print, setTimeout, getComputedStyle, Image);
  loaded.DOMContentLoaded?.();
  return { print, button, requested };
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
    const { print, button } = runPrintScript({
      images: [ready, slow, broken],
    });
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

  it("waits for CSS background images and video posters before printing", async () => {
    const { print, requested } = runPrintScript({
      elements: [
        { backgrounds: { "": 'url("https://hollow.test/a/one")' } },
        {
          backgrounds: {
            "::before":
              'linear-gradient(red, blue), url("https://hollow.test/a/two")',
            "::after": 'url("https://hollow.test/a/one")',
          },
        },
      ],
      posters: ["https://hollow.test/a/poster"],
    });
    expect(requested.map((item) => item.src)).toEqual([
      "https://hollow.test/a/one",
      "https://hollow.test/a/two",
      "https://hollow.test/a/poster",
    ]);
    for (const [index, item] of requested.entries()) {
      await vi.advanceTimersByTimeAsync(0);
      expect(print).not.toHaveBeenCalled();
      item.settle(index === 1 ? "error" : "load");
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("waits for the fonts before printing", async () => {
    let fontsReady = () => {};
    const { print, button } = runPrintScript({
      fonts: new Promise<void>((done) => {
        fontsReady = done;
      }),
    });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(print).not.toHaveBeenCalled();
    expect(button.disabled).toBe(true);
    fontsReady();
    await vi.advanceTimersByTimeAsync(0);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("prints after 15 seconds when an image never answers", async () => {
    const { print } = runPrintScript({ images: [image(false)] });
    await vi.advanceTimersByTimeAsync(14_999);
    expect(print).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("prints again on each press of the button but not while it is still waiting", async () => {
    const slow = image(false);
    const { print, button } = runPrintScript({ images: [slow] });
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
    const { print } = runPrintScript({ withBar: false });
    await vi.advanceTimersByTimeAsync(0);
    expect(print).toHaveBeenCalledTimes(1);
  });
});
