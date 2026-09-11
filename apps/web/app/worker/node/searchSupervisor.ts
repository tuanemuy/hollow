import { Worker } from "node:worker_threads";
import {
  parseSearchDeadline,
  remainingSearchMs,
  SEARCH_CLOSE_MARGIN_MS,
  searchCanStart,
} from "@repo/core/adapters/node/browse/searchDeadline";
import type { searchDiagnosticSchema } from "@repo/core/adapters/node/browse/searchDiagnostic";
import type { z } from "zod";

const parsedDeadline = parseSearchDeadline(process.argv[2]);
const deadline = parsedDeadline ?? 0n;
const diagnostic = (stage: z.infer<typeof searchDiagnosticSchema>["stage"]) => {
  if (process.connected)
    process.send?.(
      { kind: "diagnostic", stage, remainingMs: remainingSearchMs(deadline) },
      () => {},
    );
};
const terminate = (
  reason: z.infer<typeof searchDiagnosticSchema>["stage"],
): void => {
  diagnostic(reason);
  process.kill(process.pid, "SIGKILL");
};
diagnostic("monitor-ready");
if (parsedDeadline === null) terminate("invalid-budget");
const timer = setTimeout(
  () => terminate("deadline"),
  Math.max(0, remainingSearchMs(deadline) - SEARCH_CLOSE_MARGIN_MS),
);
process.once("disconnect", () => terminate("ipc-disconnect"));
let launched = false;
process.on("message", (input) => {
  if (
    launched ||
    !input ||
    typeof input !== "object" ||
    !("workerPath" in input) ||
    typeof input.workerPath !== "string" ||
    JSON.stringify(input).length > 65536
  )
    return terminate("invalid-input");
  launched = true;
  if (!searchCanStart(deadline)) return terminate("deadline");
  diagnostic("worker-start");
  const worker = new Worker(input.workerPath, {
    workerData: input,
    stdout: true,
    stderr: true,
    resourceLimits: { maxOldGenerationSizeMb: 192, stackSizeMb: 4 },
  });
  worker.stdout.resume();
  worker.stderr.resume();
  let exited = false;
  let sent = false;
  const finish = () => {
    if (exited && sent) {
      clearTimeout(timer);
      process.removeAllListeners("disconnect");
      process.exit(0);
    }
  };
  worker.once("message", (result) => {
    diagnostic("worker-result");
    if (!process.connected) return terminate("ipc-disconnect");
    process.send?.(result, (error) => {
      if (error) terminate("send-error");
      diagnostic("send-ack");
      sent = true;
      finish();
    });
  });
  worker.once("error", () => terminate("worker-error"));
  worker.once("exit", (code) => {
    diagnostic("worker-exit");
    if (code !== 0) return terminate("worker-failure");
    exited = true;
    finish();
  });
});
