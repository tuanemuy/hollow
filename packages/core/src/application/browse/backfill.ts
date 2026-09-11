import type { HollowContainer } from "../di/hollowTypes";

export async function backfillBrowse(
  container: HollowContainer,
  after?: string,
  signal?: AbortSignal,
) {
  if (!container.browsing) return { last: null, count: 0 };
  const rows = await container.unitOfWorkProvider.run((c) =>
    c.browseIndex.pending(20, after),
  );
  let count = 0;
  for (const row of rows) {
    if (signal?.aborted) break;
    try {
      const projection = await container.browsing.projection.project(
        { title: row.title, html: row.html },
        signal,
      );
      count += await container.unitOfWorkProvider.run(async (c) => {
        const current = await c.notes.findById(row.id);
        if (
          !current ||
          current.version !== row.version ||
          current.title !== row.title ||
          current.html !== row.html
        )
          return 0;
        await c.browseIndex.save(current.id, current.version, projection);
        return 1;
      });
    } catch {
      container.logger.warn("browse_projection_deferred", { noteId: row.id });
    }
  }
  return { last: rows.length === 20 ? (rows.at(-1)?.id ?? null) : null, count };
}
