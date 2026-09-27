import type {
  OpenRouterAttempt,
  OpenRouterConnection,
  OpenRouterModelSettings,
} from "./openRouter";

export interface OpenRouterConnectionRepository {
  find(accountId: string): Promise<OpenRouterConnection | null>;
  ensure(accountId: string, now: Date): Promise<OpenRouterConnection>;
  replace(
    value: OpenRouterConnection,
    expectedVersion: number,
  ): Promise<boolean>;
}

export interface OpenRouterAttemptRepository {
  find(id: string): Promise<OpenRouterAttempt | null>;
  findByCorrelation(hash: string): Promise<OpenRouterAttempt | null>;
  insert(
    value: OpenRouterAttempt & Readonly<{ state: "pending" }>,
  ): Promise<void>;
  replace(value: OpenRouterAttempt, expectedVersion: number): Promise<boolean>;
  countRecent(browserHash: string, since: Date): Promise<number>;
  countActive(browserHash: string, now: Date): Promise<number>;
  fenceAccount(accountId: string, keepAttemptId: string | null): Promise<void>;
  prune(now: Date, limit: number): Promise<number>;
}

export interface OpenRouterModelSettingsRepository {
  find(accountId: string): Promise<OpenRouterModelSettings | null>;
  insertDefaults(value: OpenRouterModelSettings): Promise<void>;
  replace(
    value: OpenRouterModelSettings,
    expectedVersion: number,
  ): Promise<boolean>;
}
