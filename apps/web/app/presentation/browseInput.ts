import type { BrowseConditions } from "@repo/core/application/browse/ports";
import { BROWSE_SORTS, searchQuery } from "@repo/core/domain/browse/query";
import { z } from "zod";

export type BrowseRouteInput = {
  [K in keyof BrowseConditions]?: BrowseConditions[K] | undefined;
};

export function searchProblem(value: string): string | null {
  try {
    searchQuery(value);
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "検索語を確認してください。";
  }
}

export function isBrowseZone(zone: string): boolean {
  if (!zone || zone.length > 100 || /^[+−-]/u.test(zone)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export const browseZoneSchema = z
  .string()
  .refine(isBrowseZone, "IANAタイムゾーンを入力してください。");
const querySchema = z
  .string()
  .trim()
  .max(400)
  .superRefine((value, ctx) => {
    const problem = searchProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });
const monthSchema = z
  .string()
  .regex(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/, "年月を確認してください。");
const cursorSchema = z.string().min(1).max(16384);
const fields = {
  workspaceId: z.uuid().optional(),
  query: querySchema.default(""),
  tags: z
    .array(z.uuid())
    .max(50)
    .transform((ids) => [...new Set(ids)].sort())
    .default([]),
  month: monthSchema.optional(),
  zone: browseZoneSchema,
  sort: z.enum(BROWSE_SORTS),
  layout: z.enum(["tile", "list", "calendar"]),
  cursor: cursorSchema.optional(),
  day: z
    .string()
    .regex(/^(?!0000)\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
    .optional(),
};

export const browseRouteSchema = z
  .object({
    ...fields,
    zone: fields.zone.optional(),
    sort: fields.sort.optional(),
    layout: fields.layout.optional(),
  })
  .strict();
export type BrowseRouteSearch = z.infer<typeof browseRouteSchema>;
export const browseInputSchema = z
  .object(fields)
  .strict()
  .superRefine((value, ctx) => {
    if (value.layout === "calendar" && !value.month)
      ctx.addIssue({
        code: "custom",
        path: ["month"],
        message: "カレンダーの年月を指定してください。",
      });
    if (
      value.day &&
      (!value.month ||
        !value.day.startsWith(`${value.month}-`) ||
        value.layout !== "calendar" ||
        !value.cursor)
    )
      ctx.addIssue({
        code: "custom",
        path: ["day"],
        message: "日別の続きを確認してください。",
      });
    if (value.day) {
      const date = new Date(`${value.day}T00:00:00Z`);
      if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value.day
      )
        ctx.addIssue({
          code: "custom",
          path: ["day"],
          message: "日付を確認してください。",
        });
    }
    if (!value.query && value.sort === "relevance")
      ctx.addIssue({
        code: "custom",
        path: ["sort"],
        message: "関連度順には検索語が必要です。",
      });
  });
export const browseTagInputSchema = z
  .object({
    conditions: browseInputSchema,
    tagQuery: z.string().max(200),
    tagCursor: z.string().min(1).max(4096).optional(),
  })
  .strict();

export function browseIdentity(
  value: BrowseRouteSearch | BrowseConditions,
): string {
  return JSON.stringify([
    value.workspaceId ?? null,
    value.query,
    [...value.tags].sort(),
    value.month ?? null,
    value.zone ?? null,
    value.layout ?? null,
    value.sort ?? null,
    value.cursor ?? null,
    value.day ?? null,
  ]);
}
