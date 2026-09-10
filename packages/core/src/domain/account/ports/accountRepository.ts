import type {
  Account,
  AuthThrottle,
  EmailVerification,
  Session,
} from "../entity";

export interface AccountRepository {
  findByEmail(email: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
  findVerification(tokenHash: string): Promise<EmailVerification | null>;
  saveVerification(verification: EmailVerification): Promise<void>;
  deleteVerifications(accountId: string): Promise<void>;
  findSession(tokenHash: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  findThrottle(key: string): Promise<AuthThrottle | null>;
  saveThrottle(throttle: AuthThrottle): Promise<void>;
  deleteThrottle(key: string): Promise<void>;
}
