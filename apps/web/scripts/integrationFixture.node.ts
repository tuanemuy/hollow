import { randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, request } from "node:http";
import type { Socket } from "node:net";
import { join } from "node:path";
import type { Database } from "@repo/core/adapters/libsql/client";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import type { createNodeLlm } from "@repo/core/adapters/node/llm/config";
import { NodeLlmGenerator } from "@repo/core/adapters/node/llm/generator";
import { NodeOpenRouterExecution } from "@repo/core/adapters/node/openrouter/execution";
import { NodeOpenRouterSecretProtector } from "@repo/core/adapters/node/openrouter/secretProtector";
import { issueSession } from "@repo/core/application/account/session";
import { signIn } from "@repo/core/application/account/signIn";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import {
  OpenRouterProviderError,
  type OpenRouterServices,
} from "@repo/core/application/integration/openRouter/ports";
import {
  type LlmModelProfiles,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import { saveNote } from "@repo/core/application/note/saveNote";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import {
  OPENROUTER_ADOPTED_MODELS,
  OPENROUTER_DEFAULT_TEXT,
  type OpenRouterModel,
} from "@repo/core/domain/integration/openRouter";
import type { NodeServerDependencies } from "../app/server.node";
import type { createOrganizeDriveFixture } from "./organizeDriveFixture.node";
import { createRetirementCredentialFixture } from "./retirementCredentialFixture.node";

type Mode =
  | "success"
  | "reject"
  | "invalid"
  | "catalog-unavailable"
  | "expire-soon";
const modes = new Set<Mode>([
  "success",
  "reject",
  "invalid",
  "catalog-unavailable",
  "expire-soon",
]);
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? c,
  );

export async function createIntegrationFixture(
  root: string,
  appOrigin: string,
  jobs = false,
  retirement = false,
) {
  const directory = join(root, "integration-local");
  await mkdir(directory, { mode: 0o700 });
  const keyFile = join(directory, "openrouter.key");
  await writeFile(keyFile, randomBytes(32), { flag: "wx", mode: 0o600 });
  const protector = await NodeOpenRouterSecretProtector.load(keyFile);
  const grants = new Map<string, { correlation: string; verifier: string }>();
  const codes = new Map<string, { verifier: string; mode: Mode }>();
  const credentials = new Map<string, { mode: Mode; expiresAt: Date | null }>();
  const sockets = new Set<Socket>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let catalogUnavailable = false;
  let retryCauseReleased = false;
  const catalog: readonly OpenRouterModel[] = [
    ...OPENROUTER_ADOPTED_MODELS.map((model) => ({
      ...model,
      expiresAt: null,
    })),
    {
      id: "fixture/text-v2",
      name: "ローカル文章モデル v2",
      kinds: ["chat-text"],
      expiresAt: null,
    },
    {
      id: "fixture/image-v2",
      name: "ローカル画像モデル v2",
      kinds: ["chat-text", "chat-image"],
      expiresAt: null,
    },
    {
      id: "fixture/retired",
      name: "提供終了を再現するローカルモデル",
      kinds: ["chat-text"],
      expiresAt: null,
    },
  ];
  const provider = createServer(async (incoming, outgoing) => {
    if (jobs && incoming.url === "/jobs-fixture" && incoming.method === "GET") {
      outgoing
        .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
        .end(
          `<html lang="ja"><h1>ローカルjob fixture</h1><p>再試行原因: ${retryCauseReleased ? "解消済み" : "一時拒否"}</p><form method="POST"><button>一時拒否を解消する</button></form></html>`,
        );
      return;
    }
    if (
      jobs &&
      incoming.url === "/jobs-fixture" &&
      incoming.method === "POST"
    ) {
      retryCauseReleased = true;
      outgoing.writeHead(303, { Location: "/jobs-fixture" }).end();
      return;
    }
    if (
      incoming.url !== "/api/v1/chat/completions" ||
      incoming.method !== "POST"
    ) {
      outgoing.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of incoming) {
      bytes += chunk.length;
      if (bytes > 32 * 1024 ** 2) {
        incoming.destroy();
        return;
      }
      chunks.push(chunk);
    }
    const wire = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      model: string;
      provider: {
        data_collection: string;
        allow_fallbacks: boolean;
        require_parameters: boolean;
      };
      messages: unknown[];
    };
    const credential = incoming.headers.authorization?.replace(/^Bearer /, "");
    if (
      !credential ||
      !credentials.has(credential) ||
      wire.provider.data_collection !== "deny" ||
      wire.provider.allow_fallbacks !== false ||
      wire.provider.require_parameters !== true
    ) {
      outgoing.writeHead(400).end();
      return;
    }
    const isImage = wire.messages.some((value) =>
      JSON.stringify(value).includes('"image_url"'),
    );
    const slow = JSON.stringify(wire.messages).includes("LOCAL_SLOW_SOURCE");
    const retrySource =
      jobs && JSON.stringify(wire.messages).includes("LOCAL_RETRY_SOURCE");
    const instructionMarker = JSON.stringify(wire.messages).includes(
      "LOCAL_INSTRUCTION_MARKER",
    );
    await appendFile(
      join(directory, "requests.jsonl"),
      JSON.stringify({
        utc: new Date().toISOString(),
        model: wire.model,
        kind: isImage ? "image" : "text",
        privacy: wire.provider,
        slow,
        retrySource,
        instructionMarker,
      }) + "\n",
    );
    outgoing.once("close", () => {
      void appendFile(
        join(directory, "closures.jsonl"),
        JSON.stringify({
          utc: new Date().toISOString(),
          model: wire.model,
          completed: outgoing.writableFinished,
        }) + "\n",
      );
    });
    if (retrySource && !retryCauseReleased) {
      outgoing
        .writeHead(429, { "Content-Type": "application/json" })
        .end(
          JSON.stringify({ error: { message: "Synthetic temporary refusal" } }),
        );
      return;
    }
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        if (outgoing.destroyed) return;
        outgoing.writeHead(200, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: `<h1>ローカルAI変換</h1><p>${isImage ? "合成画像の文字と図" : "合成文章を読みやすく変換"}</p><p>モデル ${escapeHtml(wire.model)}</p>`,
                },
              },
            ],
            usage: { prompt_tokens: 12, completion_tokens: 20 },
          }),
        );
      },
      slow ? 30_000 : 750,
    );
    timers.add(timer);
    outgoing.once("close", () => {
      clearTimeout(timer);
      timers.delete(timer);
    });
  });
  provider.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve, reject) => {
    provider.once("error", reject);
    provider.listen(0, "127.0.0.1", resolve);
  });
  const address = provider.address();
  if (!address || typeof address === "string")
    throw new Error("Local LLM listener missing");
  const localOrigin = `http://127.0.0.1:${address.port}`;
  const profiles: LlmModelProfiles = {
    async inspect(input, signal) {
      signal.throwIfAborted();
      if (input.modelId === "fixture/retired")
        throw new LlmOperationError("LLM_MODEL_UNAVAILABLE", "not-sent", true);
      if (
        !catalog.some(
          (model) =>
            model.id === input.modelId && model.kinds.includes(input.kind),
        )
      )
        throw new LlmOperationError("LLM_MODEL_INCOMPATIBLE", "not-sent", true);
      const common = {
        modelId: input.modelId,
        contextTokens: 128_000,
        outputTokens: 16_384,
        supportsMaxTokens: true as const,
        source: "live" as const,
        checkedAt: new Date(),
      };
      return input.kind === "chat-image"
        ? {
            ...common,
            kind: "chat-image",
            budget: {
              kind: "resource-only",
              imageTokens: null,
              contextGuaranteed: false,
            },
          }
        : { ...common, kind: "chat-text" };
    },
  };
  let ownedCredentials:
    | Awaited<ReturnType<typeof createRetirementCredentialFixture>>
    | undefined;
  const dependencies: Pick<
    NodeServerDependencies,
    "openRouterFactory" | "llmFactory"
  > = {
    openRouterFactory: async () => {
      const local: OpenRouterServices = {
        protector,
        execution: new NodeOpenRouterExecution(),
        catalog: {
          fallback: () => OPENROUTER_ADOPTED_MODELS,
          async list(signal) {
            signal.throwIfAborted();
            if (catalogUnavailable)
              throw new OpenRouterProviderError("OPENROUTER_UNAVAILABLE");
            return catalog;
          },
        },
        authorization: {
          async authorization(input) {
            const grant = randomBytes(24).toString("base64url");
            grants.set(grant, input);
            return `${appOrigin}/__fixture/openrouter?grant=${grant}`;
          },
          async exchange(input) {
            input.signal.throwIfAborted();
            const code = codes.get(input.code);
            codes.delete(input.code);
            if (
              !code ||
              code.verifier !== input.verifier ||
              code.mode === "reject"
            )
              throw new OpenRouterProviderError("OPENROUTER_PROVIDER_REJECTED");
            const credential = `synthetic-${randomBytes(12).toString("hex")}`;
            credentials.set(credential, {
              mode: code.mode,
              expiresAt:
                code.mode === "expire-soon"
                  ? new Date(Date.now() + 20_000)
                  : null,
            });
            catalogUnavailable = code.mode === "catalog-unavailable";
            return credential;
          },
          async inspectCredential(input) {
            input.signal.throwIfAborted();
            const credential = credentials.get(input.credential);
            if (!credential || credential.mode === "invalid")
              throw new OpenRouterProviderError(
                "OPENROUTER_CREDENTIAL_INVALID",
              );
            return {
              expiresAt: credential.expiresAt,
              providerUserId: "local-creator-01",
            };
          },
        },
      };
      if (!retirement) return local;
      ownedCredentials = await createRetirementCredentialFixture(
        root,
        appOrigin,
        local,
      );
      return ownedCredentials.services;
    },
    llmFactory: async (base, options) => {
      const built: { createNodeLlm: typeof createNodeLlm } = await import(
        new URL("../dist/server/server.node.js", import.meta.url).href
      );
      return {
        ...(await built.createNodeLlm(base, { ...options, profiles })),
        generator: new NodeLlmGenerator((url, requestOptions, response) => {
          if (url.href !== "https://openrouter.ai/api/v1/chat/completions")
            throw new Error("Unexpected LLM fixture destination");
          return request(
            new URL(url.pathname, localOrigin),
            { ...requestOptions, port: address.port, agent: false },
            response,
          );
        }),
      };
    },
  };
  const response = (body: string) =>
    new Response(
      `<!doctype html><html lang="ja"><meta charset="utf-8"><title>OpenRouter local fixture</title><body><h1>OpenRouterのローカル同意画面</h1><p>合成providerです。実サービスへの接続・課金は行いません。</p>${body}</body></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy":
            "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        },
      },
    );
  return {
    dependencies,
    directory,
    async fetch(req: Request): Promise<Response | null> {
      const url = new URL(req.url);
      if (jobs && url.pathname === "/__fixture/jobs") {
        if (req.method === "POST") {
          retryCauseReleased = true;
          return new Response(null, {
            status: 303,
            headers: { Location: "/__fixture/jobs" },
          });
        }
        if (req.method !== "GET") return new Response(null, { status: 405 });
        return response(
          `<h2>再試行の原因</h2><p>${retryCauseReleased ? "解消済み" : "一時拒否"}</p><form method="POST"><button>一時拒否を解消する</button></form>`,
        );
      }
      if (url.pathname !== "/__fixture/openrouter") return null;
      if (req.method === "GET") {
        const grant = url.searchParams.get("grant") ?? "";
        if (!grants.has(grant)) return new Response(null, { status: 404 });
        return response(
          `<form method="post"><input type="hidden" name="grant" value="${escapeHtml(grant)}"><label>合成providerの応答<select name="mode">${[...modes].map((mode) => `<option>${mode}</option>`).join("")}</select></label><button name="action" value="approve">同意する</button><button name="action" value="cancel">キャンセル</button></form>`,
        );
      }
      if (
        req.method !== "POST" ||
        req.headers.get("origin") !== appOrigin ||
        Number(req.headers.get("content-length") ?? "0") > 4096
      )
        return new Response(null, { status: 403 });
      const data = new URLSearchParams(await req.text());
      const grant = grants.get(data.get("grant") ?? "");
      const mode = data.get("mode") as Mode;
      if (!grant || !modes.has(mode))
        return new Response(null, { status: 400 });
      grants.delete(data.get("grant") ?? "");
      const callback = new URL("/auth/openrouter/callback", appOrigin);
      callback.searchParams.set("correlation", grant.correlation);
      if (data.get("action") === "cancel")
        callback.searchParams.set("error", "access_denied");
      else {
        const code = randomBytes(24).toString("base64url");
        codes.set(code, { verifier: grant.verifier, mode });
        callback.searchParams.set("code", code);
      }
      return new Response(null, {
        status: 303,
        headers: { Location: callback.href, "Cache-Control": "no-store" },
      });
    },
    async close() {
      await ownedCredentials?.close();
      for (const timer of timers) clearTimeout(timer);
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        provider.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

export async function seedIntegration(
  db: Database,
  root: string,
  origin: string,
  workspaceId: string,
  referenceOrigin: string,
  drive: Awaited<ReturnType<typeof createOrganizeDriveFixture>>,
) {
  const base = createHollowContainer(db, origin, { async send() {} });
  const storage = new CoordinatedObjectStorage(
    join(root, "objects"),
    base.unitOfWorkProvider,
    base.clock,
  );
  await storage.recoverOwners();
  const c = {
    ...base,
    importing: {
      storage,
      extractor: new IsolatedDocumentExtractor(),
      mediaValidator: new IsolatedMediaValidator(),
      detectFormat,
      wake() {},
    },
  };
  try {
    const actor = await signIn(c, {
      email: "owner@editing.fixture.invalid",
      password: "local-editing-password-123",
    });
    const files = join(root, "integration-files");
    await mkdir(files, { mode: 0o700 });
    await writeFile(
      join(files, "text.txt"),
      "合成文章の見出し\n日本語本文を保存して変換します。\n",
    );
    await writeFile(
      join(files, "slow.txt"),
      "LOCAL_SLOW_SOURCE\n取消と実接続終了を観測する合成文章。\n",
    );
    await writeFile(
      join(files, "references.html"),
      `<link rel="stylesheet" href="${referenceOrigin}/style.css"><p>IM05 保存参照本文</p><img src="${referenceOrigin}/image.png" alt="合成画像"><video controls src="${referenceOrigin}/video.mp4"></video><img src="${referenceOrigin}/missing.png" alt="取得失敗画像">`,
    );
    await writeFile(
      join(files, "references.md"),
      `# IM05 Markdown参照\n![合成画像](${referenceOrigin}/image.png)\n<video controls src="${referenceOrigin}/video.mp4"></video>\n`,
    );
    const bytes = await readFile(join(root, "editing-files", "media.png"));
    const upload = await beginUpload(c, actor.token, {
      files: [{ name: "waiting-image.png", bytes: bytes.byteLength }],
      useAi: true,
      importReferences: false,
    });
    const reservation = upload.files[0];
    if (!reservation)
      throw new Error("Local waiting image reservation missing");
    const waiting = await acceptUpload(
      c,
      actor.token,
      reservation.id,
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
    );
    const retained = await saveNote(c, actor.token, {
      title: "連携解除でも保持する本文",
      html: "<p>完成済みの合成本文を保持します。</p>",
    });
    const paginated: string[] = [];
    const issuers = [actor];
    for (const suffix of ["a", "b"]) {
      const account = verifyAccount(
        createAccount(
          c.idGenerator.next(),
          `workspace-creator-${suffix}@integration.fixture.invalid`,
          await c.passwordHasher.hash("local-editing-password-123"),
          c.clock.now(),
        ),
        c.clock.now(),
      );
      const session = await c.unitOfWorkProvider.run(async (u) => {
        await u.accounts.save(account);
        return issueSession(c, u.accounts, account);
      });
      issuers.push(session);
    }
    for (let i = 0; i < 51; i++) {
      const issuer = issuers[Math.floor(i / 17)];
      if (!issuer) throw new Error("Local workspace issuer missing");
      const workspace = await createWorkspace(c, issuer.token, {
        name: `使用状況ページ ${String(i + 1).padStart(2, "0")}`,
        description: "全編集スペースのページング確認",
      });
      paginated.push(workspace.id);
      if (issuer !== actor)
        await c.unitOfWorkProvider.run((u) =>
          u.workspaces.join(
            workspace.id,
            actor.user.id,
            "editor",
            c.clock.now(),
          ),
        );
    }
    const warning = await createWorkspace(c, actor.token, {
      name: "容量80%超の受付予約",
      description: "原本を書き込む前の有効な受付予約で容量を確認",
    });
    const full = await createWorkspace(c, actor.token, {
      name: "容量上限の受付予約",
      description: "製品の20GiB上限を変えずに新規受付拒否を確認",
    });
    for (const [id, total] of [
      [warning.id, 33 * 500 * 1024 ** 2],
      [full.id, 20 * 1024 ** 3],
    ] as const) {
      let remaining = total;
      let batch = 0;
      while (remaining > 0) {
        let bytes = Math.min(remaining, 500 * 1024 ** 2);
        const files: { name: string; bytes: number }[] = [];
        while (bytes > 0) {
          const size = Math.min(bytes, 50 * 1024 ** 2);
          files.push({
            name: `reservation-${batch}-${files.length}.txt`,
            bytes: size,
          });
          bytes -= size;
        }
        await beginUpload(c, actor.token, {
          workspaceId: id,
          files,
          useAi: false,
          importReferences: false,
        });
        remaining -= files.reduce((sum, file) => sum + file.bytes, 0);
        batch++;
      }
    }
    await c.unitOfWorkProvider.run(async (u) => {
      for (const [id, state] of [
        [actor.user.id, "linked"],
        [
          (await u.accounts.findByEmail("editor@editing.fixture.invalid"))?.id,
          "needs-relink",
        ],
      ] as const) {
        if (!id) throw new Error("Local Drive identity missing");
        const previous = await u.driveConnections.ensure(id, c.clock.now());
        const epoch = previous.epoch + 1;
        const credentialVersion = previous.credentialVersion + 1;
        const subject = `local-${id}`;
        const next = {
          ...previous,
          state: "linked" as const,
          epoch,
          credentialVersion,
          settingsVersion: previous.settingsVersion + 1,
          version: previous.version + 1,
          autoBackup: false,
          folder: null,
          updatedAt: c.clock.now(),
          credential: {
            subject,
            email: `${state}@drive.fixture.invalid`,
            envelope: drive.protector.protect(
              JSON.stringify({
                version: 1,
                accessToken: "local-access",
                refreshToken: "local-refresh",
              }),
              {
                purpose: "credential",
                accountId: id,
                subject,
                epoch,
                credentialVersion,
              },
            ),
            scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
            accessExpiresAt: new Date(Date.now() + 3600000),
            connectedAt: c.clock.now(),
          },
        };
        if (
          !(await u.driveConnections.replace(next, previous.version, "adopt"))
        )
          throw new Error("Local Drive seed rejected");
        if (
          state === "needs-relink" &&
          !(await u.driveConnections.replace(
            { ...next, state, version: next.version + 1 },
            next.version,
            "invalidate",
          ))
        )
          throw new Error("Local Drive invalidation rejected");
      }
    });
    return {
      files,
      workspaceId,
      warningWorkspaceId: warning.id,
      fullWorkspaceId: full.id,
      waitingNoteId: waiting.noteId,
      retainedNoteId: retained.note.id,
      paginatedWorkspaceIds: paginated,
      defaultModel: OPENROUTER_DEFAULT_TEXT,
    };
  } finally {
    await base.passwordHasher.stop();
  }
}
