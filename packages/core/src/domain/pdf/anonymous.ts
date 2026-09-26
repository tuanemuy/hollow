export const PDF_ANONYMOUS_TICKET_LIFETIME_MS = 600_000;

export type PdfAnonymousAuthority =
  | Readonly<{
      kind: "public";
      publicId: string;
      urlGeneration: number;
      accessEpoch: number;
    }>
  | Readonly<{
      kind: "link";
      tokenHash: string;
      linkGeneration: number;
      grantEpoch: number;
      proof:
        | Readonly<{ kind: "none" }>
        | Readonly<{ kind: "grant"; verifiedAt: Date; expiresAt: Date }>;
    }>;

export type PdfAnonymousRequest = Readonly<{
  id: string;
  browserHash: string;
  commandId: string;
  inputDigest: string;
  targetNoteId: string;
  sourceIdentity: string;
  profile: string;
  authority: PdfAnonymousAuthority;
  createdAt: Date;
  updatedAt: Date;
  ticketExpiresAt: Date;
  ticketGeneration: number;
  ticketKid: string;
  autoDeliveryId: string | null;
  version: number;
}> &
  (
    | Readonly<{
        state: "queued" | "running";
        liveNoteId: string;
        computeId: string;
        artifactId: null;
        failure: null;
      }>
    | Readonly<{
        state: "succeeded";
        liveNoteId: string | null;
        computeId: string | null;
        artifactId: string;
        failure: null;
      }>
    | Readonly<{
        state: "failed";
        liveNoteId: string | null;
        computeId: string | null;
        artifactId: null;
        failure: string;
      }>
    | Readonly<{
        state: "invalidated" | "expired";
        liveNoteId: string | null;
        computeId: string | null;
        artifactId: string | null;
        failure: null;
      }>
  );

export type PdfAnonymousDelivery = Readonly<{
  id: string;
  requestId: string;
  artifactId: string;
  generation: number;
  createdAt: Date;
  expiresAt: Date;
  nextCleanupAt: Date;
}> &
  (
    | Readonly<{ state: "ready" | "closed"; claimToken: null; runtimeId: null }>
    | Readonly<{
        state: "sending" | "closing";
        claimToken: string;
        runtimeId: string;
      }>
  );
