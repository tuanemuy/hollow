import type { HollowContainer } from "../di/hollowTypes";
import { SystemError, SystemErrorCode, UnauthorizedError } from "../errors";
import type { BrowseConditions } from "./ports";

export async function browseNotes(
  container: HollowContainer,
  token: string | null,
  conditions: BrowseConditions,
) {
  if (!token)
    throw new UnauthorizedError("SESSION_REQUIRED", "サインインしてください。");
  if (!container.browsing)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "一覧の準備ができていません。再試行してください。",
    );
  const result = await container.browsing.execution.execute({
    kind: "notes",
    sessionHash: container.tokens.hash(token),
    conditions,
  });
  if (result.kind !== "notes")
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "一覧の応答を確認できません。",
    );
  return result.page;
}
export async function browseTags(
  container: HollowContainer,
  token: string | null,
  conditions: BrowseConditions,
  tagQuery: string,
  tagCursor?: string,
) {
  if (!token)
    throw new UnauthorizedError("SESSION_REQUIRED", "サインインしてください。");
  if (!container.browsing)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "タグ候補を取得できません。再試行してください。",
    );
  const result = await container.browsing.execution.execute({
    kind: "tags",
    sessionHash: container.tokens.hash(token),
    conditions,
    tagQuery,
    ...(tagCursor ? { tagCursor } : {}),
  });
  if (result.kind !== "tags")
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "タグ候補の応答を確認できません。",
    );
  return result;
}
