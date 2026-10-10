import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  applyPragmas,
  createLibsqlClient,
  getDatabase,
} from "@repo/core/adapters/libsql/client";
import { createCredentialLocalTlsEndpoint } from "@repo/core/adapters/node/auth/credentialLocalTlsDial";
import { acquireCredentialRuntime } from "@repo/core/adapters/node/auth/credentialRuntimeOwnership";
import { NodeOpenRouterExecution } from "@repo/core/adapters/node/openrouter/execution";
import { NodeOpenRouterProvider } from "@repo/core/adapters/node/openrouter/provider";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { OpenRouterServices } from "@repo/core/application/integration/openRouter/ports";

export async function createRetirementCredentialFixture(
  root: string,
  appOrigin: string,
  local: OpenRouterServices,
) {
  const directory = join(root, "retirement-credentials");
  await mkdir(directory, { mode: 0o700 });
  const key = join(directory, "tls.key");
  const certificate = join(directory, "tls.crt");
  const configuration = join(directory, "tls.cnf");
  await writeFile(
    configuration,
    [
      "[req]",
      "prompt=no",
      "distinguished_name=subject",
      "x509_extensions=server",
      "[subject]",
      "CN=openrouter.ai",
      "[server]",
      "basicConstraints=critical,CA:TRUE",
      "keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign",
      "extendedKeyUsage=serverAuth",
      "subjectAltName=DNS:openrouter.ai",
      "",
    ].join("\n"),
    { flag: "wx", mode: 0o600 },
  );
  await writeFile(key, "", { flag: "wx", mode: 0o600 });
  await writeFile(certificate, "", { flag: "wx", mode: 0o600 });
  await promisify(execFile)(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-sha256",
      "-days",
      "2",
      "-config",
      configuration,
      "-keyout",
      key,
      "-out",
      certificate,
    ],
    { cwd: directory, timeout: 10_000, maxBuffer: 64 * 1024 },
  );
  const endpoint = await createCredentialLocalTlsEndpoint({
    key: await readFile(key),
    certificate: await readFile(certificate),
    async respond(request) {
      const signal = new AbortController().signal;
      if (request.method === "POST" && request.path === "/api/v1/auth/keys") {
        const body = JSON.parse(new TextDecoder().decode(request.body)) as {
          code: string;
          code_verifier: string;
          code_challenge_method: string;
        };
        if (body.code_challenge_method !== "S256")
          throw new Error("Invalid local OAuth request");
        const credential = await local.authorization.exchange({
          code: body.code,
          verifier: body.code_verifier,
          signal,
        });
        return { body: Buffer.from(JSON.stringify({ key: credential })) };
      }
      if (
        request.method === "GET" &&
        request.path === "/api/v1/key" &&
        request.authorization?.startsWith("Bearer ")
      ) {
        const metadata = await local.authorization.inspectCredential({
          credential: request.authorization.slice(7),
          signal,
        });
        return {
          body: Buffer.from(
            JSON.stringify({
              data: {
                expires_at: metadata.expiresAt?.toISOString() ?? null,
                creator_user_id: metadata.providerUserId,
              },
            }),
          ),
        };
      }
      throw new Error("Unexpected local credential request");
    },
  });
  const file = await realpath(join(root, "app.db"));
  await chmod(file, 0o600);
  const client = createLibsqlClient({ url: `file:${file}` });
  await applyPragmas(client);
  const database = getDatabase(client);
  const base = createHollowContainer(database, appOrigin, {
    send: async () => {
      throw new Error("Credential fixture does not send mail");
    },
  });
  class LocalConsentProvider extends NodeOpenRouterProvider {
    override async authorization(
      input: Parameters<NodeOpenRouterProvider["authorization"]>[0],
    ) {
      await super.authorization(input);
      return local.authorization.authorization(input);
    }
  }
  const provider = new LocalConsentProvider(
    appOrigin,
    base.clock,
    undefined,
    endpoint.dial,
  );
  const owner = await acquireCredentialRuntime(
    join(directory, "owner"),
    file,
    "openrouter",
    database,
    base.unitOfWorkProvider,
  );
  const transport = provider.credentialTransport;
  if (!transport) throw new Error("Native credential transport unavailable");
  const execution = new NodeOpenRouterExecution({ owner, transport, provider });
  return {
    services: { ...local, authorization: provider, execution },
    async close() {
      try {
        await execution.stop();
        await endpoint.settled();
      } finally {
        await endpoint.close();
        client.close();
      }
    },
  };
}
