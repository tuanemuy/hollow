import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, request } from "node:http";
import { join } from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import type { Database } from "@repo/core/adapters/libsql/client";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { LocalInvitationMailer } from "@repo/core/adapters/node/invitationMailer";
import { NodeTokenProtector } from "@repo/core/adapters/node/tokenProtector";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import { saveNote } from "@repo/core/application/note/saveNote";
import type { Mail } from "@repo/core/application/ports/mailer";
import type { SafeReferenceFetcher } from "@repo/core/application/ports/referenceProcessor";
import {
  beginInvitation,
  copyInvitation,
  issueInvitations,
  joinInvitation,
} from "@repo/core/application/workspace/invitations";
import { createWorkspace } from "@repo/core/application/workspace/usecases";

const resourceTypes = new Map([
  ["/style.css", "text/css"],
  ["/image.png", "image/png"],
  ["/video.mp4", "video/mp4"],
  ["/missing.png", "image/png"],
]);

export class LocalEditingReferenceFetcher implements SafeReferenceFetcher {
  constructor(
    private readonly origin: string,
    private readonly deadlineMs = 5000,
  ) {}
  private admitted(value: string) {
    try {
      const url = new URL(value);
      return (
        url.origin === this.origin &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        resourceTypes.has(url.pathname)
      );
    } catch {
      return false;
    }
  }
  async inspect(url: string, options?: { signal?: AbortSignal }) {
    options?.signal?.throwIfAborted();
    const allowed = this.admitted(url);
    return { url, allowed, reason: allowed ? null : "REFERENCE_UNSAFE_URL" };
  }
  async inspectMany(
    urls: readonly string[],
    options?: { signal?: AbortSignal },
  ) {
    return Promise.all(urls.map((url) => this.inspect(url, options)));
  }
  async fetch(
    url: string,
    options: { maxBytes: number; signal?: AbortSignal },
  ) {
    if (
      !this.admitted(url) ||
      !Number.isSafeInteger(options.maxBytes) ||
      options.maxBytes < 1
    )
      throw new Error("Local reference fixture rejected the resource");
    options.signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(
      () => controller.abort(new Error("Local reference deadline")),
      this.deadlineMs,
    );
    const cleanup = () => {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    };
    try {
      const response = await new Promise<import("node:http").IncomingMessage>(
        (resolve, reject) => {
          const req = request(
            url,
            { agent: false, signal: controller.signal },
            resolve,
          );
          req.once("error", reject);
          req.end();
        },
      );
      response.once("close", cleanup);
      if (response.statusCode !== 200) {
        response.destroy();
        throw new Error(`Local reference fixture HTTP ${response.statusCode}`);
      }
      const reader = (
        Readable.toWeb(response) as ReadableStream<Uint8Array>
      ).getReader();
      let bytes = 0;
      return {
        finalUrl: url,
        contentType: String(
          response.headers["content-type"] ?? "application/octet-stream",
        ),
        body: new ReadableStream<Uint8Array>({
          async pull(stream) {
            try {
              const chunk = await reader.read();
              if (chunk.done) {
                cleanup();
                stream.close();
                return;
              }
              bytes += chunk.value.byteLength;
              if (bytes > options.maxBytes)
                throw new Error("Local reference byte limit");
              stream.enqueue(chunk.value);
            } catch (error) {
              controller.abort();
              response.destroy();
              cleanup();
              await reader.cancel().catch(() => {});
              stream.error(error);
            }
          },
          async cancel() {
            controller.abort();
            response.destroy();
            cleanup();
            await reader.cancel();
          },
        }),
      };
    } catch (error) {
      controller.abort();
      cleanup();
      throw error;
    }
  }
}

export async function createEditingResources(root: string) {
  const files = join(root, "editing-files");
  await mkdir(files, { mode: 0o700 });
  for (const extension of ["png", "jpg", "gif", "webp", "mp4", "webm"]) {
    const video = ["mp4", "webm"].includes(extension);
    await promisify(execFile)(
      "ffmpeg",
      [
        "-nostdin",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=32x32:duration=0.3",
        "-an",
        ...(video
          ? extension === "mp4"
            ? ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
            : ["-c:v", "libvpx-vp9"]
          : ["-frames:v", "1"]),
        "-y",
        join(files, `media.${extension}`),
      ],
      { timeout: 15_000 },
    );
  }
  await copyFile(join(files, "media.jpg"), join(files, "media.jpeg"));
  await writeFile(
    join(files, "media.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><script>alert(1)</script><rect width="32" height="32" fill="purple"/></svg>',
  );
  await writeFile(
    join(files, "style.css"),
    ".local-reference { color: rgb(120, 40, 160); border: 2px solid purple; }",
  );
  const server = createServer(async (req, res) => {
    const type = resourceTypes.get(req.url ?? "");
    if (!type || req.url === "/missing.png" || req.method !== "GET") {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const name =
        req.url === "/style.css"
          ? "style.css"
          : req.url === "/video.mp4"
            ? "media.mp4"
            : "media.png";
      const bytes = await readFile(join(files, name));
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": bytes.byteLength,
        "Cache-Control": "no-store",
      });
      res.end(bytes);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Local reference socket unavailable");
  const origin = `http://127.0.0.1:${address.port}`;
  const externalHtml = `<link rel="stylesheet" href="${origin}/style.css"><p class="local-reference">ローカル参照本文</p><img src="${origin}/image.png" alt="参照画像"><video src="${origin}/video.mp4" controls></video>`;
  await writeFile(join(files, "references.html"), externalHtml);
  const importedHtml =
    '<style>.imported{color:red}</style><h1 class="imported" data-example="preserved">取り込み見出し</h1><p style="font-weight:bold">編集可能な本文</p><aside data-opaque="kept"><details><summary>保持内容</summary>未知の構造</details></aside>';
  await writeFile(join(files, "decorated.html"), importedHtml);
  return {
    files,
    origin,
    externalHtml,
    importedHtml,
    fetcher: new LocalEditingReferenceFetcher(origin),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export async function seedEditingAccounts(
  db: Database,
  root: string,
  appUrl: string,
  importedHtml: string,
) {
  const mails: Mail[] = [];
  const base = createHollowContainer(db, appUrl, {
    async send(mail) {
      mails.push(mail);
    },
  });
  const storage = new CoordinatedObjectStorage(
    join(root, "objects"),
    base.unitOfWorkProvider,
    base.clock,
  );
  await storage.recoverOwners();
  const container = {
    ...base,
    invitationDelivery: {
      protector: await NodeTokenProtector.load(
        join(root, "keys", "invitation.key"),
      ),
      mailer: new LocalInvitationMailer(join(root, "mailbox")),
      wake() {},
    },
    importing: {
      storage,
      extractor: new IsolatedDocumentExtractor(),
      mediaValidator: new IsolatedMediaValidator(),
      detectFormat,
      wake() {},
    },
  };
  const password = "local-editing-password-123";
  try {
    const users = [];
    for (const role of ["owner", "editor", "viewer"] as const) {
      const email = `${role}@editing.fixture.invalid`;
      const result = await signUp(container, {
        email,
        password,
        termsAccepted: true,
      });
      const link = mails.at(-1)?.text.match(/http[^\s]+/)?.[0];
      if (!link) throw new Error("Local editing verification mail missing");
      const session = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        result.browserToken,
      );
      if (!session) throw new Error("Local editing session missing");
      users.push({ role, email, password, session });
    }
    const [owner, editor, viewer] = users;
    if (!owner || !editor || !viewer)
      throw new Error("Local editing identities missing");
    const workspace = await createWorkspace(container, owner.session.token, {
      name: "編集fixture",
      description: "ローカル編集権限の確認",
    });
    const viewerWorkspace = await createWorkspace(
      container,
      editor.session.token,
      { name: "閲覧専用fixture", description: "ownerにはviewer権限のみ" },
    );
    for (const [issuer, recipient, workspaceId, role] of [
      [owner, editor, workspace.id, "editor"],
      [owner, viewer, workspace.id, "viewer"],
      [editor, owner, viewerWorkspace.id, "viewer"],
    ] as const) {
      const issued = await issueInvitations(container, issuer.session.token, {
        workspaceId,
        emails: [recipient.email],
        role,
        ownerConfirmed: false,
        requestId: container.idGenerator.next(),
      });
      const id = issued.ids[0];
      if (!id) throw new Error("Local editing invitation missing");
      const copied = await copyInvitation(container, issuer.session.token, {
        workspaceId,
        id,
        generation: 1,
      });
      const browserToken = container.tokens.generate();
      const continuation = await beginInvitation(
        container,
        new URL(copied.url).searchParams.get("token") ?? "",
        browserToken,
      );
      await joinInvitation(container, recipient.session.token, {
        continuationId: continuation.id,
        browserToken,
        confirmDifferentEmail: false,
      });
    }
    const note = await saveNote(container, owner.session.token, {
      workspaceId: workspace.id,
      title: "共同編集fixture",
      html: '<h1 class="keep" data-marker="original" style="color:red">文字編集fixture</h1><p>本文</p>',
    });
    let history = await saveNote(container, owner.session.token, {
      title: "履歴fixture",
      html: "<p>版 0</p>",
    });
    for (let index = 1; index <= 21; index++)
      history = await saveNote(container, owner.session.token, {
        id: history.note.id,
        version: history.note.version,
        title: "履歴fixture",
        html: `<p>版 ${index}</p>`,
      });
    const bytes = new TextEncoder().encode(importedHtml);
    const upload = await beginUpload(container, owner.session.token, {
      files: [{ name: "decorated.html", bytes: bytes.byteLength }],
      useAi: false,
      importReferences: false,
    });
    const reservation = upload.files[0];
    if (!reservation) throw new Error("Local editing upload missing");
    const imported = await acceptUpload(
      container,
      owner.session.token,
      reservation.id,
      new ReadableStream<Uint8Array>({
        start(stream) {
          stream.enqueue(bytes);
          stream.close();
        },
      }),
    );
    return {
      users: users.map(({ role, email, password }) => ({
        role,
        email,
        password,
      })),
      workspaceId: workspace.id,
      viewerWorkspaceId: viewerWorkspace.id,
      noteId: note.note.id,
      historyNoteId: history.note.id,
      importedNoteId: imported.noteId,
    };
  } finally {
    await base.passwordHasher.stop();
  }
}
