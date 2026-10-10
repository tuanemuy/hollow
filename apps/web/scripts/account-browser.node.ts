import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import {
  applyPragmas,
  createLibsqlClient,
  getDatabase,
} from "@repo/core/adapters/libsql/client";
import { NodeAuthenticationSecretProtector } from "@repo/core/adapters/node/auth/secretProtector";
import { NodeAuthenticationExecution } from "@repo/core/adapters/node/authenticationExecution";
import { LocalInvitationMailer } from "@repo/core/adapters/node/invitationMailer";
import { LocalMailbox } from "@repo/core/adapters/node/localMailbox";
import { startSmtpFixture } from "@repo/core/adapters/node/mail/__tests__/smtpFixture";
import { NodeSmtpInvitationMailer } from "@repo/core/adapters/node/mail/smtpInvitationMailer";
import { NodeSmtpMailer } from "@repo/core/adapters/node/mail/smtpMailer";
import { NodeTokenProtector } from "@repo/core/adapters/node/tokenProtector";
import type { GoogleAuthentication } from "@repo/core/application/account/ports";
import { issueSession } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { Mail } from "@repo/core/application/ports/mailer";
import { deliverOneInvitation } from "@repo/core/application/workspace/delivery";
import { issueInvitations } from "@repo/core/application/workspace/invitations";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { GOOGLE_ISSUER } from "@repo/core/domain/account/authentication";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDriveFiles } from "./driveFiles.node";
import { createDriveFixture } from "./driveFixture.node";
import {
  createEditingResources,
  seedEditingAccounts,
} from "./editingFixture.node";
import { createExportConfiguration } from "./exportFixture.node";
import {
  createIntegrationFixture,
  seedIntegration,
} from "./integrationFixture.node";
import { createOrganizeDriveFixture } from "./organizeDriveFixture.node";
import { seedOrganize } from "./organizeFixture.node";
import { seedRetirement } from "./retirementFixture.node";
import { seedSharing } from "./sharingFixture.node";

const args = process.argv.slice(2);
const root = args[args.indexOf("--root") + 1];
const port = Number(
  args.includes("--port") ? args[args.indexOf("--port") + 1] : "4317",
);
if (
  !args.includes("--root") ||
  !root ||
  !isAbsolute(root) ||
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535
)
  throw new Error(
    "Usage: account-browser --root <new absolute persistent directory> --port <loopback port>",
  );
const app = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repository = resolve(app, "../..");
const temporary = process.env.TMPDIR;
if (
  !temporary ||
  !isAbsolute(temporary) ||
  temporary.startsWith("/tmp/") ||
  temporary.startsWith("/private/var/")
)
  throw new Error(
    "Set TMPDIR to a short persistent directory before starting the local harness.",
  );
const keep = ["HOME", "PATH", "LANG", "LC_ALL", "TZ"];
for (const name of Object.keys(process.env))
  if (!keep.includes(name)) delete process.env[name];
await mkdir(root, { mode: 0o700 });
const keys = join(root, "keys");
const mailbox = join(root, "mailbox");
await mkdir(keys, { mode: 0o700 });
await mkdir(mailbox, { mode: 0o700 });
for (const name of ["authentication", "invitation", "share"])
  await writeFile(join(keys, `${name}.key`), randomBytes(32), {
    flag: "wx",
    mode: 0o600,
  });
await symlink(join(app, "dist"), join(root, "dist"), "dir");
process.chdir(root);
const origin = `http://127.0.0.1:${port}`;
Object.assign(process.env, {
  TMPDIR: temporary,
  TMP: temporary,
  TEMP: temporary,
  DATABASE_URL: `file:${join(root, "app.db")}`,
  APP_URL: origin,
  HOSTNAME: "127.0.0.1",
  PORT: String(port),
  HOLLOW_STORAGE_DIR: join(root, "objects"),
  HOLLOW_MAIL_MODE: "local",
  HOLLOW_MAILBOX_DIR: mailbox,
  HOLLOW_INVITATION_KEY_FILE: join(keys, "invitation.key"),
  HOLLOW_SHARE_KEY_DIR: keys,
  HOLLOW_SHARE_ACTIVE_KEY_ID: "share",
  HOLLOW_SHARE_KEY_IDS: "share",
});
const client = createLibsqlClient({ url: process.env.DATABASE_URL ?? "" });
const editing = args.includes("--editing-local")
  ? await createEditingResources(root)
  : undefined;
const driveFixture = args.includes("--drive-local")
  ? await createDriveFixture(root, origin)
  : undefined;
if ((driveFixture || args.includes("--jobs-local")) && editing)
  await createDriveFiles(editing.files);
if (args.includes("--jobs-local") && editing) {
  for (const [name, content] of Object.entries({
    "jobs-fast.txt": "LOCAL_FAST_SOURCE 日本語の合成原本",
    "jobs-retry-a.txt": "LOCAL_RETRY_SOURCE 日本語の再試行用A",
    "jobs-retry-b.txt": "LOCAL_RETRY_SOURCE 日本語の再試行用B",
    "jobs-slow-a.txt": "LOCAL_SLOW_SOURCE 日本語の遅い原本A",
    "jobs-slow-b.txt": "LOCAL_SLOW_SOURCE 日本語の遅い原本B",
    "jobs-slow-c.txt": "LOCAL_SLOW_SOURCE 日本語の遅い原本C",
  }))
    await writeFile(join(editing.files, name), content, {
      flag: "wx",
      mode: 0o600,
    });
}
if (args.includes("--ux-local") && editing)
  await writeFile(
    join(editing.files, "ux-long-refs.html"),
    `<h1>モバイル本文と参照</h1><p>本文を読み返します。</p><img src="${editing.origin}/missing.png?${"x".repeat(400)}" alt="取得できない参照"><table><tr><td>${"T".repeat(500)}</td></tr></table><pre>${"C".repeat(500)}</pre>`,
    { flag: "wx", mode: 0o600 },
  );
const organizeDrive =
  driveFixture ??
  (args.includes("--organize-local") || args.includes("--integration-local")
    ? await createOrganizeDriveFixture(
        root,
        undefined,
        args.includes("--retirement-local"),
      )
    : undefined);
const integrationProvider =
  args.includes("--integration-local") || args.includes("--drive-local")
    ? await createIntegrationFixture(
        root,
        origin,
        args.includes("--jobs-local"),
        args.includes("--retirement-local"),
      )
    : undefined;
if (args.includes("--export-local")) {
  const config = await createExportConfiguration(root, args);
  process.env.HOLLOW_PDF_CONFIG = config.pdf;
  process.env.HOLLOW_PDF_TICKET_KEYRING = config.keyring;
}
if (organizeDrive || args.includes("--export-local")) {
  const zipConfig = join(root, "organize-zip.json");
  await writeFile(
    zipConfig,
    JSON.stringify({
      version: 1,
      capacity: {
        diskBytes: 1024 ** 3,
        protectedDiskBytes: 6 * 1024 ** 3,
        totalMs: 1_800_000,
        childMs: 120_000,
        assemblyMs: 120_000,
        deliveryMs: 600_000,
        leaseMs: 60_000,
        cleanupMs: 30_000,
      },
    }),
    { flag: "wx", mode: 0o600 },
  );
  process.env.HOLLOW_ZIP_CONFIG = zipConfig;
}
let sharing: Awaited<ReturnType<typeof seedSharing>> | undefined;
let organize: Awaited<ReturnType<typeof seedOrganize>> | undefined;
let retirement: Awaited<ReturnType<typeof seedRetirement>> | undefined;
let integration: Awaited<ReturnType<typeof seedIntegration>> | undefined;
let editingAccounts:
  | Awaited<ReturnType<typeof seedEditingAccounts>>
  | undefined;
try {
  await applyPragmas(client);
  await migrate(getDatabase(client), {
    migrationsFolder: join(
      repository,
      "packages/core/src/adapters/libsql/migrations",
    ),
  });
  if (editing)
    editingAccounts = await seedEditingAccounts(
      getDatabase(client),
      root,
      origin,
      editing.importedHtml,
    );
  if (args.includes("--organize-local") && organizeDrive && editingAccounts)
    organize = await seedOrganize(
      getDatabase(client),
      root,
      origin,
      editingAccounts.workspaceId,
      organizeDrive,
      args.includes("--ux-local"),
    );
  if (
    args.includes("--integration-local") &&
    !args.includes("--jobs-local") &&
    integrationProvider &&
    organizeDrive &&
    editingAccounts &&
    editing
  )
    integration = await seedIntegration(
      getDatabase(client),
      root,
      origin,
      editingAccounts.workspaceId,
      editing.origin,
      organizeDrive,
    );
  if (args.includes("--sharing-local") && editingAccounts && editing)
    sharing = await seedSharing(
      getDatabase(client),
      root,
      origin,
      editingAccounts.workspaceId,
      editing.origin,
    );
  if (args.includes("--retirement-local"))
    retirement = await seedRetirement(
      getDatabase(client),
      origin,
      organizeDrive,
    );
  if (args.includes("--invitation-local")) {
    const base = createHollowContainer(
      getDatabase(client),
      origin,
      new LocalMailbox(mailbox),
    );
    try {
      const fixture: HollowContainer = {
        ...base,
        invitationDelivery: {
          protector: await NodeTokenProtector.load(
            join(keys, "invitation.key"),
          ),
          mailer: new LocalInvitationMailer(mailbox),
          wake() {},
        },
      };
      const now = fixture.clock.now();
      const owner = verifyAccount(
        createAccount(
          fixture.idGenerator.next(),
          "invite-owner@fixture.invalid",
          await fixture.passwordHasher.hash("synthetic-owner-password-123"),
          now,
        ),
        now,
      );
      const session = await fixture.unitOfWorkProvider.run(async (u) => {
        await u.accounts.save(owner);
        return issueSession(fixture, u.accounts, owner);
      });
      const workspace = await createWorkspace(fixture, session.token, {
        name: "招待経由signup fixture",
        description: "ローカルの合成招待",
      });
      const result = await issueInvitations(fixture, session.token, {
        workspaceId: workspace.id,
        emails: ["invitee@fixture.invalid"],
        role: "editor",
        ownerConfirmed: false,
        requestId: fixture.idGenerator.next(),
      });
      const id = result.ids[0];
      if (!id || !(await deliverOneInvitation(fixture)))
        throw new Error("Local invitation was not queued");
      const invitation = await fixture.unitOfWorkProvider.run((u) =>
        u.invitations.find(id),
      );
      if (invitation?.deliveryState !== "sent")
        throw new Error("Local invitation delivery did not complete");
    } finally {
      await base.passwordHasher.stop();
    }
  }
} finally {
  if (!organize) client.close();
}
const grants = new Map<
  string,
  { state: string; nonce: string; verifier: string; mode: string }
>();
const codes = new Map<
  string,
  {
    grant: NonNullable<ReturnType<typeof grants.get>>;
    email: string;
    subject: string;
    authoritative: boolean;
  }
>();
const authenticationFactory = async (
  base: HollowContainer,
): Promise<GoogleAuthentication> => {
  return {
    execution: new NodeAuthenticationExecution(),
    protector: await NodeAuthenticationSecretProtector.load(
      join(keys, "authentication.key"),
    ),
    provider: {
      authorization: async (input) => {
        const id = randomBytes(24).toString("base64url");
        grants.set(id, input);
        return `${origin}/__fixture/google?grant=${id}`;
      },
      exchange: async (input) => {
        const record = codes.get(input.code);
        codes.delete(input.code);
        if (
          !record ||
          input.signal.aborted ||
          input.verifier !== record.grant.verifier ||
          base.tokens.hash(record.grant.nonce) !== input.nonceHash
        )
          throw new Error("Local OIDC contract mismatch");
        const now = base.clock.now();
        return {
          issuer: GOOGLE_ISSUER,
          subject: record.subject,
          email: record.email,
          authoritative: record.authoritative,
          issuedAt: now,
          expiresAt: new Date(now.getTime() + 3_600_000),
        };
      },
    },
  };
};
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? "",
  );
const html = (body: string) =>
  new Response(
    `<!doctype html><html lang="ja"><meta charset="utf-8"><title>Hollow local account fixture</title><body><h1>ローカル認証fixture</h1><p>実際のGoogle認証・メール配送は行いません。</p>${body}</body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "same-origin",
        "Content-Security-Policy":
          "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  );
const imported = await import(
  pathToFileURL(join(app, "dist/server/server.node.js")).href
);
const entry = typeof imported.boot === "function" ? imported : imported.default;
const smtpFixture = args.includes("--smtp-local")
  ? await startSmtpFixture("starttls")
  : undefined;
const smtpMailer = smtpFixture
  ? new NodeSmtpMailer(smtpFixture.config, { ca: smtpFixture.ca })
  : undefined;
const smtpInvitationMailer = smtpFixture
  ? new NodeSmtpInvitationMailer(smtpFixture.config, { ca: smtpFixture.ca })
  : undefined;
const booted = await entry.boot({
  ...integrationProvider?.dependencies,
  ...(organizeDrive ? { driveFactory: organizeDrive.factory } : {}),
  ...(editing ? { referenceFetcher: editing.fetcher } : {}),
  mailer: smtpMailer ?? new LocalMailbox(mailbox),
  invitationMailer: smtpInvitationMailer ?? new LocalInvitationMailer(mailbox),
  authenticationFactory,
});
const server = serve({
  hostname: "127.0.0.1",
  port,
  fetch: async (request) => {
    const url = new URL(request.url);
    const driveResponse = await driveFixture?.fetch(request);
    if (driveResponse) return driveResponse;
    const providerResponse = await integrationProvider?.fetch(request);
    if (providerResponse) return providerResponse;
    if (
      editing &&
      editingAccounts &&
      url.pathname === "/__fixture/editing" &&
      request.method === "GET"
    )
      return html(
        `<h2>編集fixture</h2><p>合成アカウントの共通パスワード: local-editing-password-123</p><ul>${editingAccounts.users.map((user) => `<li>${user.role}: ${escapeHtml(user.email)}</li>`).join("")}</ul><p><a href="/signin">サインイン</a></p><p><a href="/notes/new?workspaceId=${editingAccounts.workspaceId}">編集ワークスペースに新規作成</a></p><p><a href="/notes/${editingAccounts.noteId}">共同編集ノート</a></p><p><a href="/notes/${editingAccounts.historyNoteId}">20版の履歴ノート</a></p><p><a href="/notes/${editingAccounts.importedNoteId}">HTMLファイル由来ノート</a></p><p>アップロード用の生成ファイル: ${escapeHtml(editing.files)}</p><pre>${escapeHtml(editing.externalHtml)}</pre>`,
      );
    if (url.pathname === "/__fixture/mailbox" && request.method === "GET") {
      const localMail = await Promise.all(
        (await readdir(mailbox))
          .filter((name) => /^(?:invitation-)?[a-f0-9-]+\.json$/.test(name))
          .map(
            async (name) =>
              JSON.parse(await readFile(join(mailbox, name), "utf8")) as Mail,
          ),
      );
      const entries = [...localMail, ...(smtpFixture?.capturedMail() ?? [])];
      return html(
        `<h2>ローカル受信箱</h2>${entries
          .map(
            (mail) =>
              `<article><h3>${escapeHtml(mail.subject)}</h3><p>${escapeHtml(mail.to)}</p><pre>${escapeHtml(mail.text)}</pre>${(
                mail.text.match(/https?:\/\/[^\s]+/g) ?? []
              )
                .filter((link) => {
                  try {
                    return new URL(link).origin === origin;
                  } catch {
                    return false;
                  }
                })
                .map(
                  (link) =>
                    `<p><a href="${escapeHtml(link)}">確認リンクを開く</a></p>`,
                )
                .join("")}</article>`,
          )
          .join("")}<p><a href="/signin">サインイン</a></p>`,
      );
    }
    if (url.pathname === "/__fixture/google" && request.method === "GET") {
      const id = url.searchParams.get("grant") ?? "";
      if (!grants.has(id)) return new Response(null, { status: 404 });
      return html(
        `<h2>Google同意画面のローカル代替</h2><form method="post" action="/__fixture/google"><input type="hidden" name="grant" value="${escapeHtml(id)}"><label>メールアドレス<input name="email" type="email" value="google@fixture.invalid" required></label><label>Google subject<input name="subject" value="local-google-subject" required maxlength="255"></label><label><input name="authoritative" type="checkbox">管理対象アドレスの本人情報</label><button name="action" value="approve">同意する</button><button name="action" value="cancel" formnovalidate>キャンセル</button></form>`,
      );
    }
    if (url.pathname === "/__fixture/google" && request.method === "POST") {
      if (
        request.headers.get("origin") !== origin ||
        Number(request.headers.get("content-length") ?? "0") > 4096
      )
        return new Response(null, { status: 403 });
      const data = new URLSearchParams(await request.text());
      const id = data.get("grant") ?? "";
      const grant = grants.get(id);
      if (!grant) return new Response(null, { status: 404 });
      grants.delete(id);
      const callback = new URL("/auth/google/callback", origin);
      callback.searchParams.set("state", grant.state);
      if (data.get("action") === "cancel")
        callback.searchParams.set("error", "access_denied");
      else {
        const email = data.get("email") ?? "";
        const subject = data.get("subject") ?? "";
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          email.length > 254 ||
          !subject ||
          subject.length > 255
        )
          return new Response(null, { status: 400 });
        const code = randomBytes(24).toString("base64url");
        codes.set(code, {
          grant,
          email,
          subject,
          authoritative: data.get("authoritative") === "on",
        });
        callback.searchParams.set("code", code);
      }
      return new Response(null, {
        status: 303,
        headers: {
          Location: callback.href,
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    }
    return booted.fetch(request);
  },
});
const { createNodeShutdown } = await import(
  pathToFileURL(join(app, "dist/server/nodeShutdown.mjs")).href
);
let fixtureClosing: Promise<void> | null = null;
const closeFixtures = () => {
  fixtureClosing ??= (async () => {
    const results = await Promise.allSettled([
      smtpMailer?.stop(),
      smtpInvitationMailer?.stop(),
      smtpFixture?.close(),
      editing?.close(),
      integrationProvider?.close(),
      driveFixture?.close(),
    ]);
    if (results.some((result) => result.status === "rejected"))
      throw Error("Local fixture shutdown failed");
  })();
  return fixtureClosing;
};
const reportShutdownFailure = (stage: string, cause: unknown) => {
  const code = cause instanceof Error && "code" in cause ? cause.code : null;
  console.error(
    "Local runtime shutdown failed",
    stage,
    typeof code === "string" && /^[A-Z_]{1,80}$/.test(code)
      ? code
      : "NATIVE_DRAIN_FAILED",
  );
};
const shutdownBooted = async () => {
  try {
    await booted.shutdown();
  } catch (cause) {
    reportShutdownFailure("shutdown", cause);
    throw cause;
  }
};
const drain = createNodeShutdown({
  quiesce: async () => {
    try {
      await booted.quiesce();
    } catch (cause) {
      reportShutdownFailure("quiesce", cause);
      throw cause;
    }
  },
  closeListener: () =>
    new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    ),
  shutdown: async () => {
    try {
      try {
        await organize?.close();
      } finally {
        await shutdownBooted();
        if (organize) client.close();
      }
    } finally {
      await closeFixtures();
    }
  },
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void drain().then(
      () => process.exit(0),
      async (cause: unknown) => {
        reportShutdownFailure("drain", cause);
        process.exitCode = 1;
        await closeFixtures().catch(() => {});
      },
    );
  });
await writeFile(
  join(root, "fixture.json"),
  JSON.stringify({
    origin,
    mailbox,
    root,
    ...(driveFixture
      ? {
          drive: {
            providerOrigin: driveFixture.providerOrigin,
            folderId: driveFixture.folderId,
          },
        }
      : {}),
    ...(organize ? { organize } : {}),
    ...(sharing ? { sharing } : {}),
    ...(retirement ? { retirement } : {}),
    ...(integration
      ? { integration, integrationProvider: integrationProvider?.directory }
      : {}),
    ...(editing
      ? {
          editing: {
            ...editingAccounts,
            files: editing.files,
            referenceOrigin: editing.origin,
          },
        }
      : {}),
  }),
  { flag: "wx", mode: 0o600 },
);
console.log(
  `Local account fixture: ${origin}; mailbox: ${origin}/__fixture/mailbox; fresh root: ${root}`,
);
