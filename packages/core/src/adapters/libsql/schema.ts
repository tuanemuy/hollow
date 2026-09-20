// Shared with the D1 adapter as the single source of truth so the two
// adapters' DDL cannot drift.
export * from "../d1/schema";
export * from "./batchSchema";
export * from "./browseSchema";
export * from "./emptyTrashSchema";
export * from "./exportSchema";
export * from "./hollowSchema";
export * from "./invitationSchema";
export * from "./moveSchema";
export * from "./pdfSchema";
export * from "./publicationSchema";
export * from "./purgeSchema";
export * from "./referenceSchema";
export * from "./revisionSchema";
export * from "./sharingSchema";
export * from "./workspaceDeletionSchema";
export * from "./workspaceIconSchema";
export * from "./workspaceSchema";
