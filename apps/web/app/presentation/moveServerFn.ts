import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  moveAudienceSchema,
  moveDestinationsSchema,
  moveExpectedSchema,
  movePreviewSchema,
} from "./moveInput";
import { validateInput } from "./validator";

export const listMoveDestinationsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(moveDestinationsSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listMoveDestinations }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/move/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return listMoveDestinations(container, token, data);
  });
export const previewNoteMoveFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(movePreviewSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { previewNoteMove }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/move/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return previewNoteMove(container, token, data);
  });
export const readMoveAudienceFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(moveAudienceSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { readMoveAudience }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/move/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return readMoveAudience(container, token, data);
  });
export const moveNoteFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(moveExpectedSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { moveNote }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/move/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return moveNote(container, token, data);
  });
