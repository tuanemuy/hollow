import { parentPort, workerData } from "node:worker_threads";
import { projectNote } from "@repo/core/adapters/node/browse/projection";
import { isSerializableError } from "@repo/core/lib/error";
import { z } from "zod";

try {
  const input = z
    .object({ title: z.string().max(800), html: z.string().max(819200) })
    .parse(workerData);
  parentPort?.postMessage({ kind: "result", value: projectNote(input) });
} catch (error) {
  parentPort?.postMessage({
    kind: "failure",
    error: isSerializableError(error)
      ? error.toSerialized()
      : {
          code: "PROJECTION_FAILED",
          message: "本文の索引を準備できませんでした。",
        },
  });
} finally {
  parentPort?.close();
}
