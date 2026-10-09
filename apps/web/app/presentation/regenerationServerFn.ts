import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { llmRegenerateInput } from "./llmInput";
import { validateInput } from "./validator";

const note = z
  .object({
    noteId: z.uuid(),
    cursor: z
      .object({
        noteId: z.uuid(),
        createdAt: z.string().max(24).datetime(),
        id: z.uuid(),
        digest: z.string().regex(/^[0-9a-f]{64}$/),
      })
      .strict()
      .optional(),
  })
  .strict();
const command = z
  .object({ noteId: z.uuid(), commandId: z.uuid().optional() })
  .strict();
const job = z.object({ id: z.uuid() }).strict();
const machine = z
  .object({
    noteId: z.uuid(),
    recordId: z.uuid(),
    commandId: z.uuid(),
    noteVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    confirmed: z.literal(true),
  })
  .strict();
const driveLlm = llmRegenerateInput
  .omit({ retryOf: true, previewId: true })
  .extend({
    recordId: z.uuid(),
    pdfPreviewId: z.uuid().optional(),
  })
  .strict();

export const regenerationSourcesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(note))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getRegenerationSources }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/regeneration/read"),
    ]);
    const { container, token } = await hollowContext();
    return getRegenerationSources(container, token, data);
  });
export const machineCommandFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(command))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getMachineCommand }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/regeneration/read"),
    ]);
    const { container, token } = await hollowContext();
    return getMachineCommand(container, token, data);
  });
export const requestDriveMachineFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(machine))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { requestDriveMachineRegeneration }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/regeneration/driveRequest"),
      ]);
    const { container, token } = await hollowContext(true);
    return requestDriveMachineRegeneration(container, token, data);
  });
export const requestDriveLlmFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(driveLlm))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { requestDriveLlmRegeneration }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/llm/driveRequest"),
      ]);
    const { container, token } = await hollowContext(true);
    return requestDriveLlmRegeneration(container, token, data);
  });
export const cancelMachineFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(job))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { cancelMachineRegeneration }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/regeneration/control"),
      ]);
    const { container, token } = await hollowContext(true);
    return cancelMachineRegeneration(container, token, data.id);
  });
export const undoMachineFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(job))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { undoMachineBody }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/regeneration/control"),
    ]);
    const { container, token } = await hollowContext(true);
    return undoMachineBody(container, token, data.id);
  });
