import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  getNoteSchema,
  saveNoteSchema,
  setDisplayStyleSchema,
} from "./hollowSchemas";
import { validateInput } from "./validator";

export const listNotesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext }, { listNotes }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/listNotes"),
    ]);
    const { container, token } = await hollowContext();
    return listNotes(container, token);
  });

export const getNoteFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(getNoteSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getNote }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/getNote"),
    ]);
    const { container, token } = await hollowContext();
    return getNote(container, token, data.id);
  });

export const saveNoteFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(saveNoteSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { saveNote }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/saveNote"),
    ]);
    const { container, token } = await hollowContext(true);
    return saveNote(container, token, {
      title: data.title,
      html: data.html,
      ...(data.cause ? { cause: data.cause } : {}),
      ...(data.wysOrigin ? { wysOrigin: data.wysOrigin } : {}),
      ...(data.confirmedVersion !== undefined
        ? { confirmedVersion: data.confirmedVersion }
        : {}),
      ...(data.id ? { id: data.id } : {}),
      ...(data.draftId ? { draftId: data.draftId } : {}),
      ...(data.importReferences !== undefined
        ? { importReferences: data.importReferences }
        : {}),
      ...(data.version !== undefined ? { version: data.version } : {}),
    });
  });

export const getWysContextFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(getNoteSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getWysContext }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/wysContext"),
    ]);
    const { container, token } = await hollowContext();
    return getWysContext(container, token, data.id);
  });

export const setDisplayStyleFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(setDisplayStyleSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { setDisplayStyle }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/setDisplayStyle"),
    ]);
    const { container, token } = await hollowContext(true);
    return setDisplayStyle(container, token, data);
  });
