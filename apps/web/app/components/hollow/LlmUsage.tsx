"use client";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { llmUsageFn } from "@/presentation/llmServerFn";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export function LlmUsage({ refreshKey = "" }: { refreshKey?: string }) {
  const [usage, setUsage] = useState<Awaited<
    ReturnType<typeof llmUsageFn>
  > | null>(null);
  const [error, setError] = useState("");
  const operation = useAuthenticationOperation();
  const router = useRouter();
  useEffect(() => {
    let disposed = false;
    let running = false;
    let queued = false;
    const href = router.state.location.href;
    void refreshKey;
    const load = () => {
      if (disposed || router.state.location.href !== href) return;
      if (running) {
        queued = true;
        operation();
        return;
      }
      running = true;
      const valid = operation();
      void llmUsageFn()
        .then((value) => {
          if (!disposed && valid()) {
            setUsage(value);
            setError("");
          }
        })
        .catch((cause) => {
          if (!disposed && valid()) setError(displayError(cause));
        })
        .finally(() => {
          running = false;
          if (queued) {
            queued = false;
            load();
          }
        });
    };
    const unsubscribe = router.subscribe("onResolved", load);
    load();
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [refreshKey, operation, router]);
  return (
    <section aria-label="月間 AI 変換使用量">
      {error && <p role="alert">{error}</p>}
      {usage && (
        <>
          <p>
            AI 変換: {usage.consumed} 回使用・{usage.reserved} 回予約 / 月{" "}
            {usage.limit} 回（個人アカウント単位）
          </p>
          <p>残り {usage.remaining} 回</p>
          <p>
            使用量の確認日時:{" "}
            <time dateTime={usage.updatedAt}>
              {new Date(usage.updatedAt).toLocaleString()}
            </time>
          </p>
          <p>
            次の月間枠:{" "}
            <time dateTime={usage.resetsAt}>
              {new Date(usage.resetsAt).toLocaleString()}
            </time>
            （UTC 暦月切替・お使いのタイムゾーン表示）
          </p>
          {usage.warning && <p role="status">月間枠の 80% を超えています。</p>}
          {usage.reserved + usage.consumed >= usage.limit && (
            <p>
              月間枠に達しています。LLM
              必須の変換は次の月間枠をお待ちください。text の通常取り込みは「LLM
              を使わずに取り込む」を選べます。保存容量の上限とは別です。
            </p>
          )}
        </>
      )}
    </section>
  );
}
