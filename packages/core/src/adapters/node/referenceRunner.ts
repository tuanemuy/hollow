import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { settleAbandonedDisplays } from "@repo/core/application/note/settleDisplay";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import { REFERENCE_LIMITS } from "@repo/core/domain/reference/entity";
export function createReferenceRunner(
  container: HollowContainer,
  intervalMs = 5000,
) {
  let stopped = false;
  let sweeping = false;
  const active = new Set<Promise<void>>();
  async function sweep() {
    if (stopped || sweeping) return;
    sweeping = true;
    try {
      await settleAbandonedDisplays(container);
      const orphanCompanions = await container.unitOfWorkProvider.run((c) =>
        c.references.orphanCompanions(),
      );
      for (const companion of orphanCompanions) {
        try {
          if (!container.importing) continue;
          await container.importing.storage.remove(companion.storageKey);
          await container.unitOfWorkProvider.run((c) =>
            c.references.removeOrphanCompanion(companion.id),
          );
        } catch (error) {
          container.logger.error("Companion cleanup failed", {
            companionId: companion.id,
            cause: error,
          });
        }
      }
      const abandoned = await container.unitOfWorkProvider.run(async (c) => {
        await c.references.pruneJobs(
          new Date(container.clock.now().getTime() - 90 * 86400_000),
        );
        return c.references.abandonedObjects(container.clock.now());
      });
      for (const object of abandoned) {
        try {
          await container.importing?.storage.remove(object.id);
          await container.unitOfWorkProvider.run((c) =>
            c.references.saveObject({ ...object, state: "cleaned" }),
          );
        } catch (error) {
          container.logger.error("Reference cleanup failed", {
            objectId: object.id,
            cause: error,
          });
        }
      }
      while (!stopped && active.size < 2) {
        const now = container.clock.now();
        const job = await container.unitOfWorkProvider.run((c) =>
          c.references.claim(
            now,
            container.tokens.generate(),
            new Date(now.getTime() + REFERENCE_LIMITS.leaseMs),
          ),
        );
        if (job?.state !== "running") break;
        const heartbeat = setInterval(() => {
          const at = container.clock.now();
          void container.unitOfWorkProvider
            .run(async (c) => {
              const latest = await c.references.job(job.id);
              return c.references.heartbeat(
                job.id,
                job.leaseToken,
                at,
                new Date(at.getTime() + REFERENCE_LIMITS.leaseMs),
                latest?.completed ?? 0,
              );
            })
            .catch((error) =>
              container.logger.error("Reference heartbeat failed", {
                cause: error,
              }),
            );
        }, 10_000);
        const task = runReferenceJob(
          container,
          job,
          AbortSignal.timeout(REFERENCE_LIMITS.executionMs),
        )
          .catch((error) =>
            container.logger.error("Reference job failed", {
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
      container.logger.error("Reference sweep failed", { cause: error });
    } finally {
      sweeping = false;
    }
  }
  const timer = setInterval(() => void sweep(), intervalMs);
  timer.unref();
  queueMicrotask(() => void sweep());
  return {
    wake: () => void sweep(),
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      while (sweeping) await new Promise((r) => setTimeout(r, 10));
      await Promise.all(active);
    },
  };
}
