"use client";

import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { browseRouteSchema } from "@/presentation/browseInput";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";

export function browseErrorMessage(error: unknown): string {
  const detail = extractSerializedError(error);
  if (detail.code === "SEARCH_PREPARING")
    return "検索用データを準備しています。まだ結果を表示できません。しばらくして再試行してください。";
  if (detail.code === "BROWSE_CURSOR")
    return "一覧の続きが無効になりました。先頭から読み直してください。";
  if (detail.kind === "system" || detail.kind === "unknown")
    return "時間切れや混雑などにより結果を取得できませんでした。再試行してください。";
  return displayError(error);
}
export function browseAccessLost(error: unknown): boolean {
  const detail = extractSerializedError(error);
  return (
    ["unauthorized", "forbidden", "notFound"].includes(detail.kind) ||
    detail.code === "BROWSE_SCOPE" ||
    detail.code === "SESSION_REQUIRED"
  );
}
export function BrowseError({
  error,
  reset,
}: {
  error: unknown;
  reset?: () => void;
}) {
  const router = useRouter();
  const search = useRouterState({ select: (state) => state.location.search });
  const parsed = browseRouteSchema.safeParse(search);
  const [retryError, setRetryError] = useState("");
  const [pending, setPending] = useState(false);
  const first = parsed.success
    ? { ...parsed.data, cursor: undefined, day: undefined }
    : null;
  const code = extractSerializedError(error).code;
  return (
    <section className="hollow-empty" role="alert">
      <h1>一覧を表示できませんでした</h1>
      <p>{browseErrorMessage(error)}</p>
      <button
        type="button"
        className="hollow-button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setRetryError("");
          try {
            if (code === "BROWSE_CURSOR" && first)
              await router.navigate({ to: "/notes", search: first });
            else await router.invalidate();
            reset?.();
          } catch (cause) {
            setRetryError(browseErrorMessage(cause));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending
          ? "読み込み中…"
          : code === "BROWSE_CURSOR"
            ? "この条件で先頭から読む"
            : "再試行"}
      </button>{" "}
      <Link to="/notes" search={{}} className="hollow-button">
        個人の一覧を先頭から開く
      </Link>
      {extractSerializedError(error).kind === "unauthorized" && (
        <Link to="/signin" className="hollow-button">
          サインイン
        </Link>
      )}
      {retryError && <p role="alert">{retryError}</p>}
    </section>
  );
}
