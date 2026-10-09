"use client";
import { Link, useRouter } from "@tanstack/react-router";
import { useActionState } from "react";
import {
  confirmGoogleProofFn,
  requestPasswordResetFn,
  resetPasswordFn,
} from "@/presentation/authenticationServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { PasswordFields, passwordFieldErrors } from "./PasswordFields";
import { Shell } from "./Shell";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export function PasswordReset({ token }: { token?: string }) {
  const ticket = useAuthenticationOperation();
  const [result, action, pending] = useActionState(
    async (_: { error: string; done: boolean }, data: FormData) => {
      const valid = ticket();
      if (token) {
        const fields = passwordFieldErrors(
          String(data.get("password") ?? ""),
          String(data.get("confirmation") ?? ""),
        );
        if (fields.password || fields.confirmation)
          return { error: fields.password || fields.confirmation, done: false };
      }
      try {
        if (token)
          await resetPasswordFn({
            data: {
              token,
              password: String(data.get("password") ?? ""),
              confirmation: String(data.get("confirmation") ?? ""),
            },
          });
        else
          await requestPasswordResetFn({
            data: { email: String(data.get("email") ?? "") },
          });
        return valid() ? { error: "", done: true } : { error: "", done: false };
      } catch (cause) {
        return { error: valid() ? displayError(cause) : "", done: false };
      }
    },
    { error: "", done: false },
  );
  return (
    <Shell>
      <section className="hollow-auth">
        <h1>パスワードの再設定</h1>
        {result.done ? (
          <p role="status">
            {token
              ? "パスワードを再設定し、これまでのセッションを終了しました。新しいパスワードでサインインしてください。"
              : "入力されたアドレスで手続きが可能な場合、ご案内を送りました。Googleのみで利用中の場合はGoogleでサインインしてください。"}
          </p>
        ) : (
          <form action={action} className="hollow-form">
            {token ? (
              <>
                <p>
                  新しいパスワードを設定すると、このアカウントのすべての既存セッションが終了します。
                </p>
                <PasswordFields prefix="reset" disabled={pending} />
              </>
            ) : (
              <>
                <label htmlFor="reset-email">メールアドレス</label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={pending}
                />
              </>
            )}
            <button
              type="submit"
              className="hollow-button hollow-primary"
              disabled={pending}
            >
              {pending
                ? "処理中…"
                : token
                  ? "新しいパスワードを確定"
                  : "再設定メールを申請"}
            </button>
          </form>
        )}
        {result.error && (
          <p role="alert" className="hollow-message">
            {result.error}
          </p>
        )}
        {token && (
          <p>
            <Link to="/reset-password">新しい再設定メールを申請</Link>
          </p>
        )}
        <Link to="/signin">サインインへ</Link>
      </section>
    </Shell>
  );
}

export function GoogleMailProof({ token }: { token: string }) {
  const router = useRouter();
  const ticket = useAuthenticationOperation();
  const [error, action, pending] = useActionState(async () => {
    const valid = ticket();
    try {
      const result = await confirmGoogleProofFn({ data: { token } });
      if (valid())
        await router.navigate({ href: `/auth/google-result?id=${result.id}` });
      return "";
    } catch (cause) {
      return valid() ? displayError(cause) : "";
    }
  }, "");
  return (
    <Shell>
      <section className="hollow-auth">
        <h1>Googleログイン方法の追加確認</h1>
        <p>
          このページを開いただけでは追加されません。Google認証を開始したブラウザで、追加を確定してください。
        </p>
        <form action={action}>
          <button
            type="submit"
            className="hollow-button hollow-primary"
            disabled={pending}
          >
            {pending ? "本人確認中…" : "Googleログインの追加を確定"}
          </button>
        </form>
        {error && (
          <p role="alert" className="hollow-message">
            {error}
          </p>
        )}
        <Link to="/signin">サインインへ</Link>
      </section>
    </Shell>
  );
}
