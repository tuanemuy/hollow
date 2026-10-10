"use client";

import { Link } from "@tanstack/react-router";
import { useActionState, useId, useState } from "react";
import { accountDeletionSchema } from "@/presentation/accountDeletionInput";
import { deleteAccountFn } from "@/presentation/accountDeletionServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type State = Readonly<{
  status: "ready" | "error" | "unknown" | "accepted";
  message: string;
}>;
type Actor = Readonly<{ id: string; epoch: number }>;

export function AccountDeletion({
  email,
  actor,
  currentActor,
  onDeleted,
}: {
  email: string;
  actor: Actor;
  currentActor: () => Actor | null;
  onDeleted: () => Promise<void>;
}) {
  const id = useId();
  const ticket = useAuthenticationOperation();
  const [confirmation, setConfirmation] = useState("");
  const parsed = accountDeletionSchema.safeParse({ email: confirmation });
  const expected = accountDeletionSchema.safeParse({ email });
  const matches =
    parsed.success &&
    expected.success &&
    parsed.data.email === expected.data.email;
  const stillCurrent = () => {
    const current = currentActor();
    return current?.id === actor.id && current.epoch === actor.epoch;
  };
  const [state, action, pending] = useActionState<State, FormData>(
    async (previous: State, data: FormData): Promise<State> => {
      if (previous.status === "accepted" || previous.status === "unknown")
        return previous;
      if (!stillCurrent())
        return {
          status: "error",
          message: "利用者が変更されました。ページを再読み込みしてください。",
        };
      const input = accountDeletionSchema.safeParse({
        email: data.get("email"),
      });
      if (
        !input.success ||
        !expected.success ||
        input.data.email !== expected.data.email
      )
        return {
          status: "error",
          message: "現在のメールアドレスを正確に入力してください。",
        };
      const valid = ticket();
      try {
        await deleteAccountFn({ data: input.data });
      } catch (cause) {
        if (!valid() || !stillCurrent())
          return { status: "ready", message: "" };
        const error = extractSerializedError(cause);
        if (error.code === "WORKSPACE_LAST_OWNER")
          return {
            status: "error",
            message:
              "最後のオーナーになっているワークスペースがあります。別のメンバーをオーナーにするか、ワークスペースを削除してから退会してください。",
          };
        if (error.code === "ACCOUNT_DELETION_EMAIL")
          return {
            status: "error",
            message: "現在のメールアドレスを正確に入力してください。",
          };
        if (
          error.kind === "unknown" ||
          error.kind === "system" ||
          error.kind === "unauthorized"
        )
          return {
            status: "unknown",
            message:
              "退会の受付結果を確認できません。ページを再読み込みして現在の状態を確認してください。",
          };
        return { status: "error", message: displayError(cause) };
      }
      if (!valid() || !stillCurrent()) return { status: "ready", message: "" };
      try {
        await onDeleted();
      } catch {
        return {
          status: "accepted",
          message: "退会を受け付けました。サインイン画面へ進んでください。",
        };
      }
      return { status: "accepted", message: "退会を受け付けました。" };
    },
    { status: "ready", message: "" },
  );
  const locked =
    pending || state.status === "accepted" || state.status === "unknown";
  return (
    <section
      aria-labelledby={`${id}-title`}
      style={{ minWidth: 0, overflowWrap: "anywhere", marginTop: 48 }}
    >
      <h2 id={`${id}-title`}>退会</h2>
      <p id={`${id}-description`}>
        退会を受け付けると、すべての端末からサインアウトし、プロフィールと個人ノートの公開を停止します。個人ノート・元ファイル・メディア・個人タグ・連携情報は順次回収します。取り消し・復元はできません。
      </p>
      <p>
        存続するワークスペースのノートや、ワークスペースへ移動したノートは残ります。Google
        Driveに保存済みのファイルは削除しません。
      </p>
      <p id={`${id}-owner`}>
        ワークスペースの最後のオーナーは退会できません。別のメンバーをオーナーにするか、ワークスペースを削除してください。{" "}
        <Link to="/notes">ノート一覧でワークスペースを確認</Link>
      </p>
      <form action={action} className="hollow-form" aria-busy={pending}>
        <label htmlFor={`${id}-email`}>
          確認のため、現在のメールアドレスを入力
        </label>
        <p className="hollow-help" id={`${id}-expected`}>
          {email}
        </p>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.currentTarget.value)}
          disabled={locked}
          aria-describedby={`${id}-description ${id}-expected ${id}-owner`}
          style={{ minWidth: 0, maxWidth: "100%" }}
        />
        <button
          type="submit"
          className="hollow-button"
          disabled={locked || !matches || !stillCurrent()}
          style={{ whiteSpace: "normal", minHeight: 44 }}
        >
          {pending ? "退会を受け付けています…" : "退会する（取り消し不可）"}
        </button>
        {pending && <p role="status">退会の受付結果を確認しています。</p>}
        {state.message && (
          <p
            className="hollow-message"
            role={state.status === "accepted" ? "status" : "alert"}
          >
            {state.message}
          </p>
        )}
        {state.status === "unknown" && (
          <button
            type="button"
            className="hollow-button"
            onClick={() => window.location.reload()}
          >
            ページを再読み込み
          </button>
        )}
        {state.status === "accepted" && (
          <Link to="/signin">サインイン画面へ</Link>
        )}
      </form>
    </section>
  );
}
