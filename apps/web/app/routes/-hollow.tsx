import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";
import { errorResponseMiddleware } from "@/presentation/errorResponseMiddleware";
import { validateInput } from "@/presentation/validator";
import { scopedNotesSchema } from "@/presentation/workspaceInput";

export const renderNotes = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(scopedNotesSchema))
  .handler(async ({ data }) => {
    const { NotesFragment } = await import("@/components/hollow/NotesFragment");
    return {
      notes: renderServerComponent(
        <NotesFragment workspaceId={data.workspaceId} cursor={data.cursor} />,
      ),
    };
  });
