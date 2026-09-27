import type { PdfAnonymousRequest } from "@repo/core/domain/pdf/anonymous";
import type { PdfRequest } from "@repo/core/domain/pdf/entity";
import type { ZipRunKey } from "@repo/core/domain/zip/entity";
import type {
  ZipContentIdentity,
  ZipPdfBinding,
} from "@repo/core/domain/zip/pdf";

export type ZipPdfDemand = ZipRunKey &
  Readonly<{
    attemptId: string;
    ordinal: number;
    accountId: string;
    noteId: string;
    zipIdentity: ZipContentIdentity;
    binding: ZipPdfBinding;
  }>;

export type PdfDemand =
  | Readonly<{ kind: "account"; request: PdfRequest }>
  | Readonly<{ kind: "anonymous"; request: PdfAnonymousRequest }>
  | Readonly<{ kind: "zip-child"; demand: ZipPdfDemand }>;

export interface PdfDemandRepository {
  find(computeId: string, now: Date): Promise<PdfDemand | null>;
  running(computeId: string, now: Date): Promise<void>;
  succeed(computeId: string, artifactId: string, now: Date): Promise<number>;
  fail(computeId: string, failure: string, now: Date): Promise<void>;
}
