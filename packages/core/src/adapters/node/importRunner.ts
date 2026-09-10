import { collectMediaGarbage } from "@repo/core/application/asset/collectGarbage";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { importContext } from "@repo/core/application/import/context";
import { runImportJob } from "@repo/core/application/import/processJob";

export function createImportRunner(
  container: HollowContainer,
  options: { intervalMs?: number; concurrency?: number; leaseMs?: number } = {},
) {
  let stopped = false;
  let sweeping = false;
  const active = new Set<Promise<void>>();
  const intervalMs = options.intervalMs ?? 2000;
  const leaseMs = options.leaseMs ?? 90_000;
  const concurrency = options.concurrency ?? 2;
  async function sweep() {
    if (stopped || sweeping) return;
    sweeping = true;
    try {
      await collectMediaGarbage(container);
      const expired = await container.unitOfWorkProvider.run(
        async ({ imports }) => {
          const now = container.clock.now();
          const keys = await imports.expireReservations(now);
          await imports.pruneHistory(new Date(now.getTime() - 90 * 86400_000));
          return keys;
        },
      );
      for (const key of expired) {
        try {
          await importContext(container).storage.remove(key);
          await container.unitOfWorkProvider.run(({ imports }) =>
            imports.markStorageCleaned(key),
          );
        } catch (error) {
          container.logger.error("Import storage cleanup failed", {
            cause: error,
          });
        }
      }
      while (!stopped && active.size < concurrency) {
        const now = container.clock.now();
        const job = await container.unitOfWorkProvider.run(({ jobs }) =>
          jobs.claim(
            now,
            container.tokens.generate(),
            new Date(now.getTime() + leaseMs),
          ),
        );
        if (!job || job.state !== "running") break;
        const leaseToken = job.leaseToken;
        const heartbeat = setInterval(
          () => {
            const at = container.clock.now();
            void container.unitOfWorkProvider
              .run(({ jobs }) =>
                jobs.heartbeat(
                  job.id,
                  leaseToken,
                  at,
                  new Date(at.getTime() + leaseMs),
                ),
              )
              .catch((error) =>
                container.logger.error("Import heartbeat failed", {
                  cause: error,
                }),
              );
          },
          Math.max(1000, Math.floor(leaseMs / 3)),
        );
        const task = runImportJob(container, job)
          .then(
            () => {},
            (error) =>
              container.logger.error("Import job boundary failed", {
                jobId: job.id,
                cause: error,
              }),
          )
          .finally(() => {
            clearInterval(heartbeat);
            active.delete(task);
            if (!stopped) queueMicrotask(() => void sweep());
          });
        active.add(task);
      }
    } catch (error) {
      container.logger.error("Import sweep failed", { cause: error });
    } finally {
      sweeping = false;
    }
  }
  const timer = setInterval(() => void sweep(), intervalMs);
  timer.unref();
  queueMicrotask(() => void sweep());
  return {
    wake: () => {
      void sweep();
    },
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      while (sweeping) await new Promise((r) => setTimeout(r, 10));
      await Promise.all(active);
    },
  };
}
