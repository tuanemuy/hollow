import type { BrowsePage } from "@repo/core/application/browse/ports";
import type { TagDelta } from "@repo/core/application/tag/ports";

export type TagValue = Readonly<{ id: string; name: string }>;
export type TagManagerSearch = {
  workspaceId?: string | undefined;
  query?: string | undefined;
  unusedOnly?: boolean | undefined;
  cursor?: string | undefined;
};
export function tagManagerIdentity(search: TagManagerSearch) {
  return JSON.stringify([
    search.workspaceId ?? null,
    search.query ?? "",
    search.unusedOnly ?? false,
    search.cursor ?? null,
  ]);
}
export type TagChoice = Readonly<{
  change: TagDelta["change"];
  tag: TagValue;
}>;

export function optimisticTags(tags: readonly TagValue[], choice: TagChoice) {
  if (choice.change.kind === "detach")
    return tags.filter((tag) => tag.id !== choice.tag.id);
  return tags.some((tag) => tag.id === choice.tag.id)
    ? tags
    : [...tags, choice.tag];
}

export function replacePageTags(
  page: BrowsePage,
  noteId: string,
  tags: readonly TagValue[],
): BrowsePage {
  const matches = page.conditions.tags.every((id) =>
    tags.some((tag) => tag.id === id),
  );
  let removed = false;
  const replace = (items: BrowsePage["items"]) =>
    items.flatMap((note) => {
      if (note.id !== noteId) return [note];
      if (!matches) {
        removed = true;
        return [];
      }
      return [{ ...note, tags }];
    });
  const items = replace(page.items);
  const calendar = page.calendar.map((day) => {
    const items = replace(day.items);
    return {
      ...day,
      items,
      count: day.count - (day.items.length - items.length),
    };
  });
  return { ...page, items, calendar, total: page.total - Number(removed) };
}

export function applyPageTagChoice(
  page: BrowsePage,
  noteId: string,
  choice: TagChoice,
) {
  const note =
    page.items.find((item) => item.id === noteId) ??
    page.calendar
      .flatMap((day) => day.items)
      .find((item) => item.id === noteId);
  return note
    ? replacePageTags(page, noteId, optimisticTags(note.tags, choice))
    : page;
}

export function validTagName(value: string) {
  const length = [...value.trim()].length;
  return length > 0 && length <= 50;
}

export function tagScope(workspaceId: string | null) {
  return workspaceId ? { workspaceId } : {};
}
