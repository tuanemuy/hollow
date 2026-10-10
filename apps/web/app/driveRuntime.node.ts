import { DriveTransportError } from "@repo/core/adapters/node/drive/execution";
import { createNodeDriveRunner } from "@repo/core/adapters/node/drive/runner";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { maintainDrive } from "@repo/core/application/integration/drive/runner";
import { createDriveHttp } from "./presentation/driveHttp.node";

const stoppedResponse = () =>
  new Response(null, {
    status: 503,
    headers: { "Cache-Control": "no-store, private" },
  });

export async function createDriveRuntime(
  c: HollowContainer,
  callbackUrl: string,
) {
  const execution = c.drive?.execution;
  if (c.drive) {
    try {
      await maintainDrive(c, c.drive.runtimeGeneration);
      await sweepAccountDeletions(c);
      await maintainDrive(c, c.drive.runtimeGeneration);
      if (
        execution?.predecessors().length ||
        execution?.unacknowledged(1).length
      )
        throw new DriveTransportError();
    } catch {
      await execution?.stop();
      throw new DriveTransportError();
    }
  }
  const runner = c.drive
    ? createNodeDriveRunner(c, c.drive.runtimeGeneration)
    : null;
  const handler = createDriveHttp(c, callbackUrl);
  const paths = new Set([
    new URL(callbackUrl).pathname,
    "/api/integrations/drive/picker",
    "/api/integrations/drive/selection",
  ]);
  let accepting = true;
  let stopping: Promise<void> | null = null;
  let draining: Promise<void> | null = null;
  const tasks = new Map<AbortController, Promise<void>>();
  const wake = () => {
    if (accepting) runner?.wake();
  };
  const timer = runner ? setInterval(wake, 60_000) : null;
  timer?.unref();
  wake();

  const quiesce = (): Promise<void> => {
    accepting = false;
    if (timer) clearInterval(timer);
    for (const controller of tasks.keys()) controller.abort();
    if (draining) return draining;
    const queue = runner?.quiesce() ?? Promise.resolve();
    draining = (async () => {
      const results = await Promise.allSettled([queue, ...tasks.values()]);
      if (results.some((result) => result.status === "rejected") || tasks.size)
        throw new DriveTransportError();
    })();
    return draining;
  };
  const stop = (): Promise<void> => {
    stopping ??= quiesce()
      .then(() => runner?.stop())
      .catch((error: unknown) => {
        stopping = null;
        throw error;
      });
    return stopping;
  };

  return {
    wake,
    async dispatch(request: Request): Promise<Response | null> {
      if (!paths.has(new URL(request.url).pathname)) return null;
      if (!accepting || request.signal.aborted) return stoppedResponse();
      return handler(request);
    },
    async handle(
      request: Request,
      work: (request: Request) => Promise<Response>,
    ): Promise<Response> {
      if (!accepting) return stoppedResponse();
      if (!paths.has(new URL(request.url).pathname)) return work(request);
      const controller = new AbortController();
      let finish!: () => void;
      const ended = new Promise<void>((resolve) => {
        finish = resolve;
      });
      tasks.set(controller, ended);
      const abort = () => controller.abort();
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) abort();
      try {
        if (controller.signal.aborted) return stoppedResponse();
        return await work(new Request(request, { signal: controller.signal }));
      } finally {
        request.signal.removeEventListener("abort", abort);
        tasks.delete(controller);
        finish();
      }
    },
    quiesce,
    stop,
  };
}
export type DriveRuntime = Awaited<ReturnType<typeof createDriveRuntime>>;
