import type { EventDecoder } from "@repo/core/domain/common/event";
import type { PurgeQueuedEvent } from "@repo/core/domain/purge/events";
import { z } from "zod";
import { buildEventDecoder } from "../events/buildDecoder";
export const purgeEventDecoders: {
  PurgeQueued: EventDecoder<PurgeQueuedEvent>;
} = {
  PurgeQueued: buildEventDecoder(
    "PurgeQueued",
    z.object({ purgeId: z.uuid() }),
    (p) => p,
  ),
};
