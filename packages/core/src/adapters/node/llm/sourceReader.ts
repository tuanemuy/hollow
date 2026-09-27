import { createHash } from "node:crypto";
import {
  LlmOperationError,
  type LlmSourceReader,
} from "@repo/core/application/llm/ports";
import type { ObjectStorage } from "@repo/core/application/ports/objectStorage";
import type { LlmSourceIdentity } from "@repo/core/domain/llm/entity";

export class NodeLlmSourceReader implements LlmSourceReader {
  constructor(private readonly storage: ObjectStorage) {}
  async read(
    key: string,
    identity: LlmSourceIdentity,
    signal: AbortSignal,
  ): Promise<Uint8Array> {
    if (!this.storage.openOwnedRead)
      throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
    if (
      !Number.isSafeInteger(identity.bytes) ||
      identity.bytes <= 0 ||
      identity.bytes > 50 * 1024 * 1024
    )
      throw new LlmOperationError("LLM_RESOURCE_LIMIT", "not-sent", true);
    if (signal.aborted)
      throw new LlmOperationError("LLM_UNAVAILABLE", "not-sent", true);
    const bytes = new Uint8Array(identity.bytes);
    const hash = createHash("sha256");
    const input = await this.storage.openOwnedRead(key, signal);
    void input.closed.catch(() => {});
    const reader = input.body.getReader();
    let offset = 0;
    let failure: "LLM_SOURCE_CHANGED" | "LLM_UNAVAILABLE" | null = null;
    let cancel: Promise<unknown> | null = null;
    let closed = false;
    const abort = () => {
      cancel ??= reader.cancel().catch(() => {});
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    try {
      while (!signal.aborted) {
        const part = await reader.read();
        if (part.done) break;
        if (offset + part.value.byteLength > identity.bytes) {
          failure = "LLM_SOURCE_CHANGED";
          break;
        }
        bytes.set(part.value, offset);
        offset += part.value.byteLength;
        hash.update(part.value);
      }
      if (signal.aborted) failure = "LLM_UNAVAILABLE";
      else if (
        offset !== identity.bytes ||
        hash.digest("hex") !== identity.sha256
      )
        failure = "LLM_SOURCE_CHANGED";
    } catch {
      failure = signal.aborted ? "LLM_UNAVAILABLE" : "LLM_SOURCE_CHANGED";
    } finally {
      signal.removeEventListener("abort", abort);
      cancel ??= reader.cancel().catch(() => {});
      await cancel;
      reader.releaseLock();
      const results = await Promise.allSettled([
        Promise.resolve().then(() => input.close()),
        input.closed,
      ]);
      closed = results.every((result) => result.status === "fulfilled");
    }
    if (!closed)
      throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
    if (signal.aborted)
      throw new LlmOperationError("LLM_UNAVAILABLE", "not-sent", true);
    if (failure) throw new LlmOperationError(failure, "not-sent", true);
    return bytes;
  }
}
