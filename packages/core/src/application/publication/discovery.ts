import type { HollowContainer } from "../di/hollowTypes";
import { SystemError, SystemErrorCode } from "../errors";
import type { PublicDiscoveryRequest } from "./ports";
export async function discoverPublic(
  c: HollowContainer,
  request: PublicDiscoveryRequest,
  browserHash: string | null,
  signal: AbortSignal,
) {
  const execution = c.publicDiscovery;
  if (!execution)
    throw new SystemError(
      SystemErrorCode.PublicSearchBusy,
      "公開検索は現在利用できません。",
    );
  const retryAt = await c.unitOfWorkProvider.run((u) =>
    u.publicDiscoveryRates.reserve(
      request.kind === "list" ? browserHash : null,
      c.clock.now(),
    ),
  );
  if (retryAt) return { kind: "limited" as const, retryAt };
  if (signal.aborted)
    throw new SystemError(
      SystemErrorCode.PublicSearchBusy,
      "公開検索が時間内に完了しませんでした。再試行してください。",
    );
  return {
    kind: "result" as const,
    value: await execution.execute(request, signal),
  };
}
