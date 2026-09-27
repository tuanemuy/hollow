"use client";

import type { InvitationSelection } from "@repo/core/application/workspace/invitationViews";
import { Link, useRouter } from "@tanstack/react-router";
import { useActionState, useState } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import {
  bootstrapAuthenticationFn,
  resendVerificationFn,
  signInFn,
  signUpFn,
  verifyEmailFn,
} from "@/presentation/hollowAuth";
import { invitationDestination } from "@/presentation/invitationInput";
import { GoogleEntry } from "./GoogleEntry";
import { Shell } from "./Shell";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export function AuthForm({
  mode,
  redirectTo = "/notes",
  invitation = false,
  invitationSelection,
}: {
  mode: "signup" | "signin";
  redirectTo?: string;
  invitation?: boolean;
  invitationSelection?: InvitationSelection;
}) {
  const router = useRouter();
  const ticket = useAuthenticationOperation();
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [error, action, pending] = useActionState(
    async (_previous: string, data: FormData) => {
      const valid = ticket();
      const email = String(data.get("email") ?? "");
      const password = String(data.get("password") ?? "");
      setUnverifiedEmail(null);
      try {
        await bootstrapAuthenticationFn();
        if (!valid()) return "";
        if (mode === "signup") {
          if (data.get("terms") !== "on") return "利用規約への同意が必要です。";
          const result = await signUpFn({
            data: {
              email,
              password,
              termsAccepted: true,
              invitation,
              ...(invitationSelection ? { invitationSelection } : {}),
            },
          });
          if (!valid()) return "";
          if (result.signedIn) {
            await router.invalidate();
            await router.navigate({
              href: invitationDestination(invitationSelection),
            });
          } else setSentEmail(email);
        } else {
          await signInFn({ data: { email, password } });
          if (!valid()) return "";
          await router.invalidate();
          await router.navigate({ href: redirectTo });
        }
        return "";
      } catch (cause) {
        if (!valid()) return "";
        const error = extractSerializedError(cause);
        if (error.kind === "unauthorized" && error.code === "EMAIL_UNVERIFIED")
          setUnverifiedEmail(email);
        return displayError(cause);
      }
    },
    "",
  );
  if (sentEmail)
    return (
      <Shell>
        <div className="hollow-auth">
          <p className="hollow-eyebrow">メールアドレスの確認</p>
          <h1>受信箱をご確認ください</h1>
          <p>
            <strong>{sentEmail}</strong>{" "}
            に確認リンクを送りました。リンクを開くと、ノートを書き始められます。
          </p>
          <ResendForm initialEmail={sentEmail} />
          <Link
            to="/signin"
            search={
              invitation
                ? {
                    invitation: true,
                    ...(invitationSelection
                      ? {
                          invitationId: invitationSelection.id,
                          invitationGeneration: invitationSelection.generation,
                        }
                      : {}),
                  }
                : {}
            }
          >
            サインインへ戻る
          </Link>
        </div>
      </Shell>
    );
  const signup = mode === "signup";
  return (
    <Shell>
      <div className="hollow-auth">
        <p className="hollow-eyebrow">あなたのための、静かな場所</p>
        <h1>{signup ? "Hollow をはじめる" : "おかえりなさい"}</h1>
        <p>
          {signup
            ? "大切なことを、自分のノートに。"
            : "メールアドレスでサインインします。"}
        </p>
        <form action={action} className="hollow-form">
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={pending}
          />
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 12 : 1}
            maxLength={128}
            required
            disabled={pending}
          />
          {signup && (
            <>
              <p className="hollow-help">
                12〜128 文字で、英字と数字または記号を組み合わせてください。
              </p>
              <label className="hollow-check">
                <input
                  name="terms"
                  type="checkbox"
                  required
                  disabled={pending}
                />
                <span>
                  <Link to="/terms" target="_blank">
                    利用規約
                  </Link>
                  に同意する
                </span>
              </label>
            </>
          )}
          {error && (
            <p className="hollow-message" role="alert">
              {error}
            </p>
          )}
          <button
            className="hollow-button hollow-primary"
            type="submit"
            disabled={pending}
          >
            {pending
              ? "処理中…"
              : signup
                ? invitation
                  ? "登録して招待を確認"
                  : "確認メールを送る"
                : "サインイン"}
          </button>
        </form>
        <GoogleEntry
          disabled={pending}
          destination={
            invitationSelection
              ? { kind: "invitation", expected: invitationSelection }
              : /^\/notes\/[a-f0-9-]{36}$/.test(redirectTo)
                ? { kind: "note", id: redirectTo.slice(7) }
                : { kind: "notes" }
          }
        />
        {!signup && (
          <p>
            <Link to="/reset-password">パスワードをお忘れですか</Link>
          </p>
        )}
        <p className="hollow-auth-switch">
          {signup ? "アカウントをお持ちですか？" : "はじめてですか？"}{" "}
          <Link
            to={signup ? "/signin" : "/signup"}
            search={
              invitation
                ? {
                    invitation: true,
                    ...(invitationSelection
                      ? {
                          invitationId: invitationSelection.id,
                          invitationGeneration: invitationSelection.generation,
                        }
                      : {}),
                  }
                : {}
            }
          >
            {signup ? "サインイン" : "新規登録"}
          </Link>
        </p>
        {unverifiedEmail && <ResendForm initialEmail={unverifiedEmail} />}
        {!signup && !unverifiedEmail && (
          <details className="hollow-resend">
            <summary>確認メールが届かない場合</summary>
            <ResendForm />
          </details>
        )}
      </div>
    </Shell>
  );
}

function ResendForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [message, action, pending] = useActionState(
    async (_previous: string, data: FormData) => {
      try {
        await resendVerificationFn({
          data: { email: String(data.get("email") ?? "") },
        });
        return "確認メールを再送しました。受信箱をご確認ください。";
      } catch (cause) {
        return displayError(cause);
      }
    },
    "",
  );
  return (
    <form action={action} className="hollow-form">
      <label htmlFor="resend-email">メールアドレス</label>
      <input
        id="resend-email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={initialEmail}
        required
        maxLength={254}
      />
      <button className="hollow-button" disabled={pending} type="submit">
        {pending ? "再送中…" : "確認メールを再送"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}

export function VerifyEmail({ token }: { token: string }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [error, action, pending] = useActionState(async () => {
    try {
      await bootstrapAuthenticationFn();
      const result = await verifyEmailFn({ data: { token } });
      if (result.signedIn) {
        await router.invalidate();
        await router.navigate({
          href: result.invitation
            ? invitationDestination(result.invitation)
            : "/notes",
        });
      } else setVerified(true);
      return "";
    } catch (cause) {
      const error = extractSerializedError(cause);
      if (error.kind === "forbidden" && error.code === "VERIFICATION_USED") {
        setVerified(true);
        return "";
      }
      return displayError(cause);
    }
  }, "");
  return (
    <Shell>
      <div className="hollow-auth">
        <p className="hollow-eyebrow">メールアドレスの確認</p>
        <h1>{verified ? "確認が完了しました" : "Hollow へようこそ"}</h1>
        {verified ? (
          <>
            <p>登録したメールアドレスとパスワードでサインインしてください。</p>
            <Link className="hollow-button hollow-primary" to="/signin">
              サインインへ
            </Link>
          </>
        ) : token ? (
          <>
            <p>以下のボタンでメールアドレスを確認します。</p>
            <form action={action}>
              <button
                className="hollow-button hollow-primary"
                type="submit"
                disabled={pending}
              >
                {pending ? "確認中…" : "メールアドレスを確認"}
              </button>
            </form>
          </>
        ) : (
          <p role="alert">
            確認リンクがありません。メールに記載されたリンクを開いてください。
          </p>
        )}
        {error && (
          <>
            <p role="alert" className="hollow-message">
              {error}
            </p>
            <ResendForm />
          </>
        )}
      </div>
    </Shell>
  );
}
