import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";

export async function batchProcessing(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  noteId: string,
) {
  const conversions = await c.jobs.activeForNote(noteId);
  const references = await c.references.activeForNote(noteId);
  const identities = [
    ...conversions.map((job) => ["conversion", job.id] as const),
    ...references.map((job) => ["reference", job.id] as const),
  ].sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0,
  );
  return {
    hasRunningJobs: identities.length > 0,
    processingFingerprint: container.tokens.hash(JSON.stringify(identities)),
  };
}
