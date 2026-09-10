import type { DomainEventBase } from "../common/event";
export type InvitationQueuedEvent = DomainEventBase<
  "InvitationQueued",
  { invitationId: string; generation: number }
>;
