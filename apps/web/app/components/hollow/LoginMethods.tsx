"use client";
import { useRouter } from "@tanstack/react-router";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  changePasswordFn,
  loginMethodsFn,
  removeLoginMethodFn,
  signOutOthersFn,
} from "@/presentation/authenticationServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { bootstrapAuthenticationFn } from "@/presentation/hollowAuth";
import { GoogleEntry } from "./GoogleEntry";
import { PasswordFields, passwordFieldErrors } from "./PasswordFields";
import { Shell } from "./Shell";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export function LoginMethods({ email }: { email: string }) {
  const ticket = useAuthenticationOperation();
  const router = useRouter();
  const [methods, setMethods] = useState<Awaited<
    ReturnType<typeof loginMethodsFn>
  > | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    const valid = ticket();
    void (async () => {
      try {
        await bootstrapAuthenticationFn();
        if (!valid()) return;
        const result = await loginMethodsFn();
        if (valid()) setMethods(result);
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      }
    })();
  }, [ticket]);
  const refresh = async (valid: () => boolean) => {
    if (!valid()) return;
    const result = await loginMethodsFn();
    if (valid()) {
      setMethods(result);
      await router.invalidate();
    }
  };
  const [formError, change, changing] = useActionState(
    async (_: string, data: FormData) => {
      if (!methods) return "";
      const fields = passwordFieldErrors(
        String(data.get("password") ?? ""),
        String(data.get("confirmation") ?? ""),
      );
      if (fields.password || fields.confirmation)
        return fields.password || fields.confirmation;
      const valid = ticket();
      setMessage("");
      try {
        await changePasswordFn({
          data: {
            version: methods.version,
            currentPassword: String(data.get("currentPassword") ?? ""),
            password: String(data.get("password") ?? ""),
            confirmation: String(data.get("confirmation") ?? ""),
          },
        });
        if (valid())
          setMessage(
            "パスワードを変更し、他のセッションを終了しました。このセッションの期限は変わりません。",
          );
        await refresh(valid);
        return "";
      } catch (cause) {
        return valid() ? displayError(cause) : "";
      }
    },
    "",
  );
  const remove = (method: "google" | "password") => {
    if (
      !methods ||
      !window.confirm(
        `${method === "google" ? "Google" : "パスワード"}のログイン方法を解除します。残るログイン方法をご確認ください。${method === "google" ? "Google Driveの連携は維持されます。" : ""}解除しますか？`,
      )
    )
      return;
    const valid = ticket();
    setError("");
    setMessage("");
    start(async () => {
      try {
        await removeLoginMethodFn({
          data: { method, version: methods.version },
        });
        if (valid()) setMessage("ログイン方法を解除しました。");
        await refresh(valid);
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      }
    });
  };
  const busy = pending || changing;
  return (
    <Shell email={email}>
      <section className="hollow-auth">
        <h1>ログイン方法</h1>
        {!methods && !error && (
          <p role="status">ログイン方法を確認しています…</p>
        )}
        {methods && (
          <>
            <dl>
              <dt>パスワード</dt>
              <dd>{methods.password ? "設定済み" : "未設定"}</dd>
              <dt>Google</dt>
              <dd>{methods.google ? "連携済み" : "未連携"}</dd>
            </dl>
            {methods.password && (
              <form action={change} className="hollow-form">
                <h2>パスワードを変更</h2>
                <label htmlFor="current-password">現在のパスワード</label>
                <input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  disabled={busy}
                />
                <PasswordFields prefix="change" disabled={busy} />
                <button type="submit" disabled={busy}>
                  パスワードを変更
                </button>
              </form>
            )}
            {!methods.password && (
              <>
                <h2>パスワードを追加</h2>
                <p>現在のGoogleアカウントで新しく本人確認を行います。</p>
                <GoogleEntry
                  mode="reauth"
                  destination={{ kind: "methods" }}
                  disabled={busy}
                />
              </>
            )}
            {!methods.google && (
              <GoogleEntry
                mode="link"
                destination={{ kind: "methods" }}
                disabled={busy}
              />
            )}
            <h2>ログイン方法の解除</h2>
            {!(methods.google && methods.password) && (
              <p>
                最後のログイン方法は解除できません。先に別の方法を追加してください。
              </p>
            )}
            {methods.password && (
              <button
                type="button"
                disabled={busy || !methods.google}
                onClick={() => remove("password")}
              >
                パスワードを解除
              </button>
            )}
            {methods.google && (
              <button
                type="button"
                disabled={busy || !methods.password}
                onClick={() => remove("google")}
              >
                Googleを解除
              </button>
            )}
            <p className="hollow-help">
              Googleログインを解除しても、Google
              Driveの連携は維持されます。Driveの連携を解除するには、連携設定で別途操作してください。
            </p>
            <h2>セッション</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    "このセッションを残し、他のセッションからサインアウトしますか？",
                  )
                )
                  return;
                const valid = ticket();
                start(async () => {
                  try {
                    await signOutOthersFn();
                    if (valid()) setMessage("他のセッションを終了しました。");
                  } catch (cause) {
                    if (valid()) setError(displayError(cause));
                  }
                });
              }}
            >
              他のセッションを終了
            </button>
          </>
        )}
        {(error || formError) && (
          <p role="alert" className="hollow-message">
            {error || formError}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
    </Shell>
  );
}
