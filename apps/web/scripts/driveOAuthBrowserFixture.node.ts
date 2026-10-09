import { isIP } from "node:net";

const args = process.argv.slice(2);
const endpoint = new URL(args[args.indexOf("--cdp") + 1] ?? "");
const origin = new URL(args[args.indexOf("--origin") + 1] ?? "");
if (
  !args.includes("--cdp") ||
  !args.includes("--origin") ||
  endpoint.protocol !== "ws:" ||
  endpoint.hostname !== "127.0.0.1" ||
  origin.protocol !== "http:" ||
  origin.hostname !== "127.0.0.1" ||
  !origin.port ||
  !isIP(origin.hostname) ||
  endpoint.username ||
  endpoint.password ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw Error("Use an owned loopback CDP endpoint and application origin");
const socket = new WebSocket(endpoint.href);
let sequence = 0;
const pending = new Map<
  number,
  { resolve(value: unknown): void; reject(): void }
>();
const sessions = new Set<string>();
const attached = new Set<string>();
function send(method: string, params: object = {}, sessionId?: string) {
  return new Promise<unknown>((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, {
      resolve,
      reject: () => reject(Error("Owned browser fixture CDP command failed")),
    });
    socket.send(
      JSON.stringify({
        id,
        method,
        params,
        ...(sessionId ? { sessionId } : {}),
      }),
    );
  });
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid browser fixture CDP response");
  return value as Record<string, unknown>;
}
async function attach(targetId: string) {
  if (attached.has(targetId)) return;
  attached.add(targetId);
  const result = record(
    await send("Target.attachToTarget", { targetId, flatten: true }),
  );
  if (typeof result.sessionId !== "string")
    throw Error("Browser fixture session missing");
  sessions.add(result.sessionId);
  await send(
    "Fetch.enable",
    {
      patterns: [
        {
          urlPattern: "https://accounts.google.com/*",
          requestStage: "Request",
        },
      ],
    },
    result.sessionId,
  );
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? "",
  );
async function paused(params: Record<string, unknown>, sessionId: string) {
  if (typeof params.requestId !== "string")
    throw Error("Browser fixture request missing");
  const request = record(params.request);
  let consent: URL | null = null;
  if (typeof request.url === "string") {
    const url = new URL(request.url);
    if (
      url.origin === "https://accounts.google.com" &&
      url.pathname === "/o/oauth2/v2/auth" &&
      request.method === "GET"
    ) {
      const value = url.searchParams.get("fixtureConsent");
      if (value) {
        const candidate = new URL(value);
        if (
          candidate.origin === origin.origin &&
          candidate.pathname === "/__fixture/drive/consent" &&
          !candidate.hash &&
          !candidate.username &&
          !candidate.password &&
          [...candidate.searchParams.keys()].every((key) => key === "grant") &&
          /^[A-Za-z0-9_-]{32}$/.test(candidate.searchParams.get("grant") ?? "")
        )
          consent = candidate;
      }
    }
  }
  if (!consent) {
    await send(
      "Fetch.failRequest",
      { requestId: params.requestId, errorReason: "BlockedByClient" },
      sessionId,
    );
    console.log("Blocked non-fixture Google authorization request");
    return;
  }
  const body = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escapeHtml(consent.href)}"><title>Local Drive OAuth fixture</title><a href="${escapeHtml(consent.href)}">ローカル同意画面へ</a></html>`;
  await send(
    "Fetch.fulfillRequest",
    {
      requestId: params.requestId,
      responseCode: 200,
      responseHeaders: [
        { name: "Content-Type", value: "text/html; charset=utf-8" },
        { name: "Cache-Control", value: "no-store" },
      ],
      body: Buffer.from(body).toString("base64"),
    },
    sessionId,
  );
  console.log("Fulfilled owned Drive OAuth fixture before external send");
}
let failure = false;
socket.addEventListener("message", (event) => {
  void (async () => {
    const message = record(JSON.parse(String(event.data)));
    if (typeof message.id === "number") {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callback?.reject();
      else callback?.resolve(message.result);
    } else if (
      message.method === "Fetch.requestPaused" &&
      typeof message.sessionId === "string"
    ) {
      await paused(record(message.params), message.sessionId);
    } else if (message.method === "Target.targetCreated") {
      const target = record(record(message.params).targetInfo);
      if (target.type === "page" && typeof target.targetId === "string")
        await attach(target.targetId);
    }
  })().catch(() => {
    failure = true;
    socket.close();
  });
});
await new Promise<void>((resolve, reject) => {
  socket.addEventListener("open", () => resolve(), { once: true });
  socket.addEventListener(
    "error",
    () => reject(Error("Owned browser fixture connection failed")),
    { once: true },
  );
});
await send("Target.setDiscoverTargets", { discover: true });
const targets = record(await send("Target.getTargets"));
if (!Array.isArray(targets.targetInfos))
  throw Error("Owned browser fixture targets missing");
for (const target of targets.targetInfos) {
  const value = record(target);
  if (value.type === "page" && typeof value.targetId === "string")
    await attach(value.targetId);
}
console.log("Owned Drive OAuth interception ready");
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await Promise.all(
    [...sessions].map((session) =>
      send("Fetch.disable", {}, session).catch(() => {}),
    ),
  );
  socket.close();
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void stop();
  });
await new Promise<void>((resolve) =>
  socket.addEventListener("close", () => resolve(), { once: true }),
);
for (const value of pending.values()) value.reject();
if (failure) throw Error("Owned Drive OAuth interception failed");
