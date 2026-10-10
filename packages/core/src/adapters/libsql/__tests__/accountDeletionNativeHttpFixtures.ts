import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { createCredentialLocalTlsEndpoint } from "@repo/core/adapters/node/auth/credentialLocalTlsDial";
import { acquireCredentialRuntime } from "@repo/core/adapters/node/auth/credentialRuntimeOwnership";
import { readNodeOpenRouter } from "@repo/core/adapters/node/openrouter/config";
import { ensureAuthenticationBrowser } from "@repo/core/application/account/context";
import { ownsCredentials } from "@repo/core/application/account/ports";
import { issueSession } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";

async function bounded<T>(
  promise: Promise<T>,
  milliseconds = 5_000,
): Promise<T> {
  const controller = new AbortController();
  try {
    return await Promise.race([
      promise,
      delay(milliseconds, undefined, { signal: controller.signal }).then(() => {
        throw new Error("P5D_HTTP_DEADLINE");
      }),
    ]);
  } finally {
    controller.abort();
  }
}
function gate() {
  let enter = () => {};
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const resumed = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    ready: () => bounded(ready),
    release,
    async wait() {
      enter();
      await bounded(resumed);
    },
  };
}
async function directory(path: string) {
  const value = await lstat(path);
  if (
    !value.isDirectory() ||
    value.isSymbolicLink() ||
    value.uid !== process.getuid?.() ||
    (value.mode & 0o7777) !== 0o700 ||
    (await realpath(path)) !== path
  )
    throw new Error("P5D_HTTP_DIRECTORY");
}
async function createFile(path: string, bytes: Uint8Array) {
  const file = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }
}
let opened = false;
export async function createNativeHttpFixture() {
  const root = process.env.HOLLOW_ACCOUNT_DELETION_HTTP_ROOT;
  if (!root || !isAbsolute(root) || opened)
    throw new Error("P5D_HTTP_FRESH_ROOT");
  const fixtureRoot = root;
  await directory(root);
  opened = true;
  const started = performance.now();
  let failed = false;
  let closed = false;
  let now = new Date("2026-10-06T00:00:00.000Z");
  const file = join(root, "native-http.db");
  const ownerDirectory = join(root, "openrouter-owner");
  const keyFile = join(root, "openrouter.key");
  const configFile = join(root, "openrouter.json");
  const fileGuard = async () => {
    await directory(root);
    let total = 0;
    let databases = 0;
    const entries = await readdir(root);
    if (entries.length > 9) throw new Error("P5D_HTTP_ROOT_ENTRIES");
    for (const name of entries) {
      const path = join(root, name);
      if (name === "openrouter-owner") {
        await directory(path);
        const ownerFiles = await readdir(path);
        if (ownerFiles.length > 3) throw new Error("P5D_HTTP_OWNER_ENTRIES");
        for (const ownerFile of ownerFiles) {
          if (
            ownerFile !== "owner.json" &&
            ownerFile !== "recovery.lock" &&
            !/^owner-[a-f0-9-]{36}\.tmp$/.test(ownerFile)
          )
            throw new Error("P5D_HTTP_OWNER_PATH");
          const value = await lstat(join(path, ownerFile));
          if (
            !value.isFile() ||
            value.isSymbolicLink() ||
            value.nlink !== 1 ||
            value.uid !== process.getuid?.() ||
            (value.mode & 0o7777) !== 0o600 ||
            value.size > 16_384
          )
            throw new Error("P5D_HTTP_OWNER_FILE");
          total += value.size;
        }
        continue;
      }
      if (
        ![
          "native-http.db",
          "native-http.db-wal",
          "native-http.db-shm",
          "openrouter.key",
          "openrouter.json",
          "tls.key",
          "tls.crt",
          "tls-request.cnf",
        ].includes(name)
      )
        throw new Error("P5D_HTTP_ROOT_PATH");
      const value = await lstat(path);
      if (
        !value.isFile() ||
        value.isSymbolicLink() ||
        value.nlink !== 1 ||
        value.uid !== process.getuid?.() ||
        (value.mode & 0o7777) !== 0o600
      )
        throw new Error("P5D_HTTP_FILE");
      if (
        (name === "openrouter.key" && value.size !== 32) ||
        (name === "openrouter.json" && value.size > 16_384)
      )
        throw new Error("P5D_HTTP_SECRET_SIZE");
      if (name.startsWith("tls") && value.size > 64 * 1024)
        throw new Error("P5D_HTTP_TLS_SIZE");
      if (name.startsWith("native-http.db")) databases += value.size;
      total += value.size;
    }
    if (databases > 32 * 1024 ** 2 || total > 192 * 1024 ** 2)
      throw new Error("P5D_HTTP_BYTES");
  };
  await fileGuard();
  const tlsKeyFile = join(root, "tls.key");
  const tlsCertificateFile = join(root, "tls.crt");
  const tlsRequestFile = join(root, "tls-request.cnf");
  await createFile(
    tlsRequestFile,
    new TextEncoder().encode(
      [
        "[req]",
        "prompt = no",
        "distinguished_name = subject",
        "x509_extensions = server",
        "[subject]",
        "CN = openrouter.ai",
        "[server]",
        "basicConstraints = critical,CA:TRUE",
        "keyUsage = critical,digitalSignature,keyEncipherment,keyCertSign",
        "extendedKeyUsage = serverAuth",
        "subjectAltName = DNS:openrouter.ai",
        "",
      ].join("\n"),
    ),
  );
  await createFile(tlsKeyFile, new Uint8Array());
  await createFile(tlsCertificateFile, new Uint8Array());
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
      tlsRequestFile,
      "-keyout",
      tlsKeyFile,
      "-out",
      tlsCertificateFile,
    ],
    {
      cwd: root,
      timeout: 10_000,
      killSignal: "SIGKILL",
      maxBuffer: 64 * 1024,
    },
  );
  await fileGuard();
  await createFile(file, new Uint8Array());
  const key = randomBytes(32);
  try {
    await createFile(keyFile, key);
  } finally {
    key.fill(0);
  }
  await createFile(
    configFile,
    new TextEncoder().encode(JSON.stringify({ keyFile })),
  );
  const client = createLibsqlClient({ url: `file:${file}` });
  let stop: (() => Promise<void>) | null = null;
  let endpoint: Awaited<
    ReturnType<typeof createCredentialLocalTlsEndpoint>
  > | null = null;
  const gates: ReturnType<typeof gate>[] = [];
  try {
    await bounded(applyPragmas(client));
    const db = getDatabase(client);
    await bounded(
      migrate(db, {
        migrationsFolder: new URL("../migrations", import.meta.url).pathname,
      }),
      30_000,
    );
    const base = createHollowContainer(db, "http://p5d.fixture.test", {
      send: async () => {},
    });
    const original = base.unitOfWorkProvider;
    const clock = { now: () => new Date(now) };
    async function readTls(name: string) {
      const handle = await open(
        join(fixtureRoot, name),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const before = await handle.stat();
        if (
          !before.isFile() ||
          before.nlink !== 1 ||
          before.uid !== process.getuid?.() ||
          (before.mode & 0o7777) !== 0o600 ||
          before.size > 64 * 1024
        )
          throw new Error("P5D_HTTP_TLS_FILE");
        const bytes = await handle.readFile();
        const after = await handle.stat();
        if (
          bytes.length !== before.size ||
          before.ino !== after.ino ||
          before.size !== after.size ||
          before.mtimeMs !== after.mtimeMs
        )
          throw new Error("P5D_HTTP_TLS_CHANGED");
        return bytes;
      } finally {
        await handle.close();
      }
    }
    const tlsKey = await readTls("tls.key");
    const certificate = await readTls("tls.crt");
    try {
      endpoint = await createCredentialLocalTlsEndpoint({
        key: tlsKey,
        certificate,
        async respond(input) {
          if (
            input.path === "/api/v1/auth/keys" &&
            input.method === "POST" &&
            input.authorization === undefined
          ) {
            const body: unknown = JSON.parse(
              new TextDecoder("utf-8", { fatal: true }).decode(input.body),
            );
            if (
              !body ||
              typeof body !== "object" ||
              !("code" in body) ||
              body.code !== "p5d-self-http-code" ||
              !("code_verifier" in body) ||
              typeof body.code_verifier !== "string" ||
              !/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier) ||
              !("code_challenge_method" in body) ||
              body.code_challenge_method !== "S256"
            )
              throw new Error("P5D_HTTP_EXCHANGE_BODY");
            return {
              body: new TextEncoder().encode(
                JSON.stringify({ key: "p5d-self-http-credential" }),
              ),
            };
          }
          if (
            input.path === "/api/v1/key" &&
            input.method === "GET" &&
            input.body.length === 0 &&
            input.authorization === "Bearer p5d-self-http-credential"
          )
            return {
              body: new TextEncoder().encode(
                JSON.stringify({
                  data: {
                    expires_at: null,
                    creator_user_id: "p5d-self-http-provider",
                  },
                }),
              ),
            };
          throw new Error("P5D_HTTP_ROUTE");
        },
      });
    } finally {
      tlsKey.fill(0);
      certificate.fill(0);
    }
    const ownedEndpoint = endpoint;
    const services = await readNodeOpenRouter(
      configFile,
      base.appUrl,
      clock,
      () =>
        acquireCredentialRuntime(
          ownerDirectory,
          file,
          "openrouter",
          db,
          original,
        ),
      ownedEndpoint.dial,
    );
    if (!services || !ownsCredentials(services.execution))
      throw new Error("P5D_HTTP_NATIVE_FACTORY");
    const execution = services.execution;
    stop = async () => {
      await execution.stop();
      await base.passwordHasher.stop();
    };
    let beforeAdoption: ReturnType<typeof gate> | null = null;
    const provider: HollowUnitOfWorkProvider = {
      async run<T>(fn: (u: HollowUnitOfWorkContext) => Promise<T>): Promise<T> {
        if (beforeAdoption && ownedEndpoint.ledger().requests === 2) {
          const held = beforeAdoption;
          beforeAdoption = null;
          await bounded(ownedEndpoint.settled());
          await held.wait();
        }
        return original.run(fn);
      },
    };
    const nativeContainer: HollowContainer = {
      ...base,
      clock,
      openRouter: services,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    };
    const container: HollowContainer = {
      ...nativeContainer,
      unitOfWorkProvider: provider,
    };
    const passwordHash = await bounded(
      container.passwordHasher.hash("P5d-self-only-password-2026"),
    );
    const guard = async () => {
      try {
        if (failed || closed || performance.now() - started > 180_000)
          throw new Error("P5D_HTTP_FIXTURE_UNAVAILABLE");
        await fileGuard();
        const result = await client.execute(
          "select (select count(*) from accounts) accounts,(select count(*) from auth_browser_contexts) browsers,(select count(*) from openrouter_attempts) attempts,(select count(*) from account_deletion_credential_uses) uses,(select count(*) from notes) notes,(select count(*) from workspaces) workspaces",
        );
        const row = result.rows[0];
        if (
          !row ||
          typeof row.accounts !== "number" ||
          row.accounts > 1 ||
          typeof row.browsers !== "number" ||
          row.browsers > 1 ||
          typeof row.attempts !== "number" ||
          row.attempts > 1 ||
          typeof row.uses !== "number" ||
          row.uses > 1 ||
          row.notes !== 0 ||
          row.workspaces !== 0
        )
          throw new Error("P5D_HTTP_ENTITY_BOUND");
      } catch (error) {
        failed = true;
        throw error;
      }
    };
    await guard();
    return {
      root,
      client,
      container,
      nativeContainer,
      execution,
      guard,
      advance() {
        now = new Date(now.getTime() + 2_001);
      },
      fail() {
        failed = true;
      },
      failed() {
        return failed;
      },
      endpoint: ownedEndpoint,
      holdAdoption() {
        if (beforeAdoption) throw new Error("P5D_HTTP_GATE_ARMED");
        const held = gate();
        gates.push(held);
        beforeAdoption = held;
        return held;
      },
      async account(email: string) {
        await guard();
        const account = verifyAccount(
          createAccount(
            container.idGenerator.next(),
            email,
            passwordHash,
            container.clock.now(),
          ),
          container.clock.now(),
        );
        const browserToken = container.tokens.generate();
        const browser = await ensureAuthenticationBrowser(
          nativeContainer,
          browserToken,
        );
        const session = await original.run(async (u) => {
          await u.accounts.save(account);
          return issueSession(nativeContainer, u.accounts, account, browser);
        });
        await guard();
        return {
          account,
          token: session.token,
          request: { browserToken, sessionToken: session.token },
        };
      },
      async close() {
        if (closed) return;
        for (const held of gates) held.release();
        let stopped = false;
        try {
          await bounded(execution.stop(), 10_000);
          stopped = true;
          await bounded(base.passwordHasher.stop());
          await bounded(ownedEndpoint.close());
          if (!failed) {
            const fk = await bounded(
              client.execute("PRAGMA foreign_key_check"),
            );
            if (fk.rows.length) throw new Error("P5D_HTTP_FOREIGN_KEYS");
            await bounded(client.execute("PRAGMA wal_checkpoint(TRUNCATE)"));
            await fileGuard();
          }
        } finally {
          client.close();
          closed = true;
        }
        if (!failed && stopped)
          process.stdout.write(
            'P5D_HTTP {"event":"fixture-closed","executionStopped":true,"clientClosed":true,"listenerClosed":true}\n',
          );
      },
    };
  } catch (error) {
    for (const held of gates) held.release();
    try {
      if (stop) await bounded(stop(), 10_000);
      if (endpoint) await bounded(endpoint.close());
    } finally {
      client.close();
    }
    throw error;
  }
}
export type NativeHttpFixture = Awaited<
  ReturnType<typeof createNativeHttpFixture>
>;
