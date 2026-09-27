import { pruneAuthentication } from "@repo/core/application/account/prune";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";

export function createAuthenticationRunner(c: HollowContainer) {
  let stopped = false;
  let active: Promise<void> | null = null;
  const wake = () => {
    if (stopped || active) return;
    active = pruneAuthentication(c)
      .then(() => {})
      .catch(() => c.logger.error("Authentication expiry cleanup deferred"))
      .finally(() => {
        active = null;
      });
  };
  const timer = setInterval(wake, 60_000);
  timer.unref();
  queueMicrotask(wake);
  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await active;
    },
  };
}
