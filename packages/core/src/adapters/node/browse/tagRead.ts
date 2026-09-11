import type { SearchExecutionPort } from "@repo/core/application/browse/ports";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  TagReadInput,
  TagReadPort,
} from "@repo/core/application/tag/ports";

export class NodeTagRead implements TagReadPort {
  constructor(private readonly execution: SearchExecutionPort) {}
  async read(sessionHash: string, input: TagReadInput, signal?: AbortSignal) {
    const result = await this.execution.execute(
      { kind: "tag-management", sessionHash, input },
      signal,
    );
    if (result.kind !== "tag-management")
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "タグの応答を確認できません。",
      );
    return result.result;
  }
}
