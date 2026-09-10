"use client";

import { Link, useRouter } from "@tanstack/react-router";
import { type ReactNode, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { signOutFn } from "@/presentation/hollowAuth";
import { TrashProvider } from "./TrashProvider";

export function Shell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="hollow">
      <a className="hollow-skip" href="#main">
        本文へ移動
      </a>
      <header className="hollow-header">
        <Link to={email ? "/notes" : "/"} className="hollow-brand">
          hollow<span aria-hidden="true">.</span>
        </Link>
        {email ? (
          <nav aria-label="アカウント" className="hollow-account">
            <span className="hollow-scope">個人</span>
            <details>
              <summary aria-label="アカウントメニュー">アカウント</summary>
              <div className="hollow-menu">
                <p>{email}</p>
                <Link to="/trash">ゴミ箱</Link>
                <Link to="/notes/jobs">処理履歴</Link>
                <Link to="/notes/new" hash="editor-settings">
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
                        window.dispatchEvent(new Event("hollow:signed-out"));
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
      <Link to="/notes" className="hollow-button">
        ノート一覧へ
      </Link>
    </section>
  );
}
