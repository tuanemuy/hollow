"use client";

import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  type BrowseRouteSearch,
  isBrowseZone,
} from "@/presentation/browseInput";
import { displayError } from "@/presentation/errorDisplay";
import { useBrowseContext } from "./BrowseContext";
import { resolveBrowse } from "./model";

export function BrowsePreparation({ search }: { search: BrowseRouteSearch }) {
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location.href });
  const context = useBrowseContext();
  const [fallback, setFallback] = useState<string | null>(null);
  const [zone, setZone] = useState("UTC");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const attempt = useRef<string | null>(null);
  const requestKey = JSON.stringify([location, retry]);
  const resolvedZone =
    search.zone ?? context.preference?.zone ?? context.browserZone ?? fallback;
  useEffect(() => {
    if (
      !context.preferencesReady ||
      !resolvedZone ||
      attempt.current === requestKey
    )
      return;
    attempt.current = requestKey;
    let active = true;
    try {
      const conditions = resolveBrowse(
        search,
        context.preference,
        resolvedZone,
        new Date(),
      );
      void router
        .navigate({ to: "/notes", search: conditions, replace: true })
        .catch((cause) => {
          if (active) setError(displayError(cause));
        });
    } catch (cause) {
      if (active) setError(displayError(cause));
    }
    return () => {
      active = false;
    };
  }, [
    context.preferencesReady,
    context.preference,
    resolvedZone,
    router,
    search,
    requestKey,
  ]);
  return (
    <section
      className="browse-preparation"
      aria-busy={!error && !context.zoneFailed}
    >
      <h1>一覧の表示条件を準備しています</h1>
      <p>
        端末の表示設定とタイムゾーンを確認しています。月は作成日で絞り込みます。
      </p>
      {context.notice && <p role="status">{context.notice}</p>}
      {context.zoneFailed && !resolvedZone && (
        <div className="hollow-message" role="alert">
          <p>
            端末のタイムゾーンを取得できませんでした。UTCで表示するか、IANAタイムゾーンを指定してください。
          </p>
          <button type="button" onClick={context.detectZone}>
            検出を再試行
          </button>
          <button type="button" onClick={() => setFallback("UTC")}>
            UTCで表示する
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (isBrowseZone(zone)) setFallback(zone);
              else setError("有効なIANAタイムゾーンを入力してください。");
            }}
          >
            <label>
              タイムゾーン
              <input
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                placeholder="Asia/Tokyo"
                maxLength={100}
              />
            </label>
            <button type="submit">この地域で表示</button>
          </form>
        </div>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              attempt.current = null;
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            再試行
          </button>
        </p>
      )}
    </section>
  );
}
