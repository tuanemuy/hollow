import type {
  PdfAnonymousDelivery,
  PdfAnonymousRequest,
} from "@repo/core/domain/pdf/anonymous";
import type { PdfRequest } from "@repo/core/domain/pdf/entity";

export type PdfAnonymousTicketClaims = Readonly<{
  v: 1;
  purpose: "hollow-anonymous-pdf-v1";
  kid: string;
  requestId: string;
  ticketGeneration: number;
  issuedAt: number;
  expiresAt: number;
  browserHash: string;
  authorityDigest: string;
}>;

export interface PdfAnonymousTicketSigner {
  activeKeyId(): string | null;
  sign(claims: PdfAnonymousTicketClaims): string;
  verify(ticket: string): PdfAnonymousTicketClaims | null;
}

export interface PdfAnonymousRequestRepository {
  find(id: string): Promise<PdfAnonymousRequest | null>;
  findCommand(
    browserHash: string,
    commandId: string,
  ): Promise<PdfAnonymousRequest | null>;
  insert(request: PdfAnonymousRequest): Promise<void>;
  consumeAuto(
    id: string,
    deliveryId: string,
    version: number,
  ): Promise<boolean>;
  invalidateNote(noteId: string, now: Date): Promise<void>;
  sweep(now: Date): Promise<void>;
  prune(now: Date): Promise<void>;
}

export type PdfDemand =
  | Readonly<{ kind: "account"; request: PdfRequest }>
  | Readonly<{ kind: "anonymous"; request: PdfAnonymousRequest }>;

export interface PdfDemandRepository {
  find(computeId: string, now: Date): Promise<PdfDemand | null>;
  running(computeId: string, now: Date): Promise<void>;
  succeed(computeId: string, artifactId: string, now: Date): Promise<number>;
  fail(computeId: string, failure: string, now: Date): Promise<void>;
}

export interface PdfAnonymousDeliveryRepository {
  find(id: string): Promise<PdfAnonymousDelivery | null>;
  begin(delivery: PdfAnonymousDelivery, now: Date): Promise<void>;
  claim(
    id: string,
    browserHash: string,
    token: string,
    runtimeId: string,
    now: Date,
  ): Promise<PdfAnonymousDelivery | null>;
  close(id: string, token: string | null): Promise<boolean>;
  expireReady(now: Date): Promise<void>;
  recover(now: Date): Promise<void>;
}
