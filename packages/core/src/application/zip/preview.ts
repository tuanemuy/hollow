import { BusinessRuleError } from "@repo/core/domain/error";
import { ZIP_MAX_TARGETS } from "@repo/core/domain/zip/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { isNotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { pdfContext } from "../pdf/snapshot";
import type { ZipAvailableFormat } from "./ports";
import { zipServices } from "./services";
import { readZipSnapshot } from "./snapshot";

export type ZipPreviewInput = Readonly<{
  noteIds: readonly string[];
  format: ZipAvailableFormat;
  offset?: number;
}>;
export type ZipPreviewItem = Readonly<{
  ordinal: number;
  noteId: string;
  title: string;
  identity: string;
}>;
export type ZipPreview = Readonly<{
  actorId: string;
  format: ZipAvailableFormat;
  style: "saved";
  selected: number;
  total: number;
  excluded: number;
  confirmation: string;
  items: readonly ZipPreviewItem[];
  nextOffset: number | null;
}>;

export function zipSelection(ids: readonly string[]) {
  if (
    !ids.length ||
    ids.length > ZIP_MAX_TARGETS ||
    new Set(ids).size !== ids.length
  )
    throw new BusinessRuleError(
      "ZIP_SELECTION",
      "1〜500件の重複しないノートを選んでください。",
    );
  return [...ids];
}
export function zipFormat(format: ZipAvailableFormat) {
  if (format !== "html" && format !== "markdown" && format !== "pdf")
    throw new BusinessRuleError(
      "ZIP_FORMAT_UNAVAILABLE",
      "書き出し形式を選び直してください。",
    );
  return format;
}
export async function zipPreviewInTransaction(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  actorId: string,
  input: ZipPreviewInput,
) {
  const ids = zipSelection(input.noteIds);
  const format = zipFormat(input.format);
  if (format === "pdf") pdfContext(c);
  const items: ZipPreviewItem[] = [];
  for (const [ordinal, noteId] of ids.entries()) {
    try {
      const snapshot = await readZipSnapshot(c, u, actorId, noteId);
      items.push({
        ordinal,
        noteId,
        title: snapshot.note.title,
        identity: snapshot.identity,
      });
    } catch (error) {
      if (
        !isNotFoundError(error) &&
        !(error instanceof BusinessRuleError && error.code === "EXPORT_EMPTY")
      )
        throw error;
    }
  }
  return {
    items,
    selected: ids.length,
    excluded: ids.length - items.length,
    confirmation: c.tokens.hash(
      JSON.stringify([
        "zip-preview-v1",
        actorId,
        format,
        "saved",
        ids,
        items.map((item) => [item.ordinal, item.noteId, item.identity]),
      ]),
    ),
  };
}
export async function previewZip(
  c: HollowContainer,
  session: string | null,
  input: ZipPreviewInput,
): Promise<ZipPreview> {
  zipServices(c);
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= ZIP_MAX_TARGETS)
    throw new BusinessRuleError(
      "ZIP_PREVIEW_PAGE",
      "確認一覧を開き直してください。",
    );
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(c, u.accounts, session);
    const snapshot = await zipPreviewInTransaction(c, u, actor.id, input);
    return {
      actorId: actor.id,
      format: input.format,
      style: "saved",
      selected: snapshot.selected,
      total: snapshot.items.length,
      excluded: snapshot.excluded,
      confirmation: snapshot.confirmation,
      items: snapshot.items.slice(offset, offset + 50),
      nextOffset: offset + 50 < snapshot.items.length ? offset + 50 : null,
    };
  });
}
