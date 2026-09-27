import type { HollowContainer } from "../di/hollowTypes";

export async function pruneAuthentication(c: HollowContainer) {
  return c.unitOfWorkProvider.run(async (u) => {
    const now = c.clock.now();
    const challenges = await u.authChallenges.prune(now, 100);
    const attempts = await u.googleAttempts.prune(now, 100);
    const browsers = await u.authBrowsers.prune(now, 100);
    return { challenges, attempts, browsers };
  });
}
