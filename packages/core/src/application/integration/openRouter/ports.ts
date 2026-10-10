import type { AuthBrowserBinding } from "@repo/core/domain/account/authentication";

export type {
  CredentialClosedProof,
  OwnedCredentialExecution,
} from "../../account/ports";
export { ownsCredentials } from "../../account/ports";

import type {
  OpenRouterAdoptedModel,
  OpenRouterModel,
} from "@repo/core/domain/integration/openRouter";
import { ApplicationError, type SerializedSystemError } from "../../errors";

export interface OpenRouterWaitingReadPort {
  list(
    accountId: string,
    afterId: string | undefined,
    limit: number,
  ): Promise<
    Readonly<{
      items: readonly Readonly<{ id: string; title: string }>[];
      total: number;
      next: string | null;
    }>
  >;
}

export type OpenRouterSecretBinding =
  | Readonly<{
      purpose: "verifier" | "candidate";
      accountId: string;
      attemptId: string;
      browser: AuthBrowserBinding;
    }>
  | Readonly<{
      purpose: "credential";
      accountId: string;
      epoch: number;
    }>;

export interface OpenRouterSecretProtector {
  available(): boolean;
  protect(value: string, binding: OpenRouterSecretBinding): string;
  reveal(value: string, binding: OpenRouterSecretBinding): string;
}

export interface OpenRouterAuthorization {
  authorization(
    input: Readonly<{ correlation: string; verifier: string }>,
  ): Promise<string>;
  exchange(
    input: Readonly<{ code: string; verifier: string; signal: AbortSignal }>,
  ): Promise<string>;
  inspectCredential(
    input: Readonly<{ credential: string; signal: AbortSignal }>,
  ): Promise<
    Readonly<{
      expiresAt: Date | null;
      providerUserId: string | null;
    }>
  >;
}

export interface OpenRouterCatalog {
  list(signal: AbortSignal): Promise<readonly OpenRouterModel[]>;
  fallback(): readonly OpenRouterAdoptedModel[];
}

export interface OpenRouterControlExecution {
  run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T>;
  stop(): Promise<void>;
}

export type OpenRouterServices = Readonly<{
  authorization: OpenRouterAuthorization;
  catalog: OpenRouterCatalog;
  protector: OpenRouterSecretProtector;
  execution: OpenRouterControlExecution;
}>;

const providerErrorBrand = Symbol.for("hollow.openrouter-provider-error.v1");

export class OpenRouterProviderError extends ApplicationError<
  | "OPENROUTER_PROVIDER_REJECTED"
  | "OPENROUTER_CREDENTIAL_INVALID"
  | "OPENROUTER_UNAVAILABLE"
> {
  readonly [providerErrorBrand] = true;
  override readonly name = "OpenRouterProviderError";
  constructor(code: OpenRouterProviderError["code"]) {
    super(
      code,
      code === "OPENROUTER_CREDENTIAL_INVALID"
        ? "OpenRouterの鍵を確認できません。再連携してください。"
        : "OpenRouterとの通信を確認できません。手続きを確認してください。",
    );
  }
  override toSerialized(): SerializedSystemError {
    return {
      kind: "system",
      code: this.code,
      message: this.message,
      retryable: false,
    };
  }
}

export function isOpenRouterProviderError(
  error: unknown,
): error is Error & Pick<OpenRouterProviderError, "code"> {
  return (
    error instanceof Error &&
    providerErrorBrand in error &&
    error[providerErrorBrand] === true &&
    "code" in error &&
    (error.code === "OPENROUTER_PROVIDER_REJECTED" ||
      error.code === "OPENROUTER_CREDENTIAL_INVALID" ||
      error.code === "OPENROUTER_UNAVAILABLE")
  );
}
