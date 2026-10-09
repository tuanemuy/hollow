import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  appendFile,
  lstat,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const args = process.argv.slice(2);
if (
  args.length !== 2 ||
  args[0] !== "--root" ||
  !args[1] ||
  !isAbsolute(args[1])
)
  throw new Error(
    "Usage: editing-browser.e2e.ts --root <own fresh harness root>",
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
const userSchema = z.object({
  role: z.enum(["owner", "editor", "viewer"]),
  email: z.string(),
  password: z.literal("local-editing-password-123"),
});
const fixture = z
  .object({
    root: z.literal(root),
    origin: z.string(),
    editing: z.object({
      users: z.array(userSchema).length(3),
      workspaceId: z.uuid(),
      noteId: z.uuid(),
    }),
  })
  .parse(JSON.parse(await readFile(manifestPath, "utf8")));
const origin = new URL(fixture.origin);
assert(
  origin.protocol === "http:" &&
    origin.hostname === "127.0.0.1" &&
    Number(origin.port) >= 1024 &&
    Number(origin.port) <= 65535 &&
    origin.origin === fixture.origin,
  "Only the declared loopback harness origin is accepted",
);
for (const role of ["owner", "editor", "viewer"] as const) {
  const users = fixture.editing.users.filter((user) => user.role === role);
  assert.equal(users.length, 1);
  assert.equal(users[0]?.email, `${role}@editing.fixture.invalid`);
}
const nonce = randomUUID().slice(0, 8);
const sessions = {
  owner: `editing-e2e-${nonce}-owner`,
  editor: `editing-e2e-${nonce}-editor`,
};
type Actor = keyof typeof sessions;
const commandLog = join(root, `editing-e2e-${nonce}.jsonl`);
await writeFile(commandLog, "", { flag: "wx", mode: 0o600 });
const execute = promisify(execFile);
const browserEnvironment: Record<string, string> = {};
for (const name of [
  "PATH",
  "HOME",
  "TMPDIR",
  "DISPLAY",
  "XDG_RUNTIME_DIR",
  "AGENT_BROWSER_EXECUTABLE_PATH",
]) {
  const value = process.env[name];
  if (value !== undefined) browserEnvironment[name] = value;
}
const responseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
});
async function command(actor: Actor, ...arguments_: string[]) {
  const startedAt = new Date().toISOString();
  let stdout = "";
  let stderr = "";
  try {
    const output = await execute(
      "agent-browser",
      ["--session", sessions[actor], "--json", ...arguments_],
      {
        timeout: 45_000,
        maxBuffer: 4 * 1024 * 1024,
        // Cloudflare binding types also augment ProcessEnv; the browser uses none of those bindings.
        env: browserEnvironment as NodeJS.ProcessEnv,
      },
    );
    stdout = output.stdout;
    stderr = output.stderr;
    const response = responseSchema.parse(JSON.parse(stdout));
    assert(
      response.success,
      `agent-browser ${arguments_[0]} failed: ${stdout}`,
    );
    await appendFile(
      commandLog,
      `${JSON.stringify({ startedAt, actor, arguments: arguments_, stdout, stderr, success: true })}\n`,
    );
    return response.data;
  } catch (error) {
    await appendFile(
      commandLog,
      `${JSON.stringify({ startedAt, actor, arguments: arguments_, stdout, stderr, success: false, error: error instanceof Error ? error.message : String(error) })}\n`,
    );
    throw error;
  }
}
async function evaluate(actor: Actor, expression: string) {
  const data = await command(
    actor,
    "eval",
    "-b",
    Buffer.from(expression).toString("base64"),
  );
  return z.object({ result: z.unknown() }).parse(data).result;
}
const waitFor = (actor: Actor, expression: string) =>
  command(actor, "wait", "--fn", expression, "--timeout", "20000");
const textIncludes = (text: string) =>
  `document.body.innerText.includes(${JSON.stringify(text)})`;
const htmlSource = "[aria-label='HTML ソース'].cm-content";
const sourceEquals = (html: string) =>
  `document.querySelector(${JSON.stringify(htmlSource)})?.textContent === ${JSON.stringify(html)}`;
const htmlSelected =
  "Array.from(document.querySelectorAll('[aria-label=\"編集モード\"] button')).some(b => b.textContent.trim() === 'HTML' && b.getAttribute('aria-pressed') === 'true')";
async function button(actor: Actor, name: string) {
  if (name === "破棄") {
    await command(
      actor,
      "find",
      "role",
      "button",
      "click",
      "--name",
      name,
      "--exact",
    );
    return;
  }
  const matching = `Array.from(document.querySelectorAll('button')).find(value => value.textContent.trim() === ${JSON.stringify(name)})`;
  await waitFor(
    actor,
    `(() => { const button = ${matching}; return button && !button.disabled; })()`,
  );
  assert.equal(
    await evaluate(
      actor,
      `(() => { const button = ${matching}; if (!button || button.disabled) return false; window.setTimeout(() => button.click(), 0); return true; })()`,
    ),
    true,
  );
}
const editPath = `/notes/${fixture.editing.noteId}/edit?mode=html`;
const settingsPath = `/workspaces/${fixture.editing.workspaceId}/settings`;
const memberSelector = '[aria-label="editor@editing.fixture.invalid のロール"]';
const backupMatches = (html: string) =>
  `Object.keys(localStorage).some(key => key.startsWith('hollow:draft:') && key.endsWith(${JSON.stringify(`:${fixture.editing.noteId}`)}) && (() => { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value?.html === ${JSON.stringify(html)} && value.mode === 'html'; })())`;
async function open(actor: Actor, path: string) {
  await command(actor, "open", new URL(path, origin).href);
}
async function signIn(actor: Actor) {
  const user = fixture.editing.users.find((value) => value.role === actor);
  assert(user);
  await open(actor, "/signin");
  await command(actor, "fill", "#email", user.email);
  await command(actor, "fill", "#password", user.password);
  await button(actor, "サインイン");
  await waitFor(actor, "location.pathname === '/notes'");
}
async function openEditor(actor: Actor) {
  await open(actor, editPath);
  await waitFor(actor, htmlSelected);
  await waitFor(
    actor,
    `document.querySelector(${JSON.stringify(htmlSource)})?.getAttribute('contenteditable') === 'true'`,
  );
}
async function inputHtml(actor: Actor, html: string) {
  await waitFor(
    actor,
    `document.querySelector(${JSON.stringify(htmlSource)})?.getAttribute('contenteditable') === 'true'`,
  );
  await command(actor, "click", htmlSource);
  await command(
    actor,
    "press",
    process.platform === "darwin" ? "Meta+a" : "Control+a",
  );
  await command(actor, "keyboard", "inserttext", html);
  await waitFor(actor, sourceEquals(html));
  await waitFor(actor, backupMatches(html));
  await waitFor(
    actor,
    `document.querySelector('iframe[title="HTML プレビュー"]')?.contentDocument?.body.innerHTML === ${JSON.stringify(html)}`,
  );
}
async function saved(actor: Actor, html: string) {
  await waitFor(
    actor,
    "document.querySelector('.hollow-save-state')?.textContent.trim() === '保存済み'",
  );
  await waitFor(actor, sourceEquals(html));
  assert.equal(
    await evaluate(actor, backupMatches(html)),
    false,
    "Successful save clears this unsaved backup",
  );
}
async function failedAutosave(actor: Actor, html: string) {
  await waitFor(actor, textIncludes("未保存です。"));
  await waitFor(
    actor,
    "document.querySelector('.hollow-save-state')?.textContent.trim() === '未保存'",
  );
  await waitFor(actor, sourceEquals(html));
  await waitFor(actor, backupMatches(html));
}
async function record(check: string) {
  await appendFile(
    commandLog,
    `${JSON.stringify({ check, observedAt: new Date().toISOString(), success: true })}\n`,
  );
  console.log(`PASS ${check}`);
}
async function role(value: "editor" | "viewer") {
  await open("owner", settingsPath);
  await command("owner", "wait", memberSelector);
  await command("owner", "select", memberSelector, value);
  await waitFor(
    "owner",
    `document.querySelector(${JSON.stringify(memberSelector)})?.value === ${JSON.stringify(value)} && !document.querySelector(${JSON.stringify(memberSelector)})?.disabled`,
  );
  await command("owner", "reload");
  await waitFor(
    "owner",
    `document.querySelector(${JSON.stringify(memberSelector)})?.value === ${JSON.stringify(value)}`,
  );
}

let failure: unknown;
let roleChanged = false;
try {
  await signIn("owner");
  await signIn("editor");
  await openEditor("owner");
  const first = `<p>offline autosave ${nonce} 日本語😀</p>`;
  await inputHtml("owner", first);
  await command("owner", "set", "offline", "on");
  await failedAutosave("owner", first);
  await button("owner", "ビジュアル");
  await waitFor(
    "owner",
    textIncludes("未保存の内容を保存して切り替えますか？"),
  );
  await button("owner", "保存して切替");
  await failedAutosave("owner", first);
  await waitFor("owner", htmlSelected);
  await button("owner", "切替を取消");
  await record(
    "ED01/05/08 offline autosave preserves browser backup and failed dirty mode switch preserves HTML/input",
  );
  await command("owner", "set", "offline", "off");
  await saved("owner", first);
  await command("owner", "reload");
  await waitFor("owner", sourceEquals(first));
  await record(
    "ED01/08 online event retries and persisted HTML survives reload",
  );

  const recovered = `<p>reload recovery ${nonce} 日本語😀</p>`;
  await inputHtml("owner", recovered);
  await command("owner", "set", "offline", "on");
  await failedAutosave("owner", recovered);
  // Unmount before restoring connectivity so online retry cannot consume the recovery evidence.
  await command("owner", "open", "about:blank");
  await command("owner", "set", "offline", "off");
  await open("owner", editPath);
  await waitFor(
    "owner",
    textIncludes("このブラウザに未保存の内容があります。復元しますか？"),
  );
  await command("owner", "reload");
  await waitFor(
    "owner",
    textIncludes("このブラウザに未保存の内容があります。復元しますか？"),
  );
  await button("owner", "復元する");
  await waitFor("owner", sourceEquals(recovered));
  await saved("owner", recovered);
  await record(
    "ED08 real offline backup is proposed after remount/reload and restored through the UI",
  );

  const discarded = `<p>discarded input ${nonce}</p>`;
  await inputHtml("owner", discarded);
  await button("owner", "破棄");
  await command("owner", "dialog", "dismiss");
  await waitFor("owner", sourceEquals(discarded));
  await command("owner", "click", "a.hollow-brand");
  await command("owner", "dialog", "dismiss");
  await waitFor(
    "owner",
    `location.pathname === ${JSON.stringify(editPath.split("?")[0])}`,
  );
  await waitFor("owner", sourceEquals(discarded));
  await button("owner", "破棄");
  await command("owner", "dialog", "accept");
  await waitFor("owner", sourceEquals(recovered));
  await record(
    "ED08 discard/leave cancellation keeps input and confirmed discard restores the last saved body",
  );

  await button("owner", "ビジュアル");
  await waitFor(
    "owner",
    "document.querySelector('iframe[title=\"ビジュアル編集の本文\"]')?.contentDocument?.querySelector('p')",
  );
  await evaluate(
    "owner",
    "(() => { const summary = Array.from(document.querySelectorAll('summary')).find(value => value.textContent.startsWith('編集できる文字一覧')); summary.click(); summary.closest('details').querySelector('button').click(); return true; })()",
  );
  await waitFor(
    "owner",
    "document.querySelector('[aria-label=\"選択した表示テキスト\"]')?.hidden === false",
  );
  await command("owner", "focus", '[aria-label="選択した表示テキスト"]');
  await command(
    "owner",
    "press",
    process.platform === "darwin" ? "Meta+b" : "Control+b",
  );
  await waitFor(
    "owner",
    textIncludes("ビジュアル編集では書式を変更できません。"),
  );
  await command("owner", "press", "Escape");
  await button("owner", "HTML");
  await waitFor("owner", sourceEquals(recovered));
  await record(
    "ED02 visual formatting command is refused without changing canonical structure",
  );

  await openEditor("editor");
  const conflict = `<p>owner conflict ${nonce}</p>`;
  await inputHtml("owner", conflict);
  await command("owner", "set", "offline", "on");
  await failedAutosave("owner", conflict);
  const other = `<p>editor latest ${nonce}</p>`;
  await inputHtml("editor", other);
  await saved("editor", other);
  await command("owner", "set", "offline", "off");
  await waitFor("owner", textIncludes("確認して上書き保存"));
  await waitFor("owner", sourceEquals(conflict));
  await button("owner", "取消・入力を保持");
  await waitFor("owner", sourceEquals(conflict));
  await button("owner", "再試行");
  await waitFor("owner", textIncludes("確認して上書き保存"));
  await button("owner", "確認して上書き保存");
  await saved("owner", conflict);
  await record(
    "ED02/08 cross-actor conflict retains input on cancellation and permits confirmed overwrite",
  );

  await command("editor", "reload");
  await waitFor("editor", sourceEquals(conflict));
  const title = z
    .string()
    .parse(
      await evaluate("editor", "document.querySelector('#note-title')?.value"),
    );
  const revoked = `<p>rolelost unsaved ${nonce} 日本語😀</p>`;
  await inputHtml("editor", revoked);
  await command("editor", "set", "offline", "on");
  await failedAutosave("editor", revoked);
  roleChanged = true;
  await role("viewer");
  await command("editor", "set", "offline", "off");
  await waitFor("editor", textIncludes("未保存です。対象が見つかりません"));
  await waitFor("editor", textIncludes("ダウンロード"));
  await waitFor("editor", sourceEquals(revoked));
  const downloadPath = join(root, `editing-e2e-${nonce}-rolelost.json`);
  assert.equal(
    await evaluate(
      "editor",
      "(() => { const button = Array.from(document.querySelectorAll('button')).find(value => value.textContent.trim() === '退避 JSON を保存'); if (!button) return false; button.id = 'editing-e2e-backup-download'; return true; })()",
    ),
    true,
    "The public backup download button must exist",
  );
  await command(
    "editor",
    "download",
    "#editing-e2e-backup-download",
    downloadPath,
  );
  const downloaded: unknown = JSON.parse(await readFile(downloadPath, "utf8"));
  assert.deepEqual(downloaded, {
    format: "hollow-unsaved-note",
    title,
    html: revoked,
    mode: "html",
  });
  await openEditor("owner");
  await waitFor("owner", sourceEquals(conflict));
  await record(
    "ED08 viewer downgrade rejects save, retains local HTML and downloads exact JSON without changing stored content",
  );

  await command("owner", "tab", "new", new URL(editPath, origin).href);
  await waitFor("owner", htmlSelected);
  const tabChange = `<p>same actor second tab ${nonce}</p>`;
  await inputHtml("owner", tabChange);
  await saved("owner", tabChange);
  await command("owner", "tab", "t1");
  await waitFor(
    "owner",
    textIncludes("別の画面または自動処理でこのノートが更新されました"),
  );
  await waitFor("owner", sourceEquals(conflict));
  const latestTab = `<p>same actor last save ${nonce}</p>`;
  await inputHtml("owner", latestTab);
  await saved("owner", latestTab);
  await record(
    "ED01 same actor two tabs show update notification and later save wins without replacing the first tab buffer",
  );

  await button("owner", "ビジュアル");
  const visualSelected =
    "document.querySelector('.hollow-editor-tabs button:nth-child(3)')?.getAttribute('aria-pressed') === 'true'";
  await waitFor("owner", visualSelected);
  await open("owner", editPath.split("?")[0] ?? editPath);
  await waitFor("owner", visualSelected);
  await command("owner", "reload");
  await waitFor("owner", visualSelected);
  await open("owner", "/notes/new");
  const wysSelected =
    "document.querySelector('.hollow-editor-tabs button:first-child')?.getAttribute('aria-pressed') === 'true'";
  await waitFor("owner", wysSelected);
  await button("owner", "ビジュアル");
  await waitFor(
    "owner",
    textIncludes(
      "編集できる文字がないため、ビジュアル編集へ切り替えできません。",
    ),
  );
  await waitFor("owner", wysSelected);
  await open("editor", "/notes");
  await command("editor", "click", 'summary[aria-label="アカウントメニュー"]');
  await button("editor", "サインアウト");
  await open("editor", "/signin");
  await command("editor", "fill", "#email", "owner@editing.fixture.invalid");
  await command("editor", "fill", "#password", "local-editing-password-123");
  await button("editor", "サインイン");
  await waitFor("editor", "location.pathname === '/notes'");
  await open("editor", editPath.split("?")[0] ?? editPath);
  await waitFor("editor", htmlSelected);
  await record(
    "ED05 existing mode survives reload, fresh browser for the same user does not inherit it, new is always WYS and empty visual is refused",
  );
} catch (error) {
  failure = error;
  await command("owner", "eval", "document.body.innerText").catch(
    () => undefined,
  );
  await command("editor", "eval", "document.body.innerText").catch(
    () => undefined,
  );
} finally {
  const cleanupErrors: unknown[] = [];
  if (roleChanged) {
    try {
      await role("editor");
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  for (const actor of ["owner", "editor"] as const) {
    try {
      await command(actor, "close");
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length)
    failure = new AggregateError(
      failure === undefined ? cleanupErrors : [failure, ...cleanupErrors],
      "Editing e2e cleanup failed",
    );
}
if (failure !== undefined) throw failure;
console.log(`Editing e2e commands and assertions: ${commandLog}`);
