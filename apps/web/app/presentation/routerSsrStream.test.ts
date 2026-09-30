import { createRequire } from "node:module";
import {
  ReadableStream,
  type ReadableStreamDefaultController,
  type ReadableStreamDefaultReader,
} from "node:stream/web";
import { setImmediate as nextTurn } from "node:timers/promises";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import {
  attachRouterServerSsrUtils,
  transformStreamWithRouter,
} from "@tanstack/react-router/ssr/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const esm = {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  attachRouterServerSsrUtils,
  transformStreamWithRouter,
};
const cjs: typeof esm = {
  ...require("@tanstack/react-router"),
  ...require("@tanstack/react-router/ssr/server"),
};
const value = "FINITE_SETTLEMENT_VALUE";
const secondValue = "FINITE_SECOND_VALUE";
const nonce = "finite-test-nonce";
const encoder = new TextEncoder();
let totalBytes = 0;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

type Scenario = {
  order?: "A" | "B" | "C";
  injected?: boolean;
  split?: "tail" | "tag" | "html" | "barrier" | "after-barrier";
  nonce?: boolean;
  settlement?: "render-listener" | "after-eof" | "multiple";
  failure?:
    | "app"
    | "rejection"
    | "serializer"
    | "cancel"
    | "serialization-timeout"
    | "lifetime";
};

function chunks(html: string, split: Scenario["split"]) {
  const bytes = encoder.encode(html);
  const cuts = new Set<number>();
  if (split === "tail")
    cuts.add(Buffer.byteLength(html.slice(0, html.indexOf("</html>"))));
  if (split === "tag") {
    cuts.add(Buffer.byteLength(html.slice(0, html.indexOf("</body>") + 4)));
    cuts.add(Buffer.byteLength(html.slice(0, html.indexOf("日本語"))) + 1);
  }
  if (split === "barrier")
    cuts.add(Buffer.byteLength(html.slice(0, html.indexOf('id="') + 8)));
  if (split === "after-barrier")
    cuts.add(Buffer.byteLength(html.slice(0, html.indexOf("</script>") + 9)));
  const points = [0, ...[...cuts].sort((a, b) => a - b), bytes.length];
  return points.slice(1).map((end, index) => bytes.slice(points[index], end));
}

async function scenario(
  config: Scenario,
  api = esm,
  inputKind: "normal" | "empty" | "no-barrier" = "normal",
) {
  const pending = deferred<string>();
  const second = deferred<string>();
  const serialized = deferred<void>();
  const rendered = deferred<void>();
  const history = api.createMemoryHistory({ initialEntries: ["/"] });
  const notes =
    config.failure === "serializer"
      ? () => undefined
      : config.order === "A"
        ? value
        : config.settlement === "multiple"
          ? [pending.promise, second.promise]
          : pending.promise;
  const route = api.createRootRoute({ loader: () => ({ notes }) });
  const router = api.createRouter({
    routeTree: route,
    history,
    isServer: true,
    defaultGcTime: 0,
    ssr: { nonce },
  });
  api.attachRouterServerSsrUtils({ router, manifest: undefined });
  const ssr = router.serverSsr;
  if (!ssr) throw new Error("MISSING_SSR");
  const cleanup = vi.spyOn(ssr, "cleanup");
  const setTimer = vi.spyOn(globalThis, "setTimeout");
  const clearTimer = vi.spyOn(globalThis, "clearTimeout");
  let serializationEvents = 0;
  let injectionEvents = 0;
  let sourceEnded = false;
  const stopSerialized = router.subscribe("onSerializationFinished", () => {
    serializationEvents++;
    serialized.resolve();
  });
  const stopInjected = router.subscribe("onInjectedHtml", () => {
    injectionEvents++;
  });
  ssr.onRenderFinished(() => {
    rendered.resolve();
    if (config.settlement === "render-listener") pending.resolve(value);
  });
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let source: ReadableStream<Uint8Array> | undefined;
  let control: ReadableStreamDefaultController<Uint8Array> | undefined;
  const output: Uint8Array[] = [];
  let outputBytes = 0;
  let outputEnded = false;
  let outputErrored = false;
  let cancelled = false;
  let initial = "";
  try {
    await router.load();
    await ssr.dehydrate();
    const scripts = ssr.takeBufferedScripts();
    if (!scripts) throw new Error("MISSING_BOOTSTRAP");
    expect(typeof scripts.children === "string").toBe(true);
    initial = String(scripts.children);
    const id = scripts.attrs?.id;
    expect(typeof id === "string").toBe(true);
    expect(scripts.attrs?.nonce === nonce).toBe(true);
    if (config.order === "B") {
      pending.resolve(value);
      await serialized.promise;
    }
    if (config.injected) ssr.injectHtml("<span>FINITE_INITIAL_HTML</span>");
    let html = `<html><body><p>日本語</p><script nonce="${nonce}" id="${id}">${initial}</script></body></html>`;
    if (config.split === "html")
      html = html.replace("<body>", "").replace("</body>", "");
    if (inputKind === "empty") html = "";
    if (inputKind === "no-barrier") html = html.replace(` id="${id}"`, "");
    const inputBytes = Buffer.byteLength(html);
    expect(inputBytes <= 65_536).toBe(true);
    const held = ["app", "cancel", "lifetime"].includes(config.failure ?? "");
    source = new ReadableStream<Uint8Array>({
      start(controller) {
        control = controller;
        for (const part of chunks(html, config.split)) controller.enqueue(part);
        if (!held) {
          sourceEnded = true;
          controller.close();
        }
      },
    });
    reader = api
      .transformStreamWithRouter(router, source, {
        timeoutMs: 30,
        lifetimeMs: config.failure === "lifetime" ? 30 : 1_000,
      })
      .getReader();
    const closed = reader.closed.then(
      () => {
        outputEnded = true;
      },
      () => {
        outputErrored = true;
      },
    );
    const collection = (async () => {
      try {
        while (true) {
          const part = await reader?.read();
          if (!part || part.done) break;
          outputBytes += part.value.byteLength;
          expect(outputBytes <= 65_536).toBe(true);
          output.push(part.value);
        }
      } catch {
        outputErrored = true;
      }
    })();
    if (config.failure === "app") {
      sourceEnded = true;
      control?.error(new Error("SYNTHETIC_APP_ERROR"));
    } else if (config.failure === "cancel") {
      cancelled = true;
      await reader.cancel();
    } else if (config.failure === "rejection")
      pending.reject(new Error("SYNTHETIC_REJECTION"));
    else if (
      !["serializer", "serialization-timeout", "lifetime"].includes(
        config.failure ?? "",
      ) &&
      config.order !== "A" &&
      config.order !== "B"
    ) {
      if (config.settlement === "after-eof") await rendered.promise;
      if (config.settlement !== "render-listener") pending.resolve(value);
      if (config.settlement === "multiple") {
        await nextTurn();
        second.resolve(secondValue);
      }
    }
    await collection;
    await closed;
    reader.releaseLock();
    reader = undefined;
    if (!sourceEnded) {
      control?.close();
      sourceEnded = true;
    }
    pending.resolve(value);
    second.resolve(secondValue);
    for (let turn = 0; source.locked && turn < 5; turn++) await nextTurn();
    const injectedAtClose = injectionEvents;
    await nextTurn();
    expect(injectionEvents === injectedAtClose).toBe(true);
    expect(source.locked).toBe(false);
    expect(sourceEnded).toBe(true);
    expect(router.serverSsr === undefined).toBe(true);
    expect(cleanup).toHaveBeenCalledTimes(1);
    const timers = setTimer.mock.calls.flatMap((call, index) =>
      call[1] === 30 || call[1] === 1_000
        ? [setTimer.mock.results[index]?.value]
        : [],
    );
    expect(timers.length > 0).toBe(true);
    expect(
      timers.every((timer) =>
        clearTimer.mock.calls.some((call) => call[0] === timer),
      ),
    ).toBe(true);
    totalBytes += inputBytes + outputBytes;
    expect(totalBytes <= 2 * 1024 * 1024).toBe(true);
    return {
      text: Buffer.concat(output).toString("utf8"),
      outputEnded,
      outputErrored,
      cancelled,
      serializationEvents,
      injectionEvents,
      initial,
      inputKind,
    };
  } finally {
    pending.resolve(value);
    second.resolve(secondValue);
    if (reader) {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    if (!sourceEnded) {
      control?.close();
      sourceEnded = true;
    }
    router.serverSsr?.cleanup();
    stopSerialized();
    stopInjected();
    history.destroy();
  }
}

function successful(
  row: Awaited<ReturnType<typeof scenario>>,
  multiple = false,
) {
  const { text } = row;
  expect(row.outputEnded && !row.outputErrored && !row.cancelled).toBe(true);
  expect(row.serializationEvents).toBe(1);
  expect(text.split(value).length - 1).toBe(1);
  expect(text.split("$_TSR.e()").length - 1).toBe(1);
  expect(text.split("$_TSR=").length - 1).toBe(1);
  expect(text.indexOf("$_TSR=") < text.indexOf(value)).toBe(true);
  expect(text.indexOf(value) < text.indexOf("$_TSR.e()")).toBe(true);
  const tail = text.includes("</body>")
    ? text.indexOf("</body>")
    : text.indexOf("</html>");
  expect(tail >= 0).toBe(true);
  expect(text.indexOf("$_TSR.e()") < tail).toBe(true);
  expect(text.includes("日本語")).toBe(true);
  if (multiple) {
    expect(text.split(secondValue).length - 1).toBe(1);
    expect(text.indexOf(secondValue) < text.indexOf("$_TSR.e()")).toBe(true);
  }
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("bounded actual Router SSR stream", () => {
  const normal: Array<[string, Scenario]> = [
    ["S01 synchronous", { order: "A" }],
    ["S02 settlement before transform", { order: "B" }],
    ["S03 settlement after transform", { order: "C" }],
    ["S04 buffered HTML and finished queue", { order: "B", injected: true }],
    ["S05 buffered HTML and pending queue", { order: "C", injected: true }],
    ["S06 closing tags in separate chunks", { order: "B", split: "tail" }],
    ["S07 split closing tag and UTF8", { order: "B", split: "tag" }],
    ["S08 html-only closing tail", { order: "B", split: "html" }],
    ["S09 split barrier", { order: "B", split: "barrier" }],
    [
      "S10 chunk boundary after bootstrap",
      { order: "B", split: "after-barrier" },
    ],
    ["S11 nonce", { order: "B", nonce: true }],
    [
      "S12 render listener settlement",
      { order: "C", settlement: "render-listener" },
    ],
    ["S13 settlement after EOF", { order: "C", settlement: "after-eof" }],
    ["S14 multiple settlements", { order: "C", settlement: "multiple" }],
  ];
  for (const [name, config] of normal)
    it(name, async () => {
      const row = await scenario(config);
      successful(row, config.settlement === "multiple");
      if (config.injected)
        expect(row.text.split("FINITE_INITIAL_HTML").length - 1).toBe(1);
      if (config.nonce) {
        const scripts = [...row.text.matchAll(/<script([^>]*)>/g)];
        expect(scripts.length >= 2).toBe(true);
        expect(scripts.every((match) => match[1]?.includes(nonce))).toBe(true);
      }
      if (config.split === "barrier")
        successful(await scenario({ order: "B" }, esm, "no-barrier"));
      if (config.split === "after-barrier") {
        const empty = await scenario({ order: "B" }, esm, "empty");
        expect(empty.outputEnded && !empty.outputErrored).toBe(true);
        expect(empty.text.includes("$_TSR=")).toBe(false);
      }
    }, 2_000);
  it("S15 app source error", async () => {
    const row = await scenario({ failure: "app" });
    expect(row.outputErrored && !row.outputEnded).toBe(true);
    expect(row.text.includes(value)).toBe(false);
  }, 2_000);
  it("S16 ordinary Promise rejection is serialized", async () => {
    const row = await scenario({ failure: "rejection" });
    expect(row.outputEnded && !row.outputErrored).toBe(true);
    expect(row.text.includes("SYNTHETIC_REJECTION")).toBe(true);
    expect(row.text.includes(value)).toBe(false);
    expect(row.text.split("$_TSR.e()").length - 1).toBe(1);
  }, 2_000);
  it("S17 serializer error does not invent successful end marker", async () => {
    const row = await scenario({ failure: "serializer" });
    expect(row.outputEnded && !row.outputErrored).toBe(true);
    expect(row.serializationEvents).toBe(1);
    expect(row.text.includes("$_TSR.e()")).toBe(false);
    expect(row.text.includes(value)).toBe(false);
    expect(vi.mocked(console.error).mock.calls.length > 0).toBe(true);
  }, 2_000);
  it("S18 consumer cancel rejects late settlement output", async () => {
    const row = await scenario({ failure: "cancel" });
    expect(row.cancelled && !row.outputErrored).toBe(true);
    expect(row.text.includes(value)).toBe(false);
  }, 2_000);
  it("S19 serialization deadline errors instead of successful close", async () => {
    const row = await scenario({ failure: "serialization-timeout" });
    expect(row.outputErrored && !row.outputEnded).toBe(true);
    expect(row.text.includes("$_TSR.e()")).toBe(false);
  }, 2_000);
  it("S20 lifetime deadline errors and releases owned source", async () => {
    const row = await scenario({ failure: "lifetime" });
    expect(row.outputErrored && !row.outputEnded).toBe(true);
    expect(row.text.includes("$_TSR.e()")).toBe(false);
  }, 2_000);
  for (const [index, order] of (["A", "B", "C"] as const).entries())
    it(`S${21 + index} CJS ${order}`, async () => {
      successful(await scenario({ order }, cjs));
    }, 2_000);
});
