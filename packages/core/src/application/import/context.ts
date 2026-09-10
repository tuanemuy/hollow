import type { HollowContainer } from "../di/hollowTypes";
import { SystemError, SystemErrorCode } from "../errors";
export function importContext(container: HollowContainer) {
  if (!container.importing)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "取り込みの実行環境が設定されていません。",
    );
  return container.importing;
}
