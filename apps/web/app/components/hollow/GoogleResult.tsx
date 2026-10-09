"use client";
import { Link, useRouter } from "@tanstack/react-router";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addPasswordFn,
  googleResultFn,
  passwordGoogleProofFn,
  sendGoogleProofFn,
} from "@/presentation/authenticationServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { PasswordFields, passwordFieldErrors } from "./PasswordFields";
import { Shell } from "./Shell";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type View = Awaited<ReturnType<typeof googleResultFn>>;
const failures: Record<string, string> = {
  AUTH_CANCELLED: "Google認証はキャンセルされました。",
  AUTH_EXPIRED: "有効期限が切れました。新しい認証を開始してください。",
  AUTH_CONTEXT_CHANGED:
    "利用者や認証状況が変わりました。新しい認証を開始してください。",
  AUTH_EXCHANGE_UNKNOWN:
    "Google認証の結果を確認できません。同じコードは再送せず、新しい認証を開始してください。",
  AUTH_PROVIDER_REJECTED:
    "Google認証が完了しませんでした。必要なら新しい認証を開始してください。",
  AUTH_UNVERIFIED: "先に通常の確認メールでメールアドレスを確認してください。",
  AUTH_CONFLICT:
    "現在のアカウントにこのGoogleログインを追加できません。ログイン方法を確認してください。",
};

export function GoogleResult({ id }: { id?: string }) {
  const router = useRouter();
  const ticket = useAuthenticationOperation();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    const valid = ticket();
    if (!id) {
      setError(
        "認証を確認できません。元の画面から新しい認証を開始してください。",
      );
      return;
    }
    void googleResultFn({ data: { id } })
      .then((result) => {
        if (valid()) setView(result);
      })
      .catch((cause) => {
        if (valid()) setError(displayError(cause));
      });
  }, [id, ticket]);
  const [formError, action, submitting] = useActionState(
    async (_: string, data: FormData) => {
      if (!id || !view) return "";
      if (view.state === "reauth-ready") {
        const fields = passwordFieldErrors(
          String(data.get("password") ?? ""),
          String(data.get("confirmation") ?? ""),
        );
        if (fields.password || fields.confirmation)
          return fields.password || fields.confirmation;
      }
      const valid = ticket();
      try {
        if (view.state === "reauth-ready") {
          await addPasswordFn({
            data: {
              attemptId: id,
              password: String(data.get("password") ?? ""),
              confirmation: String(data.get("confirmation") ?? ""),
            },
          });
          if (!valid()) return "";
          await router.navigate({ href: "/settings/login-methods" });
        } else {
          await passwordGoogleProofFn({
            data: { id, password: String(data.get("password") ?? "") },
          });
          if (!valid()) return "";
          const next = await googleResultFn({ data: { id } });
          if (valid()) setView(next);
        }
        return "";
      } catch (cause) {
        return valid() ? displayError(cause) : "";
      }
    },
    "",
  );
  return (
    <Shell>
      <section className="hollow-auth">
        <h1>Google認証</h1>
        {!view && !error && <p role="status">認証結果を確認しています…</p>}
        {view?.state === "completed" && (
          <>
            <p>認証が完了しました。</p>
            <a href={view.destination}>続ける</a>
          </>
        )}
        {view?.state === "failed" && (
          <p role="alert">
            {failures[view.failure ?? ""] ?? "認証を完了できませんでした。"}
          </p>
        )}
        {view && ["pending", "exchanging", "verified"].includes(view.state) && (
          <>
            <p>
              認証の結果はまだ確認できていません。同じコードの自動再送は行いません。
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const valid = ticket();
                start(async () => {
                  try {
                    const next = await googleResultFn({
                      data: { id: view.id },
                    });
                    if (valid()) setView(next);
                  } catch (cause) {
                    if (valid()) setError(displayError(cause));
                  }
                });
              }}
            >
              保存済みの結果を確認
            </button>
          </>
        )}
        {view?.state === "proof-required" && (
          <>
            <p>
              既存アカウントへの追加には、パスワードまたは確認メールによる本人確認が必要です。確認するまではログインも連携も行いません。
            </p>
            {view.passwordProof && (
              <form action={action} className="hollow-form">
                <label htmlFor="google-proof-password">
                  既存アカウントのパスワード
                </label>
                <input
                  id="google-proof-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  disabled={submitting || pending}
                />
                <button type="submit" disabled={submitting || pending}>
                  パスワードで追加を確認
                </button>
              </form>
            )}
            <button
              type="button"
              disabled={pending || submitting}
              onClick={() => {
                const valid = ticket();
                start(async () => {
                  try {
                    await sendGoogleProofFn({ data: { id: view.id } });
                    if (valid())
                      setMessage(
                        "既存メールアドレスへ確認リンクを送りました。このブラウザで開いて追加を確定してください。",
                      );
                  } catch (cause) {
                    if (valid()) setError(displayError(cause));
                  }
                });
              }}
            >
              確認メールを送る
            </button>
          </>
        )}
        {view?.state === "reauth-ready" && (
          <form action={action} className="hollow-form">
            <p>
              本人確認ができました。有効期限内に新しいパスワードを設定してください。
            </p>
            <PasswordFields prefix="new" disabled={submitting} />
            <button type="submit" disabled={submitting}>
              パスワードを追加
            </button>
          </form>
        )}
        {(error || formError) && (
          <p role="alert" className="hollow-message">
            {error || formError}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <p>
          <Link to="/signin">新しいサインインを開始</Link> ·{" "}
          <Link to="/settings/login-methods">ログイン方法</Link>
        </p>
      </section>
    </Shell>
  );
}
