import type { ConversionJob, JobTerminal } from "../entity";
export interface JobRepository {
  insert(job: ConversionJob): Promise<void>;
  find(id: string): Promise<ConversionJob | null>;
  listBatch(batchId: string): Promise<readonly ConversionJob[]>;
  findRetry(id: string): Promise<ConversionJob | null>;
  claim(
    now: Date,
    leaseToken: string,
    leaseUntil: Date,
  ): Promise<ConversionJob | null>;
  heartbeat(
    id: string,
    leaseToken: string,
    now: Date,
    until: Date,
  ): Promise<boolean>;
  finish(
    id: string,
    leaseToken: string,
    now: Date,
    state: JobTerminal,
    failure?: string,
  ): Promise<boolean>;
  cancelQueued(batchId: string, now: Date): Promise<readonly ConversionJob[]>;
}
