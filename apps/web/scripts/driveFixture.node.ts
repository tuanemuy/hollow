import { randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { createServer, request } from "node:http";
import type { Socket } from "node:net";
import { join } from "node:path";
import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import { NodeDriveHttp } from "@repo/core/adapters/node/drive/http";
import { NodeRegenerationSourceProvider } from "@repo/core/adapters/node/drive/sourceProvider";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { NodeServerDependencies } from "../app/server.node";
import { createOrganizeDriveFixture } from "./organizeDriveFixture.node";

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? c,
  );
export async function createDriveFixture(root: string, appOrigin: string) {
  const base = await createOrganizeDriveFixture(root, appOrigin);
  const sockets = new Set<Socket>();
  const sourceState = new Map<string, "deleted" | "moved">();
  const grants = new Map<
    string,
    { state: string; nonce: string; verifier: string; chooseAccount: boolean }
  >();
  const codes = new Map<
    string,
    {
      verifier: string;
      refresh: boolean;
      nonceHash: string;
      subject: string;
      email: string;
      scopes: string[];
    }
  >();
  const candidates = new Map<
    string,
    { nonceHash: string; subject: string; email: string; scopes: string[] }
  >();
  const provider = createServer(async (incoming, outgoing) => {
    const url = new URL(incoming.url ?? "/", "http://fixture.invalid");
    const match = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    const id = match?.[1] ? decodeURIComponent(match[1]) : "";
    const file = base.file(id);
    if (
      !file ||
      file.received !== file.file.bytes ||
      sourceState.get(id) === "deleted"
    ) {
      outgoing.writeHead(404).end();
      return;
    }
    await appendFile(
      join(root, "local-drive", "source-requests.jsonl"),
      JSON.stringify({
        utc: new Date().toISOString(),
        id,
        endpoint:
          url.searchParams.get("alt") === "media" ? "download" : "metadata",
      }) + "\n",
    );
    outgoing.setHeader("Connection", "close");
    if (url.searchParams.get("alt") === "media")
      outgoing.writeHead(200).end(Buffer.concat(file.chunks));
    else
      outgoing.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          id,
          parents:
            sourceState.get(id) === "moved"
              ? ["synthetic-moved-folder"]
              : file.file.parents,
          size: String(file.file.bytes),
          sha256Checksum: file.file.sha256,
          trashed: false,
          explicitlyTrashed: false,
          version: "1",
          mimeType: "application/octet-stream",
          capabilities: { canDownload: true },
        }),
      );
  });
  provider.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) =>
    provider.listen(0, "127.0.0.1", resolve),
  );
  const address = provider.address();
  if (!address || typeof address === "string")
    throw Error("Drive fixture listener");
  const providerOrigin = `http://127.0.0.1:${address.port}`;
  let hash: ((value: string) => string) | null = null;
  const factory: NonNullable<NodeServerDependencies["driveFactory"]> = async (
    container,
    options,
  ) => {
    hash = container.tokens.hash;
    const drive = await base.factory(container, options);
    if (!drive) return null;
    const execution = drive.services.execution;
    if (!(execution instanceof NodeDriveExecution))
      throw Error("Drive fixture execution owner");
    const http = new NodeDriveHttp(execution, (url, options, response) => {
      if (
        url.origin !== "https://www.googleapis.com" ||
        !/^\/drive\/v3\/files\//.test(url.pathname)
      )
        throw Error("Unexpected Drive fixture destination");
      return request(
        new URL(url.pathname + url.search, providerOrigin),
        { ...options, port: address.port, agent: false },
        response,
      );
    });
    return {
      ...drive,
      source: new NodeRegenerationSourceProvider(http),
      services: {
        ...drive.services,
        authorization: {
          async authorization(input) {
            const grant = randomBytes(24).toString("base64url");
            grants.set(grant, input);
            const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            url.searchParams.set(
              "fixtureConsent",
              `${appOrigin}/__fixture/drive/consent?grant=${grant}`,
            );
            url.searchParams.set("state", input.state);
            return url.href;
          },
          async exchange(input) {
            input.signal.throwIfAborted();
            const code = codes.get(input.code);
            codes.delete(input.code);
            if (!code || code.verifier !== input.verifier)
              throw new BusinessRuleError(
                "DRIVE_UNAVAILABLE",
                "合成認可を確認できません。",
              );
            const accessToken = randomBytes(24).toString("base64url");
            candidates.set(accessToken, code);
            return {
              accessToken,
              refreshToken: code.refresh ? "synthetic-drive-refresh" : null,
              idToken: "synthetic-drive-id",
              scope: code.scopes.join(" "),
              accessExpiresAt: new Date(Date.now() + 3600000),
            };
          },
          async verifyCandidate(input) {
            input.signal.throwIfAborted();
            const value = candidates.get(input.tokens.accessToken);
            if (!value || value.nonceHash !== input.nonceHash)
              throw new BusinessRuleError(
                "DRIVE_UNAVAILABLE",
                "合成本人情報を確認できません。",
              );
            return {
              subject: value.subject,
              email: value.email,
              scopes: value.scopes,
            };
          },
          refresh: drive.services.authorization.refresh,
        },
      },
    };
  };
  const html = (body: string) =>
    new Response(
      `<!doctype html><html lang="ja"><meta charset="utf-8"><title>Drive local fixture</title><body><h1>Driveのローカル契約fixture</h1><p>合成認可・原本保存です。実Googleへ接続しません。</p>${body}</body></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  return {
    ...base,
    factory,
    providerOrigin,
    async fetch(incoming: Request): Promise<Response | null> {
      const url = new URL(incoming.url);
      if (url.pathname.startsWith("/__fixture/drive/file/")) {
        const id = decodeURIComponent(
          url.pathname.slice("/__fixture/drive/file/".length),
        );
        const file = base.file(id);
        if (!file) return new Response(null, { status: 404 });
        if (incoming.method === "POST") {
          const form = await incoming.formData();
          const action = form.get("action");
          if (action === "deleted" || action === "moved")
            sourceState.set(id, action);
          else if (action === "restore") sourceState.delete(id);
          return Response.redirect(url, 303);
        }
        return html(
          `<h2>保存した原本</h2><p>${file.file.bytes} bytes</p><p>SHA-256 ${escapeHtml(file.file.sha256 ?? "")}</p><p>合成配布元の状態: ${sourceState.get(id) ?? "元の場所"}</p><form method="post"><button name="action" value="moved">合成原本を別フォルダへ移動</button><button name="action" value="deleted">合成原本を404にする</button><button name="action" value="restore">合成原本を元に戻す</button></form>`,
        );
      }
      if (url.pathname !== "/__fixture/drive/consent") return null;
      const form =
        incoming.method === "POST" ? await incoming.formData() : null;
      const id = String(
        form?.get("grant") ?? url.searchParams.get("grant") ?? "",
      );
      const grant = grants.get(id);
      if (!grant) return new Response(null, { status: 404 });
      if (!form)
        return html(
          `<h2>drive.file の同意</h2><p>offline refresh / ${grant.chooseAccount ? "アカウント選択" : "既定アカウント"}</p><form method="post"><input type="hidden" name="grant" value="${escapeHtml(id)}"><label>Drive subject<input name="subject" value="local-drive-subject"></label><label>Drive email<input name="email" type="email" value="drive@fixture.invalid"></label><label><input name="scope" type="checkbox" checked>drive.file を許可</label><label><input name="refresh" type="checkbox" checked>refresh token を返す</label><button name="action" value="approve">同意する</button><button name="action" value="cancel">キャンセル</button></form>`,
        );
      grants.delete(id);
      const callback = new URL("/auth/drive/callback", appOrigin);
      callback.searchParams.set("state", grant.state);
      if (form.get("action") === "cancel")
        callback.searchParams.set("error", "access_denied");
      else {
        const code = randomBytes(24).toString("base64url");
        if (!hash) throw Error("Drive fixture hash");
        codes.set(code, {
          verifier: grant.verifier,
          refresh: form.has("refresh"),
          nonceHash: hash(grant.nonce),
          subject: String(form.get("subject") ?? "local-drive-subject"),
          email: String(form.get("email") ?? "drive@fixture.invalid"),
          scopes: form.has("scope")
            ? ["openid", "https://www.googleapis.com/auth/drive.file"]
            : ["openid"],
        });
        callback.searchParams.set("code", code);
      }
      return Response.redirect(callback, 303);
    },
    async close() {
      await new Promise<void>((resolve, reject) =>
        provider.close((error) => (error ? reject(error) : resolve())),
      );
      if (sockets.size) throw Error("Drive fixture native sockets remain");
    },
  };
}
