import type { Original } from "@repo/core/domain/import/entity";
import type { Note } from "@repo/core/domain/note/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requirePersonalNote } from "./getNote";

export type WysContext = Readonly<{
  noteId: string;
  version: number;
  currentRevision: Readonly<{
    revisionNo: number;
    capturedNoteVersion: number;
  }> | null;
  originalFormat: Original["format"] | null;
  origin: Readonly<{ revisionNo: number; available: boolean }> | null;
}>;

export async function readWysContext(
  context: HollowUnitOfWorkContext,
  note: Note,
): Promise<WysContext> {
  const head = await context.revisions.head(note.id);
  const current = head
    ? await context.revisions.find(note.id, head.currentNo)
    : null;
  const originRevisionNo = current?.originRevisionNo;
  const origin =
    originRevisionNo == null
      ? null
      : {
          revisionNo: originRevisionNo,
          available:
            (await context.revisions.find(note.id, originRevisionNo)) !== null,
        };
  return {
    noteId: note.id,
    version: note.version,
    currentRevision: current
      ? {
          revisionNo: current.revisionNo,
          capturedNoteVersion: current.capturedNoteVersion,
        }
      : null,
    originalFormat: (await context.imports.findByNote(note.id))?.format ?? null,
    origin,
  };
}

export async function getWysContext(
  container: HollowContainer,
  token: string | null,
  id: string,
): Promise<WysContext> {
  return container.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(container, context.accounts, token);
    const note = requirePersonalNote(
      await context.notes.findById(id),
      account.id,
    );
    return readWysContext(context, note);
  });
}
