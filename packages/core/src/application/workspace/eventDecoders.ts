import type { EventDecoder } from "@repo/core/domain/common/event";
import type { InvitationQueuedEvent } from "@repo/core/domain/workspace/events";
import { z } from "zod";
import { buildEventDecoder } from "../events/buildDecoder";
export const invitationEventDecoders: {
  InvitationQueued: EventDecoder<InvitationQueuedEvent>;
} = {
  InvitationQueued: buildEventDecoder(
    "InvitationQueued",
    z.object({
      invitationId: z.uuid(),
      generation: z.number().int().positive(),
    }),
    (p) => p,
  ),
};
