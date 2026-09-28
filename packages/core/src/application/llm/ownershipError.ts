const brand = Symbol.for("hollow.llm-object-ownership-error.v1");
export class LlmObjectOwnershipUnprovenError extends Error {
  readonly [brand] = true;
  readonly code = "LLM_OWNERSHIP_UNKNOWN";
  readonly owner: Readonly<{
    kind: "conversion-job" | "llm-pdf-preview";
    id: string;
  }>;
  constructor(
    jobId: string,
    kind: "conversion-job" | "llm-pdf-preview" = "conversion-job",
  ) {
    super(
      "変換処理の実終了を確認できません。所有状態を確認するまで保全します。",
    );
    this.name = "LlmObjectOwnershipUnprovenError";
    this.owner = { kind, id: jobId };
  }
}
export function isLlmObjectOwnershipUnprovenError(
  error: unknown,
): error is LlmObjectOwnershipUnprovenError {
  return (
    error instanceof Error &&
    brand in error &&
    error[brand] === true &&
    "code" in error &&
    error.code === "LLM_OWNERSHIP_UNKNOWN" &&
    "owner" in error &&
    typeof error.owner === "object" &&
    error.owner !== null &&
    "kind" in error.owner &&
    (error.owner.kind === "conversion-job" ||
      error.owner.kind === "llm-pdf-preview") &&
    "id" in error.owner &&
    typeof error.owner.id === "string" &&
    error.owner.id.length > 0
  );
}
