import { createServerFn } from "@tanstack/react-start";
import {
  batchAcceptSchema,
  batchCancelSchema,
  batchGetSchema,
  batchListSchema,
  batchPreviewSchema,
  batchRetrySchema,
  batchSelectionSchema,
  batchWatchSchema,
} from "./batchInput";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";

export const selectBatchNotesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(batchSelectionSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { selectBatchNotes }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return selectBatchNotes(container, token, data);
  });
export const previewBatchFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(batchPreviewSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { previewBatch }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return previewBatch(container, token, data);
  });
export const acceptBatchFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(batchAcceptSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { acceptBatch }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return acceptBatch(container, token, data);
  });
export const retryBatchFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(batchRetrySchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { retryBatch }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return retryBatch(container, token, data);
  });
export const cancelBatchFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(batchCancelSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { cancelBatch }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return cancelBatch(container, token, data);
  });
export const getBatchFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(batchGetSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { getBatch }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return getBatch(container, token, data);
  });
export const listBatchesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(batchListSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { listBatches }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return listBatches(container, token, data);
  });
export const batchActivityFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const [{ hollowContext }, { batchActivity }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return batchActivity(container, token);
  });
export const watchBatchesFn = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(batchWatchSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext }, { watchBatches }] = await Promise.all([
      import("./hollowServer"),
      import("@repo/core/application/batch/usecases"),
    ]);
    const { container, token } = await hollowContext();
    return watchBatches(container, token, data.ids);
  });
