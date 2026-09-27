"use client";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  cancelOpenRouterFn,
  openRouterAttemptFn,
  openRouterWaitingFn,
  retryOpenRouterMetadataFn,
} from "@/presentation/openRouterServerFn";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export function OpenRouterResult({ id }: { id?: string }) {
  const ticket = useAuthenticationOperation();
  const router = useRouter();
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof openRouterAttemptFn>
  > | null>(null);
  const [waiting, setWaiting] = useState<Awaited<
    ReturnType<typeof openRouterWaitingFn>
  > | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!id) return;
    const valid = ticket();
    void (async () => {
      try {
        const value = await openRouterAttemptFn({ data: { id } });
        if (!valid()) return;
        setResult(value);
        if (value.firstLink) {
          const notes = await openRouterWaitingFn({ data: { id } });
          if (valid()) setWaiting(notes);
        }
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      }
    })();
  }, [id, ticket]);
  const act = (work: () => Promise<unknown>) => {
    if (!id) return;
    const valid = ticket();
    setError("");
    start(async () => {
      try {
        await work();
        if (!valid()) return;
        const value = await openRouterAttemptFn({ data: { id } });
        if (!valid()) return;
        setResult(value);
        if (value.firstLink) {
          const notes = await openRouterWaitingFn({ data: { id } });
          if (valid()) setWaiting(notes);
        }
        if (valid()) await router.invalidate();
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      }
    });
  };
  return (
    <main className="hollow-auth">
      <h1>OpenRouter連携の結果</h1>
      {!id && (
        <p>
          この連携手続きを確認できません。元のブラウザで設定画面から新しく開始してください。
        </p>
      )}
      {id && !result && !error && <p role="status">結果を確認しています…</p>}
      {result && (
        <>
          {result.state === "completed" && result.current ? (
            <>
              <p role="status">OpenRouterを連携しました。</p>
              <p>
                モデル設定を確認できます。AI変換はまだ提供していないため、自動変換や課金は開始していません。
              </p>
            </>
          ) : result.state === "completed" ? (
            <p>以前の手続きです。現在の連携は設定画面で確認してください。</p>
          ) : null}
          {result.state === "checking" && (
            <>
              <p>
                鍵の交換は完了しましたが、連携の検証が未完了です。既存の連携は維持しています。同じコードを再交換せず、保存済み候補の確認だけ再試行できます。
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  act(() =>
                    retryOpenRouterMetadataFn({
                      data: { id: result.id, version: result.version },
                    }),
                  )
                }
              >
                候補の連携を再確認
              </button>
            </>
          )}
          {result.state === "exchanging" && (
            <p>
              交換処理中、または結果を確認できていません。同じコードは再送しません。設定画面から新しい手続きを明示的に開始してください。
            </p>
          )}
          {result.state === "pending" && (
            <p>この手続きはまだ完了していません。</p>
          )}
          {result.state === "failed" && (
            <p>
              連携は完了しませんでした。既存の有効な連携は変更していません。設定画面から新しく開始してください。
            </p>
          )}
          {result.state === "expired" && (
            <p>
              手続きの期限が切れました。設定画面から新しく開始してください。
            </p>
          )}
          {result.uploadReturn && (
            <p>
              <a href={result.uploadReturn}>元の取り込み画面へ戻る</a> —
              ファイルを選び直して、明示的に取り込みを開始してください。
            </p>
          )}
          {!["completed", "failed", "expired"].includes(result.state) && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                act(() => cancelOpenRouterFn({ data: { id: result.id } }))
              }
            >
              この手続きを取り消す
            </button>
          )}
          {result.firstLink && waiting && waiting.total > 0 && (
            <section>
              <h2>AI連携待ちのノート {waiting.total} 件</h2>
              <p>現在読み取れるノートです。変換は自動開始しません。</p>
              <ul>
                {waiting.items.map((note) => (
                  <li key={note.id}>
                    <Link to="/notes/$noteId" params={{ noteId: note.id }}>
                      {note.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {waiting.next && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const afterId = waiting.next;
                    if (!afterId || !id) return;
                    const valid = ticket();
                    start(async () => {
                      try {
                        const page = await openRouterWaitingFn({
                          data: { id, afterId },
                        });
                        if (valid()) setWaiting(page);
                      } catch (cause) {
                        if (valid()) setError(displayError(cause));
                      }
                    });
                  }}
                >
                  次の50件
                </button>
              )}
            </section>
          )}
        </>
      )}
      {pending && <p role="status">処理しています…</p>}
      {error && <p role="alert">{error}</p>}
      <a href="/settings/openrouter">OpenRouter設定へ</a>{" "}
      <Link to="/notes">ノートへ</Link>
    </main>
  );
}
