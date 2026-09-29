import { spawn } from "node:child_process";
import {
  createHash,
  generateKeyPairSync,
  type KeyObject,
  randomUUID,
  sign,
} from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  request,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import { join } from "node:path";
import type {
  DriveExecutionTarget,
  DriveOwnedResult,
} from "@repo/core/application/integration/drive/ports";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { NodeDriveAuthorization } from "./authorization";
import { DriveTransportError, NodeDriveExecution } from "./execution";
import {
  type DriveRequestFactory,
  NodeDriveHttp,
  parseDriveResponseJson,
} from "./http";
import { DRIVE_FOLDER_MARKER, NodeDriveFolderProvider } from "./provider";
import { acquireDriveRuntime } from "./runtimeOwnership";

const root = process.env.DRIVE_S3_TEST_ROOT;
if (
  !root ||
  !root.startsWith("/Users/hikaru/.local/share/hollow/verification/p5c1-s3-")
)
  throw Error("DRIVE_FIXTURE_REQUIRED");
type Reply = (req: IncomingMessage, res: ServerResponse) => void;
const replies: Reply[] = [];
const sockets = new Set<Socket>();
const serverClosures: Promise<void>[] = [];
let count = 0;
let wire = 0;
let active = 0;
let port = 0;
let violation = false;
let keypair: { privateKey: KeyObject; publicKey: KeyObject };
let publicKey = "";
const now = Math.floor(Date.now() / 1000);
const clock = { now: () => new Date(now * 1000) };
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const config = {
  clientId: "synthetic-client",
  clientSecret: "synthetic-secret",
  callbackUrl: "https://hollow.example/auth/drive/callback",
};
const server = createServer((req, res) => {
  const reply = replies.shift();
  if (!reply) {
    violation = true;
    res.writeHead(500).end("{}");
    return;
  }
  reply(req, res);
});
server.on("connection", (socket) => {
  sockets.add(socket);
  serverClosures.push(
    new Promise<void>((resolve) =>
      socket.once("close", () => {
        sockets.delete(socket);
        resolve();
      }),
    ),
  );
});
const factory: DriveRequestFactory = (url, options, response) => {
  if (
    ++count > 55 ||
    active !== 0 ||
    !["www.googleapis.com", "oauth2.googleapis.com"].includes(url.hostname) ||
    url.protocol !== "https:"
  )
    throw Error("DRIVE_REQUEST_BUDGET");
  active++;
  let sock: Socket | undefined;
  const req = request(
    new URL(url.pathname + url.search, `http://127.0.0.1:${port}`),
    { ...options, port, agent: false },
    response,
  );
  req.once("socket", (socket) => {
    sock = socket;
    socket.once("close", () => {
      wire += socket.bytesRead + socket.bytesWritten;
      active--;
      if (wire > 16 * 1024 * 1024) violation = true;
    });
  });
  req.once("close", () => {
    if (!sock) active--;
  });
  return req;
};
function answer(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  replies.push((_req, res) =>
    res
      .writeHead(status, { "content-type": "application/json", ...headers })
      .end(JSON.stringify(data)),
  );
}
function bytes(size: number) {
  replies.push((_req, res) => res.writeHead(200).end("{}".padEnd(size, " ")));
}
function make(deadlines = { operationMs: 2000, closeMs: 200 }, httpMs = 1000) {
  const execution = new NodeDriveExecution(
    "synthetic-runtime",
    undefined,
    deadlines,
  );
  const http = new NodeDriveHttp(execution, factory, httpMs);
  return {
    execution,
    http,
    provider: new NodeDriveFolderProvider(http),
    authorization: new NodeDriveAuthorization(
      config,
      { clock, tokens: { hash, generate: () => "synthetic" } },
      http,
    ),
  };
}
function target(): DriveExecutionTarget {
  return {
    kind: "control",
    id: randomUUID(),
    owner: { runtimeGeneration: "synthetic-runtime", token: randomUUID() },
  };
}
async function owned<T>(
  e: NodeDriveExecution,
  work: (s: AbortSignal) => Promise<T>,
): Promise<DriveOwnedResult<T>> {
  const t = target();
  const out = await e.withCaller(
    t,
    async () => true,
    async () => {
      const handle = e.run(t, work);
      const closed = handle.closed.then(
        () => true,
        () => false,
      );
      const result = await handle.result;
      expect(await closed).toBe(true);
      const proof = e.closure(t);
      expect(proof.kind === "closed").toBe(true);
      if (proof.kind === "closed")
        await e.coordinate("settle", () => e.acknowledge(proof.proof));
      return result;
    },
  );
  expect(out.kind === "settled").toBe(true);
  await e.stop();
  if (out.kind !== "settled") throw Error("DRIVE_CLAIM");
  return out.value;
}
async function fails(
  e: NodeDriveExecution,
  work: (s: AbortSignal) => Promise<unknown>,
) {
  return (await owned(e, work)).kind === "failure";
}
const folder = (extra: Record<string, unknown> = {}) => ({
  id: "synthetic-folder",
  name: "Hollow",
  mimeType: "application/vnd.google-apps.folder",
  trashed: false,
  explicitlyTrashed: false,
  parents: ["synthetic-parent"],
  capabilities: { canAddChildren: true },
  appProperties: { [DRIVE_FOLDER_MARKER]: "synthetic-marker" },
  ...extra,
});
const inspect = {
  accessToken: "synthetic-access",
  fileId: "synthetic-folder",
  resourceKey: null,
};
const token = (jwt: string, extra: Record<string, unknown> = {}) => ({
  access_token: "synthetic-access",
  refresh_token: "synthetic-refresh",
  id_token: jwt,
  scope: "openid email https://www.googleapis.com/auth/drive.file",
  expires_in: 3600,
  token_type: "Bearer",
  ...extra,
});
function jwt(
  extra: Record<string, unknown> = {},
  kid = "synthetic-kid",
  badSignature = false,
) {
  const encoded = [
    { alg: "RS256", kid },
    {
      iss: "https://accounts.google.com",
      aud: config.clientId,
      iat: now - 10,
      exp: now + 300,
      sub: "synthetic-subject",
      nonce: "synthetic-nonce",
      ...extra,
    },
  ]
    .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
    .join(".");
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(encoded),
    keypair.privateKey,
  );
  if (badSignature) signature[0] ^= 1;
  return encoded + "." + signature.toString("base64url");
}
async function exchangeAndVerify(
  svc: ReturnType<typeof make>,
  signal: AbortSignal,
) {
  const tokens = await svc.authorization.exchange({
    code: "synthetic-code",
    verifier: "a".repeat(43),
    signal,
  });
  return svc.authorization.verifyCandidate({
    tokens,
    nonceHash: hash("synthetic-nonce"),
    signal,
  });
}
beforeAll(async () => {
  const st = await lstat(root);
  expect(
    st.isDirectory() && !st.isSymbolicLink() && (st.mode & 0o777) === 0o700,
  ).toBe(true);
  if (
    ["adapter-pure", "adapter-runtime-pure"].includes(
      process.env.DRIVE_S3_MODE ?? "",
    )
  )
    return;
  if (process.env.DRIVE_S3_MODE !== "adapter-close") {
    keypair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privateDer = keypair.privateKey.export({
      type: "pkcs8",
      format: "der",
    });
    const publicDer = keypair.publicKey.export({ type: "spki", format: "der" });
    expect(privateDer.length <= 2048 && publicDer.length <= 512).toBe(true);
    privateDer.fill(0);
    publicKey = keypair.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
  }
  await new Promise<void>((yes) => server.listen(0, "127.0.0.1", yes));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("DRIVE_LISTENER");
  port = address.port;
});
afterEach(() => {
  expect(active === 0 && replies.length === 0 && !violation).toBe(true);
});
afterAll(async () => {
  if (
    ["adapter-pure", "adapter-runtime-pure"].includes(
      process.env.DRIVE_S3_MODE ?? "",
    )
  ) {
    expect(count === 0 && active === 0 && sockets.size === 0).toBe(true);
    return;
  }
  let stage = 0;
  try {
    await new Promise<void>((yes, no) =>
      server.close((e) => (e ? no(Error("DRIVE_CLOSE")) : yes())),
    );
    stage = 1;
    await Promise.all(serverClosures);
    stage = 2;
    expect(
      sockets.size === 0 &&
        active === 0 &&
        count <= 55 &&
        wire <= 16 * 1024 * 1024,
    ).toBe(true);
    stage = 3;
  } finally {
    await writeFile(
      join(
        root,
        process.env.DRIVE_S3_MODE === "adapter-close"
          ? "adapter-close-summary.json"
          : "adapter-http-summary.json",
      ),
      JSON.stringify({
        stage,
        requests: count,
        wireBytes: wire,
        serverClosed: stage >= 1,
        sockets: sockets.size,
        clientActive: active,
        requestBudget: count <= 55,
        wireBudget: wire <= 16 * 1024 * 1024,
      }),
      { flag: "wx", mode: 0o600 },
    );
  }
});
test("family 1 authorization URL only", async () => {
  const svc = make();
  const url = new URL(
    await svc.authorization.authorization({
      state: "synthetic-state",
      nonce: "synthetic-nonce",
      verifier: "a".repeat(43),
      loginHint: null,
      consent: true,
      chooseAccount: true,
    }),
  );
  expect(
    url.origin === "https://accounts.google.com" &&
      url.searchParams.get("access_type") === "offline" &&
      url.searchParams.get("include_granted_scopes") === "true" &&
      url.searchParams.get("prompt") === "consent select_account" &&
      url.searchParams.get("code_challenge_method") === "S256" &&
      url.searchParams.get("redirect_uri") === config.callbackUrl &&
      url.searchParams.get("scope")?.includes("drive.file"),
  ).toBe(true);
});
test("family 2 normal signed identity without email", async () => {
  const svc = make();
  answer(token(jwt()));
  answer({ "synthetic-kid": publicKey });
  const result = await owned(svc.execution, (s) => exchangeAndVerify(svc, s));
  expect(
    result.kind === "value" &&
      result.value.email === null &&
      result.value.subject === "synthetic-subject",
  ).toBe(true);
});
test("family 3 six JWT negative contracts", async () => {
  const variants = [
    { nonce: "wrong" },
    { aud: "wrong" },
    { azp: "wrong" },
    { exp: now - 1 },
    {},
    {},
  ];
  for (let i = 0; i < variants.length; i++) {
    const svc = make();
    answer(
      token(jwt(variants[i], i === 5 ? "unknown" : "synthetic-kid", i === 4)),
    );
    if (i >= 3) answer({ "synthetic-kid": publicKey });
    expect(await fails(svc.execution, (s) => exchangeAndVerify(svc, s))).toBe(
      true,
    );
  }
});
test("family 4 scope and initial refresh absence", async () => {
  for (const missing of ["scope", "refresh"]) {
    const svc = make();
    answer(
      token(
        jwt(),
        missing === "scope"
          ? { scope: "openid" }
          : { refresh_token: undefined },
      ),
    );
    if (missing === "scope") answer({ "synthetic-kid": publicKey });
    const result = await owned(svc.execution, async (signal) => {
      const tokens = await svc.authorization.exchange({
        code: "code",
        verifier: "a".repeat(43),
        signal,
      });
      if (missing === "refresh") return tokens.refreshToken === null;
      return svc.authorization.verifyCandidate({
        tokens,
        nonceHash: hash("synthetic-nonce"),
        signal,
      });
    });
    expect(
      missing === "scope"
        ? result.kind === "failure"
        : result.kind === "value" && result.value === true,
    ).toBe(true);
  }
});
test("family 5 refresh omission and rotation", async () => {
  for (const refresh of [undefined, "rotated"]) {
    const svc = make();
    answer(token(jwt(), { refresh_token: refresh }));
    const result = await owned(svc.execution, (s) =>
      svc.authorization.refresh({ refreshToken: "existing", signal: s }),
    );
    expect(
      result.kind === "value" &&
        result.value.refreshToken === (refresh ?? null) &&
        result.value.accessExpiresAt.getTime() ===
          clock.now().getTime() + 3600000,
    ).toBe(true);
  }
});
test("family 6 credential rejection is endpoint-specific", async () => {
  for (const kind of ["code", "refresh", "resource"]) {
    const svc = make();
    answer({ error: "invalid_grant" }, kind === "resource" ? 401 : 400);
    const result = await owned<unknown>(svc.execution, (s) =>
      kind === "code"
        ? svc.authorization.exchange({
            code: "x",
            verifier: "a".repeat(43),
            signal: s,
          })
        : kind === "refresh"
          ? svc.authorization.refresh({ refreshToken: "x", signal: s })
          : svc.provider.inspectFolder({ ...inspect, signal: s }),
    );
    expect(
      result.kind === "failure" &&
        result.credentialRejection ===
          (kind === "code"
            ? null
            : kind === "refresh"
              ? "refresh-token"
              : "access-token"),
    ).toBe(true);
  }
});
test("family 7 personal and shared folders", async () => {
  for (const driveId of [undefined, "shared-drive"]) {
    const svc = make();
    answer(folder({ driveId }));
    const result = await owned(svc.execution, (s) =>
      svc.provider.inspectFolder({ ...inspect, signal: s }),
    );
    expect(
      result.kind === "value" &&
        result.value.kind === "usable" &&
        result.value.folder.driveId === (driveId ?? null),
    ).toBe(true);
  }
});
test("family 8 resource key and shortcut are bounded single steps", async () => {
  const svc = make();
  let keySeen = false;
  replies.push((req, res) => {
    keySeen =
      req.headers["x-goog-drive-resource-keys"] ===
      "synthetic-folder/synthetic-key";
    res.end(JSON.stringify(folder({ resourceKey: "synthetic-key" })));
  });
  expect(
    (
      await owned(svc.execution, (s) =>
        svc.provider.inspectFolder({
          ...inspect,
          resourceKey: "synthetic-key",
          signal: s,
        }),
      )
    ).kind === "value" && keySeen,
  ).toBe(true);
  for (const shortcut of [true, false]) {
    const next = make();
    answer(
      shortcut
        ? folder({
            mimeType: "application/vnd.google-apps.shortcut",
            shortcutDetails: {
              targetId: "synthetic-folder",
              targetMimeType: "application/vnd.google-apps.folder",
              targetResourceKey: "synthetic-key",
            },
          })
        : folder(),
    );
    const result = await owned(next.execution, (s) =>
      next.provider.inspectFolder({ ...inspect, signal: s }),
    );
    expect(
      result.kind === "value" &&
        result.value.kind === (shortcut ? "shortcut" : "usable"),
    ).toBe(true);
  }
});
test("family 9 trash never implies usable", async () => {
  for (const explicit of [false, true]) {
    const svc = make();
    answer(folder({ trashed: !explicit, explicitlyTrashed: explicit }));
    const r = await owned(svc.execution, (s) =>
      svc.provider.inspectFolder({ ...inspect, signal: s }),
    );
    expect(
      r.kind === "value" &&
        r.value.kind === "trashed" &&
        r.value.explicitly === explicit,
    ).toBe(true);
  }
});
test("family 10 permission ambiguous and transient classifications", async () => {
  const statuses = [403, 404, 429, 403, 503, 0];
  const expected = [
    "access-denied",
    "unavailable-ambiguous",
    "transient",
    "transient",
    "transient",
    "transient",
  ];
  for (let i = 0; i < statuses.length; i++) {
    const svc = make();
    if (statuses[i] === 0) replies.push((req) => req.socket.destroy());
    else
      answer(
        {
          error: {
            errors: [
              { reason: i === 3 ? "userRateLimitExceeded" : "forbidden" },
            ],
          },
        },
        statuses[i],
      );
    const r = await owned(svc.execution, (s) =>
      svc.provider.inspectFolder({ ...inspect, signal: s }),
    );
    expect(r.kind === "value" && r.value.kind === expected[i]).toBe(true);
  }
});
test("family 11 generated ID exactly one", async () => {
  for (const ids of [["one"], ["one", "two"]]) {
    const svc = make();
    answer({ ids });
    const r = await owned(svc.execution, (s) =>
      svc.provider.generateFolderId({ accessToken: "x", signal: s }),
    );
    expect(r.kind === (ids.length === 1 ? "value" : "failure")).toBe(true);
  }
});
test("family 12 create parents omitted and conflict remains distinct", async () => {
  for (const status of [200, 409]) {
    const svc = make();
    let valid = false;
    replies.push((req, res) => {
      let body = "";
      req.on("data", (b) => {
        body += b;
        if (body.length > 16384) violation = true;
      });
      req.on("end", () => {
        const data = JSON.parse(body);
        valid =
          !Object.hasOwn(data, "parents") &&
          data.id === "synthetic-folder" &&
          data.appProperties[DRIVE_FOLDER_MARKER] === "synthetic-marker";
        res
          .writeHead(status)
          .end(
            JSON.stringify(
              status === 200
                ? { id: "synthetic-folder" }
                : { error: { code: 409 } },
            ),
          );
      });
    });
    answer(folder());
    const r = await owned(svc.execution, async (signal) => {
      const created = await svc.provider.createFolder({
        ...inspect,
        marker: "synthetic-marker",
        signal,
      });
      await svc.provider.inspectFolder({ ...inspect, signal });
      return created.kind;
    });
    expect(
      valid &&
        r.kind === "value" &&
        r.value === (status === 200 ? "created" : "conflict"),
    ).toBe(true);
  }
});
test("family 13 response binary bounds", async () => {
  for (const [endpoint, limit] of [
    ["inspect", 65536],
    ["certificates", 262144],
  ] as const) {
    for (const add of [0, 1]) {
      const svc = make();
      bytes(limit + add);
      const r = await owned(svc.execution, (s) =>
        svc.http.read({ endpoint, ...inspect, signal: s }),
      );
      expect(r.kind === (add ? "failure" : "value")).toBe(true);
    }
  }
});
test("family 14 malformed JSON compression and redirect", async () => {
  for (const kind of ["json", "compression", "redirect"]) {
    const svc = make();
    replies.push((_req, res) => {
      res.writeHead(
        kind === "redirect" ? 302 : 200,
        kind === "compression" ? { "content-encoding": "gzip" } : {},
      );
      res.end(kind === "json" ? "{" : "{}");
    });
    expect(
      await fails(svc.execution, (s) =>
        svc.http.read({ endpoint: "certificates", signal: s }),
      ),
    ).toBe(true);
  }
});
test("family 14 pure supplement: duplicate JSON keys and certain status", async () => {
  for (const value of [
    '{"kid":"a","k\\u0069d":"b"}',
    "[".repeat(33) + "0" + "]".repeat(33),
    "{",
  ])
    expect(
      await Promise.resolve()
        .then(() => parseDriveResponseJson(Buffer.from(value), 200))
        .then(
          () => false,
          () => true,
        ),
    ).toBe(true);
  expect(
    typeof parseDriveResponseJson(
      Buffer.from('{"key\\"name":"v","nested":{"key\\"name":"v"}}'),
      200,
    ) === "object",
  ).toBe(true);
  expect(parseDriveResponseJson(Buffer.from("not-json"), 401) === null).toBe(
    true,
  );
  expect(
    await Promise.resolve()
      .then(() => parseDriveResponseJson(Uint8Array.of(255), 401))
      .then(
        () => false,
        () => true,
      ),
  ).toBe(true);
  const svc = make();
  const spy = vi.spyOn(svc.http, "read").mockResolvedValue({
    status: 401,
    data: null,
    cacheControl: null,
    age: null,
  });
  try {
    expect(
      await svc.provider
        .inspectFolder({ ...inspect, signal: new AbortController().signal })
        .then(
          () => false,
          (error: unknown) =>
            error instanceof DriveTransportError &&
            error.credentialRejection === "access-token",
        ),
    ).toBe(true);
    spy.mockResolvedValue({
      status: 400,
      data: null,
      cacheControl: null,
      age: null,
    });
    for (const refresh of [false, true])
      expect(
        await (refresh
          ? svc.authorization.refresh({
              refreshToken: "x",
              signal: new AbortController().signal,
            })
          : svc.authorization.exchange({
              code: "x",
              verifier: "a".repeat(43),
              signal: new AbortController().signal,
            })
        ).then(
          () => false,
          (error: unknown) =>
            error instanceof DriveTransportError &&
            error.credentialRejection === null,
        ),
      ).toBe(true);
  } finally {
    spy.mockRestore();
  }
  const before = count;
  expect(
    await svc.http
      .read({
        endpoint: "inspect",
        fileId: "synthetic-folder",
        accessToken: "bad\nheader",
        signal: new AbortController().signal,
      })
      .then(
        () => false,
        (error: unknown) =>
          error instanceof DriveTransportError && error.delivery === "not-sent",
      ),
  ).toBe(true);
  expect(before === count).toBe(true);
});
test("family 15 truncated response", async () => {
  const svc = make();
  replies.push((_req, res) => {
    res.writeHead(200, { "content-length": "100" });
    res.write("{");
    setTimeout(() => res.destroy(), 5);
  });
  expect(
    await fails(svc.execution, (s) =>
      svc.http.read({ endpoint: "certificates", signal: s }),
    ),
  ).toBe(true);
});
test("family 16 preabort zero request and timeout closes", async () => {
  const svc = make(undefined, 20);
  const before = count;
  const aborted = new AbortController();
  aborted.abort();
  expect(
    await svc.http
      .read({ endpoint: "certificates", signal: aborted.signal })
      .then(
        () => false,
        () => true,
      ),
  ).toBe(true);
  expect(count === before).toBe(true);
  replies.push(() => {});
  expect(
    await fails(svc.execution, (s) =>
      svc.http.read({ endpoint: "certificates", signal: s }),
    ),
  ).toBe(true);
});
test("family 17 body end is not closure proof", async () => {
  const svc = make();
  const t = target();
  let observed = false;
  let socketClosed = false;
  const http = new NodeDriveHttp(svc.execution, (url, options, response) => {
    const req = factory(url, options, (incoming) => {
      incoming.once("end", () => {
        observed = !socketClosed && svc.execution.closure(t).kind !== "closed";
      });
      response(incoming);
    });
    req.once("socket", (socket) =>
      socket.once("close", () => {
        socketClosed = true;
      }),
    );
    return req;
  });
  answer({});
  await svc.execution.withCaller(
    t,
    async () => true,
    async () => {
      const h = svc.execution.run(t, async (signal) => {
        return http.read({ endpoint: "certificates", signal });
      });
      await h.result;
      await h.closed;
      const proof = svc.execution.closure(t);
      expect(observed && socketClosed && proof.kind === "closed").toBe(true);
      if (proof.kind === "closed") await svc.execution.acknowledge(proof.proof);
    },
  );
  await svc.execution.stop();
});
test("family 18 unknown then late real close retains evidence", async () => {
  const svc = make({ operationMs: 20, closeMs: 10 });
  const t = target();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  answer({});
  let failed = false;
  await svc.execution.withCaller(
    t,
    async () => true,
    async () => {
      const h = svc.execution.run(t, async (signal) => {
        await svc.http.read({ endpoint: "certificates", signal });
        await gate;
        return "late";
      });
      const closed = h.closed.then(
        () => false,
        () => true,
      );
      expect((await h.result).kind === "failure").toBe(true);
      failed = await closed;
    },
  );
  expect(
    failed &&
      svc.execution.caller(t) === "ended" &&
      svc.execution.closure(t).kind !== "closed",
  ).toBe(true);
  release();
  await new Promise((r) => setTimeout(r, 1));
  const proof = svc.execution.closure(t);
  expect(proof.kind === "closed" && !svc.execution.accepting()).toBe(true);
  if (proof.kind === "closed") await svc.execution.acknowledge(proof.proof);
  await svc.execution.stop();
});
test("family 19 exact abort and duplicate guard", async () => {
  const svc = make();
  const t = target();
  let entered!: () => void;
  const requested = new Promise<void>((r) => (entered = r));
  replies.push(() => entered());
  await svc.execution.withCaller(
    t,
    async () => true,
    async () => {
      const h = svc.execution.run(t, (s) =>
        svc.http.read({ endpoint: "certificates", signal: s }),
      );
      const closed = h.closed;
      expect(
        await Promise.resolve()
          .then(
            () => {
              svc.execution.run(t, async () => true);
              return false;
            },
            () => false,
          )
          .catch(() => true),
      ).toBe(true);
      await requested;
      svc.execution.abort({
        state: "active",
        runtimeGeneration: t.owner.runtimeGeneration,
        token: "wrong",
      });
      expect(svc.execution.closure(t).kind !== "closed").toBe(true);
      svc.execution.abort({ ...t.owner, state: "active" });
      expect((await h.result).kind === "failure").toBe(true);
      await closed;
      const p = svc.execution.closure(t);
      if (p.kind === "closed") await svc.execution.acknowledge(p.proof);
    },
  );
  await svc.execution.stop();
});
test("family 20 dedicated predecessor actual child close", async () => {
  const directory = join(root, "runtime-fixture-gen2");
  await mkdir(directory, { mode: 0o700 });
  const db = join(root, "synthetic-unused.db");
  const generation = randomUUID();
  const child = spawn(
    process.execPath,
    ["-e", "process.on('message',()=>process.disconnect());"],
    {
      env: { PATH: process.env.PATH },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  let output = 0;
  child.stdout!.on("data", (b) => (output += b.length));
  child.stderr!.on("data", (b) => (output += b.length));
  const closed = new Promise<void>((yes, no) => {
    child.once("error", () => no(Error("DRIVE_CHILD")));
    child.once("close", (code) =>
      code === 0 ? yes() : no(Error("DRIVE_CHILD")),
    );
  });
  await writeFile(
    join(directory, "owner.json"),
    JSON.stringify({
      version: 1,
      runtimeGeneration: generation,
      pid: child.pid,
      predecessors: [],
      databaseBinding: hash(db),
    }),
    { flag: "wx", mode: 0o600 },
  );
  expect(
    await acquireDriveRuntime(directory, db).then(
      () => false,
      () => true,
    ),
  ).toBe(true);
  child.send("stop");
  await closed;
  expect(output === 0 && child.exitCode === 0).toBe(true);
  const ownership = await acquireDriveRuntime(directory, db);
  expect(
    ownership.list().length === 1 &&
      ownership.list()[0]?.runtimeGeneration === generation,
  ).toBe(true);
  const execution = new NodeDriveExecution(
    ownership.runtimeGeneration,
    ownership,
  );
  const old = {
    ...target(),
    owner: { runtimeGeneration: generation, token: randomUUID() },
  };
  expect(!execution.accepting()).toBe(true);
  const proof = execution.closure(old);
  expect(
    proof.kind === "closed" && proof.proof.source === "predecessor-exit",
  ).toBe(true);
  if (proof.kind === "closed") await execution.acknowledge(proof.proof);
  await execution.acknowledgePredecessor(ownership.list()[0]!);
  expect(execution.accepting()).toBe(true);
  await execution.stop();
  expect((await readFile(join(directory, "owner.json"))).length <= 16384).toBe(
    true,
  );
});
test("family 20 pure FS boundary errors retain finite failure and ACK evidence", async () => {
  const directory = "/synthetic-drive-runtime";
  const database = "/synthetic-drive.db";
  for (const lockFailure of [true, false]) {
    let record = JSON.stringify({
      version: 1,
      runtimeGeneration: randomUUID(),
      pid: 1,
      predecessors: [],
      databaseBinding: hash(database),
    });
    let ackFailure = false;
    let lockCloseCalls = 0;
    let unlinks = 0;
    let stage = 0;
    const stat = (isDirectory: boolean) => ({
      dev: 1n,
      ino: isDirectory ? 1n : 2n,
      uid: BigInt(process.getuid?.() ?? 0),
      mode: isDirectory ? 0o700n : 0o600n,
      size: BigInt(Buffer.byteLength(record)),
      mtimeNs: 1n,
      ctimeNs: 1n,
      isFile: () => !isDirectory,
      isDirectory: () => isDirectory,
      isSymbolicLink: () => false,
    });
    const finite = (error: unknown) =>
      error instanceof DriveTransportError &&
      error.code === "DRIVE_UNAVAILABLE" &&
      error.message === "DRIVE_UNAVAILABLE" &&
      !Object.hasOwn(error, "cause") &&
      !Object.hasOwn(error, "path");
    try {
      vi.spyOn(process, "kill").mockImplementation(() => {
        throw Object.assign(Error(), { code: "ESRCH" });
      });
      stage = 1;
      vi.resetModules();
      vi.doMock("node:fs/promises", () => ({
        mkdir: async () => undefined,
        realpath: async () => directory,
        lstat: async (path: string) => stat(String(path) === directory),
        rename: async () => {},
        unlink: async () => {
          unlinks++;
        },
        open: async (path: string) => {
          const name = String(path);
          if (ackFailure && name.endsWith("/owner.json"))
            throw Error("SYNTHETIC_FS_FAILURE");
          return {
            stat: async () => stat(false),
            read: async (buffer: Buffer) => {
              const length = buffer.write(record);
              return { bytesRead: length, buffer };
            },
            writeFile: async (value: string) => {
              record = value;
            },
            sync: async () => {},
            close: async () => {
              if (name.endsWith("/recovery.lock")) {
                lockCloseCalls++;
                if (lockFailure) throw Error("SYNTHETIC_FS_FAILURE");
              }
            },
          };
        },
      }));
      stage = 2;
      const { acquireDriveRuntime: acquire } = await import(
        "./runtimeOwnership"
      );
      const { DriveTransportError: LocalTransportError } = await import(
        "./execution"
      );
      const localFinite = (error: unknown) =>
        error instanceof LocalTransportError &&
        error.code === "DRIVE_UNAVAILABLE" &&
        error.message === "DRIVE_UNAVAILABLE" &&
        !Object.hasOwn(error, "cause") &&
        !Object.hasOwn(error, "path");
      stage = 3;
      if (lockFailure) {
        expect(
          await acquire(directory, database).then(() => false, localFinite),
        ).toBe(true);
        stage = 4;
        expect(lockCloseCalls === 1 && unlinks === 0).toBe(true);
      } else {
        const ownership = await acquire(directory, database);
        stage = 5;
        const proof = ownership.list()[0];
        if (!proof) throw Error("DRIVE_PROOF");
        ackFailure = true;
        expect(
          await ownership.acknowledge(proof).then(() => false, localFinite),
        ).toBe(true);
        stage = 6;
        expect(
          ownership.list().length === 1 &&
            lockCloseCalls === 1 &&
            unlinks === 1,
        ).toBe(true);
      }
    } catch (error) {
      process.stdout.write(
        `DRIVE_SAFE ${JSON.stringify({ stage, lockFailure, lockCloseCalls, unlinks, typeError: error instanceof TypeError, finiteError: finite(error) })}\n`,
      );
      throw error;
    } finally {
      vi.restoreAllMocks();
      vi.doUnmock("node:fs/promises");
      vi.resetModules();
    }
  }
});
test("family 24 stop aborts before caller drain and ACK remains separate", async () => {
  const svc = make();
  const t = target();
  let entered!: () => void;
  const requested = new Promise<void>((r) => (entered = r));
  replies.push(() => entered());
  const caller = svc.execution
    .withCaller(
      t,
      async () => true,
      async () => {
        const h = svc.execution.run(t, (s) =>
          svc.http.read({ endpoint: "certificates", signal: s }),
        );
        await h.result;
        await h.closed;
        throw new DriveTransportError();
      },
    )
    .catch(() => true);
  await requested;
  const stopped = svc.execution.stop();
  await caller;
  await stopped;
  expect(
    svc.execution.caller(t) === "ended" &&
      svc.execution.unacknowledged(66).length === 1,
  ).toBe(true);
  const p = svc.execution.closure(t);
  if (p.kind !== "closed") throw Error("DRIVE_PROOF");
  await svc.execution.acknowledge(p.proof);
  await svc.execution.acknowledge(p.proof);
  expect(svc.execution.unacknowledged(1).length === 0).toBe(true);
});
