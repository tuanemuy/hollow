import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { getNoteSchema } from "./hollowSchemas";
import { validateInput } from "./validator";

export const getTrashIntentFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(getNoteSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getTrashIntent }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/trash"),
    ]);
    const { container, token } = await hollowContext();
    return getTrashIntent(container, token, data.id);
  });
export const trashNoteFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z.object({
        id: z.string().uuid(),
        version: z.number().int().nonnegative(),
        cancelProcessing: z.boolean(),
      }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { trashNote }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/trash"),
    ]);
    const { container, token } = await hollowContext(true);
    return trashNote(container, token, data);
  });
export const restoreNoteFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z.object({ id: z.string().uuid(), operationId: z.string().uuid() }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { restoreNote }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/trash"),
    ]);
    const { container, token } = await hollowContext(true);
    return restoreNote(container, token, data);
  });
const cursorSchema = z
  .string()
  .max(250)
  .transform((raw, ctx) => {
    try {
      const parsed = z
        .object({
          at: z.iso.datetime(),
          id: z.string().uuid(),
          workspaceId: z.uuid().nullable().optional(),
        })
        .parse(JSON.parse(raw));
      return {
        at: new Date(parsed.at),
        id: parsed.id,
        workspaceId: parsed.workspaceId ?? null,
      };
    } catch {
      ctx.addIssue({ code: "custom", message: "ページの位置が不正です。" });
      return z.NEVER;
    }
  });
export const listTrashFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(
    validateInput(
      z.object({
        cursor: cursorSchema.optional(),
        workspaceId: z.uuid().optional(),
      }),
    ),
  )
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listTrash }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/note/trash"),
    ]);
    const { container, token } = await hollowContext();
    return listTrash(container, token, data.cursor, data);
  });
