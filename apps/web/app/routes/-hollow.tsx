import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";
import { errorResponseMiddleware } from "@/presentation/errorResponseMiddleware";

export const renderNotes = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const { NotesFragment } = await import("@/components/hollow/NotesFragment");
    return { notes: renderServerComponent(<NotesFragment />) };
  });
