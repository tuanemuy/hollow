import type { AuthChallenge, GoogleAttempt } from "../authentication";

export interface GoogleAuthAttemptRepository {
  find(id: string): Promise<GoogleAttempt | null>;
  findByState(stateHash: string): Promise<GoogleAttempt | null>;
  insert(
    attempt: GoogleAttempt & Readonly<{ state: "pending" }>,
  ): Promise<void>;
  replace(attempt: GoogleAttempt, expectedVersion: number): Promise<boolean>;
  countRecent(browserHash: string, since: Date): Promise<number>;
  countActive(browserHash: string, now: Date): Promise<number>;
  prune(now: Date, limit: number): Promise<number>;
}

export interface AccountChallengeRepository {
  find(tokenHash: string): Promise<AuthChallenge | null>;
  nextGeneration(
    accountId: string,
    purpose: AuthChallenge["purpose"],
  ): Promise<number>;
  insert(challenge: AuthChallenge): Promise<void>;
  consume(tokenHash: string, now: Date): Promise<boolean>;
  prune(now: Date, limit: number): Promise<number>;
}
