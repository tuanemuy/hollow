import { z } from "zod";

export const scopeSearchSchema = z.object({ workspaceId: z.uuid().optional() });
export const workspaceListSchema = z
  .object({ cursor: z.string().min(1).max(2048).optional() })
  .strict();
export const scopedNotesSchema = workspaceListSchema.extend({
  workspaceId: z.uuid().optional(),
});
export const workspaceSlugSchema = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(63)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/),
  })
  .strict();
export const workspaceCreateSchema = z
  .object({
    name: z.string().max(400),
    description: z.string().max(8000),
    slug: z.string().max(63).optional(),
  })
  .strict();
export const scopeViewSchema = z.object({
  workspaceId: z.uuid().nullable(),
  name: z.string(),
  canEdit: z.boolean(),
  iconId: z.string().uuid().nullable().optional(),
});
export type WorkspaceScopeView = z.infer<typeof scopeViewSchema>;
export type ScopeUsage = {
  usedBytes: number;
  limitBytes: number;
  updatedAt: string;
};
const reservedSlugs = new Set([
  "admin",
  "api",
  "auth",
  "settings",
  "new",
  "edit",
  "trash",
  "notes",
  "workspaces",
  "assets",
  "static",
  "help",
]);

export function workspaceInputProblem(
  name: string,
  description: string,
  slug: string,
): string | null {
  const length = Array.from(name.trim()).length;
  if (!length || length > 100)
    return "名前は空白を除いて1〜100文字にしてください。";
  if (Array.from(description.trim()).length > 2000)
    return "説明は2,000文字以内にしてください。";
  if (
    slug &&
    (!workspaceSlugSchema.safeParse({ slug }).success ||
      reservedSlugs.has(slug))
  )
    return "識別名は3〜63文字の英小文字・数字・内部のハイフンにしてください。予約語は使えません。";
  return null;
}
export function scopeSearch(workspaceId?: string | null) {
  return workspaceId ? { workspaceId } : {};
}
export function scopeReadIdentity(
  workspaceId?: string | null,
  cursor?: string | null,
): string {
  return JSON.stringify([workspaceId ?? null, cursor ?? null]);
}
export function acceptsWorkspaceResponse(
  current: { generation: number; identity: string },
  incoming: { generation: number; identity: string },
): boolean {
  return (
    current.generation === incoming.generation &&
    current.identity === incoming.identity
  );
}
export function scopeFromLoader(
  value: unknown,
): WorkspaceScopeView | undefined {
  const parsed = z.object({ scope: scopeViewSchema }).safeParse(value);
  return parsed.success ? parsed.data.scope : undefined;
}
