import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { READING_PRINT_NOTICE } from "../app/presentation/notePrintText";

const args = process.argv.slice(2);
if (
  args.length !== 2 ||
  args[0] !== "--root" ||
  !args[1] ||
  !isAbsolute(args[1])
)
  throw new Error(
    "Usage: print-browser.e2e.ts --root <own fresh harness root>",
  );
const root = resolve(args[1]);
assert.equal(await realpath(root), root, "Fixture root must not use symlinks");
const rootStat = await lstat(root);
assert(rootStat.isDirectory() && rootStat.uid === process.getuid?.());
const manifestPath = join(root, "fixture.json");
const manifestStat = await lstat(manifestPath);
assert(
  manifestStat.isFile() &&
    !manifestStat.isSymbolicLink() &&
    manifestStat.uid === rootStat.uid &&
    manifestStat.size <= 64 * 1024,
  "Only an owned synthetic fixture manifest is accepted",
);
const fixture = z
  .object({
    root: z.literal(root),
    origin: z.string(),
    sharing: z.object({
      notes: z.object({
        ownerPublic: z.object({
          id: z.uuid(),
          publicUrl: z.string(),
          link: z.string(),
        }),
      }),
    }),
  })
  .parse(JSON.parse(await readFile(manifestPath, "utf8")));
const origin = new URL(fixture.origin);
assert(
  origin.protocol === "http:" &&
    origin.hostname === "127.0.0.1" &&
    origin.origin === fixture.origin,
  "Only the declared loopback harness origin is accepted",
);
const note = fixture.sharing.notes.ownerPublic;
for (const url of [note.publicUrl, note.link])
  assert.equal(new URL(url).origin, origin.origin);

const session = `print-e2e-${randomUUID().slice(0, 8)}`;
const execute = promisify(execFile);
const responseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
});
async function command(...arguments_: string[]) {
  const { stdout } = await execute(
    "agent-browser",
    ["--session", session, "--json", ...arguments_],
    { timeout: 45_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const response = responseSchema.parse(JSON.parse(stdout));
  assert(response.success, `agent-browser ${arguments_[0]} failed: ${stdout}`);
  return response.data;
}

/** A DevTools session on the page agent-browser drives, to switch to print media. */
async function devtools(pageOrigin: string) {
  const { cdpUrl } = z
    .object({ cdpUrl: z.string() })
    .parse(await command("get", "cdp-url"));
  const socket = new WebSocket(cdpUrl);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", fail, { once: true });
  });
  const pending = new Map<number, (message: unknown) => void>();
  socket.addEventListener("message", (event) => {
    const message = z
      .object({ id: z.number().optional() })
      .passthrough()
      .parse(JSON.parse(String(event.data)));
    if (message.id !== undefined) pending.get(message.id)?.(message);
  });
  let next = 0;
  const send = (method: string, params: object, sessionId?: string) =>
    new Promise<unknown>((done) => {
      const id = ++next;
      pending.set(id, done);
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const { targetInfos } = z
    .object({
      result: z.object({
        targetInfos: z.array(
          z.object({ targetId: z.string(), type: z.string(), url: z.string() }),
        ),
      }),
    })
    .parse(await send("Target.getTargets", {})).result;
  const page = targetInfos.find(
    (target) => target.type === "page" && target.url.startsWith(pageOrigin),
  );
  assert(page, "The driven page must be open on the harness origin");
  const { sessionId } = z
    .object({ result: z.object({ sessionId: z.string() }) })
    .parse(
      await send("Target.attachToTarget", {
        targetId: page.targetId,
        flatten: true,
      }),
    ).result;
  async function evaluate(media: "screen" | "print", expression: string) {
    await send("Emulation.setEmulatedMedia", { media }, sessionId);
    return z
      .object({
        result: z.object({ result: z.object({ value: z.unknown() }) }),
      })
      .parse(
        await send(
          "Runtime.evaluate",
          { expression, returnByValue: true },
          sessionId,
        ),
      ).result.result.value;
  }
  return {
    evaluate,
    /** Visible text, and visible embedded content (a frame, an image) by its tag. */
    visibleContent: async (media: "screen" | "print") =>
      z
        .array(z.string())
        .parse(
          await evaluate(
            media,
            `[...document.body.querySelectorAll("*")].filter((element) => element.checkVisibility()).map((element) => element.matches("iframe, img, video, canvas, svg, object, embed") ? "<" + element.localName + ">" : [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent.trim()).join("")).filter((content) => content !== "")`,
          ),
        ),
    close: () => socket.close(),
  };
}
async function visit(path: string) {
  await command("open", new URL(path, origin).href);
  await command("wait", "--load", "networkidle");
}

let failure: unknown;
try {
  await visit("/signin");
  await command("fill", "#email", "owner@editing.fixture.invalid");
  await command("fill", "#password", "local-editing-password-123");
  await command("press", "Enter");
  await command(
    "wait",
    "--fn",
    "location.pathname === '/notes'",
    "--timeout",
    "20000",
  );
  const page = await devtools(origin.origin);
  try {
    for (const path of [`/notes/${note.id}`, note.publicUrl, note.link]) {
      await visit(path);
      if (path.startsWith("/notes/"))
        await command(
          "wait",
          "--fn",
          "document.querySelector('.hollow-print-notice') !== null",
          "--timeout",
          "20000",
        );
      const screen = await page.visibleContent("screen");
      assert(
        !screen.includes(READING_PRINT_NOTICE),
        `${path} shows the print notice on screen`,
      );
      assert(
        screen.includes("<iframe>"),
        `${path} shows its body frame on screen`,
      );
      assert.deepEqual(
        await page.visibleContent("print"),
        [READING_PRINT_NOTICE],
        `${path} prints only the pointer to the print view`,
      );
    }
    await visit(`/notes/${note.id}/print`);
    const toolbar = `document.querySelector("hollow-print-bar").checkVisibility()`;
    assert.equal(await page.evaluate("screen", toolbar), true);
    assert.equal(
      await page.evaluate("print", toolbar),
      false,
      "The print view leaves its toolbar off the paper",
    );
    const body = await page.visibleContent("screen");
    assert(body.length > 0, "The print view shows the note body");
    assert.deepEqual(
      await page.visibleContent("print"),
      body,
      "The print view prints the whole body it shows",
    );
  } finally {
    page.close();
  }
} catch (error) {
  failure = error;
} finally {
  await command("close").catch(() => undefined);
}
if (failure !== undefined) throw failure;
console.log("Print e2e passed");
