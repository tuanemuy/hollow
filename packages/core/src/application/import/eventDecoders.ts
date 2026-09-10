import type { EventDecoder } from "@repo/core/domain/common/event";
import type { ImportQueuedEvent } from "@repo/core/domain/import/events";
import type { ReferenceQueuedEvent } from "@repo/core/domain/reference/events";
import { z } from "zod";
import { buildEventDecoder } from "../events/buildDecoder";
export const importEventDecoders: {
  ImportQueued: EventDecoder<ImportQueuedEvent>;
  ReferenceQueued: EventDecoder<ReferenceQueuedEvent>;
} = {
  ReferenceQueued: buildEventDecoder(
    "ReferenceQueued",
    z.object({ jobId: z.uuid() }),
    (p) => p,
  ),
  ImportQueued: buildEventDecoder(
    "ImportQueued",
    z.object({ jobId: z.uuid() }),
    (p) => p,
  ),
};
