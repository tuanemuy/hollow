import { EventId } from "@repo/core/domain/common/event";
import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import { editNote } from "@repo/core/domain/note/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { inspectDependencies } from "../reference/dependencies";
import { scheduleReferences } from "../reference/schedule";
import { commitNote } from "./commitNote";
import { requirePersonalNote } from "./getNote";
import { toNoteView } from "./view";

export async function setDisplayStyle(
  container: HollowContainer,
  token: string | null,
  input: { id: string; style: DisplayStyle },
) {
  const snapshot = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    return requirePersonalNote(await c.notes.findById(input.id), account.id);
  });
  const prepared = container.referencing?.processor.prepare(snapshot.html);
  const inspections = prepared
    ? await inspectDependencies(container, prepared)
    : new Map<string, string>();
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const previous = requirePersonalNote(
      await c.notes.findById(input.id),
      account.id,
    );
    const now = container.clock.now();
    const note = editNote(
      {
        ...previous,
        display: {
          style: input.style,
          source: "user",
          initialization: { kind: "complete", reason: "user" },
        },
      },
      previous.title,
      previous.html,
      now,
    );
    if (
      previous.display.source === "user" &&
      previous.display.style === input.style &&
      previous.display.initialization.kind === "complete"
    ) {
      await commitNote(container, c, {
        previous,
        note: previous,
        actor: { kind: "user", accountId: account.id },
        cause: "style",
      });
      return toNoteView(previous, await c.imports.findByNote(previous.id));
    }
    const original = await c.imports.findByNote(note.id);
    if (original?.state === "processing") {
      const old = await c.jobs.find(original.activeJobId);
      if (old && (old.state === "queued" || old.state === "running")) {
        const id = container.idGenerator.next();
        await c.jobs.insert({
          ...old,
          id,
          noteVersion: note.version,
          state: "queued",
          retryOf: null,
          attempt: 0,
          leaseToken: null,
          leaseUntil: null,
          failure: null,
          createdAt: now,
          updatedAt: now,
        });
        await c.imports.saveOriginal({ ...original, activeJobId: id });
        c.collectEvents([
          {
            id: EventId.create(container.idGenerator.next()),
            type: "ImportQueued",
            aggregateId: note.id,
            occurredAt: now,
            payload: { jobId: id },
          },
        ]);
      }
    }
    await commitNote(container, c, {
      previous,
      note,
      actor: { kind: "user", accountId: account.id },
      cause: "style",
      afterCurrent: async () => {
        if (container.referencing)
          await scheduleReferences(
            container,
            c,
            note,
            container.referencing.processor.prepare(note.html),
            undefined,
            null,
            inspections,
          );
      },
    });
    return toNoteView(
      note,
      original,
      original ? await c.imports.listNotices(original.id) : [],
    );
  });
  container.importing?.wake();
  container.referencing?.wake();
  return result;
}
