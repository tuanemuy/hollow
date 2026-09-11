import { performance } from "node:perf_hooks";
import { Worker } from "node:worker_threads";

const deadline = Number(process.argv[2]);
const now = () => performance.timeOrigin + performance.now();
const terminate = (): void => {
  process.kill(process.pid, "SIGKILL");
};
if (!Number.isFinite(deadline) || deadline - now() > 3000) terminate();
const timer = setTimeout(terminate, Math.max(0, deadline - now() - 100));
process.once("disconnect", terminate);
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
    return terminate();
  launched = true;
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
    if (!process.connected) return terminate();
    process.send?.(result, (error) => {
      if (error) terminate();
      sent = true;
      finish();
    });
  });
  worker.once("error", terminate);
  worker.once("exit", (code) => {
    if (code !== 0) return terminate();
    exited = true;
    finish();
  });
});
