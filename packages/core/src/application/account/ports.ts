import type {
  AuthBrowserBinding,
  AuthIntent,
  GoogleClaims,
} from "@repo/core/domain/account/authentication";
import type {
  CredentialUse,
  CredentialUseBinding,
  CredentialUseTarget,
} from "@repo/core/domain/account/deletion";

export type CredentialClosedProof = Readonly<{
  target: CredentialUseTarget;
  evidenceId: string;
  source: "local-close" | "predecessor-exit";
}>;
export interface OwnedCredentialExecution {
  readonly credentialOwnership: "native-v1";
  readonly provider: "google" | "openrouter";
  supportsProvider(provider: object): boolean;
  target(
    id: string,
    binding: CredentialUseBinding,
    token: string,
  ): CredentialUseTarget;
  runOwned<T>(
    target: CredentialUseTarget,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
  closure(target: CredentialUseTarget): CredentialClosedProof | null;
  verify(proof: CredentialClosedProof, saved: CredentialUse): boolean;
  acknowledge(proof: CredentialClosedProof): Promise<void>;
  cancelUnclaimed(proof: CredentialClosedProof): Promise<boolean>;
  unacknowledged(): readonly CredentialClosedProof[];
  recoverableRuntimeIds(): readonly string[];
  predecessor(saved: CredentialUse): CredentialClosedProof | null;
  acknowledgePredecessors(
    remainingRuntimeIds: readonly string[],
  ): Promise<void>;
}
export function ownsCredentials(
  value: AuthenticationExecution,
): value is AuthenticationExecution & OwnedCredentialExecution {
  return (
    "credentialOwnership" in value &&
    value.credentialOwnership === "native-v1" &&
    "provider" in value &&
    (value.provider === "google" || value.provider === "openrouter") &&
    "supportsProvider" in value &&
    typeof value.supportsProvider === "function" &&
    "target" in value &&
    typeof value.target === "function" &&
    "runOwned" in value &&
    typeof value.runOwned === "function" &&
    "closure" in value &&
    typeof value.closure === "function" &&
    "verify" in value &&
    typeof value.verify === "function" &&
    "acknowledge" in value &&
    typeof value.acknowledge === "function" &&
    "cancelUnclaimed" in value &&
    typeof value.cancelUnclaimed === "function" &&
    "unacknowledged" in value &&
    typeof value.unacknowledged === "function" &&
    "recoverableRuntimeIds" in value &&
    typeof value.recoverableRuntimeIds === "function" &&
    "predecessor" in value &&
    typeof value.predecessor === "function" &&
    "acknowledgePredecessors" in value &&
    typeof value.acknowledgePredecessors === "function"
  );
}

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
