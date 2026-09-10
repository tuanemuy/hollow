import type { DomainEventBase } from "../common/event";
export type PurgeQueuedEvent = DomainEventBase<
  "PurgeQueued",
  { purgeId: string }
>;
export type EmptyTrashQueuedEvent = DomainEventBase<
  "EmptyTrashQueued",
  { parentId: string }
>;
