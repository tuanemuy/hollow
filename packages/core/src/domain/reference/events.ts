import type { DomainEventBase } from "../common/event";
export type ReferenceQueuedEvent = DomainEventBase<
  "ReferenceQueued",
  { jobId: string }
>;
