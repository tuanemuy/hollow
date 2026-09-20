import { z } from "zod";

const entry = z.strictObject({
  actorId: z.uuid(),
  noteId: z.uuid(),
  commandId: z.uuid(),
});
type Entry = z.infer<typeof entry>;
const memory = new Map<string, Entry>();
const key = "hollow.pdf.pending.v1";
let loaded = false;
let storageFailed = false;
const identity = (actorId: string, noteId: string) => `${actorId}:${noteId}`;
function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      if (raw.length > 65536) throw Error("pending-storage");
      for (const item of z.array(entry).parse(JSON.parse(raw)))
        memory.set(identity(item.actorId, item.noteId), item);
    }
  } catch {
    storageFailed = true;
  }
}
export function readPdfPending(actorId: string, noteId: string) {
  load();
  return {
    commandId: memory.get(identity(actorId, noteId))?.commandId ?? null,
    storageFailed,
  };
}
export function listPdfPending(actorId: string) {
  load();
  return [...memory.values()].filter((value) => value.actorId === actorId);
}
export function writePdfPending(
  actorId: string,
  noteId: string,
  commandId: string | null,
  expected: string | null,
) {
  load();
  const id = identity(actorId, noteId);
  const previous = memory.get(id);
  if (commandId && previous && previous.commandId !== commandId)
    return readPdfPending(actorId, noteId);
  if (commandId) memory.set(id, entry.parse({ actorId, noteId, commandId }));
  else if (memory.get(id)?.commandId === expected) memory.delete(id);
  try {
    sessionStorage.setItem(key, JSON.stringify([...memory.values()]));
    storageFailed = false;
  } catch {
    storageFailed = true;
    if (commandId) {
      if (previous) memory.set(id, previous);
      else memory.delete(id);
    }
  }
  return readPdfPending(actorId, noteId);
}
