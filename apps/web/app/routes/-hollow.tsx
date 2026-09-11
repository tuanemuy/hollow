import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";
import { browseRouteSchema } from "@/presentation/browseInput";
import { errorResponseMiddleware } from "@/presentation/errorResponseMiddleware";
import { validateInput } from "@/presentation/validator";

export const renderNotes = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(browseRouteSchema))
  .handler(async ({ data }) => {
    const { NotesFragment } = await import("@/components/hollow/NotesFragment");
    return {
      notes: renderServerComponent(<NotesFragment search={data} />),
    };
  });
