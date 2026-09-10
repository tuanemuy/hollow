import { interruptDisplay } from "@repo/core/domain/note/displayStyle";
import { editNote } from "@repo/core/domain/note/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { canScope } from "../workspace/access";
import { commitNote } from "./commitNote";

export async function settleAbandonedDisplays(container: HollowContainer) {
  return container.unitOfWorkProvider.run(async (c) => {
    let settled = 0;
    for (const note of await c.notes.unsettledDisplays(100)) {
      const initial = note.display.initialization;
      if (initial.kind === "complete" || note.lifecycle.kind !== "active")
        continue;
      const job =
        initial.kind === "conversion"
          ? await c.jobs.find(initial.jobId)
          : await c.references.job(initial.jobId);
      const actorId =
        job?.accountId ??
        (note.creator?.kind === "account"
          ? note.creator.accountId
          : note.owner.kind === "personal"
            ? note.owner.accountId
            : null);
      const account = actorId ? await c.accounts.findById(actorId) : null;
      if (
        account?.status !== "verified" ||
        !(await canScope(c, note.owner, account.id, "edit"))
      )
        continue;
      if (
        job &&
        (job.noteId !== note.id ||
          job.accountId !== account.id ||
          job.state === "running" ||
          job.state === "queued")
      )
        continue;
      const display = interruptDisplay(note.display);
      const updated =
        display.style !== note.display.style
          ? editNote(
              { ...note, display },
              note.title,
              note.html,
              container.clock.now(),
            )
          : { ...note, display };
      await commitNote(container, c, {
        previous: note,
        note: updated,
        actor: { kind: "system" },
        cause: "style",
      });
      settled++;
    }
    return settled;
  });
}
