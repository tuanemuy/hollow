import type { ZipArtifactRepository } from "@repo/core/application/zip/ports";
import { and, asc, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  zipArtifactEntries,
  zipArtifacts,
  zipAssemblies,
  zipRequests,
  zipRuns,
  zipSpoolRefs,
} from "../zipSchema";
import {
  artifactRow,
  cleanupValues,
  deleteReceipt,
  liveRun,
  runResults,
  runWhere,
} from "./zipHelpers";

export class LibsqlZipArtifactRepository implements ZipArtifactRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(zipArtifacts)
      .where(eq(zipArtifacts.id, id));
    return row ? artifactRow(row) : null;
  }
  async entries(id: string) {
    return this.db
      .select()
      .from(zipArtifactEntries)
      .where(eq(zipArtifactEntries.artifactId, id))
      .orderBy(asc(zipArtifactEntries.ordinal));
  }
  async publish(
    input: Parameters<ZipArtifactRepository["publish"]>[0],
    now: Date,
  ) {
    const run = await liveRun(this.db, input.run, input.token, now);
    if (
      !run ||
      run.state !== "assembling" ||
      input.artifact.state !== "ready" ||
      !input.entries.length ||
      input.entries.some((entry) =>
        run.exclusions.some((excluded) => excluded.ordinal === entry.ordinal),
      )
    )
      return false;
    const [assembly] = await this.db
      .select()
      .from(zipAssemblies)
      .where(eq(zipAssemblies.id, input.artifact.assemblyId));
    if (
      !assembly ||
      assembly.state !== "closed" ||
      assembly.outcome !== "success" ||
      assembly.requestId !== run.requestId ||
      assembly.generation !== run.generation ||
      assembly.ordinals.length !== input.entries.length ||
      assembly.ordinals.some(
        (ordinal, index) => input.entries[index]?.ordinal !== ordinal,
      ) ||
      !assembly.file ||
      assembly.file.bytes !== input.artifact.file.bytes ||
      assembly.file.sha256 !== input.artifact.file.sha256 ||
      assembly.key !== input.artifact.key
    )
      return false;
    const { cleanup, ...values } = input.artifact;
    await this.db
      .insert(zipArtifacts)
      .values({ ...values, ...cleanupValues(cleanup) });
    await this.db.insert(zipArtifactEntries).values([...input.entries]);
    await this.db
      .update(zipAssemblies)
      .set({ key: null, file: null, reservedBytes: 0 })
      .where(eq(zipAssemblies.id, assembly.id));
    const results = await runResults(this.db, run);
    await this.db
      .update(zipRuns)
      .set({
        state: input.partial ? "partial" : "succeeded",
        finishedAt: now,
        results,
        publishedAt: input.artifact.publishedAt,
        artifactId: input.artifact.id,
        leaseToken: null,
        leaseUntil: null,
        runtimeId: null,
        version: run.version + 1,
      })
      .where(runWhere(run));
    if (input.partial)
      await this.db
        .update(zipSpoolRefs)
        .set({
          purpose: "retry",
          retryUntil: new Date(
            Math.min(
              run.historyExpiresAt.getTime(),
              input.artifact.expiresAt.getTime(),
            ),
          ),
        })
        .where(
          and(
            eq(zipSpoolRefs.requestId, run.requestId),
            eq(zipSpoolRefs.generation, run.generation),
          ),
        );
    else
      await this.db
        .delete(zipSpoolRefs)
        .where(
          and(
            eq(zipSpoolRefs.requestId, run.requestId),
            eq(zipSpoolRefs.generation, run.generation),
          ),
        );
    await this.db
      .update(zipRequests)
      .set({
        state: "terminal",
        updatedAt: now,
        version: sql`${zipRequests.version}+1`,
      })
      .where(eq(zipRequests.id, run.requestId));
    return true;
  }
  async retire(id: string, now: Date) {
    await this.db
      .update(zipArtifacts)
      .set({ state: "cleanup", nextCleanupAt: now })
      .where(and(eq(zipArtifacts.id, id), eq(zipArtifacts.state, "ready")));
    await this.db.run(
      sql`update zip_deliveries set state=case when state='ready' then 'closed' else 'closing' end where artifact_id=${id} and state in('ready','sending')`,
    );
  }
  async claimCleanup(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(zipArtifacts)
      .where(
        and(
          sql`(${zipArtifacts.state}='cleanup' or (${zipArtifacts.state}='ready' and ${zipArtifacts.expiresAt}<=${now.getTime()})) and ${zipArtifacts.nextCleanupAt}<=${now.getTime()} and (${zipArtifacts.cleanupUntil} is null or ${zipArtifacts.cleanupUntil}<=${now.getTime()})`,
          sql`not exists(select 1 from zip_deliveries d where d.artifact_id=${zipArtifacts.id} and d.state!='closed') and not exists(select 1 from object_writes w join zip_deliveries d on d.id=w.owner_id and w.kind='zip-delivery' where d.artifact_id=${zipArtifacts.id} and w.active=1)`,
        ),
      )
      .orderBy(asc(zipArtifacts.nextCleanupAt), asc(zipArtifacts.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(zipArtifacts)
      .set({ state: "cleanup", cleanupToken: token, cleanupUntil: until })
      .where(eq(zipArtifacts.id, row.id))
      .returning();
    return claimed ? artifactRow(claimed) : null;
  }
  async cleaned(id: string, token: string, deleteToken: string) {
    const row = await this.find(id);
    if (!row?.key) return false;
    const changed = await this.db
      .update(zipArtifacts)
      .set({
        state: "removed",
        key: null,
        file: null,
        reservedBytes: 0,
        cleanupToken: null,
        cleanupUntil: null,
      })
      .where(
        and(
          eq(zipArtifacts.id, id),
          eq(zipArtifacts.state, "cleanup"),
          eq(zipArtifacts.cleanupToken, token),
          deleteReceipt(row.key, deleteToken),
          sql`not exists(select 1 from zip_deliveries d where d.artifact_id=${id} and d.state!='closed')`,
        ),
      )
      .returning();
    if (!changed.length) return false;
    await this.db
      .update(zipArtifactEntries)
      .set({ liveNoteId: null })
      .where(eq(zipArtifactEntries.artifactId, id));
    return true;
  }
  async deferCleanup(id: string, token: string, now: Date) {
    await this.db
      .update(zipArtifacts)
      .set({
        cleanupToken: null,
        cleanupUntil: null,
        nextCleanupAt: new Date(now.getTime() + 5000),
      })
      .where(
        and(eq(zipArtifacts.id, id), eq(zipArtifacts.cleanupToken, token)),
      );
  }
}
