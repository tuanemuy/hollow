import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { externalReadingAllowed } from "./externalReading";
import {
  restoreRevisionSchema,
  revisionIdentitySchema,
  revisionNoteSchema,
} from "./hollowSchemas";
import { validateInput } from "./validator";

export const listRevisionsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(revisionNoteSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listRevisions }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/history"),
    ]);
    const { container, token } = await hollowContext();
    return listRevisions(container, token, data.noteId);
  });

export const getNoteVersionFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(revisionNoteSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getNoteVersion }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/history"),
    ]);
    const { container, token } = await hollowContext();
    return getNoteVersion(container, token, data.noteId);
  });

export const renderRevisionFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(revisionIdentitySchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { renderRevision }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/history"),
    ]);
    const { container, token } = await hollowContext(true);
    return renderRevision(
      container,
      token,
      {
        ...data,
        externalReading: externalReadingAllowed(container.appUrl, {
          destination: getRequestHeader("sec-fetch-dest"),
          mode: getRequestHeader("sec-fetch-mode"),
          site: getRequestHeader("sec-fetch-site"),
        }),
      },
      AbortSignal.timeout(30_000),
    );
  });

export const restoreRevisionFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(restoreRevisionSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { restoreRevision }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/history"),
    ]);
    const { container, token } = await hollowContext(true);
    return restoreRevision(container, token, data, AbortSignal.timeout(30_000));
  });
