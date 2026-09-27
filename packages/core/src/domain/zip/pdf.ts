import { BusinessRuleError } from "../error";

export type ZipContentIdentity = Readonly<{
  kind: "zip-content";
  value: string;
}>;
export type PdfComputeIdentity = Readonly<{
  kind: "pdf-compute";
  value: string;
}>;

function checkedIdentity(value: string): string {
  if (!/^[a-f0-9]{64}$/.test(value))
    throw new BusinessRuleError("ZIP_IDENTITY", "内容の識別値が不正です。");
  return value;
}
export const zipContentIdentity = (value: string): ZipContentIdentity => ({
  kind: "zip-content",
  value: checkedIdentity(value),
});
export const pdfComputeIdentity = (value: string): PdfComputeIdentity => ({
  kind: "pdf-compute",
  value: checkedIdentity(value),
});

export type ZipPdfBinding = Readonly<{
  computeId: string;
  identity: PdfComputeIdentity;
  profile: string;
  externalIdentity: string;
  deadlineAt: Date;
  phase: "waiting-pdf" | "copy-ready" | "copying";
}>;

export type ZipPdfHold = Readonly<{
  attemptId: string;
  artifactId: string;
  artifactGeneration: number;
  acquiredAt: Date;
  version: number;
}> &
  (
    | Readonly<{ state: "held" | "released"; claim: null }>
    | Readonly<{
        state: "reading";
        claim: Readonly<{ token: string; runtimeId: string }>;
      }>
    | Readonly<{
        state: "closing";
        claim: Readonly<{ token: string; runtimeId: string }> | null;
      }>
  );
