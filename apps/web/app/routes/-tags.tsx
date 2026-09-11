import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";
import { errorResponseMiddleware } from "@/presentation/errorResponseMiddleware";
import { tagRouteSchema } from "@/presentation/tagInput";
import { validateInput } from "@/presentation/validator";

export const renderTags = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(tagRouteSchema))
  .handler(async ({ data }) => {
    const { TagsFragment } = await import("@/components/tag/TagsFragment");
    return { tags: renderServerComponent(<TagsFragment search={data} />) };
  });
