import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { toNoteView } from "./view";

export async function listNotes(
  container: HollowContainer,
  sessionToken: string | null,
) {
  return container.unitOfWorkProvider.run(
    async ({ accounts, notes, imports }) => {
      const account = await requireAccount(container, accounts, sessionToken);
      return Promise.all(
        (await notes.listPersonal(account.id)).map(async (note) =>
          toNoteView(note, await imports.findByNote(note.id)),
        ),
      );
    },
  );
}
