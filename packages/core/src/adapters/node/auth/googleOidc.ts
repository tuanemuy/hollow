import { createHash } from "node:crypto";
import type { GoogleOidc } from "@repo/core/application/account/ports";
import type { Clock } from "@repo/core/application/ports/clock";
import type { TokenGenerator } from "@repo/core/application/ports/tokenGenerator";
import {
  GOOGLE_ISSUER,
  type GoogleClaims,
  googleSubject,
} from "@repo/core/domain/account/authentication";
import { accountEmail } from "@repo/core/domain/account/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { type GoogleRequestFactory, NodeGoogleHttp } from "./googleHttp";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TIMEOUT_MS = 10_000;
const CACHE_MS = 6 * 60 * 60_000;
type Configuration = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}>;
type CertificateSet = Readonly<{
  values: Record<string, string>;
  expiresAt: number | null;
}>;
type Failure =
  | "AUTH_PROVIDER_REJECTED"
  | "AUTH_EXCHANGE_UNKNOWN"
  | "AUTH_UNVERIFIED";
const failure = (code: Failure) =>
  new BusinessRuleError(
    code,
    "Google認証を確認できませんでした。新しい認証からやり直してください。",
  );
const jwtHeader = z.object({
  alg: z.literal("RS256"),
  kid: z.string().min(1).max(256),
});
const jwtClaims = z.object({
  iss: z.enum([GOOGLE_ISSUER, "accounts.google.com"]),
  aud: z.string(),
  azp: z.string().optional(),
  iat: z.number().int().safe().nonnegative(),
  exp: z.number().int().safe().positive(),
  sub: z.string(),
  email: z.string(),
  email_verified: z.literal(true),
  nonce: z.string().min(1),
  hd: z.string().trim().min(1).optional(),
});

function segment(value: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw failure("AUTH_UNVERIFIED");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) throw failure("AUTH_UNVERIFIED");
  return JSON.parse(decoded.toString("utf8"));
}

export class NodeGoogleOidc implements GoogleOidc {
  private readonly client: OAuth2Client;
  private readonly http: NodeGoogleHttp;
  private cached: CertificateSet | null = null;
  private refreshing: Promise<CertificateSet> | null = null;

  constructor(
    private readonly config: Configuration,
    private readonly deps: Readonly<{ clock: Clock; tokens: TokenGenerator }>,
    transportOptions: Readonly<{ requestFactory?: GoogleRequestFactory }> = {},
  ) {
    this.http = new NodeGoogleHttp(transportOptions.requestFactory);
    this.client = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      endpoints: { oauth2AuthBaseUrl: AUTH_URL },
    });
  }

  async authorization(input: Parameters<GoogleOidc["authorization"]>[0]) {
    try {
      if (
        !/^[A-Za-z0-9._~-]{43,128}$/.test(input.verifier) ||
        !input.state ||
        !input.nonce
      )
        throw failure("AUTH_PROVIDER_REJECTED");
      const url = this.client.generateAuthUrl({
        response_type: "code",
        scope: ["openid", "email", "profile"],
        access_type: "online",
        state: input.state,
        code_challenge_method: CodeChallengeMethod.S256,
        code_challenge: createHash("sha256")
          .update(input.verifier)
          .digest("base64url"),
        prompt: "select_account",
      });
      const result = new URL(url);
      result.searchParams.set("nonce", input.nonce);
      return result.href;
    } catch {
      throw failure("AUTH_PROVIDER_REJECTED");
    }
  }

  private async certificates(
    kid: string,
    signal: AbortSignal,
  ): Promise<CertificateSet> {
    if (
      this.cached &&
      this.cached.expiresAt !== null &&
      this.cached.expiresAt > this.deps.clock.now().getTime() &&
      Object.hasOwn(this.cached.values, kid)
    )
      return this.cached;
    if (!this.refreshing) {
      this.refreshing = this.loadCertificates(signal);
      void this.refreshing.catch(() => {});
    }
    const pending = this.refreshing;
    try {
      const result = await pending;
      signal.throwIfAborted();
      if (
        (result.expiresAt !== null &&
          result.expiresAt <= this.deps.clock.now().getTime()) ||
        !Object.hasOwn(result.values, kid)
      )
        throw failure("AUTH_UNVERIFIED");
      return result;
    } finally {
      if (this.refreshing === pending) this.refreshing = null;
    }
  }

  private async loadCertificates(signal: AbortSignal): Promise<CertificateSet> {
    const response = await this.http.read("certificates", null, signal);
    signal.throwIfAborted();
    const values = z
      .record(z.string().min(1).max(256), z.string().min(1))
      .parse(response.data);
    if (Object.keys(values).length < 1 || Object.keys(values).length > 32)
      throw failure("AUTH_UNVERIFIED");
    const control = response.cacheControl;
    const ageHeader = response.age;
    const match = /(?:^|,)\s*max-age\s*=\s*(\d+)\s*(?:,|$)/i.exec(
      control ?? "",
    );
    const age =
      ageHeader === null
        ? 0
        : typeof ageHeader === "string" && /^\d+$/.test(ageHeader)
          ? Number(ageHeader)
          : Number.NaN;
    const maxAge = match ? Number(match[1]) : Number.NaN;
    if (
      control === null ||
      /(?:^|,)\s*(?:no-store|no-cache)\b/i.test(control) ||
      !Number.isSafeInteger(age) ||
      !Number.isSafeInteger(maxAge) ||
      age < 0 ||
      maxAge <= age
    ) {
      this.cached = null;
      return { values, expiresAt: null };
    }
    const expiresAt =
      this.deps.clock.now().getTime() +
      Math.min(CACHE_MS, (maxAge - age) * 1000);
    const cached = { values, expiresAt };
    this.cached = cached;
    return cached;
  }

  async exchange(
    input: Parameters<GoogleOidc["exchange"]>[0],
  ): Promise<GoogleClaims> {
    let stage: Failure = "AUTH_PROVIDER_REJECTED";
    const controller = new AbortController();
    const abort = () => controller.abort();
    input.signal.addEventListener("abort", abort, { once: true });
    if (input.signal.aborted) abort();
    const timer = setTimeout(abort, TIMEOUT_MS);
    const signal = controller.signal;
    try {
      signal.throwIfAborted();
      if (
        !input.code ||
        Buffer.byteLength(input.code) > 4096 ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(input.verifier)
      )
        throw failure(stage);
      stage = "AUTH_EXCHANGE_UNKNOWN";
      const response = await this.http.read(
        "token",
        new URLSearchParams({
          code: input.code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: "authorization_code",
          code_verifier: input.verifier,
        }).toString(),
        signal,
      );
      signal.throwIfAborted();
      stage = "AUTH_UNVERIFIED";
      const token = z
        .object({ id_token: z.string().min(1) })
        .parse(response.data).id_token;
      if (Buffer.byteLength(token) > 16 * 1024) throw failure(stage);
      const parts = token.split(".");
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2])
        throw failure(stage);
      const header = jwtHeader.parse(segment(parts[0]));
      const claims = jwtClaims.parse(segment(parts[1]));
      if (
        claims.aud !== this.config.clientId ||
        (claims.azp !== undefined && claims.azp !== this.config.clientId) ||
        this.deps.tokens.hash(claims.nonce) !== input.nonceHash
      )
        throw failure(stage);
      const certs = await this.certificates(header.kid, signal);
      await this.client.verifySignedJwtWithCertsAsync(
        token,
        certs.values,
        this.config.clientId,
        [GOOGLE_ISSUER, "accounts.google.com"],
      );
      signal.throwIfAborted();
      const now = this.deps.clock.now().getTime();
      const issuedAt = claims.iat * 1000;
      const expiresAt = claims.exp * 1000;
      if (
        !Number.isSafeInteger(issuedAt) ||
        !Number.isSafeInteger(expiresAt) ||
        issuedAt > now ||
        expiresAt <= now ||
        expiresAt <= issuedAt ||
        (certs.expiresAt !== null && certs.expiresAt <= now)
      )
        throw failure(stage);
      const email = accountEmail(claims.email);
      return {
        issuer: GOOGLE_ISSUER,
        subject: googleSubject(claims.sub),
        email,
        authoritative:
          email.split("@")[1] === "gmail.com" || claims.hd !== undefined,
        issuedAt: new Date(issuedAt),
        expiresAt: new Date(expiresAt),
      };
    } catch {
      throw failure(stage);
    } finally {
      controller.abort();
      clearTimeout(timer);
      input.signal.removeEventListener("abort", abort);
    }
  }
}
