import type { AuthActor, AuthBrowserBinding } from "../account/authentication";

export const OPENROUTER_ATTEMPT_MS = 10 * 60_000;
export const OPENROUTER_RECEIPT_MS = 24 * 60 * 60_000;
export const OPENROUTER_DEFAULT_TEXT = "google/gemini-3.5-flash-lite";
export const OPENROUTER_DEFAULT_STT = "openai/whisper-large-v3";

export type OpenRouterReturn =
  | Readonly<{ kind: "settings" }>
  | Readonly<{ kind: "upload"; workspaceId: string | null }>;

export type OpenRouterConnection = Readonly<{
  accountId: string;
  epoch: number;
  version: number;
  everLinkedAt: Date | null;
  updatedAt: Date;
}> &
  (
    | Readonly<{
        state: "unlinked";
        credentialEnvelope: null;
        keyExpiresAt: null;
        providerUserId: null;
        linkedAt: null;
        lastUsedAt: null;
      }>
    | Readonly<{
        state: "linked" | "needs_relink";
        credentialEnvelope: string;
        keyExpiresAt: Date | null;
        providerUserId: string | null;
        linkedAt: Date;
        lastUsedAt: Date | null;
      }>
  );

export type OpenRouterFailure =
  | "OPENROUTER_EXPIRED"
  | "OPENROUTER_CONTEXT_CHANGED"
  | "OPENROUTER_EXCHANGE_UNKNOWN"
  | "OPENROUTER_PROVIDER_REJECTED"
  | "OPENROUTER_CANCELLED"
  | "OPENROUTER_CONNECTION_CHANGED";

export type OpenRouterAttempt = Readonly<{
  id: string;
  correlationHash: string;
  actor: AuthActor;
  browser: AuthBrowserBinding;
  expectedEpoch: number;
  expectedVersion: number;
  returnTo: OpenRouterReturn;
  createdAt: Date;
  expiresAt: Date;
  version: number;
}> &
  (
    | Readonly<{ state: "pending"; verifierEnvelope: string }>
    | Readonly<{ state: "exchanging" }>
    | Readonly<{ state: "checking"; candidateEnvelope: string }>
    | Readonly<{
        state: "completed";
        resultEpoch: number;
        firstLink: boolean;
      }>
    | Readonly<{ state: "failed"; failure: OpenRouterFailure }>
  );

export type OpenRouterModelChoice =
  | Readonly<{ kind: "chat-text"; modelId: string }>
  | Readonly<{ kind: "chat-image"; modelId: string }>
  | Readonly<{ kind: "stt-transcription"; modelId: string }>;

export type OpenRouterModelSettings = Readonly<{
  accountId: string;
  version: number;
  defaultsVersion: 1;
  text: OpenRouterModelChoice & Readonly<{ kind: "chat-text" }>;
  image: OpenRouterModelChoice & Readonly<{ kind: "chat-image" }>;
  audio: OpenRouterModelChoice & Readonly<{ kind: "stt-transcription" }>;
  updatedAt: Date;
}>;

export function defaultOpenRouterModels(
  accountId: string,
  now: Date,
): OpenRouterModelSettings {
  return {
    accountId,
    version: 1,
    defaultsVersion: 1,
    text: { kind: "chat-text", modelId: OPENROUTER_DEFAULT_TEXT },
    image: { kind: "chat-image", modelId: OPENROUTER_DEFAULT_TEXT },
    audio: { kind: "stt-transcription", modelId: OPENROUTER_DEFAULT_STT },
    updatedAt: now,
  };
}

export type OpenRouterModel = Readonly<{
  id: string;
  name: string;
  kinds: readonly OpenRouterModelChoice["kind"][];
  expiresAt: Date | null;
}>;

export type OpenRouterAdoptedModel = OpenRouterModel &
  Readonly<{
    adoptionVersion: 1;
    endpoint: "chat-completions" | "audio-transcriptions";
  }>;

export const OPENROUTER_ADOPTED_MODELS: readonly OpenRouterAdoptedModel[] = [
  {
    id: OPENROUTER_DEFAULT_TEXT,
    name: "Gemini 3.5 Flash Lite",
    kinds: ["chat-text", "chat-image"],
    endpoint: "chat-completions",
    adoptionVersion: 1,
    expiresAt: null,
  },
  {
    id: OPENROUTER_DEFAULT_STT,
    name: "Whisper Large V3",
    kinds: ["stt-transcription"],
    endpoint: "audio-transcriptions",
    adoptionVersion: 1,
    expiresAt: null,
  },
];

export function supportsOpenRouterChoice(
  models: readonly OpenRouterModel[],
  choice: OpenRouterModelChoice,
  now: Date,
) {
  return models.some(
    (model) =>
      model.id === choice.modelId &&
      model.kinds.includes(choice.kind) &&
      (model.expiresAt === null || model.expiresAt > now),
  );
}
