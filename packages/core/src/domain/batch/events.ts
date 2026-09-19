import type { DomainEventBase } from "../common/event";
export type NoteBatchQueuedEvent = DomainEventBase<
  "NoteBatchQueued",
  { parentId: string }
>;
