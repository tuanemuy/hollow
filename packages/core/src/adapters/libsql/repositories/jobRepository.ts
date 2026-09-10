import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { ConversionJob, JobTerminal } from "@repo/core/domain/job/entity";
import type { JobRepository } from "@repo/core/domain/job/ports/jobRepository";
import { and, asc, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import { conversionJobs as jobs } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

function hydrate(row: typeof jobs.$inferSelect): ConversionJob {
  if (
    row.state === "running" &&
    row.leaseToken &&
    row.leaseUntil &&
    row.failure === null
  )
    return {
      ...row,
      state: "running",
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      failure: null,
    };
  if (row.state === "failed" && row.failure !== null)
    return {
      ...row,
      state: "failed",
      leaseToken: null,
      leaseUntil: null,
      failure: row.failure,
    };
  if (
    row.state === "queued" ||
    row.state === "succeeded" ||
    row.state === "cancelled"
  )
    return {
      ...row,
      state: row.state,
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    };
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "Invalid conversion job",
  );
}
export class LibsqlJobRepository implements JobRepository {
  constructor(
    private readonly db: Pick<
      HollowTransaction,
      "select" | "insert" | "update"
    >,
  ) {}
  async insert(job: ConversionJob) {
    await this.db.insert(jobs).values(job);
  }
  async find(id: string) {
    const [r] = await this.db.select().from(jobs).where(eq(jobs.id, id));
    return r ? hydrate(r) : null;
  }
  async listBatch(batchId: string) {
    return (
      await this.db
        .select()
        .from(jobs)
        .where(eq(jobs.batchId, batchId))
        .orderBy(asc(jobs.createdAt))
    ).map(hydrate);
  }
  async findRetry(id: string) {
    const [r] = await this.db.select().from(jobs).where(eq(jobs.retryOf, id));
    return r ? hydrate(r) : null;
  }
  async activeForNote(noteId: string) {
    return (
      await this.db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.noteId, noteId),
            inArray(jobs.state, ["queued", "running"]),
          ),
        )
    ).map(hydrate);
  }
  async cancelNote(noteId: string, now: Date) {
    return (
      await this.db
        .update(jobs)
        .set({
          state: "cancelled",
          leaseToken: null,
          leaseUntil: null,
          failure: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(jobs.noteId, noteId),
            inArray(jobs.state, ["queued", "running"]),
          ),
        )
        .returning()
    ).map(hydrate);
  }
  async claim(now: Date, leaseToken: string, leaseUntil: Date) {
    const eligible = or(
      eq(jobs.state, "queued"),
      and(eq(jobs.state, "running"), lte(jobs.leaseUntil, now)),
    );
    const next = this.db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eligible)
      .orderBy(asc(jobs.createdAt))
      .limit(1);
    const [r] = await this.db
      .update(jobs)
      .set({
        state: "running",
        leaseToken,
        leaseUntil,
        attempt: sql`${jobs.attempt}+1`,
        updatedAt: now,
      })
      .where(and(inArray(jobs.id, next), eligible))
      .returning();
    return r ? hydrate(r) : null;
  }
  async heartbeat(id: string, leaseToken: string, now: Date, until: Date) {
    return (
      (
        await this.db
          .update(jobs)
          .set({ leaseUntil: until, updatedAt: now })
          .where(
            and(
              eq(jobs.id, id),
              eq(jobs.state, "running"),
              eq(jobs.leaseToken, leaseToken),
              gt(jobs.leaseUntil, now),
            ),
          )
          .returning()
      ).length > 0
    );
  }
  async finish(
    id: string,
    leaseToken: string,
    now: Date,
    state: JobTerminal,
    failure?: string,
  ) {
    return (
      (
        await this.db
          .update(jobs)
          .set({
            state,
            leaseToken: null,
            leaseUntil: null,
            failure:
              state === "failed" ? (failure ?? "変換できませんでした。") : null,
            updatedAt: now,
          })
          .where(
            and(
              eq(jobs.id, id),
              eq(jobs.state, "running"),
              eq(jobs.leaseToken, leaseToken),
              gt(jobs.leaseUntil, now),
            ),
          )
          .returning()
      ).length > 0
    );
  }
  async cancelQueued(batchId: string, now: Date) {
    return (
      await this.db
        .update(jobs)
        .set({ state: "cancelled", updatedAt: now })
        .where(and(eq(jobs.batchId, batchId), eq(jobs.state, "queued")))
        .returning()
    ).map(hydrate);
  }
}
