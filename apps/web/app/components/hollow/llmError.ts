import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";

export function llmError(error: unknown): string {
  const value = extractSerializedError(error);
  if ("code" in value) {
    if (value.code === "LLM_RETRY_NEW_CONNECTION")
      return "連携が変わりました。ノートの再生成画面で元のモデル・追加指示を確認し、新しい変換として開始してください。旧処理を新しい鍵へ自動で付け替えません。";
    if (
      value.code === "LLM_RETRY_BODY_CHANGED" ||
      value.code === "LLM_UNDO_CHANGED"
    )
      return "処理後に本文または実行中の変換が変わりました。最新のノートを確認してください。本文を自動で上書きしません。";
    if (value.code === "OPENROUTER_CONNECTION_CHANGED")
      return "連携が更新されました。最新の連携とモデル設定を読み直して確認してください。";
  }
  return displayError(error);
}
