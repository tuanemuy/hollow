import type {
  AuthBrowserBinding,
  AuthIntent,
  GoogleClaims,
} from "@repo/core/domain/account/authentication";

export type AuthenticationBinding = Readonly<{
  attemptId: string;
  mode: AuthIntent["mode"];
  browser: AuthBrowserBinding;
}>;

export interface AuthenticationSecretProtector {
  available(): boolean;
  protect(value: string, binding: AuthenticationBinding): string;
  reveal(envelope: string, binding: AuthenticationBinding): string;
}

export interface GoogleOidc {
  authorization(
    input: Readonly<{
      state: string;
      nonce: string;
      verifier: string;
      mode: AuthIntent["mode"];
    }>,
  ): Promise<string>;
  exchange(
    input: Readonly<{
      code: string;
      verifier: string;
      nonceHash: string;
      signal: AbortSignal;
    }>,
  ): Promise<GoogleClaims>;
}

export interface AuthenticationExecution {
  run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T>;
  stop(): Promise<void>;
}

export type GoogleAuthentication = Readonly<{
  provider: GoogleOidc;
  protector: AuthenticationSecretProtector;
  execution: AuthenticationExecution;
}>;

export type AuthenticationRequest = Readonly<{
  browserToken: string;
  sessionToken: string | null;
}>;
