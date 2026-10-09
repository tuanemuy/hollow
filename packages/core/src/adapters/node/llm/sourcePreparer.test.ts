import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { LlmLegacyPreparedSource } from "@repo/core/application/llm/ports";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import { LLM_LIMITS, type LlmLegacyFormat } from "@repo/core/domain/llm/entity";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { NodeLlmSourcePreparer } from "./sourcePreparer";

vi.mock("node:worker_threads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:worker_threads")>();
  const workerConstructor = vi.fn(class extends actual.Worker {});
  Object.defineProperty(workerConstructor, "prototype", {
    value: actual.Worker.prototype,
  });
  return { ...actual, Worker: workerConstructor };
});

const workerUrl = new URL("./sourceWorker.mjs", import.meta.url);
const nativeTerminate = Worker.prototype.terminate;
const signal = () => new AbortController().signal;
const input = (text: string, format: LlmLegacyFormat = "text") => ({
  bytes: new TextEncoder().encode(text),
  source: {
    kind: "original" as const,
    originalId: "synthetic",
    sha256: createHash("sha256").update(text).digest("hex"),
    bytes: Buffer.byteLength(text),
    format,
  },
  preparationVersion: 1 as const,
  promptVersion: 1 as const,
});
const marker = (index = 1) =>
  `[[hollow-media:${index.toString(16).padStart(8, "0")}-0000-4000-8000-000000000001]]`;
function coverage(source: LlmLegacyPreparedSource) {
  let blocks = 0;
  for (const [ordinal, segment] of source.segments.entries()) {
    expect(segment.firstBlock).toBe(blocks);
    expect(segment.blockCount).toBeGreaterThan(0);
    expect(segment.identity.ordinal).toBe(ordinal);
    expect(
      segment.identity.sha256 ===
        createHash("sha256").update(segment.html).digest("hex"),
    ).toBe(true);
    expect(Buffer.byteLength(segment.html)).toBeLessThanOrEqual(
      LLM_LIMITS.segmentBytes,
    );
    blocks += segment.blockCount;
  }
  expect(blocks).toBe(source.blocks);
}

describe("LLM source structure", () => {
  const preparer = new NodeLlmSourcePreparer(workerUrl);

  it("preserves Japanese paragraphs, lines and literal markup as text", async () => {
    const result = await preparer.prepare(
      input("最初 😀\n次の行\n\n最後 <script> & 終わり"),
      signal(),
    );
    expect(result.segments.map((segment) => segment.html).join("")).toBe(
      "<p>最初 😀<br>次の行</p><p>最後 &lt;script&gt; &amp; 終わり</p>",
    );
    expect(result.blocks).toBe(2);
    coverage(result);
  });

  it.each([
    "html",
    "markdown",
  ] as const)("keeps heading/table/code order in %s", async (format) => {
    const text =
      format === "html"
        ? "<h1>見出し</h1><p>本文</p><table><tr><th>列</th></tr><tr><td>値</td></tr></table><pre><code>const x = 1;</code></pre><h2>末尾</h2>"
        : "# 見出し\n\n本文\n\n| 列 |\n| --- |\n| 値 |\n\n```js\nconst x = 1;\n```\n\n## 末尾";
    const result = await preparer.prepare(input(text, format), signal());
    const html = result.segments.map((segment) => segment.html).join("");
    expect(html.indexOf("見出し") < html.indexOf("本文")).toBe(true);
    expect(html.indexOf("本文") < html.indexOf("<table>")).toBe(true);
    expect(html.indexOf("</table>") < html.indexOf("<pre>")).toBe(true);
    expect(html.indexOf("</pre>") < html.indexOf("末尾")).toBe(true);
    expect(html.includes("<th>列</th>") && html.includes("<td>値</td>")).toBe(
      true,
    );
    coverage(result);
  });

  it("removes active content and every fetch/URL attribute, retaining image notice and alt", async () => {
    const text =
      '<head><style>@import "https://example.invalid/css";</style></head><body><script>bad()</script><p onclick="bad()">安全 <a href="javascript:bad()">リンク</a> 続き</p><img src="https://example.invalid/i" alt="図の説明"><iframe src="https://example.invalid/f">bad</iframe></body>';
    const result = await preparer.prepare(input(text, "html"), signal());
    const html = result.segments[0]?.html ?? "";
    expect(
      /script|onclick|href=|src=|style|https:|javascript:|bad\(/i.test(html),
    ).toBe(false);
    expect(html.includes("安全 <a>リンク</a> 続き")).toBe(true);
    expect(html.includes("図の説明")).toBe(true);
    expect(result.notices).toHaveLength(2);
  });

  it("preserves safe table spans and list numbering without copying unsafe attributes", async () => {
    const result = await preparer.prepare(
      input(
        '<ol start="3"><li value="5">項目</li></ol><table><tr><td colspan="2" rowspan="3" style="color:red" onclick="bad()">結合</td></tr></table>',
        "html",
      ),
      signal(),
    );
    const html = result.segments.map((segment) => segment.html).join("");
    expect(html.includes('<ol start="3"><li value="5">項目</li></ol>')).toBe(
      true,
    );
    expect(html.includes('<td colspan="2" rowspan="3">結合</td>')).toBe(true);
    expect(/style=|onclick=/.test(html)).toBe(false);
    coverage(result);
  });

  it("splits a large Japanese paragraph on code points without omission", async () => {
    const text = "あ😀<&".repeat(9000);
    const result = await preparer.prepare(input(text), signal());
    expect(result.segments.length).toBeGreaterThan(1);
    const html = result.segments.map((segment) => segment.html).join("");
    const restored = html
      .replace(/<\/?p>/g, "")
      .replaceAll("&lt;", "<")
      .replaceAll("&amp;", "&");
    expect(restored === text).toBe(true);
    expect(html.includes("�")).toBe(false);
    coverage(result);
  });

  it("accepts 16 full segments but rejects the next byte without truncation", async () => {
    const paragraph = "a".repeat(LLM_LIMITS.segmentBytes - 7);
    const result = await preparer.prepare(
      input(Array(16).fill(paragraph).join("\n\n")),
      signal(),
    );
    expect(result.segments).toHaveLength(16);
    coverage(result);
    await expect(
      preparer.prepare(
        input(`${Array(16).fill(paragraph).join("\n\n")}a`),
        signal(),
      ),
    ).rejects.toMatchObject({
      code: "LLM_RESOURCE_LIMIT",
      delivery: "not-sent",
      closed: true,
    });
  });

  it.each([
    "table",
    "pre",
    "code",
  ])("rejects an oversized indivisible %s", async (tag) => {
    const text =
      tag === "table"
        ? `<table><tr><td>${"あ".repeat(22000)}</td></tr></table>`
        : `<${tag}>${"あ".repeat(22000)}</${tag}>`;
    await expect(
      preparer.prepare(input(text, "html"), signal()),
    ).rejects.toMatchObject({ code: "LLM_RESOURCE_LIMIT", closed: true });
  });

  it("does not use the 800 KiB output cap as an original HTML input cap", async () => {
    const result = await preparer.prepare(
      input(`<!--${"a".repeat(801 * 1024)}--><p>全部の可視本文</p>`, "html"),
      signal(),
    );
    expect(result.segments[0]?.html).toBe("<p>全部の可視本文</p>");
  });

  it.each([
    "",
    " \n\t",
    "a\u0000b",
  ])("rejects empty/control source safely", async (text) => {
    await expect(preparer.prepare(input(text), signal())).rejects.toMatchObject(
      { code: "LLM_SOURCE_INVALID", delivery: "not-sent", closed: true },
    );
  });

  it("rejects malformed UTF-8 and source above 50 MiB", async () => {
    await expect(
      preparer.prepare(
        { ...input("invalid"), bytes: Uint8Array.of(0xc3, 0x28) },
        signal(),
      ),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_INVALID" });
    await expect(
      preparer.prepare(
        { ...input("oversize"), bytes: new Uint8Array(50 * 1024 * 1024 + 1) },
        signal(),
      ),
    ).rejects.toMatchObject({ code: "LLM_RESOURCE_LIMIT" });
  });
});

describe("LLM authorized media placeholders", () => {
  const preparer = new NodeLlmSourcePreparer(workerUrl);
  const media = [{ sourceUrl: "media/own.png", placeholder: marker() }];

  it.each([
    "html",
    "markdown",
  ] as const)("counts two exact matching %s occurrences without exposing URL", async (format) => {
    const text =
      format === "html"
        ? '<p>前<img src="media/own.png" alt="図">中<img src="media/own.png">後</p>'
        : "前 ![図](media/own.png) 中 ![図](media/own.png) 後";
    const result = await preparer.prepare(
      { ...input(text, format), media },
      signal(),
    );
    expect(result.media).toEqual([{ placeholder: marker(), occurrences: 2 }]);
    const html = result.segments.map((segment) => segment.html).join("");
    expect(html.split(marker())).toHaveLength(3);
    expect(html.includes("media/own.png") || html.includes("src=")).toBe(false);
    expect(
      result.notices.includes("画像・音声・動画の内容は解釈していません。"),
    ).toBe(true);
    coverage(result);
  });

  it("keeps media token indivisible at a segment boundary", async () => {
    const result = await preparer.prepare(
      {
        ...input(
          `<p>${"a".repeat(65_510)}<img src="media/own.png">末尾</p>`,
          "html",
        ),
        media,
      },
      signal(),
    );
    expect(result.segments.length).toBe(2);
    expect(
      result.segments.filter((segment) => segment.html.includes(marker())),
    ).toHaveLength(1);
    expect(result.media[0]?.occurrences).toBe(1);
    coverage(result);
  });

  it("finds an authorized source child but never normalizes nonmatching URLs", async () => {
    const result = await preparer.prepare(
      {
        ...input(
          '<video><source src="media/own.png"></video><img src="./media/own.png" alt="未対応">',
          "html",
        ),
        media,
      },
      signal(),
    );
    expect(result.media).toEqual([{ placeholder: marker(), occurrences: 1 }]);
    expect(result.segments[0]?.html.includes("未対応")).toBe(true);
  });

  it("omits unused mappings and does not substitute plain text URLs", async () => {
    const result = await preparer.prepare(
      {
        ...input('<p>本文</p><img src="other.png" alt="説明">', "html"),
        media,
      },
      signal(),
    );
    expect(result.media).toEqual([]);
    expect(result.segments[0]?.html.includes("説明")).toBe(true);
    expect(
      (await preparer.prepare({ ...input("media/own.png"), media }, signal()))
        .media,
    ).toEqual([]);
  });

  it("checks URL limits in UTF-8 bytes, not UTF-16 length", async () => {
    const sourceUrl = `${"あ".repeat(682)}ab`;
    expect(Buffer.byteLength(sourceUrl)).toBe(2048);
    const result = await preparer.prepare(
      {
        ...input(`<img src="${sourceUrl}">`, "html"),
        media: [{ sourceUrl, placeholder: marker() }],
      },
      signal(),
    );
    expect(result.media[0]?.occurrences).toBe(1);
    await expect(
      preparer.prepare(
        {
          ...input("本文", "html"),
          media: [{ sourceUrl: `${sourceUrl}a`, placeholder: marker() }],
        },
        signal(),
      ),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_INVALID", closed: true });
  });

  it("permits 200 mapped occurrences and rejects the 201st without truncation", async () => {
    const result = await preparer.prepare(
      { ...input('<img src="media/own.png">'.repeat(200), "html"), media },
      signal(),
    );
    expect(result.media[0]?.occurrences).toBe(200);
    await expect(
      preparer.prepare(
        { ...input('<img src="media/own.png">'.repeat(201), "html"), media },
        signal(),
      ),
    ).rejects.toMatchObject({ code: "LLM_RESOURCE_LIMIT", closed: true });
  });

  it("permits 200 distinct mappings and rejects 201", async () => {
    const mappings = Array.from({ length: 201 }, (_, index) => ({
      sourceUrl: `own-${index}.png`,
      placeholder: marker(index + 1),
    }));
    const result = await preparer.prepare(
      {
        ...input('<img src="own-0.png">', "html"),
        media: mappings.slice(0, 200),
      },
      signal(),
    );
    expect(result.media).toHaveLength(1);
    await expect(
      preparer.prepare({ ...input("本文", "html"), media: mappings }, signal()),
    ).rejects.toMatchObject({ code: "LLM_RESOURCE_LIMIT", closed: true });
  });

  it.each([
    "duplicate-src",
    "duplicate-placeholder",
    "unknown-shape",
    "uppercase",
  ] as const)("rejects %s map", async (kind) => {
    const mappings =
      kind === "duplicate-src"
        ? [
            ...media,
            { sourceUrl: media[0]?.sourceUrl ?? "", placeholder: marker(2) },
          ]
        : kind === "duplicate-placeholder"
          ? [...media, { sourceUrl: "another.png", placeholder: marker() }]
          : [
              {
                sourceUrl: "own.png",
                placeholder:
                  kind === "uppercase"
                    ? marker(10).toUpperCase()
                    : "[[hollow-media:not-a-uuid]]",
              },
            ];
    await expect(
      preparer.prepare({ ...input("本文", "html"), media: mappings }, signal()),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_INVALID", closed: true });
  });

  it.each([
    "text",
    "html",
    "markdown",
    "encoded",
    "alt",
    "head",
  ] as const)("rejects source-supplied reserved marker (%s)", async (kind) => {
    const encoded = marker().replaceAll("[", "&#91;");
    const text =
      kind === "encoded"
        ? `<p>${encoded}</p>`
        : kind === "alt"
          ? `<img alt="${encoded}">`
          : kind === "head"
            ? `<head><title>${encoded}</title></head><body>本文</body>`
            : marker();
    const format = kind === "text" || kind === "markdown" ? kind : "html";
    await expect(
      preparer.prepare({ ...input(text, format), media }, signal()),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_INVALID", closed: true });
  });
});

const fixture = `
import { parentPort, workerData } from 'node:worker_threads';
import { createHash } from 'node:crypto';
const command = new TextDecoder().decode(workerData.bytes);
const html = '<p>自己fixture</p>';
const value = {segments:[{identity:{kind:'prepared-segment',ordinal:0,sha256:createHash('sha256').update(html).digest('hex')},html,firstBlock:0,blockCount:1}],blocks:1,notices:[],media:[]};
if(command.startsWith('media-')) {
 const placeholder = '[[hollow-media:00000001-0000-4000-8000-000000000001]]';
 value.segments[0].html = '<p>'+placeholder+'</p>';
 value.segments[0].identity.sha256 = createHash('sha256').update(value.segments[0].html).digest('hex');
 value.media = command === 'media-missing' ? [] : [{placeholder,occurrences:command === 'media-count' ? 2 : 1}];
}
parentPort.on('message', () => parentPort.postMessage({ok:true,value}));
setInterval(() => {}, 1000);
if(command === 'crash') throw new Error('synthetic private text');
if(command === 'exit') process.exit(0);
if(command === 'oom') { const error = new Error('synthetic'); error.code='ERR_WORKER_OUT_OF_MEMORY'; throw error; }
if(command === 'invalid') value.segments[0].firstBlock = 1;
if(command === 'failure') parentPort.postMessage({ok:false,code:'synthetic private text'});
else if(command !== 'hang') parentPort.postMessage({ok:true,value});
`;

describe("LLM source worker ownership", () => {
  let root: string;
  let preparer: NodeLlmSourcePreparer;
  let terminate: MockInstance<Worker["terminate"]>;
  let workers: Map<Worker, { exited: boolean; exit: Promise<void> }>;
  let release: (() => void) | undefined;

  function track(worker: Worker) {
    if (workers.has(worker)) return;
    const state = { exited: false, exit: Promise.resolve() };
    state.exit = new Promise<void>((resolve) =>
      worker.once("exit", () => {
        state.exited = true;
        resolve();
      }),
    );
    workers.set(worker, state);
  }
  function gate() {
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    terminate.mockImplementation(function (this: Worker) {
      track(this);
      return pending.then(() => nativeTerminate.call(this));
    });
  }
  beforeEach(async () => {
    workers = new Map();
    release = undefined;
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-llm-source-test-"));
    const file = path.join(root, "worker.mjs");
    await writeFile(file, fixture);
    preparer = new NodeLlmSourcePreparer(file);
    terminate = vi
      .spyOn(Worker.prototype, "terminate")
      .mockImplementation(function (this: Worker) {
        track(this);
        return nativeTerminate.call(this);
      });
  });
  afterEach(async () => {
    vi.useRealTimers();
    release?.();
    for (const [worker, state] of workers) {
      if (!state.exited) await nativeTerminate.call(worker);
      await state.exit;
    }
    terminate.mockRestore();
    await rm(root, { recursive: true, force: true });
  });

  it("keeps success pending until real worker exit", async () => {
    gate();
    let settled = false;
    const pending = preparer.prepare(input("valid"), signal()).finally(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    expect([...workers.values()].every((worker) => !worker.exited)).toBe(true);
    release?.();
    coverage(await pending);
    expect([...workers.values()].every((worker) => worker.exited)).toBe(true);
  });

  it.each([
    "invalid",
    "failure",
    "crash",
    "exit",
  ])("returns safe %s failure after exit", async (command) => {
    await expect(
      preparer.prepare(input(command), signal()),
    ).rejects.toMatchObject({
      code: "LLM_SOURCE_INVALID",
      delivery: "not-sent",
      closed: true,
    });
  });

  it("classifies worker OOM without exposing its original error", async () => {
    await expect(
      preparer.prepare(input("oom"), signal()),
    ).rejects.toMatchObject({ code: "LLM_RESOURCE_LIMIT", closed: true });
  });

  it.each([
    "media-missing",
    "media-count",
    "media-unknown",
  ])("rejects %s worker metadata after real exit", async (command) => {
    await expect(
      preparer.prepare(
        {
          ...input(command, "html"),
          media:
            command === "media-unknown"
              ? []
              : [{ sourceUrl: "own.png", placeholder: marker() }],
        },
        signal(),
      ),
    ).rejects.toMatchObject({ code: "LLM_SOURCE_INVALID", closed: true });
    expect([...workers.values()].every((worker) => worker.exited)).toBe(true);
  });

  it("preabort does not start a worker", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      preparer.prepare(input("valid"), controller.signal),
    ).rejects.toMatchObject({ code: "LLM_UNAVAILABLE", closed: true });
    expect(terminate).not.toHaveBeenCalled();
  });

  it("abort while termination is gated never returns a late success", async () => {
    gate();
    const controller = new AbortController();
    let settled = false;
    const observed = preparer
      .prepare(input("valid"), controller.signal)
      .catch((error: unknown) => {
        settled = true;
        return error;
      });
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledOnce());
    controller.abort();
    expect(settled).toBe(false);
    release?.();
    expect(await observed).toMatchObject({
      code: "LLM_UNAVAILABLE",
      closed: true,
    });
  });

  it("deadline waits for exit and ignores a late message", async () => {
    gate();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const observed = preparer
      .prepare(input("hang"), signal())
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    vi.useRealTimers();
    const worker = [...workers.keys()][0];
    if (!worker) throw new Error("Missing own worker");
    const late = new Promise<void>((resolve) =>
      worker.once("message", () => resolve()),
    );
    worker.postMessage("late");
    await late;
    release?.();
    expect(await observed).toMatchObject({ code: "LLM_TIMEOUT", closed: true });
  });

  it.each([
    "reject",
    "resolve",
    "throw",
  ] as const)("marks %s without exit unknown, never closed", async (mode) => {
    terminate.mockImplementation(function (this: Worker) {
      track(this);
      if (mode === "throw") throw new Error("synthetic");
      return mode === "reject"
        ? Promise.reject(new Error("synthetic"))
        : Promise.resolve(0);
    });
    const error: unknown = await preparer
      .prepare(input("valid"), signal())
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(LlmOperationError);
    expect(error).toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      delivery: "not-sent",
      closed: false,
    });
    expect([...workers.values()].every((worker) => !worker.exited)).toBe(true);
  });

  it("accepts actual exit despite a later terminate rejection", async () => {
    terminate.mockImplementation(function (this: Worker) {
      track(this);
      return nativeTerminate.call(this).then(() => {
        throw new Error("synthetic");
      });
    });
    coverage(await preparer.prepare(input("valid"), signal()));
    expect([...workers.values()].every((worker) => worker.exited)).toBe(true);
  });
});

describe("LLM text input closure", () => {
  class Output extends EventEmitter {
    resume = vi.fn();
  }
  class ControlledWorker extends EventEmitter {
    stdout = new Output();
    stderr = new Output();
    completeTermination: ((code: number) => void) | undefined;
    terminate = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          this.completeTermination = resolve;
        }),
    );
  }
  const successfulMessage = () => {
    const html = "<p>自己fixture</p>";
    return {
      ok: true,
      value: {
        segments: [
          {
            identity: {
              kind: "prepared-segment",
              ordinal: 0,
              sha256: createHash("sha256").update(html).digest("hex"),
            },
            html,
            firstBlock: 0,
            blockCount: 1,
          },
        ],
        blocks: 1,
        media: [],
        notices: [],
      },
    };
  };
  function start() {
    const worker = new ControlledWorker();
    function createWorker() {
      return worker as unknown as Worker;
    }
    vi.mocked(Worker).mockImplementationOnce(createWorker);
    const controller = new AbortController();
    const success = vi.fn();
    const failure = vi.fn();
    const pending = new NodeLlmSourcePreparer(workerUrl)
      .prepare(input("自己fixture"), controller.signal)
      .then(success, failure);
    return { worker, controller, success, failure, pending };
  }
  function end(worker: ControlledWorker, event: "exit" | "stdout" | "stderr") {
    if (event === "exit") worker.emit("exit", 0);
    else worker[event].emit("end");
  }
  function detached(worker: ControlledWorker) {
    expect(worker.listenerCount("message")).toBe(0);
    expect(worker.listenerCount("exit")).toBe(0);
    expect(worker.stdout.listenerCount("end")).toBe(0);
    expect(worker.stderr.listenerCount("end")).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  }
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([
    ["exit", "stdout", "stderr"],
    ["exit", "stderr", "stdout"],
    ["stdout", "exit", "stderr"],
    ["stdout", "stderr", "exit"],
    ["stderr", "exit", "stdout"],
    ["stderr", "stdout", "exit"],
  ] as const)("requires every closure event in order %s/%s/%s", async (...order) => {
    const { worker, success, failure, pending } = start();
    worker.emit("message", successfulMessage());
    await vi.advanceTimersByTimeAsync(0);
    expect(success).not.toHaveBeenCalled();
    expect(failure).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.stdout.resume).toHaveBeenCalledOnce();
    expect(worker.stderr.resume).toHaveBeenCalledOnce();
    for (const event of order.slice(0, 2)) {
      end(worker, event);
      if (event === "exit") worker.completeTermination?.(0);
      await vi.advanceTimersByTimeAsync(0);
      expect(success).not.toHaveBeenCalled();
      expect(failure).not.toHaveBeenCalled();
    }
    end(worker, order[2]);
    worker.completeTermination?.(0);
    await pending;
    expect(success).toHaveBeenCalledOnce();
    expect(failure).not.toHaveBeenCalled();
    detached(worker);
  });

  it("does not treat the terminate promise or ended pipes as worker exit", async () => {
    const { worker, success, failure, pending } = start();
    worker.emit("message", successfulMessage());
    end(worker, "stdout");
    end(worker, "stderr");
    worker.completeTermination?.(0);
    await pending;
    expect(success).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ code: "LLM_OWNERSHIP_UNKNOWN", closed: false }),
    );
    detached(worker);
  });

  it("keeps abort a failure while waiting for the final pipe", async () => {
    const { worker, controller, success, failure, pending } = start();
    worker.emit("message", successfulMessage());
    end(worker, "exit");
    worker.completeTermination?.(0);
    end(worker, "stdout");
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(failure).not.toHaveBeenCalled();
    end(worker, "stderr");
    await pending;
    expect(success).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ code: "LLM_UNAVAILABLE", closed: true }),
    );
    detached(worker);
  });

  it("keeps timeout a failure despite a late valid message", async () => {
    const { worker, success, failure, pending } = start();
    await vi.advanceTimersByTimeAsync(LLM_LIMITS.prepareMs);
    expect(worker.terminate).toHaveBeenCalledOnce();
    worker.emit("message", successfulMessage());
    end(worker, "exit");
    worker.completeTermination?.(0);
    end(worker, "stdout");
    await vi.advanceTimersByTimeAsync(0);
    expect(failure).not.toHaveBeenCalled();
    end(worker, "stderr");
    await pending;
    expect(success).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ code: "LLM_TIMEOUT", closed: true }),
    );
    detached(worker);
  });

  it("bounds an unproven final pipe and rejects its late success", async () => {
    const { worker, success, failure, pending } = start();
    worker.emit("message", successfulMessage());
    end(worker, "exit");
    worker.completeTermination?.(0);
    end(worker, "stdout");
    await vi.advanceTimersByTimeAsync(5000);
    await pending;
    expect(success).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ code: "LLM_OWNERSHIP_UNKNOWN", closed: false }),
    );
    end(worker, "stderr");
    expect(success).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledOnce();
    detached(worker);
  });

  it("waits for pipes after natural exit without accepting a missing result", async () => {
    const { worker, success, failure, pending } = start();
    end(worker, "exit");
    end(worker, "stdout");
    await vi.advanceTimersByTimeAsync(0);
    expect(failure).not.toHaveBeenCalled();
    end(worker, "stderr");
    await pending;
    expect(success).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ code: "LLM_SOURCE_INVALID", closed: true }),
    );
    expect(worker.terminate).not.toHaveBeenCalled();
    detached(worker);
  });
});
