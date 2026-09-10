import type { Note } from "@repo/core/domain/note/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import { toNoteView } from "./view";

export function requirePersonalNote(
  note: Note | null,
  accountId: string,
): Note {
  if (
    !note ||
    note.owner.kind !== "personal" ||
    note.owner.accountId !== accountId
  )
    throw new NotFoundError("NOTE_NOT_FOUND", "ノートが見つかりません。");
  return note;
}

export async function getNote(
  container: HollowContainer,
  sessionToken: string | null,
  id: string,
) {
  return container.unitOfWorkProvider.run(
    async ({ accounts, notes, imports }) => {
      const account = await requireAccount(container, accounts, sessionToken);
      const note = requirePersonalNote(await notes.findById(id), account.id);
      const original = await imports.findByNote(id);
      return toNoteView(
        note,
        original,
        original ? await imports.listNotices(original.id) : [],
      );
    },
  );
}
