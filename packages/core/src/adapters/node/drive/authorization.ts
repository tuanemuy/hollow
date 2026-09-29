import { createHash, createPublicKey } from "node:crypto";
import type {
  DriveAuthorization,
  DriveTokenSet,
} from "@repo/core/application/integration/drive/ports";
import type { Clock } from "@repo/core/application/ports/clock";
import type { TokenGenerator } from "@repo/core/application/ports/tokenGenerator";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import type { NodeDriveConfig } from "./config";
import { DriveTransportError } from "./execution";
import type { NodeDriveHttp } from "./http";

const scope = "https://www.googleapis.com/auth/drive.file";
const invalid = () => new DriveTransportError("DRIVE_UNVERIFIED");
const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive().safe(),
  refresh_token: z.string().min(1).optional(),
  id_token: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
});
function segment(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw invalid();
  const b = Buffer.from(value, "base64url");
  if (b.toString("base64url") !== value) throw invalid();
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(b),
  ) as unknown;
}
export class NodeDriveAuthorization implements DriveAuthorization {
  private cached: { keys: Record<string, string>; expires: number } | null =
    null;
  private fetched = new WeakSet<AbortSignal>();
  private client: OAuth2Client;
  constructor(
    private readonly config: Pick<
      NodeDriveConfig,
      "clientId" | "clientSecret" | "callbackUrl"
    >,
    private readonly deps: { clock: Clock; tokens: TokenGenerator },
    private readonly http: NodeDriveHttp,
  ) {
    this.client = new OAuth2Client({ clientId: config.clientId });
  }
  async authorization(
    input: Parameters<DriveAuthorization["authorization"]>[0],
  ) {
    if (
      !/^[A-Za-z0-9._~-]{43,128}$/.test(input.verifier) ||
      !input.state ||
      !input.nonce ||
      Buffer.byteLength(input.state) > 4096 ||
      Buffer.byteLength(input.nonce) > 4096 ||
      (input.loginHint !== null && Buffer.byteLength(input.loginHint) > 320)
    )
      throw invalid();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      response_type: "code",
      scope: `openid email ${scope}`,
      access_type: "offline",
      include_granted_scopes: "true",
      state: input.state,
      nonce: input.nonce,
      code_challenge_method: "S256",
      code_challenge: createHash("sha256")
        .update(input.verifier)
        .digest("base64url"),
    }).toString();
    const prompt = [
      input.consent ? "consent" : "",
      input.chooseAccount ? "select_account" : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (prompt) url.searchParams.set("prompt", prompt);
    if (input.loginHint) url.searchParams.set("login_hint", input.loginHint);
    return url.href;
  }
  exchange(input: Parameters<DriveAuthorization["exchange"]>[0]) {
    if (
      !input.code ||
      Buffer.byteLength(input.code) > 4096 ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(input.verifier)
    )
      return Promise.reject(invalid());
    return this.token(
      {
        grant_type: "authorization_code",
        code: input.code,
        code_verifier: input.verifier,
        redirect_uri: this.config.callbackUrl,
      },
      input.signal,
      false,
    );
  }
  refresh(input: Parameters<DriveAuthorization["refresh"]>[0]) {
    if (!input.refreshToken || Buffer.byteLength(input.refreshToken) > 16_384)
      return Promise.reject(invalid());
    return this.token(
      { grant_type: "refresh_token", refresh_token: input.refreshToken },
      input.signal,
      true,
    );
  }
  private async token(
    fields: Record<string, string>,
    signal: AbortSignal,
    refresh: boolean,
  ): Promise<DriveTokenSet> {
    const response = await this.http.read({
      endpoint: "token",
      signal,
      body: new URLSearchParams({
        ...fields,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });
    if (response.status !== 200) {
      const error = z.object({ error: z.string() }).safeParse(response.data);
      throw new DriveTransportError(
        "DRIVE_PROVIDER_REJECTED",
        "unknown",
        refresh &&
          response.status === 400 &&
          error.success &&
          error.data.error === "invalid_grant"
          ? "refresh-token"
          : null,
      );
    }
    const parsed = tokenSchema.safeParse(response.data);
    if (!parsed.success) throw invalid();
    const t = parsed.data;
    const expires = this.deps.clock.now().getTime() + t.expires_in * 1000;
    if (
      !Number.isSafeInteger(expires) ||
      !Number.isFinite(new Date(expires).getTime())
    )
      throw invalid();
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token ?? null,
      idToken: t.id_token ?? null,
      scope: t.scope ?? null,
      accessExpiresAt: new Date(expires),
    };
  }
  private async certificates(kid: string, signal: AbortSignal) {
    if (
      this.cached &&
      this.cached.expires > this.deps.clock.now().getTime() &&
      Object.hasOwn(this.cached.keys, kid)
    )
      return this.cached.keys;
    if (this.fetched.has(signal)) throw invalid();
    this.fetched.add(signal);
    const reply = await this.http.read({ endpoint: "certificates", signal });
    if (reply.status !== 200) throw invalid();
    const parsed = z
      .record(
        z.string().min(1).max(256),
        z
          .string()
          .min(1)
          .refine((s) => Buffer.byteLength(s) <= 32_768),
      )
      .safeParse(reply.data);
    if (
      !parsed.success ||
      Object.keys(parsed.data).length < 1 ||
      Object.keys(parsed.data).length > 32
    )
      throw invalid();
    for (const pem of Object.values(parsed.data))
      if (createPublicKey(pem).asymmetricKeyType !== "rsa") throw invalid();
    const match = /(?:^|,)\s*max-age\s*=\s*(\d+)\s*(?:,|$)/i.exec(
      reply.cacheControl ?? "",
    );
    const age =
      reply.age === null
        ? 0
        : /^\d+$/.test(reply.age)
          ? Number(reply.age)
          : Number.NaN;
    const max = match ? Number(match[1]) : Number.NaN;
    this.cached = null;
    if (
      reply.cacheControl &&
      !/(?:^|,)\s*(?:no-store|no-cache)\b/i.test(reply.cacheControl) &&
      Number.isSafeInteger(age) &&
      Number.isSafeInteger(max) &&
      age >= 0 &&
      max > age
    )
      this.cached = {
        keys: parsed.data,
        expires:
          this.deps.clock.now().getTime() +
          Math.min(21_600_000, (max - age) * 1000),
      };
    if (!Object.hasOwn(parsed.data, kid)) throw invalid();
    return parsed.data;
  }
  async verifyCandidate(
    input: Parameters<DriveAuthorization["verifyCandidate"]>[0],
  ) {
    try {
      const jwt = input.tokens.idToken;
      if (!jwt || Buffer.byteLength(jwt) > 16_384) throw invalid();
      const parts = jwt.split(".");
      if (parts.length !== 3) throw invalid();
      const header = z
        .object({ alg: z.literal("RS256"), kid: z.string().min(1).max(256) })
        .parse(segment(parts[0]!));
      const claims = z
        .object({
          iss: z.enum(["https://accounts.google.com", "accounts.google.com"]),
          aud: z.string(),
          azp: z.string().optional(),
          iat: z.number().int().safe().nonnegative(),
          exp: z.number().int().safe().positive(),
          sub: z.string().min(1).max(255),
          nonce: z.string().min(1),
          email: z.string().email().max(320).optional(),
          at_hash: z.string().optional(),
        })
        .parse(segment(parts[1]!));
      const signature = Buffer.from(parts[2]!, "base64url");
      if (!signature.length || signature.toString("base64url") !== parts[2])
        throw invalid();
      if (
        claims.aud !== this.config.clientId ||
        (claims.azp !== undefined && claims.azp !== this.config.clientId) ||
        this.deps.tokens.hash(claims.nonce) !== input.nonceHash
      )
        throw invalid();
      const keys = await this.certificates(header.kid, input.signal);
      await this.client.verifySignedJwtWithCertsAsync(
        jwt,
        keys,
        this.config.clientId,
        ["https://accounts.google.com", "accounts.google.com"],
      );
      const now = this.deps.clock.now().getTime();
      if (
        input.signal.aborted ||
        !Number.isSafeInteger(claims.iat * 1000) ||
        !Number.isSafeInteger(claims.exp * 1000) ||
        claims.iat * 1000 > now ||
        claims.exp * 1000 <= now ||
        claims.exp <= claims.iat
      )
        throw invalid();
      if (
        claims.at_hash !== undefined &&
        claims.at_hash !==
          createHash("sha256")
            .update(input.tokens.accessToken)
            .digest()
            .subarray(0, 16)
            .toString("base64url")
      )
        throw invalid();
      const scopes = [
        ...new Set(input.tokens.scope?.split(/\s+/).filter(Boolean) ?? []),
      ];
      if (
        scopes.length > 32 ||
        scopes.some((s) => Buffer.byteLength(s) > 256) ||
        !scopes.includes("openid") ||
        !scopes.includes(scope)
      )
        throw new DriveTransportError("DRIVE_SCOPE_REQUIRED");
      return { subject: claims.sub, email: claims.email ?? null, scopes };
    } catch (error) {
      if (error instanceof DriveTransportError) throw error;
      throw invalid();
    }
  }
}
