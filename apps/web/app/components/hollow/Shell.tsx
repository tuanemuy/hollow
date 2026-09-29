"use client";

import { Link, useRouter } from "@tanstack/react-router";
import { type ReactNode, useState, useTransition } from "react";
import {
  BrowseProvider,
  SearchTrigger,
} from "@/components/browse/BrowseContext";
import { PublicPageLink } from "@/components/publication/PublicPageLink";
import { displayError } from "@/presentation/errorDisplay";
import { signOutFn } from "@/presentation/hollowAuth";
import { scopeSearch } from "@/presentation/workspaceInput";
import { TrashProvider } from "./TrashProvider";
import {
  useCurrentWorkspaceId,
  WorkspaceDisplayProvider,
  WorkspaceSwitcher,
} from "./WorkspaceScope";

export function Shell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string;
}) {
  const router = useRouter();
  const workspaceId = useCurrentWorkspaceId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <BrowseProvider key={email ?? "anonymous"}>
      <WorkspaceDisplayProvider key={email ?? "anonymous"}>
        <div className="hollow">
          <a className="hollow-skip" href="#main">
            本文へ移動
          </a>
          <header className="hollow-header">
            <Link
              to={email ? "/notes" : "/"}
              search={email ? scopeSearch(workspaceId) : {}}
              className="hollow-brand"
            >
              hollow<span aria-hidden="true">.</span>
            </Link>
            {email ? (
              <nav aria-label="アカウント" className="hollow-account">
                <WorkspaceSwitcher />
                <SearchTrigger />
                <details>
                  <summary aria-label="アカウントメニュー">アカウント</summary>
                  <div className="hollow-menu">
                    <p>{email}</p>
                    <Link to="/settings/profile">プロフィール設定</Link>
                    <Link to="/settings/login-methods">ログイン方法</Link>
                    <a href="/settings/openrouter">OpenRouter連携</a>
                    <a href="/settings/drive">Google Drive連携</a>
                    <PublicPageLink />
                    <a href="/discover">公開ノートを探す</a>
                    {workspaceId && (
                      <Link
                        to="/workspaces/$workspaceId/settings"
                        params={{ workspaceId }}
                      >
                        ワークスペース設定・メンバー
                      </Link>
                    )}
                    <Link to="/trash" search={scopeSearch(workspaceId)}>
                      ゴミ箱
                    </Link>
                    <Link to="/notes/jobs" search={scopeSearch(workspaceId)}>
                      処理履歴
                    </Link>
                    <Link
                      to="/notes/new"
                      search={scopeSearch(workspaceId)}
                      hash="editor-settings"
                    >
                      この端末の編集設定
                    </Link>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          if (
                            !window.dispatchEvent(
                              new Event("hollow:before-signout", {
                                cancelable: true,
                              }),
                            )
                          )
                            return;
                          setError("");
                          try {
                            await signOutFn();
                            window.dispatchEvent(
                              new Event("hollow:signed-out"),
                            );
                            await router.invalidate();
                            await router.navigate({ to: "/signin" });
                          } catch (cause) {
                            setError(displayError(cause));
                          }
                        })
                      }
                    >
                      {pending ? "サインアウト中…" : "サインアウト"}
                    </button>
                  </div>
                </details>
              </nav>
            ) : (
              <Link to="/signin">サインイン</Link>
            )}
          </header>
          {error && (
            <p role="alert" className="hollow-message">
              {error}
            </p>
          )}
          <main id="main" className="hollow-main">
            <TrashProvider key={email ?? "anonymous"}>{children}</TrashProvider>
          </main>
          <footer className="hollow-footer">
            Hollow — 書く、読み返す。<Link to="/terms">利用規約</Link>
          </footer>
        </div>
      </WorkspaceDisplayProvider>
    </BrowseProvider>
  );
}

export function LoadingNotes() {
  return (
    <div
      className="hollow-loading"
      role="status"
      aria-label="ノートを読み込み中"
    >
      <span>読み込み中…</span>
      {[0, 1, 2].map((value) => (
        <div key={value} className="hollow-skeleton" />
      ))}
    </div>
  );
}

export function PageError({ error }: { error: unknown }) {
  return (
    <section className="hollow-empty" role="alert">
      <h1>表示できませんでした</h1>
      <p>{displayError(error)}</p>
      <Link to="/notes" search={{}} className="hollow-button">
        個人のノート一覧へ
      </Link>
    </section>
  );
}
