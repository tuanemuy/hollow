import { createHash } from "node:crypto";
import {
  isOpenRouterProviderError,
  type OpenRouterAuthorization,
  type OpenRouterCatalog,
  OpenRouterProviderError,
} from "@repo/core/application/integration/openRouter/ports";
import type { Clock } from "@repo/core/application/ports/clock";
import {
  OPENROUTER_ADOPTED_MODELS,
  type OpenRouterModel,
  type OpenRouterModelChoice,
} from "@repo/core/domain/integration/openRouter";
import { z } from "zod";
import { NodeOpenRouterHttp, type OpenRouterRequestFactory } from "./http";

const unavailable = () => new OpenRouterProviderError("OPENROUTER_UNAVAILABLE");
const invalid = () =>
  new OpenRouterProviderError("OPENROUTER_CREDENTIAL_INVALID");
const rejected = () =>
  new OpenRouterProviderError("OPENROUTER_PROVIDER_REJECTED");
const verifierSchema = z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/);
const credentialSchema = z
  .string()
  .min(1)
  .max(64 * 1024)
  .regex(/^[\x21-\x7e]+$/);
const modelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  architecture: z.object({
    input_modalities: z.array(z.string()),
    output_modalities: z.array(z.string()),
  }),
  expiration_date: z.string().nullable().optional(),
});
const pageSchema = z.object({
  data: z.array(modelSchema).max(500),
  total_count: z.number().int().min(0).max(5000),
  links: z.object({ next: z.string().nullable().optional() }),
});

function date(value: string): Date {
  if (
    !z.union([z.iso.date(), z.iso.datetime({ offset: true })]).safeParse(value)
      .success
  )
    throw unavailable();
  const result = new Date(value);
  if (
    !Number.isFinite(result.getTime()) ||
    (value.length === 10 && result.toISOString().slice(0, 10) !== value)
  )
    throw unavailable();
  return result;
}

function nextOffset(next: string, expected: number): void {
  const url = new URL(next, "https://openrouter.ai");
  if (
    url.origin !== "https://openrouter.ai" ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname !== "/api/v1/models"
  )
    throw unavailable();
  const allowed = new Set(["offset", "limit", "output_modalities"]);
  for (const key of url.searchParams.keys())
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1)
      throw unavailable();
  if (
    url.searchParams.get("offset") !== String(expected) ||
    url.searchParams.get("limit") !== "500" ||
    url.searchParams.get("output_modalities") !== "all"
  )
    throw unavailable();
}

export class NodeOpenRouterProvider
  implements OpenRouterAuthorization, OpenRouterCatalog
{
  private readonly callback: string;
  private readonly http: NodeOpenRouterHttp;
  private cache: Readonly<{
    until: number;
    models: readonly OpenRouterModel[];
  }> | null = null;

  constructor(
    appUrl: string,
    private readonly clock: Clock,
    requestFactory?: OpenRouterRequestFactory,
  ) {
    const callback = new URL("/auth/openrouter/callback", appUrl);
    if (
      !["https:", "http:"].includes(callback.protocol) ||
      callback.username ||
      callback.password
    )
      throw unavailable();
    this.callback = callback.href;
    this.http = new NodeOpenRouterHttp(requestFactory);
  }

  async authorization(
    input: Parameters<OpenRouterAuthorization["authorization"]>[0],
  ): Promise<string> {
    try {
      const verifier = verifierSchema.parse(input.verifier);
      if (!/^[A-Za-z0-9_-]{43}$/.test(input.correlation)) throw rejected();
      const callback = new URL(this.callback);
      callback.searchParams.set("correlation", input.correlation);
      const url = new URL("https://openrouter.ai/auth");
      url.searchParams.set("callback_url", callback.href);
      url.searchParams.set(
        "code_challenge",
        createHash("sha256").update(verifier).digest("base64url"),
      );
      url.searchParams.set("code_challenge_method", "S256");
      return url.href;
    } catch {
      throw rejected();
    }
  }

  private async operation<T>(
    signal: AbortSignal,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    const timer = setTimeout(abort, 10_000);
    try {
      if (controller.signal.aborted) throw unavailable();
      const result = await work(controller.signal);
      if (controller.signal.aborted) throw unavailable();
      return result;
    } catch (error) {
      if (!controller.signal.aborted && isOpenRouterProviderError(error))
        throw new OpenRouterProviderError(error.code);
      throw unavailable();
    } finally {
      clearTimeout(timer);
      controller.abort();
      signal.removeEventListener("abort", abort);
    }
  }

  exchange(
    input: Parameters<OpenRouterAuthorization["exchange"]>[0],
  ): Promise<string> {
    return this.operation(input.signal, async (signal) => {
      if (
        !input.code ||
        Buffer.byteLength(input.code) > 4096 ||
        !verifierSchema.safeParse(input.verifier).success
      )
        throw rejected();
      const result = await this.http.read(
        {
          kind: "exchange",
          body: JSON.stringify({
            code: input.code,
            code_verifier: input.verifier,
            code_challenge_method: "S256",
          }),
        },
        signal,
      );
      return z.object({ key: credentialSchema }).parse(result.data).key;
    });
  }

  inspectCredential(
    input: Parameters<OpenRouterAuthorization["inspectCredential"]>[0],
  ): ReturnType<OpenRouterAuthorization["inspectCredential"]> {
    return this.operation(input.signal, async (signal) => {
      if (!credentialSchema.safeParse(input.credential).success)
        throw invalid();
      const result = await this.http.read(
        { kind: "metadata", credential: input.credential },
        signal,
      );
      const value = z
        .object({
          data: z.object({
            expires_at: z.string().nullable().optional(),
            creator_user_id: z.string().min(1).nullable().optional(),
          }),
        })
        .parse(result.data).data;
      const expiresAt =
        value.expires_at == null ? null : date(value.expires_at);
      if (expiresAt && expiresAt <= this.clock.now()) throw invalid();
      return { expiresAt, providerUserId: value.creator_user_id ?? null };
    });
  }

  list(signal: AbortSignal): Promise<readonly OpenRouterModel[]> {
    return this.operation(signal, async (currentSignal) => {
      if (this.cache && this.cache.until > this.clock.now().getTime())
        return this.cache.models;
      const models: OpenRouterModel[] = [];
      const seen = new Set<string>();
      let offset = 0;
      let bytes = 0;
      let total: number | null = null;
      for (let page = 0; page < 20; page++) {
        const response = await this.http.read(
          { kind: "models", offset, remainingBytes: 8 * 1024 * 1024 - bytes },
          currentSignal,
        );
        bytes += response.bytes;
        const result = pageSchema.parse(response.data);
        if (total !== null && total !== result.total_count) throw unavailable();
        total = result.total_count;
        if (
          offset + result.data.length > total ||
          (result.data.length === 0 && offset < total)
        )
          throw unavailable();
        for (const model of result.data) {
          if (seen.has(model.id)) throw unavailable();
          seen.add(model.id);
          const kinds: OpenRouterModelChoice["kind"][] = [];
          const inputs = model.architecture.input_modalities;
          const outputs = model.architecture.output_modalities;
          if (outputs.includes("text") && inputs.includes("text"))
            kinds.push("chat-text");
          if (outputs.includes("text") && inputs.includes("image"))
            kinds.push("chat-image");
          if (outputs.includes("transcription") && inputs.includes("audio"))
            kinds.push("stt-transcription");
          models.push({
            id: model.id,
            name: model.name,
            kinds,
            expiresAt:
              model.expiration_date == null
                ? null
                : date(model.expiration_date),
          });
        }
        offset += result.data.length;
        if (offset === total) {
          if (result.links.next != null) throw unavailable();
          this.cache = {
            until: this.clock.now().getTime() + 15 * 60_000,
            models,
          };
          return models;
        }
        if (!result.links.next) throw unavailable();
        nextOffset(result.links.next, offset);
      }
      throw unavailable();
    });
  }

  fallback() {
    const now = this.clock.now();
    return OPENROUTER_ADOPTED_MODELS.flatMap((adopted) => {
      if (adopted.expiresAt !== null && adopted.expiresAt <= now) return [];
      if (!this.cache) return [adopted];
      const latest = this.cache.models.find((model) => model.id === adopted.id);
      if (!latest || (latest.expiresAt !== null && latest.expiresAt <= now))
        return [];
      const kinds = adopted.kinds.filter((kind) => latest.kinds.includes(kind));
      return kinds.length
        ? [{ ...adopted, kinds, expiresAt: latest.expiresAt }]
        : [];
    });
  }
}
