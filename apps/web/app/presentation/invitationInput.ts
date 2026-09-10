import { z } from "zod";
export const invitationSelectionSchema = z
  .object({
    id: z.uuid(),
    generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export const invitationAuthSearchSchema = z
  .object({
    invitation: z.boolean().optional().catch(undefined),
    invitationId: z.uuid().optional(),
    invitationGeneration: z.number().int().positive().optional(),
  })
  .refine(
    (v) =>
      (v.invitationId === undefined) === (v.invitationGeneration === undefined),
    "招待の指定を確認してください。",
  );
export function invitationSelection(search: {
  invitationId?: string | undefined;
  invitationGeneration?: number | undefined;
}) {
  return search.invitationId && search.invitationGeneration
    ? { id: search.invitationId, generation: search.invitationGeneration }
    : undefined;
}
export function invitationDestination(selection?: {
  id: string;
  generation: number;
}) {
  return selection
    ? `/invitations?invitationId=${encodeURIComponent(selection.id)}&invitationGeneration=${selection.generation}`
    : "/invitations";
}

export const workspaceRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const workspaceSettingsReadSchema = z
  .object({
    workspaceId: z.uuid(),
    cursor: z.string().min(1).max(2048).optional(),
  })
  .strict();
export const workspaceSettingsUpdateSchema = z
  .object({
    workspaceId: z.uuid(),
    settingsVersion: z.number().int().nonnegative(),
    name: z.string().max(400),
    description: z.string().max(8000),
    slug: z.string().max(63).optional(),
  })
  .strict();
export const workspaceMemberChangeSchema = z
  .object({
    workspaceId: z.uuid(),
    accountId: z.uuid(),
    role: workspaceRoleSchema.nullable(),
    expectedRole: workspaceRoleSchema,
    ownerConfirmed: z.boolean(),
  })
  .strict();
export const workspaceLeaveSchema = z
  .object({ workspaceId: z.uuid() })
  .strict();
export const invitationIssueSchema = z
  .object({
    workspaceId: z.uuid(),
    emails: z.array(z.email().max(254)).min(1).max(10),
    role: workspaceRoleSchema,
    ownerConfirmed: z.boolean(),
    requestId: z.uuid(),
  })
  .strict();
export const invitationResendSchema = z
  .object({
    workspaceId: z.uuid(),
    id: z.uuid(),
    requestId: z.uuid(),
    ownerConfirmed: z.boolean(),
  })
  .strict();
export const invitationGenerationSchema = z
  .object({
    workspaceId: z.uuid(),
    id: z.uuid(),
    generation: z.number().int().positive(),
  })
  .strict();

export function invitationEmails(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}
