import type { DomainEventBase } from "../common/event";
export type PurgeQueuedEvent = DomainEventBase<
  "PurgeQueued",
  { purgeId: string }
>;
