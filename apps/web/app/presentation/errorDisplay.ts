import {
  extractSerializedError,
  type SerializedError,
} from "@/presentation/errorResponse";

function renderConflictMessage(code: string | null): string {
  switch (code) {
    case "OPTIMISTIC_LOCK_FAILURE":
      return "他の操作と競合しました。もう一度お試しください";
    case "UNIQUE_VIOLATION":
      return "すでに登録されています";
    case "FOREIGN_KEY_VIOLATION":
      return "依存関係があるため操作できません";
    default:
      return "他の操作と競合しました。もう一度お試しください";
  }
}

function formatFieldErrors(
  fieldErrors: Readonly<Record<string, readonly string[]>>,
): string | null {
  const parts: string[] = [];
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const first = messages[0];
    if (first === undefined) continue;
    parts.push(field ? `${field}: ${first}` : first);
  }
  return parts.length > 0 ? parts.join(" / ") : null;
}

export function renderErrorMessage(error: SerializedError): string {
  switch (error.kind) {
    case "business":
      return error.message;
    case "notFound":
      if (error.code === "ASSET_NOT_FOUND")
        return "メディアが削除されたか、参照・下書きの有効期限が切れています。入力内容を退避してノートを再読み込みし、メディアを挿入し直してください。";
      return "対象が見つかりません";
    case "conflict":
      return renderConflictMessage(error.code);
    case "unauthorized":
      switch (error.code) {
        case "EMAIL_UNVERIFIED":
          return "メールアドレスの確認が必要です。確認メールを再送できます。";
        case "INVALID_CREDENTIALS":
          return "メールアドレスまたはパスワードを確認してください。";
        case "SIGNIN_WAIT":
          return "サインインの試行が続いています。少し待ってから再度お試しください。";
        case "SIGNIN_LOCKED":
          return "サインインを一時的に停止しました。15 分後に再度お試しください。";
      }
      return "認証が必要です";
    case "forbidden":
      switch (error.code) {
        case "VERIFICATION_USED":
          return "このリンクでは確認が完了しています。サインインしてください。";
        case "VERIFICATION_EXPIRED":
          return "確認リンクの有効期限が切れています。確認メールを再送してください。";
        case "VERIFICATION_INVALID":
          return "確認リンクが無効です。最新の確認メールを開くか、再送してください。";
        case "MAIL_RATE_LIMITED":
          return "確認メールは送信済みです。1 分以上待ってから再送してください。";
      }
      return "権限がありません";
    case "validation": {
      if (error.fieldErrors !== undefined) {
        const formatted = formatFieldErrors(error.fieldErrors);
        if (formatted !== null) return formatted;
      }
      return error.message;
    }
    case "system":
      return "システムエラーが発生しました";
    case "unknown":
      return "エラーが発生しました";
  }
}

export function displayError(error: unknown): string {
  return renderErrorMessage(extractSerializedError(error));
}

export function sanitizeRouteError(error: unknown): string {
  if (import.meta.env.DEV) {
    console.error("Route error:", error);
  } else {
    console.error("Route error");
  }
  return renderErrorMessage(extractSerializedError(error));
}
