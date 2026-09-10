import type { DomainEventBase } from "../common/event";
export type ImportQueuedEvent = DomainEventBase<
  "ImportQueued",
  { jobId: string }
>;
