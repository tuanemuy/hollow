import type {
  AuthContinuation,
  Invitation,
  InvitationReceipt,
} from "../invitation";

export interface InvitationRepository {
  find(id: string): Promise<Invitation | null>;
  byToken(hash: string): Promise<Invitation | null>;
  byEmail(workspaceId: string, email: string): Promise<Invitation | null>;
  list(
    workspaceId: string,
    after: string | undefined,
    limit: number,
  ): Promise<readonly Invitation[]>;
  save(row: Invitation): Promise<void>;
  archive(row: Invitation, now: Date): Promise<void>;
  receipt(
    actorId: string,
    requestId: string,
  ): Promise<InvitationReceipt | null>;
  saveReceipt(row: InvitationReceipt): Promise<void>;
  rate(
    workspaceId: string,
    actorId: string,
    now: Date,
  ): Promise<{ workspace: number; actor: number }>;
  countSend(
    id: string,
    workspaceId: string,
    actorId: string,
    now: Date,
  ): Promise<void>;
  continuation(id: string): Promise<AuthContinuation | null>;
  saveContinuation(row: AuthContinuation): Promise<void>;
  invalidateIssuer(
    workspaceId: string,
    actorId: string,
    now: Date,
  ): Promise<void>;
  claim(now: Date, token: string, until: Date): Promise<Invitation | null>;
  expireAndPrune(now: Date, limit: number): Promise<void>;
}
