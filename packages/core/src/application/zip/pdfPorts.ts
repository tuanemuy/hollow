import type { PdfArtifact, PdfFile } from "@repo/core/domain/pdf/entity";
import type { ZipPdfBinding, ZipPdfHold } from "@repo/core/domain/zip/pdf";
import type { ZipPdfDemand } from "../pdf/demandPorts";

export type ZipPdfProgress = Readonly<{
  demand: ZipPdfDemand;
  hold: ZipPdfHold | null;
}>;
export type ZipPdfCopyClaim = Readonly<{
  demand: ZipPdfDemand;
  hold: ZipPdfHold & { state: "reading" };
  artifact: PdfArtifact & {
    state: "ready" | "cleanup";
    key: string;
    file: PdfFile;
    expiresAt: Date;
    publishedAt: Date;
  };
}>;
export type ZipPdfAttach = Readonly<{
  attemptId: string;
  attemptVersion: number;
  leaseToken: string;
  binding: ZipPdfBinding & { phase: "waiting-pdf" };
}>;

export interface ZipPdfRepository {
  attach(input: ZipPdfAttach, now: Date): Promise<boolean>;
  find(attemptId: string): Promise<ZipPdfProgress | null>;
  findDemand(computeId: string, now: Date): Promise<ZipPdfDemand | null>;
  acquireCached(
    attemptId: string,
    version: number,
    artifactId: string,
    now: Date,
  ): Promise<boolean>;
  publish(computeId: string, artifactId: string, now: Date): Promise<number>;
  claimCopy(
    attemptId: string,
    version: number,
    claim: { token: string; runtimeId: string },
    now: Date,
  ): Promise<ZipPdfCopyClaim | null>;
  beginClose(attemptId: string, token: string | null, now: Date): Promise<void>;
  releaseClosed(
    attemptId: string,
    token: string | null,
    now: Date,
  ): Promise<boolean>;
  detachWaiting(
    attemptId: string,
    version: number,
    now: Date,
  ): Promise<boolean>;
  recover(now: Date): Promise<void>;
  prune(now: Date): Promise<void>;
}
