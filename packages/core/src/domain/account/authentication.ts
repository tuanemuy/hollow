import { BusinessRuleError } from "../error";

export const GOOGLE_ISSUER = "https://accounts.google.com";
export const AUTH_ATTEMPT_MS = 10 * 60_000;
export const AUTH_REAUTH_MS = 5 * 60_000;
export const PASSWORD_RESET_MS = 60 * 60_000;

export type GoogleIdentity = Readonly<{
  issuer: typeof GOOGLE_ISSUER;
  subject: string;
  linkedAt: Date;
}>;

export type AuthenticationMethods =
  | Readonly<{ passwordHash: string; google: GoogleIdentity | null }>
  | Readonly<{ passwordHash: null; google: GoogleIdentity }>;

export type AuthBrowserBinding = Readonly<{
  hash: string;
  epoch: number;
}>;

export type AuthReturn =
  | Readonly<{ kind: "notes" }>
  | Readonly<{ kind: "methods" }>
  | Readonly<{ kind: "note"; id: string }>
  | Readonly<{
      kind: "invitation";
      selector: string;
      continuation: string;
    }>;

export type GoogleClaims = Readonly<{
  issuer: typeof GOOGLE_ISSUER;
  subject: string;
  email: string;
  authoritative: boolean;
  issuedAt: Date;
  expiresAt: Date;
}>;

export type AuthActor = Readonly<{
  accountId: string;
  sessionHash: string;
  authVersion: number;
}>;

export type AuthIntent =
  | Readonly<{ mode: "login"; actor: AuthActor | null }>
  | Readonly<{ mode: "link" | "reauth"; actor: AuthActor }>;

export type GoogleAttemptState =
  | Readonly<{
      state: "pending" | "exchanging";
      verifierEnvelope: string;
    }>
  | Readonly<{
      state: "verified" | "proof-required";
      claims: GoogleClaims;
      targetAccountId: string | null;
      targetAuthVersion: number | null;
    }>
  | Readonly<{
      state: "reauth-ready";
      claims: GoogleClaims;
      proofHash: string;
      proofExpiresAt: Date;
    }>
  | Readonly<{
      state: "completed";
      resultAccountId: string;
    }>
  | Readonly<{ state: "failed"; failure: AuthFailure }>;

export type AuthFailure =
  | "AUTH_EXPIRED"
  | "AUTH_CONTEXT_CHANGED"
  | "AUTH_EXCHANGE_UNKNOWN"
  | "AUTH_PROVIDER_REJECTED"
  | "AUTH_UNVERIFIED"
  | "AUTH_CONFLICT";

export type GoogleAttempt = Readonly<{
  id: string;
  stateHash: string;
  nonceHash: string;
  browser: AuthBrowserBinding;
  returnTo: AuthReturn;
  createdAt: Date;
  expiresAt: Date;
  version: number;
}> &
  AuthIntent &
  GoogleAttemptState;

export type AuthChallenge = Readonly<{
  tokenHash: string;
  accountId: string;
  authVersion: number;
  email: string;
  generation: number;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}> &
  (
    | Readonly<{ purpose: "reset" }>
    | Readonly<{
        purpose: "google-link";
        attemptId: string;
        subject: string;
        browser: AuthBrowserBinding;
      }>
  );

export function googleSubject(value: string): string {
  if (
    value.length < 1 ||
    value.length > 255 ||
    /\s/u.test(value) ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    throw new BusinessRuleError(
      "AUTH_SUBJECT",
      "認証情報を確認できませんでした。",
    );
  }
  return value;
}

export function sameAuthBrowser(
  a: AuthBrowserBinding,
  b: AuthBrowserBinding,
): boolean {
  return a.hash === b.hash && a.epoch === b.epoch;
}
