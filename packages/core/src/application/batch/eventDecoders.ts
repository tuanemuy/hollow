import { z } from "zod";
import type { NoteBatchQueuedEvent } from "../../domain/batch/events";
import type { EventDecoder } from "../../domain/common/event";
import { buildEventDecoder } from "../events/buildDecoder";
export const batchEventDecoders: {
  NoteBatchQueued: EventDecoder<NoteBatchQueuedEvent>;
} = {
  NoteBatchQueued: buildEventDecoder(
    "NoteBatchQueued",
    z.object({ parentId: z.uuid() }).strict(),
    (p) => p,
  ),
};
