import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";

export async function batchProcessing(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  noteId: string,
) {
  const conversions = await c.jobs.activeForNote(noteId);
  const references = await c.references.activeForNote(noteId);
  const preview = await c.llmPdfPreviews.liveForNote(noteId);
  const zip = await c.zipWork.active();
  const zipTargets = zip
    ? (await c.zipRequests.targets(zip.request.id)).filter(
        (target) =>
          target.liveNoteId === noteId &&
          !zip.run.exclusions.some((entry) => entry.ordinal === target.ordinal),
      )
    : [];
  const identities = [
    ...conversions.map((job) => ["conversion", job.id] as const),
    ...references.map((job) => ["reference", job.id] as const),
    ...(preview ? [["pdf-preview", preview.id] as const] : []),
    ...zipTargets.map(
      (target) =>
        [
          "zip",
          `${zip?.request.id}:${zip?.run.generation}:${target.ordinal}`,
        ] as const,
    ),
  ].sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0,
  );
  return {
    hasRunningJobs: identities.length > 0,
    processingFingerprint: container.tokens.hash(JSON.stringify(identities)),
  };
}
