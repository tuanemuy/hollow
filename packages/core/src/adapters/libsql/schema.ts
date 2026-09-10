// Shared with the D1 adapter as the single source of truth so the two
// adapters' DDL cannot drift.
export * from "../d1/schema";
export * from "./emptyTrashSchema";
export * from "./hollowSchema";
export * from "./invitationSchema";
export * from "./purgeSchema";
export * from "./referenceSchema";
export * from "./revisionSchema";
export * from "./workspaceSchema";
