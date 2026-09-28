import { createServerFn } from "@tanstack/react-start";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import {
  llmJobInput,
  llmModelKindInput,
  llmNoteInput,
  llmRegenerateInput,
} from "./llmInput";
import { validateInput } from "./validator";

export const getLlmNoteFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(llmNoteInput))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getLlmNote }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/llm/read"),
    ]);
    const { container, token } = await hollowContext();
    return getLlmNote(container, token, data);
  });
export const listLlmModelsFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(llmModelKindInput))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listLlmModels }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/llm/read"),
    ]);
    const { container, token } = await hollowContext();
    return listLlmModels(container, token, data.kind);
  });
export const requestLlmFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(llmRegenerateInput))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { requestLlmRegeneration }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/llm/request"),
    ]);
    const { container, token } = await hollowContext(true);
    return requestLlmRegeneration(container, token, data);
  });
export const cancelLlmFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(llmJobInput))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { cancelLlmRegeneration }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/llm/control"),
    ]);
    const { container, token } = await hollowContext(true);
    return cancelLlmRegeneration(container, token, data.jobId);
  });
export const undoLlmFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(llmJobInput))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { undoLlmBody }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/llm/control"),
    ]);
    const { container, token } = await hollowContext(true);
    return undoLlmBody(container, token, data.jobId);
  });
export const llmUsageFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext }, { llmUsage }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/llm/control"),
    ]);
    const { container, token } = await hollowContext();
    return llmUsage(container, token);
  });
