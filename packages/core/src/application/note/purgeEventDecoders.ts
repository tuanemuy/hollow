import type { EventDecoder } from "@repo/core/domain/common/event";
import type {
  EmptyTrashQueuedEvent,
  PurgeQueuedEvent,
} from "@repo/core/domain/purge/events";
import { z } from "zod";
import { buildEventDecoder } from "../events/buildDecoder";
export const purgeEventDecoders: {
  PurgeQueued: EventDecoder<PurgeQueuedEvent>;
  EmptyTrashQueued: EventDecoder<EmptyTrashQueuedEvent>;
} = {
  EmptyTrashQueued: buildEventDecoder(
    "EmptyTrashQueued",
    z.object({ parentId: z.uuid() }),
    (p) => p,
  ),
  PurgeQueued: buildEventDecoder(
    "PurgeQueued",
    z.object({ purgeId: z.uuid() }),
    (p) => p,
  ),
};
