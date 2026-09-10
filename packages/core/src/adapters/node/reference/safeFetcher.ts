import dns from "node:dns/promises";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import type { SafeReferenceFetcher } from "@repo/core/application/ports/referenceProcessor";
import { BusinessRuleError } from "@repo/core/domain/error";
import ipaddr from "ipaddr.js";

const messages = {
  REFERENCE_URL: "外部参照 URL の形式・接続先ポートを許可できません。",
  REFERENCE_PRIVATE: "内部・特殊ネットワークへの外部参照を拒否しました。",
  REFERENCE_DNS: "外部参照の接続先を確認できませんでした。",
  REFERENCE_TIMEOUT: "外部参照の取得が制限時間を超えました。",
  REFERENCE_CANCELLED: "外部参照の取得を中止しました。",
  REFERENCE_REDIRECT: "外部参照のリダイレクトが上限を超えたか、不正です。",
  REFERENCE_ENCODING: "圧縮された外部参照の応答には対応していません。",
  REFERENCE_SIZE: "外部参照の取得サイズが上限を超えました。",
  REFERENCE_FETCH: "外部参照を取得できませんでした。",
} as const;
type Code = keyof typeof messages;
const failure = (code: Code) => new BusinessRuleError(code, messages[code]);

function normalize(input: string): URL {
  if (input.length > 8192) throw failure("REFERENCE_URL");
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw failure("REFERENCE_URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname
  )
    throw failure("REFERENCE_URL");
  url.hash = "";
  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (
    !isIP(hostname) &&
    (!hostname.includes(".") ||
      /(?:^|\.)(?:localhost|local|internal|home\.arpa)$/.test(hostname))
  )
    throw failure("REFERENCE_PRIVATE");
  return url;
}

function publicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

async function approve(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literal = isIP(hostname);
  const answers = literal
    ? [{ address: hostname, family: literal }]
    : await dns.lookup(hostname, { all: true, verbatim: true }).catch(() => {
        throw failure("REFERENCE_DNS");
      });
  if (
    !answers.length ||
    answers.some(
      (answer) =>
        !publicAddress(answer.address) ||
        isIP(answer.address) !== answer.family,
    )
  )
    throw failure("REFERENCE_PRIVATE");
  const first = answers[0];
  if (!first || (first.family !== 4 && first.family !== 6))
    throw failure("REFERENCE_DNS");
  return { address: first.address, family: first.family };
}

function deadline(signal?: AbortSignal, timeoutMs = 30_000) {
  const controller = new AbortController();
  const cancel = () => controller.abort(failure("REFERENCE_CANCELLED"));
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(
    () => controller.abort(failure("REFERENCE_TIMEOUT")),
    timeoutMs,
  );
  timer.unref();
  return {
    signal: controller.signal,
    finish: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    },
  };
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    void promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

export class NodeSafeReferenceFetcher implements SafeReferenceFetcher {
  async inspect(input: string, options?: { signal?: AbortSignal }) {
    const clock = deadline(options?.signal);
    try {
      const url = normalize(input);
      await abortable(approve(url), clock.signal);
      return { url: url.href, allowed: true, reason: null };
    } catch (error) {
      return {
        url: input,
        allowed: false,
        reason:
          error instanceof BusinessRuleError ? error.code : "REFERENCE_DNS",
      };
    } finally {
      clock.finish();
    }
  }

  async inspectMany(
    inputs: readonly string[],
    options?: { signal?: AbortSignal | undefined },
  ) {
    const urls = [...new Set(inputs)];
    const clock = deadline(options?.signal, 5000);
    const results = urls.map((url) => ({
      url,
      allowed: false,
      reason: "REFERENCE_TIMEOUT" as string | null,
    }));
    let cursor = 0;
    try {
      await Promise.all(
        Array.from({ length: Math.min(8, urls.length) }, async () => {
          while (!clock.signal.aborted && cursor < Math.min(200, urls.length)) {
            const index = cursor++;
            const url = urls[index];
            if (url === undefined) break;
            const result = await this.inspect(url, { signal: clock.signal });
            results[index] = clock.signal.aborted
              ? { url, allowed: false, reason: "REFERENCE_TIMEOUT" }
              : result;
          }
        }),
      );
      for (let index = 200; index < results.length; index++) {
        const result = results[index];
        if (result) result.reason = "REFERENCE_RESOURCE_LIMIT";
      }
      if (
        clock.signal.aborted &&
        clock.signal.reason instanceof BusinessRuleError
      )
        for (const result of results)
          if (result.reason === "REFERENCE_TIMEOUT")
            result.reason = clock.signal.reason.code;
      return results;
    } finally {
      clock.finish();
    }
  }

  async fetch(
    input: string,
    options: { maxBytes: number; signal?: AbortSignal },
  ) {
    if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1)
      throw failure("REFERENCE_SIZE");
    const clock = deadline(options.signal);
    try {
      let url = normalize(input);
      for (let redirects = 0; redirects <= 5; redirects++) {
        const ticket = await abortable(approve(url), clock.signal);
        clock.signal.throwIfAborted();
        const response = await new Promise<IncomingMessage>(
          (resolve, reject) => {
            const requestOptions: http.RequestOptions & {
              autoSelectFamily: boolean;
            } = {
              agent: false,
              autoSelectFamily: false,
              signal: clock.signal,
              headers: { "accept-encoding": "identity" },
              lookup(_hostname, _options, callback) {
                callback(null, ticket.address, ticket.family);
              },
            };
            const request = (url.protocol === "https:" ? https : http).request(
              url,
              requestOptions,
              resolve,
            );
            request.on("error", () =>
              reject(
                clock.signal.aborted
                  ? clock.signal.reason
                  : failure("REFERENCE_FETCH"),
              ),
            );
            request.end();
          },
        );
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
          const location = response.headers.location;
          response.destroy();
          if (!location || redirects === 5) throw failure("REFERENCE_REDIRECT");
          try {
            url = normalize(new URL(location, url).href);
          } catch (error) {
            if (error instanceof BusinessRuleError) throw error;
            throw failure("REFERENCE_REDIRECT");
          }
          continue;
        }
        if (response.statusCode !== 200) {
          response.destroy();
          throw failure("REFERENCE_FETCH");
        }
        if (
          response.headers["content-encoding"] &&
          response.headers["content-encoding"].toLowerCase() !== "identity"
        ) {
          response.destroy();
          throw failure("REFERENCE_ENCODING");
        }
        const declared = response.headers["content-length"];
        if (
          declared &&
          (!/^\d+$/.test(declared) || Number(declared) > options.maxBytes)
        ) {
          response.destroy();
          throw failure("REFERENCE_SIZE");
        }
        let bytes = 0;
        let finished = false;
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const fail = (error: unknown) => {
              if (finished) return;
              finished = true;
              controller.error(error);
              response.destroy();
              clock.finish();
            };
            const abort = () => fail(clock.signal.reason);
            clock.signal.addEventListener("abort", abort, { once: true });
            response.on("data", (chunk: Buffer) => {
              if (finished) return;
              bytes += chunk.byteLength;
              if (bytes > options.maxBytes) {
                fail(failure("REFERENCE_SIZE"));
                return;
              }
              controller.enqueue(Uint8Array.from(chunk));
              if ((controller.desiredSize ?? 0) <= 0) response.pause();
            });
            response.once("error", () =>
              fail(
                clock.signal.aborted
                  ? clock.signal.reason
                  : failure("REFERENCE_FETCH"),
              ),
            );
            response.once("aborted", () =>
              fail(
                clock.signal.aborted
                  ? clock.signal.reason
                  : failure("REFERENCE_FETCH"),
              ),
            );
            response.once("end", () => {
              if (finished) return;
              finished = true;
              controller.close();
              clock.signal.removeEventListener("abort", abort);
              clock.finish();
            });
            if (clock.signal.aborted) abort();
          },
          pull() {
            response.resume();
          },
          cancel() {
            finished = true;
            response.destroy();
            clock.finish();
          },
        });
        return {
          body,
          finalUrl: url.href,
          contentType:
            response.headers["content-type"] ?? "application/octet-stream",
        };
      }
      throw failure("REFERENCE_REDIRECT");
    } catch (error) {
      clock.finish();
      throw error;
    }
  }
}
